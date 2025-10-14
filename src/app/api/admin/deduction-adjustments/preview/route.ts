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

        // Get current students (same as teacher payments)
        const currentStudents = await prisma.wpos_wpdatatable_23.findMany({
          where: { ustaz: teacherId, status: { in: ["active", "Active"] } },
          select: {
            wdt_ID: true,
            name: true,
            package: true,
            zoom_links: {
              where: {
                sent_time: { gte: startDate, lte: endDate },
              },
              select: { sent_time: true },
            },
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

        console.log(
          `📊 Preview - Teacher ${teacherId}: Found ${absenceWaivers.length} waived dates:`,
          Array.from(waivedDates)
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

        // Get students with their occupied times for proper daypackage checking
        // Use OR to catch both current assignments AND historical assignments (teacher changes)
        const studentsWithOccupiedTimes =
          await prisma.wpos_wpdatatable_23.findMany({
            where: {
              OR: [
                // Current assignment (active or not yet)
                {
                  ustaz: teacherId,
                  status: { in: ["active", "Active", "Not yet", "not yet"] },
                  occupiedTimes: {
                    some: {
                      ustaz_id: teacherId,
                      occupied_at: { lte: endDate },
                      OR: [{ end_at: null }, { end_at: { gte: startDate } }],
                    },
                  },
                },
                // Historical assignment via occupiedTimes (catches teacher changes)
                {
                  status: { in: ["active", "Active", "Not yet", "not yet"] },
                  occupiedTimes: {
                    some: {
                      ustaz_id: teacherId,
                      occupied_at: { lte: endDate },
                      OR: [{ end_at: null }, { end_at: { gte: startDate } }],
                    },
                  },
                },
              ],
            },
            include: {
              occupiedTimes: {
                where: {
                  ustaz_id: teacherId,
                  occupied_at: { lte: endDate },
                  OR: [{ end_at: null }, { end_at: { gte: startDate } }],
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

        // Helper to parse daypackage
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
          // Skip future dates
          if (d > today) continue;

          const dayOfWeek = d.getDay();
          const dateStr = format(d, "yyyy-MM-dd");

          // Skip Sundays if not included
          if (!includeSundays && dayOfWeek === 0) continue;

          // Skip if we already have a database record for this date
          if (existingAbsenceDates.has(dateStr)) continue;

          // Skip if already waived
          if (waivedDates.has(dateStr)) continue;

          // Check EACH student individually (per-student logic)
          let dailyDeduction = 0;
          const affectedStudents = [];

          for (const student of studentsWithOccupiedTimes) {
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

        console.log(
          `📊 Preview Lateness - Teacher ${teacherId}: Found ${latenessWaivers.length} waived dates:`,
          Array.from(waivedLatenessDates)
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
