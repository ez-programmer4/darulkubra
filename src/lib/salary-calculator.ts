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

      // Calculate base salary with assignment periods
      const baseSalaryData = await this.calculateBaseSalary(
        students,
        fromDate,
        toDate,
        assignments
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

    // Get historical assignments from audit log with enhanced parsing
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

          // Handle both old and new teacher assignments
          if (details.oldTeacher === teacherId && log.targetId) {
            // Teacher was removed from student
            return {
              student_id: log.targetId,
              ustaz_id: String(details.oldTeacher || ""),
              time_slot: String(details.oldTime || "09:00 AM"),
              daypackage: String(
                details.oldDayPackage || details.newDayPackage || "MWF"
              ),
              occupied_at: new Date(details.occupied_at || log.createdAt),
              end_at: log.createdAt,
              assignment_type: "removed" as const,
            };
          } else if (details.newTeacher === teacherId && log.targetId) {
            // Teacher was assigned to student
            return {
              student_id: log.targetId,
              ustaz_id: String(details.newTeacher || ""),
              time_slot: String(details.newTime || "09:00 AM"),
              daypackage: String(details.newDayPackage || "MWF"),
              occupied_at: log.createdAt,
              end_at: null,
              assignment_type: "assigned" as const,
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

    // Combine and sort assignments by effective date
    const allAssignments = [
      ...activeAssignments.map((a) => ({
        ...a,
        assignment_type: "active" as const,
      })),
      ...historicalAssignments.filter((a) => (a as any).student),
    ].sort((a, b) => {
      const aDate = a.occupied_at || new Date(0);
      const bDate = b.occupied_at || new Date(0);
      return aDate.getTime() - bDate.getTime();
    });

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

  private async calculateBaseSalary(
    students: any[],
    fromDate: Date,
    toDate: Date,
    assignments: any[] = []
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
          periodBreakdown.push({
            period: `${periodStart.toISOString().split("T")[0]} to ${
              periodEnd.toISOString().split("T")[0]
            }`,
            daysWorked: teachingDates.size,
            dailyRate: dailyRate,
            periodEarnings: periodEarnings,
            teachingDates: Array.from(teachingDates),
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
    // Enhanced Debug mode - enable for specific teachers or testing
    // To enable debugging for a specific teacher, replace the condition below
    const debugTeacherIds = ["MOHAMED_TEACHER_ID", "SPECIFIC_TEACHER_ID"]; // Add actual teacher IDs here
    const isDebugMode =
      debugTeacherIds.includes(teacherId) ||
      process.env.DEBUG_ABSENCE === "true";

    if (isDebugMode) {
      console.log(`\n🔍 === ABSENCE DEDUCTION DEBUG ===`);
      console.log(`Teacher ID: ${teacherId}`);
      console.log(
        `Period: ${fromDate.toISOString().split("T")[0]} to ${
          toDate.toISOString().split("T")[0]
        }`
      );
      console.log(`Debug Mode: Enabled`);
    }
    // Get ALL students who should be processed for absence deductions
    // This includes students with assignments AND students with zoom links from this teacher

    // Get student IDs from audit logs (historical assignments)
    const historicalStudentIds = await prisma.auditlog
      .findMany({
        where: {
          actionType: "assignment_update",
          createdAt: { gte: fromDate, lte: toDate },
          details: {
            contains: `"newTeacher":"${teacherId}"`,
          },
        },
        select: { targetId: true },
        distinct: ["targetId"],
      })
      .then((logs) =>
        logs
          .map((log) => log.targetId)
          .filter((id): id is number => id !== null)
      );

    // Get student IDs from zoom links (covers cases where assignment data might be missing)
    const zoomLinkStudentIds = await prisma.wpos_zoom_links
      .findMany({
        where: {
          ustazid: teacherId,
          sent_time: { gte: fromDate, lte: toDate },
        },
        select: { studentid: true },
        distinct: ["studentid"],
      })
      .then((links) => links.map((link) => link.studentid));

    // Combine all student IDs that need to be processed
    const allStudentIds = [...new Set([
      ...historicalStudentIds,
      ...zoomLinkStudentIds,
    ])];

    // Get current students assigned to this teacher
    const currentStudents = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        status: { in: ["active", "Active", "Not yet"] },
        OR: [
          // Students currently assigned to this teacher
          {
            ustaz: teacherId,
            occupiedTimes: {
              some: {
                ustaz_id: teacherId,
                occupied_at: { lte: toDate },
                OR: [{ end_at: null }, { end_at: { gte: fromDate } }],
              },
            },
          },
          // Students found in audit logs or zoom links
          {
            wdt_ID: { in: allStudentIds },
          },
        ],
      },
      include: {
        // Get ALL occupied times for this teacher during the period
        occupiedTimes: {
          where: {
            OR: [
              // Current assignment
              {
                ustaz_id: teacherId,
                occupied_at: { lte: toDate },
                OR: [{ end_at: null }, { end_at: { gte: fromDate } }],
              },
              // Historical assignments (even if student is reassigned)
              {
                ustaz_id: teacherId,
                OR: [
                  { occupied_at: { lte: toDate } },
                  { end_at: { gte: fromDate } },
                ],
              },
            ],
          },
          select: {
            time_slot: true,
            daypackage: true,
            occupied_at: true,
            end_at: true,
            ustaz_id: true,
          },
        },
        // Get ALL zoom links sent by this teacher during the period
        zoom_links: {
          where: {
            ustazid: teacherId,
            sent_time: {
              gte: fromDate,
              lte: toDate,
            },
          },
          select: { sent_time: true },
        },
        // Get attendance progress for the period
        attendance_progress: {
          where: {
            date: {
              gte: fromDate,
              lte: toDate,
            },
          },
          select: { date: true, attendance_status: true },
        },
      },
    });

    // All students are now in currentStudents, no need for separate queries
    const students = currentStudents;

    // Debug: Log students found
    if (isDebugMode) {
      console.log(`👥 Total students found: ${students.length}`);
      console.log(`📊 Student IDs from audit logs: ${historicalStudentIds.length}`);
      console.log(`📹 Student IDs from zoom links: ${zoomLinkStudentIds.length}`);
      console.log(`🔗 Combined unique student IDs: ${allStudentIds.length}`);
    }

    // Debug logging removed to prevent console noise

    // Debug mode: Log all students data
    if (isDebugMode) {
      console.log(`👥 Students found: ${students.length}`);
      students.forEach((student, index) => {
        console.log(`  ${index + 1}. ${student.name} (ID: ${student.wdt_ID})`, {
          package: student.package,
          status: student.status,
          occupiedTimes: student.occupiedTimes.length,
          zoomLinks: student.zoom_links.length,
          attendanceRecords: student.attendance_progress.length,
        });
      });
    }

    // Enhanced timezone conversion - properly handle Ethiopia timezone (UTC+3)
    const convertToEthiopiaTime = (utcDate: Date) => {
      // Ensure we're working with a proper UTC date at midnight
      const utcMidnight = new Date(
        Date.UTC(
          utcDate.getUTCFullYear(),
          utcDate.getUTCMonth(),
          utcDate.getUTCDate(),
          0,
          0,
          0,
          0
        )
      );

      // Add 3 hours to get Ethiopia time
      const ethiopiaTime = new Date(utcMidnight.getTime() + 3 * 60 * 60 * 1000);

      // Create a date without time component for comparison
      const ethiopiaDateOnly = new Date(
        Date.UTC(
          ethiopiaTime.getUTCFullYear(),
          ethiopiaTime.getUTCMonth(),
          ethiopiaTime.getUTCDate(),
          0,
          0,
          0,
          0
        )
      );

      return {
        date: ethiopiaDateOnly,
        dayOfWeek: ethiopiaDateOnly.getUTCDay(), // 0=Sunday, 1=Monday, etc.
        year: ethiopiaTime.getUTCFullYear(),
        month: ethiopiaTime.getUTCMonth() + 1,
        day: ethiopiaTime.getUTCDate(),
        hour: ethiopiaTime.getUTCHours(),
        minute: ethiopiaTime.getUTCMinutes(),
        datetime: ethiopiaTime,
        utcInput: utcMidnight.toISOString(),
        ethiopiaOutput: ethiopiaTime.toISOString(),
      };
    };

    // Get package deduction rates
    const packageDeductions = await prisma.packageDeduction.findMany();
    const packageMap = Object.fromEntries(
      packageDeductions.map((p: any) => [
        p.packageName,
        Number(p.absenceBaseAmount || 25),
      ])
    );

    // Debug mode: Log package deductions
    if (isDebugMode) {
      console.log(`💰 Package Deductions:`, packageMap);
    }

    // Get permission requests for the period
    const permissionRequests = await prisma.permissionrequest.findMany({
      where: {
        teacherId,
        requestedDate: {
          gte: fromDate.toISOString().split("T")[0],
          lte: toDate.toISOString().split("T")[0],
        },
        status: "approved",
      },
      select: { requestedDate: true, reasonDetails: true },
    });

    // Get deduction waivers for the period
    const deductionWaivers = await prisma.deduction_waivers.findMany({
      where: {
        teacherId,
        deductionType: "absence",
        deductionDate: {
          gte: fromDate,
          lte: toDate,
        },
      },
      select: { deductionDate: true, reason: true },
    });

    // Debug mode: Log permissions and waivers
    if (isDebugMode) {
      console.log(
        `📋 Permission Requests: ${permissionRequests.length}`,
        permissionRequests
      );
      console.log(
        `🛡️ Deduction Waivers: ${deductionWaivers.length}`,
        deductionWaivers
      );
    }

    let totalDeduction = 0;
    const breakdown: any[] = [];

    // Enhanced helper function to check if a student is scheduled on a specific day with UTC+3 timezone
    const isStudentScheduledOnDay = (
      student: any,
      dayOfWeek: number,
      debugContext?: {
        studentName?: string;
        packageName?: string;
        daypackage?: string;
      }
    ) => {
      if (!student.occupiedTimes || student.occupiedTimes.length === 0) {
        if (isDebugMode) {
          console.log(`  ❌ Student ${student.name} has no occupiedTimes data`);
        }
        // If no occupied times but student has zoom links, assume they should be scheduled on weekdays
        if (student.zoom_links && student.zoom_links.length > 0) {
          const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
          return { isScheduled: isWeekday, reason: "zoom_link_fallback" };
        }
        return { isScheduled: false, reason: "no_occupied_times" };
      }

      // Map daypackage to day numbers with enhanced parsing
      const daypackage = student.occupiedTimes[0]?.daypackage?.trim() || "";
      const packageName = student.package?.trim() || "";

      if (isDebugMode && debugContext?.studentName) {
        console.log(`  📅 Schedule Check for ${debugContext.studentName}:`);
        console.log(
          `    Day of Week: ${dayOfWeek} (${
            [
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ][dayOfWeek]
          })`
        );
        console.log(`    Daypackage: "${daypackage}"`);
        console.log(
          `    Package: "${debugContext.packageName || packageName}"`
        );
      }

      // Simple parsing for specific daypackage formats: All days, MWF, TTS
      const parseDaypackage = (dp: string) => {
        if (!dp || dp.trim() === "") return [];

        const dpTrimmed = dp.trim();
        
        // Handle exact matches for known formats
        if (dpTrimmed === "All days") {
          return [1, 2, 3, 4, 5]; // Monday to Friday
        }
        
        if (dpTrimmed === "MWF") {
          return [1, 3, 5]; // Monday, Wednesday, Friday
        }
        
        if (dpTrimmed === "TTS") {
          return [2, 4, 6]; // Tuesday, Thursday, Saturday
        }

        return [];
      };

      const scheduledDays = parseDaypackage(daypackage);
      let isScheduled = scheduledDays.includes(dayOfWeek);
      let reason = `daypackage=${JSON.stringify(scheduledDays)}`;

      if (isDebugMode && debugContext?.studentName) {
        console.log(`    Scheduled Days: ${JSON.stringify(scheduledDays)}`);
        console.log(`    Is Scheduled Today: ${isScheduled}`);
      }

      // Fallback: if daypackage couldn't be parsed, assume Monday-Friday
      if (scheduledDays.length === 0) {
        isScheduled = dayOfWeek >= 1 && dayOfWeek <= 5;
        reason = "default_weekdays_fallback";
        
        if (isDebugMode && debugContext?.studentName) {
          console.log(`    No daypackage match, using weekdays fallback`);
        }
      }

      return { isScheduled, reason };
    };

    // Enhanced helper function to check if student was assigned to teacher on a specific date
    const isStudentAssignedOnDate = (
      student: any,
      date: Date,
      debugContext?: { studentName?: string; dateStr?: string }
    ) => {
      if (!student.occupiedTimes || student.occupiedTimes.length === 0) {
        if (isDebugMode && debugContext?.studentName) {
          console.log(
            `  ❌ ${debugContext.studentName}: No occupiedTimes data`
          );
        }
        return false;
      }

      const assignment = student.occupiedTimes[0];
      const assignmentStart = assignment.occupied_at
        ? new Date(assignment.occupied_at)
        : null;
      const assignmentEnd = assignment.end_at
        ? new Date(assignment.end_at)
        : null;

      if (isDebugMode && debugContext?.studentName) {
        console.log(`  📋 ${debugContext.studentName} Assignment Check:`);
        console.log(`    Check Date (Ethiopia): ${debugContext.dateStr}`);
        console.log(
          `    Assignment Start: ${
            assignmentStart
              ? assignmentStart.toISOString().split("T")[0]
              : "No start date"
          }`
        );
        console.log(
          `    Assignment End: ${
            assignmentEnd
              ? assignmentEnd.toISOString().split("T")[0]
              : "No end date"
          }`
        );
      }

      // If no assignment start date, assume student was always assigned
      if (!assignmentStart) {
        if (isDebugMode && debugContext?.studentName) {
          console.log(
            `    ✅ No assignment start date - assuming always assigned`
          );
        }
        return true;
      }

      // Check if date is after assignment start
      if (date < assignmentStart) {
        if (isDebugMode && debugContext?.studentName) {
          console.log(
            `    ❌ Date is before assignment start: ${date < assignmentStart}`
          );
        }
        return false;
      }

      // Check if assignment has ended and date is after end date
      if (assignmentEnd && date > assignmentEnd) {
        if (isDebugMode && debugContext?.studentName) {
          console.log(
            `    ❌ Date is after assignment end: ${date > assignmentEnd}`
          );
        }
        return false;
      }

      if (isDebugMode && debugContext?.studentName) {
        console.log(`    ✅ Assignment valid for this date`);
      }

      return true;
    };

    // Process each day in the period with proper timezone handling
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

    // Create a safe date iterator to avoid month boundary issues
    const safeDateIterator = (startDate: Date, endDate: Date) => {
      const dates: Date[] = [];
      let currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        // Always create a new Date object to avoid mutation issues
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return dates;
    };

    const datesToProcess = safeDateIterator(fromDate, toDate);

    if (isDebugMode) {
      console.log(
        `🗓️ Processing ${datesToProcess.length} days from ${
          fromDate.toISOString().split("T")[0]
        } to ${toDate.toISOString().split("T")[0]}`
      );
      console.log(
        `📅 Dates to process:`,
        datesToProcess.map((d) => d.toISOString().split("T")[0])
      );
    }

    for (const d of datesToProcess) {
      // Convert to Ethiopia timezone (UTC+3) for proper day calculation
      const ethiopiaTime = convertToEthiopiaTime(d);
      const ethiopiaDate = ethiopiaTime.date;
      const dateStr = ethiopiaDate.toISOString().split("T")[0];
      const dayOfWeek = ethiopiaTime.dayOfWeek; // 0=Sunday, 1=Monday, etc.

      const dayName = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ][dayOfWeek];

      // Debug mode: Log each day being processed with timezone details
      if (isDebugMode) {
        console.log(`\n📍 === DATE PROCESSING ===`);
        console.log(
          `UTC Input Date: ${d.toISOString().split("T")[0]} (${d.getDay()} - ${
            [
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ][d.getDay()]
          })`
        );
        console.log(
          `Ethiopia Date: ${dateStr} (${dayName}) - Day ${dayOfWeek}`
        );
        console.log(`Timezone Offset: +3 hours (UTC+3)`);
        console.log(`UTC Input: ${ethiopiaTime.utcInput}`);
        console.log(`Ethiopia Output: ${ethiopiaTime.ethiopiaOutput}`);
        console.log(`Full Ethiopia Time Object:`, ethiopiaTime);
      }

      // Skip weekends if configured
      if (dayOfWeek === 0) {
        if (isDebugMode) console.log(`  ⏭️ Skipping Sunday`);
        continue; // Skip Sunday
      }

      // Skip future dates - only process today and past dates
      if (ethiopiaDate > today) {
        if (isDebugMode) console.log(`  ⏭️ Skipping future date`);
        continue;
      }

      // Check if there's an approved permission for this date
      const hasPermission = permissionRequests.some(
        (req) => req.requestedDate === dateStr
      );

      if (hasPermission) {
        if (isDebugMode)
          console.log(`  ✅ Has permission - skipping deduction`);
        continue; // Skip deduction if permission is approved
      }

      // Check if there's a deduction waiver for this date
      const hasWaiver = deductionWaivers.some(
        (waiver) => waiver.deductionDate.toISOString().split("T")[0] === dateStr
      );

      if (hasWaiver) {
        if (isDebugMode) console.log(`  🛡️ Has waiver - skipping deduction`);
        continue; // Skip deduction if waiver exists
      }

      // === COMPREHENSIVE ABSENCE DEDUCTION PROCESSING ===

      // Step 1: Get all students scheduled for this day
      const scheduledStudentsForDay = [];
      const studentsWithZoomLinks = new Set<string>();

      for (const student of students) {
        // Enhanced schedule checking
        const scheduleResult = isStudentScheduledOnDay(student, dayOfWeek, {
          studentName: student.name || undefined,
          packageName: student.package || undefined,
          daypackage: student.occupiedTimes[0]?.daypackage || undefined,
        });

        // Enhanced assignment checking - check both occupiedTimes and zoom links
        const assignmentResults = student.occupiedTimes
          .filter((ot) => ot.ustaz_id === teacherId)
          .map((ot) => ({
            timeSlot: ot.time_slot,
            daypackage: ot.daypackage,
            occupiedAt: ot.occupied_at,
            endAt: ot.end_at,
            isValid: isStudentAssignedOnDate(student, ethiopiaDate, {
              studentName: student.name || undefined,
              dateStr: dateStr,
            }),
          }));

        const isScheduled = scheduleResult.isScheduled;
        let isAssigned = assignmentResults.some((result) => result.isValid);
        
        // If no valid assignment found but student has zoom links from this teacher, consider them assigned
        if (!isAssigned && student.zoom_links.length > 0) {
          isAssigned = true;
          if (isDebugMode) {
            console.log(`  📹 ${student.name}: Assigned based on zoom link history`);
          }
        }

        // Check for zoom links on this date from this teacher
        const hasZoomLinkForDate = student.zoom_links.some((link) => {
          if (!link.sent_time) return false;
          const linkDate = link.sent_time.toISOString().split("T")[0];
          return linkDate === dateStr;
        });

        if (hasZoomLinkForDate) {
          studentsWithZoomLinks.add(student.wdt_ID.toString());
        }

        // If student is scheduled OR has zoom links (indicating they should be scheduled), add to processing list
        if ((isScheduled && isAssigned) || (!isScheduled && hasZoomLinkForDate)) {
          scheduledStudentsForDay.push({
            student: student,
            scheduleResult: scheduleResult,
            assignmentResults: assignmentResults,
            hasZoomLink: hasZoomLinkForDate,
          });

          if (isDebugMode) {
            console.log(`  📋 ${student.name}:`, {
              scheduled: isScheduled,
              assigned: isAssigned,
              hasZoomLink: hasZoomLinkForDate,
              reason: scheduleResult.reason,
              daypackage: student.occupiedTimes[0]?.daypackage,
              package: student.package,
            });
          }
        }
      }

      if (isDebugMode) {
        console.log(
          `  📊 Total students scheduled for ${dateStr}: ${scheduledStudentsForDay.length}`
        );
        console.log(
          `  📹 Students with zoom links: ${studentsWithZoomLinks.size}`
        );
        console.log(
          `  📅 Scheduled students:`,
          scheduledStudentsForDay.map((s) => ({
            name: s.student.name,
            package: s.student.package,
            hasZoomLink: s.hasZoomLink,
          }))
        );
      }

      // Step 2: Calculate deductions for students without zoom links
      let dailyDeduction = 0;
      const affectedStudents: any[] = [];

      for (const scheduledStudent of scheduledStudentsForDay) {
        const student = scheduledStudent.student;

        // Skip if student has zoom link
        if (scheduledStudent.hasZoomLink) {
          if (isDebugMode) {
            console.log(
              `  ✅ ${student.name}: Has zoom link - No absence deduction`
            );
          }
          continue;
        }

        // Check if student has permission attendance status
        const attendanceRecord = student.attendance_progress.find(
          (att) => att.date.toISOString().split("T")[0] === dateStr
        );
        const hasPermission =
          attendanceRecord?.attendance_status === "Permission";

        if (hasPermission) {
          if (isDebugMode) {
            console.log(
              `  ✅ ${student.name}: Has permission - No absence deduction`
            );
          }
          continue;
        }

        // Calculate deduction based on student's package
        const packageRate = packageMap[student.package || ""] || 25;
        dailyDeduction += packageRate;

        if (isDebugMode) {
          console.log(
            `  💰 ${student.name}: ABSENCE DEDUCTION - ${packageRate} ETB`
          );
          console.log(`    Package: ${student.package}`);
          console.log(
            `    Schedule Reason: ${scheduledStudent.scheduleResult.reason}`
          );
          console.log(
            `    Assignment Periods: ${JSON.stringify(
              scheduledStudent.assignmentResults
            )}`
          );
        }

        affectedStudents.push({
          studentId: student.wdt_ID,
          studentName: student.name || "Unknown Student",
          studentPackage: student.package || "Unknown Package",
          rate: packageRate,
          scheduleReason: scheduledStudent.scheduleResult.reason,
          assignmentStart: student.occupiedTimes[0]?.occupied_at,
          assignmentEnd: student.occupiedTimes[0]?.end_at,
          daypackage: student.occupiedTimes[0]?.daypackage,
          assignmentResults: scheduledStudent.assignmentResults,
        });
      }

      if (dailyDeduction > 0) {
        totalDeduction += dailyDeduction;

        if (isDebugMode) {
          console.log(`  💰 === DEDUCTION APPLIED ===`);
          console.log(
            `  Daily Total: ${dailyDeduction} ETB (${affectedStudents.length} students)`
          );
          console.log(
            `  Affected Students:`,
            affectedStudents.map((s) => ({
              name: s.studentName,
              package: s.studentPackage,
              rate: s.rate,
              scheduleReason: s.scheduleReason,
              daypackage: s.daypackage,
            }))
          );
        }

        breakdown.push({
          date: dateStr,
          studentId: affectedStudents[0]?.studentId || 0,
          studentName: affectedStudents.map((s) => s.studentName).join(", "),
          studentPackage: affectedStudents
            .map((s) => s.studentPackage)
            .join(", "),
          reason: `No zoom link sent for ${affectedStudents.length} scheduled student(s)`,
          deduction: Math.round(dailyDeduction),
          permitted: false,
          waived: false,
          affectedStudents,
        });
      } else if (isDebugMode) {
        console.log(`  ✅ No deductions for ${dateStr}`);
      }
    }

    // Debug mode: Final summary
    if (isDebugMode) {
      console.log(`\n📊 ABSENCE CALCULATION SUMMARY:`);
      console.log(`  Total Deduction: ${totalDeduction} ETB`);
      console.log(`  Breakdown Records: ${breakdown.length}`);
      console.log(`  Breakdown:`, breakdown);
    }

    return {
      totalDeduction: Math.round(totalDeduction),
      breakdown,
    };
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
