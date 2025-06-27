import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("authToken")?.value;
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || user.role !== "controller") {
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
    console.error("Error fetching zoom links:", error);
    return NextResponse.json(
      { message: "Error fetching zoom links", error: error.message },
      { status: 500 }
    );
  }
}
