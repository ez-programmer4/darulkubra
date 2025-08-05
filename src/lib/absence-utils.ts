import { prisma } from "@/lib/prisma";

export interface AbsenceDetectionResult {
  isAbsent: boolean;
  reason?: string;
}

/**
 * Centralized function to detect if a teacher is absent on a specific date
 * This ensures consistent absence detection logic across the system
 */
export async function isTeacherAbsent(
  teacherId: string,
  date: Date
): Promise<AbsenceDetectionResult> {
  const dateStr = date.toISOString().split("T")[0];
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  // Don't mark teachers as absent for future dates
  if (checkDate > today) {
    return { isAbsent: false, reason: "Future date" };
  }

  // Get teacher with students
  const teacher = await prisma.wpos_wpdatatable_24.findUnique({
    where: { ustazid: teacherId },
    include: { students: true },
  });

  if (!teacher || teacher.students.length === 0) {
    return { isAbsent: false, reason: "No students assigned" };
  }

  // Check if this is a workday for the teacher
  const hasWorkDay = teacher.students.some((student) => {
    if (!student.daypackages) return false;

    // Check for "All days" which means every day is a workday
    if (student.daypackages.includes("All days")) {
      return true;
    }

    // Check for specific day names
    const hasSpecificDay = student.daypackages.includes(dayName);
    return hasSpecificDay;
  });

  if (!hasWorkDay) {
    return { isAbsent: false, reason: "Not a workday" };
  }

  // Create copies of date to avoid modifying original
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  // Check for zoom link activity
  for (const student of teacher.students) {
    const zoomLinks = await prisma.wpos_zoom_links.findMany({
      where: {
        studentid: student.wdt_ID,
        ustazid: teacherId,
        sent_time: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
    });
    if (zoomLinks.length > 0) {
      return { isAbsent: false, reason: "Zoom link sent" };
    }
  }

  // Note: Attendance check removed as per user request
  // Teachers are only considered absent if no zoom links sent and no approved permission

  // Check for approved permission
  const permissionRequest = await prisma.permissionrequest.findFirst({
    where: {
      teacherId: teacherId,
      status: "Approved",
      requestedDates: dateStr,
    },
  });

  if (permissionRequest) {
    return { isAbsent: false, reason: "Approved permission" };
  }

  // Teacher is absent
  return { isAbsent: true, reason: "No activity or permission" };
}

/**
 * Get absence deduction configuration
 */
export async function getAbsenceDeductionConfig() {
  const deductionConfig = await prisma.deductionbonusconfig.findFirst({
    where: {
      configType: "absence",
      key: "unpermitted_absence_deduction",
    },
  });

  const effectiveMonthsConfig = await prisma.deductionbonusconfig.findFirst({
    where: {
      configType: "absence",
      key: "absence_deduction_effective_months",
    },
  });

  const effectiveMonths = effectiveMonthsConfig?.value?.split(",") || [];

  return {
    deductionAmount: deductionConfig ? Number(deductionConfig.value) : 50,
    effectiveMonths: effectiveMonths,
  };
}
