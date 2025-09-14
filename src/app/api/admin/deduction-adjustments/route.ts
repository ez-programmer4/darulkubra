import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { adjustmentType, dateRange, teacherIds, timeSlots, reason } = await req.json();
    console.log('🔧 ADJUSTMENT API CALLED:', { adjustmentType, dateRange, teacherIds: teacherIds?.length, reason: reason?.substring(0, 50) });
    
    if (!dateRange?.startDate || !dateRange?.endDate || !teacherIds?.length || !reason?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const adminId = (session.user as { id: string }).id;
    
    let recordsAffected = 0;
    let totalAmountWaived = 0;

    // Use transaction to ensure data consistency
    console.log('💾 Starting database transaction...');
    const result = await prisma.$transaction(async (tx) => {
      console.log('💾 Inside transaction, processing:', adjustmentType);
      if (adjustmentType === "waive_absence") {
        // Get absence records to waive
        const absenceRecords = await tx.absencerecord.findMany({
          where: {
            teacherId: { in: teacherIds },
            classDate: { gte: startDate, lte: endDate },
            isWaived: { not: true }
          }
        });

        if (absenceRecords.length > 0) {
          // Mark absence records as waived
          await tx.absencerecord.updateMany({
            where: { id: { in: absenceRecords.map(r => r.id) } },
            data: { isWaived: true, waiverReason: reason }
          });

          // Create waiver records
          const waiverData = absenceRecords.map(record => ({
            teacherId: record.teacherId,
            deductionType: 'absence',
            deductionDate: record.classDate,
            originalAmount: record.deductionApplied,
            reason,
            adminId
          }));

          await tx.deduction_waivers.createMany({ 
            data: waiverData,
            skipDuplicates: true 
          });

          recordsAffected = absenceRecords.length;
          totalAmountWaived = absenceRecords.reduce((sum, r) => sum + r.deductionApplied, 0);
        }
      }

      if (adjustmentType === "waive_lateness") {
        // Create detailed lateness waivers matching preview records
        const waiverData = [];
        
        for (const teacherId of teacherIds) {
          // Get package deduction rates
          const packageDeductions = await tx.packageDeduction.findMany();
          const packageDeductionMap: Record<string, { lateness: number; absence: number }> = {};
          packageDeductions.forEach((pkg) => {
            packageDeductionMap[pkg.packageName] = {
              lateness: Number(pkg.latenessBaseAmount),
              absence: Number(pkg.absenceBaseAmount),
            };
          });

          const latenessConfigs = await tx.latenessdeductionconfig.findMany({
            orderBy: [{ tier: "asc" }, { startMinute: "asc" }],
          });

          if (latenessConfigs.length > 0) {
            const excusedThreshold = Math.min(
              ...latenessConfigs.map((c) => c.excusedThreshold ?? 0)
            );
            const tiers = latenessConfigs.map((c) => ({
              start: c.startMinute,
              end: c.endMinute,
              percent: c.deductionPercent,
            }));

            // Get ALL students for this teacher
            const allStudents = await tx.wpos_wpdatatable_23.findMany({
              where: { ustaz: teacherId },
              select: {
                wdt_ID: true,
                name: true,
                package: true,
                zoom_links: true,
                occupiedTimes: { select: { time_slot: true } },
              },
            });

            // Group zoom links by date
            const dailyZoomLinks = new Map();
            for (const student of allStudents) {
              student.zoom_links.forEach((link) => {
                if (link.sent_time) {
                  const dateStr = new Date(link.sent_time).toISOString().split('T')[0];
                  if (!dailyZoomLinks.has(dateStr)) {
                    dailyZoomLinks.set(dateStr, []);
                  }
                  dailyZoomLinks.get(dateStr).push({
                    ...link,
                    studentId: student.wdt_ID,
                    studentName: student.name,
                    timeSlot: student.occupiedTimes?.[0]?.time_slot,
                  });
                }
              });
            }

            // Process each day and create waivers for actual lateness records
            for (const [dateStr, links] of dailyZoomLinks.entries()) {
              const date = new Date(dateStr);
              if (date < startDate || date > endDate) continue;

              // Check if waiver already exists for this date
              const existingWaiver = await tx.deduction_waivers.findFirst({
                where: {
                  teacherId,
                  deductionType: 'lateness',
                  deductionDate: date
                }
              });

              if (existingWaiver) continue;

              // Group by student and take earliest link per student per day
              const studentLinks = new Map<number, any>();
              links.forEach((link: any) => {
                const key = link.studentId;
                if (
                  !studentLinks.has(key) ||
                  link.sent_time < studentLinks.get(key).sent_time
                ) {
                  studentLinks.set(key, link);
                }
              });

              let dailyTotalDeduction = 0;
              const dailyDetails = [];

              // Calculate lateness for each student on this date
              for (const link of studentLinks.values()) {
                if (!link.timeSlot) continue;

                // Filter by time slots if specified
                if (
                  timeSlots &&
                  timeSlots.length > 0 &&
                  !timeSlots.includes(link.timeSlot)
                ) {
                  continue;
                }

                // Parse time and calculate lateness
                const parseTime = (timeStr: string) => {
                  if (timeStr.includes('AM') || timeStr.includes('PM')) {
                    const [time, period] = timeStr.split(' ');
                    let [hours, minutes] = time.split(':').map(Number);
                    if (period === 'PM' && hours !== 12) hours += 12;
                    if (period === 'AM' && hours === 12) hours = 0;
                    return { hours, minutes };
                  }
                  const [hours, minutes] = timeStr.split(':').map(Number);
                  return { hours, minutes };
                };

                const scheduled = parseTime(link.timeSlot);
                const scheduledTime = new Date(dateStr);
                scheduledTime.setHours(scheduled.hours, scheduled.minutes, 0, 0);
                const latenessMinutes = Math.max(
                  0,
                  Math.round(
                    (link.sent_time.getTime() - scheduledTime.getTime()) / 60000
                  )
                );

                if (latenessMinutes > excusedThreshold) {
                  const student = allStudents.find((s) => s.wdt_ID === link.studentId);
                  const studentPackage = student?.package || "";
                  const baseDeductionAmount =
                    packageDeductionMap[studentPackage]?.lateness || 30;

                  let deduction = 0;
                  for (const [i, t] of tiers.entries()) {
                    if (latenessMinutes >= t.start && latenessMinutes <= t.end) {
                      deduction = Math.round(baseDeductionAmount * (t.percent / 100));
                      break;
                    }
                  }

                  if (deduction > 0) {
                    dailyTotalDeduction += deduction;
                    dailyDetails.push(`${link.studentName}: ${latenessMinutes}min late, ${deduction} ETB`);
                  }
                }
              }

              // Create waiver record for this date if there were deductions
              if (dailyTotalDeduction > 0) {
                waiverData.push({
                  teacherId,
                  deductionType: 'lateness',
                  deductionDate: date,
                  originalAmount: dailyTotalDeduction,
                  reason: `${reason} | ${dailyDetails.join('; ')}`.substring(0, 500),
                  adminId
                });
                totalAmountWaived += dailyTotalDeduction;
              }
            }
          }
        }

        if (waiverData.length > 0) {
          await tx.deduction_waivers.createMany({ 
            data: waiverData,
            skipDuplicates: true 
          });
          recordsAffected = waiverData.length;
        }
      }

      // Log the adjustment (truncate details to prevent overflow)
      const auditDetails = {
        adjustmentType,
        teacherCount: teacherIds.length,
        dateRange,
        recordsAffected,
        totalAmountWaived,
        reason: reason.substring(0, 100) // Truncate reason
      };
      
      await tx.auditlog.create({
        data: {
          actionType: "deduction_adjustment",
          adminId,
          targetId: null,
          details: JSON.stringify(auditDetails).substring(0, 500) // Truncate entire JSON
        }
      });

      console.log('✅ Transaction completed:', { recordsAffected, totalAmountWaived });
      return { recordsAffected, totalAmountWaived };
    });
    
    console.log('🎉 ADJUSTMENT SUCCESSFUL:', result);

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${result.recordsAffected} deduction adjustments`,
      recordsAffected: result.recordsAffected,
      financialImpact: { 
        totalAmountWaived: result.totalAmountWaived, 
        affectedTeachers: teacherIds.length 
      }
    });

  } catch (error) {
    console.error("Adjustment error:", error);
    return NextResponse.json({ error: "Failed to process adjustments" }, { status: 500 });
  }
}

// Helper function to calculate lateness deduction for a specific date
async function calculateLatenessDeduction(tx: any, teacherId: string, date: Date): Promise<number> {
  try {
    const dateStr = date.toISOString().split('T')[0];
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get zoom links for this specific date
    const zoomLinks = await tx.wpos_zoom_links.findMany({
      where: {
        ustazid: teacherId,
        sent_time: { gte: date, lt: nextDay }
      },
      include: {
        wpos_wpdatatable_23: { 
          select: { 
            package: true,
            occupiedTimes: { select: { time_slot: true } }
          } 
        }
      },
      orderBy: { sent_time: 'asc' }
    });

    if (zoomLinks.length === 0) return 0;

    // Get package deduction rates
    const packageDeductions = await tx.packageDeduction.findMany();
    const packageMap = Object.fromEntries(
      packageDeductions.map((p: any) => [p.packageName, Number(p.latenessBaseAmount)])
    );

    // Get lateness config
    const latenessConfigs = await tx.latenessdeductionconfig.findMany({
      orderBy: [{ tier: "asc" }, { startMinute: "asc" }]
    });

    if (latenessConfigs.length === 0) return 0;

    const excusedThreshold = Math.min(...latenessConfigs.map((c: any) => c.excusedThreshold ?? 0));
    const tiers = latenessConfigs.map((c: any) => ({
      start: c.startMinute,
      end: c.endMinute,
      percent: c.deductionPercent
    }));

    const firstLink = zoomLinks[0];
    const timeSlot = firstLink.wpos_wpdatatable_23?.occupiedTimes?.[0]?.time_slot;
    
    if (!timeSlot || !firstLink.sent_time) return 0;

    // Calculate lateness
    const parseTime = (timeStr: string) => {
      if (timeStr.includes('AM') || timeStr.includes('PM')) {
        const [time, period] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return { hours, minutes };
      }
      const [hours, minutes] = timeStr.split(':').map(Number);
      return { hours, minutes };
    };

    const scheduled = parseTime(timeSlot);
    const scheduledTime = new Date(date);
    scheduledTime.setHours(scheduled.hours, scheduled.minutes, 0, 0);

    const latenessMinutes = Math.max(0, 
      Math.round((firstLink.sent_time.getTime() - scheduledTime.getTime()) / 60000)
    );

    if (latenessMinutes <= excusedThreshold) return 0;

    const studentPackage = firstLink.wpos_wpdatatable_23?.package || "";
    const baseAmount = packageMap[studentPackage] || 30;

    for (const tier of tiers) {
      if (latenessMinutes >= tier.start && latenessMinutes <= tier.end) {
        return Math.round(baseAmount * (tier.percent / 100));
      }
    }

    return 0;
  } catch (error) {
    console.error("Error calculating lateness deduction:", error);
    return 0;
  }
}