import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

/**
 * Check if teacher has connected their Zoom account via OAuth
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token || token.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacherId = token.id as string;

    // Check if teacher has OAuth tokens in wpos_wpdatatable_24 (teacher table)
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
      select: {
        zoom_access_token: true,
        zoom_refresh_token: true,
      },
    });

    const isConnected = !!(
      teacher?.zoom_access_token && teacher?.zoom_refresh_token
    );

    return NextResponse.json({
      isConnected,
      message: isConnected
        ? "Zoom account connected"
        : "Zoom account not connected. Please connect your Zoom account to use auto-create features.",
    });
  } catch (error) {
    console.error("Error checking Zoom OAuth status:", error);
    return NextResponse.json(
      { error: "Failed to check Zoom status" },
      { status: 500 }
    );
  }
}
