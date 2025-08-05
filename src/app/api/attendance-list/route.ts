import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
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

  const url = new URL(req.url);
  const searchParams = url.searchParams;
  const date =
    searchParams.get("date") || new Date().toISOString().split("T")[0];
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  const dayStart = new Date(date); // Interprets date as UTC midnight
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayStart.getDate() + 1);

  const ustaz = searchParams.get("ustaz") || "";
  const attendanceStatus = searchParams.get("attendanceStatus") || "";
  const sentStatus = searchParams.get("sentStatus") || "";
  const clickedStatus = searchParams.get("clickedStatus") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const notify = searchParams.get("notify")
    ? parseInt(searchParams.get("notify") || "0", 10)
    : null;

  // DEBUG: Log all students for this controller
  const allStudents = await prisma.wpos_wpdatatable_23.findMany({
    where: { u_control: { equals: session.code } },
    select: { wdt_ID: true, name: true, daypackages: true },
  });
  // Determine which students are valid for the selected day (by day name)
  const selectedDayName = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
  });
  const dayPackageOr = [
    { daypackages: { contains: selectedDayName } },
    { daypackages: { contains: "all" } },
    { daypackages: { contains: "All" } },
    { daypackages: { contains: "ALL" } },
    { daypackages: { contains: "All days" } },
    { daypackages: { contains: "MWF" } },
    { daypackages: { contains: "TTS" } },
  ];

  // Simplified where clause for testing
  if (notify) {
    const student = await prisma.wpos_wpdatatable_23.findUnique({
      where: { wdt_ID: notify },
      include: {
        teacher: true,
        occupiedTimes: {
          select: {
            time_slot: true,
          },
        },
      },
    });
    if (student && student.teacher) {
      // Send SMS to teacher using AfroMessage
      const teacherPhone = student.teacher.phone;
      if (!teacherPhone) {
        return NextResponse.json(
          { error: "Teacher phone number not found" },
          { status: 400 }
        );
      }

      const apiToken = process.env.AFROMSG_API_TOKEN;
      const senderUid = process.env.AFROMSG_SENDER_UID;
      const senderName = process.env.AFROMSG_SENDER_NAME;

      if (!apiToken || !senderUid || !senderName) {
        console.log("SMS service credentials are not configured in .env file");
        return NextResponse.json(
          { error: "SMS service not configured." },
          { status: 500 }
        );
      }
      const message = `አሰላሙአለይኩም ወረህመቱሏሂ ወበረካትሁ 
      ==================================================
      ለ ተማሪ ${student.name} የ ዙም ሊንክ በ ሰአቱ አልተላከም ፡፡ በ ተቻለ ፍጥነት ይላኩ ፡፡

      ==================================================
      የ ተማሪው የ ቂርአት ሰአት ፡ ${
        student.occupiedTimes?.[0]?.time_slot || "Not specified"
      }

      ====================================================

      Darulkubra Management 
      `;

      const url = "https://api.afromessage.com/api/send";

      try {
        const payload = {
          from: senderUid,
          sender: senderName,
          to: teacherPhone,
          message,
        };

        console.log("Sending SMS with token:", apiToken ? "****" : "undefined");

        const smsRes = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const smsText = await smsRes.text();
        return NextResponse.json({
          message: "Notification sent to teacher",
          smsStatus: smsRes.status,
          smsResponse: smsText,
        });
      } catch (err: any) {
        return NextResponse.json(
          { error: "Failed to send SMS", details: err.message },
          { status: 500 }
        );
      }
    }
    return NextResponse.json(
      { message: "Student or teacher not found" },
      { status: 404 }
    );
  }

  try {
    // Fetch only active students for attendance
    const records = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        u_control: { equals: session.code },
        status: { equals: "active" }, // Only active students
      },
      include: {
        teacher: true,
        zoom_links: true,
        attendance_progress: true,
        controller: true,
        occupiedTimes: {
          select: {
            time_slot: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    if (records.length > 0) {
      console.log(
        "Records found:",
        records.map((r) => ({ name: r.name, daypackages: r.daypackages }))
      );
    }

    const integratedData = records.map((record: any) => {
      function to24Hour(time12h: string) {
        if (!time12h) return "00:00";
        const [time, modifier] = time12h.split(" ");
        let [hours, minutes] = time.split(":");
        if (hours === "12") {
          hours = modifier === "AM" ? "00" : "12";
        } else if (modifier === "PM") {
          hours = String(parseInt(hours, 10) + 12);
        }
        return `${hours.padStart(2, "0")}:${minutes}`;
      }
      const time24 = to24Hour(record.occupiedTimes?.[0]?.time_slot || "");
      const scheduledAt = `${date}T${time24}:00.000Z`;

      // Filter all zoom_links for this student for the selected day
      const linksForDay = (record.zoom_links || [])
        .filter((zl: any) => {
          if (!zl.sent_time) return false;
          const sentDate = new Date(zl.sent_time).toISOString().split("T")[0];
          return sentDate === date;
        })
        .map((zl: any) => ({
          id: zl.id,
          link: zl.link,
          sent_time: zl.sent_time ? zl.sent_time.toISOString() : null,
          clicked_at: zl.clicked_at ? zl.clicked_at.toISOString() : null,
          expiration_date: zl.expiration_date
            ? zl.expiration_date.toISOString()
            : null,
          report: zl.report || null,
          tracking_token: zl.tracking_token || null,
        }));

      // Manually find the attendance record for the specific date
      const dailyAttendance = record.attendance_progress.find((ap: any) => {
        const attendanceDate = new Date(ap.date).toISOString().split("T")[0];
        return attendanceDate === date;
      });

      // Only use attendance status for the exact selected date
      // If no attendance record exists for this date, mark as "not-taken"
      const attendance_status =
        dailyAttendance?.attendance_status || "not-taken";

      // Calculate absent days count if date range is provided
      let absentDaysCount = 0;
      if (startDate && endDate) {
        const rangeStart = new Date(startDate);
        const rangeEnd = new Date(endDate);

        absentDaysCount = record.attendance_progress.filter((ap: any) => {
          const attendanceDate = new Date(ap.date);
          return (
            attendanceDate >= rangeStart &&
            attendanceDate <= rangeEnd &&
            ap.attendance_status === "absent"
          );
        }).length;
      }

      return {
        student_id: record.wdt_ID,
        studentName: record.name || "Unknown",
        ustazName: record.teacher?.ustazname || "Unknown",
        controllerName: record.controller?.name || "N/A",
        scheduledAt,
        links: linksForDay, // Array of all links for the day
        attendance_status,
        absentDaysCount,
      };
    });

    const total = await prisma.wpos_wpdatatable_23.count({
      where: {
        u_control: { equals: session.code },
        status: { equals: "active" }, // Only count active students
      },
    });

    // Calculate stats using the new links array
    let totalLinks = integratedData.length;
    let totalSent = 0;
    let totalClicked = 0;
    let missedDeadlines = 0;
    integratedData.forEach((r: any) => {
      if (Array.isArray(r.links)) {
        totalSent += r.links.length;
        totalClicked += r.links.filter((l: any) => l.clicked_at).length;
        missedDeadlines += r.links.filter(
          (l: any) =>
            l.sent_time && new Date(l.sent_time) > new Date(r.scheduledAt)
        ).length;
      }
    });
    const responseRate =
      totalSent > 0
        ? `${((totalClicked / totalSent) * 100).toFixed(2)}%`
        : "0%";

    const responseData = {
      integratedData,
      total,
      stats: {
        totalLinks,
        totalSent,
        totalClicked,
        missedDeadlines,
        responseRate,
      },
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch attendance data", details: error.message },
      { status: 500 }
    );
  }
}
