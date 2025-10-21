import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { getEthiopianTime } from "@/lib/ethiopian-time";

export async function GET(req: NextRequest) {
  try {
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || session.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacherId = session.username;
    if (!teacherId) {
      return NextResponse.json(
        { error: "Teacher ID not found" },
        { status: 400 }
      );
    }

    // Get today's date in Ethiopian timezone (UTC+3)
    const ethiopianToday = getEthiopianTime();
    const todayStr = ethiopianToday.toISOString().split("T")[0];

    // Calculate start and end of day in Ethiopian time, then convert to UTC for database query
    // Ethiopian midnight (00:00) is UTC 21:00 the previous day
    const ethiopianDayStart = new Date(todayStr + "T00:00:00.000Z");
    const ethiopianDayEnd = new Date(todayStr + "T23:59:59.999Z");

    // Adjust back to UTC by subtracting 3 hours
    const utcDayStart = new Date(
      ethiopianDayStart.getTime() - 3 * 60 * 60 * 1000
    );
    const utcDayEnd = new Date(ethiopianDayEnd.getTime() - 3 * 60 * 60 * 1000);

    // First, let's see ALL zoom links for this teacher (for debugging)
    const allZoomLinks = await prisma.wpos_zoom_links.findMany({
      where: {
        ustazid: teacherId,
      },
      select: {
        studentid: true,
        sent_time: true,
        ustazid: true,
      },
      orderBy: {
        sent_time: "desc",
      },
      take: 10, // Last 10 records
    });

    // Find zoom links sent today (Ethiopian time) for this teacher's students
    const zoomLinks = await prisma.wpos_zoom_links.findMany({
      where: {
        ustazid: teacherId,
        sent_time: {
          gte: utcDayStart,
          lt: utcDayEnd,
        },
      },
      select: {
        studentid: true,
        sent_time: true,
      },
    });

    const sentToday = zoomLinks.map((link) => link.studentid);

    const response = {
      sentToday,
      date: todayStr,
      debug: {
        teacherId,
        totalLinks: zoomLinks.length,
        todayLinks: zoomLinks,
        allRecentLinks: allZoomLinks,
        timezone: "Ethiopia (UTC+3)",
        dateRange: {
          ethiopianDay: todayStr,
          utcFrom: utcDayStart.toISOString(),
          utcTo: utcDayEnd.toISOString(),
          ethiopianFrom: ethiopianDayStart.toISOString(),
          ethiopianTo: ethiopianDayEnd.toISOString(),
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("💥 Zoom status check error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
