import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import {
  generateTimeSlots,
  groupSlotsByCategory,
  sortTimeSlots,
  TimeSlot,
  DEFAULT_PRAYER_TIMES,
} from "@/utils/timeUtils";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Fallback secret for development if NEXTAUTH_SECRET is not set
    const secret =
      process.env.NEXTAUTH_SECRET || "fallback-secret-for-development";

    // Check authentication
    const session = await getToken({
      req: request,
      secret,
    });

    if (!session) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Allow admin, registral, and controller roles
    if (!["admin", "registral", "controller"].includes(session.role)) {
      return NextResponse.json(
        { message: "Unauthorized role" },
        { status: 401 }
      );
    }

    let ustazs;
    if (session.role === "admin") {
      // For admin, get all ustaz schedules
      ustazs = await prisma.wpos_wpdatatable_24.findMany({
        select: { schedule: true },
        where: {
          schedule: {
            not: "",
          },
        },
      });
    } else if (session.role === "registral") {
      // For registral, get all ustaz schedules (same as admin for now)
      ustazs = await prisma.wpos_wpdatatable_24.findMany({
        select: { schedule: true },
        where: {
          schedule: {
            not: "",
          },
        },
      });
    } else if (session.role === "controller") {
      // For controller, get ustazs assigned to this controller
      ustazs = await prisma.wpos_wpdatatable_24.findMany({
        select: { schedule: true },
        where: {
          control: {
            in: await prisma.wpos_wpdatatable_28
              .findMany({
                where: { username: session.username },
                select: { code: true },
              })
              .then((controllers) =>
                controllers
                  .map((c) => c.code)
                  .filter((code): code is string => code !== null)
              ),
          },
          schedule: {
            not: "",
          },
        },
      });
    }

    // Extract and process time slots using new utilities
    const allTimeSlots: TimeSlot[] = [];

    (ustazs || []).forEach((ustaz) => {
      if (ustaz.schedule) {
        const slots = generateTimeSlots(ustaz.schedule, DEFAULT_PRAYER_TIMES);
        allTimeSlots.push(...slots);
      }
    });

    // Remove duplicates and sort by time
    const uniqueTimeSlots = sortTimeSlots(
      allTimeSlots.filter(
        (slot, index, self) =>
          index === self.findIndex((s) => s.time === slot.time)
      )
    );

    // Group by prayer categories
    const groupedSlots = groupSlotsByCategory(uniqueTimeSlots);

    // Calculate analytics
    const analytics = {
      totalSlots: uniqueTimeSlots.length,
      byCategory: Object.keys(groupedSlots).map((category) => ({
        category,
        count: groupedSlots[category].length,
      })),
      prayerTimes: DEFAULT_PRAYER_TIMES,
    };

    return NextResponse.json(
      {
        timeSlots: uniqueTimeSlots,
        groupedSlots,
        analytics,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching time slots" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
