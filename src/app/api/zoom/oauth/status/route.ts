import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token || token.role !== "teacher") {
      return NextResponse.json(
        { error: "Unauthorized - Teacher access required" },
        { status: 403 }
      );
    }

    const teacherId = token.id as string;

    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
      select: {
        zoom_user_id: true,
        zoom_connected_at: true,
        ustazname: true,
      },
    });

    const isConnected = !!teacher?.zoom_user_id;

    return NextResponse.json({
      connected: isConnected,
      connectedAt: teacher?.zoom_connected_at,
      teacherName: teacher?.ustazname,
    });
  } catch (error) {
    console.error("Zoom status check error:", error);
    return NextResponse.json(
      { error: "Failed to check Zoom status" },
      { status: 500 }
    );
  }
}












