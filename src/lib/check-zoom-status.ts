import { prisma } from "@/lib/prisma";

/**
 * Check if Zoom meetings are still active
 * Auto-end sessions when meeting has ended
 */

export async function checkZoomMeetingStatus() {
  const startTime = Date.now();
  let endedCount = 0;

  try {
    console.log("🔍 Checking Zoom meeting status...");

    // Get all active sessions
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
        packageId: true,
      },
      take: 100,
    });

    console.log(`📊 Found ${activeSessions.length} active sessions to check`);

    for (const session of activeSessions) {
      try {
        // Extract meeting ID from Zoom link
        const meetingIdMatch = session.link.match(/\/j\/(\d+)/);
        if (!meetingIdMatch) {
          console.log(`⚠️ No meeting ID found in link for session ${session.id}`);
          continue;
        }

        const meetingId = meetingIdMatch[1];
        
        // Calculate how long session has been active
        const startTime = session.clicked_at!;
        const currentDuration = Math.round(
          (Date.now() - startTime.getTime()) / 60000
        );

        // Get expected duration from package
        let expectedDuration = 60; // Default 1 hour
        
        if (session.packageId) {
          const packageDurations: Record<string, number> = {
            Europe: 60,
            USA: 60,
            Canada: 60,
            "0 Fee": 30,
            Free: 30,
          };
          expectedDuration = packageDurations[session.packageId] || 60;
        }

        // Auto-end if current duration exceeds expected + 10 min buffer
        const maxDuration = expectedDuration + 10;

        if (currentDuration >= maxDuration) {
          // Meeting has likely ended - auto-end session
          const endTime = new Date();

          await prisma.wpos_zoom_links.update({
            where: { id: session.id },
            data: {
              session_ended_at: endTime,
              session_duration_minutes: currentDuration,
              session_status: "ended",
            },
          });

          endedCount++;
          console.log(
            `✅ Auto-ended session ${session.id}: ${currentDuration} min (expected ${expectedDuration}, package: ${session.packageId})`
          );
        }
      } catch (error) {
        console.error(`❌ Error checking session ${session.id}:`, error);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(
      `✅ Zoom status check complete: Ended ${endedCount} sessions in ${processingTime}ms`
    );

    return {
      success: true,
      sessionsChecked: activeSessions.length,
      sessionsEnded: endedCount,
      processingTimeMs: processingTime,
    };
  } catch (error) {
    console.error("❌ Error checking Zoom status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      sessionsChecked: 0,
      sessionsEnded: 0,
    };
  }
}

