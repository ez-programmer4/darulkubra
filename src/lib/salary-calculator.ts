import { prisma } from "@/lib/prisma";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";

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
  teacherId: string;
  teacherName: string;
  baseSalary: number;
  latenessDeduction: number;
  absenceDeduction: number;
  bonuses: number;
  totalSalary: number;
  status: "Paid" | "Unpaid";
  numStudents: number;
  teachingDays: number;
  breakdown: {
    dailyEarnings: Array<{ date: string; amount: number }>;
    studentBreakdown: Array<{
      studentName: string;
      package: string;
      monthlyRate: number;
      dailyRate: number;
      daysWorked: number;
      totalEarned: number;
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

export class SalaryCalculator {
  private config: SalaryCalculationConfig;
  private cache: Map<string, any> = new Map();

  constructor(config: SalaryCalculationConfig) {
    this.config = config;
  }

  /**
   * Calculate salary for a single teacher
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
      // Get teacher info
      const teacher = await this.getTeacherInfo(teacherId);
      if (!teacher) {
        throw new Error(`Teacher not found: ${teacherId}`);
      }

      // Get assignments (active + historical)
      const assignments = await this.getTeacherAssignments(
        teacherId,
        fromDate,
        toDate
      );

      // Get current students with their packages
      const students = await this.getTeacherStudents(
        teacherId,
        fromDate,
        toDate
      );

      // Calculate base salary
      const baseSalaryData = await this.calculateBaseSalary(
        students,
        fromDate,
        toDate
      );

      // Calculate deductions
      const latenessData = await this.calculateLatenessDeductions(
        teacherId,
        assignments,
        fromDate,
        toDate
      );

      const absenceData = await this.calculateAbsenceDeductions(
        teacherId,
        assignments,
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
        teacherId,
        teacherName: teacher.ustazname || "Unknown Teacher",
        baseSalary: Math.round(baseSalaryData.totalSalary),
        latenessDeduction: Math.round(latenessData.totalDeduction),
        absenceDeduction: Math.round(absenceData.totalDeduction),
        bonuses: Math.round(bonuses),
        totalSalary: Math.round(
          baseSalaryData.totalSalary -
            latenessData.totalDeduction -
            absenceData.totalDeduction +
            bonuses
        ),
        status: (payment?.status as "Paid" | "Unpaid") || "Unpaid",
        numStudents: students.length,
        teachingDays: baseSalaryData.teachingDays,
        breakdown: {
          dailyEarnings: baseSalaryData.dailyEarnings,
          studentBreakdown: baseSalaryData.studentBreakdown,
          latenessBreakdown: latenessData.breakdown,
          absenceBreakdown: absenceData.breakdown,
          summary: {
            workingDaysInMonth: baseSalaryData.workingDays,
            actualTeachingDays: baseSalaryData.teachingDays,
            averageDailyEarning: baseSalaryData.averageDailyEarning,
            totalDeductions:
              latenessData.totalDeduction + absenceData.totalDeduction,
            netSalary: Math.round(
              baseSalaryData.totalSalary -
                latenessData.totalDeduction -
                absenceData.totalDeduction +
                bonuses
            ),
          },
        },
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error(
        `Error calculating salary for teacher ${teacherId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Calculate salaries for all teachers
   */
  async calculateAllTeacherSalaries(
    fromDate: Date,
    toDate: Date
  ): Promise<TeacherSalaryData[]> {
    const teachers = await prisma.wpos_wpdatatable_24.findMany({
      select: { ustazid: true, ustazname: true },
    });

    const results = await Promise.all(
      teachers.map(async (teacher) => {
        try {
          return await this.calculateTeacherSalary(
            teacher.ustazid,
            fromDate,
            toDate
          );
        } catch (error) {
          console.error(
            `Failed to calculate salary for ${teacher.ustazname}:`,
            error
          );
          return null;
        }
      })
    );

    return results.filter(Boolean) as TeacherSalaryData[];
  }

  /**
   * Get detailed breakdown for a specific teacher
   */
  async getTeacherSalaryDetails(
    teacherId: string,
    fromDate: Date,
    toDate: Date
  ): Promise<{
    latenessRecords: any[];
    absenceRecords: any[];
    bonusRecords: any[];
    unmatchedZoomLinks?: any[];
  }> {
    const assignments = await this.getTeacherAssignments(
      teacherId,
      fromDate,
      toDate
    );

    // Calculate lateness records
    const latenessRecords = await this.calculateDetailedLatenessRecords(
      teacherId,
      assignments,
      fromDate,
      toDate
    );

    // Calculate absence records
    const absenceRecords = await this.calculateDetailedAbsenceRecords(
      teacherId,
      assignments,
      fromDate,
      toDate
    );

    // Get bonus records
    const bonusRecords = await prisma.bonusrecord.findMany({
      where: {
        teacherId,
        createdAt: { gte: fromDate, lte: toDate },
      },
      orderBy: { createdAt: "asc" },
    });

    // Get unmatched zoom links
    const unmatchedZoomLinks = await this.getUnmatchedZoomLinks(
      teacherId,
      fromDate,
      toDate
    );

    return {
      latenessRecords,
      absenceRecords,
      bonusRecords,
      unmatchedZoomLinks:
        unmatchedZoomLinks.length > 0 ? unmatchedZoomLinks : undefined,
    };
  }

  private async getTeacherInfo(teacherId: string) {
    return await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
      select: { ustazid: true, ustazname: true },
    });
  }

  private async getTeacherAssignments(
    teacherId: string,
    fromDate: Date,
    toDate: Date
  ) {
    // Get active assignments
    const activeAssignments = await prisma.wpos_ustaz_occupied_times.findMany({
      where: {
        ustaz_id: teacherId,
        occupied_at: { lte: toDate },
        OR: [{ end_at: null }, { end_at: { gte: fromDate } }],
      },
      include: {
        student: {
          select: { wdt_ID: true, name: true, package: true },
        },
      },
    });

    // Get historical assignments from audit log
    const auditLogs = await prisma.auditlog.findMany({
      where: {
        actionType: "assignment_update",
        createdAt: { gte: fromDate, lte: toDate },
      },
      select: {
        targetId: true,
        details: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const historicalAssignments = auditLogs
      .map((log) => {
        try {
          const details = JSON.parse(log.details);
          if (details.oldTeacher === teacherId && log.targetId) {
            return {
              student_id: log.targetId,
              ustaz_id: String(details.oldTeacher || ""),
              time_slot: String(details.oldTime || "09:00 AM"),
              daypackage: String(details.newDayPackage || "MWF"),
              occupied_at: new Date(details.occupied_at || log.createdAt),
              end_at: log.createdAt,
            };
          }
          return null;
        } catch (e) {
          console.warn(`Failed to parse audit log details:`, e);
          return null;
        }
      })
      .filter((a): a is NonNullable<typeof a> => a !== null);

    // Get student details for historical assignments
    const historicalStudentIds = [
      ...new Set(historicalAssignments.map((a) => a.student_id)),
    ];
    const historicalStudents = await prisma.wpos_wpdatatable_23.findMany({
      where: { wdt_ID: { in: historicalStudentIds } },
      select: { wdt_ID: true, name: true, package: true },
    });

    historicalAssignments.forEach((assignment) => {
      const student = historicalStudents.find(
        (s) => s.wdt_ID === assignment.student_id
      );
      if (student && student.name && student.package) {
        (assignment as any).student = {
          wdt_ID: student.wdt_ID,
          name: student.name,
          package: student.package,
        };
      }
    });

    return [
      ...activeAssignments,
      ...historicalAssignments.filter((a) => (a as any).student),
    ];
  }

  private async getTeacherStudents(
    teacherId: string,
    fromDate: Date,
    toDate: Date
  ) {
    return await prisma.wpos_wpdatatable_23.findMany({
      where: {
        ustaz: teacherId,
        status: { in: ["active", "Active"] },
      },
      select: {
        wdt_ID: true,
        name: true,
        package: true,
        zoom_links: {
          where: {
            sent_time: { gte: fromDate, lte: toDate },
          },
          select: { sent_time: true },
        },
      },
    });
  }

  private async calculateBaseSalary(
    students: any[],
    fromDate: Date,
    toDate: Date
  ) {
    const packageSalaries = await prisma.packageSalary.findMany();
    const salaryMap: Record<string, number> = {};
    packageSalaries.forEach((pkg) => {
      salaryMap[pkg.packageName] = Number(pkg.salaryPerStudent);
    });

    // Calculate working days
    let workingDays = 0;
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      if (!this.config.includeSundays && d.getDay() === 0) continue;
      workingDays++;
    }

    const dailyEarnings = new Map<string, number>();
    const studentBreakdown = [];

    for (const student of students) {
      if (!student.package || !salaryMap[student.package]) continue;

      const monthlyPackageSalary = Math.round(salaryMap[student.package] || 0);
      const dailyRate = Math.round(monthlyPackageSalary / workingDays);

      // Count actual teaching days for this student
      const teachingDates = new Set<string>();
      const dailyLinks = new Map<string, Date>();

      student.zoom_links.forEach((link: any) => {
        if (link.sent_time) {
          const linkDate = new Date(link.sent_time);
          if (!this.config.includeSundays && linkDate.getDay() === 0) return;

          const dateStr = link.sent_time.toISOString().split("T")[0];

          if (
            !dailyLinks.has(dateStr) ||
            link.sent_time < dailyLinks.get(dateStr)!
          ) {
            dailyLinks.set(dateStr, link.sent_time);
          }
        }
      });

      dailyLinks.forEach((_, dateStr) => {
        teachingDates.add(dateStr);
      });

      // Add to daily earnings
      teachingDates.forEach((dateStr) => {
        if (!dailyEarnings.has(dateStr)) {
          dailyEarnings.set(dateStr, 0);
        }
        dailyEarnings.set(dateStr, dailyEarnings.get(dateStr)! + dailyRate);
      });

      if (teachingDates.size > 0) {
        studentBreakdown.push({
          studentName: student.name || "Unknown",
          package: student.package || "Unknown",
          monthlyRate: monthlyPackageSalary,
          dailyRate: dailyRate,
          daysWorked: teachingDates.size,
          totalEarned: dailyRate * teachingDates.size,
        });
      }
    }

    const totalSalary = Array.from(dailyEarnings.values()).reduce(
      (sum, amount) => sum + amount,
      0
    );
    const averageDailyEarning =
      studentBreakdown.length > 0
        ? Math.round(totalSalary / studentBreakdown.length)
        : 0;

    return {
      totalSalary,
      teachingDays: studentBreakdown.length,
      workingDays,
      averageDailyEarning,
      dailyEarnings: Array.from(dailyEarnings.entries()).map(
        ([date, amount]) => ({
          date,
          amount,
        })
      ),
      studentBreakdown,
    };
  }

  private async calculateLatenessDeductions(
    teacherId: string,
    assignments: any[],
    fromDate: Date,
    toDate: Date
  ) {
    // Implementation for lateness deduction calculation
    // This would contain the complex logic from the original API
    return {
      totalDeduction: 0,
      breakdown: [],
    };
  }

  private async calculateAbsenceDeductions(
    teacherId: string,
    assignments: any[],
    fromDate: Date,
    toDate: Date
  ) {
    // Implementation for absence deduction calculation
    // This would contain the complex logic from the original API
    return {
      totalDeduction: 0,
      breakdown: [],
    };
  }

  private async calculateBonuses(
    teacherId: string,
    fromDate: Date,
    toDate: Date
  ) {
    const bonuses = await prisma.qualityassessment.aggregate({
      where: {
        teacherId,
        weekStart: { gte: fromDate, lte: toDate },
        managerApproved: true,
      },
      _sum: { bonusAwarded: true },
    });
    return Math.round(bonuses._sum?.bonusAwarded ?? 0);
  }

  private async calculateDetailedLatenessRecords(
    teacherId: string,
    assignments: any[],
    fromDate: Date,
    toDate: Date
  ) {
    // Implementation for detailed lateness records
    return [];
  }

  private async calculateDetailedAbsenceRecords(
    teacherId: string,
    assignments: any[],
    fromDate: Date,
    toDate: Date
  ) {
    // Implementation for detailed absence records
    return [];
  }

  private async getUnmatchedZoomLinks(
    teacherId: string,
    fromDate: Date,
    toDate: Date
  ) {
    // Implementation for unmatched zoom links
    return [];
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

/**
 * Factory function to create a configured salary calculator
 */
export async function createSalaryCalculator(): Promise<SalaryCalculator> {
  // Load configuration from database
  const [packageDeductions, latenessConfigs, workingDaysConfig] =
    await Promise.all([
      prisma.packageDeduction.findMany(),
      prisma.latenessdeductionconfig.findMany({
        orderBy: [{ tier: "asc" }, { startMinute: "asc" }],
      }),
      prisma.setting.findUnique({
        where: { key: "include_sundays_in_salary" },
      }),
    ]);

  const packageDeductionMap: Record<
    string,
    { lateness: number; absence: number }
  > = {};
  packageDeductions.forEach((pkg) => {
    packageDeductionMap[pkg.packageName] = {
      lateness: Number(pkg.latenessBaseAmount),
      absence: Number(pkg.absenceBaseAmount),
    };
  });

  const excusedThreshold =
    latenessConfigs.length > 0
      ? Math.min(...latenessConfigs.map((c) => c.excusedThreshold ?? 0))
      : 3;

  const latenessTiers = latenessConfigs.map((c) => ({
    start: c.startMinute,
    end: c.endMinute,
    percent: c.deductionPercent,
  }));

  const config: SalaryCalculationConfig = {
    includeSundays: workingDaysConfig?.value === "true" || false,
    excusedThreshold,
    latenessTiers,
    packageDeductions: packageDeductionMap,
  };

  return new SalaryCalculator(config);
}
