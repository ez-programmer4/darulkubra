import { NextResponse } from "next/server";
import { checkAllActiveSessions } from "@/lib/check-zoom-status";

export async function POST() {
  try {
    console.log("🔧 Checking all active Zoom sessions");
    const result = await checkAllActiveSessions();

    return NextResponse.json({
      success: result.success,
      sessionsChecked: result.sessionsChecked,
      sessionsEnded: result.sessionsEnded,
      processingTimeMs: result.processingTimeMs,
      message: `Checked ${result.sessionsChecked} sessions, ended ${result.sessionsEnded}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error checking sessions:", error);
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

export async function GET() {
  // Allow GET requests for cron jobs
  return POST();
}
