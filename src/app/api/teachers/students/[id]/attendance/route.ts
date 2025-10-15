import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const teacherId = token.id as string;
    const studentId = Number(params.id);

    if (!Number.isFinite(studentId)) {
      return NextResponse.json(
        { error: "Invalid student id" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { attendance_status, surah, pages_read, level, lesson, notes } = body;
    if (!attendance_status) {
      return NextResponse.json(
        { error: "attendance_status is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const student = await prisma.wpos_wpdatatable_23.findUnique({
      where: { wdt_ID: studentId },
      select: { ustaz: true, name: true },
    });
    if (!student || student.ustaz !== teacherId) {
      return NextResponse.json({ error: "Not your student" }, { status: 403 });
    }

    const created = await prisma.student_attendance_progress.create({
      data: {
        student_id: studentId,
        attendance_status,
        surah: surah ?? null,
        pages_read: pages_read != null ? Number(pages_read) : null,
        level: level ?? null,
        lesson: lesson ?? null,
        notes: notes ?? null,
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        student_name: student.name,
        status: attendance_status,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
