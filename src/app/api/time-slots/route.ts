import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import {
  generateTimeSlots,
  groupSlotsByCategory,
  sortTimeSlots,
  TimeSlot,
  DEFAULT_PRAYER_TIMES,
} from "@/utils/timeUtils";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    console.log(
      "Time-slots API: NEXTAUTH_SECRET exists:",
      !!process.env.NEXTAUTH_SECRET
    );

    // Fallback secret for development if NEXTAUTH_SECRET is not set
    const secret =
      process.env.NEXTAUTH_SECRET || "fallback-secret-for-development";

    // Check authentication
    const session = await getToken({
      req: request,
      secret,
    });

    console.log("Time-slots API: Session token:", session);

    if (!session) {
      console.log("Time-slots API: No session token found");
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Allow admin, registral, and controller roles
    if (!["admin", "registral", "controller"].includes(session.role)) {
      console.log("Time-slots API: Unauthorized role:", session.role);
      return NextResponse.json(
        { message: "Unauthorized role" },
        { status: 401 }
      );
    }

    console.log("Time-slots API: Access granted for role:", session.role);

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
          controlId: {
            in: await prisma.wpos_wpdatatable_28
              .findMany({
                where: { username: session.username },
                select: { wdt_ID: true },
              })
              .then((controllers) => controllers.map((c) => c.wdt_ID)),
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
    console.error("Time slots error:", error);
    return NextResponse.json(
      { message: "Error fetching time slots" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
