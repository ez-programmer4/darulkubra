import { PrismaClient } from "@prisma/client";
import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { to24Hour, to12Hour, validateTime } from "@/utils/timeUtils";

const prisma = new PrismaClient();

const checkTeacherAvailability = async (
  selectedTime: string,
  selectedDayPackage: string,
  teacherId: string
) => {
  // Validate time format
  if (!validateTime(selectedTime)) {
    return {
      isAvailable: false,
      message: `Invalid time format: ${selectedTime}`,
    };
  }

  const timeToMatch = to24Hour(selectedTime);
  const timeSlot = to12Hour(timeToMatch);

  const teacher = await prisma.wpos_wpdatatable_24.findUnique({
    where: { ustazid: teacherId },
    include: {
      control: {
        select: { wdt_ID: true, username: true },
      },
    },
  });
  if (!teacher) {
    return {
      isAvailable: false,
      message: `Teacher with ID ${teacherId} does not exist`,
    };
  }

  // Check if teacher is available at this time
  const scheduleTimes =
    teacher.schedule
      ?.split(",")
      .map((t) => t.trim())
      .filter((t) => t) || [];

  // Normalize time formats for comparison - handle both 12-hour and 24-hour formats
  const normalizedScheduleTimes = scheduleTimes.map((time) => {
    try {
      // If the time already has AM/PM, convert to 24-hour
      if (time.includes("AM") || time.includes("PM")) {
        return to24Hour(time);
      }
      // If it's already in 24-hour format, ensure proper formatting
      const [hours, minutes] = time.split(":").map(Number);
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
    } catch {
      return time; // Keep original if conversion fails
    }
  });

  if (!normalizedScheduleTimes.includes(timeToMatch)) {
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

  const hasConflict = (
    teacherBookings: { daypackage: string }[],
    selectedPackage: string
  ) => {
    const normalize = (pkg: string) => pkg.trim().toLowerCase();
    const sel = normalize(selectedPackage);
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

    // Validate time format
    if (!validateTime(selectedTime)) {
      return NextResponse.json(
        { message: `Invalid time format: ${selectedTime}` },
        { status: 400 }
      );
    }

    const teachers = await prisma.wpos_wpdatatable_24.findMany({
      select: {
        ustazid: true,
        ustazname: true,
        schedule: true,
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
