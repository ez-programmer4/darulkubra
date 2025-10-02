import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { TeacherChangeValidator } from "@/lib/teacher-change-validation";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { studentId, oldTeacherId, newTeacherId, changeDate, period } =
      await req.json();

    if (
      !studentId ||
      !oldTeacherId ||
      !newTeacherId ||
      !changeDate ||
      !period
    ) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const validation = await TeacherChangeValidator.validateTeacherChange(
      studentId,
      oldTeacherId,
      newTeacherId,
      new Date(changeDate),
      period
    );

    return NextResponse.json(validation);
  } catch (error: any) {
    console.error("Error validating teacher change:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const period = url.searchParams.get("period");

    if (!period) {
      return NextResponse.json(
        { error: "Missing period parameter" },
        { status: 400 }
      );
    }

    const validation =
      await TeacherChangeValidator.validatePeriodTeacherChanges(period);
    const summary = await TeacherChangeValidator.getTeacherChangeSummary(
      period
    );

    return NextResponse.json({
      validation,
      summary,
    });
  } catch (error: any) {
    console.error("Error validating period teacher changes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
