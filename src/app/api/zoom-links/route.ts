import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!session || session.role !== "controller") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json(
        { message: "Student ID is required" },
        { status: 400 }
      );
    }

    const zoomLinks = await prisma.wpos_zoom_links.findMany({
      where: { studentid: parseInt(studentId) },
      orderBy: { sent_time: "desc" },
    });

    return NextResponse.json(zoomLinks, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Error fetching zoom links",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
