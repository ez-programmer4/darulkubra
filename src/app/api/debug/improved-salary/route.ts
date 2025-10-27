import { NextRequest, NextResponse } from "next/server";
import { createImprovedSalaryCalculator } from "@/lib/salary-calculator-improved";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get("teacherId");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    if (!teacherId || !fromDate || !toDate) {
      return NextResponse.json(
        { error: "Missing required parameters: teacherId, fromDate, toDate" },
        { status: 400 }
      );
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);

    console.log(`
🚀 TESTING IMPROVED SALARY CALCULATOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Teacher ID: ${teacherId}
Period: ${fromDate} to ${toDate}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    const calculator = await createImprovedSalaryCalculator();
    const result = await calculator.calculateTeacherSalary(teacherId, from, to);

    return NextResponse.json({
      success: true,
      message: "Improved salary calculation completed",
      data: result,
    });
  } catch (error) {
    console.error("Error in improved salary calculation:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
