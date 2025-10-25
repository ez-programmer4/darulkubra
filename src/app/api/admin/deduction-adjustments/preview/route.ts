import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const TZ = "Asia/Riyadh";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { adjustmentType, dateRange, teacherIds, timeSlots } =
      await req.json();

    if (!dateRange?.startDate || !dateRange?.endDate || !teacherIds?.length) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Ensure teacherIds are strings to match database schema
    const teacherIdsArray = Array.isArray(teacherIds)
      ? teacherIds.map((id) => String(id))
      : [String(teacherIds)];

    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const records: any[] = [];
    let totalAmount = 0;

    if (adjustmentType === "waive_absence") {
      // Use EXACT same logic as teacher payments API
      for (const teacherId of teacherIdsArray) {
        const teacher = await prisma.wpos_wpdatatable_24.findUnique({
          where: { ustazid: teacherId },
          select: { ustazname: true },
        });

        if (!teacher) continue;

        // Get package deduction rates (same as teacher payments)
        const packageDeductions = await prisma.packageDeduction.findMany();
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
        const currentStudents = await prisma.wpos_wpdatatable_23.findMany({
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

        // Get teacher change history for proper assignment validation
        const teacherChanges = await prisma.teacher_change_history.findMany({
          where: {
            OR: [{ old_teacher_id: teacherId }, { new_teacher_id: teacherId }],
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

        // Get existing absence records from database
        const teacherAbsenceRecords = await prisma.absencerecord.findMany({
          where: {
            teacherId,
            classDate: { gte: startDate, lte: endDate },
          },
          orderBy: { classDate: "asc" },
        });

        // Get absence waivers
        const absenceWaivers = await prisma.deduction_waivers.findMany({
          where: {
            teacherId,
            deductionType: "absence",
            deductionDate: { gte: startDate, lte: endDate },
          },
        });

        const waivedDates = new Set(
          absenceWaivers.map((w) => format(w.deductionDate, "yyyy-MM-dd"))
        );

        // Create a set of dates that already have absence records
        const existingAbsenceDates = new Set(
          teacherAbsenceRecords.map((record) =>
            format(record.classDate, "yyyy-MM-dd")
          )
        );

        // Add deductions from existing database records (not waived)
        for (const record of teacherAbsenceRecords) {
          const dateStr = format(record.classDate, "yyyy-MM-dd");
          if (!waivedDates.has(dateStr)) {
            records.push({
              id: `absence_db_${record.id}`,
              teacherId: record.teacherId,
              teacherName: teacher.ustazname,
              date: record.classDate,
              type: "Absence",
              deduction: record.deductionApplied,
              permitted: record.permitted,
              source: "database",
              details: record.permitted
                ? "Permitted absence (DB)"
                : "Unpermitted absence (DB)",
            });
            totalAmount += record.deductionApplied;
          }
        }

        // Check for additional computed absences (per-student logic like salary calculator)
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        // Get working days configuration
        const workingDaysConfig = await prisma.setting.findUnique({
          where: { key: "include_sundays_in_salary" },
        });
        const includeSundays = workingDaysConfig?.value === "true" || false;

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
            .sort((a, b) => a.change_date.getTime() - b.change_date.getTime());

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

        // Helper function to parse daypackage (EXACT same as salary calculator)
        const parseDaypackage = (dp: string): number[] => {
          if (!dp || dp.trim() === "") {
            return [];
          }

          const dpTrimmed = dp.trim().toUpperCase();

          // Common patterns
          if (dpTrimmed === "ALL DAYS" || dpTrimmed === "ALLDAYS") {
            return [0, 1, 2, 3, 4, 5, 6]; // Sunday to Saturday
          }
          if (dpTrimmed === "MWF") {
            return [1, 3, 5]; // Monday, Wednesday, Friday
          }
          if (dpTrimmed === "TTS" || dpTrimmed === "TTH") {
            return [2, 4, 6]; // Tuesday, Thursday, Saturday
          }

          // Day mapping
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

          // Check for exact day match
          if (dayMap[dpTrimmed] !== undefined) {
            return [dayMap[dpTrimmed]];
          }

          // Check for numeric patterns
          const numericMatch = dpTrimmed.match(/\d+/g);
          if (numericMatch) {
            const days = numericMatch
              .map(Number)
              .filter((d) => d >= 0 && d <= 6);
            return days;
          }

          // Check for comma-separated days
          if (dpTrimmed.includes(",")) {
            const parts = dpTrimmed.split(",").map((p) => p.trim());
            const days: number[] = [];
            for (const part of parts) {
              const day = dayMap[part] ?? parseInt(part);
              if (!isNaN(day) && day >= 0 && day <= 6) {
                days.push(day);
              }
            }
            return days;
          }

          return [];
        };

        // Safe date iteration to avoid invalid dates like Sept 31st (EXACT same as salary calculator)
        const safeDateIterator = (startDate: Date, endDate: Date) => {
          const dates: Date[] = [];
          const current = new Date(startDate);

          while (current <= endDate) {
            // Validate the date to avoid invalid dates like Sept 31st
            const year = current.getFullYear();
            const month = current.getMonth();
            const day = current.getDate();

            // Check if this is a valid date
            const testDate = new Date(year, month, day);
            if (
              testDate.getFullYear() === year &&
              testDate.getMonth() === month &&
              testDate.getDate() === day
            ) {
              dates.push(new Date(testDate));
            }

            // Move to next day safely
            current.setTime(current.getTime() + 24 * 60 * 60 * 1000);
          }

          return dates;
        };

        const datesToProcess = safeDateIterator(startDate, endDate);

        for (const d of datesToProcess) {
          // Convert to timezone-aware date for proper day calculation (EXACT same as salary calculator)
          const zonedDate = toZonedTime(d, TZ);
          const dateStr = format(zonedDate, "yyyy-MM-dd");
          const dayOfWeek = zonedDate.getDay();
          // Skip Sunday unless configured to include
          if (dayOfWeek === 0 && !includeSundays) {
            continue;
          }

          // Skip if we already have a database record for this date
          if (existingAbsenceDates.has(dateStr)) continue;

          // Skip if already waived
          if (waivedDates.has(dateStr)) continue;

          // Check EACH student individually (per-student logic)
          let dailyDeduction = 0;
          const affectedStudents = [];

          // Check each student (EXACT same logic as salary calculator)
          for (const student of currentStudents) {
            // Check if teacher was actually assigned to this student on this date
            // considering teacher changes
            const isAssigned = isTeacherAssignedOnDate(
              student.wdt_ID,
              d,
              student.occupiedTimes || []
            );

            if (!isAssigned) {
              continue;
            }

            // Get relevant occupied times for daypackage checking
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

            // If no occupied times, check if student has zoom links during the period
            // If yes, assume they should be taught and check their daypackage
            if (relevantOccupiedTimes.length === 0) {
              // Check if student has any zoom links during the period
              const hasZoomLinksInPeriod = student.zoom_links?.some(
                (link: any) => {
                  if (!link.sent_time) return false;
                  const linkDate = new Date(link.sent_time);
                  return linkDate >= startDate && linkDate <= endDate;
                }
              );

              if (!hasZoomLinksInPeriod) {
                continue;
              }

              // Student has zoom links but no occupied times - use all occupied times
              // This handles cases where occupied times might be missing
              if (student.occupiedTimes.length > 0) {
                relevantOccupiedTimes.push(...student.occupiedTimes);
              } else {
                continue;
              }
            }

            // Check if student is scheduled on this day
            let isScheduled = false;
            let scheduledDays: number[] = [];
            for (const ot of relevantOccupiedTimes) {
              const parsedDays = parseDaypackage(ot.daypackage || "");
              scheduledDays = [...new Set([...scheduledDays, ...parsedDays])];

              if (parsedDays.includes(dayOfWeek)) {
                isScheduled = true;
              }
            }

            // Fallback: if no daypackage at all but has zoom links, assume weekdays
            // Only apply fallback if scheduledDays is empty (no daypackage defined)
            if (
              !isScheduled &&
              scheduledDays.length === 0 &&
              student.zoom_links?.length > 0
            ) {
              isScheduled = dayOfWeek >= 1 && dayOfWeek <= 5;
            }

            if (!isScheduled) {
              continue;
            }

            // Check if student has zoom link for this date
            const hasZoomLink = student.zoom_links?.some((link: any) => {
              if (!link.sent_time) return false;
              const linkDate = format(new Date(link.sent_time), "yyyy-MM-dd");
              return linkDate === dateStr;
            });

            if (hasZoomLink) continue;

            // Check if student has attendance permission for this date
            const attendanceRecord = student.attendance_progress?.find(
              (att: any) => {
                const attDate = format(new Date(att.date), "yyyy-MM-dd");
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
              name: student.name,
              package: student.package || "Unknown",
              rate: packageRate,
            });
          }

          if (dailyDeduction > 0) {
            // Add individual records for each affected student for better detail
            affectedStudents.forEach((affStudent) => {
              records.push({
                id: `absence_computed_${teacherId}_${dateStr}_${affStudent.name}`,
                teacherId,
                teacherName: teacher.ustazname,
                studentName: affStudent.name,
                studentPackage: affStudent.package,
                date: new Date(d),
                type: "Absence",
                deduction: affStudent.rate,
                permitted: false,
                source: "computed",
                affectedStudents: [affStudent], // Single student for this record
                details: `${affStudent.name} (${affStudent.package}): No zoom link sent - ${affStudent.rate} ETB`,
              });
            });
            totalAmount += dailyDeduction;
          }
        }
      }
    }

    if (adjustmentType === "waive_lateness") {
      // Use EXACT same logic as teacher payments API
      for (const teacherId of teacherIdsArray) {
        const teacher = await prisma.wpos_wpdatatable_24.findUnique({
          where: { ustazid: teacherId },
          select: { ustazname: true },
        });

        if (!teacher) continue;

        // Get package deduction rates
        const packageDeductions = await prisma.packageDeduction.findMany();
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

        // Get existing waivers
        const latenessWaivers = await prisma.deduction_waivers.findMany({
          where: {
            teacherId,
            deductionType: "lateness",
            deductionDate: { gte: startDate, lte: endDate },
          },
        });

        const waivedLatenessDates = new Set(
          latenessWaivers.map((w) => format(w.deductionDate, "yyyy-MM-dd"))
        );

        const defaultBaseDeductionAmount = 30;

        const latenessConfigs = await prisma.latenessdeductionconfig.findMany({
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
          const allStudents = await prisma.wpos_wpdatatable_23.findMany({
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

          // Group zoom links by date (same logic as teacher payments)
          const dailyZoomLinks = new Map();

          for (const student of allStudents) {
            student.zoom_links.forEach((link) => {
              if (link.sent_time) {
                const dateStr = format(link.sent_time, "yyyy-MM-dd");
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

          // Calculate lateness for each day (same logic as teacher payments)
          for (const [dateStr, links] of dailyZoomLinks.entries()) {
            const date = new Date(dateStr);
            if (date < startDate || date > endDate) continue;

            // Skip if already waived
            if (waivedLatenessDates.has(dateStr)) continue;

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

            // Calculate lateness for each student's earliest link
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

                    return `${hour.toString().padStart(2, "0")}:${minute}`;
                  }
                }

                return timeStr.includes(":")
                  ? timeStr.split(":").slice(0, 2).join(":")
                  : "00:00";
              }

              const time24 = convertTo24Hour(link.timeSlot);
              const [schedHours, schedMinutes] = time24.split(":").map(Number);

              // Create scheduled time on the same day as sent_time
              // sent_time is stored as Ethiopia local time, so use same timezone
              const scheduledTime = new Date(link.sent_time);
              scheduledTime.setHours(schedHours, schedMinutes, 0, 0);

              // Calculate lateness in minutes
              const latenessMinutes = Math.round(
                (link.sent_time.getTime() - scheduledTime.getTime()) / 60000
              );

              // Skip if early (negative lateness)
              if (latenessMinutes < 0) continue;

              if (latenessMinutes > excusedThreshold) {
                let deduction = 0;
                let tier = "No Tier";

                // Get student's package for package-specific deduction
                const student = allStudents.find(
                  (s) => s.wdt_ID === link.studentId
                );
                const studentPackage = student?.package || "";
                const baseDeductionAmount =
                  packageDeductionMap[studentPackage]?.lateness ||
                  defaultBaseDeductionAmount;

                // Find appropriate tier
                for (const [i, t] of tiers.entries()) {
                  if (latenessMinutes >= t.start && latenessMinutes <= t.end) {
                    deduction = Math.round(
                      baseDeductionAmount * (t.percent / 100)
                    );
                    tier = `Tier ${i + 1} (${t.percent}%) - ${studentPackage}`;
                    break;
                  }
                }

                if (deduction > 0) {
                  records.push({
                    id: `lateness_${teacherId}_${dateStr}_${link.studentId}`,
                    teacherId,
                    teacherName: teacher.ustazname,
                    studentName: link.studentName,
                    studentId: link.studentId,
                    date: new Date(dateStr),
                    type: "Lateness",
                    deduction,
                    latenessMinutes,
                    timeSlot: link.timeSlot,
                    studentPackage,
                    tier,
                    details: `${latenessMinutes} min late, ${link.timeSlot}, ${studentPackage}`,
                  });
                  totalAmount += deduction;
                }
              }
            }
          }
        }
      }
    }

    // Calculate summary
    const teacherBreakdown = teacherIdsArray
      .map((teacherId: string) => {
        const teacherRecords = records.filter((r) => r.teacherId === teacherId);
        return {
          teacherId,
          teacherName: teacherRecords[0]?.teacherName || "Unknown",
          recordCount: teacherRecords.length,
          totalDeduction: teacherRecords.reduce(
            (sum, r) => sum + r.deduction,
            0
          ),
        };
      })
      .filter((t: any) => t.recordCount > 0);

    const summary = {
      totalRecords: records.length,
      totalTeachers: teacherBreakdown.length,
      totalAmount,
      totalLatenessAmount: records
        .filter((r) => r.type === "Lateness")
        .reduce((sum, r) => sum + r.deduction, 0),
      totalAbsenceAmount: records
        .filter((r) => r.type === "Absence")
        .reduce((sum, r) => sum + r.deduction, 0),
      teacherBreakdown,
    };

    return NextResponse.json({ records, summary });
  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json(
      { error: "Failed to preview adjustments" },
      { status: 500 }
    );
  }
}
