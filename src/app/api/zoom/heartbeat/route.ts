import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    console.log(`💓 Heartbeat received for token: ${token}`);

    // Update last activity time with better error handling
    const result = await prisma.wpos_zoom_links.updateMany({
      where: {
        tracking_token: token,
        session_status: "active",
      },
      data: {
        last_activity_at: new Date(),
      },
    });

    console.log(
      `💓 Heartbeat updated ${result.count} session(s) for token: ${token}`
    );

    // If no sessions were updated, the session might have ended
    if (result.count === 0) {
      console.log(`⚠️ No active sessions found for token: ${token}`);
      return NextResponse.json({
        success: false,
        message: "No active session found",
        count: result.count,
      });
    }

    return NextResponse.json({
      success: true,
      count: result.count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in heartbeat:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
