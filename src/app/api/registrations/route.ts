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

  console.log(`Teacher ${teacher.ustazname} schedule times:`, scheduleTimes);
  console.log(`Normalized schedule times:`, normalizedScheduleTimes);
  console.log(`Looking for time: ${timeToMatch}`);

  // Check if teacher is available at this time
  if (!normalizedScheduleTimes.includes(timeToMatch)) {
    console.log(
      `Schedule check failed for ${teacher.ustazname}: ${teacher.schedule}`
    );
    console.log(
      `Looking for: ${timeToMatch}, Available: ${normalizedScheduleTimes}`
    );
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
    console.log("Registration API received body:", body);
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

    console.log("Extracted fields:");
    console.log("- fullName:", fullName);
    console.log("- phoneNumber:", phoneNumber);
    console.log("- ustaz:", ustaz);
    console.log("- selectedDayPackage:", selectedDayPackage);
    console.log("- selectedTime:", selectedTime);

    // Validation
    if (!fullName || fullName.trim() === "") {
      console.log("Validation failed: fullName is empty");
      return NextResponse.json(
        { message: "Full name is required" },
        { status: 400 }
      );
    }
    if (!phoneNumber || phoneNumber.trim() === "") {
      console.log("Validation failed: phoneNumber is empty");
      return NextResponse.json(
        { message: "Phone number is required" },
        { status: 400 }
      );
    }
    if (!ustaz || ustaz.trim() === "") {
      console.log("Validation failed: ustaz is empty");
      return NextResponse.json(
        { message: "Teacher is required" },
        { status: 400 }
      );
    }
    if (!selectedDayPackage || selectedDayPackage.trim() === "") {
      console.log("Validation failed: selectedDayPackage is empty");
      return NextResponse.json(
        { message: "Day package is required" },
        { status: 400 }
      );
    }
    if (!selectedTime || selectedTime.trim() === "") {
      console.log("Validation failed: selectedTime is empty");
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

    // Determine the u_control value
    let u_control = null;
    if (session.role === "controller") {
      u_control = session.code;
    } else if (control) {
      // Look up the controller's code based on username
      const controller = await prisma.wpos_wpdatatable_28.findFirst({
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
          selectedTime: timeSlot, // Store in 12-hour format for display
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

      console.log(
        `Registration created for ${fullName} by ${
          session.code || session.username
        } - Notification triggered`
      );
      return registration;
    });

    return NextResponse.json(
      { message: "Registration successful", id: newRegistration.wdt_ID },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
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
    console.log("PUT request body:", body);
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

    console.log("PUT validation check:");
    console.log("- fullName:", fullName);
    console.log("- phoneNumber:", phoneNumber);
    console.log("- ustaz:", ustaz);
    console.log("- selectedDayPackage:", selectedDayPackage);
    console.log("- selectedTime:", selectedTime);

    // Validation
    if (!fullName || fullName.trim() === "") {
      console.log("Validation failed: fullName is empty");
      return NextResponse.json(
        { message: "Full name is required" },
        { status: 400 }
      );
    }
    if (!phoneNumber || phoneNumber.trim() === "") {
      console.log("Validation failed: phoneNumber is empty");
      return NextResponse.json(
        { message: "Phone number is required" },
        { status: 400 }
      );
    }
    if (!ustaz || ustaz.trim() === "") {
      console.log("Validation failed: ustaz is empty");
      return NextResponse.json(
        { message: "Teacher ID is required" },
        { status: 400 }
      );
    }
    if (!selectedDayPackage || selectedDayPackage.trim() === "") {
      console.log("Validation failed: selectedDayPackage is empty");
      return NextResponse.json(
        { message: "Day package is required" },
        { status: 400 }
      );
    }
    if (!selectedTime || selectedTime.trim() === "") {
      console.log("Validation failed: selectedTime is empty");
      return NextResponse.json(
        { message: "Selected time is required" },
        { status: 400 }
      );
    }

    // Validate time format
    if (!validateTime(selectedTime)) {
      console.log("Validation failed: invalid time format:", selectedTime);
      return NextResponse.json(
        { message: `Invalid time format: ${selectedTime}` },
        { status: 400 }
      );
    }

    const timeToMatch = to24Hour(selectedTime);
    const timeSlot = to12Hour(timeToMatch);
    console.log("Time conversion:", { selectedTime, timeToMatch, timeSlot });

    const existing = await prismaClient.wpos_wpdatatable_23.findUnique({
      where: { wdt_ID: parseInt(id) },
      select: {
        ustaz: true,
        selectedTime: true,
        daypackages: true,
        rigistral: true,
      },
    });

    if (!existing) {
      console.log("Registration not found for ID:", id);
      return NextResponse.json(
        { message: "Registration not found" },
        { status: 404 }
      );
    }

    const hasNotChanged =
      existing.ustaz === ustaz &&
      existing.selectedTime === timeSlot &&
      existing.daypackages === selectedDayPackage;

    console.log("Change detection:", {
      existing: {
        ustaz: existing.ustaz,
        selectedTime: existing.selectedTime,
        daypackages: existing.daypackages,
      },
      new: {
        ustaz,
        selectedTime: timeSlot,
        daypackages: selectedDayPackage,
      },
      hasNotChanged,
    });

    if (!hasNotChanged) {
      // Check teacher availability
      console.log("Checking teacher availability for changes...");
      const availability = await checkTeacherAvailability(
        timeToMatch,
        selectedDayPackage,
        ustaz,
        parseInt(id)
      );

      console.log("Teacher availability result:", availability);

      if (!availability.isAvailable) {
        console.log("Teacher availability check failed:", availability.message);
        return NextResponse.json(
          { message: availability.message },
          { status: 400 }
        );
      }
    }

    const updatedRegistration = await prismaClient.$transaction(async (tx) => {
      const registration = await tx.wpos_wpdatatable_23.update({
        where: { wdt_ID: parseInt(id) },
        data: {
          name: fullName,
          phoneno: phoneNumber,
          classfee: classfee ? parseFloat(classfee) : null,
          startdate: startdate ? new Date(startdate) : null,
          u_control:
            session.role === "controller" ? session.code : control || null,
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
          selectedTime: timeSlot,
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
            time_slot: existing.selectedTime || "",
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

      console.log(
        `Registration updated for ${fullName} by ${
          session.code || session.username
        } - Notification triggered`
      );
      return registration;
    });

    return NextResponse.json(
      { message: "Registration updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update registration error:", error);
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
      console.error("Error fetching student slot count:", error);
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
      registration.u_control !== session.code
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
