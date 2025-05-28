//api/teachers-by-time/route.ts
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// interface TimeSlot {
//   id: number;
//   time: string;
//   category: string;
// }

export async function GET() {
  try {
    const ustazs = await prisma.wpos_wpdatatable_24.findMany({
      select: { schedule: true },
    });

    const allTimeSlots = ustazs.flatMap((ustaz) =>
      ustaz.schedule.split(",").map((time, index) => ({
        id: index + 1,
        time: time.trim(),
        category: getTimeCategory(time.trim()),
      }))
    );

    const uniqueTimeSlots = [
      ...new Map(allTimeSlots.map((item) => [item.time, item])).values(),
    ];

    return NextResponse.json({ timeSlots: uniqueTimeSlots }, { status: 200 });
  } catch (error) {
    console.error(error);
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

function hmToMinutes(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

function getTimeCategory(hm: string): string {
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
}
