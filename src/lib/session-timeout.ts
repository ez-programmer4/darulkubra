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

    // Find sessions inactive for more than 5 minutes (no heartbeat)
    // This means student likely left Zoom meeting
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Enhanced query with better performance and error handling
    const inactiveSessions = await prisma.wpos_zoom_links.findMany({
      where: {
        session_status: "active",
        clicked_at: { not: null },
        OR: [
          { last_activity_at: { lt: fiveMinutesAgo } },
          {
            last_activity_at: null,
            clicked_at: { lt: fiveMinutesAgo },
          },
        ],
      },
      select: {
        id: true,
        studentid: true,
        ustazid: true,
        clicked_at: true,
        last_activity_at: true,
        tracking_token: true,
        sent_time: true,
      },
      // Add limit to prevent memory issues with large datasets
      take: 1000,
    });

    totalChecked = inactiveSessions.length;
    console.log(`🔍 Found ${totalChecked} potentially inactive sessions`);

    // Process sessions in batches for better performance
    const batchSize = 50;
    for (let i = 0; i < inactiveSessions.length; i += batchSize) {
      const batch = inactiveSessions.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (session) => {
          try {
            const startTime = session.clicked_at!;
            const endTime = session.last_activity_at || new Date();
            const durationMinutes = Math.round(
              (endTime.getTime() - startTime.getTime()) / 60000
            );

            // Only timeout if session is actually inactive (more than 5 minutes)
            const isActuallyInactive = endTime < fiveMinutesAgo;

            if (isActuallyInactive) {
              await prisma.wpos_zoom_links.update({
                where: { id: session.id },
                data: {
                  session_ended_at: endTime,
                  session_duration_minutes: durationMinutes,
                  session_status: "timeout",
                },
              });

              timeoutCount++;
              timeoutDetails.push({
                sessionId: session.id,
                studentId: session.studentid,
                teacherId: session.ustazid,
                duration: durationMinutes,
                token: session.tracking_token,
                sentTime: session.sent_time,
              });

              console.log(
                `⏰ Timed out session ${session.id} (${durationMinutes}min): Student ${session.studentid}, Teacher ${session.ustazid}`
              );
            }
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
