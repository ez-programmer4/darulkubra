import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!session || session.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const teacherId = searchParams.get("teacherId");

    if (!date || !teacherId) {
      return NextResponse.json(
        { error: "Date and teacherId required" },
        { status: 400 }
      );
    }

    // Validate and parse date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    // Get day name from date
    const dayName = parsedDate.toLocaleDateString("en-US", { weekday: "long" });

    // Get teacher's actual occupied time slots from the database
    const occupiedTimes = await prisma.wpos_ustaz_occupied_times.findMany({
      where: {
        ustaz_id: teacherId,
      },
      include: {
        student: {
          select: {
            name: true,
            daypackages: true,
          },
        },
      },
    });

    // Filter occupied times for the selected day (include 'All days' + specific day packages)
    const dayTimeSlots = occupiedTimes.filter((ot) => {
      const studentDayPackages = ot.student.daypackages;
      if (!studentDayPackages) return false;

      // Include 'All days' packages
      if (studentDayPackages.includes("All days")) return true;

      // Include MWF and TTS packages for their respective days
      const isMWF =
        studentDayPackages.includes("MWF") &&
        ["Monday", "Wednesday", "Friday"].includes(dayName);
      const isTTS =
        studentDayPackages.includes("TTS") &&
        ["Tuesday", "Thursday", "Saturday"].includes(dayName);

      return isMWF || isTTS;
    });

    // Helper function to normalize time formats
    const normalizeTimeSlot = (slot: string) => {
      // Handle different time formats in the database

      // Case 1: Already in 12-hour format (5:00PM, 5:00 PM)
      if (slot.includes("AM") || slot.includes("PM")) {
        // Ensure space before AM/PM
        return slot.replace(/(\d)(AM|PM)/g, "$1 $2");
      }

      // Case 2: 24-hour format with range (14:00:00 - 15:00:00)
      if (slot.includes(" - ") && slot.includes(":")) {
        const [start, end] = slot.split(" - ");
        const formatTime = (time: string) => {
          // Remove seconds if present (14:00:00 -> 14:00)
          const cleanTime = time.split(":").slice(0, 2).join(":");
          const [hour, minute] = cleanTime.split(":");
          const h = parseInt(hour);
          const ampm = h >= 12 ? "PM" : "AM";
          const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
          return `${displayHour}:${minute} ${ampm}`;
        };
        return `${formatTime(start)} - ${formatTime(end)}`;
      }

      // Case 3: Single 24-hour time (14:00:00)
      if (slot.includes(":") && !slot.includes("AM") && !slot.includes("PM")) {
        const cleanTime = slot.split(":").slice(0, 2).join(":");
        const [hour, minute] = cleanTime.split(":");
        const h = parseInt(hour);
        const ampm = h >= 12 ? "PM" : "AM";
        const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${displayHour}:${minute} ${ampm}`;
      }

      // Case 4: Single 12-hour time (5PM)
      if (/^\d{1,2}(AM|PM)$/i.test(slot)) {
        return slot.replace(/(\d)(AM|PM)/gi, "$1:00 $2");
      }

      // Return as-is if no recognized format
      return slot;
    };

    // Extract unique time slots and normalize them
    const rawTimeSlots = [...new Set(dayTimeSlots.map((ot) => ot.time_slot))];
    const timeSlots = rawTimeSlots
      .map((slot) => normalizeTimeSlot(slot))
      .filter((slot) => slot && slot.trim() !== "") // Remove empty slots
      .sort((a, b) => {
        // Sort by time (convert to 24hr for sorting)
        const getHour = (timeStr: string) => {
          const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (!match) return 0;
          let hour = parseInt(match[1]);
          const isPM = match[3].toUpperCase() === "PM";
          if (isPM && hour !== 12) hour += 12;
          if (!isPM && hour === 12) hour = 0;
          return hour;
        };
        return getHour(a) - getHour(b);
      });

    // Always add "Whole Day" option
    const finalTimeSlots = ["Whole Day", ...timeSlots];

    return NextResponse.json({
      timeSlots: finalTimeSlots,
      actualSchedule: dayTimeSlots.map((ot) => ({
        timeSlot: normalizeTimeSlot(ot.time_slot),
        originalTimeSlot: ot.time_slot,
        studentName: ot.student.name,
      })),
    });
  } catch (error) {
    console.error("Error fetching time slots:", error);
    return NextResponse.json(
      { error: "Failed to fetch time slots" },
      { status: 500 }
    );
  }
}
