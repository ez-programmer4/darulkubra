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
    const { adjustmentType, dateRange, teacherIds, timeSlots, reason } =
      await req.json();
    
    // Ensure teacherIds is always an array of strings
    const teacherIdsArray = Array.isArray(teacherIds) 
      ? teacherIds.map(id => String(id)) 
      : [String(teacherIds)];
    
    console.log("🔧 ADJUSTMENT API CALLED:", {
      adjustmentType,
      dateRange,
      teacherIds: teacherIdsArray,
      teacherCount: teacherIdsArray.length,
      reason: reason?.substring(0, 50),
    });
    
    console.log("🔍 TEACHER IDS AFTER CONVERSION:", teacherIdsArray);

    if (
      !dateRange?.startDate ||
      !dateRange?.endDate ||
      !teacherIdsArray?.length ||
      !reason?.trim()
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const adminId = (session.user as { id: string }).id;

    let recordsAffected = 0;
    let totalAmountWaived = 0;

    // Use transaction to ensure data consistency
    console.log("💾 Starting database transaction...");
    const result = await prisma.$transaction(async (tx) => {
      console.log("💾 Inside transaction, processing:", adjustmentType);
      if (adjustmentType === "waive_absence") {
        console.log(`🔍 SEARCHING FOR ABSENCE RECORDS:`, {
          teacherIds: teacherIdsArray,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });
        
        // Get absence records to waive
        const absenceRecords = await tx.absencerecord.findMany({
          where: {
            teacherId: { in: teacherIdsArray },
            classDate: { gte: startDate, lte: endDate },
          },
        });
        
        console.log(`📊 FOUND ${absenceRecords.length} ABSENCE RECORDS:`, 
          absenceRecords.map(r => ({
            id: r.id,
            teacherId: r.teacherId,
            date: r.classDate.toISOString().split('T')[0],
            deduction: r.deductionApplied
          }))
        );

        if (absenceRecords.length > 0) {
          console.log(
            `💾 PROCESSING ${absenceRecords.length} ABSENCE RECORDS FOR WAIVER`
          );

          // Check for existing waivers first
          const existingWaivers = await tx.deduction_waivers.findMany({
            where: {
              teacherId: { in: teacherIdsArray },
              deductionType: "absence",
              deductionDate: { gte: startDate, lte: endDate },
            },
          });
          
          console.log(`🔍 FOUND ${existingWaivers.length} EXISTING ABSENCE WAIVERS`);
          
          // Filter out records that already have waivers
          const recordsToWaive = absenceRecords.filter(record => 
            !existingWaivers.some(waiver => 
              waiver.teacherId === record.teacherId && 
              waiver.deductionDate.toISOString().split('T')[0] === record.classDate.toISOString().split('T')[0]
            )
          );
          
          console.log(`📝 RECORDS TO WAIVE AFTER FILTERING: ${recordsToWaive.length}`);
          
          if (recordsToWaive.length === 0) {
            console.log(`⚠️ NO NEW RECORDS TO WAIVE - ALL ALREADY HAVE WAIVERS`);
            return { recordsAffected: 0, totalAmountWaived: 0 };
          }

          // Create waiver records only for new records
          const waiverData = recordsToWaive.map((record) => ({
            teacherId: record.teacherId,
            deductionType: "absence" as const,
            deductionDate: record.classDate,
            originalAmount: record.deductionApplied,
            reason,
            adminId,
          }));
          
          console.log(`💾 CREATING WAIVER DATA:`, waiverData.map(w => ({
            teacherId: w.teacherId,
            date: w.deductionDate.toISOString().split('T')[0],
            amount: w.originalAmount
          })));

          const createdWaivers = await tx.deduction_waivers.createMany({
            data: waiverData,
            skipDuplicates: true,
          });

          console.log(
            `✅ CREATED ${createdWaivers.count} ABSENCE WAIVER RECORDS`
          );

          recordsAffected = createdWaivers.count;
          totalAmountWaived = recordsToWaive.reduce(
            (sum, r) => sum + r.deductionApplied,
            0
          );

          console.log(
            `💰 TOTAL ABSENCE AMOUNT WAIVED: ${totalAmountWaived} ETB`
          );
        } else {
          console.log(`ℹ️ NO DATABASE ABSENCE RECORDS FOUND, CHECKING FOR COMPUTED ABSENCES...`);
        }
        
        // Also handle computed absences (same logic as preview API)
        for (const teacherId of teacherIdsArray) {
          const teacher = await tx.wpos_wpdatatable_24.findUnique({
            where: { ustazid: teacherId },
            select: { ustazname: true },
          });

          if (!teacher) continue;

          // Get package deduction rates
          const packageDeductions = await tx.packageDeduction.findMany();
          const packageDeductionMap: Record<string, { lateness: number; absence: number }> = {};
          packageDeductions.forEach((pkg) => {
            packageDeductionMap[pkg.packageName] = {
              lateness: Number(pkg.latenessBaseAmount),
              absence: Number(pkg.absenceBaseAmount),
            };
          });

          // Get current students
          const currentStudents = await tx.wpos_wpdatatable_23.findMany({
            where: { ustaz: teacherId, status: { in: ["active", "Active"] } },
            select: {
              wdt_ID: true,
              name: true,
              package: true,
              zoom_links: {
                where: { sent_time: { gte: startDate, lte: endDate } },
                select: { sent_time: true },
              },
            },
          });

          // Get existing waivers
          const existingWaivers = await tx.deduction_waivers.findMany({
            where: {
              teacherId,
              deductionType: "absence",
              deductionDate: { gte: startDate, lte: endDate },
            },
          });

          const waivedDates = new Set(
            existingWaivers.map((w) => w.deductionDate.toISOString().split("T")[0])
          );

          // Get existing absence records
          const existingAbsenceRecords = await tx.absencerecord.findMany({
            where: {
              teacherId,
              classDate: { gte: startDate, lte: endDate },
            },
          });

          const existingAbsenceDates = new Set(
            existingAbsenceRecords.map((record) =>
              record.classDate.toISOString().split("T")[0]
            )
          );

          // Check for computed absences
          const today = new Date();
          today.setHours(23, 59, 59, 999);

          const workingDaysConfig = await tx.setting.findUnique({
            where: { key: "include_sundays_in_salary" },
          });
          const includeSundays = workingDaysConfig?.value === "true" || false;

          const computedAbsenceWaivers = [];

          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            if (d > today) continue;
            if (!includeSundays && d.getDay() === 0) continue;

            const dateStr = d.toISOString().split("T")[0];

            // Skip if already have database record or waiver
            if (existingAbsenceDates.has(dateStr) || waivedDates.has(dateStr)) continue;

            // Check if teacher sent zoom links
            const dayHasZoomLinks = currentStudents.some((student) =>
              student.zoom_links.some((link) => {
                if (!link.sent_time) return false;
                const linkDate = link.sent_time.toISOString().split("T")[0];
                return linkDate === dateStr;
              })
            );

            // NEW: Check per-schedule absences instead of whole-day
            let dailyDeduction = 0;
            const affectedStudents = [];

            for (const student of currentStudents) {
              // Check if teacher sent zoom link specifically for this student
              const studentHasZoomLink = student.zoom_links.some((link) => {
                if (!link.sent_time) return false;
                const linkDate = link.sent_time.toISOString().split("T")[0];
                return linkDate === dateStr;
              });

              // If no zoom link for this specific student, deduct for this student's schedule
              if (!studentHasZoomLink) {
                const packageRate = student.package
                  ? packageDeductionMap[student.package]?.absence || 25
                  : 25;
                dailyDeduction += packageRate;
                affectedStudents.push({
                  studentId: student.wdt_ID,
                  name: student.name,
                  package: student.package || "Unknown",
                  rate: packageRate,
                });
              }
            }

            if (dailyDeduction > 0) {
              computedAbsenceWaivers.push({
                teacherId,
                deductionType: "absence" as const,
                deductionDate: new Date(d),
                originalAmount: dailyDeduction,
                reason: `${reason} | Per-schedule absence: ${affectedStudents.length} students affected - ${affectedStudents.map(s => `${s.name}(${s.package}): ${s.rate}ETB`).join(", ")}`,
                adminId,
              });
              totalAmountWaived += dailyDeduction;
            }
          }

          if (computedAbsenceWaivers.length > 0) {
            console.log(`💾 CREATING ${computedAbsenceWaivers.length} PER-SCHEDULE ABSENCE WAIVERS FOR ${teacherId}`);
            
            const createdComputedWaivers = await tx.deduction_waivers.createMany({
              data: computedAbsenceWaivers,
              skipDuplicates: true,
            });

            console.log(`✅ CREATED ${createdComputedWaivers.count} PER-SCHEDULE ABSENCE WAIVERS`);
            recordsAffected += createdComputedWaivers.count;
          }
        }
      }

      if (adjustmentType === "waive_lateness") {
        // Create detailed lateness waivers matching preview records
        const waiverData = [];

        for (const teacherId of teacherIdsArray) {
          // Get package deduction rates
          const packageDeductions = await tx.packageDeduction.findMany();
          const packageDeductionMap: Record<
            string,
            { lateness: number; absence: number }
          > = {};
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
                  const dateStr = new Date(link.sent_time)
                    .toISOString()
                    .split("T")[0];
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
                  deductionType: "lateness",
                  deductionDate: date,
                },
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
                  if (timeStr.includes("AM") || timeStr.includes("PM")) {
                    const [time, period] = timeStr.split(" ");
                    let [hours, minutes] = time.split(":").map(Number);
                    if (period === "PM" && hours !== 12) hours += 12;
                    if (period === "AM" && hours === 12) hours = 0;
                    return { hours, minutes };
                  }
                  const [hours, minutes] = timeStr.split(":").map(Number);
                  return { hours, minutes };
                };

                const scheduled = parseTime(link.timeSlot);
                const scheduledTime = new Date(dateStr);
                scheduledTime.setHours(
                  scheduled.hours,
                  scheduled.minutes,
                  0,
                  0
                );
                const latenessMinutes = Math.max(
                  0,
                  Math.round(
                    (link.sent_time.getTime() - scheduledTime.getTime()) / 60000
                  )
                );

                if (latenessMinutes > excusedThreshold) {
                  const student = allStudents.find(
                    (s) => s.wdt_ID === link.studentId
                  );
                  const studentPackage = student?.package || "";
                  const baseDeductionAmount =
                    packageDeductionMap[studentPackage]?.lateness || 30;

                  let deduction = 0;
                  for (const [i, t] of tiers.entries()) {
                    if (
                      latenessMinutes >= t.start &&
                      latenessMinutes <= t.end
                    ) {
                      deduction = Math.round(
                        baseDeductionAmount * (t.percent / 100)
                      );
                      break;
                    }
                  }

                  if (deduction > 0) {
                    dailyTotalDeduction += deduction;
                    dailyDetails.push(
                      `${link.studentName}: ${latenessMinutes}min late, ${deduction} ETB`
                    );
                  }
                }
              }

              // Create waiver record for this date if there were deductions
              if (dailyTotalDeduction > 0) {
                waiverData.push({
                  teacherId,
                  deductionType: "lateness",
                  deductionDate: date,
                  originalAmount: dailyTotalDeduction,
                  reason: `${reason} | ${dailyDetails.join("; ")}`.substring(
                    0,
                    500
                  ),
                  adminId,
                });
                totalAmountWaived += dailyTotalDeduction;
              }
            }
          }
        }

        if (waiverData.length > 0) {
          // CRITICAL: Log waiver creation for audit
          console.log(
            `💾 CREATING ${waiverData.length} LATENESS WAIVERS:`,
            waiverData.map(
              (w) =>
                `${w.teacherId} - ${
                  w.deductionDate.toISOString().split("T")[0]
                } - ${w.originalAmount} ETB`
            )
          );

          const createdWaivers = await tx.deduction_waivers.createMany({
            data: waiverData,
            skipDuplicates: true,
          });

          console.log(
            `✅ SUCCESSFULLY CREATED ${createdWaivers.count} LATENESS WAIVERS`
          );
          recordsAffected = createdWaivers.count;

          // Verify creation
          const verifyCount = await tx.deduction_waivers.count({
            where: {
              teacherId: { in: teacherIdsArray },
              deductionType: "lateness",
              deductionDate: { gte: startDate, lte: endDate },
            },
          });
          console.log(
            `🔍 VERIFICATION: ${verifyCount} lateness waivers now exist in database`
          );
        }
      }

      // Log the adjustment (truncate details to prevent overflow)
      const auditDetails = {
        adjustmentType,
        teacherCount: teacherIdsArray.length,
        dateRange,
        recordsAffected,
        totalAmountWaived,
        reason: reason.substring(0, 100), // Truncate reason
      };

      await tx.auditlog.create({
        data: {
          actionType: "deduction_adjustment",
          adminId,
          targetId: null,
          details: JSON.stringify(auditDetails).substring(0, 500), // Truncate entire JSON
        },
      });

      console.log("✅ Transaction completed:", {
        recordsAffected,
        totalAmountWaived,
      });
      return { recordsAffected, totalAmountWaived };
    });

    console.log("🎉 ADJUSTMENT SUCCESSFUL:", result);

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${result.recordsAffected} deduction adjustments`,
      recordsAffected: result.recordsAffected,
      financialImpact: {
        totalAmountWaived: result.totalAmountWaived,
        affectedTeachers: teacherIdsArray.length,
      },
    });
  } catch (error) {
    console.error("Adjustment error:", error);
    return NextResponse.json(
      { error: "Failed to process adjustments" },
      { status: 500 }
    );
  }
}

// Helper function to calculate lateness deduction for a specific date
async function calculateLatenessDeduction(
  tx: any,
  teacherId: string,
  date: Date
): Promise<number> {
  try {
    const dateStr = date.toISOString().split("T")[0];
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get zoom links for this specific date
    const zoomLinks = await tx.wpos_zoom_links.findMany({
      where: {
        ustazid: teacherId,
        sent_time: { gte: date, lt: nextDay },
      },
      include: {
        wpos_wpdatatable_23: {
          select: {
            package: true,
            occupiedTimes: { select: { time_slot: true } },
          },
        },
      },
      orderBy: { sent_time: "asc" },
    });

    if (zoomLinks.length === 0) return 0;

    // Get package deduction rates
    const packageDeductions = await tx.packageDeduction.findMany();
    const packageMap = Object.fromEntries(
      packageDeductions.map((p: any) => [
        p.packageName,
        Number(p.latenessBaseAmount),
      ])
    );

    // Get lateness config
    const latenessConfigs = await tx.latenessdeductionconfig.findMany({
      orderBy: [{ tier: "asc" }, { startMinute: "asc" }],
    });

    if (latenessConfigs.length === 0) return 0;

    const excusedThreshold = Math.min(
      ...latenessConfigs.map((c: any) => c.excusedThreshold ?? 0)
    );
    const tiers = latenessConfigs.map((c: any) => ({
      start: c.startMinute,
      end: c.endMinute,
      percent: c.deductionPercent,
    }));

    const firstLink = zoomLinks[0];
    const timeSlot =
      firstLink.wpos_wpdatatable_23?.occupiedTimes?.[0]?.time_slot;

    if (!timeSlot || !firstLink.sent_time) return 0;

    // Calculate lateness
    const parseTime = (timeStr: string) => {
      if (timeStr.includes("AM") || timeStr.includes("PM")) {
        const [time, period] = timeStr.split(" ");
        let [hours, minutes] = time.split(":").map(Number);
        if (period === "PM" && hours !== 12) hours += 12;
        if (period === "AM" && hours === 12) hours = 0;
        return { hours, minutes };
      }
      const [hours, minutes] = timeStr.split(":").map(Number);
      return { hours, minutes };
    };

    const scheduled = parseTime(timeSlot);
    const scheduledTime = new Date(date);
    scheduledTime.setHours(scheduled.hours, scheduled.minutes, 0, 0);

    const latenessMinutes = Math.max(
      0,
      Math.round(
        (firstLink.sent_time.getTime() - scheduledTime.getTime()) / 60000
      )
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
