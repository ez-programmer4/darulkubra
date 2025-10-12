import { prisma } from "@/lib/prisma";

export async function autoTimeoutSessions() {
  const startTime = Date.now();
  let timeoutCount = 0;
  const timeoutDetails: Array<{
    sessionId: number;
    studentId: number;
    teacherId: string | null;
    duration: number;
    token: string;
    sentTime: Date | null;
  }> = [];
  let totalChecked = 0;

  try {
    console.log("🕐 Starting auto-timeout process...");

    // Find ALL active sessions and check their age
    // Auto-end sessions based on typical meeting duration
    const now = new Date();

    const activeSessions = await prisma.wpos_zoom_links.findMany({
      where: {
        session_status: "active",
        clicked_at: { not: null },
      },
      select: {
        id: true,
        studentid: true,
        ustazid: true,
        clicked_at: true,
        last_activity_at: true,
        tracking_token: true,
        sent_time: true,
        packageId: true,
        packageRate: true,
      },
      // Add limit to prevent memory issues with large datasets
      take: 1000,
    });

    totalChecked = activeSessions.length;
    console.log(`🔍 Found ${totalChecked} active sessions to check`);

    // Process sessions in batches for better performance
    const batchSize = 50;
    for (let i = 0; i < activeSessions.length; i += batchSize) {
      const batch = activeSessions.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (session) => {
          try {
            const startTime = session.clicked_at!;
            const sessionAgeMinutes = Math.round(
              (now.getTime() - startTime.getTime()) / 60000
            );

            // Get expected duration from package
            let expectedDuration = 60; // Default 1 hour

            if (session.packageId) {
              const packageMatch = session.packageId.match(
                /(\d+)\s*(min|hour|hr|h)/i
              );
              if (packageMatch) {
                const num = parseInt(packageMatch[1]);
                const unit = packageMatch[2].toLowerCase();
                expectedDuration = unit.startsWith("h") ? num * 60 : num;
              } else {
                const packageDurations: Record<string, number> = {
                  Europe: 60,
                  USA: 60,
                  Canada: 60,
                  "0 Fee": 30,
                  Free: 30,
                };
                expectedDuration = packageDurations[session.packageId] || 60;
              }
            }

            // Auto-end if session age >= expected duration + 10 min buffer
            const maxDuration = expectedDuration + 10;

            if (sessionAgeMinutes >= maxDuration) {
              // Use actual elapsed time as duration
              const actualDuration = sessionAgeMinutes;
              const endTime = now;

              await prisma.wpos_zoom_links.update({
                where: { id: session.id },
                data: {
                  session_ended_at: endTime,
                  session_duration_minutes: actualDuration,
                  session_status: "timeout",
                },
              });

              timeoutCount++;
              timeoutDetails.push({
                sessionId: session.id,
                studentId: session.studentid,
                teacherId: session.ustazid,
                duration: actualDuration,
                token: session.tracking_token,
                sentTime: session.sent_time,
              });

              console.log(
                `⏰ Auto-ended session ${session.id} after ${actualDuration}min (expected ${expectedDuration}min, package: '${session.packageId}'): Student ${session.studentid}, Teacher ${session.ustazid}`
              );
            }
          } catch (sessionError) {
            console.error(
              `❌ Error processing session ${session.id}:`,
              sessionError
            );
          }
        })
      );
    }

    const processingTime = Date.now() - startTime;
    console.log(
      `✅ Auto-timeout completed: Ended ${timeoutCount} inactive sessions in ${processingTime}ms`
    );

    if (timeoutCount > 0) {
      console.log("📊 Timeout details:", timeoutDetails);
    }

    return {
      timeoutCount,
      details: timeoutDetails,
      totalChecked,
      processingTimeMs: processingTime,
      success: true,
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("❌ Error in auto-timeout:", error);

    return {
      timeoutCount: 0,
      details: [],
      totalChecked,
      processingTimeMs: processingTime,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
