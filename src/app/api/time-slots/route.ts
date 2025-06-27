import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server-auth";
import { NextRequest } from "next/server";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Restrict to registral or controller roles
    if (user.role !== "registral" && user.role !== "controller") {
      return NextResponse.json(
        { message: "Unauthorized role" },
        { status: 401 }
      );
    }

    let ustazs;
    if (user.role === "registral") {
      // For registral, get all ustaz schedules
      ustazs = await prisma.wpos_wpdatatable_24.findMany({
        select: { schedule: true },
        where: {
          schedule: {
            not: "",
          },
        },
      });
    } else if (user.role === "controller") {
      // For controller, get ustazs assigned to this controller
      ustazs = await prisma.wpos_wpdatatable_24.findMany({
        select: { schedule: true },
        where: {
          controlId: {
            in: await prisma.wpos_wpdatatable_28
              .findMany({
                where: { username: user.username },
                select: { id: true },
              })
              .then((controllers) => controllers.map((c) => c.id)),
          },
          schedule: {
            not: "",
          },
        },
      });
    }

    // Extract and process time slots
    const allTimeSlots = ustazs?.flatMap((ustaz) => {
      if (!ustaz.schedule) return [];
      return ustaz.schedule.split(",").map((time, index) => ({
        id: index + 1,
        time: time.trim(),
        category: getTimeCategory(time.trim()),
      }));
    });

    // Remove duplicates and sort by time
    const uniqueTimeSlots = [
      ...new Map(allTimeSlots.map((item) => [item.time, item])).values(),
    ].sort((a, b) => {
      const timeA = hmToMinutes(a.time);
      const timeB = hmToMinutes(b.time);
      return timeA - timeB;
    });

    return NextResponse.json({ timeSlots: uniqueTimeSlots }, { status: 200 });
  } catch (error) {
    console.error("Time slots error:", error);
    return NextResponse.json(
      { message: "Error fetching time slots" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

const overallPrayerTimes = {
  Fajr: "05:00",
  Dhuhr: "12:00",
  Asr: "15:00",
  Maghrib: "18:00",
  Isha: "19:30",
};

function hmToMinutes(hm: string): number {
  try {
    const [h, m] = hm.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return 0;
    return h * 60 + m;
  } catch (error) {
    console.error("Error converting time to minutes:", hm);
    return 0;
  }
}

function getTimeCategory(hm: string): string {
  try {
    const t = hmToMinutes(hm);
    const fajr = hmToMinutes(overallPrayerTimes.Fajr);
    const dhuhr = hmToMinutes(overallPrayerTimes.Dhuhr);
    const asr = hmToMinutes(overallPrayerTimes.Asr);
    const maghrib = hmToMinutes(overallPrayerTimes.Maghrib);
    const isha = hmToMinutes(overallPrayerTimes.Isha);

    if (t >= fajr && t < dhuhr) return "After Fajr";
    if (t >= dhuhr && t < asr) return "After Dhuhr";
    if (t >= asr && t < maghrib) return "After Asr";
    if (t >= maghrib && t < isha) return "After Maghrib";
    return "After Isha";
  } catch (error) {
    console.error("Error categorizing time:", hm);
    return "Unknown";
  }
}
