import { NextResponse } from "next/server";
import { checkZoomMeetingStatus } from "@/lib/check-zoom-status";

export async function POST() {
  try {
    console.log("🔧 Manual check triggered");
    const result = await checkZoomMeetingStatus();

    return NextResponse.json({
      success: result.success,
      sessionsChecked: result.sessionsChecked,
      sessionsEnded: result.sessionsEnded,
      processingTimeMs: result.processingTimeMs,
      message: `Checked ${result.sessionsChecked} sessions, ended ${result.sessionsEnded} sessions`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in manual check:", error);
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
