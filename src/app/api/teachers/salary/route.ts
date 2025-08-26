import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import {
  isTeacherAbsent,
  getAbsenceDeductionConfig,
} from "@/lib/absence-utils";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = (await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })) as any;
    const role = session?.role || session?.user?.role;
    if (!session || role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacherId = String(session?.user?.id || session?.id || "");
    if (!teacherId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if teacher salary visibility is enabled
    const visibilitySetting = await prisma.setting.findUnique({
      where: { key: "teacher_salary_visible" },
    });
    
    if (visibilitySetting && visibilitySetting.value === "false") {
      return NextResponse.json({ error: "Salary access disabled" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing from or to parameters" },
        { status: 400 }
      );
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const period = `${toDate.getFullYear()}-${String(
      toDate.getMonth() + 1
    ).padStart(2, "0")}`;

    // Get teacher info and active students
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Get active student count
    const activeStudents = await prisma.wpos_wpdatatable_23.count({
      where: { 
        ustaz: teacherId,
        status: { in: ["active", "Active"] }
      },
    });

    // Get base salary per student from settings
    let BASE_SALARY_PER_STUDENT = 900;
    const setting = await prisma.setting.findUnique({
      where: { key: "base_salary_per_student" },
    });
    if (setting && setting.value && !isNaN(Number(setting.value))) {
      BASE_SALARY_PER_STUDENT = Number(setting.value);
    }

    const baseSalary = activeStudents * BASE_SALARY_PER_STUDENT;

    // Calculate lateness deduction using same logic as admin
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

    // Get students with zoom links for lateness calculation
    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: { ustaz: teacherId },
      include: {
        zoom_links: true,
        occupiedTimes: {
          select: {
            time_slot: true,
          },
        },
      },
    });

    let latenessDeduction = 0;
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      for (const student of students) {
        const timeSlot = student.occupiedTimes?.[0]?.time_slot;
        if (!timeSlot) continue;
        
        function to24Hour(time12h: string) {
          if (!time12h) return "00:00";
          
          // Handle AM/PM format
          if (time12h.includes("AM") || time12h.includes("PM")) {
            const [time, modifier] = time12h.split(" ");
            let [hours, minutes] = time.split(":");
            if (hours === "12") hours = modifier === "AM" ? "00" : "12";
            else if (modifier === "PM") hours = String(parseInt(hours, 10) + 12);
            return `${hours.padStart(2, "0")}:${minutes}`;
          }
          
          // Handle existing 24-hour format (HH:MM:SS or HH:MM)
          if (time12h.includes(":")) {
            const parts = time12h.split(":");
            const hours = parts[0].padStart(2, "0");
            const minutes = (parts[1] || "00").padStart(2, "0");
            return `${hours}:${minutes}`;
          }
          
          return "00:00"; // fallback
        }
        
        const time24 = to24Hour(timeSlot);
        const scheduledTime = new Date(`${dateStr}T${time24}:00.000Z`);
        
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

    // Calculate absence deduction using same logic as admin
    const absenceConfig = await getAbsenceDeductionConfig();
    let absenceDeduction = 0;
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const monthNumber = String(d.getMonth() + 1);
      if (
        absenceConfig.effectiveMonths.length > 0 &&
        !absenceConfig.effectiveMonths.includes(monthNumber)
      ) {
        continue;
      }
      const absenceResult = await isTeacherAbsent(teacherId, new Date(d));
      if (absenceResult.isAbsent) {
        absenceDeduction += absenceConfig.deductionAmount;
      }
    }

    // Calculate bonuses from QualityAssessment (same as admin)
    const bonuses = await prisma.qualityassessment.aggregate({
      where: {
        teacherId: teacherId,
        weekStart: { gte: fromDate, lte: toDate },
        managerApproved: true,
      },
      _sum: { bonusAwarded: true },
    });
    const bonusAmount = bonuses._sum?.bonusAwarded ?? 0;

    const totalSalary = baseSalary - latenessDeduction - absenceDeduction + bonusAmount;

    // Get payment status
    const salaryPayment = await prisma.teachersalarypayment.findFirst({
      where: {
        teacherId: teacherId,
        period: period,
      },
    });

    const status = salaryPayment?.status || "Unpaid";

    const response = {
      id: teacherId,
      name: teacher.ustazname || "Unknown",
      baseSalary: baseSalary,
      latenessDeduction: latenessDeduction,
      absenceDeduction: absenceDeduction,
      bonuses: bonusAmount,
      totalSalary: totalSalary,
      numStudents: activeStudents,
      status: status as "Paid" | "Unpaid",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Teacher salary API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
