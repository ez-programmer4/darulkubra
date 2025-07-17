import { PrismaClient } from "@prisma/client";
import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const prisma = new PrismaClient();

const convertTo12Hour = (time: string): string => {
  if (/AM|PM/i.test(time)) return time;

  // Fix: If time has more than two colons, treat as invalid or parse only first two segments
  const segments = time.split(":");
  if (segments.length > 3) {
    console.warn(`Skipping invalid time format: ${time}`);
    return "Invalid Time";
  }
  // Use only first two segments for HH:MM
  const [hourStr, minuteStr = "00"] = segments;
  if (
    !/^([0-1]?[0-9]|2[0-3])$/.test(hourStr) ||
    !/^[0-5][0-9]$/.test(minuteStr)
  ) {
    throw new Error(`Invalid time format: ${time}. Expected HH:MM or HH:MM:SS`);
  }
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
  console.log("Checking availability:", {
    teacherId,
    timeToMatch,
    timeSlot,
    selectedDayPackage,
  });

  const teacher = await prisma.wpos_wpdatatable_24.findUnique({
    where: { ustazid: teacherId },
    include: {
      control: {
        select: { wdt_ID: true, username: true },
      },
    },
  });
  console.log("Teacher data:", teacher);

  if (!teacher) {
    console.log(`Teacher with ID ${teacherId} does not exist`);
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
    console.log(
      `Schedule check failed for ${teacher.ustazname}: ${teacher.schedule}`
    );
    return {
      isAvailable: false,
      message: `Teacher ${teacher.ustazname} is not available at ${selectedTime}`,
    };
  }

  const allBookings = await prisma.wpos_ustaz_occupied_times.findMany({
    where: { time_slot: timeSlot },
    select: { ustaz_id: true, daypackage: true },
  });
  console.log("All bookings:", allBookings);

  const teacherBookings = allBookings.filter(
    (booking) => booking.ustaz_id === teacherId
  );

  const hasConflict = (
    teacherBookings: { daypackage: string }[],
    selectedPackage: string
  ) => {
    const normalize = (pkg: string) => pkg.trim().toLowerCase();
    const sel = normalize(selectedPackage);
    console.log("Conflict check:", { teacherBookings, selectedPackage, sel });

    if (
      teacherBookings.some(
        (booking) =>
          normalize(booking.daypackage) === "all day package" ||
          sel === "all day package"
      )
    ) {
      return true;
    }

    if (
      teacherBookings.some((booking) => normalize(booking.daypackage) === sel)
    ) {
      return true;
    }

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
      return false;
    }

    return teacherBookings.length > 0;
  };

  const isAvailable = !hasConflict(teacherBookings, selectedDayPackage);

  if (!isAvailable) {
    return {
      isAvailable: false,
      message: `Teacher ${teacher.ustazname} is already booked for the selected time and package.`,
    };
  }

  return {
    isAvailable: true,
    teacher: {
      ustazid: teacher.ustazid,
      ustazname: teacher.ustazname,
      control: teacher.control,
    },
  };
};

export async function GET(request: NextRequest) {
  const session = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

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
      include: {
        control: {
          select: { wdt_ID: true, username: true },
        },
      },
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
        return availability.isAvailable ? availability.teacher : null;
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
