import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import {
  processTeacherChange,
  // getTeacherChangeHistory, // COMMENTED OUT - teacher_change_history table temporarily disabled
} from "@/lib/teacher-change-utils";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const teacherId = searchParams.get("teacherId");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    if (studentId) {
      // Get teacher change history for a specific student
      // COMMENTED OUT - teacher_change_history table temporarily disabled
      /*
      if (!fromDate || !toDate) {
        return NextResponse.json(
          { error: "fromDate and toDate are required for student history" },
          { status: 400 }
        );
      }

      const history = await getTeacherChangeHistory(
        parseInt(studentId),
        new Date(fromDate),
        new Date(toDate)
      );

      return NextResponse.json({ history });
      */
      return NextResponse.json(
        { error: "Teacher change history temporarily disabled" },
        { status: 503 }
      );
    }

    if (teacherId) {
      // Get teacher change periods for a specific teacher
      // COMMENTED OUT - teacher_change_history table temporarily disabled
      /*
      if (!fromDate || !toDate) {
        return NextResponse.json(
          { error: "fromDate and toDate are required for teacher periods" },
          { status: 400 }
        );
      }

      const { getTeacherChangePeriods } = await import(
        "@/lib/teacher-change-utils"
      );
      const periods = await getTeacherChangePeriods(
        teacherId,
        new Date(fromDate),
        new Date(toDate)
      );

      return NextResponse.json({ periods });
      */
      return NextResponse.json(
        { error: "Teacher change periods temporarily disabled" },
        { status: 503 }
      );
    }

    // Get all recent teacher changes
    // COMMENTED OUT - teacher_change_history table temporarily disabled
    /*
    const changes = await prisma.teacher_change_history.findMany({
      take: 50,
      orderBy: { change_date: "desc" },
      include: {
        student: {
          select: { name: true, package: true },
        },
        old_teacher: {
          select: { ustazname: true },
        },
        new_teacher: {
          select: { ustazname: true },
        },
      },
    });

    return NextResponse.json({ changes });
    */
    return NextResponse.json(
      { error: "Teacher change history temporarily disabled" },
      { status: 503 }
    );
  } catch (error: any) {
    console.error("Error fetching teacher changes:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      studentId,
      oldTeacherId,
      newTeacherId,
      timeSlot,
      dayPackage,
      changeReason,
    } = await req.json();

    if (!studentId || !newTeacherId || !timeSlot || !dayPackage) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await processTeacherChange(
      studentId,
      oldTeacherId || null,
      newTeacherId,
      timeSlot,
      dayPackage,
      changeReason,
      token.email || "admin"
    );

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      message: result.message,
      success: true,
    });
  } catch (error: any) {
    console.error("Error processing teacher change:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
