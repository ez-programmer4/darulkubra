import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { ZoomService } from "@/lib/zoom-service";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token || token.role !== "teacher") {
      return NextResponse.json(
        { error: "Unauthorized - Teacher access required" },
        { status: 403 }
      );
    }

    const teacherId = token.id as string;

    await ZoomService.disconnectZoom(teacherId);

    return NextResponse.json({
      success: true,
      message: "Zoom account disconnected successfully",
    });
  } catch (error) {
    console.error("Zoom disconnect error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to disconnect Zoom",
      },
      { status: 500 }
    );
  }
}





