import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // Get config
    const deductionConfig = await prisma.deductionbonusconfig.findFirst({
      where: { configType: "absence", key: "unpermitted_absence_deduction" },
    });
    const monthsConfig = await prisma.deductionbonusconfig.findFirst({
      where: {
        configType: "absence",
        key: "absence_deduction_effective_months",
      },
    });

    const deductionAmount = parseFloat(deductionConfig?.value || "50");
    const effectiveMonths = monthsConfig?.value?.split(",") || [];
    const currentMonth = new Date().getMonth() + 1;

    // Check if current month is effective
    if (
      effectiveMonths.length > 0 &&
      !effectiveMonths.includes(currentMonth.toString())
    ) {
      return NextResponse.json({
        message: "Current month not in effective months",
        processed: 0,
      });
    }

    let processed = 0;

    // Process last 7 days
    for (let i = 1; i <= 7; i++) {
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split("T")[0];
      const dayName = checkDate.toLocaleDateString("en-US", {
        weekday: "long",
      });

      // Get teachers with students
      const teachers = await prisma.wpos_wpdatatable_24.findMany({
        include: {
          students: {
            select: { wdt_ID: true, daypackages: true, status: true },
          },
        },
      });

      for (const teacher of teachers) {
        // Skip if already processed
        const existing = await prisma.absencerecord.findFirst({
          where: {
            teacherId: teacher.ustazid,
            classDate: {
              gte: new Date(dateStr + "T00:00:00.000Z"),
              lt: new Date(dateStr + "T23:59:59.999Z"),
            },
          },
        });
        if (existing) continue;

        // Check scheduled students for this day
        const scheduledStudents = teacher.students.filter((student) => {
          if (!student.daypackages || student.status === "inactive")
            return false;
          return (
            student.daypackages.includes("All days") ||
            student.daypackages.includes(dayName)
          );
        });
        if (scheduledStudents.length === 0) continue;

        // Check zoom links
        const dayStart = new Date(checkDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(checkDate);
        dayEnd.setHours(23, 59, 59, 999);

        const zoomLinks = await prisma.wpos_zoom_links.findMany({
          where: {
            ustazid: teacher.ustazid,
            studentid: { in: scheduledStudents.map((s) => s.wdt_ID) },
            sent_time: { gte: dayStart, lt: dayEnd },
          },
        });

        // If no zoom links = absent
        if (zoomLinks.length === 0) {
          // Check permission
          const permission = await prisma.permissionrequest.findFirst({
            where: {
              teacherId: teacher.ustazid,
              requestedDate: dateStr,
            },
          });

          const isPermitted = permission?.status === "Approved";
          const deduction = isPermitted ? 0 : deductionAmount;

          // Create absence record
          await prisma.absencerecord.create({
            data: {
              teacherId: teacher.ustazid,
              classDate: checkDate,
              permitted: isPermitted,
              permissionRequestId: permission?.id || null,
              deductionApplied: deduction,
              reviewedByManager: false,
              adminId: (session.user as { id: string }).id,
            },
          });

          // Update salary
          const monthKey = `${checkDate.getFullYear()}-${String(
            checkDate.getMonth() + 1
          ).padStart(2, "0")}`;

          await prisma.teachersalarypayment.upsert({
            where: {
              teacherId_period: {
                teacherId: teacher.ustazid,
                period: monthKey,
              },
            },
            create: {
              teacherId: teacher.ustazid,
              period: monthKey,
              status: "pending",
              totalSalary: 0,
              latenessDeduction: 0,
              absenceDeduction: deduction,
              bonuses: 0,
            },
            update: {
              absenceDeduction: { increment: deduction },
            },
          });

          processed++;
        }
      }
    }

    return NextResponse.json({
      message: `Processed ${processed} new absences`,
      processed,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
