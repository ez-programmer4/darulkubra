import { NextRequest, NextResponse } from "next/server";
import { SalaryCalculator } from "@/lib/salary-calculator";
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
🔍 SALARY CALCULATOR COMPARISON:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Teacher ID: ${teacherId}
From Date: ${fromDate}
To Date: ${toDate}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // Default config for old calculator
    const defaultConfig = {
      includeSundays: false,
      excusedThreshold: 3,
      latenessTiers: [
        { start: 0, end: 5, percent: 0 },
        { start: 6, end: 15, percent: 10 },
        { start: 16, end: 30, percent: 20 },
        { start: 31, end: 60, percent: 30 },
        { start: 61, end: 999, percent: 50 },
      ],
      packageDeductions: {
        "3 days": { lateness: 10, absence: 20 },
        "5 days": { lateness: 10, absence: 20 },
        "3 Fee": { lateness: 10, absence: 20 },
        "5 Fee": { lateness: 10, absence: 20 },
      },
    };

    // Test both calculators
    const oldCalculator = new SalaryCalculator(defaultConfig);
    const improvedCalculator = new ImprovedSalaryCalculator(defaultConfig);

    console.log("🔄 Testing OLD salary calculator...");
    const oldResult = await oldCalculator.calculateTeacherSalary(
      teacherId,
      new Date(fromDate),
      new Date(toDate)
    );

    console.log("🔄 Testing IMPROVED salary calculator...");
    const improvedResult =
      await improvedCalculator.calculateTeacherSalaryImproved(
        teacherId,
        new Date(fromDate),
        new Date(toDate)
      );

    // Calculate differences
    const salaryDifference = improvedResult.totalSalary - oldResult.totalSalary;
    const studentDifference =
      improvedResult.numberOfStudents - oldResult.numStudents;
    const teachingDaysDifference =
      improvedResult.teachingDays - oldResult.teachingDays;

    const comparison = {
      teacherId,
      teacherName: improvedResult.teacherName,
      period: {
        from: fromDate,
        to: toDate,
      },
      oldCalculator: {
        totalSalary: oldResult.totalSalary,
        numberOfStudents: oldResult.numStudents,
        teachingDays: oldResult.teachingDays,
        studentsWithEarnings: oldResult.numStudents, // Use numStudents as proxy
        issues: ["No students found for salary calculation"], // Default issue
        recommendations: ["Check teacher assignments and zoom links"],
      },
      improvedCalculator: {
        totalSalary: improvedResult.totalSalary,
        numberOfStudents: improvedResult.numberOfStudents,
        teachingDays: improvedResult.teachingDays,
        studentsWithEarnings: improvedResult.studentsWithEarnings,
        breakdown: improvedResult.breakdown || [],
      },
      differences: {
        salaryDifference: salaryDifference,
        studentDifference: studentDifference,
        teachingDaysDifference: teachingDaysDifference,
        percentageIncrease:
          oldResult.totalSalary > 0
            ? ((salaryDifference / oldResult.totalSalary) * 100).toFixed(2)
            : "N/A",
        impact:
          salaryDifference > 0
            ? "POSITIVE"
            : salaryDifference < 0
            ? "NEGATIVE"
            : "NO CHANGE",
      },
      summary: {
        oldSalary: oldResult.totalSalary,
        newSalary: improvedResult.totalSalary,
        difference: salaryDifference,
        oldStudents: oldResult.numStudents,
        newStudents: improvedResult.numberOfStudents,
        studentsGained: studentDifference,
      },
    };

    console.log(`
📊 COMPARISON RESULTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Teacher: ${comparison.teacherName}
Old Salary: ${oldResult.totalSalary} ETB
New Salary: ${improvedResult.totalSalary} ETB
Difference: ${salaryDifference} ETB (${comparison.differences.percentageIncrease}%)
Old Students: ${oldResult.numStudents}
New Students: ${improvedResult.numberOfStudents}
Students Gained: ${studentDifference}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    return NextResponse.json({
      success: true,
      data: comparison,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in salary calculator comparison:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
