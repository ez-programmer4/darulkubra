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
 * SALARY CALCULATION NOTE:
 *
 * This calculator is based on DAYS WORKED, not actual meeting hours/duration.
 *
 * While we track actual meeting duration via Zoom webhooks (zoom_actual_duration),
 * the salary system calculates based on:
 * - Number of days the teacher had classes (teachingDays)
 * - Daily rate per student package
 * - Deductions for lateness and absences
 *
 * Actual duration tracking is used for:
 * - Transparency and reporting (teachers can see their actual hours)
 * - Future analytics and quality control
 * - Verification of attendance claims
 *
 * To view actual durations: GET /api/teachers/meeting-durations
 */
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

      // Enhanced debug for specific teacher
      const isDebugTeacher =
        teacherId.toLowerCase().includes("mubarek") ||
        teacherId.toLowerCase().includes("rahmeto");

      if (isDebugTeacher) {
        console.log(`
╔═══════════════════════════════════════════════════════════════════════════════
║ 🔍 ENHANCED DEBUG - Teacher Salary Calculation Start
╠═══════════════════════════════════════════════════════════════════════════════
║ Teacher ID: ${teacherId}
║ Teacher Name: ${teacher.ustazname || "Unknown"}
║ Period: ${fromDate.toISOString().split("T")[0]} to ${
          toDate.toISOString().split("T")[0]
        }
║ Total Students Found: ${students.length}
╠═══════════════════════════════════════════════════════════════════════════════
║ ALL STUDENTS FOR THIS TEACHER:
║ ${students
          .map(
            (s, i) => `
║   ${i + 1}. ${s.name || "Unknown"} (ID: ${s.wdt_ID})
║      - Package: ${s.package || "NOT SET ⚠️"}
║      - Day Package: ${s.daypackages || "NOT SET ⚠️"}
║      - Status: ${s.status}
║      - Zoom Links: ${s.zoom_links?.length || 0}
║      - Occupied Times: ${s.occupiedTimes?.length || 0}
║      ${
              s.zoom_links
                ?.map(
                  (zl: any, zi: number) =>
                    `\n║         Zoom ${zi + 1}: ${
                      zl.sent_time
                        ? new Date(zl.sent_time).toISOString().split("T")[0]
                        : "N/A"
                    }`
                )
                .join("") || ""
            }
`
          )
          .join("")}
╚═══════════════════════════════════════════════════════════════════════════════
        `);
      }

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
        numStudents: baseSalaryData.numStudents, // Use count of students with earnings
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

  /**
   * Helper method to check if a teacher was assigned to a student on a specific date
   * considering teacher changes
   */
  private isTeacherAssignedOnDate(
    teacherId: string,
    studentId: number,
    date: Date,
    teacherChanges: Array<{
      student_id: number;
      old_teacher_id: string | null;
      new_teacher_id: string;
      change_date: Date;
    }>,
    occupiedTimes: Array<{
      occupied_at: Date | null;
      end_at: Date | null;
    }>
  ): boolean {
    // Get all teacher changes for this student, sorted by date
    const studentChanges = teacherChanges
      .filter((tc) => tc.student_id === studentId)
      .sort((a, b) => a.change_date.getTime() - b.change_date.getTime());

    if (studentChanges.length > 0) {
      // Find the most recent change before or on this date
      let currentTeacherOnDate: string | null = null;

      for (const change of studentChanges) {
        const changeDate = new Date(change.change_date);
        changeDate.setHours(0, 0, 0, 0);
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);

        if (checkDate < changeDate) {
          // This change hasn't happened yet on checkDate
          // Use the old teacher if this is the first change
          if (studentChanges[0] === change && change.old_teacher_id) {
            currentTeacherOnDate = change.old_teacher_id;
          }
          break;
        } else {
          // This change has happened by checkDate
          currentTeacherOnDate = change.new_teacher_id;
        }
      }

      return currentTeacherOnDate === teacherId;
    }

    // No teacher changes, check regular assignment period
    for (const ot of occupiedTimes) {
      const assignmentStart = ot.occupied_at ? new Date(ot.occupied_at) : null;
      const assignmentEnd = ot.end_at ? new Date(ot.end_at) : null;

      if (assignmentStart && date < assignmentStart) continue;
      if (assignmentEnd && date > assignmentEnd) continue;

      return true;
    }

    return false;
  }

  private async getStudentForClassDate(teacherId: string, classDate: Date) {
    // This is a simplified implementation - in reality you'd need to match
    // the specific student based on the class schedule and time
    // IMPORTANT: Include students with ANY status - teacher should be paid for days taught
    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        ustaz: teacherId,
        // No status filter - include all students with zoom links on this date
      },
      select: {
        wdt_ID: true,
        name: true,
        package: true,
      },
      take: 1, // For now, just get the first student
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
          select: {
            wdt_ID: true,
            name: true,
            package: true,
            daypackages: true, // ✅ ADDED: Include daypackages field
          },
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
    // Debug flag for specific teachers
    const isDebugTeacher =
      teacherId.toLowerCase().includes("sultan") ||
      teacherId.toLowerCase().includes("mubarek") ||
      teacherId.toLowerCase().includes("rahmeto");

    if (isDebugTeacher) {
      console.log(`
🔍 DEBUG - Fetching Students for Teacher:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Teacher ID: ${teacherId}
Period: ${fromDate.toISOString().split("T")[0]} to ${
        toDate.toISOString().split("T")[0]
      }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    }

    // Get students who were assigned to this teacher during the period
    // This includes both current assignments and historical assignments
    // IMPORTANT: Include students with ANY status if they have zoom links during the period
    // This ensures teachers get paid even if student left mid-month

    // First, get current students assigned to this teacher
    // Include ALL students (any status) who were taught during the period
    // Use OR to catch both current assignments AND historical assignments (teacher changes)
    const currentStudents = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        OR: [
          // Current assignment (any status, will filter by zoom links later)
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
          // Historical assignment via occupiedTimes (any status)
          {
            occupiedTimes: {
              some: {
                ustaz_id: teacherId,
                occupied_at: { lte: toDate },
                OR: [{ end_at: null }, { end_at: { gte: fromDate } }],
              },
            },
          },
        ],
      },
      select: {
        wdt_ID: true,
        name: true,
        package: true,
        daypackages: true, // ✅ ADDED: Include daypackages field
        status: true,
        occupiedTimes: {
          where: {
            ustaz_id: teacherId,
            occupied_at: { lte: toDate },
            OR: [{ end_at: null }, { end_at: { gte: fromDate } }],
          },
          select: {
            time_slot: true,
            daypackage: true, // ✅ ADDED: Include daypackage field
            occupied_at: true,
            end_at: true,
          },
        },
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
    // Include students with ANY status - teacher should be paid if they taught during the period
    const historicalStudents =
      historicalStudentIds.size > 0
        ? await prisma.wpos_wpdatatable_23.findMany({
            where: {
              wdt_ID: { in: Array.from(historicalStudentIds) },
              // No status filter - include all students with zoom links during period
            },
            select: {
              wdt_ID: true,
              name: true,
              package: true,
              daypackages: true, // ✅ ADDED: Include daypackages field
              status: true,
              occupiedTimes: {
                where: {
                  ustaz_id: teacherId,
                  occupied_at: { lte: toDate },
                  OR: [{ end_at: null }, { end_at: { gte: fromDate } }],
                },
                select: {
                  time_slot: true,
                  daypackage: true, // ✅ ADDED: Include daypackage field
                  occupied_at: true,
                  end_at: true,
                },
              },
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
    // CRITICAL: Include students with ANY status if zoom links exist
    // Rationale: If teacher sent zoom links and taught the student, they deserve payment
    // Even if student left mid-month, teacher should be paid for days taught
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
            daypackages: true, // ✅ ADDED: Include daypackages field
            status: true, // Include status for debugging, but don't filter by it
            occupiedTimes: {
              where: {
                ustaz_id: teacherId,
                occupied_at: { lte: toDate },
                OR: [{ end_at: null }, { end_at: { gte: fromDate } }],
              },
              select: {
                time_slot: true,
                daypackage: true, // ✅ ADDED: Include daypackage field
                occupied_at: true,
                end_at: true,
              },
            },
          },
        },
      },
      distinct: ["studentid"],
    });

    // Add students found through zoom links
    // Include ALL students regardless of status - if teacher sent zoom links, they should be paid
    const existingStudentIds = new Set(allStudents.map((s) => s.wdt_ID));

    for (const zoomLink of zoomLinkStudents) {
      const student = zoomLink.wpos_wpdatatable_23;
      if (student && !existingStudentIds.has(student.wdt_ID)) {
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
          daypackages: student.daypackages, // ✅ ADDED: Include daypackages field
          status: student.status,
          occupiedTimes: student.occupiedTimes || [], // ✅ ADDED: Include occupied_times
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
            package: true,
            daypackages: true, // ✅ ADDED: Include daypackages field
            ustaz: true,
          },
        },
      },
      orderBy: { sent_time: "desc" },
    });

    if (isDebugTeacher) {
      // SPECIAL DEBUG: Check if Akram Khalid exists in database
      const allAkramStudents = await prisma.wpos_wpdatatable_23.findMany({
        select: {
          wdt_ID: true,
          name: true,
          package: true,
          daypackages: true,
          status: true,
          ustaz: true,
          occupiedTimes: {
            select: {
              ustaz_id: true,
              time_slot: true,
              daypackage: true,
              occupied_at: true,
              end_at: true,
            },
          },
          zoom_links: {
            where: {
              sent_time: { gte: fromDate, lte: toDate },
            },
            select: {
              ustazid: true,
              sent_time: true,
            },
          },
        },
      });

      // Filter for students with "akram" in name (case insensitive)
      const akramCheck = allAkramStudents.filter(
        (s) =>
          s.name?.toLowerCase().includes("akram") ||
          s.name?.toLowerCase().includes("khalid")
      );

      console.log(`
╔═══════════════════════════════════════════════════════════════════════════════
║ 🔍 SPECIAL DEBUG - AKRAM KHALID CHECK
╠═══════════════════════════════════════════════════════════════════════════════
║ Found ${akramCheck.length} students with "akram" or "khalid" in name:
${akramCheck
  .map(
    (s: any, i: number) => `
║   ${i + 1}. ${s.name} (ID: ${s.wdt_ID})
║      - Current Teacher: ${s.ustaz || "NOT ASSIGNED"}
║      - Package: ${s.package || "NOT SET"}
║      - Day Package: ${s.daypackages || "NOT SET"}
║      - Status: ${s.status}
║      - Occupied Times: ${s.occupiedTimes?.length || 0}
${
  s.occupiedTimes
    ?.map(
      (ot: any, oti: number) => `
║        OT${oti + 1}: Teacher=${ot.ustaz_id}, TimeSlot=${
        ot.time_slot
      }, DayPkg=${ot.daypackage}
║             Start=${
        ot.occupied_at
          ? new Date(ot.occupied_at).toISOString().split("T")[0]
          : "N/A"
      }
║             End=${
        ot.end_at ? new Date(ot.end_at).toISOString().split("T")[0] : "ONGOING"
      }
`
    )
    .join("") || ""
}
║      - Zoom Links in Period: ${s.zoom_links?.length || 0}
${
  s.zoom_links
    ?.map(
      (zl: any, zli: number) => `
║        Zoom${zli + 1}: Teacher=${zl.ustazid}, Date=${
        zl.sent_time
          ? new Date(zl.sent_time).toISOString().split("T")[0]
          : "N/A"
      }
`
    )
    .join("") || ""
}
`
  )
  .join("")}
╚═══════════════════════════════════════════════════════════════════════════════
      `);

      console.log(`
📊 DEBUG - Students Found Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Students Found: ${allStudents.length}
Current Students: ${currentStudents.length}
Historical Students: ${historicalStudents.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Zoom Links Found: ${allTeacherZoomLinks.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Students List:
${allStudents
  .map(
    (s, i) => `
  ${i + 1}. ${s.name || "Unknown"} (ID: ${s.wdt_ID})
     - Package: ${s.package || "NOT SET ⚠️"}
     - Day Package: ${s.daypackages || "NOT SET ⚠️"}
     - Status: ${s.status}
     - Zoom Links: ${s.zoom_links?.length || 0}
     - Occupied Times: ${s.occupiedTimes?.length || 0}
`
  )
  .join("")}

Zoom Links Breakdown:
${allTeacherZoomLinks
  .map(
    (link, i) => `
  ${i + 1}. Student: ${link.wpos_wpdatatable_23?.name || "Unknown"} (ID: ${
      link.studentid
    })
     - Sent: ${new Date(link.sent_time!).toISOString()}
     - Current Teacher: ${link.wpos_wpdatatable_23?.ustaz}
     - Package: ${link.wpos_wpdatatable_23?.package || "NOT SET"}
     - Day Package: ${link.wpos_wpdatatable_23?.daypackages || "NOT SET"}
`
  )
  .join("")}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    }

    return allStudents;
  }

  /**
   * Calculate expected teaching days based on student's daypackage
   */
  private calculateExpectedTeachingDays(
    fromDate: Date,
    toDate: Date,
    daypackage: string
  ): string[] {
    const expectedDays: string[] = [];

    if (!daypackage || daypackage.trim() === "") {
      // If no daypackage, use all days (let Sunday setting decide)
      const current = new Date(fromDate);
      while (current <= toDate) {
        const zonedDate = toZonedTime(current, TZ);
        const isSunday = zonedDate.getDay() === 0;
        const shouldInclude = this.config.includeSundays || !isSunday;

        if (shouldInclude) {
          const year = zonedDate.getFullYear();
          const month = String(zonedDate.getMonth() + 1).padStart(2, "0");
          const day = String(zonedDate.getDate()).padStart(2, "0");
          expectedDays.push(`${year}-${month}-${day}`);
        }

        current.setUTCDate(current.getUTCDate() + 1);
      }
      return expectedDays;
    }

    // Parse daypackage to get expected days of week
    const expectedDaysOfWeek = this.parseDaypackage(daypackage);

    // Calculate all days in the period that match the daypackage
    const current = new Date(fromDate);
    while (current <= toDate) {
      const zonedDate = toZonedTime(current, TZ);
      const dayOfWeek = zonedDate.getDay();

      // Check if this day matches the daypackage
      if (expectedDaysOfWeek.includes(dayOfWeek)) {
        const year = zonedDate.getFullYear();
        const month = String(zonedDate.getMonth() + 1).padStart(2, "0");
        const day = String(zonedDate.getDate()).padStart(2, "0");
        expectedDays.push(`${year}-${month}-${day}`);
      }

      current.setUTCDate(current.getUTCDate() + 1);
    }

    return expectedDays;
  }

  /**
   * Parse daypackage string to get array of day numbers (0=Sunday, 1=Monday, etc.)
   * Only handles: "All days", "MWF", "TTS"
   */
  private parseDaypackage(daypackage: string): number[] {
    if (!daypackage || daypackage.trim() === "") {
      return [];
    }

    const dpTrimmed = daypackage.trim().toUpperCase();

    // Only these three patterns are used in the system
    if (dpTrimmed === "ALL DAYS" || dpTrimmed === "ALLDAYS") {
      return [0, 1, 2, 3, 4, 5, 6]; // Sunday to Saturday
    }
    if (dpTrimmed === "MWF") {
      return [1, 3, 5]; // Monday, Wednesday, Friday
    }
    if (dpTrimmed === "TTS" || dpTrimmed === "TTH") {
      return [2, 4, 6]; // Tuesday, Thursday, Saturday
    }

    return [];
  }

  /**
   * Calculate working days in a period based on Sunday inclusion setting
   * Fixed: Properly handles month boundaries and avoids extra days
   */
  private calculateWorkingDays(fromDate: Date, toDate: Date): number {
    let workingDays = 0;

    // Use a simple, reliable approach with proper date handling
    const current = new Date(fromDate);
    const end = new Date(toDate);

    // Reset to start of day to avoid time issues
    current.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    while (current <= end) {
      // Get day of week (0 = Sunday, 1 = Monday, etc.)
      const dayOfWeek = current.getDay();
      const isSunday = dayOfWeek === 0;
      const shouldInclude = this.config.includeSundays || !isSunday;

      // Format date properly
      const dateStr = format(current, "yyyy-MM-dd");

      if (shouldInclude) {
        workingDays++;
      }

      // Move to next day safely using milliseconds
      current.setTime(current.getTime() + 24 * 60 * 60 * 1000);
    }

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
    const studentBreakdown: Array<{
      studentName: string;
      package: string;
      monthlyRate: number;
      dailyRate: number;
      daysWorked: number;
      totalEarned: number;
      periods?: Array<any>;
      teacherChanges: boolean;
      debugInfo?: any;
    }> = [];
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
      // Debug flag for specific teacher and student
      const isDebugStudent =
        student.name?.toLowerCase().includes("kassim kedir") ||
        student.name?.toLowerCase().includes("abdulbasit") ||
        student.name?.toLowerCase().includes("akram") ||
        student.name?.toLowerCase().includes("khalid") ||
        teacherId.toLowerCase().includes("sultan") ||
        teacherId.toLowerCase().includes("mubarek") ||
        teacherId.toLowerCase().includes("rahmeto");

      // Get package salary (use 0 if no package configured)
      const monthlyPackageSalary =
        student.package && salaryMap[student.package]
          ? Number(salaryMap[student.package])
          : 0;
      const dailyRate = Number((monthlyPackageSalary / workingDays).toFixed(2));

      // Note: We still process students even without a package configured
      // because daypackage determines expected teaching days, not package

      // Get teacher periods for this student
      const periods = teacherPeriods.get(student.wdt_ID.toString()) || [];

      if (isDebugStudent) {
        console.log(`
🔍 DEBUG - Teacher Periods for ${student.name}:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Student ID: ${student.wdt_ID}
Teacher Periods Found: ${periods.length}
${periods
  .map(
    (p, i) => `
Period ${i + 1}:
  Start: ${p.start.toISOString().split("T")[0]}
  End: ${p.end ? p.end.toISOString().split("T")[0] : "ONGOING"}
`
  )
  .join("")}
Zoom Links: ${student.zoom_links?.length || 0}
${
  student.zoom_links
    ?.map(
      (link: any, i: number) => `
  ${i + 1}. ${new Date(link.sent_time!).toISOString().split("T")[0]}
`
    )
    .join("") || "None"
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `);
      }

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

      // Debug info for specific student
      const debugInfo: any = isDebugStudent
        ? {
            studentName: student.name,
            studentId: student.wdt_ID,
            package: student.package,
            daypackage: student.daypackages,
            zoomLinksTotal: student.zoom_links?.length || 0,
            zoomLinkDates:
              student.zoom_links
                ?.map((link: any) =>
                  link.sent_time
                    ? new Date(link.sent_time).toISOString().split("T")[0]
                    : null
                )
                .filter(Boolean) || [],
            periods: [],
          }
        : null;

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

        // Get daypackage from occupied_times or student record
        // Priority: occupied_times.daypackage > student.daypackages
        let studentDaypackage = "";

        // Try to get daypackage from student's occupied_times
        if (student.occupiedTimes && student.occupiedTimes.length > 0) {
          const relevantOccupiedTimes = student.occupiedTimes.filter(
            (ot: any) => {
              const assignmentStart = ot.occupied_at
                ? new Date(ot.occupied_at)
                : null;
              const assignmentEnd = ot.end_at ? new Date(ot.end_at) : null;
              if (assignmentStart && periodStart < assignmentStart)
                return false;
              if (assignmentEnd && periodEnd > assignmentEnd) return false;
              return true;
            }
          );

          if (
            relevantOccupiedTimes.length > 0 &&
            relevantOccupiedTimes[0].daypackage
          ) {
            studentDaypackage = relevantOccupiedTimes[0].daypackage;
          }
        }

        // Fallback to student record daypackages
        if (!studentDaypackage && student.daypackages) {
          studentDaypackage = student.daypackages;
        }

        // Now consider daypackage to determine expected teaching days
        const expectedTeachingDays = this.calculateExpectedTeachingDays(
          periodStart,
          periodEnd,
          studentDaypackage
        );

        // Create debug info for this period (after expectedTeachingDays is calculated)
        if (isDebugStudent && debugInfo) {
          const periodDebugInfo = {
            period: `${periodStart.toISOString().split("T")[0]} to ${
              periodEnd.toISOString().split("T")[0]
            }`,
            zoomLinksInPeriod: periodZoomLinks.length,
            zoomLinkDates: periodZoomLinks.map(
              (link: any) =>
                new Date(link.sent_time).toISOString().split("T")[0]
            ),
            expectedTeachingDays: expectedTeachingDays.length,
            teachingDates: [],
            dailyRate: dailyRate,
            periodEarnings: 0,
          };
          debugInfo.periods.push(periodDebugInfo);
        }

        // Use expected teaching days based on daypackage, but only count days with zoom links
        expectedTeachingDays.forEach((dateStr) => {
          if (dailyLinks.has(dateStr)) {
            teachingDates.add(dateStr);
          }
        });

        if (isDebugStudent && debugInfo && debugInfo.periods.length > 0) {
          const currentPeriodDebug =
            debugInfo.periods[debugInfo.periods.length - 1];
          currentPeriodDebug.teachingDates = Array.from(teachingDates);
          currentPeriodDebug.periodEarnings = Number(
            (dailyRate * teachingDates.size).toFixed(2)
          );
        }

        const periodEarnings = Number(
          (dailyRate * teachingDates.size).toFixed(2)
        );
        totalEarned += periodEarnings;

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

      // Calculate actual days worked for this student
      const studentTeachingDates = new Set<string>();
      periodBreakdown.forEach((period: any) => {
        period.teachingDates.forEach((date: string) => {
          studentTeachingDates.add(date);
        });
      });

      // Debug logging for specific students
      if (isDebugStudent) {
        console.log(`
🔍 DEBUG - Student Breakdown Analysis:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Student: ${student.name || "Unknown"}
Student ID: ${student.wdt_ID}
Teacher ID: ${teacherId}
Package: ${student.package || "NOT SET ⚠️"}
Day Package: ${student.daypackages || "NOT SET ⚠️"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Monthly Rate: ${monthlyPackageSalary} ETB
Daily Rate: ${dailyRate} ETB
Working Days in Month: ${workingDays}
Days Worked: ${studentTeachingDates.size}
Total Earned: ${totalEarned} ETB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Zoom Links Count: ${student.zoom_links?.length || 0}
Teacher Periods: ${periods.length}
Period Breakdown: ${periodBreakdown.length} periods
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${
  totalEarned > 0
    ? "✅ INCLUDED in breakdown"
    : "❌ EXCLUDED from breakdown (totalEarned = 0)"
}

${
  totalEarned === 0
    ? `
❌ EXCLUSION REASON:
  ${
    monthlyPackageSalary === 0
      ? "- Package salary is 0 (no package configured or package not found)"
      : ""
  }
  ${dailyRate === 0 ? "- Daily rate is 0" : ""}
  ${
    studentTeachingDates.size === 0
      ? "- No teaching dates counted (check daypackage and zoom links)"
      : ""
  }
  ${periods.length === 0 ? "- No teacher periods found" : ""}
  ${periodBreakdown.length === 0 ? "- No period breakdown generated" : ""}
`
    : ""
}
Debug Info: ${JSON.stringify(debugInfo, null, 2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `);
      }

      if (totalEarned > 0) {
        studentBreakdown.push({
          studentName: student.name || "Unknown",
          package: student.package || "Unknown",
          monthlyRate: monthlyPackageSalary,
          dailyRate: dailyRate,
          daysWorked: studentTeachingDates.size,
          totalEarned: totalEarned,
          periods: periodBreakdown,
          teacherChanges: periods.length > 1,
          debugInfo: debugInfo, // Add debug info for UI display
        });
      } else if (isDebugStudent) {
        // Add excluded students to breakdown with debug flag for troubleshooting
        studentBreakdown.push({
          studentName: student.name || "Unknown",
          package: student.package || "Unknown",
          monthlyRate: monthlyPackageSalary,
          dailyRate: dailyRate,
          daysWorked: studentTeachingDates.size,
          totalEarned: 0,
          periods: periodBreakdown,
          teacherChanges: periods.length > 1,
          debugInfo: {
            ...debugInfo,
            excluded: true,
            exclusionReasons: [
              monthlyPackageSalary === 0 ? "Package salary is 0" : null,
              dailyRate === 0 ? "Daily rate is 0" : null,
              studentTeachingDates.size === 0
                ? "No teaching dates counted"
                : null,
              periods.length === 0 ? "No teacher periods" : null,
              student.zoom_links?.length || 0 > 0
                ? null
                : "No zoom links found",
            ].filter(Boolean),
          },
        });
      }
    }

    const totalSalary = Number(
      Array.from(dailyEarnings.values())
        .reduce((sum, amount) => sum + amount, 0)
        .toFixed(2)
    );

    // Calculate actual teaching days (unique dates with earnings)
    const actualTeachingDays = dailyEarnings.size;

    const averageDailyEarning =
      actualTeachingDays > 0
        ? Number((totalSalary / actualTeachingDays).toFixed(2))
        : 0;

    // Count only students who actually earned something for this teacher
    // Exclude students who were transferred away and have no earnings
    const activeStudentCount = studentBreakdown.filter(
      (student) => student.totalEarned > 0
    ).length;

    // Final debug summary for MUBAREK RAHMETO
    const isFinalDebugTeacher =
      teacherId.toLowerCase().includes("mubarek") ||
      teacherId.toLowerCase().includes("rahmeto");

    if (isFinalDebugTeacher) {
      console.log(`
╔═══════════════════════════════════════════════════════════════════════════════
║ 🔍 FINAL DEBUG SUMMARY - BASE SALARY CALCULATION
╠═══════════════════════════════════════════════════════════════════════════════
║ Teacher ID: ${teacherId}
║ Total Students Processed: ${students.length}
║ Students in Breakdown: ${studentBreakdown.length}
║ Active Students (earned > 0): ${activeStudentCount}
║ Total Salary: ${totalSalary}
║ Teaching Days: ${actualTeachingDays}
║ Working Days: ${workingDays}
╠═══════════════════════════════════════════════════════════════════════════════
║ BREAKDOWN DETAILS:
${studentBreakdown
  .map(
    (sb, i) => `
║   ${i + 1}. ${sb.studentName} - ${sb.totalEarned} ETB
║      Package: ${sb.package}
║      Days Worked: ${sb.daysWorked}
║      Daily Rate: ${sb.dailyRate}
║      Included: ${sb.totalEarned > 0 ? "✅ YES" : "❌ NO"}
║      ${
      sb.debugInfo?.excluded
        ? `Exclusion Reasons: ${sb.debugInfo.exclusionReasons?.join(", ")}`
        : ""
    }
`
  )
  .join("")}
╠═══════════════════════════════════════════════════════════════════════════════
║ STUDENTS NOT IN BREAKDOWN:
${students
  .filter((s) => !studentBreakdown.find((sb) => sb.studentName === s.name))
  .map(
    (s, i) => `
║   ${i + 1}. ${s.name} (ID: ${s.wdt_ID})
║      Package: ${s.package || "NOT SET"}
║      Day Package: ${s.daypackages || "NOT SET"}
║      Status: ${s.status}
║      Zoom Links: ${s.zoom_links?.length || 0}
║      Occupied Times: ${s.occupiedTimes?.length || 0}
║      ⚠️ REASON: Not processed in calculateBaseSalary - check assignment periods
`
  )
  .join("")}
╚═══════════════════════════════════════════════════════════════════════════════
      `);
    }

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
      numStudents: activeStudentCount, // Return the count of students with earnings
    };
  }

  private async calculateLatenessDeductions(
    teacherId: string,
    assignments: any[],
    fromDate: Date,
    toDate: Date,
    isDebugMode: boolean = false
  ) {
    // Get teacher change history for this teacher
    const teacherChanges = await prisma.teacher_change_history.findMany({
      where: {
        OR: [{ old_teacher_id: teacherId }, { new_teacher_id: teacherId }],
        change_date: {
          gte: fromDate,
          lte: toDate,
        },
      },
      select: {
        student_id: true,
        old_teacher_id: true,
        new_teacher_id: true,
        change_date: true,
      },
    });

    // Get ALL students for this teacher (EXACT same as preview API)
    // Use OR to catch both current assignments AND historical assignments (teacher changes)
    // IMPORTANT: Include students with ANY status - teacher should be paid for days taught
    // even if student left mid-month
    const allStudents = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        OR: [
          // Current assignment (any status)
          {
            ustaz: teacherId,
            // No status filter - include all students with zoom links
          },
          // Historical assignment via occupiedTimes (any status)
          {
            occupiedTimes: {
              some: {
                ustaz_id: teacherId,
              },
            },
          },
        ],
      },
      select: {
        wdt_ID: true,
        name: true,
        package: true,
        daypackages: true, // ✅ ADDED: Include daypackages field
        zoom_links: true, // Get ALL zoom links (filter later)
        occupiedTimes: {
          select: {
            time_slot: true,
            daypackage: true, // ✅ ADDED: Include daypackage field
          },
        },
      },
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

    // Group zoom links by date (EXACT same logic as preview API)
    const dailyZoomLinks = new Map<string, any[]>();

    for (const student of allStudents) {
      student.zoom_links?.forEach((link: any) => {
        if (link.sent_time) {
          const dateStr = format(link.sent_time, "yyyy-MM-dd");
          if (!dailyZoomLinks.has(dateStr)) {
            dailyZoomLinks.set(dateStr, []);
          }
          dailyZoomLinks.get(dateStr)!.push({
            ...link,
            studentId: student.wdt_ID,
            studentName: student.name,
            studentPackage: student.package,
            timeSlot: student.occupiedTimes?.[0]?.time_slot,
          });
        }
      });
    }

    // Calculate lateness for each day (EXACT same logic as preview API)
    for (const [dateStr, links] of dailyZoomLinks.entries()) {
      const date = new Date(dateStr);
      if (date < fromDate || date > toDate) continue;

      // Check if there's a lateness waiver for this date
      const hasLatenessWaiver = latenessWaivers.some(
        (waiver) => format(waiver.deductionDate, "yyyy-MM-dd") === dateStr
      );

      if (hasLatenessWaiver) {
        continue;
      }

      // Group by student and take earliest link per student per day
      const studentLinks = new Map<number, any>();
      links.forEach((link: any) => {
        const key = link.studentId;
        if (
          !studentLinks.has(key) ||
          link.sent_time < studentLinks.get(key).sent_time
        ) {
          studentLinks.set(key, link);
        }
      });

      // Calculate lateness for each student's earliest link
      for (const link of studentLinks.values()) {
        if (!link.timeSlot) {
          continue;
        }

        // Convert time to 24-hour format
        function convertTo24Hour(timeStr: string): string {
          if (!timeStr) return "00:00";

          if (timeStr.includes("AM") || timeStr.includes("PM")) {
            const match = timeStr.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
            if (match) {
              let hour = parseInt(match[1]);
              const minute = match[2];
              const period = match[3].toUpperCase();

              if (period === "PM" && hour !== 12) hour += 12;
              if (period === "AM" && hour === 12) hour = 0;

              return `${hour.toString().padStart(2, "0")}:${minute}`;
            }
          }

          return timeStr.includes(":")
            ? timeStr.split(":").slice(0, 2).join(":")
            : "00:00";
        }

        const time24 = convertTo24Hour(link.timeSlot);
        const [schedHours, schedMinutes] = time24.split(":").map(Number);

        // Create scheduled time on the same day as sent_time
        // Both should be in the same timezone for accurate comparison
        const scheduledTime = new Date(link.sent_time);
        scheduledTime.setHours(schedHours, schedMinutes, 0, 0);

        // Calculate lateness in minutes
        const latenessMinutes = Math.round(
          (link.sent_time.getTime() - scheduledTime.getTime()) / 60000
        );

        // Skip if early (negative lateness)
        if (latenessMinutes < 0) {
          continue;
        }

        if (latenessMinutes > excusedThreshold) {
          let deduction = 0;
          let tier = "No Tier";

          // Get student's package for package-specific deduction
          const student = allStudents.find((s) => s.wdt_ID === link.studentId);
          const studentPackage = student?.package || "";
          const baseDeductionAmount = packageMap[studentPackage] || 30;

          // Find appropriate tier
          for (const [i, t] of latenessConfigs.entries()) {
            if (
              latenessMinutes >= t.startMinute &&
              latenessMinutes <= t.endMinute
            ) {
              deduction = Math.round(
                baseDeductionAmount * ((t.deductionPercent || 0) / 100)
              );
              tier = `Tier ${i + 1} (${t.deductionPercent}%)`;
              break;
            }
          }

          if (deduction > 0) {
            totalDeduction += deduction;

            breakdown.push({
              date: dateStr,
              studentName: link.studentName || "Unknown Student",
              scheduledTime: link.timeSlot,
              actualTime: link.sent_time.toTimeString().split(" ")[0],
              latenessMinutes,
              tier,
              deduction: Number(deduction.toFixed(2)),
            });
          }
        }
      }
    }

    return {
      totalDeduction: Number(totalDeduction.toFixed(2)),
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
      // Don't process future dates
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const effectiveToDate = toDate > today ? today : toDate;

      // Get teacher change history for this teacher
      const teacherChanges = await prisma.teacher_change_history.findMany({
        where: {
          OR: [{ old_teacher_id: teacherId }, { new_teacher_id: teacherId }],
          change_date: {
            gte: fromDate,
            lte: effectiveToDate,
          },
        },
        select: {
          student_id: true,
          old_teacher_id: true,
          new_teacher_id: true,
          change_date: true,
        },
      });

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
      // IMPORTANT: Include students with ANY status - teacher should be evaluated for all students taught
      // even if student left mid-month (they should still get deductions for missed days before leaving)
      const students = await prisma.wpos_wpdatatable_23.findMany({
        where: {
          OR: [
            // Current assignments (any status)
            {
              ustaz: teacherId,
              // No status filter - include all students
              occupiedTimes: {
                some: {
                  ustaz_id: teacherId,
                  occupied_at: { lte: effectiveToDate },
                  OR: [{ end_at: null }, { end_at: { gte: fromDate } }],
                },
              },
            },
            // Historical assignments from audit logs (any status)
            {
              // No status filter - include all students
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

      let totalDeduction = 0;
      const breakdown: any[] = [];

      // Helper function to parse daypackage
      const parseDaypackage = (dp: string): number[] => {
        if (!dp || dp.trim() === "") {
          return [];
        }

        const dpTrimmed = dp.trim().toUpperCase();

        // Common patterns
        if (dpTrimmed === "ALL DAYS" || dpTrimmed === "ALLDAYS") {
          return [0, 1, 2, 3, 4, 5, 6]; // Sunday to Saturday
        }
        if (dpTrimmed === "MWF") {
          return [1, 3, 5]; // Monday, Wednesday, Friday
        }
        if (dpTrimmed === "TTS" || dpTrimmed === "TTH") {
          return [2, 4, 6]; // Tuesday, Thursday, Saturday
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
          return [dayMap[dpTrimmed]];
        }

        // Check for numeric patterns
        const numericMatch = dpTrimmed.match(/\d+/g);
        if (numericMatch) {
          const days = numericMatch.map(Number).filter((d) => d >= 0 && d <= 6);
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
          return days;
        }

        return [];
      };

      // Calculate working days for this period
      const workingDays = this.calculateWorkingDays(fromDate, effectiveToDate);

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
        // Skip Sunday unless configured to include
        if (dayOfWeek === 0 && !this.config.includeSundays) {
          continue;
        }

        // Skip if waived or permitted
        if (waivedDates.has(dateStr)) {
          continue;
        }
        if (permittedDates.has(dateStr)) {
          continue;
        }

        let dailyDeduction = 0;
        const affectedStudents: any[] = [];

        // Check each student
        for (const student of students) {
          // Check if teacher was actually assigned to this student on this date
          // considering teacher changes
          const isAssigned = this.isTeacherAssignedOnDate(
            teacherId,
            student.wdt_ID,
            d,
            teacherChanges,
            student.occupiedTimes || []
          );

          if (!isAssigned) {
            continue;
          }

          // Get relevant occupied times for daypackage checking
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

          // If no occupied times, check if student has zoom links during the period
          // If yes, assume they should be taught and check their daypackage
          if (relevantOccupiedTimes.length === 0) {
            // Check if student has any zoom links during the period
            const hasZoomLinksInPeriod = student.zoom_links?.some(
              (link: any) => {
                if (!link.sent_time) return false;
                const linkDate = new Date(link.sent_time);
                return linkDate >= fromDate && linkDate <= effectiveToDate;
              }
            );

            if (!hasZoomLinksInPeriod) {
              continue;
            }

            // Student has zoom links but no occupied times - use all occupied times
            // This handles cases where occupied times might be missing
            if (student.occupiedTimes.length > 0) {
              relevantOccupiedTimes.push(...student.occupiedTimes);
            } else {
              continue;
            }
          }

          // Check if student is scheduled on this day
          let isScheduled = false;
          let scheduledDays: number[] = [];
          for (const ot of relevantOccupiedTimes) {
            const parsedDays = parseDaypackage(ot.daypackage || "");
            scheduledDays = [...new Set([...scheduledDays, ...parsedDays])];

            if (parsedDays.includes(dayOfWeek)) {
              isScheduled = true;
            }
          }

          // Fallback: if no daypackage at all but has zoom links, assume weekdays
          // Only apply fallback if scheduledDays is empty (no daypackage defined)
          if (
            !isScheduled &&
            scheduledDays.length === 0 &&
            student.zoom_links?.length > 0
          ) {
            isScheduled = dayOfWeek >= 1 && dayOfWeek <= 5;
          }

          if (!isScheduled) {
            continue;
          }

          // Check if student has zoom link for this date
          const hasZoomLink = student.zoom_links?.some((link: any) => {
            if (!link.sent_time) return false;
            const linkDate = format(new Date(link.sent_time), "yyyy-MM-dd");
            return linkDate === dateStr;
          });

          if (hasZoomLink) {
            continue;
          }

          // Check attendance permission
          const attendanceRecord = student.attendance_progress?.find(
            (att: any) => {
              const attDate = format(new Date(att.date), "yyyy-MM-dd");
              return attDate === dateStr;
            }
          );

          if (attendanceRecord?.attendance_status === "Permission") {
            continue;
          }

          // Apply deduction
          const packageRate = packageMap[student.package || ""] || 25;
          dailyDeduction += packageRate;

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

          // Add individual student entries to breakdown for detailed view
          affectedStudents.forEach((student) => {
            breakdown.push({
              date: dateStr,
              studentId: student.studentId,
              studentName: student.studentName,
              studentPackage: student.studentPackage,
              reason: "No zoom link sent",
              deduction: Number(student.rate.toFixed(2)),
              permitted: false,
              waived: false,
            });
          });
        }
      }

      return {
        totalDeduction: Number(totalDeduction.toFixed(2)),
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

    return Number((totalQualityBonus + totalRecordBonus).toFixed(2));
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
 * Uses centralized configuration for consistency
 */
export async function createSalaryCalculator(): Promise<SalaryCalculator> {
  // Import centralized config loader
  const { getSalaryConfig } = await import("./salary-config");

  // Load configuration from centralized config
  const salaryConfig = await getSalaryConfig();

  const config: SalaryCalculationConfig = {
    includeSundays: salaryConfig.includeSundays,
    excusedThreshold: salaryConfig.latenessConfig.excusedThreshold,
    latenessTiers: salaryConfig.latenessConfig.tiers,
    packageDeductions: salaryConfig.packageDeductions,
  };

  return new SalaryCalculator(config);
}
