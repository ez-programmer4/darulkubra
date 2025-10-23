import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { SalaryCalculator } from "./salary-calculator";
import { clearCalculatorCache } from "./calculator-cache";

export interface TeacherChangeData {
  studentId: number;
  oldTeacherId: string | null;
  newTeacherId: string;
  changeDate: Date;
  changeReason?: string;
  timeSlot: string;
  dayPackage: string;
  studentPackage?: string;
  monthlyRate?: number;
  dailyRate?: number;
  createdBy?: string;
}

export interface TeacherChangePeriod {
  teacherId: string;
  startDate: Date;
  endDate: Date;
  studentId: number;
  studentName: string;
  package: string;
  monthlyRate: number;
  dailyRate: number;
  timeSlot: string;
  dayPackage: string;
}

/**
 * Records a teacher change in the history table
 */
export async function recordTeacherChange(
  data: TeacherChangeData
): Promise<void> {
  try {
    await prisma.teacher_change_history.create({
      data: {
        student_id: data.studentId,
        old_teacher_id: data.oldTeacherId,
        new_teacher_id: data.newTeacherId,
        change_date: data.changeDate,
        change_reason: data.changeReason,
        time_slot: data.timeSlot,
        daypackage: data.dayPackage,
        student_package: data.studentPackage,
        monthly_rate: data.monthlyRate,
        daily_rate: data.dailyRate,
        created_by: data.createdBy,
      },
    });

    // Clear salary cache for both old and new teachers to ensure dynamic updates
    if (data.oldTeacherId) {
      SalaryCalculator.clearGlobalTeacherCache(data.oldTeacherId);
    }
    SalaryCalculator.clearGlobalTeacherCache(data.newTeacherId);

    // Clear the calculator cache to force fresh data
    clearCalculatorCache();
  } catch (error) {
    console.error("❌ Failed to record teacher change:", error);
    throw new Error("Failed to record teacher change");
  }
}

/**
 * Gets teacher change history for a student within a date range
 */
export async function getTeacherChangeHistory(
  studentId: number,
  fromDate: Date,
  toDate: Date
): Promise<TeacherChangePeriod[]> {
  try {
    const changes = await prisma.teacher_change_history.findMany({
      where: {
        student_id: studentId,
        change_date: {
          gte: fromDate,
          lte: toDate,
        },
      },
      include: {
        student: {
          select: {
            name: true,
            package: true,
          },
        },
        old_teacher: {
          select: {
            ustazname: true,
          },
        },
        new_teacher: {
          select: {
            ustazname: true,
          },
        },
      },
      orderBy: {
        change_date: "asc",
      },
    });

    const periods: TeacherChangePeriod[] = [];

    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      const nextChange = changes[i + 1];

      // Calculate period for old teacher (if exists)
      if (change.old_teacher_id) {
        periods.push({
          teacherId: change.old_teacher_id,
          startDate: i === 0 ? fromDate : change.change_date,
          endDate: change.change_date,
          studentId: change.student_id,
          studentName: change.student.name || "Unknown",
          package:
            change.student.package || change.student_package || "Unknown",
          monthlyRate: Number(change.monthly_rate || 0),
          dailyRate: Number(change.daily_rate || 0),
          timeSlot: change.time_slot,
          dayPackage: change.daypackage,
        });
      }

      // Calculate period for new teacher
      periods.push({
        teacherId: change.new_teacher_id,
        startDate: change.change_date,
        endDate: nextChange ? nextChange.change_date : toDate,
        studentId: change.student_id,
        studentName: change.student.name || "Unknown",
        package: change.student.package || change.student_package || "Unknown",
        monthlyRate: Number(change.monthly_rate || 0),
        dailyRate: Number(change.daily_rate || 0),
        timeSlot: change.time_slot,
        dayPackage: change.daypackage,
      });
    }

    return periods;
  } catch (error) {
    console.error("❌ Failed to get teacher change history:", error);
    throw new Error("Failed to get teacher change history");
  }
}

/**
 * Gets all teacher change periods for a specific teacher within a date range
 */
export async function getTeacherChangePeriods(
  teacherId: string,
  fromDate: Date,
  toDate: Date
): Promise<TeacherChangePeriod[]> {
  try {
    // 🔍 DEBUG: Add debug logging for specific teachers
    const isDebugTeacher = teacherId === "U271" || teacherId === "U361";

    if (isDebugTeacher) {
      console.log(`
🔍 DEBUG - getTeacherChangePeriods:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Teacher ID: ${teacherId}
From Date: ${fromDate.toISOString().split("T")[0]}
To Date: ${toDate.toISOString().split("T")[0]}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    }

    const changes = await prisma.teacher_change_history.findMany({
      where: {
        OR: [{ old_teacher_id: teacherId }, { new_teacher_id: teacherId }],
        change_date: {
          gte: fromDate,
          lte: toDate,
        },
      },
      include: {
        student: {
          select: {
            name: true,
            package: true,
          },
        },
      },
      orderBy: {
        change_date: "asc",
      },
    });

    if (isDebugTeacher) {
      console.log(`
🔍 TEACHER CHANGE HISTORY RECORDS FOUND:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Records: ${changes.length}
${changes
  .map(
    (change, i) => `
${i + 1}. Student ID: ${change.student_id}
    Old Teacher: ${change.old_teacher_id}
    New Teacher: ${change.new_teacher_id}
    Change Date: ${change.change_date.toISOString().split("T")[0]}
    Student Name: ${change.student?.name || "Unknown"}
    Student Package: ${
      change.student?.package || change.student_package || "Unknown"
    }
    Monthly Rate: ${change.monthly_rate}
    Daily Rate: ${change.daily_rate}
`
  )
  .join("")}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    }

    const periods: TeacherChangePeriod[] = [];
    const processedChanges = new Set<string>(); // Track processed changes to avoid duplicates

    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      const nextChange = changes[i + 1];

      // Create a unique key for this change to avoid duplicates
      const changeKey = `${
        change.student_id
      }-${change.change_date.toISOString()}-${change.old_teacher_id}-${
        change.new_teacher_id
      }`;

      if (processedChanges.has(changeKey)) {
        if (isDebugTeacher) {
          console.log(`
🔍 SKIPPING DUPLICATE CHANGE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Student ID: ${change.student_id}
Change Date: ${change.change_date.toISOString().split("T")[0]}
Old Teacher: ${change.old_teacher_id}
New Teacher: ${change.new_teacher_id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          `);
        }
        continue;
      }

      processedChanges.add(changeKey);

      // If this teacher was the old teacher, add period until change
      if (change.old_teacher_id === teacherId) {
        // 🔧 CRITICAL FIX: For old teachers, we need to find when they actually started teaching
        // The change_date is when they STOPPED teaching, so we need to find their start date
        let actualStartDate = fromDate;

        // Look for when this teacher actually started teaching this student
        // We need to find the previous change where this teacher became the new teacher
        for (let j = i - 1; j >= 0; j--) {
          if (changes[j].new_teacher_id === teacherId) {
            actualStartDate = changes[j].change_date;
            break;
          }
        }

        // If no previous change found, use fromDate (teacher was teaching from beginning of period)
        // But we need to be more careful - check if this teacher was actually teaching before the change

        const period = {
          teacherId: change.old_teacher_id,
          startDate: actualStartDate,
          endDate: change.change_date,
          studentId: change.student_id,
          studentName: change.student.name || "Unknown",
          package:
            change.student.package || change.student_package || "Unknown",
          monthlyRate: Number(change.monthly_rate || 0),
          dailyRate: Number(change.daily_rate || 0),
          timeSlot: change.time_slot,
          dayPackage: change.daypackage,
        };

        periods.push(period);

        if (isDebugTeacher) {
          console.log(`
🔍 CREATED OLD TEACHER PERIOD:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Teacher ID: ${period.teacherId}
Student: ${period.studentName} (ID: ${period.studentId})
Period: ${period.startDate.toISOString().split("T")[0]} to ${
            period.endDate.toISOString().split("T")[0]
          }
Package: ${period.package}
Daily Rate: ${period.dailyRate} ETB
Actual Start Date: ${actualStartDate.toISOString().split("T")[0]}
Change Date: ${change.change_date.toISOString().split("T")[0]}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          `);
        }
      }

      // If this teacher is the new teacher, add period from change
      if (change.new_teacher_id === teacherId) {
        const period = {
          teacherId: change.new_teacher_id,
          startDate: change.change_date,
          endDate: nextChange ? nextChange.change_date : toDate,
          studentId: change.student_id,
          studentName: change.student.name || "Unknown",
          package:
            change.student.package || change.student_package || "Unknown",
          monthlyRate: Number(change.monthly_rate || 0),
          dailyRate: Number(change.daily_rate || 0),
          timeSlot: change.time_slot,
          dayPackage: change.daypackage,
        };

        periods.push(period);

        if (isDebugTeacher) {
          console.log(`
🔍 CREATED NEW TEACHER PERIOD:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Teacher ID: ${period.teacherId}
Student: ${period.studentName} (ID: ${period.studentId})
Period: ${period.startDate.toISOString().split("T")[0]} to ${
            period.endDate.toISOString().split("T")[0]
          }
Package: ${period.package}
Daily Rate: ${period.dailyRate} ETB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          `);
        }
      }
    }

    if (isDebugTeacher) {
      console.log(`
🔍 FINAL TEACHER CHANGE PERIODS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Teacher ID: ${teacherId}
Total Periods Created: ${periods.length}
${periods
  .map(
    (period, i) => `
${i + 1}. Student: ${period.studentName} (ID: ${period.studentId})
    Period: ${period.startDate.toISOString().split("T")[0]} to ${
      period.endDate.toISOString().split("T")[0]
    }
    Package: ${period.package}
    Daily Rate: ${period.dailyRate} ETB
`
  )
  .join("")}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    }

    return periods;
  } catch (error) {
    console.error("❌ Failed to get teacher change periods:", error);
    throw new Error("Failed to get teacher change periods");
  }
}

/**
 * Validates if a teacher change is valid (no conflicts, proper timing, etc.)
 */
export async function validateTeacherChange(
  studentId: number,
  newTeacherId: string,
  timeSlot: string,
  dayPackage: string,
  changeDate: Date
): Promise<{ isValid: boolean; message?: string }> {
  try {
    // Check if student exists
    const student = await prisma.wpos_wpdatatable_23.findUnique({
      where: { wdt_ID: studentId },
      select: { name: true, status: true },
    });

    if (!student) {
      return { isValid: false, message: "Student not found" };
    }

    // Check if student is active
    if (
      !student.status ||
      !["Active", "Not yet", "Fresh"].includes(student.status)
    ) {
      return { isValid: false, message: "Student is not active" };
    }

    // Check if new teacher exists
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: newTeacherId },
      select: { ustazname: true, schedule: true },
    });

    if (!teacher) {
      return { isValid: false, message: "New teacher not found" };
    }

    // Check if teacher is available at this time
    const scheduleTimes = teacher.schedule
      ? teacher.schedule.split(",").map((t) => t.trim())
      : [];

    if (!scheduleTimes.includes(timeSlot)) {
      return {
        isValid: false,
        message: `Teacher ${teacher.ustazname} is not available at ${timeSlot}`,
      };
    }

    // Check for conflicts with other students at the same time
    const conflicts = await prisma.wpos_ustaz_occupied_times.findMany({
      where: {
        ustaz_id: newTeacherId,
        time_slot: timeSlot,
        daypackage: dayPackage,
        student_id: { not: studentId },
        OR: [{ end_at: null }, { end_at: { gte: changeDate } }],
      },
      include: {
        student: {
          select: { name: true },
        },
      },
    });

    if (conflicts.length > 0) {
      const conflictStudent = conflicts[0].student.name || "Unknown";
      return {
        isValid: false,
        message: `Time slot conflict: ${conflictStudent} is already assigned to this teacher at ${timeSlot}`,
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error("❌ Failed to validate teacher change:", error);
    return { isValid: false, message: "Validation failed" };
  }
}

/**
 * Handles the complete teacher change process including history tracking
 */
export async function processTeacherChange(
  studentId: number,
  oldTeacherId: string | null,
  newTeacherId: string,
  timeSlot: string,
  dayPackage: string,
  changeReason?: string,
  createdBy?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const changeDate = new Date();

    // Validate the change
    const validation = await validateTeacherChange(
      studentId,
      newTeacherId,
      timeSlot,
      dayPackage,
      changeDate
    );

    if (!validation.isValid) {
      return {
        success: false,
        message: validation.message || "Invalid teacher change",
      };
    }

    // Get student and package information
    const student = await prisma.wpos_wpdatatable_23.findUnique({
      where: { wdt_ID: studentId },
      select: { name: true, package: true },
    });

    if (!student) {
      return { success: false, message: "Student not found" };
    }

    // Get package salary information
    const packageSalary = await prisma.packageSalary.findFirst({
      where: { packageName: student.package || "" },
      select: { salaryPerStudent: true },
    });

    const monthlyRate = Number(packageSalary?.salaryPerStudent || 0);
    const dailyRate = monthlyRate / 30; // Approximate daily rate

    // Process the change in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete current assignment if exists to free up the old teacher's occupied time
      if (oldTeacherId) {
        await tx.wpos_ustaz_occupied_times.deleteMany({
          where: {
            student_id: studentId,
            ustaz_id: oldTeacherId,
            end_at: null,
          },
        });
      }

      // Create new assignment
      await tx.wpos_ustaz_occupied_times.create({
        data: {
          ustaz_id: newTeacherId,
          time_slot: timeSlot,
          daypackage: dayPackage,
          student_id: studentId,
          occupied_at: changeDate,
          end_at: null,
        },
      });

      // Record the change in history
      await tx.teacher_change_history.create({
        data: {
          student_id: studentId,
          old_teacher_id: oldTeacherId,
          new_teacher_id: newTeacherId,
          change_date: changeDate,
          change_reason: changeReason,
          time_slot: timeSlot,
          daypackage: dayPackage,
          student_package: student.package,
          monthly_rate: monthlyRate,
          daily_rate: dailyRate,
          created_by: createdBy,
        },
      });
    });

    // Clear salary cache for both old and new teachers to ensure dynamic updates
    if (oldTeacherId) {
      SalaryCalculator.clearGlobalTeacherCache(oldTeacherId);
    }
    SalaryCalculator.clearGlobalTeacherCache(newTeacherId);

    // Clear the calculator cache to force fresh data
    clearCalculatorCache();

    return {
      success: true,
      message: `Teacher change processed successfully. Student ${
        student.name
      } moved from ${oldTeacherId || "none"} to ${newTeacherId}`,
    };
  } catch (error) {
    console.error("❌ Failed to process teacher change:", error);
    return { success: false, message: "Failed to process teacher change" };
  }
}
