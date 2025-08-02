import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { to24Hour, validateTime } from "@/utils/timeUtils";

export async function POST(request: NextRequest) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || session.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { operation, data } = body;

    switch (operation) {
      case "clear_time_slots":
        return await clearTimeSlots(data);

      case "bulk_assign":
        return await bulkAssign(data);

      case "bulk_clear_student_slots":
        return await bulkClearStudentSlots(data);

      default:
        return NextResponse.json(
          { message: "Invalid operation" },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

async function clearTimeSlots(data: {
  teacherId?: string;
  timeSlot?: string;
  dayPackage?: string;
  all?: boolean;
}) {
  try {
    const { teacherId, timeSlot, dayPackage, all } = data;

    if (all) {
      // Clear all occupied time slots
      const result = await prisma.wpos_ustaz_occupied_times.deleteMany({});

      return NextResponse.json({
        message: `Cleared ${result.count} time slots`,
        count: result.count,
      });
    }

    // Clear specific time slots
    const whereClause: any = {};

    if (teacherId) whereClause.ustaz_id = teacherId;
    if (timeSlot) whereClause.time_slot = timeSlot;
    if (dayPackage) whereClause.daypackage = dayPackage;

    const result = await prisma.wpos_ustaz_occupied_times.deleteMany({
      where: whereClause,
    });

    return NextResponse.json({
      message: `Cleared ${result.count} time slots`,
      count: result.count,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Error clearing time slots" },
      { status: 500 }
    );
  }
}

async function bulkAssign(data: {
  teacherId: string;
  timeSlots: string[];
  dayPackage: string;
  studentIds: number[];
}) {
  try {
    const { teacherId, timeSlots, dayPackage, studentIds } = data;

    // Validate teacher exists
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
    });

    if (!teacher) {
      return NextResponse.json(
        { message: "Teacher not found" },
        { status: 404 }
      );
    }

    // Validate time slots
    for (const timeSlot of timeSlots) {
      if (!validateTime(timeSlot)) {
        return NextResponse.json(
          { message: `Invalid time format: ${timeSlot}` },
          { status: 400 }
        );
      }
    }

    const results = [];

    for (const studentId of studentIds) {
      for (const timeSlot of timeSlots) {
        try {
          // Check if slot is already occupied
          const existing = await prisma.wpos_ustaz_occupied_times.findFirst({
            where: {
              ustaz_id: teacherId,
              time_slot: timeSlot,
              daypackage: dayPackage,
            },
          });

          if (existing) {
            results.push({
              studentId,
              timeSlot,
              status: "failed",
              message: "Slot already occupied",
            });
            continue;
          }

          // Assign slot
          await prisma.wpos_ustaz_occupied_times.create({
            data: {
              ustaz_id: teacherId,
              time_slot: timeSlot,
              daypackage: dayPackage,
              student_id: studentId,
              occupied_at: new Date(),
            },
          });

          results.push({
            studentId,
            timeSlot,
            status: "success",
          });
        } catch (error) {
          results.push({
            studentId,
            timeSlot,
            status: "failed",
            message: "Database error",
          });
        }
      }
    }

    const successCount = results.filter((r) => r.status === "success").length;
    const failureCount = results.filter((r) => r.status === "failed").length;

    return NextResponse.json({
      message: `Bulk assignment completed: ${successCount} successful, ${failureCount} failed`,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Error performing bulk assignment" },
      { status: 500 }
    );
  }
}

async function bulkClearStudentSlots(data: {
  studentIds: number[];
  dayPackage?: string;
}) {
  try {
    const { studentIds, dayPackage } = data;

    const whereClause: any = {
      student_id: { in: studentIds },
    };

    if (dayPackage) {
      whereClause.daypackage = dayPackage;
    }

    const result = await prisma.wpos_ustaz_occupied_times.deleteMany({
      where: whereClause,
    });

    return NextResponse.json({
      message: `Cleared ${result.count} student slots`,
      count: result.count,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Error clearing student slots" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || session.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get("teacherId");

    if (!teacherId) {
      return NextResponse.json(
        { message: "Teacher ID is required" },
        { status: 400 }
      );
    }

    // Get teacher's occupied time slots
    const occupiedSlots = await prisma.wpos_ustaz_occupied_times.findMany({
      where: { ustaz_id: teacherId },
      include: {
        student: {
          select: {
            wdt_ID: true,
            name: true,
          },
        },
      },
      orderBy: { occupied_at: "desc" },
    });

    // Group by time slot
    const groupedSlots = occupiedSlots.reduce((acc, slot) => {
      const key = `${slot.time_slot}-${slot.daypackage}`;
      if (!acc[key]) {
        acc[key] = {
          timeSlot: slot.time_slot,
          dayPackage: slot.daypackage,
          students: [],
        };
      }
      acc[key].students.push({
        id: slot.student_id,
        name: slot.student?.name || "Unknown",
      });
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      teacherId,
      occupiedSlots: Object.values(groupedSlots),
      totalSlots: occupiedSlots.length,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching occupied slots" },
      { status: 500 }
    );
  }
}
