import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createSalaryCalculator } from "@/lib/salary-calculator";
import { parseISO } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    // Validate session
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing startDate or endDate" },
        { status: 400 }
      );
    }

    // Parse and validate dates
    const from = parseISO(startDate);
    const to = parseISO(endDate);

    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
      return NextResponse.json(
        { error: "Invalid date range. Use UTC ISO format (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    const calculator = await createSalaryCalculator();
    const salaries = await calculator.calculateAllTeacherSalaries(from, to);

    // Calculate statistics
    const totalTeachers = salaries.length;
    const paidTeachers = salaries.filter((s) => s.status === "Paid").length;
    const unpaidTeachers = salaries.filter((s) => s.status === "Unpaid").length;
    const totalSalary = salaries.reduce((sum, s) => sum + s.baseSalary, 0);
    const totalDeductions = salaries.reduce(
      (sum, s) => sum + s.latenessDeduction + s.absenceDeduction,
      0
    );
    const totalBonuses = salaries.reduce((sum, s) => sum + s.bonuses, 0);
    const averageSalary = totalTeachers > 0 ? totalSalary / totalTeachers : 0;
    const paymentRate =
      totalTeachers > 0 ? (paidTeachers / totalTeachers) * 100 : 0;

    const statistics = {
      totalTeachers,
      paidTeachers,
      unpaidTeachers,
      totalSalary,
      totalDeductions,
      totalBonuses,
      averageSalary,
      paymentRate,
    };

    return NextResponse.json(statistics);
  } catch (error: any) {
    console.error("Error in teacher payments statistics API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
