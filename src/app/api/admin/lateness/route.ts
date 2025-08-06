import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const { searchParams } = url;
  const date =
    searchParams.get("date") || new Date().toISOString().split("T")[0];
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayStart.getDate() + 1);

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

  try {
    // 2. Get all students with their teacher and zoom links for the day
    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        status: { in: ["active", "not yet"] },
      },
      include: {
        teacher: true,
        zoom_links: {
          where: {
            sent_time: {
              gte: dayStart,
              lt: dayEnd,
            },
          },
        },
        occupiedTimes: {
          select: {
            time_slot: true,
          },
        },
      },
    });

    // 3. Calculate lateness for each student
    const latenessData = students
      .map((student) => {
        const timeSlot = student.occupiedTimes?.[0]?.time_slot;
        if (!timeSlot || !student.ustaz) return null;
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
        const time24 = to24Hour(timeSlot);
        const scheduledTime = new Date(`${date}T${time24}:00.000Z`);
        // Find the earliest sent_time for this student/teacher/date
        const sentTimes = (student.zoom_links || [])
          .filter((zl) => zl.sent_time)
          .map((zl) => zl.sent_time as Date)
          .sort((a, b) => a.getTime() - b.getTime());
        const actualStartTime = sentTimes.length > 0 ? sentTimes[0] : null;
        if (!actualStartTime) return null;
        const latenessMinutes = Math.max(
          0,
          Math.round(
            (actualStartTime.getTime() - scheduledTime.getTime()) / 60000
          )
        );
        // Deduction logic (now from DB config)
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
        return {
          studentId: student.wdt_ID,
          studentName: student.name,
          teacherId: student.ustaz,
          teacherName: student.teacher?.ustazname || student.ustaz,
          classDate: scheduledTime,
          scheduledTime,
          actualStartTime,
          latenessMinutes,
          deductionApplied,
          deductionTier,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ latenessData });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
