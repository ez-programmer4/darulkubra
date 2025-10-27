import { prisma } from "@/lib/prisma";
import { parseISO, startOfDay, endOfDay } from "date-fns";
import { format, toZonedTime, fromZonedTime } from "date-fns-tz";
import {
  getTeacherChangePeriods,
  TeacherChangePeriod,
} from "@/lib/teacher-change-utils";

const TZ = "Asia/Riyadh";

export interface SalaryCalculationConfig {
  includeSundays: boolean;
  excusedThreshold: number;
  latenessTiers: Array<{
    start: number;
    end: number;
    percent: number;
  }>;
  packageDeductions: Record<
    string,
    {
      lateness: number;
      absence: number;
    }
  >;
}

export interface TeacherSalaryData {
  id: string;
  teacherId: string;
  name: string;
  teacherName: string;
  baseSalary: number;
  latenessDeduction: number;
  absenceDeduction: number;
  bonuses: number;
  totalSalary: number;
  status: "Paid" | "Unpaid";
  numStudents: number;
  teachingDays: number;
  hasTeacherChanges: boolean;
  breakdown: {
    dailyEarnings: Array<{ date: string; amount: number }>;
    studentBreakdown: Array<{
      studentName: string;
      package: string;
      monthlyRate: number;
      dailyRate: number;
      daysWorked: number;
      totalEarned: number;
      periods?: Array<{
        period: string;
        daysWorked: number;
        dailyRate: number;
        periodEarnings: number;
        teachingDates: string[];
        teacherRole: "old_teacher" | "new_teacher";
        changeDate?: string;
      }>;
      teacherChanges: boolean;
      debugInfo?: any;
      studentInfo?: {
        studentId: number;
        studentStatus: string;
        package: string;
        daypackage: string;
        zoomLinksTotal: number;
        zoomLinkDates: string[];
        isNotSucceed: boolean;
        isCompleted: boolean;
        isLeave: boolean;
        isActive: boolean;
        isNotYet: boolean;
        statusReason: string;
      };
    }>;
    latenessBreakdown: Array<{
      date: string;
      studentName: string;
      scheduledTime: string;
      actualTime: string;
      latenessMinutes: number;
      tier: string;
      deduction: number;
    }>;
    absenceBreakdown: Array<{
      date: string;
      studentId: number;
      studentName: string;
      studentPackage: string;
      reason: string;
      deduction: number;
      permitted: boolean;
      waived: boolean;
    }>;
    summary: {
      workingDaysInMonth: number;
      actualTeachingDays: number;
      averageDailyEarning: number;
      totalDeductions: number;
      netSalary: number;
    };
  };
}

/**
 * IMPROVED SALARY CALCULATOR
 *
 * This version addresses the common issues:
 * 1. Teachers with zoom links but no package salary configuration
 * 2. Students not found due to complex assignment queries
 * 3. Package name mismatches
 * 4. Missing daypackage configurations
 */
export class ImprovedSalaryCalculator {
  private config: SalaryCalculationConfig;
  private cache: Map<string, any> = new Map();

  constructor(config: SalaryCalculationConfig) {
    this.config = config;
  }

  /**
   * Calculate salary for a single teacher with improved error handling
   */
  async calculateTeacherSalary(
    teacherId: string,
    fromDate: Date,
    toDate: Date
  ): Promise<TeacherSalaryData> {
    const cacheKey = `salary_${teacherId}_${fromDate.toISOString()}_${toDate.toISOString()}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      console.log(`
🔍 IMPROVED SALARY CALCULATION START
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Teacher ID: ${teacherId}
Period: ${fromDate.toISOString().split("T")[0]} to ${
        toDate.toISOString().split("T")[0]
      }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);

      // Get teacher info
      const teacher = await this.getTeacherInfo(teacherId);
      if (!teacher) {
        throw new Error(`Teacher not found: ${teacherId}`);
      }

      // Get all students with zoom links from this teacher
      const studentsWithZoomLinks = await this.getStudentsWithZoomLinks(
        teacherId,
        fromDate,
        toDate
      );

      console.log(`
📊 STUDENTS WITH ZOOM LINKS FOUND:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Students: ${studentsWithZoomLinks.length}
${studentsWithZoomLinks
  .map(
    (s, i) => `
${i + 1}. ${s.name} (ID: ${s.wdt_ID})
    Package: ${s.package || "NOT SET"}
    Status: ${s.status}
    Zoom Links: ${s.zoom_links?.length || 0}
`
  )
  .join("")}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);

      // Get package salary configuration
      const packageSalaries = await this.getPackageSalaries();
      console.log(`
💰 PACKAGE SALARY CONFIGURATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Packages: ${packageSalaries.length}
${packageSalaries
  .map(
    (pkg, i) => `
${i + 1}. ${pkg.packageName}: ${pkg.salaryPerStudent} ETB
`
  )
  .join("")}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);

      // Calculate base salary with improved logic
      const baseSalaryData = await this.calculateBaseSalaryImproved(
        studentsWithZoomLinks,
        fromDate,
        toDate,
        packageSalaries,
        teacherId
      );

      // Calculate deductions
      const latenessData = await this.calculateLatenessDeductions(
        teacherId,
        studentsWithZoomLinks,
        fromDate,
        toDate
      );

      const absenceData = await this.calculateAbsenceDeductions(
        teacherId,
        studentsWithZoomLinks,
        fromDate,
        toDate
      );

      // Calculate bonuses
      const bonuses = await this.calculateBonuses(teacherId, fromDate, toDate);

      // Get payment status
      const period = `${fromDate.getFullYear()}-${String(
        fromDate.getMonth() + 1
      ).padStart(2, "0")}`;
      const payment = await prisma.teachersalarypayment.findUnique({
        where: { teacherId_period: { teacherId, period } },
        select: { status: true },
      });

      const result: TeacherSalaryData = {
        id: teacherId,
        teacherId,
        name: teacher.ustazname || "Unknown Teacher",
        teacherName: teacher.ustazname || "Unknown Teacher",
        baseSalary: Number(baseSalaryData.totalSalary.toFixed(2)),
        latenessDeduction: Number(latenessData.totalDeduction.toFixed(2)),
        absenceDeduction: Number(absenceData.totalDeduction.toFixed(2)),
        bonuses: Number(bonuses.toFixed(2)),
        totalSalary: Number(
          (
            baseSalaryData.totalSalary -
            latenessData.totalDeduction -
            absenceData.totalDeduction +
            bonuses
          ).toFixed(2)
        ),
        status: (payment?.status as "Paid" | "Unpaid") || "Unpaid",
        numStudents: baseSalaryData.numStudents,
        teachingDays: baseSalaryData.teachingDays,
        hasTeacherChanges: baseSalaryData.studentBreakdown.some(
          (s) => s.teacherChanges
        ),
        breakdown: {
          dailyEarnings: baseSalaryData.dailyEarnings || [],
          studentBreakdown: baseSalaryData.studentBreakdown || [],
          latenessBreakdown: latenessData.breakdown || [],
          absenceBreakdown: absenceData.breakdown || [],
          summary: {
            workingDaysInMonth: baseSalaryData.workingDays || 0,
            actualTeachingDays: baseSalaryData.teachingDays || 0,
            averageDailyEarning: baseSalaryData.averageDailyEarning || 0,
            totalDeductions:
              latenessData.totalDeduction + absenceData.totalDeduction,
            netSalary: Number(
              (
                baseSalaryData.totalSalary -
                latenessData.totalDeduction -
                absenceData.totalDeduction +
                bonuses
              ).toFixed(2)
            ),
          },
        },
      };

      console.log(`
💰 SALARY CALCULATION COMPLETE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Teacher: ${result.name}
Base Salary: ${result.baseSalary} ETB
Total Salary: ${result.totalSalary} ETB
Teaching Days: ${result.teachingDays}
Students: ${result.numStudents}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error(
        `Error calculating salary for teacher ${teacherId}:`,
        error
      );

      // Return a safe fallback structure
      const fallbackResult: TeacherSalaryData = {
        id: teacherId,
        teacherId,
        name: "Unknown Teacher",
        teacherName: "Unknown Teacher",
        baseSalary: 0,
        latenessDeduction: 0,
        absenceDeduction: 0,
        bonuses: 0,
        totalSalary: 0,
        status: "Unpaid",
        numStudents: 0,
        teachingDays: 0,
        hasTeacherChanges: false,
        breakdown: {
          dailyEarnings: [],
          studentBreakdown: [],
          latenessBreakdown: [],
          absenceBreakdown: [],
          summary: {
            workingDaysInMonth: 0,
            actualTeachingDays: 0,
            averageDailyEarning: 0,
            totalDeductions: 0,
            netSalary: 0,
          },
        },
      };

      return fallbackResult;
    }
  }

  /**
   * Get students with zoom links from this teacher (simplified approach)
   */
  private async getStudentsWithZoomLinks(
    teacherId: string,
    fromDate: Date,
    toDate: Date
  ) {
    // Get all zoom links from this teacher in the period
    const zoomLinks = await prisma.wpos_zoom_links.findMany({
      where: {
        ustazid: teacherId,
        sent_time: { gte: fromDate, lte: toDate },
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

    // Group by student and get unique students
    const studentMap = new Map();

    zoomLinks.forEach((link) => {
      if (link.wpos_wpdatatable_23) {
        const student = link.wpos_wpdatatable_23;
        if (!studentMap.has(student.wdt_ID)) {
          studentMap.set(student.wdt_ID, {
            ...student,
            zoom_links: [],
          });
        }

        // Add zoom link to student
        studentMap.get(student.wdt_ID).zoom_links.push({
          sent_time: link.sent_time,
        });
      }
    });

    return Array.from(studentMap.values());
  }

  /**
   * Get package salaries with improved matching
   */
  private async getPackageSalaries() {
    return await prisma.packageSalary.findMany({
      select: {
        packageName: true,
        salaryPerStudent: true,
      },
    });
  }

  /**
   * Improved base salary calculation
   */
  private async calculateBaseSalaryImproved(
    students: any[],
    fromDate: Date,
    toDate: Date,
    packageSalaries: any[],
    teacherId: string
  ) {
    console.log(`
🔍 CALCULATING BASE SALARY (IMPROVED):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Students to process: ${students.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // Create package salary map with improved matching
    const salaryMap: Record<string, number> = {};
    packageSalaries.forEach((pkg) => {
      // Store with exact name
      salaryMap[pkg.packageName] = Number(pkg.salaryPerStudent);

      // Also store with common variations for better matching
      const variations = [
        pkg.packageName.toLowerCase(),
        pkg.packageName.toUpperCase(),
        pkg.packageName.trim(),
        pkg.packageName.replace(/\s+/g, " ").trim(),
      ];

      variations.forEach((variation) => {
        if (variation !== pkg.packageName) {
          salaryMap[variation] = Number(pkg.salaryPerStudent);
        }
      });
    });

    // Calculate working days
    const workingDays = this.calculateWorkingDays(fromDate, toDate);
    const dailyEarnings = new Map<string, number>();
    const studentBreakdown: any[] = [];

    // Process each student
    for (const student of students) {
      console.log(`
🔍 PROCESSING STUDENT: ${student.name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Package: ${student.package || "NOT SET"}
Status: ${student.status}
Zoom Links: ${student.zoom_links?.length || 0}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);

      // Find package salary with improved matching
      let monthlyPackageSalary = 0;
      let matchedPackageName = "";

      if (student.package) {
        // Try exact match first
        if (salaryMap[student.package]) {
          monthlyPackageSalary = salaryMap[student.package];
          matchedPackageName = student.package;
        } else {
          // Try case-insensitive match
          const lowerPackage = student.package.toLowerCase();
          if (salaryMap[lowerPackage]) {
            monthlyPackageSalary = salaryMap[lowerPackage];
            matchedPackageName = lowerPackage;
          } else {
            // Try trimmed match
            const trimmedPackage = student.package.trim();
            if (salaryMap[trimmedPackage]) {
              monthlyPackageSalary = salaryMap[trimmedPackage];
              matchedPackageName = trimmedPackage;
            } else {
              // Try partial match
              const partialMatch = Object.keys(salaryMap).find(
                (key) =>
                  key.toLowerCase().includes(lowerPackage) ||
                  lowerPackage.includes(key.toLowerCase())
              );
              if (partialMatch) {
                monthlyPackageSalary = salaryMap[partialMatch];
                matchedPackageName = partialMatch;
              }
            }
          }
        }
      }

      // If no package salary found, use a default rate
      if (monthlyPackageSalary === 0) {
        console.log(`
⚠️  NO PACKAGE SALARY FOUND FOR: ${student.package}
Using default rate: 100 ETB per month
        `);
        monthlyPackageSalary = 100; // Default rate
        matchedPackageName = "DEFAULT";
      }

      const dailyRate = Number((monthlyPackageSalary / workingDays).toFixed(2));

      console.log(`
💰 PACKAGE SALARY RESOLVED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Original Package: ${student.package || "NOT SET"}
Matched Package: ${matchedPackageName}
Monthly Salary: ${monthlyPackageSalary} ETB
Daily Rate: ${dailyRate} ETB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);

      // Calculate teaching days from zoom links
      const teachingDates = new Set<string>();
      const dailyLinks = new Map<string, Date>();

      // Process zoom links
      student.zoom_links?.forEach((link: any) => {
        if (link.sent_time) {
          const linkDate = new Date(link.sent_time);

          // Check Sunday inclusion
          const isSunday = linkDate.getDay() === 0;
          const shouldInclude = this.config.includeSundays || !isSunday;

          if (!shouldInclude) {
            return;
          }

          const dateStr = linkDate.toISOString().split("T")[0];

          // Only count one link per day (earliest)
          if (!dailyLinks.has(dateStr) || linkDate < dailyLinks.get(dateStr)!) {
            dailyLinks.set(dateStr, linkDate);
          }
        }
      });

      // Add teaching dates
      dailyLinks.forEach((_, dateStr) => {
        teachingDates.add(dateStr);
      });

      const totalEarned = Number((dailyRate * teachingDates.size).toFixed(2));

      console.log(`
📅 TEACHING DAYS CALCULATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Teaching Dates: ${Array.from(teachingDates).join(", ")}
Total Days: ${teachingDates.size}
Daily Rate: ${dailyRate} ETB
Total Earned: ${totalEarned} ETB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);

      // Add to daily earnings
      teachingDates.forEach((dateStr) => {
        if (!dailyEarnings.has(dateStr)) {
          dailyEarnings.set(dateStr, 0);
        }
        dailyEarnings.set(
          dateStr,
          Number((dailyEarnings.get(dateStr)! + dailyRate).toFixed(2))
        );
      });

      // Add to student breakdown
      if (totalEarned > 0) {
        studentBreakdown.push({
          studentName: student.name || "Unknown",
          package: student.package || "Unknown",
          monthlyRate: monthlyPackageSalary,
          dailyRate: dailyRate,
          daysWorked: teachingDates.size,
          totalEarned: totalEarned,
          periods: [
            {
              period: `${fromDate.toISOString().split("T")[0]} to ${
                toDate.toISOString().split("T")[0]
              }`,
              daysWorked: teachingDates.size,
              dailyRate: dailyRate,
              periodEarnings: totalEarned,
              teachingDates: Array.from(teachingDates),
              teacherRole: "new_teacher" as const,
            },
          ],
          teacherChanges: false,
          studentInfo: {
            studentId: student.wdt_ID,
            studentStatus: student.status,
            package: student.package,
            daypackage: student.daypackages,
            zoomLinksTotal: student.zoom_links?.length || 0,
            zoomLinkDates:
              student.zoom_links?.map(
                (link: any) =>
                  new Date(link.sent_time).toISOString().split("T")[0]
              ) || [],
            isNotSucceed: student.status?.toLowerCase().includes("not succeed"),
            isCompleted: student.status?.toLowerCase().includes("completed"),
            isLeave: student.status?.toLowerCase().includes("leave"),
            isActive: student.status?.toLowerCase().includes("active"),
            isNotYet: student.status?.toLowerCase().includes("not yet"),
            statusReason: "Student with zoom links - teacher should be paid",
          },
        });
      }
    }

    const totalSalary = Number(
      Array.from(dailyEarnings.values())
        .reduce((sum, amount) => sum + amount, 0)
        .toFixed(2)
    );

    const actualTeachingDays = dailyEarnings.size;
    const averageDailyEarning =
      actualTeachingDays > 0
        ? Number((totalSalary / actualTeachingDays).toFixed(2))
        : 0;

    console.log(`
💰 BASE SALARY CALCULATION COMPLETE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Salary: ${totalSalary} ETB
Teaching Days: ${actualTeachingDays}
Students with Earnings: ${studentBreakdown.length}
Average Daily Earning: ${averageDailyEarning} ETB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    return {
      totalSalary,
      teachingDays: actualTeachingDays,
      workingDays,
      averageDailyEarning,
      dailyEarnings: Array.from(dailyEarnings.entries()).map(
        ([date, amount]) => ({
          date,
          amount,
        })
      ),
      studentBreakdown,
      numStudents: studentBreakdown.length,
    };
  }

  private async getTeacherInfo(teacherId: string) {
    return await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
      select: { ustazid: true, ustazname: true },
    });
  }

  private calculateWorkingDays(fromDate: Date, toDate: Date): number {
    let workingDays = 0;
    const current = new Date(fromDate);
    const end = new Date(toDate);

    current.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      const isSunday = dayOfWeek === 0;
      const shouldInclude = this.config.includeSundays || !isSunday;

      if (shouldInclude) {
        workingDays++;
      }

      current.setTime(current.getTime() + 24 * 60 * 60 * 1000);
    }

    return workingDays;
  }

  // Placeholder methods for deductions and bonuses
  private async calculateLatenessDeductions(
    teacherId: string,
    students: any[],
    fromDate: Date,
    toDate: Date
  ) {
    return { totalDeduction: 0, breakdown: [] };
  }

  private async calculateAbsenceDeductions(
    teacherId: string,
    students: any[],
    fromDate: Date,
    toDate: Date
  ) {
    return { totalDeduction: 0, breakdown: [] };
  }

  private async calculateBonuses(
    teacherId: string,
    fromDate: Date,
    toDate: Date
  ) {
    return 0;
  }

  clearCache() {
    this.cache.clear();
  }
}

/**
 * Factory function to create an improved salary calculator
 */
export async function createImprovedSalaryCalculator(): Promise<ImprovedSalaryCalculator> {
  const { getSalaryConfig } = await import("./salary-config");
  const salaryConfig = await getSalaryConfig();

  const config: SalaryCalculationConfig = {
    includeSundays: salaryConfig.includeSundays,
    excusedThreshold: salaryConfig.latenessConfig.excusedThreshold,
    latenessTiers: salaryConfig.latenessConfig.tiers,
    packageDeductions: salaryConfig.packageDeductions,
  };

  return new ImprovedSalaryCalculator(config);
}
