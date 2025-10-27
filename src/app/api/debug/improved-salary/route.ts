import { NextRequest, NextResponse } from "next/server";
import { ImprovedSalaryCalculator } from "@/lib/salary-calculator-improved";

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

    console.log(`
🔍 IMPROVED SALARY CALCULATION API:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Teacher ID: ${teacherId}
From Date: ${fromDate}
To Date: ${toDate}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    const calculator = new ImprovedSalaryCalculator();
    const result = await calculator.calculateTeacherSalaryImproved(
      teacherId,
      new Date(fromDate),
      new Date(toDate)
    );

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
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
