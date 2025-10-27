import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSalaryCalculator } from "@/lib/salary-calculator";

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
🔍 TEACHER SALARY DEBUG ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Teacher ID: ${teacherId}
Period: ${fromDate} to ${toDate}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // 1. Check if teacher exists
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
      select: { ustazid: true, ustazname: true },
    });

    if (!teacher) {
      return NextResponse.json({
        error: "Teacher not found",
        teacherId,
        exists: false,
      });
    }

    // 2. Get all zoom links for this teacher in the period
    const zoomLinks = await prisma.wpos_zoom_links.findMany({
      where: {
        ustazid: teacherId,
        sent_time: { gte: from, lte: to },
      },
      include: {
        wpos_wpdatatable_23: {
          select: {
            wdt_ID: true,
            name: true,
            package: true,
            daypackages: true,
            status: true,
            ustaz: true,
          },
        },
      },
      orderBy: { sent_time: "asc" },
    });

    console.log(`
📊 ZOOM LINKS FOUND:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Zoom Links: ${zoomLinks.length}
${zoomLinks
  .map(
    (link, i) => `
${i + 1}. ${link.wpos_wpdatatable_23?.name || "Unknown Student"}
    Date: ${link.sent_time?.toISOString().split("T")[0]}
    Student ID: ${link.studentid}
    Student Package: ${link.wpos_wpdatatable_23?.package || "NOT SET"}
    Student Status: ${link.wpos_wpdatatable_23?.status || "NOT SET"}
    Current Teacher: ${link.wpos_wpdatatable_23?.ustaz || "NOT SET"}
`
  )
  .join("")}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // 3. Get unique students from zoom links
    const uniqueStudents = new Map();
    zoomLinks.forEach((link) => {
      if (link.wpos_wpdatatable_23) {
        uniqueStudents.set(link.studentid, link.wpos_wpdatatable_23);
      }
    });

    // 4. Check package salary configuration
    const packageSalaries = await prisma.packageSalary.findMany();
    const salaryMap: Record<string, number> = {};
    packageSalaries.forEach((pkg) => {
      salaryMap[pkg.packageName] = Number(pkg.salaryPerStudent);
    });

    console.log(`
💰 PACKAGE SALARY CONFIGURATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Packages Configured: ${packageSalaries.length}
${packageSalaries
  .map(
    (pkg, i) => `
${i + 1}. ${pkg.packageName}: ${pkg.salaryPerStudent} ETB
`
  )
  .join("")}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // 5. Analyze each student's package
    const studentAnalysis = Array.from(uniqueStudents.values()).map(
      (student) => {
        const packageName = student.package;
        const hasPackageSalary = packageName && salaryMap[packageName];
        const packageSalary = hasPackageSalary ? salaryMap[packageName] : 0;

        return {
          studentId: student.wdt_ID,
          studentName: student.name,
          package: packageName,
          hasPackageSalary,
          packageSalary,
          status: student.status,
          daypackages: student.daypackages,
          currentTeacher: student.ustaz,
          zoomLinksCount: zoomLinks.filter(
            (link) => link.studentid === student.wdt_ID
          ).length,
        };
      }
    );

    console.log(`
👥 STUDENT PACKAGE ANALYSIS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${studentAnalysis
  .map(
    (student, i) => `
${i + 1}. ${student.studentName} (ID: ${student.studentId})
    Package: ${student.package || "NOT SET"} ${
      !student.hasPackageSalary ? "❌ NO SALARY CONFIG" : "✅"
    }
    Package Salary: ${student.packageSalary} ETB
    Status: ${student.status}
    Day Package: ${student.daypackages || "NOT SET"}
    Current Teacher: ${student.currentTeacher || "NOT SET"}
    Zoom Links: ${student.zoomLinksCount}
`
  )
  .join("")}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // 6. Check occupied times
    const occupiedTimes = await prisma.wpos_ustaz_occupied_times.findMany({
      where: {
        ustaz_id: teacherId,
        occupied_at: { lte: to },
        OR: [{ end_at: null }, { end_at: { gte: from } }],
      },
      include: {
        student: {
          select: {
            wdt_ID: true,
            name: true,
            package: true,
            daypackages: true,
            status: true,
          },
        },
      },
    });

    console.log(`
📅 OCCUPIED TIMES RECORDS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Occupied Times: ${occupiedTimes.length}
${occupiedTimes
  .map(
    (ot, i) => `
${i + 1}. Student: ${ot.student?.name || "Unknown"} (ID: ${ot.student_id})
    Package: ${ot.student?.package || "NOT SET"}
    Day Package: ${ot.daypackage || "NOT SET"}
    Period: ${ot.occupied_at?.toISOString().split("T")[0]} to ${
      ot.end_at?.toISOString().split("T")[0] || "Ongoing"
    }
    Time Slot: ${ot.time_slot || "NOT SET"}
`
  )
  .join("")}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // 7. Run actual salary calculation
    const calculator = await createSalaryCalculator();
    const salaryData = await calculator.calculateTeacherSalary(
      teacherId,
      from,
      to
    );

    console.log(`
💰 SALARY CALCULATION RESULT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Teacher: ${salaryData.name}
Base Salary: ${salaryData.baseSalary} ETB
Total Salary: ${salaryData.totalSalary} ETB
Teaching Days: ${salaryData.teachingDays}
Number of Students: ${salaryData.numStudents}
Students with Earnings: ${salaryData.breakdown.studentBreakdown.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // 8. Identify issues
    const issues = [];

    if (salaryData.totalSalary === 0) {
      issues.push("❌ Total salary is 0");
    }

    if (salaryData.numStudents === 0) {
      issues.push("❌ No students found for salary calculation");
    }

    const studentsWithoutPackageSalary = studentAnalysis.filter(
      (s) => !s.hasPackageSalary
    );
    if (studentsWithoutPackageSalary.length > 0) {
      issues.push(
        `❌ ${studentsWithoutPackageSalary.length} students have packages without salary configuration`
      );
    }

    const studentsWithWrongTeacher = studentAnalysis.filter(
      (s) => s.currentTeacher !== teacherId
    );
    if (studentsWithWrongTeacher.length > 0) {
      issues.push(
        `⚠️ ${studentsWithWrongTeacher.length} students are assigned to different teachers`
      );
    }

    const studentsWithoutDayPackage = studentAnalysis.filter(
      (s) => !s.daypackages
    );
    if (studentsWithoutDayPackage.length > 0) {
      issues.push(
        `⚠️ ${studentsWithoutDayPackage.length} students don't have daypackage configured`
      );
    }

    return NextResponse.json({
      teacher: {
        id: teacher.ustazid,
        name: teacher.ustazname,
        exists: true,
      },
      zoomLinks: {
        total: zoomLinks.length,
        details: zoomLinks.map((link) => ({
          date: link.sent_time?.toISOString().split("T")[0],
          studentId: link.studentid,
          studentName: link.wpos_wpdatatable_23?.name,
          studentPackage: link.wpos_wpdatatable_23?.package,
        })),
      },
      students: {
        total: uniqueStudents.size,
        analysis: studentAnalysis,
      },
      packageSalaries: {
        total: packageSalaries.length,
        configured: packageSalaries.map((pkg) => ({
          name: pkg.packageName,
          salary: pkg.salaryPerStudent,
        })),
      },
      occupiedTimes: {
        total: occupiedTimes.length,
        details: occupiedTimes.map((ot) => ({
          studentId: ot.student_id,
          studentName: ot.student?.name,
          package: ot.student?.package,
          daypackage: ot.daypackage,
          period: {
            start: ot.occupied_at?.toISOString().split("T")[0],
            end: ot.end_at?.toISOString().split("T")[0],
          },
        })),
      },
      salaryCalculation: {
        baseSalary: salaryData.baseSalary,
        totalSalary: salaryData.totalSalary,
        teachingDays: salaryData.teachingDays,
        numStudents: salaryData.numStudents,
        studentsWithEarnings: salaryData.breakdown.studentBreakdown.length,
        studentBreakdown: salaryData.breakdown.studentBreakdown.map((s) => ({
          studentName: s.studentName,
          package: s.package,
          monthlyRate: s.monthlyRate,
          dailyRate: s.dailyRate,
          daysWorked: s.daysWorked,
          totalEarned: s.totalEarned,
        })),
      },
      issues,
      recommendations: [
        studentsWithoutPackageSalary.length > 0
          ? `Configure salary for packages: ${studentsWithoutPackageSalary
              .map((s) => s.package)
              .filter(Boolean)
              .join(", ")}`
          : null,
        studentsWithWrongTeacher.length > 0
          ? `Check teacher assignments for students: ${studentsWithWrongTeacher
              .map((s) => s.studentName)
              .join(", ")}`
          : null,
        studentsWithoutDayPackage.length > 0
          ? `Configure daypackage for students: ${studentsWithoutDayPackage
              .map((s) => s.studentName)
              .join(", ")}`
          : null,
      ].filter(Boolean),
    });
  } catch (error) {
    console.error("Error in teacher salary debug:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
