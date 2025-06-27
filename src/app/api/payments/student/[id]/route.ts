import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/server-auth";
import { cookies } from "next/headers";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 401 }
      );
    }

    const studentId = parseInt(params.id);
    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: "Invalid student ID" },
        { status: 400 }
      );
    }

    const student = await prisma.wpos_wpdatatable_23.findUnique({
      where: {
        id: studentId,
      },
      select: {
        id: true,
        name: true,
        classfee: true,
        startdate: true,
        registrationdate: true,
        control: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Check if the student belongs to this controller
    if (student.control !== user.username) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    return NextResponse.json(student);
  } catch (error) {
    console.error("Error fetching student:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
