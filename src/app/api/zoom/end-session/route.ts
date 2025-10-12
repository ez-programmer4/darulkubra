import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { token, duration, endTime, reason } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    console.log(
      `🔚 Session end request for token: ${token}, duration: ${duration}min, reason: ${
        reason || "unknown"
      }`
    );

    // Get the current session data first
    const currentSession = await prisma.wpos_zoom_links.findFirst({
      where: {
        tracking_token: token,
        session_status: "active",
      },
      select: {
        id: true,
        clicked_at: true,
        last_activity_at: true,
        studentid: true,
        ustazid: true,
      },
    });

    if (!currentSession) {
      console.log(`⚠️ No active session found for token: ${token}`);
      return NextResponse.json({
        success: false,
        message: "No active session found",
        updated: 0,
      });
    }

    // Calculate actual duration if not provided
    let actualDuration = duration;
    if (!actualDuration && currentSession.clicked_at) {
      const endTimeDate = endTime ? new Date(endTime) : new Date();
      const durationMs =
        endTimeDate.getTime() - currentSession.clicked_at.getTime();
      const durationMinutes = Math.round(durationMs / 60000);

      // For very short sessions (less than 1 minute), set minimum duration
      // This handles cases where students click and immediately close
      actualDuration = Math.max(1, durationMinutes);

      console.log(`📊 Duration calculation:`, {
        clickedAt: currentSession.clicked_at,
        endedAt: endTimeDate,
        durationMs,
        durationMinutes,
        finalDuration: actualDuration,
      });
    }

    // Update session end data
    const result = await prisma.wpos_zoom_links.updateMany({
      where: {
        tracking_token: token,
        session_status: "active",
      },
      data: {
        session_ended_at: endTime ? new Date(endTime) : new Date(),
        session_duration_minutes: actualDuration || 0,
        session_status: "ended",
      },
    });

    console.log(`✅ Session ended successfully:`, {
      token,
      studentId: currentSession.studentid,
      teacherId: currentSession.ustazid,
      duration: actualDuration,
      reason: reason || "unknown",
      updated: result.count,
    });

    return NextResponse.json({
      success: true,
      duration: actualDuration || 0,
      reason: reason || "unknown",
      updated: result.count,
      sessionId: currentSession.id,
    });
  } catch (error) {
    console.error("Error ending session:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
