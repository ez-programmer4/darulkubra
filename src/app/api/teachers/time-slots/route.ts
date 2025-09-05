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

    // Validate and parse date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
    
    // Get day name from date
    const dayName = parsedDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Get teacher's actual occupied time slots from the database
    const occupiedTimes = await prisma.wpos_ustaz_occupied_times.findMany({
      where: {
        ustaz_id: teacherId
      },
      include: {
        student: {
          select: {
            name: true,
            daypackages: true
          }
        }
      }
    });

    // Filter occupied times for the selected day
    const dayTimeSlots = occupiedTimes.filter(ot => {
      const studentDayPackages = ot.student.daypackages;
      return studentDayPackages && (
        studentDayPackages.includes('All days') || 
        studentDayPackages.includes(dayName)
      );
    });

    // Extract unique time slots and format them properly
    const timeSlots = [...new Set(dayTimeSlots.map(ot => ot.time_slot))]
      .sort()
      .map(slot => {
        // Convert 24-hour format to 12-hour format if needed
        if (slot.includes(':') && !slot.includes('AM') && !slot.includes('PM')) {
          const [start, end] = slot.split(' - ');
          const formatTime = (time: string) => {
            const [hour, minute] = time.split(':');
            const h = parseInt(hour);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
            return `${displayHour}:${minute} ${ampm}`;
          };
          return `${formatTime(start)} - ${formatTime(end)}`;
        }
        return slot;
      });

    // Always add "Whole Day" option
    const finalTimeSlots = ['Whole Day', ...timeSlots];

    return NextResponse.json({ 
      timeSlots: finalTimeSlots,
      actualSchedule: dayTimeSlots.map(ot => ({
        timeSlot: ot.time_slot,
        studentName: ot.student.name
      }))
    });
  } catch (error) {
    console.error("Error fetching time slots:", error);
    return NextResponse.json({ error: "Failed to fetch time slots" }, { status: 500 });
  }
}