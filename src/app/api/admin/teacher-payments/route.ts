import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import {
  isTeacherAbsent,
  getAbsenceDeductionConfig,
} from "@/lib/absence-utils";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    // If details query, return detailed breakdown
    if (
      url.pathname.endsWith("/details") ||
      url.searchParams.has("teacherId")
    ) {
      const teacherId = url.searchParams.get("teacherId");
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      if (!teacherId || !from || !to) {
        return NextResponse.json(
          { error: "Missing teacherId, from, or to" },
          { status: 400 }
        );
      }
      const fromDate = new Date(from);
      const toDate = new Date(to);
      // Get base deduction amount from lateness config
      let baseDeductionAmount = 30;
      try {
        const latenessConfig = await prisma.latenessdeductionconfig.findFirst();
        baseDeductionAmount = Number(latenessConfig?.baseDeductionAmount) || 30;
      } catch (error) {
        baseDeductionAmount = 30;
      }

      // Fetch lateness deduction config from DB - no fallback tiers
      const latenessConfigs = await prisma.latenessdeductionconfig.findMany({
        orderBy: [{ tier: "asc" }, { startMinute: "asc" }],
      });

      // Only use database configuration, no predefined tiers
      if (latenessConfigs.length === 0) {
        return NextResponse.json({
          latenessRecords: [],
          absenceRecords: [],
          bonusRecords: [],
        });
      }

      const excusedThreshold = Math.min(
        ...latenessConfigs.map((c) => c.excusedThreshold ?? 0)
      );
      const tiers = latenessConfigs.map((c) => ({
        start: c.startMinute,
        end: c.endMinute,
        percent: c.deductionPercent,
      }));
      const maxTierEnd = Math.max(...latenessConfigs.map((c) => c.endMinute));
      // Get all students for this teacher in the date range
      const students = await prisma.wpos_wpdatatable_23.findMany({
        where: { ustaz: teacherId },
        include: {
          zoom_links: true,
          occupiedTimes: {
            select: {
              time_slot: true,
            },
          },
        },
      });
      // For each day in the range, calculate lateness for each student
      const latenessRecords = [];
      for (
        let d = new Date(fromDate);
        d <= toDate;
        d.setDate(d.getDate() + 1)
      ) {
        const dateStr = format(d, "yyyy-MM-dd");
        for (const student of students) {
          const timeSlot = student.occupiedTimes?.[0]?.time_slot;
          if (!timeSlot) continue;
          // Convert selectedTime (12h or 24h) to Date for the day
          function to24Hour(time12h: string) {
            if (!time12h) return "00:00";

            // Handle AM/PM format
            if (time12h.includes("AM") || time12h.includes("PM")) {
              const [time, modifier] = time12h.split(" ");
              let [hours, minutes] = time.split(":");
              if (hours === "12") hours = modifier === "AM" ? "00" : "12";
              else if (modifier === "PM")
                hours = String(parseInt(hours, 10) + 12);
              return `${hours.padStart(2, "0")}:${minutes}`;
            }

            // Handle existing 24-hour format (HH:MM:SS or HH:MM)
            if (time12h.includes(":")) {
              const parts = time12h.split(":");
              const hours = parts[0].padStart(2, "0");
              const minutes = (parts[1] || "00").padStart(2, "0");
              return `${hours}:${minutes}`;
            }

            return "00:00"; // fallback
          }
          const time24 = to24Hour(timeSlot);
          const scheduledTime = new Date(`${dateStr}T${time24}:00.000Z`);
          // Find the earliest sent_time for this student/date
          const sentTimes = (student.zoom_links || [])
            .filter(
              (zl) =>
                zl.sent_time &&
                format(zl.sent_time as Date, "yyyy-MM-dd") === dateStr
            )
            .map((zl) => zl.sent_time)
            .sort((a, b) => {
              if (!a && !b) return 0;
              if (!a) return 1;
              if (!b) return -1;
              return a.getTime() - b.getTime();
            });
          const actualStartTime = sentTimes.length > 0 ? sentTimes[0] : null;
          if (!actualStartTime) continue;
          const latenessMinutes = Math.max(
            0,
            Math.round(
              (actualStartTime.getTime() - scheduledTime.getTime()) / 60000
            )
          );
          // Deduction logic with waiver check
          let deductionApplied = 0;
          let deductionTier = "Excused";
          let isWaived = false;
          
          if (latenessMinutes > excusedThreshold) {
            let foundTier = false;
            for (const [i, tier] of tiers.entries()) {
              if (
                latenessMinutes >= tier.start &&
                latenessMinutes <= tier.end
              ) {
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
            
            // Check for waiver
            try {
              const { isDeductionWaived } = await import('@/lib/deduction-waivers');
              isWaived = await isDeductionWaived(teacherId as string, scheduledTime, 'lateness');
              if (isWaived) {
                deductionApplied = 0;
                deductionTier = `${deductionTier} (WAIVED)`;
              }
            } catch (error) {
              console.error('Error checking waiver:', error);
            }
          }
          latenessRecords.push({
            studentId: student.wdt_ID,
            studentName: student.name,
            classDate: scheduledTime,
            scheduledTime,
            actualStartTime,
            latenessMinutes,
            deductionApplied,
            deductionTier,
            isWaived: isWaived || false,
          });
        }
      }
      // Absence and bonus records as before
      let absenceRecords: any[] = [];
      let bonusRecords: any[] = [];
      if (typeof teacherId === "string") {
        absenceRecords = await prisma.absencerecord.findMany({
          where: {
            teacherId,
            classDate: { gte: fromDate, lte: toDate },
          },
          include: {
            permissionrequest: {
              select: {
                reasonCategory: true,
                timeSlots: true
              }
            }
          },
          orderBy: { classDate: "asc" },
        });
        bonusRecords = await prisma.bonusrecord.findMany({
          where: {
            teacherId,
            createdAt: { gte: fromDate, lte: toDate },
          },
          orderBy: { createdAt: "asc" },
        });
      }
      // Add auto-detected absences for completeness in details
      const { deductionAmount: absenceDeductionAmount, effectiveMonths } =
        await getAbsenceDeductionConfig();
      const existingAbsenceDates = new Set(
        (absenceRecords || []).map(
          (r: any) => new Date(r.classDate).toISOString().split("T")[0]
        )
      );
      const computedAbsences: any[] = [];
      for (
        let d = new Date(fromDate);
        d <= toDate;
        d.setDate(d.getDate() + 1)
      ) {
        const monthNumber = String(d.getMonth() + 1);
        if (
          effectiveMonths.length > 0 &&
          !effectiveMonths.includes(monthNumber)
        )
          continue;
        const dateKey = d.toISOString().split("T")[0];
        if (existingAbsenceDates.has(dateKey)) continue;
        const res = await isTeacherAbsent(teacherId as string, new Date(d));
        if (res.isAbsent) {
          // Calculate time-slot based deduction for computed absences
          const timeSlotDeductionConfig = await prisma.deductionbonusconfig.findFirst({
            where: { configType: "absence", key: "deduction_per_time_slot" },
          });
          const deductionPerTimeSlot = timeSlotDeductionConfig ? Number(timeSlotDeductionConfig.value) : 25;
          
          // Get teacher's time slots for this day
          const dayName = new Date(d).toLocaleDateString('en-US', { weekday: 'long' });
          const occupiedTimes = await prisma.wpos_ustaz_occupied_times.findMany({
            where: { ustaz_id: teacherId as string },
            include: {
              student: {
                select: { daypackages: true }
              }
            }
          });
          
          const dayTimeSlots = occupiedTimes.filter(ot => {
            const studentDayPackages = ot.student.daypackages;
            return studentDayPackages && (
              studentDayPackages.includes('All days') || 
              studentDayPackages.includes(dayName)
            );
          });
          
          let calculatedDeduction = absenceDeductionAmount;
          let timeSlots = null;
          
          if (dayTimeSlots.length > 0) {
            const uniqueTimeSlots = [...new Set(dayTimeSlots.map(ot => ot.time_slot))];
            calculatedDeduction = deductionPerTimeSlot * uniqueTimeSlots.length;
            timeSlots = JSON.stringify(uniqueTimeSlots);
          }
          
          computedAbsences.push({
            id: 0,
            teacherId,
            classDate: new Date(d),
            timeSlots,
            permitted: false,
            permissionRequestId: null,
            deductionApplied: calculatedDeduction,
            reviewedByManager: true,
            reviewNotes: `Auto-detected absence - ${dayTimeSlots.length > 0 ? `${dayTimeSlots.length} time slots` : 'whole day'}`,
          });
        }
      }
      const finalAbsences = [...absenceRecords, ...computedAbsences];
      return NextResponse.json({
        latenessRecords,
        absenceRecords: finalAbsences,
        bonusRecords,
      });
    }
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing date range" },
        { status: 400 }
      );
    }
    const from = new Date(startDate);
    const to = new Date(endDate);

    // Get all teachers
    const teachers = await prisma.wpos_wpdatatable_24.findMany({
      select: {
        ustazid: true,
        ustazname: true,
      },
    });

    // Get package-based salary configuration from dedicated table
    const packageSalaries = await prisma.packageSalary.findMany();
    
    const salaryMap: Record<string, number> = {};
    packageSalaries.forEach((pkg) => {
      salaryMap[pkg.packageName] = Number(pkg.salaryPerStudent);
    });

    // Get working days configuration (default: exclude Sundays)
    const workingDaysConfig = await prisma.setting.findUnique({
      where: { key: "include_sundays_in_salary" }
    });
    const includeSundays = workingDaysConfig?.value === "true" || false;
    
    // Calculate working days in the selected month
    const daysInMonth = new Date(from.getFullYear(), from.getMonth() + 1, 0).getDate();
    let workingDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(from.getFullYear(), from.getMonth(), day);
      // Include/exclude Sundays based on configuration
      if (includeSundays || date.getDay() !== 0) {
        workingDays++;
      }
    }

    // For each teacher, calculate deductions and bonuses
    // Helper to get all periods in the date range
    function getPeriodsInRange(from: Date, to: Date): string[] {
      const periods = new Set<string>();
      let d = new Date(from.getFullYear(), from.getMonth(), 1);
      while (d <= to) {
        periods.add(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        );
        d.setMonth(d.getMonth() + 1);
      }
      return Array.from(periods) as string[];
    }
    const periodsInRange: string[] = getPeriodsInRange(from, to);

    // Fetch absence config once
    const absenceConfig = await getAbsenceDeductionConfig();

    const results = (await Promise.all(
      teachers.map(async (t) => {
        // === STEP 1: GET TEACHER'S STUDENTS AND BASIC INFO ===
        const currentStudents = await prisma.wpos_wpdatatable_23.findMany({
          where: { ustaz: t.ustazid, status: { in: ["active", "Active"] } },
          select: { 
            wdt_ID: true,
            name: true,
            package: true,
            zoom_links: {
              where: {
                sent_time: { gte: from, lte: to }
              },
              select: { sent_time: true }
            }
          },
        });
        
        const numStudents = currentStudents.length;
        
        // Skip teachers with no students
        if (numStudents === 0) {
          return null;
        }

        // === STEP 2: CALCULATE BASE SALARY (Daily Earnings) ===
        let baseSalary = 0;
        let totalTeachingDays = 0;
        const dailyBreakdown = [];
        
        // Group earnings by date
        const dailyEarnings = new Map();
        
        for (const student of currentStudents) {
          if (!student.package || !salaryMap[student.package]) continue;
          
          const monthlyPackageSalary = Math.round(salaryMap[student.package] || 0);
          const dailyRate = Math.round(monthlyPackageSalary / workingDays);
          
          // Count actual teaching days for this student (only one per day)
          const teachingDates = new Set();
          const dailyLinks = new Map();
          
          // Group zoom links by date and keep only the earliest one per day
          student.zoom_links.forEach(link => {
            if (link.sent_time) {
              const linkDate = new Date(link.sent_time);
              if (includeSundays || linkDate.getDay() !== 0) {
                const dateStr = link.sent_time.toISOString().split('T')[0];
                
                if (!dailyLinks.has(dateStr) || link.sent_time < dailyLinks.get(dateStr)) {
                  dailyLinks.set(dateStr, link.sent_time);
                }
              }
            }
          });
          
          // Add unique teaching dates
          dailyLinks.forEach((_, dateStr) => {
            teachingDates.add(dateStr);
          });
          
          // Add to daily earnings
          teachingDates.forEach(dateStr => {
            if (!dailyEarnings.has(dateStr)) {
              dailyEarnings.set(dateStr, 0);
            }
            dailyEarnings.set(dateStr, dailyEarnings.get(dateStr) + dailyRate);
          });
          
          // Add to breakdown for transparency
          if (teachingDates.size > 0) {
            dailyBreakdown.push({
              studentName: student.name,
              package: student.package,
              monthlyRate: monthlyPackageSalary,
              dailyRate: dailyRate,
              daysWorked: teachingDates.size,
              totalEarned: dailyRate * teachingDates.size
            });
          }
        }
        
        // Calculate totals
        baseSalary = Array.from(dailyEarnings.values()).reduce((sum, amount) => sum + amount, 0);
        totalTeachingDays = dailyEarnings.size;
        baseSalary = Math.round(baseSalary);

        // === STEP 3: CALCULATE LATENESS DEDUCTIONS ===
        let latenessDeduction = 0;
        const latenessBreakdown = [];
        
        // Get lateness configuration
        const latenessConfig = await prisma.latenessdeductionconfig.findFirst();
        const baseDeductionAmount = Math.round(Number(latenessConfig?.baseDeductionAmount) || 30);
        
        const latenessConfigs = await prisma.latenessdeductionconfig.findMany({
          orderBy: [{ tier: "asc" }, { startMinute: "asc" }],
        });

        
        if (latenessConfigs.length > 0) {
          const excusedThreshold = Math.min(...latenessConfigs.map(c => c.excusedThreshold ?? 0));
          const tiers = latenessConfigs.map(c => ({
            start: c.startMinute,
            end: c.endMinute,
            percent: c.deductionPercent,
          }));
          
          // Calculate lateness for each day and student
          const allStudents = await prisma.wpos_wpdatatable_23.findMany({
            where: { ustaz: t.ustazid },
            include: {
              zoom_links: true,
              occupiedTimes: { select: { time_slot: true } },
            },
          });
          
          // Group zoom links by date to avoid duplicate deductions
          const dailyZoomLinks = new Map();
          
          for (const student of allStudents) {
            student.zoom_links.forEach(link => {
              if (link.sent_time) {
                const dateStr = format(link.sent_time, "yyyy-MM-dd");
                if (!dailyZoomLinks.has(dateStr)) {
                  dailyZoomLinks.set(dateStr, []);
                }
                dailyZoomLinks.get(dateStr).push({
                  ...link,
                  studentId: student.wdt_ID,
                  studentName: student.name,
                  timeSlot: student.occupiedTimes?.[0]?.time_slot
                });
              }
            });
          }
          
          // Calculate lateness for each day (only earliest link per day)
          for (const [dateStr, links] of dailyZoomLinks.entries()) {
            const date = new Date(dateStr);
            if (date < from || date > to) continue;
            
            // Group by student and take earliest link per student per day
            const studentLinks = new Map<number, any>();
            links.forEach((link: any) => {
              const key = link.studentId;
              if (!studentLinks.has(key) || link.sent_time < studentLinks.get(key).sent_time) {
                studentLinks.set(key, link);
              }
            });
            
            // Calculate lateness for each student's earliest link
            for (const link of studentLinks.values()) {
              if (!link.timeSlot) continue;
              
              // Convert time to 24-hour format
              function convertTo24Hour(timeStr: string): string {
                if (!timeStr) return "00:00";
                
                if (timeStr.includes("AM") || timeStr.includes("PM")) {
                  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
                  if (match) {
                    let hour = parseInt(match[1]);
                    const minute = match[2];
                    const period = match[3].toUpperCase();
                    
                    if (period === "PM" && hour !== 12) hour += 12;
                    if (period === "AM" && hour === 12) hour = 0;
                    
                    return `${hour.toString().padStart(2, '0')}:${minute}`;
                  }
                }
                
                // Already 24-hour or other format
                return timeStr.includes(":") ? timeStr.split(":").slice(0, 2).join(":") : "00:00";
              }
              
              const time24 = convertTo24Hour(link.timeSlot);
              const scheduledTime = new Date(`${dateStr}T${time24}:00.000Z`);
              
              const latenessMinutes = Math.max(0, 
                Math.round((link.sent_time.getTime() - scheduledTime.getTime()) / 60000)
              );
              
              if (latenessMinutes > excusedThreshold) {
                let deduction = 0;
                let tier = "No Tier";
                
                // Find appropriate tier
                for (const [i, t] of tiers.entries()) {
                  if (latenessMinutes >= t.start && latenessMinutes <= t.end) {
                    deduction = Math.round(baseDeductionAmount * (t.percent / 100));
                    tier = `Tier ${i + 1} (${t.percent}%)`;
                    break;
                  }
                }
                
                // Check for waiver
                try {
                  const { isDeductionWaived } = await import('@/lib/deduction-waivers');
                  const isWaived = await isDeductionWaived(t.ustazid, scheduledTime, 'lateness');
                  if (isWaived) {
                    deduction = 0;
                    tier = `${tier} (WAIVED)`;
                  }
                } catch (error) {
                  // Continue without waiver check if module not available
                }
                
                if (deduction > 0) {
                  latenessDeduction += deduction;
                  latenessBreakdown.push({
                    date: dateStr,
                    studentName: link.studentName,
                    scheduledTime: link.timeSlot,
                    actualTime: format(link.sent_time, "HH:mm"),
                    latenessMinutes,
                    tier,
                    deduction
                  });
                }
              }
            }
          }
        }

        
        // === STEP 4: CALCULATE ABSENCE DEDUCTIONS ===
        let absenceDeduction = 0;
        const absenceBreakdown = [];
        
        // Get time-slot based deduction config
        const timeSlotDeductionConfig = await prisma.deductionbonusconfig.findFirst({
          where: { configType: "absence", key: "deduction_per_time_slot" },
        });
        const deductionPerTimeSlot = timeSlotDeductionConfig ? Number(timeSlotDeductionConfig.value) : 25;
        
        // Get teacher's occupied times for day-based calculations
        const teacherOccupiedTimes = await prisma.wpos_ustaz_occupied_times.findMany({
          where: { ustaz_id: t.ustazid },
          include: {
            student: {
              select: { daypackages: true }
            }
          }
        });
        
        for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
          const monthNumber = String(d.getMonth() + 1);
          if (
            absenceConfig.effectiveMonths.length > 0 &&
            !absenceConfig.effectiveMonths.includes(monthNumber)
          ) {
            continue;
          }
          
          // Skip Sundays if not included in working days
          if (!includeSundays && d.getDay() === 0) {
            continue;
          }
          
          const absenceResult = await isTeacherAbsent(t.ustazid, new Date(d));
          if (absenceResult.isAbsent) {
            // Calculate time-slot based deduction
            const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
            
            const dayTimeSlots = teacherOccupiedTimes.filter(ot => {
              const studentDayPackages = ot.student.daypackages;
              return studentDayPackages && (
                studentDayPackages.includes('All days') || 
                (studentDayPackages.includes('MWF') && ['Monday', 'Wednesday', 'Friday'].includes(dayName)) ||
                (studentDayPackages.includes('TTS') && ['Tuesday', 'Thursday', 'Saturday'].includes(dayName))
              );
            });
            
            let dailyDeduction = absenceConfig.deductionAmount;
            let deductionReason = "No zoom link sent (whole day)";
            
            if (dayTimeSlots.length > 0) {
              const uniqueTimeSlots = [...new Set(dayTimeSlots.map(ot => ot.time_slot))];
              dailyDeduction = deductionPerTimeSlot * uniqueTimeSlots.length;
              deductionReason = `No zoom link sent (${uniqueTimeSlots.length} time slots)`;
            }
            
            // Check for waiver
            try {
              const { isDeductionWaived } = await import('@/lib/deduction-waivers');
              const isWaived = await isDeductionWaived(t.ustazid, new Date(d), 'absence');
              if (isWaived) {
                dailyDeduction = 0;
                deductionReason = `${deductionReason} (WAIVED)`;
              }
            } catch (error) {
              // Continue without waiver check if module not available
            }
            
            if (dailyDeduction > 0) {
              absenceDeduction += Math.round(dailyDeduction);
              absenceBreakdown.push({
                date: format(d, "yyyy-MM-dd"),
                reason: deductionReason,
                deduction: Math.round(dailyDeduction),
                timeSlots: dayTimeSlots.length > 0 ? dayTimeSlots.length : null
              });
            }
          }
        }
        
        // === STEP 5: CALCULATE BONUSES ===
        const bonuses = await prisma.qualityassessment.aggregate({
          where: {
            teacherId: t.ustazid,
            weekStart: { gte: from, lte: to },
            managerApproved: true,
          },
          _sum: { bonusAwarded: true },
        });
        const bonusAmount = Math.round(bonuses._sum?.bonusAwarded ?? 0);
        
        // === STEP 6: CALCULATE FINAL TOTALS ===
        const finalBaseSalary = Math.round(baseSalary);
        const finalLatenessDeduction = Math.round(latenessDeduction);
        const finalAbsenceDeduction = Math.round(absenceDeduction);
        const finalBonusAmount = Math.round(bonusAmount);
        const totalSalary = finalBaseSalary - finalLatenessDeduction - finalAbsenceDeduction + finalBonusAmount;
        
        // === STEP 7: GET PAYMENT STATUS ===
        let status: "Paid" | "Unpaid" = "Unpaid";
        if (periodsInRange.length > 0) {
          const payment = await prisma.teachersalarypayment.findUnique({
            where: {
              teacherId_period: {
                teacherId: t.ustazid,
                period: periodsInRange[0],
              },
            },
            select: { status: true },
          });
          if (payment?.status) {
            status = payment.status as "Paid" | "Unpaid";
          }
        }

        return {
          id: t.ustazid,
          name: t.ustazname,
          baseSalary: finalBaseSalary,
          latenessDeduction: finalLatenessDeduction,
          absenceDeduction: finalAbsenceDeduction,
          bonuses: finalBonusAmount,
          totalSalary,
          numStudents,
          teachingDays: totalTeachingDays,
          status,
          // Detailed breakdown for transparency
          breakdown: {
            dailyEarnings: Array.from(dailyEarnings.entries()).map(([date, amount]) => ({
              date,
              amount: Math.round(amount)
            })),
            studentBreakdown: dailyBreakdown,
            latenessBreakdown,
            absenceBreakdown,
            summary: {
              workingDaysInMonth: workingDays,
              actualTeachingDays: totalTeachingDays,
              averageDailyEarning: totalTeachingDays > 0 ? Math.round(finalBaseSalary / totalTeachingDays) : 0,
              totalDeductions: finalLatenessDeduction + finalAbsenceDeduction,
              netSalary: totalSalary
            }
          }
        };
      })
    )).filter(Boolean);
    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      teacherId,
      period,
      status,
      totalSalary,
      latenessDeduction,
      absenceDeduction,
      bonuses,
    } = body;
    // Auth: Only admin or controller
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (
      !session ||
      (session.role !== "admin" && session.role !== "controller")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const adminId = session.id || undefined;
    if (!teacherId || !period || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    // Upsert salary payment record
    const payment = await prisma.teachersalarypayment.upsert({
      where: {
        teacherId_period: {
          teacherId,
          period,
        },
      },
      update: {
        status,
        paidAt: status === "Paid" ? new Date() : null,
        adminId,
        totalSalary,
        latenessDeduction,
        absenceDeduction,
        bonuses,
      },
      create: {
        teacherId,
        period,
        status,
        paidAt: status === "Paid" ? new Date() : null,
        adminId,
        totalSalary,
        latenessDeduction,
        absenceDeduction,
        bonuses,
      },
    });
    // Log to AuditLog
    await prisma.auditlog.create({
      data: {
        actionType: "teacher_salary_status_update",
        adminId: adminId || null, // Use adminId instead of userId
        targetId: payment.id,
        details: JSON.stringify({ teacherId, period, status }),
      },
    });
    return NextResponse.json({ success: true, payment });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update salary status" },
      { status: 500 }
    );
  }
}
