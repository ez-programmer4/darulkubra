import { NextResponse } from "next/server";
import { autoTimeoutSessions } from "@/lib/session-timeout";

export async function POST() {
  try {
    console.log("🔧 Manual auto-timeout triggered");
    const result = await autoTimeoutSessions();

    return NextResponse.json({
      success: result.success,
      sessionsEnded: result.timeoutCount,
      totalChecked: result.totalChecked,
      processingTimeMs: result.processingTimeMs,
      details: result.details,
      message: `Checked ${result.totalChecked} sessions, ended ${result.timeoutCount} inactive sessions in ${result.processingTimeMs}ms`,
      error: result.error,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in manual auto-timeout:", error);
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
