import { prisma } from "@/lib/prisma";

/**
 * Check if Zoom meeting is still valid/active
 * If link/token is invalid or meeting ended, mark session as ended
 */

async function checkZoomMeetingStatus(link: string): Promise<boolean> {
  try {
    // Try to access the Zoom link
    const response = await fetch(link, {
      method: "HEAD",
      redirect: "manual",
    });

    // If Zoom link is valid, it returns 200 or redirects (3xx)
    return response.ok || (response.status >= 300 && response.status < 400);
  } catch (error) {
    // Network error or invalid link
    return false;
  }
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

        // Check if Zoom meeting is still valid
        const isValid = await checkZoomMeetingStatus(session.link);

        if (!isValid) {
          // Meeting has ended - calculate duration and mark as ended
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
            `✅ Auto-ended session ${session.id}: ${duration} min (Zoom meeting ended - Student: ${session.studentid}, Teacher: ${session.ustazid})`
          );
        } else {
          console.log(
            `🟢 Session ${session.id} still active (Zoom meeting valid)`
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
