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

    if (adjustmentType === "waive_lateness") {
      // Get real lateness records from teacher payments calculation
      for (const teacherId of teacherIds) {
        const teacher = await prisma.wpos_wpdatatable_24.findUnique({
          where: { ustazid: teacherId },
          select: { ustazname: true },
        });

        if (!teacher) continue;

        // Get teacher's students and their zoom links for lateness calculation
        const students = await prisma.wpos_wpdatatable_23.findMany({
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
            occupiedTimes: { select: { time_slot: true } },
          },
        });

        // Get package deduction rates
        const packageDeductions = await prisma.packageDeduction.findMany();
        const packageDeductionMap: Record<string, number> = {};
        packageDeductions.forEach((pkg) => {
          packageDeductionMap[pkg.packageName] =
            Number(pkg.latenessBaseAmount) || 30;
        });

        // Get lateness configuration
        const latenessConfigs = await prisma.latenessdeductionconfig.findMany({
          orderBy: [{ tier: "asc" }, { startMinute: "asc" }],
        });

        if (latenessConfigs.length === 0) continue;

        const excusedThreshold = Math.min(
          ...latenessConfigs.map((c) => c.excusedThreshold ?? 0)
        );
        const tiers = latenessConfigs.map((c) => ({
          start: c.startMinute,
          end: c.endMinute,
          percent: c.deductionPercent,
        }));

        // Calculate lateness for each day
        for (
          let d = new Date(startDate);
          d <= endDate;
          d.setDate(d.getDate() + 1)
        ) {
          const dateStr = format(d, "yyyy-MM-dd");

          for (const student of students) {
            const timeSlot = student.occupiedTimes?.[0]?.time_slot;
            if (!timeSlot) continue;

            // Convert time to 24-hour format
            function to24Hour(time12h: string) {
              if (!time12h) return "00:00";
              if (time12h.includes("AM") || time12h.includes("PM")) {
                const [time, modifier] = time12h.split(" ");
                let [hours, minutes] = time.split(":");
                if (hours === "12") hours = modifier === "AM" ? "00" : "12";
                else if (modifier === "PM")
                  hours = String(parseInt(hours, 10) + 12);
                return `${hours.padStart(2, "0")}:${minutes}`;
              }
              if (time12h.includes(":")) {
                const parts = time12h.split(":");
                return `${parts[0].padStart(2, "0")}:${(
                  parts[1] || "00"
                ).padStart(2, "0")}`;
              }
              return "00:00";
            }

            const time24 = to24Hour(timeSlot);
            const scheduledTime = new Date(`${dateStr}T${time24}:00.000Z`);

            // Find zoom links for this day
            const dayLinks = student.zoom_links.filter((link) => {
              if (!link.sent_time) return false;
              return format(link.sent_time, "yyyy-MM-dd") === dateStr;
            });

            if (dayLinks.length === 0) continue;

            const actualStartTime = dayLinks.sort(
              (a, b) => a.sent_time!.getTime() - b.sent_time!.getTime()
            )[0].sent_time!;

            const latenessMinutes = Math.max(
              0,
              Math.round(
                (actualStartTime.getTime() - scheduledTime.getTime()) / 60000
              )
            );

            if (latenessMinutes > excusedThreshold) {
              const studentPackage = student.package || "";
              const baseDeductionAmount =
                packageDeductionMap[studentPackage] || 30;

              let deduction = 0;
              for (const [i, tier] of tiers.entries()) {
                if (
                  latenessMinutes >= tier.start &&
                  latenessMinutes <= tier.end
                ) {
                  deduction = baseDeductionAmount * (tier.percent / 100);
                  break;
                }
              }

              if (deduction > 0) {
                records.push({
                  id: `lateness_${teacherId}_${dateStr}_${student.wdt_ID}`,
                  teacherId,
                  teacherName: teacher.ustazname,
                  studentName: student.name,
                  date: d,
                  type: "Lateness",
                  deduction: Math.round(deduction),
                  latenessMinutes,
                  timeSlot,
                  package: studentPackage,
                });
                totalAmount += Math.round(deduction);
              }
            }
          }
        }
      }
    }

    if (adjustmentType === "waive_absence") {
      // Get real absence records from database
      const absenceRecords = await prisma.absencerecord.findMany({
        where: {
          teacherId: { in: teacherIds },
          classDate: { gte: startDate, lte: endDate },
        },
        include: {
          wpos_wpdatatable_24: {
            select: { ustazname: true },
          },
        },
      });

      for (const record of absenceRecords) {
        records.push({
          id: `absence_${record.id}`,
          teacherId: record.teacherId,
          teacherName: record.wpos_wpdatatable_24?.ustazname || "Unknown",
          date: record.classDate,
          type: "Absence",
          deduction: record.deductionApplied,
          permitted: record.permitted,
        });
        totalAmount += record.deductionApplied;
      }
    }

    // Calculate summary
    const teacherBreakdown = teacherIds
      .map((teacherId: string) => {
        const teacherRecords = records.filter((r) => r.teacherId === teacherId);
        const teacherTotal = teacherRecords.reduce(
          (sum, r) => sum + r.deduction,
          0
        );
        const teacherName = teacherRecords[0]?.teacherName || "Unknown";

        return {
          teacherId,
          teacherName,
          recordCount: teacherRecords.length,
          totalDeduction: teacherTotal,
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

    return NextResponse.json({
      records,
      summary,
      message: `Found ${records.length} deduction records totaling ${totalAmount} ETB`,
    });
  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json(
      {
        error: "Failed to preview adjustments",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
