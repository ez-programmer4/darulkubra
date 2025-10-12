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

    // Find sessions older than 90 minutes (typical max session length)
    // Use package duration for trustworthy, tamper-proof tracking
    const ninetyMinutesAgo = new Date(Date.now() - 90 * 60 * 1000);

    // Enhanced query with better performance and error handling
    const oldSessions = await prisma.wpos_zoom_links.findMany({
      where: {
        session_status: "active",
        clicked_at: {
          not: null,
          lt: ninetyMinutesAgo,
        },
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

    totalChecked = oldSessions.length;
    console.log(`🔍 Found ${totalChecked} old sessions to process`);

    // Process sessions in batches for better performance
    const batchSize = 50;
    for (let i = 0; i < oldSessions.length; i += batchSize) {
      const batch = oldSessions.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (session) => {
          try {
            const startTime = session.clicked_at!;

            // Estimate duration based on package (trustworthy - uses agreed package time)
            let estimatedDuration = 60; // Default 1 hour

            // Try to extract duration from package name
            if (session.packageId) {
              const packageMatch = session.packageId.match(
                /(\d+)\s*(min|hour|hr|h)/i
              );
              if (packageMatch) {
                const num = parseInt(packageMatch[1]);
                const unit = packageMatch[2].toLowerCase();
                estimatedDuration = unit.startsWith("h") ? num * 60 : num;
              } else {
                // Common package names mapping
                const packageDurations: Record<string, number> = {
                  Europe: 60,
                  USA: 60,
                  Canada: 60,
                  "0 Fee": 30,
                  Free: 30,
                };
                estimatedDuration = packageDurations[session.packageId] || 60;
              }
            }

            // Calculate end time based on package duration (TRUSTWORTHY - can't be manipulated)
            const endTime = new Date(
              startTime.getTime() + estimatedDuration * 60 * 1000
            );

            await prisma.wpos_zoom_links.update({
              where: { id: session.id },
              data: {
                session_ended_at: endTime,
                session_duration_minutes: estimatedDuration,
                session_status: "timeout",
              },
            });

            timeoutCount++;
            timeoutDetails.push({
              sessionId: session.id,
              studentId: session.studentid,
              teacherId: session.ustazid,
              duration: estimatedDuration,
              token: session.tracking_token,
              sentTime: session.sent_time,
            });

            console.log(
              `⏰ Ended session ${session.id} (${estimatedDuration}min from package '${session.packageId}'): Student ${session.studentid}, Teacher ${session.ustazid}`
            );
          } catch (sessionError) {
            console.error(
              `❌ Error processing session ${session.id}:`,
              sessionError
            );
            // Continue processing other sessions even if one fails
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
