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

    const debugInfo: any = {
      dateRange: {
        start: format(startDate, "yyyy-MM-dd"),
        end: format(endDate, "yyyy-MM-dd"),
        daysInRange:
          Math.ceil(
            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
          ) + 1,
      },
      teachers: [],
    };

    if (adjustmentType === "waive_absence") {
      for (const teacherId of teacherIdsArray) {
        const teacherDebug = {
          teacherId,
          teacherName: "",
          students: [] as Array<{
            id: number;
            name: string;
            package: string;
            status: string;
            zoomLinksCount: number;
            occupiedTimesCount: number;
            attendanceRecordsCount: number;
          }>,
          dateAnalysis: [] as Array<{
            date: string;
            dayOfWeek: number;
            isSunday: boolean;
            skipSunday: boolean;
            hasExistingRecord: boolean;
            isWaived: boolean;
          }>,
          totalDeduction: 0,
          issues: [] as string[],
        };

        const teacher = await prisma.wpos_wpdatatable_24.findUnique({
          where: { ustazid: teacherId },
          select: { ustazname: true },
        });

        if (!teacher) {
          teacherDebug.issues.push("Teacher not found");
          debugInfo.teachers.push(teacherDebug);
          continue;
        }

        teacherDebug.teacherName = teacher.ustazname || "Unknown";

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

        // Get ALL students assigned to this teacher
        const currentStudents = await prisma.wpos_wpdatatable_23.findMany({
          where: {
            OR: [
              {
                ustaz: teacherId,
                occupiedTimes: {
                  some: {
                    ustaz_id: teacherId,
                    occupied_at: { lte: endDate },
                    OR: [{ end_at: null }, { end_at: { gte: startDate } }],
                  },
                },
              },
              {
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
                // CRITICAL FIX: Don't filter by date range here
                // This was causing inconsistent results when different date ranges were used
                // The date filtering should only happen during the absence calculation loop
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

        teacherDebug.students = currentStudents.map((s) => ({
          id: s.wdt_ID,
          name: s.name || "Unknown",
          package: s.package || "Unknown",
          status: s.status || "Unknown",
          zoomLinksCount: s.zoom_links?.length || 0,
          occupiedTimesCount: s.occupiedTimes?.length || 0,
          attendanceRecordsCount: s.attendance_progress?.length || 0,
        }));

        // Get teacher change history
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

        // Get existing absence records
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

        const existingAbsenceDates = new Set(
          teacherAbsenceRecords.map((record) =>
            format(record.classDate, "yyyy-MM-dd")
          )
        );

        // Add deductions from existing database records
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
            teacherDebug.totalDeduction += record.deductionApplied;
          }
        }

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
          const studentChanges = teacherChanges
            .filter((tc) => tc.student_id === studentId)
            .sort((a, b) => a.change_date.getTime() - b.change_date.getTime());

          if (studentChanges.length > 0) {
            let currentTeacherOnDate: string | null = null;

            for (const change of studentChanges) {
              const changeDate = new Date(change.change_date);
              changeDate.setHours(0, 0, 0, 0);
              const checkDate = new Date(date);
              checkDate.setHours(0, 0, 0, 0);

              if (checkDate < changeDate) {
                if (studentChanges[0] === change && change.old_teacher_id) {
                  currentTeacherOnDate = change.old_teacher_id;
                }
                break;
              } else {
                currentTeacherOnDate = change.new_teacher_id;
              }
            }

            return currentTeacherOnDate === teacherId;
          }

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

        // Helper function to parse daypackage
        const parseDaypackage = (dp: string): number[] => {
          if (!dp || dp.trim() === "") {
            return [];
          }

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

          const numericMatch = dpTrimmed.match(/\d+/g);
          if (numericMatch) {
            const days = numericMatch
              .map(Number)
              .filter((d) => d >= 0 && d <= 6);
            return days;
          }

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

        // Safe date iteration
        const safeDateIterator = (startDate: Date, endDate: Date) => {
          const dates: Date[] = [];
          const current = new Date(startDate);

          while (current <= endDate) {
            const year = current.getFullYear();
            const month = current.getMonth();
            const day = current.getDate();

            const testDate = new Date(year, month, day);
            if (
              testDate.getFullYear() === year &&
              testDate.getMonth() === month &&
              testDate.getDate() === day
            ) {
              dates.push(new Date(testDate));
            }

            current.setTime(current.getTime() + 24 * 60 * 60 * 1000);
          }

          return dates;
        };

        const datesToProcess = safeDateIterator(startDate, endDate);
        teacherDebug.dateAnalysis = datesToProcess.map((d) => {
          const zonedDate = toZonedTime(d, TZ);
          const dateStr = format(zonedDate, "yyyy-MM-dd");
          const dayOfWeek = zonedDate.getDay();

          return {
            date: dateStr,
            dayOfWeek,
            isSunday: dayOfWeek === 0,
            skipSunday: dayOfWeek === 0 && !includeSundays,
            hasExistingRecord: existingAbsenceDates.has(dateStr),
            isWaived: waivedDates.has(dateStr),
          };
        });

        for (const d of datesToProcess) {
          const zonedDate = toZonedTime(d, TZ);
          const dateStr = format(zonedDate, "yyyy-MM-dd");
          const dayOfWeek = zonedDate.getDay();

          if (dayOfWeek === 0 && !includeSundays) {
            continue;
          }

          if (existingAbsenceDates.has(dateStr)) continue;
          if (waivedDates.has(dateStr)) continue;

          let dailyDeduction = 0;
          const affectedStudents = [];

          for (const student of currentStudents) {
            const isAssigned = isTeacherAssignedOnDate(
              student.wdt_ID,
              d,
              student.occupiedTimes || []
            );

            if (!isAssigned) {
              continue;
            }

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

            if (relevantOccupiedTimes.length === 0) {
              const hasZoomLinksInPeriod = student.zoom_links?.some(
                (link: any) => {
                  if (!link.sent_time) return false;
                  // Don't filter by date range here - this was causing inconsistent results
                  return true;
                }
              );

              if (!hasZoomLinksInPeriod) {
                continue;
              }

              if (student.occupiedTimes.length > 0) {
                relevantOccupiedTimes.push(...student.occupiedTimes);
              } else {
                continue;
              }
            }

            let isScheduled = false;
            let scheduledDays: number[] = [];
            for (const ot of relevantOccupiedTimes) {
              const parsedDays = parseDaypackage(ot.daypackage || "");
              scheduledDays = [...new Set([...scheduledDays, ...parsedDays])];

              if (parsedDays.includes(dayOfWeek)) {
                isScheduled = true;
              }
            }

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

            const hasZoomLink = student.zoom_links?.some((link: any) => {
              if (!link.sent_time) return false;
              const linkDate = format(new Date(link.sent_time), "yyyy-MM-dd");
              return linkDate === dateStr;
            });

            if (hasZoomLink) continue;

            const attendanceRecord = student.attendance_progress?.find(
              (att: any) => {
                const attDate = format(new Date(att.date), "yyyy-MM-dd");
                return attDate === dateStr;
              }
            );

            if (attendanceRecord?.attendance_status === "Permission") {
              continue;
            }

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
                affectedStudents: [affStudent],
                details: `${affStudent.name} (${affStudent.package}): No zoom link sent - ${affStudent.rate} ETB`,
              });
            });
            totalAmount += dailyDeduction;
            teacherDebug.totalDeduction += dailyDeduction;
          }
        }

        debugInfo.teachers.push(teacherDebug);
      }
    }

    const summary = {
      totalRecords: records.length,
      totalAmount,
      debugInfo,
    };

    return NextResponse.json({ records, summary });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      {
        error: "Failed to debug adjustments",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
