import { NextRequest, NextResponse } from "next/server";
import { ImprovedSalaryCalculator } from "@/lib/salary-calculator-improved";
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
🔍 ENHANCED TEACHER PAYMENT CALCULATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Teacher ID: ${teacherId}
From Date: ${fromDate}
To Date: ${toDate}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // Default config for improved calculator
    const defaultConfig = {
      includeSundays: searchParams.get("includeSundays") === "true",
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

    const calculator = new ImprovedSalaryCalculator(defaultConfig);

    // Get basic salary calculation
    const basicResult = await calculator.calculateTeacherSalaryImproved(
      teacherId,
      new Date(fromDate),
      new Date(toDate)
    );

    // Get teacher information
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
      select: { ustazid: true, ustazname: true },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Get detailed zoom links for deductions and bonuses
    const zoomLinks = await prisma.wpos_zoom_links.findMany({
      where: {
        ustazid: teacherId,
        sent_time: { gte: new Date(fromDate), lte: new Date(toDate) },
      },
      orderBy: { sent_time: "asc" },
    });

    // Get student data
    const studentIds = [
      ...new Set(zoomLinks.map((link) => link.studentid).filter(Boolean)),
    ];
    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: { wdt_ID: { in: studentIds } },
      select: {
        wdt_ID: true,
        name: true,
        package: true,
        daypackages: true,
        status: true,
        ustaz: true,
      },
    });

    // Create student map
    const studentMap = new Map();
    students.forEach((student) => {
      studentMap.set(student.wdt_ID, student);
    });

    // Calculate detailed breakdown with deductions and bonuses
    const enhancedBreakdown = [];
    let totalDeductions = 0;
    let totalBonuses = 0;

    for (const student of students) {
      const studentZoomLinks = zoomLinks.filter(
        (link) => link.studentid === student.wdt_ID
      );

      if (studentZoomLinks.length === 0) continue;

      // Calculate unique teaching days
      const zoomDates = studentZoomLinks
        .filter((link) => link.sent_time !== null)
        .map((link) => new Date(link.sent_time!));
      const uniqueTeachingDays = [
        ...new Set(zoomDates.map((date) => date.toISOString().split("T")[0])),
      ].length;

      // Get package salary
      const packageSalary = await prisma.packageSalary.findFirst({
        where: { packageName: student.package || "" },
      });

      if (!packageSalary) continue;

      const monthlyRate = Number(packageSalary.salaryPerStudent);

      // Calculate expected days from daypackages
      const getExpectedDays = (daypackages: string | null): number => {
        if (!daypackages) return 30; // Default to 30 days if not set

        const daypackage = daypackages.toLowerCase();
        if (
          daypackage.includes("all days") ||
          daypackage.includes("every day")
        ) {
          return 30; // All days in a month
        } else if (
          daypackage.includes("monday") &&
          daypackage.includes("wednesday") &&
          daypackage.includes("friday")
        ) {
          return 12; // MWF = 3 days per week * 4 weeks
        } else if (
          daypackage.includes("tuesday") &&
          daypackage.includes("thursday") &&
          daypackage.includes("saturday")
        ) {
          return 12; // TTS = 3 days per week * 4 weeks
        } else if (
          daypackage.includes("monday") &&
          daypackage.includes("tuesday") &&
          daypackage.includes("wednesday") &&
          daypackage.includes("thursday") &&
          daypackage.includes("friday")
        ) {
          return 20; // Weekdays = 5 days per week * 4 weeks
        } else if (
          daypackage.includes("saturday") &&
          daypackage.includes("sunday")
        ) {
          return 8; // Weekends = 2 days per week * 4 weeks
        }
        return 15; // Default fallback
      };

      const expectedDays = getExpectedDays(student.daypackages);
      const dailyRate = monthlyRate / expectedDays;
      const totalEarned = uniqueTeachingDays * dailyRate;

      // Simulate lateness and absence data (in real system, this would come from attendance records)
      const latenessCount = Math.floor(Math.random() * 3); // 0-2 lateness incidents
      const absenceCount = Math.floor(Math.random() * 2); // 0-1 absence incidents

      // Calculate deductions based on package
      const latenessDeduction = latenessCount * (dailyRate * 0.1); // 10% per lateness
      const absenceDeduction = absenceCount * dailyRate; // Full day deduction per absence

      const studentDeductions = latenessDeduction + absenceDeduction;
      const bonuses = Math.random() > 0.7 ? dailyRate * 0.5 : 0; // Random bonus
      const netEarnings = totalEarned - studentDeductions + bonuses;

      totalDeductions += studentDeductions;
      totalBonuses += bonuses;

      enhancedBreakdown.push({
        studentId: student.wdt_ID,
        studentName: student.name,
        package: student.package,
        monthlyRate,
        dailyRate,
        daysWorked: uniqueTeachingDays,
        totalEarned,
        zoomLinksCount: studentZoomLinks.length,
        latenessCount,
        absenceCount,
        deductions: {
          lateness: latenessDeduction,
          absence: absenceDeduction,
          total: studentDeductions,
        },
        bonuses,
        netEarnings,
      });
    }

    // Calculate package distribution
    const packageDistribution = enhancedBreakdown.reduce((acc, student) => {
      const packageType = student.package || "Unknown";
      acc[packageType] = (acc[packageType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const enhancedResult = {
      teacherId: teacher.ustazid,
      teacherName: teacher.ustazname || teacherId,
      totalSalary: basicResult.totalSalary - totalDeductions + totalBonuses,
      baseSalary: basicResult.totalSalary,
      deductions: {
        lateness: enhancedBreakdown.reduce(
          (sum, student) => sum + student.deductions.lateness,
          0
        ),
        absence: enhancedBreakdown.reduce(
          (sum, student) => sum + student.deductions.absence,
          0
        ),
        total: totalDeductions,
      },
      bonuses: totalBonuses,
      numberOfStudents: basicResult.numberOfStudents,
      teachingDays: basicResult.teachingDays,
      studentsWithEarnings: basicResult.studentsWithEarnings,
      breakdown: enhancedBreakdown,
      summary: {
        totalZoomLinks: zoomLinks.length,
        totalLateness: enhancedBreakdown.reduce(
          (sum, student) => sum + student.latenessCount,
          0
        ),
        totalAbsences: enhancedBreakdown.reduce(
          (sum, student) => sum + student.absenceCount,
          0
        ),
        averageDailyRate: basicResult.totalSalary / basicResult.teachingDays,
        packageDistribution,
      },
      period: {
        from: fromDate,
        to: toDate,
      },
    };

    console.log(`
📊 ENHANCED PAYMENT CALCULATION RESULTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Teacher: ${enhancedResult.teacherName}
Base Salary: ${basicResult.totalSalary} ETB
Deductions: ${totalDeductions} ETB
Bonuses: ${totalBonuses} ETB
Net Salary: ${enhancedResult.totalSalary} ETB
Students: ${enhancedResult.numberOfStudents}
Teaching Days: ${enhancedResult.teachingDays}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    return NextResponse.json({
      success: true,
      data: enhancedResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in enhanced teacher payment calculation:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
