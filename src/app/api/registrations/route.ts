import { PrismaClient } from "@prisma/client";
import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma as globalPrisma } from "@/lib/prisma";
import { SalaryCalculator } from "@/lib/salary-calculator";
import { clearCalculatorCache } from "@/lib/calculator-cache";
import {
  to24Hour,
  to12Hour,
  validateTime,
  isTimeConflict,
  toDbFormat,
  fromDbFormat,
  timesMatch,
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

  // Normalize time formats for comparison - handle both 12-hour and 24-hour formats with seconds
  const normalizedScheduleTimes = scheduleTimes.map((time) => {
    try {
      return to24Hour(time); // This now handles HH:MM:SS format properly
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

  // Check for conflicts with active assignments
  const allBookings = await prismaClient.wpos_ustaz_occupied_times.findMany({
    where: {
      time_slot: timeSlot,
      end_at: null, // Only active assignments
    },
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
    const { control, email, usStudentId } = body;

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
      parentPhone,
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
      chatId,
      reason,
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
    // Only require teacher and time if status is not "On Progress"
    if (status !== "On Progress") {
      if (!ustaz || ustaz.trim() === "") {
        return NextResponse.json(
          { message: "Teacher is required" },
          { status: 400 }
        );
      }
      if (!selectedTime || selectedTime.trim() === "") {
        return NextResponse.json(
          { message: "Selected time is required" },
          { status: 400 }
        );
      }
    }

    // If ustaz is provided, validate it exists in the teacher table
    if (ustaz && ustaz.trim() !== "") {
      const teacherExists = await prismaClient.wpos_wpdatatable_24.findUnique({
        where: { ustazid: ustaz },
        select: { ustazid: true },
      });

      if (!teacherExists) {
        return NextResponse.json(
          { message: `Teacher with ID ${ustaz} does not exist` },
          { status: 400 }
        );
      }
    }
    if (!selectedDayPackage || selectedDayPackage.trim() === "") {
      return NextResponse.json(
        { message: "Day package is required" },
        { status: 400 }
      );
    }

    let timeToMatch, timeSlot;

    // Only validate time and check availability if not "On Progress"
    if (status !== "On Progress" && selectedTime && ustaz) {
      // Validate time format
      if (!validateTime(selectedTime)) {
        return NextResponse.json(
          { message: `Invalid time format: ${selectedTime}` },
          { status: 400 }
        );
      }

      timeToMatch = to24Hour(selectedTime);
      timeSlot = to12Hour(timeToMatch);

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
    }

    // Only check time slot availability if we have both teacher and time
    if (ustaz && selectedTime && timeSlot) {
      // Check if the selected time slot is available for the teacher
      const isTimeSlotAvailable =
        await prismaClient.wpos_ustaz_occupied_times.findFirst({
          where: {
            ustaz_id: ustaz,
            OR: [
              { time_slot: timeSlot },
              { time_slot: toDbFormat(selectedTime) },
              { time_slot: timeToMatch },
            ],
            daypackage: selectedDayPackage,
            end_at: null, // Only active assignments
          },
        });

      if (isTimeSlotAvailable) {
        return NextResponse.json(
          { error: "This time slot is already occupied by another student" },
          { status: 400 }
        );
      }

      // Check for conflicts with active assignments
      const existingBookings =
        await prismaClient.wpos_ustaz_occupied_times.findMany({
          where: {
            ustaz_id: ustaz,
            OR: [
              { time_slot: timeSlot },
              { time_slot: toDbFormat(selectedTime) },
              { time_slot: timeToMatch },
            ],
            end_at: null, // Only active assignments
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
    }

    // Determine the u_control value
    let u_control = null;

    if (session.role === "controller") {
      u_control = session.code;
    } else if (session.role === "registral" && control) {
      // For registral role, use the provided control value
      u_control = control;
    } else if (control) {
      // If control looks like a code (length >= 3, all uppercase, or matches a code in DB), use it directly
      if (/^[A-Z0-9]{3,}$/.test(control)) {
        u_control = control;
      } else {
        // Look up the controller's code based on username as fallback
        const controller = await prismaClient.wpos_wpdatatable_28.findFirst({
          where: { username: control },
          select: { code: true },
        });
        u_control = controller?.code || null;
      }
    }

    // Allow null u_control for registral role when refer is optional
    if (!u_control && session.role !== "registral") {
      return NextResponse.json(
        {
          message:
            "Controller assignment failed. Please select a valid controller.",
          debug: {
            sessionRole: session.role,
            sessionCode: session.code,
            controlParam: control,
          },
        },
        { status: 400 }
      );
    }

    const newRegistration = await prismaClient.$transaction(async (tx) => {
      const createData: any = {
        name: fullName,
        phoneno: phoneNumber,
        parent_phone: parentPhone || null,
        classfee:
          classfee !== undefined && classfee !== null
            ? parseFloat(classfee)
            : null,
        startdate: startdate ? new Date(startdate) : null,
        u_control,
        status: status
          ? status.toLowerCase() === "not yet"
            ? "Not yet"
            : status?.charAt(0)?.toUpperCase() +
                status?.slice(1).toLowerCase() || "Not yet"
          : "Not yet",
        package: regionPackage || null,
        subject: subject || null,
        country: country || null,
        rigistral,
        daypackages: selectedDayPackage,
        refer: refer || null,
        registrationdate: registrationdate
          ? new Date(registrationdate)
          : new Date(),
        userId: usStudentId ? usStudentId.toString() : null,
        chatId: chatId || null,
        reason: reason || null,
      };

      // Only set ustaz if it's provided and not empty
      if (ustaz && ustaz.trim() !== "") {
        createData.ustaz = ustaz;
      }

      const registration = await tx.wpos_wpdatatable_23.create({
        data: createData,
      });

      // Create assignment record only if we have both teacher and time
      if (ustaz && selectedTime) {
        try {
          await tx.wpos_ustaz_occupied_times.create({
            data: {
              ustaz_id: ustaz,
              time_slot: toDbFormat(selectedTime),
              daypackage: selectedDayPackage,
              student_id: registration.wdt_ID,
              occupied_at: new Date(),
              end_at: null,
            },
          });

          // Record initial teacher assignment in history
          const packageSalary = await tx.packageSalary.findFirst({
            where: { packageName: regionPackage },
            select: { salaryPerStudent: true },
          });

          const monthlyRate = Number(packageSalary?.salaryPerStudent || 0);
          const dailyRate = monthlyRate / 30;

          // Record initial teacher assignment in history
          await tx.teacher_change_history.create({
            data: {
              student_id: registration.wdt_ID,
              old_teacher_id: null, // No previous teacher for new registration
              new_teacher_id: ustaz,
              change_date: new Date(),
              change_reason: "Initial student registration",
              time_slot: toDbFormat(selectedTime),
              daypackage: selectedDayPackage,
              student_package: regionPackage || null,
              monthly_rate: monthlyRate,
              daily_rate: dailyRate,
              created_by: session?.email || "system",
            },
          });

          // Clear salary cache for the teacher to ensure dynamic updates
          SalaryCalculator.clearGlobalTeacherCache(ustaz);

          // Clear the calculator cache to force fresh data
          clearCalculatorCache();
        } catch (occupiedError) {
          console.warn("Failed to create assignment record:", occupiedError);
        }
      }

      // No need to update user table since userId is now stored in registration

      return registration;
    });

    return NextResponse.json(
      { message: "Registration successful", id: newRegistration.wdt_ID },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration POST error:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
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

    const existingRegistration =
      await prismaClient.wpos_wpdatatable_23.findUnique({
        where: { wdt_ID: parseInt(id) },
        select: {
          u_control: true,
          userId: true,
          ustaz: true,
          daypackages: true,
          rigistral: true,
        },
      });

    if (!existingRegistration) {
      return NextResponse.json(
        { message: "Registration not found" },
        { status: 404 }
      );
    }

    if (session.role === "controller") {
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
      parentPhone,
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
      chatId,
      reason,
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
    if (
      !existingRegistration.userId &&
      regionPackage !== "0 Fee" &&
      !classfee &&
      classfee !== 0 &&
      classfee !== null &&
      classfee !== undefined
    ) {
      return NextResponse.json(
        { message: "Class Fee is required for non-US students" },
        { status: 400 }
      );
    }
    // Only require teacher and time for non-"On Progress" status
    if (status !== "On Progress") {
      if (!ustaz || ustaz.trim() === "") {
        return NextResponse.json(
          { message: "Teacher ID is required" },
          { status: 400 }
        );
      }
      if (!selectedTime || selectedTime.trim() === "") {
        return NextResponse.json(
          { message: "Selected time is required" },
          { status: 400 }
        );
      }
    }

    // If ustaz is provided, validate it exists in the teacher table
    if (ustaz && ustaz.trim() !== "") {
      const teacherExists = await prismaClient.wpos_wpdatatable_24.findUnique({
        where: { ustazid: ustaz },
        select: { ustazid: true },
      });

      if (!teacherExists) {
        return NextResponse.json(
          { message: `Teacher with ID ${ustaz} does not exist` },
          { status: 400 }
        );
      }
    }

    if (!selectedDayPackage || selectedDayPackage.trim() === "") {
      return NextResponse.json(
        { message: "Day package is required" },
        { status: 400 }
      );
    }

    // Only validate time format if time is provided and status is not "On Progress"
    if (
      selectedTime &&
      status !== "On Progress" &&
      !validateTime(selectedTime)
    ) {
      return NextResponse.json(
        { message: `Invalid time format: ${selectedTime}` },
        { status: 400 }
      );
    }

    const timeToMatch = selectedTime ? to24Hour(selectedTime) : null;
    const timeSlot = selectedTime && timeToMatch ? to12Hour(timeToMatch) : null;

    // Get current active assignment
    const currentOccupiedTime =
      await prismaClient.wpos_ustaz_occupied_times.findFirst({
        where: {
          student_id: parseInt(id),
          end_at: null,
        },
        select: {
          id: true,
          time_slot: true,
          ustaz_id: true,
          daypackage: true,
          occupied_at: true,
        },
      });

    const currentTimeSlot = currentOccupiedTime
      ? fromDbFormat(currentOccupiedTime.time_slot, "12h")
      : null;

    const hasTimeChanged = currentTimeSlot !== selectedTime;
    const hasTeacherChanged = existingRegistration.ustaz !== ustaz;
    const hasDayPackageChanged =
      existingRegistration.daypackages !== selectedDayPackage;

    // For "On Progress" status, only consider it a change if we're actually assigning a teacher/time
    const hasAnyTimeTeacherChange =
      status === "On Progress"
        ? ustaz &&
          selectedTime &&
          (hasTimeChanged || hasTeacherChanged || hasDayPackageChanged)
        : hasTimeChanged || hasTeacherChanged || hasDayPackageChanged;

    // Prevent unnecessary updates
    if (
      hasAnyTimeTeacherChange &&
      currentOccupiedTime &&
      currentOccupiedTime.ustaz_id === ustaz &&
      timesMatch(currentOccupiedTime.time_slot, selectedTime) &&
      currentOccupiedTime.daypackage === selectedDayPackage
    ) {
      return NextResponse.json(
        { message: "No changes to teacher, time slot, or day package" },
        { status: 400 }
      );
    }

    // Check student slot limits
    const slotCount = await prismaClient.wpos_ustaz_occupied_times.count({
      where: {
        student_id: parseInt(id),
        daypackage: selectedDayPackage,
        end_at: null,
      },
    });
    if (slotCount >= MAX_SLOTS_PER_STUDENT && hasAnyTimeTeacherChange) {
      return NextResponse.json(
        {
          message: `Student exceeds maximum slots (${MAX_SLOTS_PER_STUDENT}) for ${selectedDayPackage}`,
        },
        { status: 400 }
      );
    }

    if (hasAnyTimeTeacherChange && ustaz && timeToMatch) {
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

    let u_control = null;
    if (session.role === "controller") {
      u_control = session.code;
    } else if (control) {
      if (/^[A-Z0-9]{3,}$/.test(control)) {
        u_control = control;
      } else {
        const controller = await prismaClient.wpos_wpdatatable_28.findFirst({
          where: { username: control },
          select: { code: true },
        });
        u_control = controller?.code || null;
      }
    }

    const updatedRegistration = await prismaClient.$transaction(async (tx) => {
      const currentRecord = await tx.wpos_wpdatatable_23.findUnique({
        where: { wdt_ID: parseInt(id) },
        select: { status: true },
      });

      let newStatus;
      if (status) {
        if (status.toLowerCase() === "not yet") {
          newStatus = "Not yet";
        } else {
          newStatus =
            status?.charAt(0)?.toUpperCase() + status?.slice(1).toLowerCase() ||
            "Pending";
        }
      } else {
        newStatus = "Pending";
      }

      const exitdate =
        newStatus === "Leave" && currentRecord?.status !== "Leave"
          ? new Date()
          : undefined;

      const shouldFreeTimeSlot = ["leave", "completed", "not succeed"].includes(
        newStatus.toLowerCase()
      );
      const wasActiveStatus =
        currentRecord?.status &&
        !["Leave", "Completed", "Not succeed"].includes(currentRecord.status);

      const updateData: any = {
        name: fullName,
        phoneno: phoneNumber,
        parent_phone: parentPhone || null,
        classfee:
          classfee !== undefined && classfee !== null
            ? parseFloat(classfee)
            : null,
        startdate: startdate ? new Date(startdate) : null,
        u_control,
        status: newStatus,
        package: regionPackage || null,
        subject: subject || null,
        country: country || null,
        rigistral:
          session.role === "registral"
            ? session.username
            : existingRegistration.rigistral,
        daypackages: selectedDayPackage,
        refer: refer || null,
        registrationdate: registrationdate
          ? new Date(registrationdate)
          : undefined,
        chatId: chatId || null,
        reason: reason || null,
        ...(exitdate && { exitdate }),
      };

      // Only update ustaz if it's provided and not empty
      if (ustaz && ustaz.trim() !== "") {
        updateData.ustaz = ustaz;
      }

      const registration = await tx.wpos_wpdatatable_23.update({
        where: { wdt_ID: parseInt(id) },
        data: updateData,
      });

      if (hasTeacherChanged && !shouldFreeTimeSlot) {
        const currentDate = new Date();
        const currentPeriod = `${currentDate.getFullYear()}-${String(
          currentDate.getMonth() + 1
        ).padStart(2, "0")}`;

        if (currentOccupiedTime?.ustaz_id) {
          await tx.teachersalarypayment.upsert({
            where: {
              teacherId_period: {
                teacherId: currentOccupiedTime.ustaz_id,
                period: currentPeriod,
              },
            },
            update: {},
            create: {
              teacherId: currentOccupiedTime.ustaz_id,
              period: currentPeriod,
              status: "Unpaid",
              totalSalary: 0,
              latenessDeduction: 0,
              absenceDeduction: 0,
              bonuses: 0,
            },
          });
        }

        // Only create teacher salary payment record if ustaz is valid
        if (ustaz && ustaz.trim() !== "") {
          await tx.teachersalarypayment.upsert({
            where: {
              teacherId_period: {
                teacherId: ustaz,
                period: currentPeriod,
              },
            },
            update: {},
            create: {
              teacherId: ustaz,
              period: currentPeriod,
              status: "Unpaid",
              totalSalary: 0,
              latenessDeduction: 0,
              absenceDeduction: 0,
              bonuses: 0,
            },
          });
        }
      }

      if (shouldFreeTimeSlot && wasActiveStatus) {
        // Record teacher change when student leaves/completes
        if (currentOccupiedTime) {
          const student = await tx.wpos_wpdatatable_23.findUnique({
            where: { wdt_ID: parseInt(id) },
            select: { name: true, package: true },
          });

          const packageSalary = await tx.packageSalary.findFirst({
            where: { packageName: student?.package || regionPackage },
            select: { salaryPerStudent: true },
          });

          const monthlyRate = Number(packageSalary?.salaryPerStudent || 0);
          const dailyRate = monthlyRate / 30;

          // IMPORTANT: Record teacher assignment end BEFORE deleting occupied time
          // This ensures the teacher's work is properly tracked for payment
          await tx.teacher_change_history.create({
            data: {
              student_id: parseInt(id),
              old_teacher_id: currentOccupiedTime.ustaz_id,
              new_teacher_id: currentOccupiedTime.ustaz_id, // Same teacher, but ending assignment
              change_date: new Date(),
              change_reason: `Student status changed to ${newStatus} - teacher assignment ended`,
              time_slot: currentOccupiedTime.time_slot,
              daypackage: currentOccupiedTime.daypackage,
              student_package: student?.package || regionPackage || null,
              monthly_rate: monthlyRate,
              daily_rate: dailyRate,
              created_by: session?.email || "system",
            },
          });

          // Clear salary cache for the teacher to ensure dynamic updates
          SalaryCalculator.clearGlobalTeacherCache(
            currentOccupiedTime.ustaz_id
          );
        }

        // Delete occupied times to free up teacher slots
        await tx.wpos_ustaz_occupied_times.deleteMany({
          where: {
            student_id: parseInt(id),
            end_at: null,
          },
        });
      } else if (
        hasAnyTimeTeacherChange &&
        !shouldFreeTimeSlot &&
        ustaz &&
        timeSlot
      ) {
        // Get student and package information
        const student = await tx.wpos_wpdatatable_23.findUnique({
          where: { wdt_ID: parseInt(id) },
          select: { name: true, package: true },
        });

        // Get package salary information
        const packageSalary = await tx.packageSalary.findFirst({
          where: { packageName: student?.package || regionPackage },
          select: { salaryPerStudent: true },
        });

        const monthlyRate = Number(packageSalary?.salaryPerStudent || 0);
        const dailyRate = monthlyRate / 30; // Approximate daily rate

        // 🔧 FIX: Distinguish between TEACHER CHANGE and TIME SLOT/DAY PACKAGE CHANGE
        if (hasTeacherChanged) {
          // ✅ TEACHER CHANGED - Create new record with current date
          console.log(
            `🔄 Teacher change detected for student ${id}: ${currentOccupiedTime?.ustaz_id} → ${ustaz}`
          );

          // Record old teacher's assignment end
          if (currentOccupiedTime?.ustaz_id) {
            await tx.teacher_change_history.create({
              data: {
                student_id: parseInt(id),
                old_teacher_id: currentOccupiedTime.ustaz_id,
                new_teacher_id: ustaz,
                change_date: new Date(),
                change_reason:
                  "Student teacher change - old teacher assignment ended",
                time_slot: currentOccupiedTime.time_slot,
                daypackage: currentOccupiedTime.daypackage,
                student_package: student?.package || regionPackage || null,
                monthly_rate: monthlyRate,
                daily_rate: dailyRate,
                created_by: session?.email || "system",
              },
            });
          }

          // Delete old teacher's assignment
          if (currentOccupiedTime) {
            await tx.wpos_ustaz_occupied_times.deleteMany({
              where: {
                student_id: parseInt(id),
                ustaz_id: currentOccupiedTime.ustaz_id,
                end_at: null,
              },
            });
          }

          // Create new assignment with NEW occupied_at date (correct for teacher changes)
          await tx.wpos_ustaz_occupied_times.create({
            data: {
              ustaz_id: ustaz,
              time_slot: toDbFormat(selectedTime),
              daypackage: selectedDayPackage,
              student_id: parseInt(id),
              occupied_at: new Date(), // ✅ New date is correct for teacher changes
              end_at: null,
            },
          });

          // Record new teacher assignment
          await tx.teacher_change_history.create({
            data: {
              student_id: parseInt(id),
              old_teacher_id: currentOccupiedTime?.ustaz_id || null,
              new_teacher_id: ustaz,
              change_date: new Date(),
              change_reason:
                "Student teacher change - new teacher assignment started",
              time_slot: toDbFormat(selectedTime),
              daypackage: selectedDayPackage,
              student_package: student?.package || regionPackage || null,
              monthly_rate: monthlyRate,
              daily_rate: dailyRate,
              created_by: session?.email || "system",
            },
          });

          // Clear cache for both teachers
          if (currentOccupiedTime?.ustaz_id) {
            SalaryCalculator.clearGlobalTeacherCache(
              currentOccupiedTime.ustaz_id
            );
          }
          SalaryCalculator.clearGlobalTeacherCache(ustaz);
          clearCalculatorCache();
        } else if (hasTimeChanged || hasDayPackageChanged) {
          // ✅ ONLY TIME SLOT OR DAY PACKAGE CHANGED - Update existing record
          console.log(
            `⏰ Time slot/day package update for student ${id}: ${currentOccupiedTime?.time_slot} → ${timeSlot}`
          );

          if (currentOccupiedTime) {
            // UPDATE existing record (PRESERVE occupied_at date!)
            await tx.wpos_ustaz_occupied_times.update({
              where: { id: currentOccupiedTime.id },
              data: {
                time_slot: toDbFormat(selectedTime),
                daypackage: selectedDayPackage,
                // ✅ DO NOT update occupied_at! This preserves salary calculation history
              },
            });

            console.log(
              `✅ Updated time slot for student ${id}, preserved occupied_at: ${currentOccupiedTime.occupied_at}`
            );

            // Clear cache for the teacher (same teacher, just different time)
            SalaryCalculator.clearGlobalTeacherCache(ustaz);
            clearCalculatorCache();
          } else {
            // No existing occupied_times, create new one
            await tx.wpos_ustaz_occupied_times.create({
              data: {
                ustaz_id: ustaz,
                time_slot: toDbFormat(selectedTime),
                daypackage: selectedDayPackage,
                student_id: parseInt(id),
                occupied_at: new Date(),
                end_at: null,
              },
            });
          }
        }
      } else if (!shouldFreeTimeSlot && !hasAnyTimeTeacherChange) {
        const activeStatuses = ["active", "not yet", "fresh"];
        if (
          activeStatuses.includes(newStatus.toLowerCase()) &&
          (!currentRecord?.status ||
            !["Active", "Not yet", "Fresh"].includes(currentRecord.status)) &&
          !currentOccupiedTime &&
          ustaz &&
          selectedTime
        ) {
          await tx.wpos_ustaz_occupied_times.create({
            data: {
              ustaz_id: ustaz,
              time_slot: toDbFormat(selectedTime),
              daypackage: selectedDayPackage,
              student_id: parseInt(id),
              occupied_at: new Date(),
              end_at: null,
            },
          });
        }
      }

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
    console.error("Registration PUT error:", error);
    try {
      const errorDetails = {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
      const errorString = JSON.stringify(errorDetails);
      const truncatedError =
        errorString.length > 200
          ? errorString.substring(0, 197) + "..."
          : errorString;

      await prismaClient.auditlog.create({
        data: {
          actionType: "assignment_update_error",
          adminId: "system",
          targetId: null,
          details: truncatedError,
        },
      });
    } catch (auditError) {
      console.warn("Error audit log creation failed:", auditError);
    }
    return NextResponse.json(
      {
        message: "Internal server error",
        error:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
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
        userId: true,
        chatId: true,
        reason: true,
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
        { message: "registrations not found" },
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

    // Get the time slot from occupied times and convert to display format
    const dbTimeSlot = registration.occupiedTimes?.[0]?.time_slot;
    const displayTime = dbTimeSlot
      ? fromDbFormat(dbTimeSlot, "12h")
      : "Not specified";

    return NextResponse.json({
      ...registration,
      id: registration.wdt_ID,
      ustazname: registration.teacher?.ustazname || "Not assigned",
      selectedTime: displayTime, // Convert from database format
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
      userId: true,
      chatId: true,
      reason: true,
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

  const flatRegistrations = registrations.map((reg) => {
    const dbTimeSlot = reg.occupiedTimes?.[0]?.time_slot;
    const displayTime = dbTimeSlot
      ? fromDbFormat(dbTimeSlot, "12h")
      : "Not specified";

    return {
      ...reg,
      id: reg.wdt_ID,
      ustazname: reg.teacher?.ustazname || "Not assigned",
      selectedTime: displayTime, // Convert from database format
    };
  });

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
        { message: "Good ,Registrations deleted successfully" },
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

      const validStatuses = [
        "Active",
        "inactive",
        "pending",
        "leave",
        "remadan leave",
        "Not yet",
        "fresh",
        "not succeed",
        "completed",
      ];

      if (!status || !validStatuses.includes(status.toLowerCase())) {
        return NextResponse.json(
          {
            message:
              "Status must be Active, Leave, Remadan leave, Not yet, Fresh, Not Succeed, or Completed",
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

      // Handle special case for "Not yet"
      let newStatus;
      if (status.toLowerCase() === "not yet") {
        newStatus = "Not yet";
      } else {
        newStatus =
          status?.charAt(0)?.toUpperCase() + status?.slice(1).toLowerCase() ||
          "Pending";
      }

      // Check if status requires freeing up time slots
      const shouldFreeTimeSlot = ["leave", "completed", "not succeed"].includes(
        newStatus.toLowerCase()
      );

      await prismaClient.$transaction(async (tx) => {
        // Free up time slots for students changing to inactive status
        if (shouldFreeTimeSlot) {
          // Get current statuses and occupied times to check which students are changing from active to inactive
          const currentRecords = await tx.wpos_wpdatatable_23.findMany({
            where: {
              wdt_ID: { in: ids.map((id: string) => parseInt(id)) },
              u_control:
                session.role === "controller" ? session.code : undefined,
            },
            select: {
              wdt_ID: true,
              status: true,
              name: true,
              package: true,
            },
          });

          const studentsToFreeSlots = currentRecords
            .filter(
              (record) =>
                record.status &&
                !["Leave", "Completed", "Not succeed"].includes(record.status)
            )
            .map((record) => record.wdt_ID);

          if (studentsToFreeSlots.length > 0) {
            // Get occupied times for students that need to be freed
            const occupiedTimes = await tx.wpos_ustaz_occupied_times.findMany({
              where: {
                student_id: { in: studentsToFreeSlots },
                end_at: null,
              },
              select: {
                student_id: true,
                ustaz_id: true,
                time_slot: true,
                daypackage: true,
              },
            });

            // Record teacher assignment ends BEFORE deleting occupied times
            // This ensures teachers get paid for their work
            for (const occupiedTime of occupiedTimes) {
              const student = currentRecords.find(
                (s) => s.wdt_ID === occupiedTime.student_id
              );

              const packageSalary = await tx.packageSalary.findFirst({
                where: { packageName: student?.package || undefined },
                select: { salaryPerStudent: true },
              });

              const monthlyRate = Number(packageSalary?.salaryPerStudent || 0);
              const dailyRate = monthlyRate / 30;

              await tx.teacher_change_history.create({
                data: {
                  student_id: occupiedTime.student_id,
                  old_teacher_id: occupiedTime.ustaz_id,
                  new_teacher_id: occupiedTime.ustaz_id, // Same teacher, but ending assignment
                  change_date: new Date(),
                  change_reason: `Bulk status change to ${newStatus} - teacher assignment ended`,
                  time_slot: occupiedTime.time_slot,
                  daypackage: occupiedTime.daypackage,
                  student_package: student?.package || null,
                  monthly_rate: monthlyRate,
                  daily_rate: dailyRate,
                  created_by: session?.email || "system",
                },
              });

              // Clear salary cache for the teacher
              SalaryCalculator.clearGlobalTeacherCache(occupiedTime.ustaz_id);
            }

            // Now delete the occupied times to free up teacher slots
            await tx.wpos_ustaz_occupied_times.deleteMany({
              where: {
                student_id: { in: studentsToFreeSlots },
              },
            });
          }
        }

        // Update statuses
        if (newStatus === "Leave") {
          await tx.wpos_wpdatatable_23.updateMany({
            where: {
              wdt_ID: { in: ids.map((id: string) => parseInt(id)) },
              u_control:
                session.role === "controller" ? session.code : undefined,
              status: { not: "Leave" }, // Only update if not already Leave
            },
            data: {
              status: newStatus,
              exitdate: new Date(),
            },
          });
        } else {
          await tx.wpos_wpdatatable_23.updateMany({
            where: {
              wdt_ID: { in: ids.map((id: string) => parseInt(id)) },
              u_control:
                session.role === "controller" ? session.code : undefined,
            },
            data: {
              status: newStatus,
            },
          });
        }
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
