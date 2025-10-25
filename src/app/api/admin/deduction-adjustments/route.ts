import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

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
      ? teacherIds.map((id) => String(id))
      : [String(teacherIds)];

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

    const result = await prisma.$transaction(async (tx) => {
      if (adjustmentType === "waive_absence") {
        // Get absence records to waive
        const absenceRecords = await tx.absencerecord.findMany({
          where: {
            teacherId: { in: teacherIdsArray },
            classDate: { gte: startDate, lte: endDate },
          },
        });

        if (absenceRecords.length > 0) {
          // Check for existing waivers first
          const existingWaivers = await tx.deduction_waivers.findMany({
            where: {
              teacherId: { in: teacherIdsArray },
              deductionType: "absence",
              deductionDate: { gte: startDate, lte: endDate },
            },
          });

          // Filter out records that already have waivers
          const recordsToWaive = absenceRecords.filter(
            (record) =>
              !existingWaivers.some(
                (waiver) =>
                  waiver.teacherId === record.teacherId &&
                  format(waiver.deductionDate, "yyyy-MM-dd") ===
                    format(record.classDate, "yyyy-MM-dd")
              )
          );

          if (recordsToWaive.length === 0) {
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

          const createdWaivers = await tx.deduction_waivers.createMany({
            data: waiverData,
            skipDuplicates: true,
          });

          recordsAffected = createdWaivers.count;
          totalAmountWaived = recordsToWaive.reduce(
            (sum, r) => sum + r.deductionApplied,
            0
          );
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

          // Get ALL students assigned to this teacher (same as salary calculator)
          // IMPORTANT: Include students with ANY status - teacher should be evaluated for all students taught
          // even if student left mid-month (they should still get deductions for missed days before leaving)
          const currentStudents = await tx.wpos_wpdatatable_23.findMany({
            where: {
              OR: [
                // Current assignments (any status)
                {
                  ustaz: teacherId,
                  // No status filter - include all students
                },
                // Historical assignments from audit logs (any status)
                {
                  // No status filter - include all students
                  occupiedTimes: {
                    some: {
                      ustaz_id: teacherId,
                    },
                  },
                },
              ],
            },
            include: {
              occupiedTimes: {
                where: {
                  ustaz_id: teacherId,
                },
                select: {
                  time_slot: true,
                  daypackage: true,
                  occupied_at: true,
                  end_at: true,
                },
              },
              zoom_links: {
                where: {
                  ustazid: teacherId,
                  sent_time: { gte: startDate, lte: endDate },
                },
                select: { sent_time: true },
              },
              attendance_progress: {
                where: {
                  date: { gte: startDate, lte: endDate },
                },
                select: {
                  date: true,
                  attendance_status: true,
                },
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
            existingWaivers.map((w) => format(w.deductionDate, "yyyy-MM-dd"))
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
              format(record.classDate, "yyyy-MM-dd")
            )
          );

          // Check for computed absences
          const today = new Date();
          today.setHours(23, 59, 59, 999);

          const workingDaysConfig = await tx.setting.findUnique({
            where: { key: "include_sundays_in_salary" },
          });
          const includeSundays = workingDaysConfig?.value === "true" || false;

          const computedAbsenceWaivers: Array<{
            teacherId: string;
            deductionType: "absence";
            deductionDate: Date;
            originalAmount: number;
            reason: string;
            adminId: string;
          }> = [];

          // Get teacher change history for proper assignment validation
          // Get ALL changes up to endDate to properly track who was assigned when
          const teacherChanges = await tx.teacher_change_history.findMany({
            where: {
              OR: [
                { old_teacher_id: teacherId },
                { new_teacher_id: teacherId },
              ],
              change_date: {
                lte: endDate,
              },
            },
            select: {
              student_id: true,
              old_teacher_id: true,
              new_teacher_id: true,
              change_date: true,
            },
          });

          // Helper function to check if teacher is assigned to student on specific date
          const isTeacherAssignedOnDate = (
            studentId: number,
            date: Date,
            occupiedTimes: Array<{
              occupied_at: Date | null;
              end_at: Date | null;
            }>
          ): boolean => {
            // Get all teacher changes for this student, sorted by date
            const studentChanges = teacherChanges
              .filter((tc) => tc.student_id === studentId)
              .sort(
                (a, b) => a.change_date.getTime() - b.change_date.getTime()
              );

            if (studentChanges.length > 0) {
              // Find the most recent change before or on this date
              let currentTeacherOnDate: string | null = null;

              for (const change of studentChanges) {
                const changeDate = new Date(change.change_date);
                changeDate.setHours(0, 0, 0, 0);
                const checkDate = new Date(date);
                checkDate.setHours(0, 0, 0, 0);

                if (checkDate < changeDate) {
                  // This change hasn't happened yet on checkDate
                  // Use the old teacher if this is the first change
                  if (studentChanges[0] === change && change.old_teacher_id) {
                    currentTeacherOnDate = change.old_teacher_id;
                  }
                  break;
                } else {
                  // This change has happened by checkDate
                  currentTeacherOnDate = change.new_teacher_id;
                }
              }

              return currentTeacherOnDate === teacherId;
            }

            // No teacher changes, check regular assignment period
            for (const ot of occupiedTimes) {
              const assignmentStart = ot.occupied_at
                ? new Date(ot.occupied_at)
                : null;
              const assignmentEnd = ot.end_at ? new Date(ot.end_at) : null;

              if (assignmentStart && date < assignmentStart) continue;
              if (assignmentEnd && date > assignmentEnd) continue;

              return true;
            }

            return false;
          };

          // Helper to parse daypackage (same as salary calculator and preview)
          const parseDaypackage = (dp: string): number[] => {
            if (!dp || dp.trim() === "") return [];

            const dpTrimmed = dp.trim().toUpperCase();

            if (dpTrimmed === "ALL DAYS" || dpTrimmed === "ALLDAYS") {
              return [0, 1, 2, 3, 4, 5, 6];
            }
            if (dpTrimmed === "MWF") {
              return [1, 3, 5];
            }
            if (dpTrimmed === "TTS" || dpTrimmed === "TTH") {
              return [2, 4, 6];
            }

            const dayMap: Record<string, number> = {
              MONDAY: 1,
              MON: 1,
              TUESDAY: 2,
              TUE: 2,
              WEDNESDAY: 3,
              WED: 3,
              THURSDAY: 4,
              THU: 4,
              FRIDAY: 5,
              FRI: 5,
              SATURDAY: 6,
              SAT: 6,
              SUNDAY: 0,
              SUN: 0,
            };

            if (dayMap[dpTrimmed] !== undefined) {
              return [dayMap[dpTrimmed]];
            }

            return [];
          };

          for (
            let d = new Date(startDate);
            d <= endDate;
            d.setDate(d.getDate() + 1)
          ) {
            if (d > today) continue;

            const dayOfWeek = d.getDay();
            const dateStr = format(d, "yyyy-MM-dd");

            if (!includeSundays && dayOfWeek === 0) continue;

            // Skip if already have database record or waiver
            if (existingAbsenceDates.has(dateStr) || waivedDates.has(dateStr))
              continue;

            // Check EACH student individually (per-student logic like salary calculator)
            let dailyDeduction = 0;
            const affectedStudents = [];

            for (const student of currentStudents) {
              // Check if teacher was actually assigned to this student on this date (considering teacher changes)
              const isAssigned = isTeacherAssignedOnDate(
                student.wdt_ID,
                d,
                student.occupiedTimes || []
              );

              if (!isAssigned) {
                continue; // Teacher not assigned on this date due to teacher change
              }

              // Get relevant occupied times for this date
              const relevantOccupiedTimes = student.occupiedTimes.filter(
                (ot: any) => {
                  const assignmentStart = ot.occupied_at
                    ? new Date(ot.occupied_at)
                    : null;
                  const assignmentEnd = ot.end_at ? new Date(ot.end_at) : null;

                  if (assignmentStart && d < assignmentStart) return false;
                  if (assignmentEnd && d > assignmentEnd) return false;
                  return true;
                }
              );

              if (relevantOccupiedTimes.length === 0) continue;

              // Check if student is scheduled on this day of week
              let isScheduled = false;
              for (const ot of relevantOccupiedTimes) {
                const scheduledDays = parseDaypackage(ot.daypackage || "");
                if (scheduledDays.includes(dayOfWeek)) {
                  isScheduled = true;
                  break;
                }
                // Fallback: if no daypackage and has zoom links, assume weekdays
                if (
                  scheduledDays.length === 0 &&
                  student.zoom_links?.length > 0 &&
                  dayOfWeek >= 1 &&
                  dayOfWeek <= 5
                ) {
                  isScheduled = true;
                  break;
                }
              }

              if (!isScheduled) continue;

              // Check if student has zoom link for this date
              const studentHasZoomLink = student.zoom_links.some(
                (link: any) => {
                  if (!link.sent_time) return false;
                  const linkDate = format(link.sent_time, "yyyy-MM-dd");
                  return linkDate === dateStr;
                }
              );

              if (studentHasZoomLink) continue;

              // Check if student has attendance permission for this date
              const attendanceRecord = student.attendance_progress?.find(
                (att: any) => {
                  const attDate = format(att.date, "yyyy-MM-dd");
                  return attDate === dateStr;
                }
              );

              if (attendanceRecord?.attendance_status === "Permission") {
                continue; // Skip deduction if student has permission
              }

              // If scheduled but no zoom link and no permission = absence
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

            if (dailyDeduction > 0) {
              // Create individual waiver records for each affected student for better tracking
              affectedStudents.forEach((affStudent) => {
                computedAbsenceWaivers.push({
                  teacherId,
                  deductionType: "absence" as const,
                  deductionDate: new Date(d),
                  originalAmount: affStudent.rate,
                  reason: `${reason} | ${affStudent.name} (${affStudent.package}): Scheduled but no zoom link sent - ${affStudent.rate} ETB`,
                  adminId,
                });
              });
              totalAmountWaived += dailyDeduction;
            }
          }

          if (computedAbsenceWaivers.length > 0) {
            const createdComputedWaivers =
              await tx.deduction_waivers.createMany({
                data: computedAbsenceWaivers,
                skipDuplicates: true,
              });

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

            // Get ALL students for this teacher (EXACT same filter as salary calculator)
            const allStudents = await tx.wpos_wpdatatable_23.findMany({
              where: {
                OR: [
                  // Current assignment (active or not yet)
                  {
                    ustaz: teacherId,
                    status: { in: ["active", "Active", "Not yet", "not yet"] },
                  },
                  // Historical assignment via occupiedTimes (catches teacher changes)
                  {
                    status: { in: ["active", "Active", "Not yet", "not yet"] },
                    occupiedTimes: {
                      some: {
                        ustaz_id: teacherId,
                      },
                    },
                  },
                ],
              },
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
                // Create scheduled time on the same day as sent_time (preserves timezone)
                const scheduledTime = new Date(link.sent_time);
                scheduledTime.setHours(
                  scheduled.hours,
                  scheduled.minutes,
                  0,
                  0
                );

                // Calculate lateness in minutes
                const latenessMinutes = Math.round(
                  (link.sent_time.getTime() - scheduledTime.getTime()) / 60000
                );

                // Skip if early (negative lateness)
                if (latenessMinutes < 0) continue;

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
          const createdWaivers = await tx.deduction_waivers.createMany({
            data: waiverData,
            skipDuplicates: true,
          });

          recordsAffected = createdWaivers.count;

          // Verify creation
          const verifyCount = await tx.deduction_waivers.count({
            where: {
              teacherId: { in: teacherIdsArray },
              deductionType: "lateness",
              deductionDate: { gte: startDate, lte: endDate },
            },
          });
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

      return { recordsAffected, totalAmountWaived };
    });

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
    const dateStr = format(date, "yyyy-MM-dd");
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
    // Create scheduled time on the same day as sent_time (preserves timezone)
    const scheduledTime = new Date(firstLink.sent_time);
    scheduledTime.setHours(scheduled.hours, scheduled.minutes, 0, 0);

    // Calculate lateness in minutes
    const latenessMinutes = Math.round(
      (firstLink.sent_time.getTime() - scheduledTime.getTime()) / 60000
    );

    // Skip if early (negative lateness)
    if (latenessMinutes < 0) return 0;

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
