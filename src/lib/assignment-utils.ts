import { prisma } from "@/lib/prisma";

/**
 * Create new teacher-student assignment
 */
export async function createAssignment(teacherId: string, studentId: number) {
  // End any existing assignment for this student
  await prisma.wpos_ustaz_occupied_times.updateMany({
    where: {
      student_id: studentId,
      end_at: null,
    },
    data: {
      end_at: new Date(),
    },
  });

  // Create new assignment
  return await prisma.wpos_ustaz_occupied_times.create({
    data: {
      ustaz_id: teacherId,
      student_id: studentId,
      occupied_at: new Date(),
      end_at: null,
      time_slot: "09:00-10:00", // Default time slot
      daypackage: "Monday", // Default day package
    },
  });
}

/**
 * End teacher-student assignment
 */
export async function endAssignment(teacherId: string, studentId: number) {
  return await prisma.wpos_ustaz_occupied_times.updateMany({
    where: {
      ustaz_id: teacherId,
      student_id: studentId,
      end_at: null,
    },
    data: {
      end_at: new Date(),
    },
  });
}

/**
 * Get active assignments for teacher
 */
export async function getActiveAssignments(teacherId: string) {
  return await prisma.wpos_ustaz_occupied_times.findMany({
    where: {
      ustaz_id: teacherId,
      end_at: null,
    },
    include: {
      student: {
        select: {
          wdt_ID: true,
          name: true,
          package: true,
        },
      },
    },
  });
}
