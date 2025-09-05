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

    console.log('Time slots API - Received params:', { date, teacherId, rawUrl: req.url });

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

    // Generate comprehensive 30-minute time slots for the entire day
    const timeSlots: string[] = [];
    
    if (studentsForDay.length > 0) {
      // Early Morning (6:00 AM - 8:00 AM)
      const earlyMorningSlots = [
        '06:00 AM - 06:30 AM',
        '06:30 AM - 07:00 AM',
        '07:00 AM - 07:30 AM',
        '07:30 AM - 08:00 AM'
      ];
      
      // Morning (8:00 AM - 12:00 PM)
      const morningSlots = [
        '08:00 AM - 08:30 AM',
        '08:30 AM - 09:00 AM',
        '09:00 AM - 09:30 AM',
        '09:30 AM - 10:00 AM',
        '10:00 AM - 10:30 AM',
        '10:30 AM - 11:00 AM',
        '11:00 AM - 11:30 AM',
        '11:30 AM - 12:00 PM'
      ];
      
      // Afternoon (2:00 PM - 6:00 PM)
      const afternoonSlots = [
        '02:00 PM - 02:30 PM',
        '02:30 PM - 03:00 PM',
        '03:00 PM - 03:30 PM',
        '03:30 PM - 04:00 PM',
        '04:00 PM - 04:30 PM',
        '04:30 PM - 05:00 PM',
        '05:00 PM - 05:30 PM',
        '05:30 PM - 06:00 PM'
      ];
      
      // Evening (7:00 PM - 11:00 PM)
      const eveningSlots = [
        '07:00 PM - 07:30 PM',
        '07:30 PM - 08:00 PM',
        '08:00 PM - 08:30 PM',
        '08:30 PM - 09:00 PM',
        '09:00 PM - 09:30 PM',
        '09:30 PM - 10:00 PM',
        '10:00 PM - 10:30 PM',
        '10:30 PM - 11:00 PM'
      ];
      
      // Add all available time slots based on student count
      const studentCount = studentsForDay.length;
      
      // Always include morning and afternoon slots
      timeSlots.push(...morningSlots);
      timeSlots.push(...afternoonSlots);
      
      // Add early morning for teachers with many students
      if (studentCount >= 3) {
        timeSlots.unshift(...earlyMorningSlots);
      }
      
      // Add evening slots for active teachers
      if (studentCount >= 2) {
        timeSlots.push(...eveningSlots);
      }
      
    } else {
      // Default comprehensive schedule for teachers without specific student assignments
      timeSlots.push(
        '08:00 AM - 08:30 AM', '08:30 AM - 09:00 AM',
        '09:00 AM - 09:30 AM', '09:30 AM - 10:00 AM',
        '10:00 AM - 10:30 AM', '10:30 AM - 11:00 AM',
        '02:00 PM - 02:30 PM', '02:30 PM - 03:00 PM',
        '03:00 PM - 03:30 PM', '03:30 PM - 04:00 PM',
        '07:00 PM - 07:30 PM', '07:30 PM - 08:00 PM',
        '08:00 PM - 08:30 PM', '08:30 PM - 09:00 PM'
      );
    }

    return NextResponse.json({ timeSlots });
  } catch (error) {
    console.error("Error fetching time slots:", error);
    return NextResponse.json({ error: "Failed to fetch time slots" }, { status: 500 });
  }
}