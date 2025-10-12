import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token || token.role !== "teacher") {
      return NextResponse.json(
        { error: "Unauthorized - Teacher access required" },
        { status: 403 }
      );
    }

    const teacherId = token.id as string;

    // Fetch active sessions for this teacher
    const activeSessions = await prisma.wpos_zoom_links.findMany({
      where: {
        ustazid: teacherId,
        session_status: "active",
        clicked_at: { not: null },
      },
      include: {
        wpos_wpdatatable_23: {
          select: {
            name: true,
            wdt_ID: true,
          },
        },
      },
      orderBy: { clicked_at: "desc" },
    });

    console.log(
      `📊 Found ${activeSessions.length} active sessions for teacher ${teacherId}`
    );

    const sessions = activeSessions.map((session) => ({
      id: session.id,
      studentId: session.studentid,
      studentName: session.wpos_wpdatatable_23?.name || "Unknown Student",
      clickedAt: session.clicked_at,
      lastActivity: session.last_activity_at,
    }));

    return NextResponse.json({
      success: true,
      sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error("Error fetching active sessions:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
