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
  private static globalCache: Map<string, any> = new Map();

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
      // Debug configuration - add teacher IDs here to enable debug logging
      const debugTeacherIds = ["MOHAMED_TEACHER_ID", "SPECIFIC_TEACHER_ID"]; // Add actual teacher IDs here

      // Get teacher info
      const teacher = await this.getTeacherInfo(teacherId);
      if (!teacher) {
        throw new Error(`Teacher not found: ${teacherId}`);
      }

      // Get current students with their packages first
      const students = await this.getTeacherStudents(
        teacherId,
        fromDate,
        toDate
      );

      // Get teacher change periods from the new history system
      const teacherChangePeriods = await getTeacherChangePeriods(
        teacherId,
        fromDate,
        toDate
      );

      // Get assignments (active + historical)
      const assignments = await this.getTeacherAssignments(
        teacherId,
        fromDate,
        toDate,
        students
      );

      // Calculate deductions
      // Enable debug mode for lateness calculations
      const latenessDebugMode =
        debugTeacherIds.includes(teacherId) ||
        process.env.DEBUG_LATENESS === "true";

      const latenessData = await this.calculateLatenessDeductions(
        teacherId,
        assignments,
        fromDate,
        toDate,
        latenessDebugMode
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

      // Calculate base salary with assignment periods and teacher change data
      const baseSalaryData = await this.calculateBaseSalary(
        students,
        fromDate,
        toDate,
        assignments,
        teacherChangePeriods,
        teacherId
      );

      const result: TeacherSalaryData = {
        id: teacherId,
        teacherId,
        name: teacher.ustazname || "Unknown Teacher",
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
        hasTeacherChanges: baseSalaryData.studentBreakdown.some(
          (s) => s.teacherChanges
        ),
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
    salaryData: TeacherSalaryData;
  }> {
    // Get current students with their packages first
    const students = await this.getTeacherStudents(teacherId, fromDate, toDate);

    const assignments = await this.getTeacherAssignments(
      teacherId,
      fromDate,
      toDate,
      students
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

    // Get the complete salary data for this teacher
    const salaryData = await this.calculateTeacherSalary(
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
      salaryData,
    };
  }

  private async getTeacherInfo(teacherId: string) {
    return await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
      select: { ustazid: true, ustazname: true },
    });
  }

  private async getStudentForClassDate(teacherId: string, classDate: Date) {
    // This is a simplified implementation - in reality you'd need to match
    // the specific student based on the class schedule and time
    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        ustaz: teacherId,
        status: { in: ["active", "Active", "Not yet"] },
      },
      select: {
        wdt_ID: true,
        name: true,
        package: true,
      },
      take: 1, // For now, just get the first active student
    });

    return students[0] || null;
  }

  private async getPackageSalary(packageName: string | null): Promise<number> {
    if (!packageName) return 0;

    const packageSalary = await prisma.packageSalary.findFirst({
      where: { packageName },
      select: { salaryPerStudent: true },
    });

    return Number(packageSalary?.salaryPerStudent || 0);
  }

  private async getTeacherAssignments(
    teacherId: string,
    fromDate: Date,
    toDate: Date,
    students: any[]
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

    // Get teacher change periods from the new history system
    const teacherChangePeriods = await getTeacherChangePeriods(
      teacherId,
      fromDate,
      toDate
    );

    // Combine active assignments with historical periods
    const allAssignments = [
      ...activeAssignments.map((assignment) => ({
        student_id: assignment.student_id,
        ustaz_id: assignment.ustaz_id,
        time_slot: assignment.time_slot,
        daypackage: assignment.daypackage,
        occupied_at: assignment.occupied_at,
        end_at: assignment.end_at,
        student: assignment.student,
        assignment_type: "active" as const,
      })),
      ...teacherChangePeriods.map((period) => ({
        student_id: period.studentId,
        ustaz_id: period.teacherId,
        time_slot: period.timeSlot,
        daypackage: period.dayPackage,
        occupied_at: period.startDate,
        end_at: period.endDate,
        student: {
          wdt_ID: period.studentId,
          name: period.studentName,
          package: period.package,
        },
        assignment_type: "historical" as const,
        monthlyRate: period.monthlyRate,
        dailyRate: period.dailyRate,
      })),
    ];

    return allAssignments;
  }

  private async getTeacherStudents(
    teacherId: string,
    fromDate: Date,
    toDate: Date
  ) {
    // Get students who were assigned to this teacher during the period
    // This includes both current assignments and historical assignments

    // First, get current students assigned to this teacher
    // Only include students who have actual assignment records in wpos_ustaz_occupied_times
    const currentStudents = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        ustaz: teacherId,
        status: { in: ["active", "Active", "Not yet"] },
        occupiedTimes: {
          some: {
            ustaz_id: teacherId,
            occupied_at: { lte: toDate },
            OR: [{ end_at: null }, { end_at: { gte: fromDate } }],
          },
        },
      },
      select: {
        wdt_ID: true,
        name: true,
        package: true,
        zoom_links: {
          where: {
            ustazid: teacherId, // Only zoom links sent by this teacher
            sent_time: { gte: fromDate, lte: toDate },
          },
          select: { sent_time: true },
        },
      },
    });

    // Get historical assignments from audit logs for this teacher
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
    });

    // Find students who were assigned to this teacher during the period
    const historicalStudentIds = new Set<number>();

    auditLogs.forEach((log) => {
      try {
        const details = JSON.parse(log.details);
        if (details.newTeacher === teacherId && log.targetId) {
          // Teacher was assigned to this student
          historicalStudentIds.add(log.targetId);
        }
      } catch (e) {
        console.warn(`Failed to parse audit log details:`, e);
      }
    });

    // Get historical students who were assigned to this teacher
    const historicalStudents =
      historicalStudentIds.size > 0
        ? await prisma.wpos_wpdatatable_23.findMany({
            where: {
              wdt_ID: { in: Array.from(historicalStudentIds) },
              status: { in: ["active", "Active", "Not yet"] },
            },
            select: {
              wdt_ID: true,
              name: true,
              package: true,
              zoom_links: {
                where: {
                  ustazid: teacherId, // Only zoom links sent by this teacher
                  sent_time: { gte: fromDate, lte: toDate },
                },
                select: { sent_time: true },
              },
            },
          })
        : [];

    // Combine current and historical students, removing duplicates
    const allStudents = [...currentStudents];
    const currentStudentIds = new Set(currentStudents.map((s) => s.wdt_ID));

    historicalStudents.forEach((student) => {
      if (!currentStudentIds.has(student.wdt_ID)) {
        allStudents.push(student);
      }
    });

    // Fallback: Find students based on zoom links sent by this teacher
    // This catches cases where assignment data might be missing but zoom links exist
    const zoomLinkStudents = await prisma.wpos_zoom_links.findMany({
      where: {
        ustazid: teacherId,
        sent_time: { gte: fromDate, lte: toDate },
      },
      select: {
        studentid: true,
        wpos_wpdatatable_23: {
          select: {
            wdt_ID: true,
            name: true,
            package: true,
            status: true,
          },
        },
      },
      distinct: ["studentid"],
    });

    // Add students found through zoom links
    const existingStudentIds = new Set(allStudents.map((s) => s.wdt_ID));

    for (const zoomLink of zoomLinkStudents) {
      const student = zoomLink.wpos_wpdatatable_23;
      if (
        student &&
        !existingStudentIds.has(student.wdt_ID) &&
        student.status &&
        ["active", "Active", "Not yet"].includes(student.status)
      ) {
        // Get zoom links for this student
        const studentZoomLinks = await prisma.wpos_zoom_links.findMany({
          where: {
            ustazid: teacherId,
            studentid: student.wdt_ID,
            sent_time: { gte: fromDate, lte: toDate },
          },
          select: { sent_time: true },
        });

        allStudents.push({
          wdt_ID: student.wdt_ID,
          name: student.name,
          package: student.package,
          zoom_links: studentZoomLinks,
        });
      }
    }

    // Debug: Log all zoom links for this teacher
    const allTeacherZoomLinks = await prisma.wpos_zoom_links.findMany({
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
            ustaz: true,
          },
        },
      },
      orderBy: { sent_time: "desc" },
    });

    return allStudents;
  }

  /**
   * Calculate working days in a period based on Sunday inclusion setting
   */
  private calculateWorkingDays(fromDate: Date, toDate: Date): number {
    let workingDays = 0;
    const current = new Date(fromDate);

    while (current <= toDate) {
      // Validate the date to avoid invalid dates like Sept 31st
      const year = current.getFullYear();
      const month = current.getMonth();
      const day = current.getDate();

      // Check if this is a valid date
      const testDate = new Date(year, month, day);
      if (
        testDate.getFullYear() === year &&
        testDate.getMonth() === month &&
        testDate.getDate() === day
      ) {
        // Convert to timezone-aware date for proper day calculation
        const zonedDate = toZonedTime(testDate, TZ);
        if (this.config.includeSundays || zonedDate.getDay() !== 0) {
          workingDays++;
        }
      }

      // Move to next day safely
      current.setTime(current.getTime() + 24 * 60 * 60 * 1000);
    }

    console.log(
      `📅 Working days calculation: ${workingDays} days (includeSundays: ${this.config.includeSundays})`
    );
    return workingDays;
  }

  private async calculateBaseSalary(
    students: any[],
    fromDate: Date,
    toDate: Date,
    assignments: any[] = [],
    teacherChangePeriods: any[] = [],
    teacherId: string
  ) {
    const packageSalaries = await prisma.packageSalary.findMany();
    const salaryMap: Record<string, number> = {};
    packageSalaries.forEach((pkg) => {
      salaryMap[pkg.packageName] = Number(pkg.salaryPerStudent);
    });

    // Calculate working days using the helper function
    const workingDays = this.calculateWorkingDays(fromDate, toDate);

    const dailyEarnings = new Map<string, number>();
    const studentBreakdown = [];
    const teacherPeriods = new Map<
      string,
      Array<{ start: Date; end: Date | null; student: any }>
    >();

    // Group assignments by student to track teacher periods
    for (const assignment of assignments) {
      const studentId = assignment.student_id || assignment.student?.wdt_ID;
      if (!studentId) continue;

      const student =
        assignment.student || students.find((s) => s.wdt_ID === studentId);
      if (!student) continue;

      if (!teacherPeriods.has(studentId.toString())) {
        teacherPeriods.set(studentId.toString(), []);
      }

      const periods = teacherPeriods.get(studentId.toString())!;
      const startDate = assignment.occupied_at || fromDate;
      const endDate = assignment.end_at || toDate;

      periods.push({
        start: startDate,
        end: endDate,
        student: student,
      });
    }

    // Process each student with their teacher periods
    for (const student of students) {
      if (!student.package || !salaryMap[student.package]) continue;

      const monthlyPackageSalary = Math.round(salaryMap[student.package] || 0);
      const dailyRate = Math.round(monthlyPackageSalary / workingDays);

      // Get teacher periods for this student
      const periods = teacherPeriods.get(student.wdt_ID.toString()) || [];

      // If no specific periods found, check if teacher has zoom links for this student
      // This handles the case where teacher was transferred but still has zoom links
      if (periods.length === 0) {
        // Check if teacher has any zoom links for this student during the period
        const hasZoomLinks =
          student.zoom_links && student.zoom_links.length > 0;

        if (hasZoomLinks) {
          // Find the date range of zoom links
          const zoomDates = student.zoom_links
            .filter((link: any) => link.sent_time)
            .map((link: any) => new Date(link.sent_time!))
            .sort((a: Date, b: Date) => a.getTime() - b.getTime());

          if (zoomDates.length > 0) {
            const firstZoomDate = zoomDates[0];
            const lastZoomDate = zoomDates[zoomDates.length - 1];

            // Ensure the period covers the entire month, not just the zoom link dates
            const periodStart = new Date(
              Math.min(firstZoomDate.getTime(), fromDate.getTime())
            );
            const periodEnd = new Date(
              Math.max(lastZoomDate.getTime(), toDate.getTime())
            );

            periods.push({
              start: periodStart,
              end: periodEnd,
              student: student,
            });
          }
        } else {
          // No zoom links, assume teacher was assigned for the entire period
          periods.push({
            start: fromDate,
            end: toDate,
            student: student,
          });
        }
      }

      // Calculate earnings for each period
      let totalEarned = 0;
      const periodBreakdown = [];

      for (const period of periods) {
        const periodStart = new Date(
          Math.max(period.start.getTime(), fromDate.getTime())
        );
        const periodEnd = new Date(
          Math.min((period.end || toDate).getTime(), toDate.getTime())
        );

        if (periodStart > periodEnd) continue;

        // Count teaching days in this period
        const teachingDates = new Set<string>();
        const dailyLinks = new Map<string, Date>();

        // Get zoom links for this period
        const periodZoomLinks =
          student.zoom_links?.filter((link: any) => {
            if (!link.sent_time) return false;
            const linkDate = new Date(link.sent_time);
            return linkDate >= periodStart && linkDate <= periodEnd;
          }) || [];

        periodZoomLinks.forEach((link: any) => {
          if (link.sent_time) {
            const linkDate = new Date(link.sent_time);

            // Debug Sunday inclusion
            const isSunday = linkDate.getDay() === 0;
            const shouldInclude = this.config.includeSundays || !isSunday;

            if (!shouldInclude) {
              return;
            }

            // Ensure sent_time is a Date object
            const sentTime =
              link.sent_time instanceof Date
                ? link.sent_time
                : new Date(link.sent_time);
            const dateStr = sentTime.toISOString().split("T")[0];

            if (
              !dailyLinks.has(dateStr) ||
              sentTime < dailyLinks.get(dateStr)!
            ) {
              dailyLinks.set(dateStr, sentTime);
            }
          }
        });

        dailyLinks.forEach((_, dateStr) => {
          teachingDates.add(dateStr);
        });

        const periodEarnings = dailyRate * teachingDates.size;
        totalEarned += periodEarnings;

        // Add to daily earnings
        teachingDates.forEach((dateStr) => {
          if (!dailyEarnings.has(dateStr)) {
            dailyEarnings.set(dateStr, 0);
          }
          dailyEarnings.set(dateStr, dailyEarnings.get(dateStr)! + dailyRate);
        });

        if (teachingDates.size > 0) {
          // Determine teacher role based on the period
          let teacherRole: "old_teacher" | "new_teacher" = "new_teacher";
          let changeDate: string | undefined;

          // Check if this period corresponds to a teacher change
          const teacherChangePeriod = teacherChangePeriods.find(
            (tcp) =>
              tcp.studentId === student.wdt_ID &&
              tcp.startDate <= periodStart &&
              tcp.endDate >= periodEnd
          );

          if (teacherChangePeriod) {
            // Check if this teacher was the old teacher (before change) or new teacher (after change)
            const changeHistory = await prisma.teacher_change_history.findFirst(
              {
                where: {
                  student_id: student.wdt_ID,
                  change_date: {
                    gte: periodStart,
                    lte: periodEnd,
                  },
                },
                orderBy: { change_date: "asc" },
              }
            );

            if (changeHistory) {
              teacherRole =
                changeHistory.old_teacher_id === teacherId
                  ? "old_teacher"
                  : "new_teacher";
              changeDate = changeHistory.change_date
                .toISOString()
                .split("T")[0];
            }
          }

          periodBreakdown.push({
            period: `${periodStart.toISOString().split("T")[0]} to ${
              periodEnd.toISOString().split("T")[0]
            }`,
            daysWorked: teachingDates.size,
            dailyRate: dailyRate,
            periodEarnings: periodEarnings,
            teachingDates: Array.from(teachingDates),
            teacherRole: teacherRole,
            changeDate: changeDate,
          });
        }
      }

      if (totalEarned > 0) {
        studentBreakdown.push({
          studentName: student.name || "Unknown",
          package: student.package || "Unknown",
          monthlyRate: monthlyPackageSalary,
          dailyRate: dailyRate,
          daysWorked: Array.from(dailyEarnings.keys()).length,
          totalEarned: totalEarned,
          periods: periodBreakdown,
          teacherChanges: periods.length > 1,
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
    toDate: Date,
    isDebugMode: boolean = false
  ) {
    if (isDebugMode) {
      console.log(`\n🚨 === LATENESS DEDUCTION DEBUG ===`);
      console.log(`Teacher ID: ${teacherId}`);
      console.log(
        `Period: ${fromDate.toISOString().split("T")[0]} to ${
          toDate.toISOString().split("T")[0]
        }`
      );
    }
    // Get zoom links for the period to calculate lateness
    // Only include zoom links for students who have actual assignment records
    const zoomLinks = await prisma.wpos_zoom_links.findMany({
      where: {
        ustazid: teacherId,
        sent_time: {
          gte: fromDate,
          lte: toDate,
        },
        wpos_wpdatatable_23: {
          occupiedTimes: {
            some: {
              ustaz_id: teacherId,
              occupied_at: { lte: toDate },
              OR: [{ end_at: null }, { end_at: { gte: fromDate } }],
            },
          },
        },
      },
      include: {
        wpos_wpdatatable_23: {
          select: {
            wdt_ID: true,
            name: true,
            package: true,
            occupiedTimes: {
              where: {
                ustaz_id: teacherId,
                occupied_at: { lte: toDate },
                OR: [{ end_at: null }, { end_at: { gte: fromDate } }],
              },
              select: {
                time_slot: true,
                occupied_at: true,
                end_at: true,
              },
            },
          },
        },
      },
      orderBy: { sent_time: "asc" },
    });

    // Get package deduction rates
    const packageDeductions = await prisma.packageDeduction.findMany();
    const packageMap = Object.fromEntries(
      packageDeductions.map((p: any) => [
        p.packageName,
        Number(p.latenessBaseAmount || 30),
      ])
    );

    // Get lateness config with tiers
    const latenessConfigs = await prisma.latenessdeductionconfig.findMany({
      where: {
        OR: [{ teacherId }, { isGlobal: true }],
      },
      orderBy: [{ tier: "asc" }, { startMinute: "asc" }],
    });

    // Get lateness deduction waivers for the period
    const latenessWaivers = await prisma.deduction_waivers.findMany({
      where: {
        teacherId,
        deductionType: "lateness",
        deductionDate: {
          gte: fromDate,
          lte: toDate,
        },
      },
      select: { deductionDate: true, reason: true },
    });

    if (latenessConfigs.length === 0) {
      return { totalDeduction: 0, breakdown: [] };
    }

    const excusedThreshold = Math.min(
      ...latenessConfigs.map((c: any) => c.excusedThreshold ?? 0)
    );

    let totalDeduction = 0;
    const breakdown: any[] = [];

    // Group zoom links by date
    const linksByDate = new Map<string, any[]>();
    zoomLinks.forEach((link) => {
      if (link.sent_time) {
        const dateStr = link.sent_time.toISOString().split("T")[0];
        if (!linksByDate.has(dateStr)) {
          linksByDate.set(dateStr, []);
        }
        linksByDate.get(dateStr)!.push(link);
      }
    });

    // Process each day
    for (const [dateStr, dayLinks] of linksByDate) {
      if (dayLinks.length === 0) continue;

      const firstLink = dayLinks[0];
      const student = firstLink.wpos_wpdatatable_23;
      if (!student || !firstLink.sent_time) continue;

      // Check if student was assigned to teacher on this date
      const assignment = student.occupiedTimes?.[0];
      if (assignment) {
        const assignmentStart = assignment.occupied_at
          ? new Date(assignment.occupied_at)
          : null;
        const assignmentEnd = assignment.end_at
          ? new Date(assignment.end_at)
          : null;
        const linkDate = new Date(firstLink.sent_time);

        // Skip if student was not assigned to teacher on this date
        if (assignmentStart && linkDate < assignmentStart) continue;
        if (assignmentEnd && linkDate > assignmentEnd) continue;
      }

      const timeSlot = student.occupiedTimes?.[0]?.time_slot;
      if (!timeSlot) continue;

      // Calculate lateness
      const parseTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        return hours * 60 + minutes;
      };

      const scheduledMinutes = parseTime(timeSlot);
      const actualMinutes =
        firstLink.sent_time.getHours() * 60 + firstLink.sent_time.getMinutes();
      const latenessMinutes = actualMinutes - scheduledMinutes;

      // Skip if early (negative lateness) - teachers who send zoom links early should not be penalized
      if (latenessMinutes < 0) {
        if (isDebugMode) {
          console.log(
            `🚀 ${student.name}: Sent zoom link ${Math.abs(
              latenessMinutes
            )} minutes early - No late penalty`
          );
        }
        continue;
      }

      // Skip if within excused threshold (no lateness or minor lateness)
      if (latenessMinutes <= excusedThreshold) {
        if (isDebugMode) {
          console.log(
            `✅ ${student.name}: Within excused threshold (${latenessMinutes} min) - No deduction`
          );
        }
        continue;
      }

      // Check if there's a lateness waiver for this date
      const hasLatenessWaiver = latenessWaivers.some(
        (waiver) => waiver.deductionDate.toISOString().split("T")[0] === dateStr
      );

      if (hasLatenessWaiver) continue; // Skip deduction if waiver exists

      // Find appropriate tier
      const tier = latenessConfigs.find(
        (config) =>
          latenessMinutes >= config.startMinute &&
          latenessMinutes <= config.endMinute
      );

      if (tier) {
        const packageRate = packageMap[student.package] || 30;
        const deduction = packageRate * ((tier.deductionPercent || 0) / 100);

        totalDeduction += deduction;

        breakdown.push({
          date: dateStr,
          studentName: student.name || "Unknown Student",
          scheduledTime: timeSlot,
          actualTime: firstLink.sent_time.toTimeString().split(" ")[0],
          latenessMinutes,
          tier: `Tier ${tier.tier}`,
          deduction: Math.round(deduction),
        });
      }
    }

    return {
      totalDeduction: Math.round(totalDeduction),
      breakdown,
    };
  }

  private async calculateAbsenceDeductions(
    teacherId: string,
    assignments: any[],
    fromDate: Date,
    toDate: Date
  ) {
    try {
      console.log(`🔍 Calculating absence deductions for teacher ${teacherId}`);

      // Don't process future dates
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const effectiveToDate = toDate > today ? today : toDate;

      // Get package deduction rates
      const packageDeductions = await prisma.packageDeduction.findMany();
      const packageMap = Object.fromEntries(
        packageDeductions.map((p: any) => [
          p.packageName,
          Number(p.absenceBaseAmount || 25),
        ])
      );

      // Get permission requests and waivers
      const [permissionRequests, deductionWaivers] = await Promise.all([
        prisma.permissionrequest.findMany({
          where: {
            teacherId,
            requestedDate: {
              gte: format(fromDate, "yyyy-MM-dd"),
              lte: format(effectiveToDate, "yyyy-MM-dd"),
            },
            status: "Approved",
          },
          select: { requestedDate: true },
        }),
        prisma.deduction_waivers.findMany({
          where: {
            teacherId,
            deductionType: "absence",
            deductionDate: {
              gte: fromDate,
              lte: effectiveToDate,
            },
          },
          select: { deductionDate: true },
        }),
      ]);

      const waivedDates = new Set(
        deductionWaivers.map((w) => format(w.deductionDate, "yyyy-MM-dd"))
      );
      const permittedDates = new Set(
        permissionRequests.map((p) => p.requestedDate)
      );

      // Get all students assigned to this teacher during the period
      const students = await prisma.wpos_wpdatatable_23.findMany({
        where: {
          status: { in: ["active", "Active", "Not yet"] },
          OR: [
            // Current assignments
            {
              ustaz: teacherId,
              occupiedTimes: {
                some: {
                  ustaz_id: teacherId,
                  occupied_at: { lte: effectiveToDate },
                  OR: [{ end_at: null }, { end_at: { gte: fromDate } }],
                },
              },
            },
            // Historical assignments from audit logs
            {
              occupiedTimes: {
                some: {
                  ustaz_id: teacherId,
                  occupied_at: { lte: effectiveToDate },
                  OR: [{ end_at: null }, { end_at: { gte: fromDate } }],
                },
              },
            },
          ],
        },
        include: {
          occupiedTimes: {
            where: {
              ustaz_id: teacherId,
              occupied_at: { lte: effectiveToDate },
              OR: [{ end_at: null }, { end_at: { gte: fromDate } }],
            },
            select: {
              time_slot: true,
              daypackage: true,
              occupied_at: true,
              end_at: true,
            },
          },
          zoom_links: {
            where: {
              ustazid: teacherId,
              sent_time: {
                gte: fromDate,
                lte: effectiveToDate,
              },
            },
            select: { sent_time: true },
          },
          attendance_progress: {
            where: {
              date: {
                gte: fromDate,
                lte: effectiveToDate,
              },
            },
            select: { date: true, attendance_status: true },
          },
        },
      });

      console.log(
        `📊 Processing ${students.length} students for absence deductions`
      );

      // Debug: Log all students being processed
      students.forEach((student, index) => {
        console.log(
          `👤 Student ${index + 1}: ${student.name} (ID: ${student.wdt_ID})`
        );
        console.log(`   Package: ${student.package}`);
        console.log(`   Occupied Times: ${student.occupiedTimes?.length || 0}`);
        console.log(`   Zoom Links: ${student.zoom_links?.length || 0}`);
        console.log(
          `   Attendance Records: ${student.attendance_progress?.length || 0}`
        );

        if (student.occupiedTimes?.length > 0) {
          student.occupiedTimes.forEach((ot: any, otIndex: number) => {
            console.log(`   Occupied Time ${otIndex + 1}:`);
            console.log(`     Daypackage: "${ot.daypackage}"`);
            console.log(`     Start: ${ot.occupied_at}`);
            console.log(`     End: ${ot.end_at}`);
          });
        }
      });

      let totalDeduction = 0;
      const breakdown: any[] = [];

      // Helper function to parse daypackage
      const parseDaypackage = (dp: string): number[] => {
        console.log(
          `       🔍 Parsing daypackage: "${dp}" (length: ${dp?.length || 0})`
        );
        if (!dp || dp.trim() === "") {
          console.log(`       ❌ Empty daypackage`);
          return [];
        }

        const dpTrimmed = dp.trim().toUpperCase();
        console.log(`       📝 Trimmed daypackage: "${dpTrimmed}"`);

        // Common patterns
        if (dpTrimmed === "ALL DAYS" || dpTrimmed === "ALLDAYS") {
          console.log(`       ✅ Matched "ALL DAYS" pattern`);
          console.log(
            `       🔍 Exact comparison: "${dpTrimmed}" === "ALL DAYS": ${
              dpTrimmed === "ALL DAYS"
            }`
          );
          console.log(
            `       🔍 Exact comparison: "${dpTrimmed}" === "ALLDAYS": ${
              dpTrimmed === "ALLDAYS"
            }`
          );
          // ALL DAYS should include all days, then let configuration decide
          const result = [0, 1, 2, 3, 4, 5, 6]; // Sunday to Saturday
          console.log(`       📤 Returning: [${result.join(", ")}]`);
          return result;
        }
        if (dpTrimmed === "MWF") {
          console.log(`       ✅ Matched "MWF" pattern`);
          const result = [1, 3, 5]; // Monday, Wednesday, Friday
          console.log(`       📤 Returning: [${result.join(", ")}]`);
          return result;
        }
        if (dpTrimmed === "TTS" || dpTrimmed === "TTH") {
          console.log(`       ✅ Matched "TTS/TTH" pattern`);
          const result = [2, 4, 6]; // Tuesday, Thursday, Saturday
          console.log(`       📤 Returning: [${result.join(", ")}]`);
          return result;
        }

        // Day mapping
        const dayMap: Record<string, number> = {
          MONDAY: 1,
          MON: 1,
          TUESDAY: 2,
          TUE: 2,
          WEDNESDAY: 3,
          WED: 3,
          THURSDAY: 4,
          THU: 4,
          FRIDAY: 5,
          FRI: 5,
          SATURDAY: 6,
          SAT: 6,
          SUNDAY: 0,
          SUN: 0,
        };

        // Check for exact day match
        if (dayMap[dpTrimmed] !== undefined) {
          console.log(
            `       ✅ Matched single day: ${dpTrimmed} -> ${dayMap[dpTrimmed]}`
          );
          return [dayMap[dpTrimmed]];
        }

        // Check for numeric patterns
        const numericMatch = dpTrimmed.match(/\d+/g);
        if (numericMatch) {
          const days = numericMatch.map(Number).filter((d) => d >= 0 && d <= 6);
          console.log(
            `       ✅ Matched numeric pattern: [${days.join(", ")}]`
          );
          return days;
        }

        // Check for comma-separated days
        if (dpTrimmed.includes(",")) {
          const parts = dpTrimmed.split(",").map((p) => p.trim());
          const days: number[] = [];
          for (const part of parts) {
            const day = dayMap[part] ?? parseInt(part);
            if (!isNaN(day) && day >= 0 && day <= 6) {
              days.push(day);
            }
          }
          console.log(
            `       ✅ Matched comma-separated pattern: [${days.join(", ")}]`
          );
          return days;
        }

        console.log(`       ❌ No pattern matched for "${dpTrimmed}"`);
        return [];
      };

      // Calculate working days for this period
      const workingDays = this.calculateWorkingDays(fromDate, effectiveToDate);

      // Process each day in the period
      console.log(
        `📅 Processing period: ${format(fromDate, "yyyy-MM-dd")} to ${format(
          effectiveToDate,
          "yyyy-MM-dd"
        )}`
      );
      console.log(
        `🚫 Waived dates: ${Array.from(waivedDates).join(", ") || "None"}`
      );
      console.log(
        `✅ Permitted dates: ${Array.from(permittedDates).join(", ") || "None"}`
      );

      // Safe date iteration to avoid invalid dates like Sept 31st
      const safeDateIterator = (startDate: Date, endDate: Date) => {
        const dates: Date[] = [];
        const current = new Date(startDate);

        while (current <= endDate) {
          // Validate the date to avoid invalid dates like Sept 31st
          const year = current.getFullYear();
          const month = current.getMonth();
          const day = current.getDate();

          // Check if this is a valid date
          const testDate = new Date(year, month, day);
          if (
            testDate.getFullYear() === year &&
            testDate.getMonth() === month &&
            testDate.getDate() === day
          ) {
            dates.push(new Date(testDate));
          }

          // Move to next day safely
          current.setTime(current.getTime() + 24 * 60 * 60 * 1000);
        }

        return dates;
      };

      const datesToProcess = safeDateIterator(fromDate, effectiveToDate);

      for (const d of datesToProcess) {
        // Convert to timezone-aware date for proper day calculation
        const zonedDate = toZonedTime(d, TZ);
        const dateStr = format(zonedDate, "yyyy-MM-dd");
        const dayOfWeek = zonedDate.getDay();
        const dayName = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ][dayOfWeek];

        console.log(
          `\n📅 Processing ${dateStr} (${dayName}, dayOfWeek: ${dayOfWeek})`
        );

        // Skip Sunday unless configured to include
        if (dayOfWeek === 0 && !this.config.includeSundays) {
          console.log(
            `   ⏭️  Skipping Sunday (includeSundays: ${this.config.includeSundays})`
          );
          continue;
        }

        // Skip if waived or permitted
        if (waivedDates.has(dateStr)) {
          console.log(`   ⏭️  Skipping waived date`);
          continue;
        }
        if (permittedDates.has(dateStr)) {
          console.log(`   ⏭️  Skipping permitted date`);
          continue;
        }

        let dailyDeduction = 0;
        const affectedStudents: any[] = [];
        console.log(
          `   🔍 Checking ${students.length} students for this day...`
        );

        // Check each student
        for (const student of students) {
          console.log(
            `     👤 Checking student: ${student.name} (${student.wdt_ID})`
          );

          // Check if student has any occupied times with this teacher
          const relevantOccupiedTimes = student.occupiedTimes.filter(
            (ot: any) => {
              const assignmentStart = ot.occupied_at
                ? new Date(ot.occupied_at)
                : null;
              const assignmentEnd = ot.end_at ? new Date(ot.end_at) : null;

              if (assignmentStart && d < assignmentStart) return false;
              if (assignmentEnd && d > assignmentEnd) return false;
              return true;
            }
          );

          console.log(
            `       📅 Relevant occupied times: ${relevantOccupiedTimes.length}`
          );
          if (relevantOccupiedTimes.length === 0) {
            console.log(`       ❌ No relevant occupied times for this date`);
            continue;
          }

          // Check if student is scheduled on this day
          let isScheduled = false;
          let scheduledDays: number[] = [];
          for (const ot of relevantOccupiedTimes) {
            const parsedDays = parseDaypackage(ot.daypackage || "");
            scheduledDays = [...new Set([...scheduledDays, ...parsedDays])];
            console.log(
              `       📋 Daypackage "${
                ot.daypackage
              }" parsed to: [${parsedDays.join(", ")}]`
            );
            if (parsedDays.includes(dayOfWeek)) {
              isScheduled = true;
            }
          }

          console.log(
            `       📅 All scheduled days: [${scheduledDays.join(", ")}]`
          );
          console.log(
            `       📅 Is scheduled on ${dayName} (${dayOfWeek}): ${isScheduled}`
          );

          // Fallback: if no daypackage but has zoom links, assume weekdays
          if (!isScheduled && student.zoom_links?.length > 0) {
            isScheduled = dayOfWeek >= 1 && dayOfWeek <= 5;
            console.log(
              `       🔄 Fallback: assuming weekdays due to zoom links: ${isScheduled}`
            );
          }

          if (!isScheduled) {
            console.log(`       ❌ Student not scheduled on this day`);
            continue;
          }

          // Check if student has zoom link for this date
          const hasZoomLink = student.zoom_links?.some((link: any) => {
            if (!link.sent_time) return false;
            const linkDate = format(new Date(link.sent_time), "yyyy-MM-dd");
            return linkDate === dateStr;
          });

          console.log(`       🔗 Has zoom link for ${dateStr}: ${hasZoomLink}`);
          if (hasZoomLink) {
            console.log(`       ✅ Student has zoom link, no deduction`);
            continue;
          }

          // Check attendance permission
          const attendanceRecord = student.attendance_progress?.find(
            (att: any) => {
              const attDate = format(new Date(att.date), "yyyy-MM-dd");
              return attDate === dateStr;
            }
          );

          console.log(
            `       📋 Attendance record: ${
              attendanceRecord ? attendanceRecord.attendance_status : "None"
            }`
          );
          if (attendanceRecord?.attendance_status === "Permission") {
            console.log(`       ✅ Student has permission, no deduction`);
            continue;
          }

          // Apply deduction
          const packageRate = packageMap[student.package || ""] || 25;
          dailyDeduction += packageRate;
          console.log(
            `       💰 APPLYING DEDUCTION: ${packageRate} ETB (package: ${student.package})`
          );

          affectedStudents.push({
            studentId: student.wdt_ID,
            studentName: student.name || "Unknown Student",
            studentPackage: student.package || "Unknown Package",
            rate: packageRate,
            daypackage: relevantOccupiedTimes[0]?.daypackage || "Unknown",
          });
        }

        if (dailyDeduction > 0) {
          totalDeduction += dailyDeduction;
          console.log(
            `   💰 DAILY DEDUCTION APPLIED: ${dailyDeduction} ETB for ${affectedStudents.length} students`
          );

          // Add individual student entries to breakdown for detailed view
          affectedStudents.forEach((student) => {
            breakdown.push({
              date: dateStr,
              studentId: student.studentId,
              studentName: student.studentName,
              studentPackage: student.studentPackage,
              reason: "No zoom link sent",
              deduction: Math.round(student.rate),
              permitted: false,
              waived: false,
            });
          });
        } else {
          console.log(`   ✅ No deductions for this day`);
        }
      }

      console.log(
        `💰 Final absence deduction: ${totalDeduction} ETB for ${breakdown.length} days`
      );
      console.log(
        `📅 Total working days in period: ${workingDays} (includeSundays: ${this.config.includeSundays})`
      );

      return {
        totalDeduction: Math.round(totalDeduction),
        breakdown,
      };
    } catch (error) {
      console.error(
        `Error calculating absence deductions for teacher ${teacherId}:`,
        error
      );
      return {
        totalDeduction: 0,
        breakdown: [],
      };
    }
  }

  private async calculateBonuses(
    teacherId: string,
    fromDate: Date,
    toDate: Date
  ) {
    // Get quality assessment bonuses
    const qualityBonuses = await prisma.qualityassessment.aggregate({
      where: {
        teacherId,
        weekStart: { gte: fromDate, lte: toDate },
        managerApproved: true,
      },
      _sum: { bonusAwarded: true },
    });

    // Get bonus records
    const bonusRecords = await prisma.bonusrecord.findMany({
      where: {
        teacherId,
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
    });

    const totalQualityBonus = qualityBonuses._sum.bonusAwarded || 0;
    const totalRecordBonus = bonusRecords.reduce(
      (sum, record) => sum + (record.amount || 0),
      0
    );

    return Math.round(totalQualityBonus + totalRecordBonus);
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

  /**
   * Clear cache for specific teacher
   */
  clearTeacherCache(teacherId: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(`salary_${teacherId}_`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Clear cache for specific date range
   */
  clearDateRangeCache(fromDate: Date, toDate: Date): void {
    const keysToDelete: string[] = [];
    const fromDateStr = fromDate.toISOString();
    const toDateStr = toDate.toISOString();

    for (const key of this.cache.keys()) {
      if (key.includes(fromDateStr) || key.includes(toDateStr)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Static method to clear global cache
   */
  static clearGlobalCache(): void {
    SalaryCalculator.globalCache.clear();
  }

  /**
   * Static method to clear cache for specific teacher across all instances
   */
  static clearGlobalTeacherCache(teacherId: string): void {
    const keysToDelete: string[] = [];
    for (const key of SalaryCalculator.globalCache.keys()) {
      if (key.includes(`salary_${teacherId}_`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => SalaryCalculator.globalCache.delete(key));
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

  // Debug: Log configuration
  console.log("🔧 Salary Calculator Configuration:", {
    includeSundays: config.includeSundays,
    settingValue: workingDaysConfig?.value,
    excusedThreshold: config.excusedThreshold,
    latenessTiersCount: config.latenessTiers.length,
    packageDeductionsCount: Object.keys(config.packageDeductions).length,
  });

  return new SalaryCalculator(config);
}
