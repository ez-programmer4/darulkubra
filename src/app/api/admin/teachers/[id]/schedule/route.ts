import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Fallback secret for development if NEXTAUTH_SECRET is not set
    const secret =
      process.env.NEXTAUTH_SECRET || "fallback-secret-for-development";

    const session = await getToken({
      req: request,
      secret,
    });

    if (!session) {
      return NextResponse.json(
        { message: "No session token" },
        { status: 401 }
      );
    }

    if (session.role !== "admin") {
      return NextResponse.json(
        { message: "Admin access required" },
        { status: 401 }
      );
    }

    const teacherId = params.id;
    const body = await request.json();
    const { schedule } = body;

    if (!schedule) {
      return NextResponse.json(
        { message: "Schedule is required" },
        { status: 400 }
      );
    }

    // Update teacher schedule
    const updatedTeacher = await prisma.wpos_wpdatatable_24.update({
      where: { ustazid: teacherId },
      data: { schedule },
    });

    return NextResponse.json(
      {
        message: "Teacher schedule updated successfully",
        teacher: updatedTeacher,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
