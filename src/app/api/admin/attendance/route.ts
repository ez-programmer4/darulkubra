import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const session = await getToken({
    req: req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const { searchParams } = url;
  const date =
    searchParams.get("date") || new Date().toISOString().split("T")[0];
  const ustaz = searchParams.get("ustaz") || "";
  const attendanceStatus = searchParams.get("attendanceStatus") || "";
  const sentStatus = searchParams.get("sentStatus") || "";
  const clickedStatus = searchParams.get("clickedStatus") || "";
  const controllerId = searchParams.get("controllerId") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  const dayStart = new Date(date);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayStart.getDate() + 1);

  const selectedDayName = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
  });
  const dayPackageOr = [
    { daypackages: { contains: selectedDayName } },
    { daypackages: { contains: "all" } },
    { daypackages: { contains: "All" } },
  ];

  const where: any = {
    OR: dayPackageOr,
  };

  if (controllerId) {
    where.control = controllerId;
  }
  if (ustaz) {
    where.teacher = { ustazid: ustaz };
  }
  if (attendanceStatus) {
    where.attendance_progress = {
      some: {
        attendance_status: attendanceStatus,
        date: { gte: dayStart, lt: dayEnd },
      },
    };
  }

  const zoomLinkConditions: any = {};
  if (date) {
    zoomLinkConditions.sent_time = { gte: dayStart, lt: dayEnd };
  }
  if (sentStatus === "sent") {
    zoomLinkConditions.sent_time = {
      ...zoomLinkConditions.sent_time,
      not: null,
    };
  }
  if (sentStatus === "notSent") {
    zoomLinkConditions.sent_time = null;
  }
  if (clickedStatus === "clicked") {
    zoomLinkConditions.clicked_at = { not: null };
  }
  if (clickedStatus === "notClicked") {
    zoomLinkConditions.clicked_at = null;
  }
  if (Object.keys(zoomLinkConditions).length > 0) {
    where.zoom_links = { some: zoomLinkConditions };
  }

  try {
    const totalRecords = await prisma.wpos_wpdatatable_23.count({ where });
    const records = await prisma.wpos_wpdatatable_23.findMany({
      where,
      include: {
        teacher: true,
        zoom_links: true,
        attendance_progress: true,
        controller: true,
      },
      orderBy: { wdt_ID: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const integratedData = records.map((record: any) => {
      function to24Hour(time12h: string) {
        if (!time12h) return "00:00";
        const [time, modifier] = time12h.split(" ");
        let [hours, minutes] = time.split(":");
        if (hours === "12") hours = modifier === "AM" ? "00" : "12";
        else if (modifier === "PM") hours = String(parseInt(hours, 10) + 12);
        return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
      }

      const time24 = to24Hour(record.selectedTime || "");
      const scheduledAt = `${date}T${time24}:00.000Z`;
      const zoomLink =
        record.zoom_links.find(
          (zl: any) =>
            zl.sent_time &&
            new Date(zl.sent_time).toISOString().split("T")[0] === date
        ) || {};

      const sentTime = zoomLink.sent_time?.toISOString() || "Not Sent";
      const clickedTime = zoomLink.clicked_at?.toISOString() || null;

      const dailyAttendance = record.attendance_progress.find(
        (ap: any) => new Date(ap.date).toISOString().split("T")[0] === date
      );
      const attendance_status = dailyAttendance?.attendance_status || "Pending";

      return {
        student_id: record.wdt_ID,
        studentName: record.name,
        ustazName: record.teacher?.ustazid || "N/A",
        controllerName: record.controller?.name || "N/A",
        link: record.link || "",
        scheduledAt,
        sentTime,
        clickedTime,
        attendance_status,
      };
    });

    // Recalculate stats for the admin view based on the full filtered dataset
    const allFilteredRecords = await prisma.wpos_wpdatatable_23.findMany({
      where,
      include: { zoom_links: true },
    });

    let totalSent = 0;
    let totalClicked = 0;

    allFilteredRecords.forEach((record) => {
      const linkSentToday = record.zoom_links.some(
        (zl) =>
          zl.sent_time &&
          new Date(zl.sent_time).toISOString().split("T")[0] === date
      );
      const linkClickedToday = record.zoom_links.some(
        (zl) =>
          zl.clicked_at &&
          new Date(zl.clicked_at).toISOString().split("T")[0] === date
      );
      if (linkSentToday) totalSent++;
      if (linkClickedToday) totalClicked++;
    });

    const stats = {
      totalLinks: totalRecords,
      totalSent,
      totalClicked,
      responseRate:
        totalRecords > 0
          ? ((totalClicked / totalRecords) * 100).toFixed(2) + "%"
          : "0.00%",
    };

    return NextResponse.json({
      integratedData,
      total: totalRecords,
      stats,
    });
  } catch (error) {
    console.error("Failed to fetch attendance data for admin:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
