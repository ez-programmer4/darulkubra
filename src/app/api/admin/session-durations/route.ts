import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // Get sessions from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sessions = await prisma.wpos_zoom_links.findMany({
      where: {
        clicked_at: {
          gte: thirtyDaysAgo,
        },
      },
      include: {
        wpos_wpdatatable_23: {
          select: { name: true },
        },
        wpos_wpdatatable_24: {
          select: { ustazname: true },
        },
      },
      orderBy: { clicked_at: "desc" },
      take: 200,
    });

    const formattedSessions = sessions.map((s) => ({
      id: s.id,
      teacherName: s.wpos_wpdatatable_24?.ustazname || "Unknown",
      studentName: s.wpos_wpdatatable_23?.name || "Unknown",
      joinTime: s.clicked_at?.toISOString() || "",
      exitTime: s.session_ended_at?.toISOString(),
      duration: s.session_duration_minutes,
      status: s.session_status || "unknown",
    }));

    return NextResponse.json({
      sessions: formattedSessions,
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
