import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { adjustmentType, dateRange, teacherIds, timeSlots } = body;
    const { startDate, endDate } = dateRange;

    let records: any[] = [];
    let totalLatenessAmount = 0;
    let totalAbsenceAmount = 0;

    if (adjustmentType === 'waive_lateness') {
      // Calculate lateness deductions dynamically like teacher-payments does
      const latenessConfig = await prisma.latenessdeductionconfig.findFirst();
      const baseDeductionAmount = Number(latenessConfig?.baseDeductionAmount) || 30;
      
      const latenessConfigs = await prisma.latenessdeductionconfig.findMany({
        orderBy: [{ tier: "asc" }, { startMinute: "asc" }],
      });
      
      if (latenessConfigs.length === 0) {
        records = [];
      } else {
        const excusedThreshold = Math.min(...latenessConfigs.map((c) => c.excusedThreshold ?? 0));
        const tiers = latenessConfigs.map((c) => ({
          start: c.startMinute,
          end: c.endMinute,
          percent: c.deductionPercent,
        }));
        const maxTierEnd = Math.max(...latenessConfigs.map((c) => c.endMinute));
        
        for (const teacherId of teacherIds) {
          const teacher = await prisma.wpos_wpdatatable_24.findUnique({
            where: { ustazid: teacherId },
            select: { ustazname: true }
          });
          
          const students = await prisma.wpos_wpdatatable_23.findMany({
            where: { ustaz: teacherId },
            include: {
              zoom_links: true,
              occupiedTimes: { select: { time_slot: true } },
            },
          });
          
          // Calculate lateness for each day/student like teacher-payments does
          for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            
            for (const student of students) {
              const timeSlot = student.occupiedTimes?.[0]?.time_slot;
              if (!timeSlot) continue;
              
              // Convert time slot to 24h format
              function to24Hour(time12h: string) {
                if (!time12h) return "00:00";
                if (time12h.includes("AM") || time12h.includes("PM")) {
                  const [time, modifier] = time12h.split(" ");
                  let [hours, minutes] = time.split(":");
                  if (hours === "12") hours = modifier === "AM" ? "00" : "12";
                  else if (modifier === "PM") hours = String(parseInt(hours, 10) + 12);
                  return `${hours.padStart(2, "0")}:${minutes}`;
                }
                if (time12h.includes(":")) {
                  const parts = time12h.split(":");
                  const hours = parts[0].padStart(2, "0");
                  const minutes = (parts[1] || "00").padStart(2, "0");
                  return `${hours}:${minutes}`;
                }
                return "00:00";
              }
              
              const time24 = to24Hour(timeSlot);
              const scheduledTime = new Date(`${dateStr}T${time24}:00.000Z`);
              
              // Find zoom link sent time for this date
              const sentTimes = (student.zoom_links || [])
                .filter(zl => zl.sent_time && zl.sent_time.toISOString().split('T')[0] === dateStr)
                .map(zl => zl.sent_time)
                .sort((a, b) => a!.getTime() - b!.getTime());
              
              const actualStartTime = sentTimes.length > 0 ? sentTimes[0] : null;
              if (!actualStartTime) continue;
              
              const latenessMinutes = Math.max(0, Math.round((actualStartTime.getTime() - scheduledTime.getTime()) / 60000));
              
              // Calculate deduction using same logic as teacher-payments
              let deductionApplied = 0;
              let deductionTier = "Excused";
              
              if (latenessMinutes > excusedThreshold) {
                let foundTier = false;
                for (const [i, tier] of tiers.entries()) {
                  if (latenessMinutes >= tier.start && latenessMinutes <= tier.end) {
                    deductionApplied = baseDeductionAmount * (tier.percent / 100);
                    deductionTier = `Tier ${i + 1}`;
                    foundTier = true;
                    break;
                  }
                }
                if (!foundTier && latenessMinutes > maxTierEnd) {
                  deductionApplied = baseDeductionAmount;
                  deductionTier = "> Max Tier";
                }
              }
              
              if (deductionApplied > 0) {
                totalLatenessAmount += deductionApplied;
                records.push({
                  id: `${teacherId}-${student.wdt_ID}-${dateStr}`,
                  teacherId,
                  teacherName: teacher?.ustazname || 'Unknown Teacher',
                  date: scheduledTime,
                  type: 'Lateness',
                  deduction: deductionApplied,
                  originalAmount: deductionApplied,
                  details: `${latenessMinutes} min late - ${deductionTier} (Student: ${student.name})`,
                  scheduledTime,
                  actualTime: actualStartTime,
                  studentId: student.wdt_ID,
                  studentName: student.name
                });
              }
            }
          }
        }
      }
    }

    if (adjustmentType === 'waive_absence') {
      // Import absence detection function
      const { isTeacherAbsent, getAbsenceDeductionConfig } = require('@/lib/absence-utils');
      const absenceConfig = await getAbsenceDeductionConfig();
      
      // Get time slot deduction config
      const timeSlotDeductionConfig = await prisma.deductionbonusconfig.findFirst({
        where: { configType: "absence", key: "deduction_per_time_slot" },
      });
      const deductionPerTimeSlot = timeSlotDeductionConfig ? Number(timeSlotDeductionConfig.value) : 25;
      
      for (const teacherId of teacherIds) {
        const teacher = await prisma.wpos_wpdatatable_24.findUnique({
          where: { ustazid: teacherId },
          select: { ustazname: true }
        });
        
        for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
          const monthNumber = String(d.getMonth() + 1);
          if (absenceConfig.effectiveMonths.length > 0 && !absenceConfig.effectiveMonths.includes(monthNumber)) {
            continue;
          }
          
          // Check for existing absence record first
          const existingAbsence = await prisma.absencerecord.findFirst({
            where: {
              teacherId,
              classDate: {
                gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
                lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
              }
            }
          });
          
          let deductionAmount = 0;
          let details = '';
          
          if (existingAbsence && existingAbsence.deductionApplied > 0) {
            // Use existing record deduction
            deductionAmount = existingAbsence.deductionApplied;
            details = `Recorded absence - ${existingAbsence.timeSlots || 'Full day'}`;
          } else {
            // Check for auto-detected absence
            const absenceResult = await isTeacherAbsent(teacherId, new Date(d));
            if (absenceResult.isAbsent) {
              // Calculate deduction based on time slots like teacher-payments does
              const dayName = new Date(d).toLocaleDateString('en-US', { weekday: 'long' });
              const occupiedTimes = await prisma.wpos_ustaz_occupied_times.findMany({
                where: { ustaz_id: teacherId },
                include: {
                  student: { select: { daypackages: true } }
                }
              });
              
              const dayTimeSlots = occupiedTimes.filter(ot => {
                const studentDayPackages = ot.student.daypackages;
                return studentDayPackages && (
                  studentDayPackages.includes('All days') || 
                  studentDayPackages.includes(dayName)
                );
              });
              
              if (dayTimeSlots.length > 0) {
                const uniqueTimeSlots = [...new Set(dayTimeSlots.map(ot => ot.time_slot))];
                deductionAmount = deductionPerTimeSlot * uniqueTimeSlots.length;
                details = `Auto-detected absence - ${uniqueTimeSlots.length} time slots`;
              } else {
                deductionAmount = absenceConfig.deductionAmount;
                details = 'Auto-detected absence - whole day';
              }
            }
          }
          
          if (deductionAmount > 0) {
            totalAbsenceAmount += deductionAmount;
            records.push({
              id: `${teacherId}-absence-${d.toISOString().split('T')[0]}`,
              teacherId,
              teacherName: teacher?.ustazname || 'Unknown Teacher',
              date: new Date(d),
              type: 'Absence',
              deduction: deductionAmount,
              originalAmount: deductionAmount,
              details,
              existingRecord: !!existingAbsence
            });
          }
        }
      }
    }

    // Group records by teacher for better analysis
    const teacherSummary = records.reduce((acc, record) => {
      if (!acc[record.teacherId]) {
        acc[record.teacherId] = {
          teacherName: record.teacherName,
          totalDeduction: 0,
          recordCount: 0,
          records: []
        };
      }
      acc[record.teacherId].totalDeduction += record.deduction;
      acc[record.teacherId].recordCount += 1;
      acc[record.teacherId].records.push(record);
      return acc;
    }, {});

    console.log('Preview Debug (Dynamic Calculation):', {
      adjustmentType,
      teacherIds,
      dateRange: { startDate, endDate },
      recordsFound: records.length,
      totalLatenessAmount,
      totalAbsenceAmount,
      totalAmount: totalLatenessAmount + totalAbsenceAmount,
      calculationMethod: 'Dynamic from zoom_links and absence detection'
    });

    return NextResponse.json({ 
      records,
      summary: {
        totalRecords: records.length,
        totalTeachers: Object.keys(teacherSummary).length,
        totalLatenessAmount,
        totalAbsenceAmount,
        totalAmount: totalLatenessAmount + totalAbsenceAmount,
        teacherBreakdown: Object.values(teacherSummary)
      },
      debug: {
        searchCriteria: { adjustmentType, teacherIds, dateRange: { startDate, endDate } },
        tablesChecked: ['latenessrecord', 'absencerecord']
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}