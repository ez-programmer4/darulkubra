import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get("teacherId");
    const date = searchParams.get("date");
    const status = searchParams.get("status");

    const where: any = {
      clicked_at: { not: null },
    };

    if (teacherId) {
      where.ustazid = teacherId;
    }

    if (date) {
      // Parse date and handle timezone properly
      const startDate = new Date(date + "T00:00:00");
      const endDate = new Date(date + "T23:59:59");

      console.log("📅 Date filter:", { date, startDate, endDate });

      where.clicked_at = {
        gte: startDate,
        lte: endDate,
      };
    } else {
      // If no date specified, show all sessions from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      where.clicked_at = {
        gte: sevenDaysAgo,
      };
    }

    if (status && status !== "all") {
      where.session_status = status;
    }

    console.log("🔍 Query filters:", JSON.stringify(where, null, 2));

    const sessions = await prisma.wpos_zoom_links.findMany({
      where,
      include: {
        wpos_wpdatatable_23: {
          select: {
            name: true,
            wdt_ID: true,
          },
        },
        wpos_wpdatatable_24: {
          select: {
            ustazname: true,
          },
        },
      },
      orderBy: { clicked_at: "desc" },
      take: 100,
    });

    console.log(`📊 Found ${sessions.length} sessions`);

    // Calculate statistics
    const stats = await prisma.wpos_zoom_links.aggregate({
      where: {
        clicked_at: { not: null },
        ...(teacherId && { ustazid: teacherId }),
        ...(date && {
          clicked_at: {
            gte: new Date(date),
            lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
          },
        }),
      },
      _count: {
        id: true,
      },
      _avg: {
        session_duration_minutes: true,
      },
      _sum: {
        session_duration_minutes: true,
      },
    });

    const statusCounts = await prisma.wpos_zoom_links.groupBy({
      by: ["session_status"],
      where: {
        clicked_at: { not: null },
        ...(teacherId && { ustazid: teacherId }),
        ...(date && {
          clicked_at: {
            gte: new Date(date),
            lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
          },
        }),
      },
      _count: {
        session_status: true,
      },
    });

    return NextResponse.json({
      sessions: sessions.map((session) => ({
        id: session.id,
        teacherName: session.wpos_wpdatatable_24?.ustazname || "Unknown",
        studentName: session.wpos_wpdatatable_23?.name || "Unknown",
        startTime: session.clicked_at,
        endTime: session.session_ended_at,
        duration: session.session_duration_minutes,
        status: session.session_status,
        lastActivity: session.last_activity_at,
      })),
      statistics: {
        totalSessions: stats._count.id || 0,
        averageDuration: Math.round(stats._avg.session_duration_minutes || 0),
        totalDuration: stats._sum.session_duration_minutes || 0,
        statusBreakdown: statusCounts.reduce((acc, item) => {
          acc[item.session_status] = item._count.session_status;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    console.error("Error fetching teacher sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
