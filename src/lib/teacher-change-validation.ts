import { prisma } from "@/lib/prisma";

export interface TeacherChangeConflict {
  studentId: number;
  studentName: string;
  oldTeacherId: string;
  oldTeacherName: string;
  newTeacherId: string;
  newTeacherName: string;
  changeDate: Date;
  conflictType: "overlapping_payment" | "duplicate_assignment";
  message: string;
}

export interface TeacherChangeValidationResult {
  hasConflicts: boolean;
  conflicts: TeacherChangeConflict[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Validates teacher changes to prevent payment conflicts and duplicate assignments
 */
export class TeacherChangeValidator {
  /**
   * Validates a teacher change for potential conflicts
   */
  static async validateTeacherChange(
    studentId: number,
    oldTeacherId: string,
    newTeacherId: string,
    changeDate: Date,
    period: string
  ): Promise<TeacherChangeValidationResult> {
    const conflicts: TeacherChangeConflict[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      // Get student information
      const student = await prisma.wpos_wpdatatable_23.findUnique({
        where: { wdt_ID: studentId },
        select: { name: true, package: true },
      });

      if (!student) {
        return {
          hasConflicts: true,
          conflicts: [
            {
              studentId,
              studentName: "Unknown Student",
              oldTeacherId,
              oldTeacherName: "Unknown Teacher",
              newTeacherId,
              newTeacherName: "Unknown Teacher",
              changeDate,
              conflictType: "duplicate_assignment",
              message: "Student not found",
            },
          ],
          warnings: [],
          recommendations: [],
        };
      }

      // Get teacher information
      const [oldTeacher, newTeacher] = await Promise.all([
        prisma.wpos_wpdatatable_24.findUnique({
          where: { ustazid: oldTeacherId },
          select: { ustazname: true },
        }),
        prisma.wpos_wpdatatable_24.findUnique({
          where: { ustazid: newTeacherId },
          select: { ustazname: true },
        }),
      ]);

      const oldTeacherName = oldTeacher?.ustazname || "Unknown Teacher";
      const newTeacherName = newTeacher?.ustazname || "Unknown Teacher";

      // Check for existing payments in the same period
      const existingPayments = await prisma.teachersalarypayment.findMany({
        where: {
          period,
          OR: [{ teacherId: oldTeacherId }, { teacherId: newTeacherId }],
        },
        select: { teacherId: true, status: true },
      });

      // Check if old teacher already has a paid salary for this period
      const oldTeacherPaid = existingPayments.find(
        (p) => p.teacherId === oldTeacherId && p.status === "Paid"
      );

      if (oldTeacherPaid) {
        conflicts.push({
          studentId,
          studentName: student.name || "Unknown Student",
          oldTeacherId,
          oldTeacherName,
          newTeacherId,
          newTeacherName,
          changeDate,
          conflictType: "overlapping_payment",
          message: `Old teacher ${oldTeacherName} already has a paid salary for period ${period}. Payment may need adjustment.`,
        });
        recommendations.push(
          "Consider creating a prorated payment adjustment for the old teacher"
        );
      }

      // Check if new teacher already has a paid salary for this period
      const newTeacherPaid = existingPayments.find(
        (p) => p.teacherId === newTeacherId && p.status === "Paid"
      );

      if (newTeacherPaid) {
        conflicts.push({
          studentId,
          studentName: student.name || "Unknown Student",
          oldTeacherId,
          oldTeacherName,
          newTeacherId,
          newTeacherName,
          changeDate,
          conflictType: "overlapping_payment",
          message: `New teacher ${newTeacherName} already has a paid salary for period ${period}. Payment may need adjustment.`,
        });
        recommendations.push(
          "Consider creating a prorated payment adjustment for the new teacher"
        );
      }

      // Check for duplicate assignments
      const existingAssignments =
        await prisma.wpos_ustaz_occupied_times.findMany({
          where: {
            student_id: studentId,
            OR: [{ ustaz_id: oldTeacherId }, { ustaz_id: newTeacherId }],
          },
          select: { ustaz_id: true, occupied_at: true, end_at: true },
        });

      // Check for overlapping assignments
      const overlappingAssignment = existingAssignments.find((assignment) => {
        const assignmentStart = assignment.occupied_at || new Date(0);
        const assignmentEnd = assignment.end_at || new Date();

        return (
          (assignmentStart <= changeDate && assignmentEnd >= changeDate) ||
          (assignmentStart <= changeDate && !assignment.end_at)
        );
      });

      if (overlappingAssignment) {
        conflicts.push({
          studentId,
          studentName: student.name || "Unknown Student",
          oldTeacherId,
          oldTeacherName,
          newTeacherId,
          newTeacherName,
          changeDate,
          conflictType: "duplicate_assignment",
          message: `Student already has an active assignment with teacher ${overlappingAssignment.ustaz_id} during this period`,
        });
        recommendations.push(
          "Ensure the old teacher's assignment is properly ended before assigning to the new teacher"
        );
      }

      // Add warnings for mid-month changes
      const monthStart = new Date(
        changeDate.getFullYear(),
        changeDate.getMonth(),
        1
      );
      const monthEnd = new Date(
        changeDate.getFullYear(),
        changeDate.getMonth() + 1,
        0
      );

      if (
        changeDate.getDate() > 1 &&
        changeDate.getDate() < monthEnd.getDate()
      ) {
        warnings.push(
          `Teacher change occurs mid-month (day ${changeDate.getDate()}). Ensure prorated salary calculations are accurate.`
        );
        recommendations.push(
          "Review salary calculations to ensure both teachers are paid correctly for their respective periods"
        );
      }

      // Add warnings for weekend changes
      if (changeDate.getDay() === 0 || changeDate.getDay() === 6) {
        warnings.push(
          "Teacher change occurs on a weekend. Consider if this affects class schedules."
        );
      }

      return {
        hasConflicts: conflicts.length > 0,
        conflicts,
        warnings,
        recommendations,
      };
    } catch (error) {
      console.error("Error validating teacher change:", error);
      return {
        hasConflicts: true,
        conflicts: [
          {
            studentId,
            studentName: "Unknown Student",
            oldTeacherId,
            oldTeacherName: "Unknown Teacher",
            newTeacherId,
            newTeacherName: "Unknown Teacher",
            changeDate,
            conflictType: "duplicate_assignment",
            message: "Validation error occurred",
          },
        ],
        warnings: ["Unable to complete validation due to system error"],
        recommendations: ["Please contact system administrator"],
      };
    }
  }

  /**
   * Validates all teacher changes for a given period
   */
  static async validatePeriodTeacherChanges(
    period: string
  ): Promise<TeacherChangeValidationResult> {
    const conflicts: TeacherChangeConflict[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      // Get all audit logs for teacher changes in the period
      const [year, month] = period.split("-").map(Number);
      const periodStart = new Date(year, month - 1, 1);
      const periodEnd = new Date(year, month, 0);

      const auditLogs = await prisma.auditlog.findMany({
        where: {
          actionType: "assignment_update",
          createdAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        select: {
          targetId: true,
          details: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      });

      // Process each teacher change
      for (const log of auditLogs) {
        try {
          const details = JSON.parse(log.details);
          if (details.oldTeacher && details.newTeacher && log.targetId) {
            const validation = await this.validateTeacherChange(
              log.targetId,
              details.oldTeacher,
              details.newTeacher,
              log.createdAt,
              period
            );

            conflicts.push(...validation.conflicts);
            warnings.push(...validation.warnings);
            recommendations.push(...validation.recommendations);
          }
        } catch (error) {
          console.warn("Failed to parse audit log:", error);
        }
      }

      return {
        hasConflicts: conflicts.length > 0,
        conflicts,
        warnings: [...new Set(warnings)], // Remove duplicates
        recommendations: [...new Set(recommendations)], // Remove duplicates
      };
    } catch (error) {
      console.error("Error validating period teacher changes:", error);
      return {
        hasConflicts: true,
        conflicts: [],
        warnings: ["Unable to validate teacher changes for this period"],
        recommendations: ["Please contact system administrator"],
      };
    }
  }

  /**
   * Gets a summary of teacher changes for a period
   */
  static async getTeacherChangeSummary(period: string) {
    try {
      const [year, month] = period.split("-").map(Number);
      const periodStart = new Date(year, month - 1, 1);
      const periodEnd = new Date(year, month, 0);

      const auditLogs = await prisma.auditlog.findMany({
        where: {
          actionType: "assignment_update",
          createdAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        select: {
          targetId: true,
          details: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      });

      const changes = auditLogs
        .map((log) => {
          try {
            const details = JSON.parse(log.details);
            return {
              studentId: log.targetId,
              oldTeacher: details.oldTeacher,
              newTeacher: details.newTeacher,
              changeDate: log.createdAt,
              details,
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      return {
        totalChanges: changes.length,
        changes,
        affectedStudents: new Set(changes.map((c) => c?.studentId)).size,
        affectedTeachers: new Set(
          [
            ...changes.map((c) => c?.oldTeacher),
            ...changes.map((c) => c?.newTeacher),
          ].filter(Boolean)
        ).size,
      };
    } catch (error) {
      console.error("Error getting teacher change summary:", error);
      return {
        totalChanges: 0,
        changes: [],
        affectedStudents: 0,
        affectedTeachers: 0,
      };
    }
  }
}
