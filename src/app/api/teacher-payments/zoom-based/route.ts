import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

// Helper to load Sunday inclusion from central settings if available
async function getIncludeSundays(): Promise<boolean> {
  try {
    const setting = await prisma.setting.findFirst({
      where: { key: "includeSundays" },
    });
    if (setting?.value?.toLowerCase() === "true") return true;
  } catch {}
  return false;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get("teacherId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!teacherId || !from || !to) {
      return NextResponse.json(
        { error: "teacherId, from, to are required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const fromDate = new Date(`${from}T00:00:00`);
    const toDate = new Date(`${to}T23:59:59`);
    const includeSundays = await getIncludeSundays();

    // 1) Pull all zoom links for this teacher in range (teacher change is inherent: ustazid)
    const links = await prisma.wpos_zoom_links.findMany({
      where: {
        ustazid: teacherId,
        sent_time: { gte: fromDate, lte: toDate },
      },
      select: { sent_time: true, studentid: true },
      orderBy: { sent_time: "asc" },
    });

    // Group unique dates and keep per-student per-date earliest link
    const workedDates = new Set<string>();
    const studentDateLinks = new Map<string, Date[]>(); // key `${studentid}-${YYYY-MM-DD}`
    for (const l of links) {
      if (!l.sent_time || !l.studentid) continue;
      const d = new Date(l.sent_time);
      const isSunday = d.getDay() === 0;
      if (!includeSundays && isSunday) continue;
      const dayStr = format(d, "yyyy-MM-dd");
      workedDates.add(dayStr);
      const key = `${l.studentid}-${dayStr}`;
      if (!studentDateLinks.has(key)) studentDateLinks.set(key, []);
      studentDateLinks.get(key)!.push(d);
    }

    // 2) Determine expected working days in range (excluding Sundays if configured)
    const expectedDates: string[] = [];
    {
      const cur = new Date(fromDate);
      const end = new Date(toDate);
      cur.setHours(0, 0, 0, 0);
      while (cur <= end) {
        const isSunday = cur.getDay() === 0;
        if (includeSundays || !isSunday) {
          expectedDates.push(format(cur, "yyyy-MM-dd"));
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    // 3) Permissions and waivers to skip absence deductions
    const [permissionRequests, deductionWaivers] = await Promise.all([
      prisma.permissionrequest.findMany({
        where: {
          teacherId,
          status: "Approved",
          requestedDate: { gte: from, lte: to },
        },
        select: { requestedDate: true },
      }),
      prisma.deduction_waivers.findMany({
        where: {
          teacherId,
          deductionType: "absence",
          deductionDate: { gte: fromDate, lte: toDate },
        },
        select: { deductionDate: true },
      }),
    ]);

    const permittedDates = new Set(
      permissionRequests.map((p) => p.requestedDate)
    );
    const waivedDates = new Set(
      deductionWaivers.map((w) => format(w.deductionDate, "yyyy-MM-dd"))
    );

    // 4) Package-based base amounts and lateness config
    const packageDeductions = await prisma.packageDeduction.findMany();
    const packageBaseMap = Object.fromEntries(
      packageDeductions.map((p) => [
        p.packageName,
        Number(p.absenceBaseAmount || 25),
      ])
    );
    const latenessBaseMap = Object.fromEntries(
      packageDeductions.map((p: any) => [
        p.packageName,
        Number(p.latenessBaseAmount || 30),
      ])
    );

    const latenessConfigs = await prisma.latenessdeductionconfig.findMany({
      where: { OR: [{ teacherId }, { isGlobal: true }] },
      orderBy: [{ tier: "asc" }, { startMinute: "asc" }],
    });
    const excusedThreshold =
      latenessConfigs.length > 0
        ? Math.min(...latenessConfigs.map((c: any) => c.excusedThreshold ?? 0))
        : 0;

    // Build student package map for deduction base lookup
    const studentIds = Array.from(
      new Set(links.map((l) => l.studentid).filter(Boolean))
    ) as number[];
    const students = studentIds.length
      ? await prisma.wpos_wpdatatable_23.findMany({
          where: { wdt_ID: { in: studentIds } },
          select: {
            wdt_ID: true,
            package: true,
            daypackages: true,
            occupiedTimes: {
              where: {
                ustaz_id: teacherId,
                OR: [{ end_at: null }, { end_at: { gte: fromDate } }],
              },
              select: {
                time_slot: true,
                daypackage: true,
                occupied_at: true,
                end_at: true,
              },
            },
          },
        })
      : [];
    const studentPkg = new Map<number, string | null>();
    students.forEach((s) => studentPkg.set(s.wdt_ID, s.package));

    // 5) Calculate absences per student using daypackage
    let absenceDeduction = 0;
    const absenceBreakdown: Array<{
      date: string;
      deduction: number;
      reason: string;
      studentId?: number;
    }> = [];
    const parseDaypackage = (dp?: string | null): number[] => {
      if (!dp) return [];
      const x = dp.trim().toUpperCase();
      if (x === "ALL DAYS" || x === "ALLDAYS") return [0, 1, 2, 3, 4, 5, 6];
      if (x === "MWF") return [1, 3, 5];
      if (x === "TTS" || x === "TTH") return [2, 4, 6];
      return [];
    };

    for (const s of students) {
      const ot = s.occupiedTimes?.[0];
      const dows = parseDaypackage(ot?.daypackage || s.daypackages || "");
      const cur = new Date(fromDate);
      const end = new Date(toDate);
      while (cur <= end) {
        const isSunday = cur.getDay() === 0;
        const dayStr = format(cur, "yyyy-MM-dd");
        const expected =
          (includeSundays || !isSunday) &&
          (dows.length === 0 || dows.includes(cur.getDay()));
        if (expected) {
          const key = `${s.wdt_ID}-${dayStr}`;
          const hasLink = studentDateLinks.has(key);
          if (
            !hasLink &&
            !permittedDates.has(dayStr) &&
            !waivedDates.has(dayStr)
          ) {
            const base = packageBaseMap[s.package || ""] ?? 25;
            absenceDeduction += base;
            absenceBreakdown.push({
              date: dayStr,
              deduction: base,
              reason: "No zoom link",
              studentId: s.wdt_ID,
            });
          }
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    // 6) Lateness deduction similar to original (earliest link vs scheduled time)
    let latenessDeduction = 0;
    const latenessBreakdown: Array<{
      date: string;
      minutes: number;
      deduction: number;
      studentId?: number;
    }> = [];
    const to24 = (timeStr?: string | null): string | null => {
      if (!timeStr) return null;
      const m = timeStr.match(/^(\d{1,2}):(\d{2})(?:\s?(AM|PM))?$/i);
      if (!m) return timeStr;
      let h = parseInt(m[1], 10);
      const min = m[2];
      const ap = m[3]?.toUpperCase();
      if (ap === "PM" && h !== 12) h += 12;
      if (ap === "AM" && h === 12) h = 0;
      return `${String(h).padStart(2, "0")}:${min}`;
    };

    for (const s of students) {
      const ot = s.occupiedTimes?.[0];
      const sched = to24(ot?.time_slot);
      if (!sched) continue;
      const [sh, sm] = sched.split(":").map(Number);
      const cur = new Date(fromDate);
      const end = new Date(toDate);
      while (cur <= end) {
        const dayStr = format(cur, "yyyy-MM-dd");
        const key = `${s.wdt_ID}-${dayStr}`;
        const times = studentDateLinks.get(key);
        if (times && times.length > 0) {
          const earliest = times
            .slice()
            .sort((a, b) => a.getTime() - b.getTime())[0];
          const scheduled = new Date(earliest);
          scheduled.setHours(sh, sm, 0, 0);
          const minutes = Math.round(
            (earliest.getTime() - scheduled.getTime()) / 60000
          );
          if (minutes > excusedThreshold) {
            let percent = 0;
            for (const cfg of latenessConfigs) {
              const start = (cfg as any).startMinute;
              const endm = (cfg as any).endMinute;
              if (minutes >= start && minutes <= endm) {
                percent = Number((cfg as any).deductionPercent || 0);
                break;
              }
            }
            const base = latenessBaseMap[s.package || ""] ?? 30;
            const deduction = Math.round(base * (percent / 100));
            if (deduction > 0) {
              latenessDeduction += deduction;
              latenessBreakdown.push({
                date: dayStr,
                minutes,
                deduction,
                studentId: s.wdt_ID,
              });
            }
          }
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    // 6) Base salary via simple per-day rate: derive average daily rate from package salaries if available
    const packageSalaries = await prisma.packageSalary.findMany();
    const dailyRates: number[] = [];
    for (const s of students) {
      const found = packageSalaries.find((ps) => ps.packageName === s.package);
      if (found && found.salaryPerStudent) {
        // Approx daily: divide by 22 working days (or len of expectedDates if smaller)
        const denom = Math.max(1, Math.min(22, expectedDates.length));
        dailyRates.push(Number(found.salaryPerStudent) / denom);
      }
    }
    const avgDailyRate =
      dailyRates.length > 0
        ? Number(
            (dailyRates.reduce((a, b) => a + b, 0) / dailyRates.length).toFixed(
              2
            )
          )
        : 0;

    const totalWorkedDays = workedDates.size;
    const baseSalary = Number((avgDailyRate * totalWorkedDays).toFixed(2));
    const totalDeductions = absenceDeduction + latenessDeduction;
    const totalSalary = Math.max(
      0,
      Number((baseSalary - totalDeductions).toFixed(2))
    );

    // 7) Build per-student breakdown
    const denom = Math.max(1, Math.min(22, expectedDates.length));
    const pkgSalaryMap = new Map<string, number>();
    for (const ps of await prisma.packageSalary.findMany()) {
      pkgSalaryMap.set(ps.packageName, Number(ps.salaryPerStudent || 0));
    }
    const studentBreakdown = students.map((s) => {
      // worked days for this student
      let worked = 0;
      for (const d of expectedDates) {
        const key = `${s.wdt_ID}-${d}`;
        if (studentDateLinks.has(key)) worked += 1;
      }
      const absencesForStudent = absenceBreakdown.filter(
        (a) => a.studentId === s.wdt_ID
      );
      const latenessForStudent = latenessBreakdown.filter(
        (l) => l.studentId === s.wdt_ID
      );
      const pkg = s.package || "";
      const monthly = pkgSalaryMap.get(pkg) || 0;
      const dailyRate = Number((monthly / denom).toFixed(2));
      const base = Number((dailyRate * worked).toFixed(2));
      const absenceDed = absencesForStudent.reduce(
        (sum, a) => sum + a.deduction,
        0
      );
      const lateDed = latenessForStudent.reduce(
        (sum, l) => sum + l.deduction,
        0
      );
      const total = Math.max(
        0,
        Number((base - absenceDed - lateDed).toFixed(2))
      );
      return {
        studentId: s.wdt_ID,
        package: s.package,
        daypackage: s.daypackages,
        workedDays: worked,
        dailyRate,
        baseSalary: base,
        absenceDeduction: absenceDed,
        latenessDeduction: lateDed,
        totalSalary: total,
        absences: absencesForStudent,
        lateness: latenessForStudent,
      };
    });

    return NextResponse.json({
      success: true,
      teacherId,
      period: { from, to },
      includeSundays,
      summary: {
        workedDays: totalWorkedDays,
        expectedDays: expectedDates.length,
        avgDailyRate,
        baseSalary,
        totalDeductions,
        totalSalary,
      },
      breakdown: {
        workedDates: Array.from(workedDates),
        absences: absenceBreakdown,
        lateness: latenessBreakdown,
        students: studentBreakdown,
      },
    });
  } catch (error: any) {
    console.error("Zoom-based salary API error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal error" },
      { status: 500 }
    );
  }
}
