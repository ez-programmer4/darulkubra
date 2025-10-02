import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const setting = await prisma.setting.findUnique({
      where: { key: "show_teacher_salary" },
    });

    return NextResponse.json({
      showTeacherSalary: setting?.value === "true",
    });
  } catch (error: any) {
    console.error("Error fetching teacher salary visibility setting:", error);
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

    const { showTeacherSalary } = await req.json();

    if (typeof showTeacherSalary !== "boolean") {
      return NextResponse.json(
        { error: "showTeacherSalary must be a boolean" },
        { status: 400 }
      );
    }

    await prisma.setting.upsert({
      where: { key: "show_teacher_salary" },
      update: { value: showTeacherSalary.toString() },
      create: {
        key: "show_teacher_salary",
        value: showTeacherSalary.toString(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      showTeacherSalary,
    });
  } catch (error: any) {
    console.error("Error updating teacher salary visibility setting:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
