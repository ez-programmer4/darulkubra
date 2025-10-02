import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { createSalaryCalculator } from "@/lib/salary-calculator";
import { parseISO } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const format = url.searchParams.get("format") || "json"; // json, csv, pdf

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing startDate or endDate" },
        { status: 400 }
      );
    }

    const fromDate = parseISO(startDate);
    const toDate = parseISO(endDate);

    if (
      isNaN(fromDate.getTime()) ||
      isNaN(toDate.getTime()) ||
      fromDate > toDate
    ) {
      return NextResponse.json(
        { error: "Invalid date range" },
        { status: 400 }
      );
    }

    // Get salary calculator with current configuration
    const calculator = await createSalaryCalculator();

    // Calculate all teacher salaries
    const salaries = await calculator.calculateAllTeacherSalaries(
      fromDate,
      toDate
    );

    // Get payment records for the period
    const paymentRecords = await prisma.teachersalarypayment.findMany({
      where: {
        period: {
          gte: `${fromDate.getFullYear()}-${String(
            fromDate.getMonth() + 1
          ).padStart(2, "0")}`,
          lte: `${toDate.getFullYear()}-${String(
            toDate.getMonth() + 1
          ).padStart(2, "0")}`,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate comprehensive financial summary
    const financialSummary = {
      period: {
        startDate: startDate,
        endDate: endDate,
        monthYear: fromDate.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
      },
      totals: {
        totalTeachers: salaries.length,
        paidTeachers: salaries.filter((s) => s.status === "Paid").length,
        unpaidTeachers: salaries.filter((s) => s.status === "Unpaid").length,
        totalBaseSalary: salaries.reduce((sum, s) => sum + s.baseSalary, 0),
        totalLatenessDeduction: salaries.reduce(
          (sum, s) => sum + s.latenessDeduction,
          0
        ),
        totalAbsenceDeduction: salaries.reduce(
          (sum, s) => sum + s.absenceDeduction,
          0
        ),
        totalBonuses: salaries.reduce((sum, s) => sum + s.bonuses, 0),
        totalSalary: salaries.reduce((sum, s) => sum + s.totalSalary, 0),
        totalStudents: salaries.reduce((sum, s) => sum + s.numStudents, 0),
        totalTeachingDays: salaries.reduce((sum, s) => sum + s.teachingDays, 0),
      },
      averages: {
        averageSalary:
          salaries.length > 0
            ? salaries.reduce((sum, s) => sum + s.totalSalary, 0) /
              salaries.length
            : 0,
        averageStudentsPerTeacher:
          salaries.length > 0
            ? salaries.reduce((sum, s) => sum + s.numStudents, 0) /
              salaries.length
            : 0,
        averageTeachingDays:
          salaries.length > 0
            ? salaries.reduce((sum, s) => sum + s.teachingDays, 0) /
              salaries.length
            : 0,
        averageDailyEarning:
          salaries.length > 0
            ? salaries.reduce(
                (sum, s) => sum + s.breakdown.summary.averageDailyEarning,
                0
              ) / salaries.length
            : 0,
      },
      deductions: {
        totalLatenessDeduction: salaries.reduce(
          (sum, s) => sum + s.latenessDeduction,
          0
        ),
        totalAbsenceDeduction: salaries.reduce(
          (sum, s) => sum + s.absenceDeduction,
          0
        ),
        totalDeductions: salaries.reduce(
          (sum, s) => sum + s.latenessDeduction + s.absenceDeduction,
          0
        ),
        deductionRate:
          salaries.reduce((sum, s) => sum + s.baseSalary, 0) > 0
            ? (salaries.reduce(
                (sum, s) => sum + s.latenessDeduction + s.absenceDeduction,
                0
              ) /
                salaries.reduce((sum, s) => sum + s.baseSalary, 0)) *
              100
            : 0,
      },
      teacherChanges: {
        teachersWithChanges: salaries.filter((s) => s.hasTeacherChanges).length,
        changeRate:
          salaries.length > 0
            ? (salaries.filter((s) => s.hasTeacherChanges).length /
                salaries.length) *
              100
            : 0,
      },
    };

    // Detailed breakdown by teacher
    const teacherBreakdown = salaries.map((teacher) => ({
      teacherId: teacher.id,
      teacherName: teacher.name,
      status: teacher.status,
      baseSalary: teacher.baseSalary,
      latenessDeduction: teacher.latenessDeduction,
      absenceDeduction: teacher.absenceDeduction,
      bonuses: teacher.bonuses,
      totalSalary: teacher.totalSalary,
      numStudents: teacher.numStudents,
      teachingDays: teacher.teachingDays,
      hasTeacherChanges: teacher.hasTeacherChanges,
      breakdown: {
        dailyEarnings: teacher.breakdown.dailyEarnings,
        studentBreakdown: teacher.breakdown.studentBreakdown.map((student) => ({
          studentName: student.studentName,
          package: student.package,
          monthlyRate: student.monthlyRate,
          dailyRate: student.dailyRate,
          daysWorked: student.daysWorked,
          totalEarned: student.totalEarned,
          teacherChanges: student.teacherChanges,
          periods: student.periods || [],
        })),
        latenessBreakdown: teacher.breakdown.latenessBreakdown,
        absenceBreakdown: teacher.breakdown.absenceBreakdown,
        summary: teacher.breakdown.summary,
      },
    }));

    // Payment history
    const paymentHistory = paymentRecords.map((record) => ({
      id: record.id,
      teacherId: record.teacherId,
      period: record.period,
      status: record.status,
      totalSalary: record.totalSalary,
      latenessDeduction: record.latenessDeduction,
      absenceDeduction: record.absenceDeduction,
      bonuses: record.bonuses,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      processedAt: record.processedAt,
      transactionId: record.transactionId,
    }));

    const report = {
      financialSummary,
      teacherBreakdown,
      paymentHistory,
      generatedAt: new Date().toISOString(),
      generatedBy: token.name || token.email || "Admin",
    };

    if (format === "csv") {
      return generateCSVReport(report);
    } else if (format === "pdf") {
      return generatePDFReport(report);
    }

    return NextResponse.json(report);
  } catch (error: any) {
    console.error("Error generating financial report:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

function generateCSVReport(report: any): NextResponse {
  const csvHeaders = [
    "Teacher ID",
    "Teacher Name",
    "Status",
    "Base Salary",
    "Lateness Deduction",
    "Absence Deduction",
    "Bonuses",
    "Total Salary",
    "Number of Students",
    "Teaching Days",
    "Has Teacher Changes",
    "Average Daily Earning",
    "Net Salary",
  ];

  const csvRows = report.teacherBreakdown.map((teacher: any) => [
    teacher.teacherId,
    teacher.teacherName,
    teacher.status,
    teacher.baseSalary,
    teacher.latenessDeduction,
    teacher.absenceDeduction,
    teacher.bonuses,
    teacher.totalSalary,
    teacher.numStudents,
    teacher.teachingDays,
    teacher.hasTeacherChanges ? "Yes" : "No",
    teacher.breakdown.summary.averageDailyEarning,
    teacher.breakdown.summary.netSalary,
  ]);

  const csvContent = [
    csvHeaders.join(","),
    ...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="teacher-payment-report-${report.financialSummary.period.startDate}-to-${report.financialSummary.period.endDate}.csv"`,
    },
  });
}

function generatePDFReport(report: any): NextResponse {
  // For now, return JSON with PDF generation instructions
  // In a real implementation, you would use a PDF library like puppeteer or jsPDF
  return NextResponse.json({
    message: "PDF generation not implemented yet",
    report,
    instructions: "Use a PDF library to generate the report from the JSON data",
  });
}
