import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = (await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacherId = session.user.id;
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing from or to parameters" },
        { status: 400 }
      );
    }

    // Calculate period from the TO date (which should be the end of the target month)
    const toDate = new Date(to);
    console.log("Processing salary for month:", toDate.getMonth());
    console.log("Next month:", toDate.getMonth() + 1);

    const period = `${toDate.getFullYear()}-${String(
      toDate.getMonth() + 1
    ).padStart(2, "0")}`;

    // Check all salary payments for this teacher
    const allTeacherPayments = await prisma.teachersalarypayment.findMany({
      where: { teacherId: teacherId },
      orderBy: { createdAt: "desc" },
    });
    console.log(
      "Teacher payments:",
      allTeacherPayments.map((p) => ({
        period: p.period,
        status: p.status,
        totalSalary: p.totalSalary,
      }))
    );

    // Check all salary payments in database (for debugging)
    const allPayments = await prisma.teachersalarypayment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
    });
    console.log(
      "All payments:",
      allPayments.map((p) => ({
        teacherId: p.teacherId,
        period: p.period,
        status: p.status,
        totalSalary: p.totalSalary,
      }))
    );

    // Get teacher's salary payment for the period
    const salaryPayment = await prisma.teachersalarypayment.findFirst({
      where: {
        teacherId: teacherId,
        period: period,
      },
    });

    if (salaryPayment) {
      console.log("Found existing salary payment:", salaryPayment.id);
    }

    // Get teacher info
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
      include: { students: true },
    });

    if (teacher) {
      console.log("Found teacher:", teacher.ustazname);
    }

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // If no salary payment exists, return default structure
    if (!salaryPayment) {
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

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
