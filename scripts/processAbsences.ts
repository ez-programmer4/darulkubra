import { PrismaClient } from "@prisma/client";
import { format, subDays } from "date-fns";

const prisma = new PrismaClient();

async function processAbsences(targetDate: Date) {
  // 1. Get Configuration
  const deductionConfig = await prisma.deductionbonusconfig.findFirst({
    where: {
      configType: "absence",
      key: "unpermitted_absence_deduction",
    },
  });

  const deductionAmount = deductionConfig
    ? parseFloat(deductionConfig.value)
    : 0;
  if (deductionAmount === 0) {
    console.warn(
      "Warning: Unpermitted absence deduction amount is not set or is zero. No deductions will be applied."
    );
  }

  // 2. Get All Teachers with their active students
  const teachers = await prisma.wpos_wpdatatable_24.findMany({
    include: {
      students: {
        where: {
          status: { equals: "active" }, // Only consider active students
        },
      },
    },
  });

  const targetDayName = format(targetDate, "EEEE"); // e.g., "Monday"

  for (const teacher of teachers) {
    // 3a. Determine if it was a workday
    const isWorkDay = teacher.students.some((student) =>
      student.daypackages?.includes(targetDayName)
    );

    if (!isWorkDay) {
      continue; // Skip if it's not a workday for this teacher
    }

    // 3b. Check Attendance Submission
    const attendanceSubmission =
      await prisma.student_attendance_progress.findFirst({
        where: {
          wpos_wpdatatable_23: {
            ustaz: teacher.ustazid,
          },
          date: {
            gte: new Date(targetDate.setHours(0, 0, 0, 0)),
            lt: new Date(targetDate.setHours(23, 59, 59, 999)),
          },
        },
      });

    if (attendanceSubmission) {
      continue; // Teacher submitted attendance, so no absence
    }

    // 3c. Check for Approved Permission
    const permissionRequest = await prisma.permissionrequest.findFirst({
      where: {
        teacherId: teacher.ustazid,
        status: "Approved",
        // This is a simplified check. A robust implementation would parse requestedDates
        // and check if the targetDate falls within any of the ranges.
        // For now, we assume requestedDates is a single date in 'yyyy-MM-dd' format.
        requestedDate: format(targetDate, "yyyy-MM-dd"),
      },
    });

    if (permissionRequest) {
      continue; // Teacher had an approved permission request
    }

    // 3d. Create Absence Record

    await prisma.absencerecord.create({
      data: {
        teacherId: teacher.ustazid,
        classDate: targetDate,
        permitted: false,
        deductionApplied: deductionAmount,
        reviewedByManager: true, // System-generated
        reviewNotes: `System-generated: No attendance submitted and no approved permission found for ${format(
          targetDate,
          "yyyy-MM-dd"
        )}.`,
      },
    });
  }
}

async function main() {
  const dateArg = process.argv[2];
  const targetDate = dateArg ? new Date(dateArg) : subDays(new Date(), 1);

  if (isNaN(targetDate.getTime())) {
    console.error("Invalid date provided. Please use YYYY-MM-DD format.");
    process.exit(1);
  }

  try {
    await processAbsences(targetDate);
  } catch (error) {
    console.error("An error occurred during absence processing:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
