import { NextRequest, NextResponse } from "next/server";
import { SalaryCalculator } from "@/lib/salary-calculator";
import { ImprovedSalaryCalculator } from "@/lib/salary-calculator-improved";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: "Missing required parameters: fromDate, toDate" },
        { status: 400 }
      );
    }

    console.log(`
🔍 COMPREHENSIVE SALARY CALCULATOR COMPARISON:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
From Date: ${fromDate}
To Date: ${toDate}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // Get all teachers from the database - include ALL teachers regardless of ustazid
    const teachers = await prisma.wpos_wpdatatable_24.findMany({
      select: {
        ustazid: true,
        ustazname: true,
      },
      orderBy: { ustazid: "asc" },
    });

    // Also get teachers who might be found through zoom links but not in main table
    const zoomLinkTeachers = await prisma.wpos_zoom_links.findMany({
      where: {
        sent_time: {
          gte: new Date(fromDate),
          lte: new Date(toDate),
        },
      },
      select: {
        ustazid: true,
      },
      distinct: ["ustazid"],
    });

    // Create a comprehensive list of all unique teachers
    const allTeacherIds = new Set<string>();

    // Add teachers from main table
    teachers.forEach((teacher) => {
      if (teacher.ustazid && teacher.ustazid.trim() !== "") {
        allTeacherIds.add(teacher.ustazid);
      }
    });

    // Add teachers from zoom links
    zoomLinkTeachers.forEach((zoomTeacher) => {
      if (zoomTeacher.ustazid && zoomTeacher.ustazid.trim() !== "") {
        allTeacherIds.add(zoomTeacher.ustazid);
      }
    });

    // Create final teacher list with names
    const finalTeachers = Array.from(allTeacherIds).map((teacherId) => {
      const mainTeacher = teachers.find((t) => t.ustazid === teacherId);
      return {
        ustazid: teacherId,
        ustazname: mainTeacher?.ustazname || `Teacher ${teacherId}`,
      };
    });

    console.log(`📊 Found ${teachers.length} teachers in main table`);
    console.log(
      `📊 Found ${zoomLinkTeachers.length} unique teachers in zoom links`
    );
    console.log(`📊 Total unique teachers to analyze: ${finalTeachers.length}`);

    // Default config for calculators
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

    const oldCalculator = new SalaryCalculator(defaultConfig);
    const improvedCalculator = new ImprovedSalaryCalculator(defaultConfig);

    // Process teachers in batches to avoid overwhelming the system
    const batchSize = 10;
    const results = [];
    let processedCount = 0;

    for (let i = 0; i < finalTeachers.length; i += batchSize) {
      const batch = finalTeachers.slice(i, i + batchSize);

      console.log(
        `🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          finalTeachers.length / batchSize
        )} (${batch.length} teachers)...`
      );

      const batchPromises = batch.map(async (teacher) => {
        try {
          const teacherId = teacher.ustazid;
          if (!teacherId || teacherId.trim() === "") {
            console.log(
              `⚠️ Skipping teacher with empty ustazid: ${teacher.ustazname}`
            );
            return null;
          }

          // Test both calculators
          const oldResult = await oldCalculator.calculateTeacherSalary(
            teacherId,
            new Date(fromDate),
            new Date(toDate)
          );

          const improvedResult =
            await improvedCalculator.calculateTeacherSalaryImproved(
              teacherId,
              new Date(fromDate),
              new Date(toDate)
            );

          // Calculate differences
          const salaryDifference =
            improvedResult.totalSalary - oldResult.totalSalary;
          const studentDifference =
            improvedResult.numberOfStudents - oldResult.numStudents;
          const teachingDaysDifference =
            improvedResult.teachingDays - oldResult.teachingDays;

          return {
            teacherId,
            teacherName: teacher.ustazname || teacherId,
            oldSalary: oldResult.totalSalary,
            newSalary: improvedResult.totalSalary,
            salaryDifference,
            oldStudents: oldResult.numStudents,
            newStudents: improvedResult.numberOfStudents,
            studentDifference,
            oldTeachingDays: oldResult.teachingDays,
            newTeachingDays: improvedResult.teachingDays,
            teachingDaysDifference,
            percentageIncrease:
              oldResult.totalSalary > 0
                ? ((salaryDifference / oldResult.totalSalary) * 100).toFixed(2)
                : salaryDifference > 0
                ? "∞"
                : "0",
            impact:
              salaryDifference > 0
                ? "POSITIVE"
                : salaryDifference < 0
                ? "NEGATIVE"
                : "NO CHANGE",
            hasZoomLinks: improvedResult.numberOfStudents > 0,
            error: null,
          };
        } catch (error) {
          console.error(
            `❌ Error processing teacher ${teacher.ustazid}:`,
            error
          );
          return {
            teacherId: teacher.ustazid,
            teacherName: teacher.ustazname || teacher.ustazid,
            oldSalary: 0,
            newSalary: 0,
            salaryDifference: 0,
            oldStudents: 0,
            newStudents: 0,
            studentDifference: 0,
            oldTeachingDays: 0,
            newTeachingDays: 0,
            teachingDaysDifference: 0,
            percentageIncrease: "0",
            impact: "ERROR",
            hasZoomLinks: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter((result) => result !== null));

      processedCount += batch.length;
      console.log(
        `✅ Processed ${processedCount}/${finalTeachers.length} teachers`
      );
    }

    // Calculate summary statistics
    const validResults = results.filter((r) => r.error === null);
    const teachersWithSalaryIncrease = validResults.filter(
      (r) => r.salaryDifference > 0
    );
    const teachersWithNoChange = validResults.filter(
      (r) => r.salaryDifference === 0
    );
    const teachersWithSalaryDecrease = validResults.filter(
      (r) => r.salaryDifference < 0
    );
    const teachersWithErrors = results.filter((r) => r.error !== null);

    const totalOldSalary = validResults.reduce(
      (sum, r) => sum + r.oldSalary,
      0
    );
    const totalNewSalary = validResults.reduce(
      (sum, r) => sum + r.newSalary,
      0
    );
    const totalSalaryDifference = totalNewSalary - totalOldSalary;
    const totalOldStudents = validResults.reduce(
      (sum, r) => sum + r.oldStudents,
      0
    );
    const totalNewStudents = validResults.reduce(
      (sum, r) => sum + r.newStudents,
      0
    );
    const totalStudentDifference = totalNewStudents - totalOldStudents;
    const totalOldTeachingDays = validResults.reduce(
      (sum, r) => sum + r.oldTeachingDays,
      0
    );
    const totalNewTeachingDays = validResults.reduce(
      (sum, r) => sum + r.newTeachingDays,
      0
    );
    const totalTeachingDaysDifference =
      totalNewTeachingDays - totalOldTeachingDays;

    const summary = {
      totalTeachers: finalTeachers.length,
      processedTeachers: results.length,
      teachersWithErrors: teachersWithErrors.length,
      teachersWithSalaryIncrease: teachersWithSalaryIncrease.length,
      teachersWithNoChange: teachersWithNoChange.length,
      teachersWithSalaryDecrease: teachersWithSalaryDecrease.length,
      totalOldSalary,
      totalNewSalary,
      totalSalaryDifference,
      totalOldStudents,
      totalNewStudents,
      totalStudentDifference,
      totalOldTeachingDays,
      totalNewTeachingDays,
      totalTeachingDaysDifference,
      averageOldSalary:
        validResults.length > 0 ? totalOldSalary / validResults.length : 0,
      averageNewSalary:
        validResults.length > 0 ? totalNewSalary / validResults.length : 0,
      averageSalaryIncrease:
        validResults.length > 0
          ? totalSalaryDifference / validResults.length
          : 0,
      percentageIncrease:
        totalOldSalary > 0
          ? ((totalSalaryDifference / totalOldSalary) * 100).toFixed(2)
          : "N/A",
    };

    // Sort results by salary difference (highest impact first)
    const sortedResults = results.sort(
      (a, b) => b.salaryDifference - a.salaryDifference
    );

    console.log(`
📊 COMPREHENSIVE COMPARISON RESULTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Teachers: ${summary.totalTeachers}
Teachers with Salary Increase: ${summary.teachersWithSalaryIncrease}
Teachers with No Change: ${summary.teachersWithNoChange}
Teachers with Salary Decrease: ${summary.teachersWithSalaryDecrease}
Teachers with Errors: ${summary.teachersWithErrors}

TOTAL SALARY IMPACT:
Old Total Salary: ${totalOldSalary.toFixed(2)} ETB
New Total Salary: ${totalNewSalary.toFixed(2)} ETB
Total Difference: ${totalSalaryDifference.toFixed(2)} ETB (${
      summary.percentageIncrease
    }%)

STUDENT IMPACT:
Old Total Students: ${totalOldStudents}
New Total Students: ${totalNewStudents}
Students Gained: ${totalStudentDifference}

TEACHING DAYS IMPACT:
Old Total Teaching Days: ${totalOldTeachingDays}
New Total Teaching Days: ${totalNewTeachingDays}
Teaching Days Gained: ${totalTeachingDaysDifference}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    return NextResponse.json({
      success: true,
      data: {
        summary,
        results: sortedResults,
        period: {
          from: fromDate,
          to: toDate,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "Error in comprehensive salary calculator comparison:",
      error
    );
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
