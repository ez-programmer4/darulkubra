import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server-auth";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  // Get the logged-in user from the token/session
  const user = await getAuthUser();
  if (!user || user.role !== "controller" || !user.username) {
    console.error("Unauthorized: No valid controller user in session");
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

  console.log("Request Parameters:", {
    date,
    startDate,
    endDate,
    ustaz,
    attendanceStatus,
    sentStatus,
    clickedStatus,
    page,
    limit,
    notify,
    controllerUsername: user.username,
  });

  // DEBUG: Log all students for this controller
  const allStudents = await prisma.wpos_wpdatatable_23.findMany({
    where: { control: { equals: user.username } },
    select: { id: true, name: true, daypackages: true },
  });
  console.log("All students for controller", user.username, ":", allStudents);

  // Determine which students are valid for the selected day (by day name)
  const selectedDayName = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
  });
  const dayPackageOr = [
    { daypackages: { contains: selectedDayName } },
    { daypackages: { contains: "all" } },
    { daypackages: { contains: "All" } },
    { daypackages: { contains: "ALL" } },
  ];

  const where = {
    control: { equals: user.username }, // Filter by logged-in controller
    teacher: ustaz ? { ustazid: ustaz } : undefined,
    OR: dayPackageOr,
    attendance_progress: attendanceStatus
      ? {
          some: {
            attendance_status: attendanceStatus,
            date: {
              gte: dayStart,
              lt: dayEnd,
            },
          },
        }
      : undefined,
    zoom_links:
      sentStatus ||
      clickedStatus ||
      (date && ["sent", "notSent"].includes(sentStatus))
        ? {
            some: {
              ...(date && {
                sent_time: {
                  gte: dayStart,
                  lt: dayEnd,
                },
              }),
              ...(sentStatus === "sent" && { sent_time: { not: null } }),
              ...(sentStatus === "notSent" && { sent_time: null }),
              ...(clickedStatus === "clicked" && { clicked_at: { not: null } }),
              ...(clickedStatus === "notClicked" && { clicked_at: null }),
            },
          }
        : undefined,
  };

  console.log("Prisma where filter:", JSON.stringify(where, null, 2));

  if (notify) {
    const student = await prisma.wpos_wpdatatable_23.findUnique({
      where: { id: notify },
      include: { teacher: true },
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
        console.error(
          "Afromessage credentials (AFROMSG_API_TOKEN, AFROMSG_SENDER_UID, AFROMSG_SENDER_NAME) are not configured in .env file"
        );
        return NextResponse.json(
          { error: "SMS service not configured." },
          { status: 500 }
        );
      }

      const message = `Reminder: You have not sent the attendance link for student ${student.name}. Please send it ASAP.`;
      const url = "https://api.afromessage.com/api/send";

      try {
        const payload = {
          from: senderUid,
          sender: senderName,
          to: teacherPhone,
          message,
        };

        console.log("SMS Request URL:", url);
        console.log("SMS API Token (masked):", apiToken ? "****" : "undefined");
        console.log("SMS Payload:", JSON.stringify(payload));

        const smsRes = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const smsText = await smsRes.text();
        console.log("SMS Response Status:", smsRes.status);
        console.log("SMS Response Text:", smsText);
        return NextResponse.json({
          message: "Notification sent to teacher",
          smsStatus: smsRes.status,
          smsResponse: smsText,
        });
      } catch (err: any) {
        console.error("SMS Error:", err.message);
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
    const records = await prisma.wpos_wpdatatable_23.findMany({
      where,
      include: {
        teacher: true,
        zoom_links: true,
        attendance_progress: true, // Fetch all attendance records
        controller: true, // Include controller details
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    console.log("Returned records count:", records.length);
    if (records.length > 0) {
      console.log(
        "First 3 students:",
        records
          .slice(0, 3)
          .map((r) => ({ name: r.name, daypackages: r.daypackages }))
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
        return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
      }
      const time24 = to24Hour(record.selectedTime || "");
      const scheduledAt = `${date}T${time24}:00.000Z`;
      const zoomLink = record.zoom_links[0] || {};
      const sentTime = zoomLink.sent_time?.toISOString() || "Not Sent";
      const clickedTime = zoomLink.clicked_at?.toISOString() || null;

      // Manually find the attendance record for the specific date
      const dailyAttendance = record.attendance_progress.find((ap: any) => {
        const attendanceDate = new Date(ap.date).toISOString().split("T")[0];
        console.log(`Comparing dates for student ${record.name}:`, {
          requestedDate: date,
          attendanceDate: attendanceDate,
          attendanceStatus: ap.attendance_status,
          isMatch: attendanceDate === date,
        });
        return attendanceDate === date;
      });

      // If no exact date match, get the most recent attendance record
      const mostRecentAttendance =
        record.attendance_progress.length > 0
          ? record.attendance_progress.reduce((latest: any, current: any) => {
              return new Date(current.date) > new Date(latest.date)
                ? current
                : latest;
            })
          : null;

      console.log(
        `Student ${record.name} - Found attendance:`,
        dailyAttendance || mostRecentAttendance
      );

      const attendance_status =
        dailyAttendance?.attendance_status ||
        mostRecentAttendance?.attendance_status ||
        "not-taken";

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
        student_id: record.id,
        studentName: record.name,
        ustazName: record.teacher.ustazname,
        controllerName: record.controller?.name || "N/A",
        link: zoomLink.link || null,
        scheduledAt,
        sentTime,
        clickedTime,
        timeDifference: null,
        attendance_status,
        absentDaysCount,
      };
    });

    const total = await prisma.wpos_wpdatatable_23.count({ where });

    const responseData = {
      integratedData,
      total,
      stats: {
        totalLinks: integratedData.length,
        totalSent: integratedData.filter((r) => r.sentTime !== "Not Sent")
          .length,
        totalClicked: integratedData.filter((r) => r.clickedTime).length,
        missedDeadlines: integratedData.filter(
          (r) =>
            r.sentTime !== "Not Sent" &&
            new Date(r.sentTime) > new Date(r.scheduledAt)
        ).length,
        responseRate:
          integratedData.length > 0
            ? `${(
                (integratedData.filter((r) => r.clickedTime).length /
                  integratedData.filter((r) => r.sentTime !== "Not Sent")
                    .length) *
                100
              ).toFixed(2)}%`
            : "0%",
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
