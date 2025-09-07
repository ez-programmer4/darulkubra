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
    const { 
      adjustmentType,
      dateRange, 
      teacherIds, 
      timeSlots,
      reason
    } = body;

    const { startDate, endDate } = dateRange;
    const adminId = token.id;

    let adjustedRecords = 0;
    let totalDeductionWaived = 0;
    let latenessAmount = 0;
    let absenceAmount = 0;
    let affectedTeachers = new Set();
    const adjustmentTimestamp = new Date();

    try {
      await prisma.$transaction(async (tx) => {
        
        if (adjustmentType === 'waive_lateness') {
          // Create waiver records for the date range to exclude from future calculations
          for (const teacherId of teacherIds) {
            // Calculate what would be waived (same logic as preview)
            const latenessConfig = await tx.latenessdeductionconfig.findFirst();
            const baseDeductionAmount = Number(latenessConfig?.baseDeductionAmount) || 30;
            
            const latenessConfigs = await tx.latenessdeductionconfig.findMany({
              orderBy: [{ tier: "asc" }, { startMinute: "asc" }],
            });
            
            if (latenessConfigs.length > 0) {
              const excusedThreshold = Math.min(...latenessConfigs.map((c) => c.excusedThreshold ?? 0));
              const tiers = latenessConfigs.map((c) => ({
                start: c.startMinute,
                end: c.endMinute,
                percent: c.deductionPercent,
              }));
              const maxTierEnd = Math.max(...latenessConfigs.map((c) => c.endMinute));
              
              const students = await tx.wpos_wpdatatable_23.findMany({
                where: { ustaz: teacherId },
                include: {
                  zoom_links: true,
                  occupiedTimes: { select: { time_slot: true } },
                },
              });
              
              for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                
                for (const student of students) {
                  const timeSlot = student.occupiedTimes?.[0]?.time_slot;
                  if (!timeSlot) continue;
                  
                  // Same calculation logic as preview
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
                  
                  const sentTimes = (student.zoom_links || [])
                    .filter(zl => zl.sent_time && zl.sent_time.toISOString().split('T')[0] === dateStr)
                    .map(zl => zl.sent_time)
                    .sort((a, b) => a!.getTime() - b!.getTime());
                  
                  const actualStartTime = sentTimes.length > 0 ? sentTimes[0] : null;
                  if (!actualStartTime) continue;
                  
                  const latenessMinutes = Math.max(0, Math.round((actualStartTime.getTime() - scheduledTime.getTime()) / 60000));
                  
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
                    // Create or update lateness record with waived status
                    await tx.latenessrecord.upsert({
                      where: {
                        teacherId_classDate_scheduledTime: {
                          teacherId,
                          classDate: scheduledTime,
                          scheduledTime
                        }
                      },
                      update: {
                        deductionApplied: 0,
                        deductionTier: `WAIVED: ${reason} | Original: ${deductionApplied} ETB`
                      },
                      create: {
                        teacherId,
                        classDate: scheduledTime,
                        scheduledTime,
                        actualStartTime,
                        latenessMinutes,
                        deductionApplied: 0,
                        deductionTier: `WAIVED: ${reason} | Would be: ${deductionApplied} ETB`
                      }
                    });
                    
                    latenessAmount += deductionApplied;
                    totalDeductionWaived += deductionApplied;
                    affectedTeachers.add(teacherId);
                    adjustedRecords++;
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
          
          const timeSlotDeductionConfig = await tx.deductionbonusconfig.findFirst({
            where: { configType: "absence", key: "deduction_per_time_slot" },
          });
          const deductionPerTimeSlot = timeSlotDeductionConfig ? Number(timeSlotDeductionConfig.value) : 25;
          
          for (const teacherId of teacherIds) {
            for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
              const monthNumber = String(d.getMonth() + 1);
              if (absenceConfig.effectiveMonths.length > 0 && !absenceConfig.effectiveMonths.includes(monthNumber)) {
                continue;
              }
              
              let deductionAmount = 0;
              let timeSlots = null;
              
              // Check for existing absence record first
              const existingAbsence = await tx.absencerecord.findFirst({
                where: {
                  teacherId,
                  classDate: {
                    gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
                    lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
                  }
                }
              });
              
              if (existingAbsence && existingAbsence.deductionApplied > 0) {
                // Waive existing record
                deductionAmount = existingAbsence.deductionApplied;
                await tx.absencerecord.update({
                  where: { id: existingAbsence.id },
                  data: {
                    deductionApplied: 0,
                    reviewNotes: `WAIVED: ${reason} | Original: ${deductionAmount} ETB | ${existingAbsence.reviewNotes || ''}`
                  }
                });
              } else {
                // Check for auto-detected absence and create waiver record
                const absenceResult = await isTeacherAbsent(teacherId, new Date(d));
                if (absenceResult.isAbsent) {
                  const dayName = new Date(d).toLocaleDateString('en-US', { weekday: 'long' });
                  const occupiedTimes = await tx.wpos_ustaz_occupied_times.findMany({
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
                    timeSlots = JSON.stringify(uniqueTimeSlots);
                  } else {
                    deductionAmount = absenceConfig.deductionAmount;
                  }
                  
                  // Create waiver record
                  await tx.absencerecord.create({
                    data: {
                      teacherId,
                      classDate: new Date(d),
                      timeSlots,
                      permitted: true, // Mark as permitted since it's waived
                      deductionApplied: 0,
                      reviewedByManager: true,
                      reviewNotes: `WAIVED: ${reason} | Would be: ${deductionAmount} ETB | Auto-detected absence`
                    }
                  });
                }
              }
              
              if (deductionAmount > 0) {
                absenceAmount += deductionAmount;
                totalDeductionWaived += deductionAmount;
                affectedTeachers.add(teacherId);
                adjustedRecords++;
              }
            }
          }
        }

        // Validate that adjustments were made
        if (adjustedRecords === 0) {
          throw new Error('No deduction records were found to adjust. Please verify your selection criteria.');
        }

        // Create comprehensive audit log with financial details
        await tx.auditlog.create({
          data: {
            actionType: 'CRITICAL_SALARY_DEDUCTION_ADJUSTMENT',
            adminId: adminId,
            details: JSON.stringify({
              adjustmentType,
              selectedTeachers: teacherIds.length,
              actuallyAffectedTeachers: affectedTeachers.size,
              dateRange: { startDate, endDate },
              timeSlots: timeSlots || 'All time slots',
              reason,
              financialImpact: {
                recordsAdjusted: adjustedRecords,
                latenessAmountWaived: latenessAmount,
                absenceAmountWaived: absenceAmount,
                totalAmountWaived: totalDeductionWaived,
                salaryIncrease: totalDeductionWaived
              },
              processingDetails: {
                timestamp: adjustmentTimestamp.toISOString(),
                adminId: adminId,
                systemIntegration: 'Teacher payment calculations automatically updated'
              },
              complianceNote: `FINANCIAL AUDIT TRAIL: ${adjustedRecords} deduction records totaling ${totalDeductionWaived} ETB were waived and returned to teacher salaries due to: ${reason}`
            })
          }
        });
      });
    } catch (error) {
      console.error('Deduction adjustment failed:', error);
      throw new Error(`Failed to process salary adjustments: ${error}`);
    }

    if (adjustedRecords === 0) {
      return NextResponse.json({ 
        success: true, 
        recordsAffected: 0,
        message: "No records found with deductions in the specified date range"
      });
    }

    return NextResponse.json({ 
      success: true, 
      recordsAffected: adjustedRecords,
      financialImpact: {
        totalAmountWaived: totalDeductionWaived,
        latenessAmount: latenessAmount,
        absenceAmount: absenceAmount,
        affectedTeachers: affectedTeachers.size
      },
      message: `✅ SALARY ADJUSTMENT COMPLETED SUCCESSFULLY\n\n📊 Financial Impact:\n• ${adjustedRecords} deduction records waived\n• ${totalDeductionWaived} ETB returned to teacher salaries\n• ${affectedTeachers.size} teachers affected\n\n🔄 System Integration:\n• Teacher payment calculations updated automatically\n• All reports now reflect adjusted amounts\n• Complete audit trail created for compliance`,
      integration: {
        teacherPaymentsUpdated: true,
        reportsUpdated: true,
        auditTrailCreated: true,
        salaryCalculationsRefreshed: true
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}