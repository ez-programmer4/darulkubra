import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
// import {
//   isTeacherAbsent,
//   getAbsenceDeductionConfig,
// } from "@/lib/absence-utils";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    // If details query, return detailed breakdown
    if (
      url.pathname.endsWith("/details") ||
      url.searchParams.has("teacherId")
    ) {
      const teacherId = url.searchParams.get("teacherId");
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      if (!teacherId || !from || !to) {
        return NextResponse.json(
          { error: "Missing teacherId, from, or to" },
          { status: 400 }
        );
      }
      const fromDate = new Date(from);
      const toDate = new Date(to);
      // Fetch lateness deduction config from DB
      const latenessConfigs = await prisma.latenessdeductionconfig.findMany({
        orderBy: [{ tier: "asc" }, { startMinute: "asc" }],
      });
      let excusedThreshold = 3;
      let tiers = [
        { start: 4, end: 7, percent: 10 },
        { start: 8, end: 14, percent: 20 },
        { start: 15, end: 21, percent: 30 },
      ];
      let maxTierEnd = 21;
      if (latenessConfigs.length > 0) {
        excusedThreshold = Math.min(
          ...latenessConfigs.map((c) => c.excusedThreshold ?? 3)
        );
        tiers = latenessConfigs.map((c) => ({
          start: c.startMinute,
          end: c.endMinute,
          percent: c.deductionPercent,
        }));
        maxTierEnd = Math.max(...latenessConfigs.map((c) => c.endMinute));
      }
      // Get all students for this teacher in the date range
      const students = await prisma.wpos_wpdatatable_23.findMany({
        where: { ustaz: teacherId },
        include: {
          zoom_links: true,
        },
      });
      // For each day in the range, calculate lateness for each student
      const latenessRecords = [];
      for (
        let d = new Date(fromDate);
        d <= toDate;
        d.setDate(d.getDate() + 1)
      ) {
        const dateStr = d.toISOString().split("T")[0];
        for (const student of students) {
          if (!student.selectedTime) continue;
          // Convert selectedTime (12h or 24h) to Date for the day
          function to24Hour(time12h: string) {
            if (!time12h) return "00:00";
            if (
              time12h.includes(":") &&
              (time12h.includes("AM") || time12h.includes("PM"))
            ) {
              const [time, modifier] = time12h.split(" ");
              let [hours, minutes] = time.split(":");
              if (hours === "12") hours = modifier === "AM" ? "00" : "12";
              else if (modifier === "PM")
                hours = String(parseInt(hours, 10) + 12);
              return `${hours.padStart(2, "0")}:${minutes}`;
            }
            return time12h; // already 24h
          }
          const time24 = to24Hour(student.selectedTime);
          const scheduledTime = new Date(`${dateStr}T${time24}:00.000Z`);
          // Find the earliest sent_time for this student/date
          const sentTimes = (student.zoom_links || [])
            .filter(
              (zl) =>
                zl.sent_time &&
                zl.sent_time.toISOString().split("T")[0] === dateStr
            )
            .map((zl) => zl.sent_time)
            .sort((a, b) => {
              if (!a && !b) return 0;
              if (!a) return 1;
              if (!b) return -1;
              return a.getTime() - b.getTime();
            });
          const actualStartTime = sentTimes.length > 0 ? sentTimes[0] : null;
          if (!actualStartTime) continue;
          const latenessMinutes = Math.max(
            0,
            Math.round(
              (actualStartTime.getTime() - scheduledTime.getTime()) / 60000
            )
          );
          // Deduction logic
          let deductionApplied = 0;
          let deductionTier = "Excused";
          if (latenessMinutes > excusedThreshold) {
            let foundTier = false;
            for (const [i, tier] of tiers.entries()) {
              if (
                latenessMinutes >= tier.start &&
                latenessMinutes <= tier.end
              ) {
                deductionApplied = 30 * (tier.percent / 100);
                deductionTier = `Tier ${i + 1}`;
                foundTier = true;
                break;
              }
            }
            if (!foundTier && latenessMinutes > maxTierEnd) {
              deductionApplied = 30;
              deductionTier = "> Max Tier";
            }
          }
          latenessRecords.push({
            studentId: student.wdt_ID,
            studentName: student.name,
            classDate: scheduledTime,
            scheduledTime,
            actualStartTime,
            latenessMinutes,
            deductionApplied,
            deductionTier,
          });
        }
      }
      // Absence and bonus records as before
      let absenceRecords: any[] = [];
      let bonusRecords: any[] = [];
      if (typeof teacherId === "string") {
        absenceRecords = await prisma.absencerecord.findMany({
          where: {
            teacherId,
            classDate: { gte: fromDate, lte: toDate },
          },
          orderBy: { classDate: "asc" },
        });
        bonusRecords = await prisma.bonusrecord.findMany({
          where: {
            teacherId,
            createdAt: { gte: fromDate, lte: toDate },
          },
          orderBy: { createdAt: "asc" },
        });
      }
      return NextResponse.json({
        latenessRecords,
        absenceRecords,
        bonusRecords,
      });
    }
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing date range" },
        { status: 400 }
      );
    }
    const from = new Date(startDate);
    const to = new Date(endDate);

    // Get all teachers
    const teachers = await prisma.wpos_wpdatatable_24.findMany({
      select: {
        ustazid: true,
        ustazname: true,
      },
    });

    // Get student counts per teacher (active students only)
    const students = await prisma.wpos_wpdatatable_23.findMany({
      select: { ustaz: true },
      where: { status: { in: ["active", "Active"] } },
    });
    const studentCountMap: Record<string, number> = {};
    for (const s of students) {
      if (!s.ustaz) continue;
      studentCountMap[s.ustaz] = (studentCountMap[s.ustaz] || 0) + 1;
    }
    // Get base salary per student from settings
    let BASE_SALARY_PER_STUDENT = 900;
    const setting = await prisma.setting.findUnique({
      where: { key: "base_salary_per_student" },
    });
    if (setting && setting.value && !isNaN(Number(setting.value))) {
      BASE_SALARY_PER_STUDENT = Number(setting.value);
    }

    // For each teacher, calculate deductions and bonuses
    // Helper to get all periods in the date range
    function getPeriodsInRange(from: Date, to: Date): string[] {
      const periods = new Set<string>();
      let d = new Date(from.getFullYear(), from.getMonth(), 1);
      while (d <= to) {
        periods.add(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        );
        d.setMonth(d.getMonth() + 1);
      }
      return Array.from(periods) as string[];
    }
    const periodsInRange: string[] = getPeriodsInRange(from, to);
    const results = await Promise.all(
      teachers.map(async (t) => {
        // Calculate lateness deduction on-the-fly
        // Fetch lateness deduction config from DB
        const latenessConfigs = await prisma.latenessdeductionconfig.findMany({
          orderBy: [{ tier: "asc" }, { startMinute: "asc" }],
        });
        let excusedThreshold = 3;
        let tiers = [
          { start: 4, end: 7, percent: 10 },
          { start: 8, end: 14, percent: 20 },
          { start: 15, end: 21, percent: 30 },
        ];
        let maxTierEnd = 21;
        if (latenessConfigs.length > 0) {
          excusedThreshold = Math.min(
            ...latenessConfigs.map((c) => c.excusedThreshold ?? 3)
          );
          tiers = latenessConfigs.map((c) => ({
            start: c.startMinute,
            end: c.endMinute,
            percent: c.deductionPercent,
          }));
          maxTierEnd = Math.max(...latenessConfigs.map((c) => c.endMinute));
        }
        // Get all students for this teacher
        const students = await prisma.wpos_wpdatatable_23.findMany({
          where: { ustaz: t.ustazid },
          include: { zoom_links: true, attendance_progress: true },
        });
        let latenessDeduction = 0;
        const numStudents = studentCountMap[t.ustazid] || 0;
        const baseSalary = numStudents * BASE_SALARY_PER_STUDENT;
        for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split("T")[0];
          for (const student of students) {
            if (!student.selectedTime) continue;
            function to24Hour(time12h: string) {
              if (!time12h) return "00:00";
              if (
                time12h.includes(":") &&
                (time12h.includes("AM") || time12h.includes("PM"))
              ) {
                const [time, modifier] = time12h.split(" ");
                let [hours, minutes] = time.split(":");
                if (hours === "12") hours = modifier === "AM" ? "00" : "12";
                else if (modifier === "PM")
                  hours = String(parseInt(hours, 10) + 12);
                return `${hours.padStart(2, "0")}:${minutes}`;
              }
              return time12h;
            }
            const time24 = to24Hour(student.selectedTime);
            const scheduledTime = new Date(`${dateStr}T${time24}:00.000Z`);
            // Find the earliest sent_time for this student/date
            const sentTimes = (student.zoom_links || [])
              .filter(
                (zl) =>
                  zl.sent_time &&
                  zl.sent_time.toISOString().split("T")[0] === dateStr
              )
              .map((zl) => zl.sent_time)
              .sort((a, b) => {
                if (!a && !b) return 0;
                if (!a) return 1;
                if (!b) return -1;
                return a.getTime() - b.getTime();
              });
            const actualStartTime = sentTimes.length > 0 ? sentTimes[0] : null;
            if (!actualStartTime) continue;
            const latenessMinutes = Math.max(
              0,
              Math.round(
                (actualStartTime.getTime() - scheduledTime.getTime()) / 60000
              )
            );
            // Deduction logic
            let deductionApplied = 0;
            if (latenessMinutes > excusedThreshold) {
              let foundTier = false;
              for (const tier of tiers) {
                if (
                  latenessMinutes >= tier.start &&
                  latenessMinutes <= tier.end
                ) {
                  deductionApplied = 30 * (tier.percent / 100);
                  foundTier = true;
                  break;
                }
              }
              if (!foundTier && latenessMinutes > maxTierEnd) {
                deductionApplied = 30;
              }
            }
            latenessDeduction += deductionApplied;
          }
        }
        // Absence deduction: calculate automatically using centralized logic
        // const { deductionAmount, effectiveMonths } =
        //   await getAbsenceDeductionConfig();
        // let absenceDeduction = 0;

        // `
        // );
        // .split("T")[0]} to ${
        //     to.toISOString().split("T")[0]
        //   }`
        // );
        // // //       : "All months"
        //   }`
        // );

        // for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        //   const monthNumber = String(d.getMonth() + 1); // 1, 2, 3, etc.

        //   .split("T")[0]
        //     } (month: ${monthNumber})`
        //   );

        //   // Skip if not in effective months (if configured)
        //   if (
        //     effectiveMonths.length > 0 &&
        //     !effectiveMonths.includes(monthNumber)
        //   ) {
        //     //     continue;
        //   }

        //   // Use centralized absence detection
        //   const absenceResult = await isTeacherAbsent(t.ustazid, d);
        //   //   if (absenceResult.isAbsent) {
        //     absenceDeduction += deductionAmount;
        //     `
        //     );
        //   }
        // }

        // // Temporarily set absence deduction to 0
        let absenceDeduction = 0;
        // Bonuses: aggregate from QualityAssessment, not BonusRecord
        const bonuses = await prisma.qualityassessment.aggregate({
          where: {
            teacherId: t.ustazid,
            weekStart: { gte: from, lte: to },
            managerApproved: true,
          },
          _sum: { bonusAwarded: true },
        });
        const bonusAmount = bonuses._sum?.bonusAwarded ?? 0;
        const totalSalary =
          baseSalary - latenessDeduction - absenceDeduction + bonusAmount;
        // Fetch payment status for the main period (first in periodsInRange)
        let status: "Paid" | "Unpaid" = "Unpaid";
        if (periodsInRange.length > 0) {
          const payment = await prisma.teachersalarypayment.findUnique({
            where: {
              teacherId_period: {
                teacherId: t.ustazid,
                period: periodsInRange[0],
              },
            },
            select: { status: true },
          });
          if (payment && payment.status)
            status = payment.status as "Paid" | "Unpaid";
        }
        return {
          id: t.ustazid,
          name: t.ustazname,
          baseSalary,
          latenessDeduction,
          absenceDeduction,
          bonuses: bonusAmount,
          totalSalary,
          numStudents,
          status,
        };
      })
    );
    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      teacherId,
      period,
      status,
      totalSalary,
      latenessDeduction,
      absenceDeduction,
      bonuses,
    } = body;
    // Auth: Only admin or controller
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (
      !session ||
      (session.role !== "admin" && session.role !== "controller")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const adminId = session.id || undefined;
    if (!teacherId || !period || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    // Upsert salary payment record
    const payment = await prisma.teachersalarypayment.upsert({
      where: {
        teacherId_period: {
          teacherId,
          period,
        },
      },
      update: {
        status,
        paidAt: status === "Paid" ? new Date() : null,
        adminId,
        totalSalary,
        latenessDeduction,
        absenceDeduction,
        bonuses,
      },
      create: {
        teacherId,
        period,
        status,
        paidAt: status === "Paid" ? new Date() : null,
        adminId,
        totalSalary,
        latenessDeduction,
        absenceDeduction,
        bonuses,
      },
    });
    // Log to AuditLog
    await prisma.auditlog.create({
      data: {
        actionType: "teacher_salary_status_update",
        adminId: adminId || null, // Use adminId instead of userId
        targetId: payment.id,
        details: JSON.stringify({ teacherId, period, status }),
      },
    });
    return NextResponse.json({ success: true, payment });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update salary status" },
      { status: 500 }
    );
  }
}
