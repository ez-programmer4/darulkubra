import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { format, addDays, isBefore } from "date-fns";

function getDayName(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

function isValidAttendanceDay(dayPackage: string, date: Date): boolean {
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  // If no dayPackage recorded, allow counting by default so analytics aren't empty
  if (!dayPackage) return true;
  if (dayPackage.toLowerCase().includes("all")) return true;
  if (dayPackage.includes("Monday") && day === 1) return true;
  if (dayPackage.includes("Tuesday") && day === 2) return true;
  if (dayPackage.includes("Wednesday") && day === 3) return true;
  if (dayPackage.includes("Thursday") && day === 4) return true;
  if (dayPackage.includes("Friday") && day === 5) return true;
  if (dayPackage.includes("Saturday") && day === 6) return true;
  if (dayPackage.includes("Sunday") && day === 0) return true;
  return false;
}

export async function GET(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const { searchParams } = url;
  const from = searchParams.get("from") || format(new Date(), "yyyy-MM-dd");
  const to = searchParams.get("to") || format(new Date(), "yyyy-MM-dd");
  const controllerId = searchParams.get("controllerId") || "";
  const teacherId = searchParams.get("teacherId") || "";

  const startDate = new Date(from);
  const endDate = new Date(to);
  endDate.setHours(23, 59, 59, 999);

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
    // Use the minimum excusedThreshold from config (or 3 if not present)
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

  // 2. Get all students with their teacher, controller, and day package
  const students = await prisma.wpos_wpdatatable_23.findMany({
    where: {
      status: { in: ["active", "not yet"] },
    },
    include: {
      teacher: true,
      controller: true,
      zoom_links: true,
      occupiedTimes: {
        select: {
          time_slot: true,
        },
      },
    },
  });

  // 3. Build daily trend
  const dailyTrend: any[] = [];
  const controllerMap: Record<string, any> = {};
  const teacherMap: Record<string, any> = {};

  for (let d = new Date(startDate); !isBefore(endDate, d); d = addDays(d, 1)) {
    const dateStr = format(d, "yyyy-MM-dd");
    let totalLateness = 0;
    let totalDeduction = 0;
    let totalEvents = 0;
    let totalMinutes = 0;
    let presentCount = 0;
    let absentCount = 0;
    // For each student scheduled for this day
    for (const student of students) {
      const timeSlot = student.occupiedTimes?.[0]?.time_slot;
      if (!timeSlot || !student.ustaz) continue;
      if (teacherId && String(student.teacher?.ustazid) !== String(teacherId)) continue;
      if (!isValidAttendanceDay(student.daypackages ?? "", d)) continue;
      if (controllerId && String(student.controller?.wdt_ID) !== controllerId)
        continue;
      // Scheduled time
      function to24Hour(time12h: string) {
        if (!time12h) return "00:00";
        if (
          time12h.includes(":") &&
          (time12h.includes("AM") || time12h.includes("PM"))
        ) {
          const [time, modifier] = time12h.split(" ");
          let [hours, minutes] = time.split(":");
          if (hours === "12") hours = modifier === "AM" ? "00" : "12";
          else if (modifier === "PM") hours = String(parseInt(hours, 10) + 12);
          return `${hours.padStart(2, "0")}:${minutes}`;
        }
        return time12h; // already 24h
      }
      const time24 = to24Hour(timeSlot);
      const scheduledTime = new Date(`${dateStr}T${time24}:00.000Z`);
      // Find earliest sent_time for this student/teacher/date
      const sentTimes = (student.zoom_links || [])
        .filter(
          (zl) =>
            zl.sent_time &&
            format(zl.sent_time as Date, "yyyy-MM-dd") === dateStr
        )
        .map((zl) => zl.sent_time as Date)
        .sort((a, b) => a.getTime() - b.getTime());
      const actualStartTime = sentTimes.length > 0 ? sentTimes[0] : null;
      if (!actualStartTime) {
        absentCount++;
        continue;
      }
      presentCount++;
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
          if (latenessMinutes >= tier.start && latenessMinutes <= tier.end) {
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
      totalLateness += latenessMinutes;
      totalDeduction += deductionApplied;
      totalEvents++;
      totalMinutes += latenessMinutes;
      // Per-controller
      if (student.controller) {
        const cid = String(student.controller.wdt_ID);
        if (!controllerMap[cid]) {
          controllerMap[cid] = {
            name: student.controller.name,
            totalLateness: 0,
            totalDeduction: 0,
            totalEvents: 0,
            totalMinutes: 0,
          };
        }
        controllerMap[cid].totalLateness += latenessMinutes;
        controllerMap[cid].totalDeduction += deductionApplied;
        controllerMap[cid].totalEvents++;
        controllerMap[cid].totalMinutes += latenessMinutes;
      }
      // Per-teacher
      if (student.teacher) {
        const tid = student.teacher.ustazid;
        if (!teacherMap[tid]) {
          teacherMap[tid] = {
            name: student.teacher.ustazname,
            totalLateness: 0,
            totalDeduction: 0,
            totalEvents: 0,
            totalMinutes: 0,
          };
        }
        teacherMap[tid].totalLateness += latenessMinutes;
        teacherMap[tid].totalDeduction += deductionApplied;
        teacherMap[tid].totalEvents++;
        teacherMap[tid].totalMinutes += latenessMinutes;
      }
    }
    dailyTrend.push({
      date: dateStr,
      "Average Lateness":
        totalEvents > 0 ? (totalLateness / totalEvents).toFixed(2) : 0,
      "Total Deduction": totalDeduction,
      Present: presentCount,
      Absent: absentCount,
      Total: presentCount + absentCount,
    });
  }

  // Per-controller summary
  const controllerData = Object.values(controllerMap).map((c: any) => ({
    name: c.name,
    "Average Lateness":
      c.totalEvents > 0 ? (c.totalLateness / c.totalEvents).toFixed(2) : 0,
    "Total Deduction": c.totalDeduction,
    "Total Events": c.totalEvents,
  }));

  // Per-teacher summary
  const teacherData = Object.values(teacherMap).map((t: any) => ({
    name: t.name,
    "Average Lateness":
      t.totalEvents > 0 ? (t.totalLateness / t.totalEvents).toFixed(2) : 0,
    "Total Deduction": t.totalDeduction,
    "Total Events": t.totalEvents,
  }));

  return NextResponse.json({ dailyTrend, controllerData, teacherData });
}
