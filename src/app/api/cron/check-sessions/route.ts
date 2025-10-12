import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("🔍 Checking for inactive sessions...");

    // Find sessions that have been active for more than 5 minutes
    // (If student left Zoom, last_activity_at won't update, so we can detect it)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const inactiveSessions = await prisma.wpos_zoom_links.findMany({
      where: {
        session_status: "active",
        clicked_at: { not: null },
        last_activity_at: {
          lt: fiveMinutesAgo, // No activity in last 5 minutes
        },
      },
      select: {
        id: true,
        studentid: true,
        ustazid: true,
        clicked_at: true,
        last_activity_at: true,
      },
    });

    console.log(`📊 Found ${inactiveSessions.length} inactive sessions`);

    let endedCount = 0;

    for (const session of inactiveSessions) {
      try {
        const exitTime = new Date();
        const joinTime = session.clicked_at!;

        // Calculate duration based on last activity (when student was last seen)
        const lastSeen = session.last_activity_at || joinTime;
        const durationSeconds = Math.floor(
          (lastSeen.getTime() - joinTime.getTime()) / 1000
        );
        const durationMinutes = Math.max(1, Math.ceil(durationSeconds / 60));

        await prisma.wpos_zoom_links.update({
          where: { id: session.id },
          data: {
            session_ended_at: exitTime,
            session_duration_minutes: durationMinutes,
            session_status: "ended",
          },
        });

        endedCount++;
        console.log(
          `✅ Auto-ended inactive session ${session.id}: ${durationMinutes} min`
        );
      } catch (error) {
        console.error(`❌ Error ending session ${session.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      checked: inactiveSessions.length,
      ended: endedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in cron job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
