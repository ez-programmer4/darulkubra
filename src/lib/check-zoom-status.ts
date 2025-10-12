import { prisma } from "@/lib/prisma";

/**
 * Check if Zoom meeting is still valid/active
 * If link/token is invalid or meeting ended, mark session as ended
 */

// Simplified: Auto-end sessions after 2 hours max
// Zoom meetings typically don't last longer than this
async function isSessionStillActive(clickedAt: Date): Promise<boolean> {
  const now = new Date();
  const minutesSinceStart = Math.floor(
    (now.getTime() - clickedAt.getTime()) / 60000
  );

  // If session has been active for more than 2 hours (120 min), consider it ended
  return minutesSinceStart < 120;
}

export async function checkAllActiveSessions() {
  const startTime = Date.now();
  let endedCount = 0;
  let checkedCount = 0;

  try {
    console.log("🔍 Checking Zoom meeting status...");

    const activeSessions = await prisma.wpos_zoom_links.findMany({
      where: {
        session_status: "active",
        clicked_at: { not: null },
      },
      select: {
        id: true,
        studentid: true,
        ustazid: true,
        link: true,
        clicked_at: true,
        tracking_token: true,
      },
      take: 100,
    });

    console.log(`📊 Found ${activeSessions.length} active sessions to check`);

    for (const session of activeSessions) {
      try {
        checkedCount++;

        // Check if session should still be active (under 2 hours)
        const stillActive = await isSessionStillActive(session.clicked_at!);

        if (!stillActive) {
          // Session exceeded max duration - mark as ended
          const endTime = new Date();
          const duration = Math.round(
            (endTime.getTime() - session.clicked_at!.getTime()) / 60000
          );

          await prisma.wpos_zoom_links.update({
            where: { id: session.id },
            data: {
              session_ended_at: endTime,
              session_duration_minutes: duration,
              session_status: "ended",
            },
          });

          endedCount++;
          console.log(
            `✅ Auto-ended session ${session.id}: ${duration} min (exceeded max duration - Student: ${session.studentid}, Teacher: ${session.ustazid})`
          );
        } else {
          const minutesActive = Math.floor(
            (Date.now() - session.clicked_at!.getTime()) / 60000
          );
          console.log(
            `🟢 Session ${session.id} still active (${minutesActive} min)`
          );
        }
      } catch (error) {
        console.error(`❌ Error checking session ${session.id}:`, error);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(
      `✅ Check complete: Checked ${checkedCount} sessions, ended ${endedCount} in ${processingTime}ms`
    );

    return {
      success: true,
      sessionsChecked: checkedCount,
      sessionsEnded: endedCount,
      processingTimeMs: processingTime,
    };
  } catch (error) {
    console.error("❌ Error checking sessions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      sessionsChecked: 0,
      sessionsEnded: 0,
    };
  }
}
