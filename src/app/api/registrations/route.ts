import { PrismaClient } from "@prisma/client";
import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma as globalPrisma } from "@/lib/prisma";
import {
  to24Hour,
  to12Hour,
  validateTime,
  isTimeConflict,
} from "@/utils/timeUtils";

const prismaClient = globalPrisma;

// Student slot limits per day package
const MAX_SLOTS_PER_STUDENT = 2;

const checkTeacherAvailability = async (
  selectedTime: string,
  selectedDayPackage: string,
  teacherId: string,
  excludeStudentId?: number
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

  // Check if teacher is available at this time
  if (!normalizedScheduleTimes.includes(timeToMatch)) {
    return {
      isAvailable: false,
      message: `Teacher ${teacher.ustazname} is not available at ${selectedTime}`,
    };
  }

  // Check for conflicts with existing bookings
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

    // Check each existing booking for conflicts with the new booking
    for (const booking of teacherBookings) {
      const booked = normalize(booking.daypackage);

      // If either the existing booking or the new booking is "All days", there's a conflict
      if (booked === "all days" || sel === "all days") {
        return true;
      }

      // Check for exact package matches
      if (booked === sel) {
        return true;
      }
    }

    // MWF and TTS are mutually exclusive, so no conflict between them
    return false;
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

    if (session.role === "controller" && control !== session.code) {
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

    // Validation
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

    // Validate time format
    if (!validateTime(selectedTime)) {
      return NextResponse.json(
        { message: `Invalid time format: ${selectedTime}` },
        { status: 400 }
      );
    }

    const timeToMatch = to24Hour(selectedTime);
    const timeSlot = to12Hour(timeToMatch);

    // Check teacher availability
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

    // Check if the selected time slot is available for the teacher
    const isTimeSlotAvailable =
      await prismaClient.wpos_ustaz_occupied_times.findFirst({
        where: {
          ustaz_id: ustaz,
          time_slot: timeSlot,
          daypackage: selectedDayPackage,
        },
      });

    if (isTimeSlotAvailable) {
      return NextResponse.json(
        { error: "This time slot is already occupied by another student" },
        { status: 400 }
      );
    }

    // Check for conflicts with existing bookings
    const existingBookings =
      await prismaClient.wpos_ustaz_occupied_times.findMany({
        where: {
          ustaz_id: ustaz,
          time_slot: timeSlot,
        },
      });

    // Check for day package conflicts
    const hasConflict = existingBookings.some((booking) => {
      const normalize = (pkg: string) => pkg.trim().toLowerCase();
      const sel = selectedDayPackage.toLowerCase();
      const booked = booking.daypackage.toLowerCase();

      // If either the existing booking or the new booking is "All days", there's a conflict
      if (booked === "all days" || sel === "all days") {
        return true;
      }

      // Check for exact package matches
      if (booked === sel) {
        return true;
      }

      // MWF and TTS are mutually exclusive, so no conflict between them
      return false;
    });

    if (hasConflict) {
      return NextResponse.json(
        {
          error:
            "This time slot is already booked for a conflicting day package.",
        },
        { status: 400 }
      );
    }

    // Determine the u_control value
    let u_control = null;
    if (session.role === "controller") {
      u_control = session.code;
    } else if (control) {
      // Look up the controller's code based on username
      const controller = await prismaClient.wpos_wpdatatable_28.findFirst({
        where: { username: control },
        select: { code: true },
      });
      u_control = controller?.code || null;
    }

    const newRegistration = await prismaClient.$transaction(async (tx) => {
      const registration = await tx.wpos_wpdatatable_23.create({
        data: {
          name: fullName,
          phoneno: phoneNumber,
          classfee: classfee ? parseFloat(classfee) : null,
          startdate: startdate ? new Date(startdate) : null,
          u_control,
          status: status?.toLowerCase() || "pending",
          ustaz,
          package: regionPackage || null,
          subject: subject || null,
          country: country || null,
          rigistral,
          daypackages: selectedDayPackage,
          refer: refer || null,
          registrationdate: registrationdate
            ? new Date(registrationdate)
            : new Date(),
        },
      });

      // Create occupied time record
      await tx.wpos_ustaz_occupied_times.create({
        data: {
          ustaz_id: ustaz,
          time_slot: timeSlot,
          daypackage: selectedDayPackage,
          student_id: registration.wdt_ID,
          occupied_at: new Date(),
        },
      });

      return registration;
    });

    return NextResponse.json(
      { message: "Registration successful", id: newRegistration.wdt_ID },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { message: "Registration ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { control } = body;

    // For controllers, check if they own the registration first
    if (session.role === "controller") {
      const existingRegistration =
        await prismaClient.wpos_wpdatatable_23.findUnique({
          where: { wdt_ID: parseInt(id) },
          select: { u_control: true },
        });

      if (!existingRegistration) {
        return NextResponse.json(
          { message: "Registration not found" },
          { status: 404 }
        );
      }

      // Allow if controller owns the registration OR if they're not changing the control field
      if (
        existingRegistration.u_control !== session.code &&
        control !== session.code
      ) {
        return NextResponse.json(
          { message: "Unauthorized to assign to another controller" },
          { status: 403 }
        );
      }
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

    // Validation
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

    // Validate time format
    if (!validateTime(selectedTime)) {
      return NextResponse.json(
        { message: `Invalid time format: ${selectedTime}` },
        { status: 400 }
      );
    }

    const timeToMatch = to24Hour(selectedTime);
    const timeSlot = to12Hour(timeToMatch);
    const existing = await prismaClient.wpos_wpdatatable_23.findUnique({
      where: { wdt_ID: parseInt(id) },
      select: {
        ustaz: true,
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
      existing.ustaz === ustaz && existing.daypackages === selectedDayPackage;

    if (!hasNotChanged) {
      // Check teacher availability
      const availability = await checkTeacherAvailability(
        timeToMatch,
        selectedDayPackage,
        ustaz,
        parseInt(id)
      );

      if (!availability.isAvailable) {
        return NextResponse.json(
          { message: availability.message },
          { status: 400 }
        );
      }
    }

    // Determine the u_control value for update
    let u_control = null;
    if (session.role === "controller") {
      u_control = session.code;
    } else if (control) {
      // Look up the controller's code based on username
      const controller = await prismaClient.wpos_wpdatatable_28.findFirst({
        where: { username: control },
        select: { code: true },
      });
      u_control = controller?.code || null;
    }

    const updatedRegistration = await prismaClient.$transaction(async (tx) => {
      const registration = await tx.wpos_wpdatatable_23.update({
        where: { wdt_ID: parseInt(id) },
        data: {
          name: fullName,
          phoneno: phoneNumber,
          classfee: classfee ? parseFloat(classfee) : null,
          startdate: startdate ? new Date(startdate) : null,
          u_control,
          status: status?.toLowerCase() || "pending",
          ustaz,
          package: regionPackage || null,
          subject: subject || null,
          country: country || null,
          rigistral:
            session.role === "registral"
              ? session.username
              : existing.rigistral,
          daypackages: selectedDayPackage,
          refer: refer || null,
          registrationdate: registrationdate
            ? new Date(registrationdate)
            : undefined,
        },
      });

      if (!hasNotChanged) {
        // Remove old occupied time
        await tx.wpos_ustaz_occupied_times.deleteMany({
          where: {
            student_id: parseInt(id),
            ustaz_id: existing.ustaz || "",
            daypackage: existing.daypackages || "",
          },
        });

        // Create new occupied time
        await tx.wpos_ustaz_occupied_times.create({
          data: {
            ustaz_id: ustaz,
            time_slot: timeSlot,
            daypackage: selectedDayPackage,
            student_id: parseInt(id),
            occupied_at: new Date(),
          },
        });
      }

      return registration;
    });

    return NextResponse.json(
      { message: "Registration updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
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
  const student = searchParams.get("student");
  const daypackage = searchParams.get("daypackage");

  // Handle student slot count request
  if (student && daypackage) {
    try {
      const studentId = student === "new" ? undefined : parseInt(student);
      const slotCount = await prismaClient.wpos_ustaz_occupied_times.count({
        where: {
          student_id: studentId,
          daypackage: daypackage,
        },
      });

      return NextResponse.json({ slotCount });
    } catch (error) {
      return NextResponse.json({ slotCount: 0 });
    }
  }

  if (id) {
    const registration = await prismaClient.wpos_wpdatatable_23.findUnique({
      where: { wdt_ID: parseInt(id) },
      select: {
        wdt_ID: true,
        name: true,
        phoneno: true,
        classfee: true,
        startdate: true,
        u_control: true,
        status: true,
        ustaz: true,
        package: true,
        subject: true,
        country: true,
        rigistral: true,
        daypackages: true,
        refer: true,
        registrationdate: true,
        isTrained: true,
        teacher: { select: { ustazname: true } },
        occupiedTimes: {
          select: {
            time_slot: true,
            daypackage: true,
          },
        },
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
      registration.u_control !== session.code
    ) {
      return NextResponse.json(
        { message: "Unauthorized to view this registration" },
        { status: 403 }
      );
    }

    // Get the time slot from occupied times
    const timeSlot =
      registration.occupiedTimes?.[0]?.time_slot || "Not specified";

    return NextResponse.json({
      ...registration,
      id: registration.wdt_ID,
      ustazname: registration.teacher?.ustazname || "Not assigned",
      selectedTime: timeSlot, // Keep for backward compatibility
    });
  }

  const whereClause =
    session.role === "controller"
      ? { u_control: session.code, name: { not: "" } }
      : { name: { not: "" } };

  const registrations = await prismaClient.wpos_wpdatatable_23.findMany({
    select: {
      wdt_ID: true,
      name: true,
      phoneno: true,
      classfee: true,
      startdate: true,
      u_control: true,
      status: true,
      ustaz: true,
      package: true,
      subject: true,
      country: true,
      rigistral: true,
      daypackages: true,
      refer: true,
      registrationdate: true,
      isTrained: true,
      teacher: { select: { ustazname: true } },
      occupiedTimes: {
        select: {
          time_slot: true,
          daypackage: true,
        },
      },
    },
    where: whereClause,
    orderBy: { registrationdate: "desc" },
  });

  const flatRegistrations = registrations.map((reg) => ({
    ...reg,
    id: reg.wdt_ID,
    ustazname: reg.teacher?.ustazname || "Not assigned",
    selectedTime: reg.occupiedTimes?.[0]?.time_slot || "Not specified", // Keep for backward compatibility
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
          select: { u_control: true },
        });
      if (!existingRegistration) {
        return NextResponse.json(
          { message: "Registration not found" },
          { status: 404 }
        );
      }
      if (
        session.role === "controller" &&
        existingRegistration.u_control !== session.code
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
        prismaClient.testresult.findFirst({ where: { studentId: parsedId } }),
        prismaClient.testappointment.findFirst({
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
            u_control: session.role === "controller" ? session.code : undefined,
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
            u_control: session.role === "controller" ? session.code : undefined,
          },
        });
      });

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
        select: { u_control: true },
      });
      if (!existing) {
        return NextResponse.json(
          { message: "Registration not found" },
          { status: 404 }
        );
      }
      if (
        session.role === "controller" &&
        existing.u_control !== session.code
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
            u_control: session.role === "controller" ? session.code : undefined,
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
          u_control: session.role === "controller" ? session.code : undefined,
        },
        data: { status: status.toLowerCase() },
      });

      return NextResponse.json(
        { message: "Statuses updated successfully" },
        { status: 200 }
      );
    }

    return NextResponse.json({ message: "Invalid endpoint" }, { status: 400 });
  } catch (error) {
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
