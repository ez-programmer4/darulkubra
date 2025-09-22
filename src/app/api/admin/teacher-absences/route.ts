import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get("teacherId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!teacherId || !month || !year) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0);

    // Get all time slots for the teacher in the given month
    const timeSlots = await prisma.wpos_ustaz_occupied_times.findMany({
      where: {
        ustaz_id: teacherId,
        occupied_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        student: true,
        teacher: true,
      },
    });

    // Get all zoom links for the teacher in the given month
    const zoomLinks = await prisma.wpos_zoom_links.findMany({
      where: {
        ustazid: teacherId,
        sent_time: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        sent_time: true,
        studentid: true,
      },
    });

    // Process time slots and check for absences
    const timeSlotBreakdown: any[] = [];
    let attendedTimeSlots = 0;
    let missedTimeSlots = 0;

    for (const slot of timeSlots) {
      const zoomLink = zoomLinks.find(
        (zl: any) =>
          zl.studentid === slot.student_id &&
          zl.sent_time && slot.occupied_at &&
          new Date(zl.sent_time).toDateString() === new Date(slot.occupied_at).toDateString()
      );

      const status = zoomLink ? "attended" : "missed";

      if (status === "attended") {
        attendedTimeSlots++;
      } else {
        missedTimeSlots++;
      }

      timeSlotBreakdown.push({
        date: slot.occupied_at ? new Date(slot.occupied_at).toISOString() : new Date().toISOString(),
        timeSlot: slot.time_slot || "",
        status,
        studentName: (slot as any).student?.name || "Unknown",
        dayPackage: slot.daypackage || "Unknown",
        deduction: status === "missed" ? 25 : 0,
      });
    }

    const totalTimeSlots = timeSlots.length;
    const absenceRate =
      totalTimeSlots > 0
        ? Math.round((missedTimeSlots / totalTimeSlots) * 100)
        : 0;

    return NextResponse.json({
      success: true,
      totalTimeSlots,
      attendedTimeSlots,
      missedTimeSlots,
      absenceRate,
      timeSlotBreakdown,
    });
  } catch (error) {
    console.error("Error fetching teacher absences:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch absence data" },
      { status: 500 }
    );
  }
}
