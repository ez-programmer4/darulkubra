import { PrismaClient } from "@prisma/client";
import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma as globalPrisma } from "@/lib/prisma"; // Reuse global Prisma instance
const prismaClient = globalPrisma;

const parseTime = (time: string): [number, number] => {
  const [hourStr, minuteStr = "00"] = time
    .split(":")
    .map((part) => part.trim());
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (
    isNaN(hour) ||
    hour < 0 ||
    hour > 23 ||
    isNaN(minute) ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error(
      `Invalid time format: ${time}. Expected HH:MM (e.g., 14:30)`
    );
  }

  return [hour, minute];
};

const convertTo12Hour = (time: string): string => {
  try {
    if (time.includes("AM") || time.includes("PM")) {
      return time.trim();
    }
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(time)) {
      throw new Error(
        `Invalid time format: ${time}. Expected HH:MM or HH:MM:SS`
      );
    }
    const [hour, minute] = parseTime(time);
    const period = hour >= 12 ? "PM" : "AM";
    const adjustedHour = hour % 12 || 12;
    return `${adjustedHour}:${minute.toString().padStart(2, "0")} ${period}`;
  } catch (error) {
    console.error("Error converting to 12-hour format:", error);
    return "Invalid Time";
  }
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
  teacherId: string,
  excludeStudentId?: number
) => {
  const timeToMatch = convertTimeTo24Hour(selectedTime);
  const timeSlot = convertTo12Hour(timeToMatch);

  const teacher = await prismaClient.wpos_wpdatatable_24.findUnique({
    where: { ustazid: teacherId },
    select: { ustazid: true, ustazname: true, schedule: true },
  });

  if (!teacher) {
    return {
      isAvailable: false,
      message: `Teacher with ID ${teacherId} does not exist`,
    };
  }

  const scheduleTimes = teacher.schedule
    ? teacher.schedule.split(",").map((t) => t.trim())
    : [];
  if (!scheduleTimes.includes(timeToMatch)) {
    return {
      isAvailable: false,
      message: `Teacher ${teacher.ustazname} is not available at ${selectedTime}`,
    };
  }

  const allBookings = await prismaClient.wpos_ustaz_occupied_times.findMany({
    where: { time_slot: timeSlot },
    select: { ustaz_id: true, daypackage: true, student_id: true },
  });

  const teacherBookings = allBookings.filter(
    (booking) =>
      booking.ustaz_id === teacherId &&
      (!excludeStudentId || booking.student_id !== excludeStudentId)
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

  if (hasConflict(teacherBookings, selectedDayPackage)) {
    return {
      isAvailable: false,
      message: `Teacher ${teacher.ustazname} is already booked for ${selectedTime} with a conflicting day package.`,
    };
  }

  return { isAvailable: true };
};

export async function POST(request: NextRequest) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { control } = body;
    if (session.role === "controller" && control !== session.username) {
      return NextResponse.json(
        { message: "Unauthorized to assign to another controller" },
        { status: 403 }
      );
    }
    const rigistral = session.role === "registral" ? session.username : null;
    const {
      fullName,
      phoneNumber,
      classfee,
      startdate,
      status,
      ustaz,
      package: regionPackage,
      subject,
      country,
      daypackages: selectedDayPackage,
      refer,
      selectedTime,
      registrationdate,
    } = body;
    if (!fullName || fullName.trim() === "") {
      return NextResponse.json(
        { message: "Full name is required" },
        { status: 400 }
      );
    }
    if (!phoneNumber || phoneNumber.trim() === "") {
      return NextResponse.json(
        { message: "Phone number is required" },
        { status: 400 }
      );
    }
    if (!ustaz || ustaz.trim() === "") {
      return NextResponse.json(
        { message: "Teacher is required" },
        { status: 400 }
      );
    }
    if (!selectedDayPackage || selectedDayPackage.trim() === "") {
      return NextResponse.json(
        { message: "Day package is required" },
        { status: 400 }
      );
    }
    if (!selectedTime || selectedTime.trim() === "") {
      return NextResponse.json(
        { message: "Selected time is required" },
        { status: 400 }
      );
    }
    const timeToMatch = convertTimeTo24Hour(selectedTime);
    const timeSlot = convertTo12Hour(timeToMatch);
    const availability = await checkTeacherAvailability(
      timeToMatch,
      selectedDayPackage,
      ustaz
    );
    if (!availability.isAvailable) {
      return NextResponse.json(
        { message: availability.message },
        { status: 400 }
      );
    }
    const newRegistration = await prismaClient.$transaction(async (tx) => {
      const registration = await tx.wpos_wpdatatable_23.create({
        data: {
          name: fullName,
          phoneno: phoneNumber,
          classfee: classfee ? parseFloat(classfee) : null,
          startdate: startdate ? new Date(startdate) : null,
          control:
            session.role === "controller" ? session.username : control || null,
          status: status?.toLowerCase() || "pending",
          ustaz,
          package: regionPackage || null,
          subject: subject || null,
          country: country || null,
          rigistral,
          daypackages: selectedDayPackage,
          refer: refer || null,
          selectedTime: timeSlot,
          registrationdate: registrationdate
            ? new Date(registrationdate)
            : new Date(),
        },
      });
      await tx.wpos_ustaz_occupied_times.create({
        data: {
          ustaz_id: ustaz,
          time_slot: timeSlot,
          daypackage: selectedDayPackage,
          student_id: registration.wdt_ID,
          occupied_at: new Date(),
        },
      });
      console.log(
        `Registration created for ${fullName} by ${session.username} - Notification triggered`
      );
      return registration;
    });
    return NextResponse.json(
      { message: "Registration successful", id: newRegistration.wdt_ID },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json(
      {
        message: "Error creating registration",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  } finally {
    await prismaClient.$disconnect();
  }
}

export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get("id") || "0");

  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!id || id <= 0) {
      return NextResponse.json(
        { message: "Invalid or missing registration ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { control } = body;
    if (
      session.role === "controller" &&
      control &&
      control !== session.username
    ) {
      return NextResponse.json(
        { message: "Unauthorized to reassign to another controller" },
        { status: 403 }
      );
    }

    const existingRegistration =
      await prismaClient.wpos_wpdatatable_23.findUnique({
        where: { wdt_ID: id },
        select: { control: true, rigistral: true },
      });
    if (!existingRegistration) {
      return NextResponse.json(
        { message: "Registration not found" },
        { status: 404 }
      );
    }
    if (
      session.role === "controller" &&
      existingRegistration.control !== session.username
    ) {
      return NextResponse.json(
        { message: "Unauthorized to update this registration" },
        { status: 403 }
      );
    }

    const {
      fullName,
      phoneNumber,
      classfee,
      startdate,
      status,
      ustaz,
      package: regionPackage,
      subject,
      country,
      daypackages: selectedDayPackage,
      refer,
      selectedTime,
      registrationdate,
    } = body;

    if (!fullName || fullName.trim() === "") {
      return NextResponse.json(
        { message: "Full name is required" },
        { status: 400 }
      );
    }
    if (!phoneNumber || phoneNumber.trim() === "") {
      return NextResponse.json(
        { message: "Phone number is required" },
        { status: 400 }
      );
    }
    if (!ustaz || ustaz.trim() === "") {
      return NextResponse.json(
        { message: "Teacher ID is required" },
        { status: 400 }
      );
    }
    if (!selectedDayPackage || selectedDayPackage.trim() === "") {
      return NextResponse.json(
        { message: "Day package is required" },
        { status: 400 }
      );
    }
    if (!selectedTime || selectedTime.trim() === "") {
      return NextResponse.json(
        { message: "Selected time is required" },
        { status: 400 }
      );
    }

    const timeToMatch = convertTimeTo24Hour(selectedTime);
    const timeSlot = convertTo12Hour(timeToMatch);
    if (timeSlot === "Invalid Time") {
      return NextResponse.json(
        { message: "Invalid time format provided" },
        { status: 400 }
      );
    }

    const existing = await prismaClient.wpos_wpdatatable_23.findUnique({
      where: { wdt_ID: id },
      select: {
        ustaz: true,
        selectedTime: true,
        daypackages: true,
        rigistral: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Registration not found" },
        { status: 404 }
      );
    }
    const hasNotChanged =
      existing.ustaz === ustaz &&
      existing.selectedTime === timeSlot &&
      existing.daypackages === selectedDayPackage;

    if (!hasNotChanged) {
      const availability = await checkTeacherAvailability(
        timeToMatch,
        selectedDayPackage,
        ustaz,
        id
      );
      if (!availability.isAvailable) {
        return NextResponse.json(
          { message: availability.message },
          { status: 400 }
        );
      }
    }

    const updatedRegistration = await prismaClient.$transaction(async (tx) => {
      const registration = await tx.wpos_wpdatatable_23.update({
        where: { wdt_ID: id },
        data: {
          name: fullName,
          phoneno: phoneNumber,
          classfee: classfee ? parseFloat(classfee) : null,
          startdate: startdate ? new Date(startdate) : null,
          control:
            session.role === "controller" ? session.username : control || null,
          status: status?.toLowerCase() || "pending",
          ustaz,
          package: regionPackage || null,
          subject: subject || null,
          country: country || null,
          rigistral:
            session.role === "registral"
              ? session.username
              : existing.rigistral, // Preserve original rigistral for controllers
          daypackages: selectedDayPackage,
          refer: refer || null,
          selectedTime: timeSlot,
          registrationdate: registrationdate
            ? new Date(registrationdate)
            : undefined,
        },
      });

      if (!hasNotChanged) {
        await tx.wpos_ustaz_occupied_times.deleteMany({
          where: {
            student_id: id,
            ustaz_id: existing.ustaz || "",
            time_slot: existing.selectedTime || "",
            daypackage: existing.daypackages || "",
          },
        });

        await tx.wpos_ustaz_occupied_times.create({
          data: {
            ustaz_id: ustaz,
            time_slot: timeSlot,
            daypackage: selectedDayPackage,
            student_id: id,
            occupied_at: new Date(),
          },
        });
      }

      console.log(
        `Registration updated for ${fullName} by ${session.username} - Notification triggered`
      );
      return registration;
    });

    return NextResponse.json(
      {
        message: "Registration updated successfully",
        id: updatedRegistration.wdt_ID,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json(
      {
        message: "Error updating registration",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  } finally {
    await prismaClient.$disconnect();
  }
}

export async function GET(request: NextRequest) {
  const session = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const registration = await prismaClient.wpos_wpdatatable_23.findUnique({
      where: { wdt_ID: parseInt(id) },
      select: {
        wdt_ID: true,
        name: true,
        phoneno: true,
        classfee: true,
        startdate: true,
        control: true,
        status: true,
        ustaz: true,
        package: true,
        subject: true,
        country: true,
        rigistral: true,
        daypackages: true,
        refer: true,
        registrationdate: true,
        selectedTime: true,
        isTrained: true,
        teacher: { select: { ustazname: true } },
      },
    });

    if (!registration) {
      return NextResponse.json(
        { message: "Registration not found" },
        { status: 404 }
      );
    }
    if (
      session.role === "controller" &&
      registration.control !== session.username
    ) {
      return NextResponse.json(
        { message: "Unauthorized to view this registration" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ...registration,
      id: registration.wdt_ID,
      ustazname: registration.teacher?.ustazname || "Not assigned",
    });
  }

  const whereClause =
    session.role === "controller"
      ? { control: session.username, name: { not: "" } }
      : { name: { not: "" } };

  const registrations = await prismaClient.wpos_wpdatatable_23.findMany({
    select: {
      wdt_ID: true,
      name: true,
      phoneno: true,
      classfee: true,
      startdate: true,
      control: true,
      status: true,
      ustaz: true,
      package: true,
      subject: true,
      country: true,
      rigistral: true,
      daypackages: true,
      refer: true,
      registrationdate: true,
      selectedTime: true,
      isTrained: true,
      teacher: { select: { ustazname: true } },
    },
    where: whereClause,
    orderBy: { registrationdate: "desc" },
  });

  const flatRegistrations = registrations.map((reg) => ({
    ...reg,
    id: reg.wdt_ID,
    ustazname: reg.teacher?.ustazname || "Not assigned",
  }));

  return NextResponse.json(flatRegistrations);
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const endpoint = searchParams.get("endpoint");
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (id) {
      const parsedId = parseInt(id);
      if (!parsedId || parsedId <= 0) {
        return NextResponse.json(
          { message: "Invalid registration ID" },
          { status: 400 }
        );
      }

      const existingRegistration =
        await prismaClient.wpos_wpdatatable_23.findUnique({
          where: { wdt_ID: parsedId },
          select: { control: true },
        });
      if (!existingRegistration) {
        return NextResponse.json(
          { message: "Registration not found" },
          { status: 404 }
        );
      }
      if (
        session.role === "controller" &&
        existingRegistration.control !== session.username
      ) {
        return NextResponse.json(
          { message: "Unauthorized to delete this registration" },
          { status: 403 }
        );
      }

      // Check for related records in all relevant tables EXCEPT occupied times
      const [
        hasPayments,
        hasMonths,
        hasAttendance,
        hasZoom,
        hasTestResult,
        hasTestAppointment,
      ] = await Promise.all([
        prismaClient.payment.findFirst({ where: { studentid: parsedId } }),
        prismaClient.months_table.findFirst({ where: { studentid: parsedId } }),
        prismaClient.student_attendance_progress.findFirst({
          where: { student_id: parsedId },
        }),
        prismaClient.wpos_zoom_links.findFirst({
          where: { studentid: parsedId },
        }),
        prismaClient.testResult.findFirst({ where: { studentId: parsedId } }),
        prismaClient.testAppointment.findFirst({
          where: { studentId: parsedId },
        }),
      ]);

      if (hasPayments) {
        return NextResponse.json(
          {
            message:
              "Cannot delete: student has related payment or other records. Please contact admin for further action.",
          },
          { status: 400 }
        );
      }
      if (
        hasMonths ||
        hasAttendance ||
        hasZoom ||
        hasTestResult ||
        hasTestAppointment
      ) {
        return NextResponse.json(
          {
            message:
              "Cannot delete: student has related records in other tables (excluding payments and occupied times). Please contact an admin for further action.",
          },
          { status: 400 }
        );
      }

      // No related records (except possibly payments and occupied times), safe to delete
      await prismaClient.$transaction(async (tx) => {
        // Delete occupied times to free up teacher slots
        await tx.wpos_ustaz_occupied_times.deleteMany({
          where: { student_id: parsedId },
        });
        // DO NOT delete payment records
        await tx.wpos_wpdatatable_23.delete({ where: { wdt_ID: parsedId } });
      });

      console.log(
        `Registration ${parsedId} deleted by ${session.username} - No related records except payments and occupied times.`
      );
      return NextResponse.json(
        { message: "Registration deleted successfully" },
        { status: 200 }
      );
    }

    if (endpoint === "bulk") {
      const { ids } = await request.json();

      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { message: "An array of registration IDs is required" },
          { status: 400 }
        );
      }

      const existingRegistrations =
        await prismaClient.wpos_wpdatatable_23.findMany({
          where: {
            wdt_ID: { in: ids.map((id: number) => parseInt(id.toString())) },
            control:
              session.role === "controller" ? session.username : undefined,
          },
        });

      if (existingRegistrations.length !== ids.length) {
        return NextResponse.json(
          { message: "One or more registrations not found" },
          { status: 404 }
        );
      }

      await prismaClient.$transaction(async (tx) => {
        await tx.wpos_ustaz_occupied_times.deleteMany({
          where: {
            student_id: {
              in: ids.map((id: number) => parseInt(id.toString())),
            },
          },
        });
        // DO NOT delete payment records in bulk delete
        await tx.wpos_wpdatatable_23.deleteMany({
          where: {
            wdt_ID: { in: ids.map((id: number) => parseInt(id.toString())) },
            control:
              session.role === "controller" ? session.username : undefined,
          },
        });
      });

      console.log(
        `Bulk deletion of ${ids.length} registrations by ${session.username} - Notification triggered`
      );
      return NextResponse.json(
        { message: "Registrations deleted successfully" },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: "Invalid request: Missing id or endpoint parameter" },
      { status: 400 }
    );
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Error deleting registration(s)",
      },
      { status: 500 }
    );
  } finally {
    await prismaClient.$disconnect();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get("endpoint");
    const id = searchParams.get("id");

    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (id) {
      const { isTrained } = await request.json();
      if (typeof isTrained !== "boolean") {
        return NextResponse.json(
          { message: "isTrained must be a boolean" },
          { status: 400 }
        );
      }
      const existing = await prismaClient.wpos_wpdatatable_23.findUnique({
        where: { wdt_ID: parseInt(id) },
        select: { control: true },
      });
      if (!existing) {
        return NextResponse.json(
          { message: "Registration not found" },
          { status: 404 }
        );
      }
      if (
        session.role === "controller" &&
        existing.control !== session.username
      ) {
        return NextResponse.json(
          { message: "Unauthorized to update this registration" },
          { status: 403 }
        );
      }
      const updated = await prismaClient.wpos_wpdatatable_23.update({
        where: { wdt_ID: parseInt(id) },
        data: { isTrained },
      });
      console.log(
        `Trained status updated for registration ${id} by ${session.username} - Notification triggered`
      );
      return NextResponse.json(
        { message: "Trained status updated", registration: updated },
        { status: 200 }
      );
    }

    if (endpoint === "bulk-status") {
      const { ids, status } = await request.json();

      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { message: "An array of registration IDs is required" },
          { status: 400 }
        );
      }

      if (
        !status ||
        ![
          "active",
          "inactive",
          "pending",
          "leave",
          "remadan leave",
          "notyet",
          "fresh",
        ].includes(status.toLowerCase())
      ) {
        return NextResponse.json(
          {
            message:
              "Status must be active, inactive, pending, leave, remadan leave, notyet, or fresh",
          },
          { status: 400 }
        );
      }

      const existingRegistrations =
        await prismaClient.wpos_wpdatatable_23.findMany({
          where: {
            wdt_ID: { in: ids.map((id: string) => parseInt(id)) },
            control:
              session.role === "controller" ? session.username : undefined,
          },
        });

      if (existingRegistrations.length !== ids.length) {
        return NextResponse.json(
          { message: "One or more registrations not found" },
          { status: 404 }
        );
      }

      await prismaClient.wpos_wpdatatable_23.updateMany({
        where: {
          wdt_ID: { in: ids.map((id: string) => parseInt(id)) },
          control: session.role === "controller" ? session.username : undefined,
        },
        data: { status: status.toLowerCase() },
      });

      console.log(
        `Bulk status updated for ${ids.length} registrations by ${session.username} - Notification triggered`
      );
      return NextResponse.json(
        { message: "Statuses updated successfully" },
        { status: 200 }
      );
    }

    return NextResponse.json({ message: "Invalid endpoint" }, { status: 400 });
  } catch (error) {
    console.error("PATCH error:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Error updating statuses",
      },
      { status: 500 }
    );
  } finally {
    await prismaClient.$disconnect();
  }
}
