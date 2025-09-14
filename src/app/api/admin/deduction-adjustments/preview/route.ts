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

    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const records: any[] = [];
    let totalAmount = 0;

    if (adjustmentType === "waive_absence") {
      // Use EXACT same logic as teacher payments API
      for (const teacherId of teacherIds) {
        const teacher = await prisma.wpos_wpdatatable_24.findUnique({
          where: { ustazid: teacherId },
          select: { ustazname: true },
        });

        if (!teacher) continue;

        // Get package deduction rates (same as teacher payments)
        const packageDeductions = await prisma.packageDeduction.findMany();
        const packageDeductionMap: Record<string, { lateness: number; absence: number }> = {};
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
            deductionType: 'absence',
            deductionDate: { gte: startDate, lte: endDate }
          }
        });
        
        const waivedDates = new Set(absenceWaivers.map(w => w.deductionDate.toISOString().split('T')[0]));

        // Create a set of dates that already have absence records
        const existingAbsenceDates = new Set(
          teacherAbsenceRecords.map((record) =>
            format(record.classDate, "yyyy-MM-dd")
          )
        );

        // Add deductions from existing database records (not waived)
        for (const record of teacherAbsenceRecords) {
          const dateStr = format(record.classDate, "yyyy-MM-dd");
          if (!record.isWaived && !waivedDates.has(dateStr)) {
            records.push({
              id: `absence_db_${record.id}`,
              teacherId: record.teacherId,
              teacherName: teacher.ustazname,
              date: record.classDate,
              type: "Absence",
              deduction: record.deductionApplied,
              permitted: record.permitted,
              source: "database",
              details: record.permitted ? "Permitted absence (DB)" : "Unpermitted absence (DB)",
            });
            totalAmount += record.deductionApplied;
          }
        }

        // Check for additional computed absences (same logic as teacher payments)
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        // Get working days configuration
        const workingDaysConfig = await prisma.setting.findUnique({
          where: { key: "include_sundays_in_salary" },
        });
        const includeSundays = workingDaysConfig?.value === "true" || false;

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          // Skip future dates
          if (d > today) continue;

          // Skip Sundays if not included
          if (!includeSundays && d.getDay() === 0) continue;

          const dateStr = format(d, "yyyy-MM-dd");

          // Skip if we already have a database record for this date
          if (existingAbsenceDates.has(dateStr)) continue;

          // Skip if already waived
          if (waivedDates.has(dateStr)) continue;

          // Check if teacher sent any zoom links on this day
          const dayHasZoomLinks = currentStudents.some((student) =>
            student.zoom_links.some((link) => {
              if (!link.sent_time) return false;
              const linkDate = format(link.sent_time, "yyyy-MM-dd");
              return linkDate === dateStr;
            })
          );

          // If no zoom links were sent and teacher has students, it's a computed absence
          if (!dayHasZoomLinks && currentStudents.length > 0) {
            // Calculate package-based deduction for this absence
            let dailyDeduction = 0;
            const affectedStudents = [];

            for (const student of currentStudents) {
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
              records.push({
                id: `absence_computed_${teacherId}_${dateStr}`,
                teacherId,
                teacherName: teacher.ustazname,
                date: new Date(d),
                type: "Absence",
                deduction: dailyDeduction,
                permitted: false,
                source: "computed",
                affectedStudents,
                details: `Computed absence: ${affectedStudents.length} students, packages: ${affectedStudents.map(s => s.package).join(", ")}`,
              });
              totalAmount += dailyDeduction;
            }
          }
        }
      }
    }

    if (adjustmentType === "waive_lateness") {
      // Use EXACT same logic as teacher payments API
      for (const teacherId of teacherIds) {
        const teacher = await prisma.wpos_wpdatatable_24.findUnique({
          where: { ustazid: teacherId },
          select: { ustazname: true },
        });

        if (!teacher) continue;

        // Get package deduction rates
        const packageDeductions = await prisma.packageDeduction.findMany();
        const packageDeductionMap: Record<string, { lateness: number; absence: number }> = {};
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
            deductionType: 'lateness',
            deductionDate: { gte: startDate, lte: endDate }
          }
        });
        
        const waivedLatenessDates = new Set(latenessWaivers.map(w => w.deductionDate.toISOString().split('T')[0]));
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

          // Get ALL students for this teacher (same as teacher payments)
          const allStudents = await prisma.wpos_wpdatatable_23.findMany({
            where: { ustaz: teacherId },
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

              // Convert time to 24-hour format (same function as teacher payments)
              function convertTo24Hour(timeStr: string): string {
                if (!timeStr) return "00:00";

                if (timeStr.includes("AM") || timeStr.includes("PM")) {
                  const match = timeStr.match(
                    /^(\d{1,2}):(\d{2})\s?(AM|PM)$/i
                  );
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
              const scheduledTime = new Date(`${dateStr}T${time24}:00.000Z`);

              const latenessMinutes = Math.max(
                0,
                Math.round(
                  (link.sent_time.getTime() - scheduledTime.getTime()) / 60000
                )
              );

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
                  if (
                    latenessMinutes >= t.start &&
                    latenessMinutes <= t.end
                  ) {
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
                    date: new Date(dateStr),
                    type: "Lateness",
                    deduction,
                    latenessMinutes,
                    timeSlot: link.timeSlot,
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
    const teacherBreakdown = teacherIds
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
