import { PrismaClient } from "@prisma/client";
import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const session = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json(
        { message: "Student ID is required" },
        { status: 400 }
      );
    }

    const occupiedTime = await prisma.wpos_ustaz_occupied_times.findFirst({
      where: { student_id: parseInt(studentId) },
      select: { time_slot: true },
    });

    if (!occupiedTime) {
      return NextResponse.json(
        { message: "No occupied time found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { time_slot: occupiedTime.time_slot },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching occupied time:", error);
    return NextResponse.json(
      {
        message: "Error fetching occupied time",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
