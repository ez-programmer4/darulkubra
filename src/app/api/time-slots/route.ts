import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import {
  generateTimeSlots,
  groupSlotsByCategory,
  sortTimeSlots,
  TimeSlot,
  DEFAULT_PRAYER_TIMES,
  categorizeTime,
  getPrayerCategories,
  getPrayerRanges,
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

    // Use a Set to track unique time slots
    const uniqueTimeSlots = new Set<string>();
    
    (ustazs || []).forEach((ustaz) => {
      if (ustaz.schedule) {
        // Parse schedule and create time slots with new categorization
        const times = ustaz.schedule.split(',').map(t => t.trim()).filter(Boolean);
        times.forEach((time) => {
          const category = categorizeTime(time);
          if (category !== "General" && !uniqueTimeSlots.has(time)) {
            uniqueTimeSlots.add(time);
            allTimeSlots.push({
              id: `slot-${time.replace(/[^\w]/g, '')}-${category}`,
              time: time,
              category: category,
            });
          }
        });
      }
    });

    // Sort time slots by time (duplicates already removed)
    const sortedTimeSlots = sortTimeSlots(allTimeSlots);

    // Group by prayer categories
    const groupedSlots = groupSlotsByCategory(sortedTimeSlots);

    // Calculate analytics with new prayer ranges
    const analytics = {
      totalSlots: sortedTimeSlots.length,
      byCategory: Object.keys(groupedSlots).map((category) => ({
        category,
        count: groupedSlots[category].length,
      })),
      prayerTimes: DEFAULT_PRAYER_TIMES,
      prayerRanges: getPrayerRanges(),
    };

    return NextResponse.json(
      {
        timeSlots: sortedTimeSlots,
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
