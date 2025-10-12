import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token || token.role !== "teacher") {
      return NextResponse.json(
        { error: "Unauthorized - Teacher access required" },
        { status: 403 }
      );
    }

    const teacherId = token.id as string;
    const { studentId, zoomLinkId } = await req.json();

    if (!studentId && !zoomLinkId) {
      return NextResponse.json(
        { error: "Student ID or Zoom Link ID required" },
        { status: 400 }
      );
    }

    console.log(
      `🔚 Teacher ${teacherId} ending session with student ${
        studentId || "unknown"
      }`
    );

    // Find the active session
    const whereClause: any = {
      ustazid: teacherId,
      session_status: "active",
    };

    if (zoomLinkId) {
      whereClause.id = zoomLinkId;
    } else if (studentId) {
      whereClause.studentid = studentId;
    }

    const session = await prisma.wpos_zoom_links.findFirst({
      where: whereClause,
      orderBy: { clicked_at: "desc" },
    });

    if (!session) {
      return NextResponse.json(
        { error: "No active session found" },
        { status: 404 }
      );
    }

    // Calculate duration from clicked_at to now
    const startTime = session.clicked_at;
    const endTime = new Date();

    if (!startTime) {
      return NextResponse.json(
        { error: "Session has no start time" },
        { status: 400 }
      );
    }

    const durationMinutes = Math.round(
      (endTime.getTime() - startTime.getTime()) / 60000
    );

    // Ensure minimum 1 minute
    const finalDuration = Math.max(1, durationMinutes);

    console.log(`📊 Duration calculation:`, {
      clickedAt: startTime,
      endedAt: endTime,
      durationMinutes: durationMinutes,
      finalDuration: finalDuration,
    });

    // Update the session
    const updatedSession = await prisma.wpos_zoom_links.update({
      where: { id: session.id },
      data: {
        session_ended_at: endTime,
        session_duration_minutes: finalDuration,
        session_status: "ended",
      },
    });

    console.log(`✅ Teacher session ended: {
      sessionId: ${session.id},
      teacherId: '${teacherId}',
      studentId: ${session.studentid},
      duration: ${finalDuration} minutes
    }`);

    return NextResponse.json({
      success: true,
      session: {
        id: updatedSession.id,
        studentId: updatedSession.studentid,
        teacherId: updatedSession.ustazid,
        duration: finalDuration,
        startTime: startTime,
        endTime: endTime,
      },
    });
  } catch (error) {
    console.error("Error ending teacher session:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
