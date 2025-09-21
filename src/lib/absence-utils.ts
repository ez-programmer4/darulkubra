import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export interface StudentAbsenceResult {
  studentId: number;
  studentName: string;
  package: string;
  isAbsent: boolean;
  deductionRate: number;
}

export interface TeacherAbsenceResult {
  hasAbsences: boolean;
  totalDeduction: number;
  studentAbsences: StudentAbsenceResult[];
  reason?: string;
}

/**
 * Per-student absence detection with package-based deductions
 */
export async function detectTeacherAbsences(
  teacherId: string,
  date: Date
): Promise<TeacherAbsenceResult> {
  const dateStr = format(date, "yyyy-MM-dd");
  const today = new Date();
  today.setDate(today.getDate() - 1); // Only process past dates
  today.setHours(23, 59, 59, 999);

  // Don't process future dates or today
  if (date > today) {
    return { hasAbsences: false, totalDeduction: 0, studentAbsences: [], reason: "Future date" };
  }

  // Check Sunday inclusion setting
  const workingDaysConfig = await prisma.setting.findUnique({
    where: { key: "include_sundays_in_salary" },
  });
  const includeSundays = workingDaysConfig?.value === "true" || false;

  if (!includeSundays && date.getDay() === 0) {
    return { hasAbsences: false, totalDeduction: 0, studentAbsences: [], reason: "Sunday excluded" };
  }

  // Get teacher's active students
  const students = await prisma.wpos_wpdatatable_23.findMany({
    where: {
      ustaz: teacherId,
      status: { in: ["active", "Active", "Not yet", "not yet"] },
    },
    select: {
      wdt_ID: true,
      name: true,
      package: true,
      zoom_links: {
        where: {
          sent_time: {
            gte: new Date(dateStr + "T00:00:00.000Z"),
            lt: new Date(dateStr + "T23:59:59.999Z"),
          },
        },
        select: { sent_time: true },
      },
    },
  });

  if (students.length === 0) {
    return { hasAbsences: false, totalDeduction: 0, studentAbsences: [], reason: "No students" };
  }

  // Get package deduction rates
  const packageDeductions = await prisma.packageDeduction.findMany();
  const packageDeductionMap: Record<string, number> = {};
  packageDeductions.forEach((pkg) => {
    packageDeductionMap[pkg.packageName] = Number(pkg.absenceBaseAmount);
  });

  // Check for waivers
  const waivers = await prisma.deduction_waivers.findMany({
    where: {
      teacherId,
      deductionType: "absence",
      deductionDate: date,
    },
  });
  const isWaived = waivers.length > 0;

  if (isWaived) {
    return { hasAbsences: false, totalDeduction: 0, studentAbsences: [], reason: "Waived by admin" };
  }

  // Check each student for absence
  const studentAbsences: StudentAbsenceResult[] = [];
  let totalDeduction = 0;

  for (const student of students) {
    const hasZoomLink = student.zoom_links.length > 0;
    const packageRate = packageDeductionMap[student.package || ""] || 25;

    if (!hasZoomLink) {
      studentAbsences.push({
        studentId: student.wdt_ID,
        studentName: student.name || "Unknown Student",
        package: student.package || "Unknown",
        isAbsent: true,
        deductionRate: packageRate,
      });
      totalDeduction += packageRate;
    }
  }

  return {
    hasAbsences: studentAbsences.length > 0,
    totalDeduction,
    studentAbsences,
  };
}

/**
 * Get absence deduction configuration
 */
export async function getAbsenceDeductionConfig() {
  // Get Sunday inclusion setting
  const workingDaysConfig = await prisma.setting.findUnique({
    where: { key: "include_sundays_in_salary" },
  });
  const includeSundays = workingDaysConfig?.value === "true" || false;

  // Get package deduction rates
  const packageDeductions = await prisma.packageDeduction.findMany();
  const packageRates: Record<string, number> = {};
  packageDeductions.forEach((pkg) => {
    packageRates[pkg.packageName] = Number(pkg.absenceBaseAmount);
  });

  return {
    includeSundays,
    packageRates,
    defaultRate: 25, // Default rate if package not found
  };
}

/**
 * Legacy function for backward compatibility
 */
export async function isTeacherAbsent(
  teacherId: string,
  date: Date
): Promise<{ isAbsent: boolean; reason?: string }> {
  const result = await detectTeacherAbsences(teacherId, date);
  return {
    isAbsent: result.hasAbsences,
    reason: result.reason || (result.hasAbsences ? "Per-student absences detected" : "No absences"),
  };
}
