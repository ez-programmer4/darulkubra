import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { PrismaClient } from "@prisma/client";
import {
  generateTimeSlots,
  groupSlotsByCategory,
  sortTimeSlots,
  TimeSlot,
  DEFAULT_PRAYER_TIMES,
} from "@/utils/timeUtils";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || session.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get all teachers with schedules
    const teachers = await prisma.wpos_wpdatatable_24.findMany({
      select: { schedule: true },
      where: {
        schedule: {
          not: "",
        },
      },
    });

    // Generate time slots from teacher schedules
    const allTimeSlots: TimeSlot[] = [];

    teachers.forEach((teacher) => {
      if (teacher.schedule) {
        const slots = generateTimeSlots(teacher.schedule, DEFAULT_PRAYER_TIMES);
        allTimeSlots.push(...slots);
      }
    });

    // Remove duplicates and sort by time
    const uniqueTimeSlots = sortTimeSlots(
      allTimeSlots.filter(
        (slot, index, self) =>
          index === self.findIndex((s) => s.time === slot.time)
      )
    );

    // Group by prayer categories
    const groupedSlots = groupSlotsByCategory(uniqueTimeSlots);

    return NextResponse.json(
      {
        timeSlots: uniqueTimeSlots,
        groupedSlots,
        teachers: teachers.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching time slots:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

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
    const { teacherId, schedule } = body;

    if (!teacherId || !schedule) {
      return NextResponse.json(
        { message: "Teacher ID and schedule are required" },
        { status: 400 }
      );
    }

    // Update teacher schedule
    const updatedTeacher = await prisma.wpos_wpdatatable_24.update({
      where: { ustazid: teacherId },
      data: { schedule },
    });

    return NextResponse.json(
      {
        message: "Teacher schedule updated successfully",
        teacher: updatedTeacher,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating teacher schedule:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
