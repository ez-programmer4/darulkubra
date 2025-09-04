import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!session || session.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const teacherId = searchParams.get("teacherId");

    if (!date || !teacherId) {
      return NextResponse.json({ error: "Date and teacherId required" }, { status: 400 });
    }

    // Get teacher's students and their day packages to determine time slots
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
      include: {
        students: {
          where: { status: { in: ["active", "Active"] } },
          select: {
            wdt_ID: true,
            name: true,
            daypackages: true
          }
        }
      }
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Get day name from date
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    
    // Find students who have classes on this day
    const studentsForDay = teacher.students.filter(student => {
      if (!student.daypackages) return false;
      return student.daypackages.includes('All days') || student.daypackages.includes(dayName);
    });

    // Get occupied time slots for these students on this day
    const occupiedTimes = await prisma.wpos_ustaz_occupied_times.findMany({
      where: {
        ustaz_id: teacherId,
        student_id: { in: studentsForDay.map(s => s.wdt_ID) }
      },
      select: {
        time_slot: true,
        student: {
          select: {
            name: true,
            daypackages: true
          }
        }
      }
    });

    // Filter time slots for the specific day
    const timeSlots = occupiedTimes
      .filter(ot => {
        const studentDayPackages = ot.student.daypackages;
        return studentDayPackages && (studentDayPackages.includes('All days') || studentDayPackages.includes(dayName));
      })
      .map(ot => ot.time_slot)
      .filter((slot, index, arr) => arr.indexOf(slot) === index); // Remove duplicates

    const timeSlots = occupiedTimes.map(ot => ot.time_slot);

    return NextResponse.json({ timeSlots });
  } catch (error) {
    console.error("Error fetching time slots:", error);
    return NextResponse.json({ error: "Failed to fetch time slots" }, { status: 500 });
  }
}