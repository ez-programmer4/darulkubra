import { NextRequest, NextResponse } from "next/server";
import { SalaryCalculator } from "@/lib/salary-calculator";
import { prisma } from "@/lib/prisma";

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
🔍 DEBUGGING OLD SALARY CALCULATOR:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Teacher ID: ${teacherId}
From Date: ${fromDate}
To Date: ${toDate}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // Check if teacher exists in main table
    const teacherInMainTable = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
      select: { ustazid: true, ustazname: true },
    });

    // Check if teacher has zoom links
    const zoomLinkCount = await prisma.wpos_zoom_links.count({
      where: { ustazid: teacherId },
    });

    // Check zoom links in the specific period
    const periodZoomLinks = await prisma.wpos_zoom_links.findMany({
      where: {
        ustazid: teacherId,
        sent_time: {
          gte: new Date(fromDate),
          lte: new Date(toDate),
        },
      },
      select: {
        studentid: true,
        sent_time: true,
        wpos_wpdatatable_23: {
          select: {
            wdt_ID: true,
            name: true,
            package: true,
            status: true,
            ustaz: true,
          },
        },
      },
    });

    // Get package salaries
    const packageSalaries = await prisma.packageSalary.findMany();
    const salaryMap: Record<string, number> = {};
    packageSalaries.forEach((pkg) => {
      salaryMap[pkg.packageName] = Number(pkg.salaryPerStudent);
    });

    // Test the old salary calculator
    const config = {
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

    const calculator = new SalaryCalculator(config);
    const salaryResult = await calculator.calculateTeacherSalary(
      teacherId,
      new Date(fromDate),
      new Date(toDate)
    );

    const analysis = {
      teacherId,
      teacherInMainTable,
      zoomLinkCount,
      periodZoomLinks: periodZoomLinks.length,
      zoomLinksDetails: periodZoomLinks.map((link) => ({
        studentId: link.studentid,
        studentName: link.wpos_wpdatatable_23?.name,
        studentPackage: link.wpos_wpdatatable_23?.package,
        studentStatus: link.wpos_wpdatatable_23?.status,
        studentAssignedTo: link.wpos_wpdatatable_23?.ustaz,
        sentTime: link.sent_time,
        packageSalary: link.wpos_wpdatatable_23?.package
          ? salaryMap[link.wpos_wpdatatable_23.package]
          : "No package",
      })),
      packageSalaries: packageSalaries.map((pkg) => ({
        name: pkg.packageName,
        salary: Number(pkg.salaryPerStudent),
      })),
      salaryResult: {
        teacherId: salaryResult.teacherId,
        teacherName: salaryResult.teacherName,
        totalSalary: salaryResult.totalSalary,
        totalTeachingDays: salaryResult.teachingDays,
        studentsCount: salaryResult.numStudents,
        studentsWithEarnings: salaryResult.breakdown.studentBreakdown.filter(
          (s: any) => s.totalEarned > 0
        ).length,
        studentBreakdown: salaryResult.breakdown.studentBreakdown.map(
          (s: any) => ({
            name: s.studentName,
            package: s.package,
            monthlyRate: s.monthlyRate,
            dailyRate: s.dailyRate,
            daysWorked: s.daysWorked,
            totalEarned: s.totalEarned,
            hasZoomLinks:
              s.periods?.some((p: any) => p.zoomLinks?.length > 0) || false,
          })
        ),
      },
      period: {
        from: fromDate,
        to: toDate,
      },
    };

    console.log(`
📊 OLD SALARY CALCULATOR ANALYSIS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Teacher: ${analysis.teacherInMainTable?.ustazname || "Not in main table"}
Total Zoom Links: ${analysis.zoomLinkCount}
Period Zoom Links: ${analysis.periodZoomLinks}
Salary Result: ${analysis.salaryResult.totalSalary} ETB
Students: ${analysis.salaryResult.studentsCount}
Students with Earnings: ${analysis.salaryResult.studentsWithEarnings}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    return NextResponse.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in old salary calculator debug:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
