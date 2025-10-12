import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get("teacherId");
    const date = searchParams.get("date");
    const status = searchParams.get("status");

    const where: any = {
      clicked_at: { not: null }
    };

    if (teacherId) {
      where.ustazid = teacherId;
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      
      where.clicked_at = {
        gte: startDate,
        lt: endDate
      };
    }

    if (status && status !== "all") {
      where.session_status = status;
    }

    const sessions = await prisma.wpos_zoom_links.findMany({
      where,
      include: {
        wpos_wpdatatable_23: {
          select: {
            name: true,
            wdt_ID: true
          }
        },
        wpos_wpdatatable_24: {
          select: {
            ustazname: true
          }
        }
      },
      orderBy: { clicked_at: "desc" },
      take: 100
    });

    // Calculate statistics
    const stats = await prisma.wpos_zoom_links.aggregate({
      where: {
        clicked_at: { not: null },
        ...(teacherId && { ustazid: teacherId }),
        ...(date && {
          clicked_at: {
            gte: new Date(date),
            lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
          }
        })
      },
      _count: {
        id: true
      },
      _avg: {
        session_duration_minutes: true
      },
      _sum: {
        session_duration_minutes: true
      }
    });

    const statusCounts = await prisma.wpos_zoom_links.groupBy({
      by: ["session_status"],
      where: {
        clicked_at: { not: null },
        ...(teacherId && { ustazid: teacherId }),
        ...(date && {
          clicked_at: {
            gte: new Date(date),
            lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
          }
        })
      },
      _count: {
        session_status: true
      }
    });

    return NextResponse.json({
      sessions: sessions.map(session => ({
        id: session.id,
        teacherName: session.wpos_wpdatatable_24?.ustazname || "Unknown",
        studentName: session.wpos_wpdatatable_23?.name || "Unknown",
        startTime: session.clicked_at,
        endTime: session.session_ended_at,
        duration: session.session_duration_minutes,
        status: session.session_status,
        lastActivity: session.last_activity_at
      })),
      statistics: {
        totalSessions: stats._count.id || 0,
        averageDuration: Math.round(stats._avg.session_duration_minutes || 0),
        totalDuration: stats._sum.session_duration_minutes || 0,
        statusBreakdown: statusCounts.reduce((acc, item) => {
          acc[item.session_status] = item._count.session_status;
          return acc;
        }, {} as Record<string, number>)
      }
    });
  } catch (error) {
    console.error("Error fetching teacher sessions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}