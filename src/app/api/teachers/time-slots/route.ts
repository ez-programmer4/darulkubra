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

    // Get teacher's students for the selected date
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
      include: {
        students: {
          where: { status: { in: ["active", "Active"] } }
        }
      }
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Validate and parse date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
    
    // Get day name from date
    const dayName = parsedDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Find students who have classes on this day and generate time slots
    const studentsForDay = teacher.students.filter(student => {
      if (!student.daypackages) return false;
      return student.daypackages.includes('All days') || student.daypackages.includes(dayName);
    });

    // Generate time slots based on students (simple approach)
    const timeSlots: string[] = [];
    studentsForDay.forEach((student, index) => {
      // Generate time slots based on student ID pattern
      const baseHour = 8 + (student.wdt_ID % 10); // Start from 8 AM, vary by student ID
      const timeSlot = `${baseHour.toString().padStart(2, '0')}:00 - ${(baseHour + 1).toString().padStart(2, '0')}:00`;
      if (!timeSlots.includes(timeSlot)) {
        timeSlots.push(timeSlot);
      }
    });

    // If no specific time slots, provide default ones
    if (timeSlots.length === 0 && studentsForDay.length > 0) {
      timeSlots.push('09:00 - 10:00', '10:00 - 11:00', '14:00 - 15:00', '15:00 - 16:00');
    }

    return NextResponse.json({ timeSlots });
  } catch (error) {
    console.error("Error fetching time slots:", error);
    return NextResponse.json({ error: "Failed to fetch time slots" }, { status: 500 });
  }
}