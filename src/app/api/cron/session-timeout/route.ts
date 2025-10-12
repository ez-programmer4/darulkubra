import { NextResponse } from "next/server";
import { autoTimeoutSessions } from "@/lib/session-timeout";

export async function GET() {
  try {
    console.log("🔄 Cron job triggered: Auto-timeout sessions");
    const result = await autoTimeoutSessions();

    return NextResponse.json({
      success: result.success,
      sessionsEnded: result.timeoutCount,
      totalChecked: result.totalChecked,
      processingTimeMs: result.processingTimeMs,
      error: result.error,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Cron job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
