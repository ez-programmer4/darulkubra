import { prisma } from "@/lib/prisma";
import { SalaryCalculator, SalaryCalculationConfig } from "./salary-calculator";

export class ImprovedSalaryCalculator extends SalaryCalculator {
  constructor(config?: SalaryCalculationConfig) {
    // Provide default config if none provided
    const defaultConfig: SalaryCalculationConfig = {
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

    super(config || defaultConfig);
  }
  /**
   * Enhanced getTeacherStudents method that prioritizes zoom links as the source of truth
   * This ensures teachers get paid for all students they actually taught, regardless of
   * current assignments or teacher changes
   */
  async getTeacherStudentsImproved(
    teacherId: string,
    fromDate: Date,
    toDate: Date
  ) {
    console.log(`
🔍 IMPROVED TEACHER STUDENTS QUERY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Teacher ID: ${teacherId}
Period: ${fromDate.toISOString().split("T")[0]} to ${
      toDate.toISOString().split("T")[0]
    }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // STEP 1: Get ALL students who have zoom links from this teacher in the period
    // This is the PRIMARY source of truth - if teacher sent zoom links, they taught the student
    const zoomLinkStudents = await prisma.wpos_zoom_links.findMany({
      where: {
        ustazid: teacherId,
        sent_time: { gte: fromDate, lte: toDate },
      },
      select: {
        studentid: true,
        sent_time: true,
        wpos_wpdatatable_23: {
          select: {
            wdt_ID: true,
            name: true,
            package: true,
            daypackages: true,
            status: true,
            ustaz: true, // Current assignment (for reference)
          },
        },
      },
      orderBy: { sent_time: "asc" },
    });

    console.log(`
📊 ZOOM LINK STUDENTS FOUND:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Zoom Links: ${zoomLinkStudents.length}
Unique Students: ${new Set(zoomLinkStudents.map((z) => z.studentid)).size}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // STEP 2: Group by student and get comprehensive student data
    const studentMap = new Map();
    const studentIds = [...new Set(zoomLinkStudents.map((z) => z.studentid))];

    // Get full student data for all students with zoom links
    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        wdt_ID: { in: studentIds },
      },
      select: {
        wdt_ID: true,
        name: true,
        package: true,
        daypackages: true,
        status: true,
        ustaz: true,
        occupiedTimes: {
          where: {
            ustaz_id: teacherId,
            occupied_at: { lte: toDate },
            OR: [{ end_at: null }, { end_at: { gte: fromDate } }],
          },
          select: {
            time_slot: true,
            daypackage: true,
            occupied_at: true,
            end_at: true,
          },
        },
      },
    });

    // STEP 3: Combine student data with zoom links
    const enrichedStudents = students.map((student) => {
      const studentZoomLinks = zoomLinkStudents.filter(
        (z) => z.studentid === student.wdt_ID
      );

      return {
        ...student,
        zoom_links: studentZoomLinks.map((z) => ({ sent_time: z.sent_time })),
        zoom_link_count: studentZoomLinks.length,
        first_zoom_date: studentZoomLinks[0]?.sent_time,
        last_zoom_date:
          studentZoomLinks[studentZoomLinks.length - 1]?.sent_time,
        // Flag to indicate this student was found via zoom links
        found_via_zoom_links: true,
        // Current assignment vs actual teaching
        assignment_mismatch: student.ustaz !== teacherId,
      };
    });

    console.log(`
📋 ENRICHED STUDENTS SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Students: ${enrichedStudents.length}
Students with Assignment Mismatch: ${
      enrichedStudents.filter((s) => s.assignment_mismatch).length
    }
Students by Status:
${Object.entries(
  enrichedStudents.reduce((acc, s) => {
    const status = s.status || "Unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>)
)
  .map(([status, count]) => `  ${status}: ${count}`)
  .join("\n")}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    return enrichedStudents;
  }

  /**
   * Enhanced salary calculation that pays teachers based on actual teaching activity
   */
  async calculateTeacherSalaryImproved(
    teacherId: string,
    fromDate: Date,
    toDate: Date
  ) {
    console.log(`
💰 IMPROVED SALARY CALCULATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Teacher ID: ${teacherId}
Period: ${fromDate.toISOString().split("T")[0]} to ${
      toDate.toISOString().split("T")[0]
    }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // Get teacher info
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
      select: { ustazid: true, ustazname: true },
    });

    if (!teacher) {
      console.log(`❌ Teacher ${teacherId} not found`);
      return {
        teacherId,
        teacherName: "Unknown Teacher",
        baseSalary: 0,
        totalSalary: 0,
        teachingDays: 0,
        numberOfStudents: 0,
        studentsWithEarnings: 0,
        breakdown: [],
        issues: ["Teacher not found in database"],
        recommendations: ["Check teacher ID"],
      };
    }

    // Get students using improved method
    const students = await this.getTeacherStudentsImproved(
      teacherId,
      fromDate,
      toDate
    );

    if (students.length === 0) {
      console.log(`❌ No students found for teacher ${teacherId}`);
      return {
        teacherId,
        teacherName: teacher.ustazname,
        baseSalary: 0,
        totalSalary: 0,
        teachingDays: 0,
        numberOfStudents: 0,
        studentsWithEarnings: 0,
        breakdown: [],
        issues: ["No students found for salary calculation"],
        recommendations: ["Check if teacher sent zoom links in this period"],
      };
    }

    // Calculate salary using zoom links as primary source
    const salaryResult = await this.calculateSalaryFromZoomLinks(
      students,
      fromDate,
      toDate,
      teacherId
    );

    console.log(`
💰 SALARY CALCULATION RESULT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Teacher: ${teacher.ustazname}
Base Salary: ${salaryResult.baseSalary} ETB
Total Salary: ${salaryResult.totalSalary} ETB
Teaching Days: ${salaryResult.teachingDays}
Number of Students: ${salaryResult.numberOfStudents}
Students with Earnings: ${salaryResult.studentsWithEarnings}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    return {
      teacherId,
      teacherName: teacher.ustazname,
      ...salaryResult,
    };
  }

  /**
   * Calculate salary based on zoom links - the most reliable indicator of teaching
   */
  private async calculateSalaryFromZoomLinks(
    students: any[],
    fromDate: Date,
    toDate: Date,
    teacherId: string
  ) {
    // Get package salaries
    const packageSalaries = await prisma.packageSalary.findMany();
    const salaryMap: Record<string, number> = {};
    packageSalaries.forEach((pkg) => {
      salaryMap[pkg.packageName] = Number(pkg.salaryPerStudent);
    });

    const workingDays = this.calculateWorkingDaysImproved(fromDate, toDate);
    let totalSalary = 0;
    let totalTeachingDays = 0;
    let studentsWithEarnings = 0;
    const breakdown: any[] = [];

    for (const student of students) {
      const packageName = student.package;
      const monthlyPackageSalary =
        packageName && salaryMap[packageName]
          ? Number(salaryMap[packageName])
          : 0;

      if (monthlyPackageSalary === 0) {
        console.log(
          `⚠️ No package salary configured for package: ${packageName}`
        );
        breakdown.push({
          studentName: student.name,
          package: packageName,
          monthlyRate: 0,
          dailyRate: 0,
          daysWorked: 0,
          totalEarned: 0,
          reason: "No package salary configured",
        });
        continue;
      }

      // Calculate daily rate based on package
      const dailyRate = Number((monthlyPackageSalary / workingDays).toFixed(2));

      // Calculate days worked based on zoom links
      const zoomDates = student.zoom_links
        .filter((link: any) => link.sent_time)
        .map((link: any) => new Date(link.sent_time!))
        .sort((a: Date, b: Date) => a.getTime() - b.getTime());

      // Count unique teaching days
      const uniqueTeachingDays = new Set(
        zoomDates.map((date: Date) => date.toISOString().split("T")[0])
      ).size;

      const studentEarnings = Number(
        (dailyRate * uniqueTeachingDays).toFixed(2)
      );
      totalSalary += studentEarnings;
      totalTeachingDays += uniqueTeachingDays;
      studentsWithEarnings++;

      breakdown.push({
        studentName: student.name,
        package: packageName,
        monthlyRate: monthlyPackageSalary,
        dailyRate: dailyRate,
        daysWorked: uniqueTeachingDays,
        totalEarned: studentEarnings,
        zoomLinksCount: student.zoom_links.length,
        assignmentMismatch: student.assignment_mismatch,
        studentStatus: student.status,
        firstZoomDate: student.first_zoom_date?.toISOString().split("T")[0],
        lastZoomDate: student.last_zoom_date?.toISOString().split("T")[0],
      });

      console.log(`
📊 STUDENT BREAKDOWN:
Student: ${student.name}
Package: ${packageName} (${monthlyPackageSalary} ETB/month)
Daily Rate: ${dailyRate} ETB
Teaching Days: ${uniqueTeachingDays}
Earnings: ${studentEarnings} ETB
Zoom Links: ${student.zoom_links.length}
Assignment Mismatch: ${student.assignment_mismatch ? "Yes" : "No"}
      `);
    }

    return {
      baseSalary: totalSalary,
      totalSalary: totalSalary,
      teachingDays: totalTeachingDays,
      numberOfStudents: students.length,
      studentsWithEarnings: studentsWithEarnings,
      breakdown: breakdown,
    };
  }

  /**
   * Calculate working days between two dates (respecting Sunday inclusion/exclusion)
   */
  private calculateWorkingDaysImproved(fromDate: Date, toDate: Date): number {
    let workingDays = 0;
    const currentDate = new Date(fromDate);

    while (currentDate <= toDate) {
      // If includeSundays is false, skip Sundays (day 0)
      if (this.config.includeSundays || currentDate.getDay() !== 0) {
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingDays;
  }
}
