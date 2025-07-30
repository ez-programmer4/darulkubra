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

  console.log(
    `🔍 Checking absence for teacher ${teacherId} on ${dateStr} (${dayName})`
  );
  console.log(`📅 Today: ${today.toISOString().split("T")[0]}`);
  console.log(`📅 Check date: ${checkDate.toISOString().split("T")[0]}`);
  console.log(`📅 Is future date: ${checkDate > today}`);

  // Don't mark teachers as absent for future dates
  if (checkDate > today) {
    console.log(`⏰ Future date detected - skipping absence check`);
    return { isAbsent: false, reason: "Future date" };
  }

  // Get teacher with students
  const teacher = await prisma.wpos_wpdatatable_24.findUnique({
    where: { ustazid: teacherId },
    include: { students: true },
  });

  if (!teacher || teacher.students.length === 0) {
    console.log(`❌ No students assigned to teacher ${teacherId}`);
    return { isAbsent: false, reason: "No students assigned" };
  }

  console.log(`📚 Teacher has ${teacher.students.length} students`);

  // Check if this is a workday for the teacher
  const hasWorkDay = teacher.students.some((student) => {
    if (!student.daypackages) return false;

    // Check for "All Day Package" which means every day is a workday
    if (student.daypackages.includes("All Day Package")) {
      console.log(
        `✅ Student ${student.wdt_ID} has "All Day Package" - every day is workday`
      );
      return true;
    }

    // Check for specific day names
    const hasSpecificDay = student.daypackages.includes(dayName);
    console.log(
      `📅 Student ${student.wdt_ID} daypackages: "${student.daypackages}", includes ${dayName}: ${hasSpecificDay}`
    );
    return hasSpecificDay;
  });

  if (!hasWorkDay) {
    console.log(`❌ Not a workday for teacher ${teacherId}`);
    return { isAbsent: false, reason: "Not a workday" };
  }

  console.log(`✅ It's a workday for teacher ${teacherId}`);

  // Create copies of date to avoid modifying original
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  console.log(
    `🕐 Checking zoom links between ${dayStart.toISOString()} and ${dayEnd.toISOString()}`
  );

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
      console.log(
        `✅ Found ${zoomLinks.length} zoom links for student ${student.wdt_ID} - teacher is present`
      );
      return { isAbsent: false, reason: "Zoom link sent" };
    }
  }

  console.log(`❌ No zoom links found for any student`);

  // Note: Attendance check removed as per user request
  // Teachers are only considered absent if no zoom links sent and no approved permission

  // Check for approved permission
  const permissionRequest = await prisma.permissionRequest.findFirst({
    where: {
      teacherId: teacherId,
      status: "Approved",
      requestedDates: dateStr,
    },
  });

  if (permissionRequest) {
    console.log(`✅ Found approved permission for teacher ${teacherId}`);
    return { isAbsent: false, reason: "Approved permission" };
  }

  console.log(`❌ No approved permission found`);

  // Teacher is absent
  console.log(`🚨 TEACHER IS ABSENT - No zoom links, no permission`);
  return { isAbsent: true, reason: "No activity, no permission" };
}

/**
 * Get absence deduction configuration
 */
export async function getAbsenceDeductionConfig() {
  const deductionConfig = await prisma.deductionBonusConfig.findFirst({
    where: {
      configType: "absence",
      key: "unpermitted_absence_deduction",
    },
  });

  const effectiveMonthsConfig = await prisma.deductionBonusConfig.findFirst({
    where: {
      configType: "absence",
      key: "absence_deduction_effective_months",
    },
  });

  const effectiveMonths = effectiveMonthsConfig?.value?.split(",") || [];

  console.log(
    `⚙️ Absence config - Deduction: ${deductionConfig?.value || 50} ETB`
  );
  console.log(
    `⚙️ Effective months config: "${
      effectiveMonthsConfig?.value || "none"
    }" -> [${effectiveMonths.join(", ")}]`
  );

  return {
    deductionAmount: deductionConfig ? Number(deductionConfig.value) : 50,
    effectiveMonths: effectiveMonths,
  };
}
