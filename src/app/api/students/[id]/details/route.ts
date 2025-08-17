import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (
    !session ||
    (session.role !== "controller" &&
      session.role !== "registral" &&
      session.role !== "admin") ||
    !session.username
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = parseInt(params.id);
  if (isNaN(studentId)) {
    return NextResponse.json({ error: "Invalid student ID" }, { status: 400 });
  }

  const url = new URL(req.url);
  const searchParams = url.searchParams;
  const startDate =
    searchParams.get("startDate") || new Date().toISOString().split("T")[0];
  const endDate =
    searchParams.get("endDate") || new Date().toISOString().split("T")[0];

  try {
    // Get student details
    const student = await prisma.wpos_wpdatatable_23.findUnique({
      where: { wdt_ID: studentId },
      include: {
        teacher: true,
        attendance_progress: {
          where: {
            date: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          },
          orderBy: { date: "desc" },
        },
        zoom_links: {
          where: {
            sent_time: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          },
          orderBy: { sent_time: "desc" },
        },
        occupiedTimes: {
          select: {
            time_slot: true,
          },
        },
      },
    });

    if (
      !student ||
      !["active", "not yet"].includes((student.status || "").toLowerCase())
    ) {
      return NextResponse.json(
        { error: "Student not found or not eligible" },
        { status: 404 }
      );
    }

    // Calculate attendance breakdown
    const attendanceBreakdown = student.attendance_progress.reduce(
      (acc, record) => {
        acc[record.attendance_status] =
          (acc[record.attendance_status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Format attendance history
    const attendanceHistory = student.attendance_progress.map((record) => ({
      date: record.date.toISOString(),
      status: record.attendance_status,
      scheduledTime: student.occupiedTimes?.[0]?.time_slot || null,
      notes: record.notes || null,
      surah: record.surah || null,
      pages_read: record.pages_read || null,
      level: record.level || null,
      lesson: record.lesson || null,
    }));

    // Get link history
    const linkHistory = student.zoom_links.map((link) => ({
      date: link.sent_time?.toISOString() || null,
      clicked_at: link.clicked_at?.toISOString() || null,
      link: link.link,
      report: link.report || null,
    }));

    const response = {
      student: {
        id: student.wdt_ID,
        name: student.name,
        teacher: student.teacher,
        phone: student.phoneno,
        package: student.package,
        subject: student.subject,
        daypackages: student.daypackages,
        selectedTime: student.occupiedTimes?.[0]?.time_slot || "Not specified",
      },
      period: {
        startDate,
        endDate,
      },
      attendanceBreakdown: {
        presentSessions: attendanceBreakdown.Present || 0,
        absentSessions: attendanceBreakdown.Absent || 0,
        permissionSessions: attendanceBreakdown.Permission || 0,
        notTakenSessions: attendanceBreakdown["Not Taken"] || 0,
        totalSessions: student.attendance_progress.length,
      },
      attendanceHistory,
      linkHistory,
      summary: {
        attendanceRate:
          student.attendance_progress.length > 0
            ? Math.round(
                ((attendanceBreakdown.Present || 0) /
                  student.attendance_progress.length) *
                  100
              )
            : 0,
        totalLinksSent: student.zoom_links.length,
        totalLinksClicked: student.zoom_links.filter((link) => link.clicked_at)
          .length,
        averageResponseTime: null, // Could be calculated if needed
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch student details", details: error.message },
      { status: 500 }
    );
  }
}
