import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    const session = await prisma.wpos_zoom_links.findFirst({
      where: { tracking_token: token },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Only log exit if session is active and has a join time
    if (session.session_status === "active" && session.clicked_at) {
      const exitTime = new Date();
      const joinTime = session.clicked_at;
      const durationSeconds = Math.floor(
        (exitTime.getTime() - joinTime.getTime()) / 1000
      );

      // Convert to minutes, minimum 1 minute
      const durationMinutes = Math.max(1, Math.ceil(durationSeconds / 60));

      await prisma.wpos_zoom_links.update({
        where: { id: session.id },
        data: {
          session_ended_at: exitTime,
          session_duration_minutes: durationMinutes,
          session_status: "ended",
        },
      });

      console.log(
        `✅ Student exited session ${session.id} - Duration: ${durationMinutes} minutes (${durationSeconds} seconds)`
      );

      return NextResponse.json({
        success: true,
        duration: durationMinutes,
        durationSeconds: durationSeconds,
      });
    }

    return NextResponse.json({ success: true, message: "Already logged" });
  } catch (error) {
    console.error("Error logging exit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
