import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Teacher Salary API called");

    const session = await getServerSession(authOptions);
    console.log("👤 Session user:", session?.user?.id);

    if (!session?.user?.id) {
      console.log("❌ No session or user ID");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacherId = session.user.id;
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    console.log("📅 Date range:", { from, to });

    if (!from || !to) {
      console.log("❌ Missing from or to parameters");
      return NextResponse.json(
        { error: "Missing from or to parameters" },
        { status: 400 }
      );
    }

    // Calculate period from the TO date (which should be the end of the target month)
    const toDate = new Date(to);
    console.log("📅 To date object:", toDate);
    console.log("📅 To date year:", toDate.getFullYear());
    console.log("📅 To date month (0-indexed):", toDate.getMonth());
    console.log("📅 To date month (1-indexed):", toDate.getMonth() + 1);

    const period = `${toDate.getFullYear()}-${String(
      toDate.getMonth() + 1
    ).padStart(2, "0")}`;

    console.log("📊 Looking for period:", period);
    console.log("📊 Teacher ID:", teacherId);

    // Check all salary payments for this teacher
    const allTeacherPayments = await prisma.teacherSalaryPayment.findMany({
      where: { teacherId: teacherId },
      orderBy: { createdAt: "desc" },
    });
    console.log(
      "💰 All payments for this teacher:",
      allTeacherPayments.map((p) => ({
        period: p.period,
        status: p.status,
        totalSalary: p.totalSalary,
      }))
    );

    // Check all salary payments in database (for debugging)
    const allPayments = await prisma.teacherSalaryPayment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
    });
    console.log(
      "💰 All payments in database:",
      allPayments.map((p) => ({
        teacherId: p.teacherId,
        period: p.period,
        status: p.status,
        totalSalary: p.totalSalary,
      }))
    );

    // Get teacher's salary payment for the period
    const salaryPayment = await prisma.teacherSalaryPayment.findFirst({
      where: {
        teacherId: teacherId,
        period: period,
      },
    });

    console.log("💰 Salary payment found:", salaryPayment ? "YES" : "NO");
    if (salaryPayment) {
      console.log("💰 Salary details:", {
        totalSalary: salaryPayment.totalSalary,
        latenessDeduction: salaryPayment.latenessDeduction,
        absenceDeduction: salaryPayment.absenceDeduction,
        bonuses: salaryPayment.bonuses,
        status: salaryPayment.status,
      });
    }

    // Get teacher info
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
      include: { students: true },
    });

    console.log("👨‍🏫 Teacher found:", teacher ? "YES" : "NO");
    if (teacher) {
      console.log("👨‍🏫 Teacher details:", {
        name: teacher.ustazname,
        studentsCount: teacher.students.length,
      });
    }

    if (!teacher) {
      console.log("❌ Teacher not found");
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // If no salary payment exists, return default structure
    if (!salaryPayment) {
      console.log("📝 Returning default salary structure");
      return NextResponse.json({
        id: teacherId,
        name: teacher.ustazname || "Unknown",
        baseSalary: 0,
        latenessDeduction: 0,
        absenceDeduction: 0,
        bonuses: 0,
        totalSalary: 0,
        numStudents: teacher.students.length,
        status: "Unpaid" as const,
      });
    }

    // Calculate base salary
    const baseSalary =
      salaryPayment.totalSalary +
      salaryPayment.latenessDeduction +
      salaryPayment.absenceDeduction -
      salaryPayment.bonuses;

    console.log("🧮 Calculated base salary:", baseSalary);

    const response = {
      id: teacherId,
      name: teacher.ustazname || "Unknown",
      baseSalary: baseSalary,
      latenessDeduction: salaryPayment.latenessDeduction,
      absenceDeduction: salaryPayment.absenceDeduction,
      bonuses: salaryPayment.bonuses,
      totalSalary: salaryPayment.totalSalary,
      numStudents: teacher.students.length,
      status: salaryPayment.status,
    };

    console.log("✅ Returning salary data:", response);
    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Error fetching teacher salary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
