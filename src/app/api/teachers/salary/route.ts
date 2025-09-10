import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { calculateTeacherSalary } from "@/lib/salary-calculator";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = (await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })) as any;
    const role = session?.role || session?.user?.role;
    if (!session || role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacherId = String(session?.user?.id || session?.id || "");
    if (!teacherId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if teacher salary visibility is enabled
    const visibilitySetting = await prisma.setting.findUnique({
      where: { key: "teacher_salary_visible" },
    });
    
    if (visibilitySetting && visibilitySetting.value === "false") {
      return NextResponse.json({ error: "Salary access disabled" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing from or to parameters" },
        { status: 400 }
      );
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const period = `${toDate.getFullYear()}-${String(
      toDate.getMonth() + 1
    ).padStart(2, "0")}`;

    // Get teacher info and active students
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Use shared calculation function to ensure consistency
    const salaryData = await calculateTeacherSalary(teacherId, fromDate, toDate);

    // All calculations are now done in the shared function

    // Get payment status
    const salaryPayment = await prisma.teachersalarypayment.findFirst({
      where: {
        teacherId: teacherId,
        period: period,
      },
    });

    const status = salaryPayment?.status || "Unpaid";

    const response = {
      id: teacherId,
      name: teacher.ustazname || "Unknown",
      baseSalary: salaryData.baseSalary,
      latenessDeduction: salaryData.latenessDeduction,
      absenceDeduction: salaryData.absenceDeduction,
      bonuses: salaryData.bonuses,
      totalSalary: salaryData.totalSalary,
      numStudents: salaryData.numStudents,
      teachingDays: salaryData.teachingDays,
      status: status as "Paid" | "Unpaid",
      breakdown: salaryData.breakdown
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Teacher salary API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
