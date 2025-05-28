import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// const parseTime = (time: string): [number, number] => {
//   const [hourStr, minuteStr = "00"] = time
//     .split(":")
//     .map((part) => part.trim());
//   const hour = parseInt(hourStr, 10);
//   const minute = parseInt(minuteStr, 10);

//   if (
//     isNaN(hour) ||
//     hour < 0 ||
//     hour > 23 ||
//     isNaN(minute) ||
//     minute < 0 ||
//     minute > 59
//   ) {
//     throw new Error(
//       `Invalid time format: ${time}. Expected HH:MM (e.g., 14:30)`
//     );
//   }

//   return [hour, minute];
// };

const convertTo12Hour = (time: string): string => {
  if (/AM|PM/i.test(time)) return time;

  if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(time)) {
    throw new Error(`Invalid time format: ${time}. Expected HH:MM or HH:MM:SS`);
  }

  const [hourStr, minuteStr] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  const period = hour >= 12 ? "PM" : "AM";
  const adjustedHour = hour % 12 || 12;
  const formattedMinute = minute.toString().padStart(2, "0");

  return `${adjustedHour}:${formattedMinute} ${period}`;
};

const convertTimeTo24Hour = (time: string): string => {
  if (time.includes("AM") || time.includes("PM")) {
    try {
      const [timePart, period] = time.split(" ");
      const [hourStr, minuteStr = "00"] = timePart
        .split(":")
        .map((part) => part.trim());
      let hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      if (period === "PM" && hour !== 12) hour += 12;
      if (period === "AM" && hour === 12) hour = 0;

      if (
        isNaN(hour) ||
        hour < 0 ||
        hour > 23 ||
        isNaN(minute) ||
        minute < 0 ||
        minute > 59
      ) {
        throw new Error(`Invalid 12-hour time format: ${time}`);
      }

      return `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`;
    } catch (error) {
      console.error("Error converting to 24-hour format:", error);
      return "00:00";
    }
  }
  return time;
};

const checkTeacherAvailability = async (
  selectedTime: string,
  selectedDayPackage: string,
  teacherId: string
) => {
  const timeToMatch = convertTimeTo24Hour(selectedTime);
  const timeSlot = convertTo12Hour(timeToMatch);

  const teacher = await prisma.wpos_wpdatatable_24.findUnique({
    where: { ustazid: teacherId },
    select: {
      ustazid: true,
      ustazname: true,
      schedule: true,
    },
  });

  if (!teacher) {
    return {
      isAvailable: false,
      message: `Teacher with ID ${teacherId} does not exist`,
    };
  }

  if (
    !teacher.schedule
      ?.split(",")
      .map((t) => t.trim())
      .includes(timeToMatch)
  ) {
    return {
      isAvailable: false,
      message: `Teacher ${teacher.ustazname} is not available at ${selectedTime}`,
    };
  }

  const allBookings = await prisma.wpos_ustaz_occupied_times.findMany({
    where: { time_slot: timeSlot },
    select: { ustaz_id: true, daypackage: true },
  });

  const teacherBookings = allBookings.filter(
    (booking) => booking.ustaz_id === teacherId
  );

  // --- CORRECTED CONFLICT LOGIC ---
  const hasConflict = (
    teacherBookings: { daypackage: string }[],
    selectedPackage: string
  ) => {
    const normalize = (pkg: string) => pkg.trim().toLowerCase();
    const sel = normalize(selectedPackage);

    // If any booking is "all day package" or selected is "all day package", conflict
    if (
      teacherBookings.some(
        (booking) =>
          normalize(booking.daypackage) === "all day package" ||
          sel === "all day package"
      )
    ) {
      return true;
    }

    // If any booking is the same as selected, conflict
    if (
      teacherBookings.some((booking) => normalize(booking.daypackage) === sel)
    ) {
      return true;
    }

    // If ALL bookings are MWF vs TTS (or vice versa), NO conflict
    if (
      teacherBookings.length > 0 &&
      teacherBookings.every((booking) => {
        const booked = normalize(booking.daypackage);
        return (
          (booked === "monday, wednesday, friday" &&
            sel === "tuesday, thursday, saturday") ||
          (booked === "tuesday, thursday, saturday" &&
            sel === "monday, wednesday, friday")
        );
      })
    ) {
      return false; // No conflict
    }

    // Otherwise, conflict if there are any bookings
    return teacherBookings.length > 0;
  };

  const isAvailable = !hasConflict(teacherBookings, selectedDayPackage);

  if (!isAvailable) {
    return {
      isAvailable: false,
      message: `Teacher ${teacher.ustazname} is already booked for the selected time and package.`,
    };
  }

  return { isAvailable: true };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const selectedTime = searchParams.get("selectedTime");
    const selectedDayPackage = searchParams.get("selectedDayPackage");

    if (!selectedTime || !selectedDayPackage) {
      return NextResponse.json(
        { message: "Selected time and day package are required" },
        { status: 400 }
      );
    }

    const teachers = await prisma.wpos_wpdatatable_24.findMany({
      select: { ustazid: true, ustazname: true, schedule: true },
    });

    if (!teachers || teachers.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const availableTeachers = await Promise.all(
      teachers.map(async (teacher) => {
        const availability = await checkTeacherAvailability(
          selectedTime,
          selectedDayPackage,
          teacher.ustazid
        );
        return availability.isAvailable
          ? { id: teacher.ustazid, name: teacher.ustazname }
          : null;
      })
    ).then((results) => results.filter((teacher) => teacher !== null));

    return NextResponse.json(availableTeachers, { status: 200 });
  } catch (error) {
    console.error("Error fetching available teachers:", error);
    return NextResponse.json(
      {
        message: "Error fetching available teachers",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
