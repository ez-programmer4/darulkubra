import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { startOfDay, endOfDay, isValid } from "date-fns";

const prisma = new PrismaClient();

// Utility to format attendance status
const formatAttendanceStatus = (status: string | null | undefined): string => {
  const validStatuses = ["Present", "Absent", "Permission", "Not Taken"];
  if (!status) return "Not Taken";
  const normalizedStatus =
    status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  return validStatuses.includes(normalizedStatus)
    ? normalizedStatus
    : "Not Taken";
};

export async function GET(req: NextRequest) {
  try {
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (
      !session ||
      !["controller", "registral", "admin"].includes(session.role) ||
      !session.username
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date =
      searchParams.get("date") || new Date().toISOString().split("T")[0];
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const ustaz = searchParams.get("ustaz") || "";
    const attendanceStatus = searchParams.get("attendanceStatus") || "";
    const sentStatus = searchParams.get("sentStatus") || "";
    const clickedStatus = searchParams.get("clickedStatus") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const notify = searchParams.get("notify")
      ? parseInt(searchParams.get("notify") || "0", 10)
      : 0;
    const controllerId = searchParams.get("controllerId") || session.code || "";

    if (!controllerId) {
      return NextResponse.json(
        { error: "Controller ID is required" },
        { status: 400 }
      );
    }

    // Validate date
    let dayStart, dayEnd;
    try {
      const parsedDate = new Date(date);
      if (!isValid(parsedDate)) {
        throw new Error("Invalid date provided");
      }
      dayStart = startOfDay(parsedDate);
      dayEnd = endOfDay(parsedDate);
    } catch (error) {
      console.error("Invalid date format:", date, error);
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    // Determine day packages for the selected day
    const selectedDayName = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
    });
    // Build day package filters based on selected day
    const dayPackageOr = [];

    // Always include "All days" students
    dayPackageOr.push({ daypackages: { contains: "All days" } });
    dayPackageOr.push({ daypackages: { contains: "all days" } });

    // Add specific day name
    dayPackageOr.push({ daypackages: { contains: selectedDayName } });

    // Add package-specific filters based on the day
    if (["Monday", "Wednesday", "Friday"].includes(selectedDayName)) {
      dayPackageOr.push({ daypackages: { contains: "MWF" } });
      dayPackageOr.push({ daypackages: { contains: "mwf" } });
    }

    if (["Tuesday", "Thursday", "Saturday"].includes(selectedDayName)) {
      dayPackageOr.push({ daypackages: { contains: "TTS" } });
      dayPackageOr.push({ daypackages: { contains: "tts" } });
    }

    // Include null/empty for backward compatibility
    dayPackageOr.push({ daypackages: null });
    dayPackageOr.push({ daypackages: "" });

    console.log("Query Parameters:", {
      date,
      controllerId,
      selectedDayName,
      ustaz,
      attendanceStatus,
      sentStatus,
      clickedStatus,
      page,
      limit,
    });
    console.log("dayPackageOr filter:", JSON.stringify(dayPackageOr, null, 2));

    // Notify logic
    if (notify) {
      const student = await prisma.wpos_wpdatatable_23.findUnique({
        where: { wdt_ID: notify },
        include: {
          teacher: true,
          occupiedTimes: { select: { time_slot: true } },
        },
      });
      if (!student || !student.teacher) {
        return NextResponse.json(
          { error: "Student or teacher not found" },
          { status: 404 }
        );
      }
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
        console.error("SMS service credentials missing in .env");
        return NextResponse.json(
          { error: "SMS service not configured" },
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
      ==================================================
      Darulkubra Management`;

      try {
        const smsRes = await fetch("https://api.afromessage.com/api/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: senderUid,
            sender: senderName,
            to: teacherPhone,
            message,
          }),
        });

        const smsText = await smsRes.text();
        return NextResponse.json({
          message: "Notification sent to teacher",
          smsStatus: smsRes.status,
          smsResponse: smsText,
        });
      } catch (err: any) {
        console.error("SMS sending failed:", err.message);
        return NextResponse.json(
          { error: "Failed to send SMS", details: err.message },
          { status: 500 }
        );
      }
    }

    // Build where clause
    const whereClause: any = {
      u_control: controllerId,
      status: { in: ["Active", "Not Yet"] },
      OR: dayPackageOr,
    };

    if (ustaz) {
      whereClause.ustaz = ustaz;
    }

    if (attendanceStatus) {
      whereClause.attendance_progress = {
        some: {
          date: {
            gte: dayStart,
            lte: dayEnd,
          },
          attendance_status: { equals: attendanceStatus },
        },
      };
    }

    // Fetch students with matching day packages
    const records = await prisma.wpos_wpdatatable_23.findMany({
      where: whereClause,
      include: {
        teacher: { select: { ustazname: true, phone: true } },
        zoom_links: {
          where: {
            sent_time: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
          select: {
            id: true,
            link: true,
            sent_time: true,
            clicked_at: true,
            expiration_date: true,
            report: true,
            tracking_token: true,
          },
        },
        attendance_progress: {
          where: {
            date: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
          select: {
            attendance_status: true,
            date: true,
          },
        },
        controller: { select: { name: true } },
        occupiedTimes: { select: { time_slot: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    console.log(
      `Controller ${controllerId}: Filtered students for ${selectedDayName}`,
      records.map((r) => ({ name: r.name, daypackages: r.daypackages }))
    );

    const integratedData = records.map((record: any) => {
      function to24Hour(time12h: string | null | undefined) {
        if (!time12h || !/\d{1,2}:\d{2}\s?(AM|PM)/i.test(time12h))
          return "00:00";
        try {
          const [time, modifier] = time12h.split(" ");
          let [hours, minutes] = time.split(":");
          if (hours === "12") {
            hours = modifier.toUpperCase() === "AM" ? "00" : "12";
          } else if (modifier.toUpperCase() === "PM") {
            hours = String(parseInt(hours, 10) + 12);
          }
          return `${hours.padStart(2, "0")}:${minutes}`;
        } catch {
          return "00:00";
        }
      }
      const time24 = record.occupiedTimes?.[0]?.time_slot;
      const scheduledAt = time24
        ? `${date}T${time24}:00.000Z`
        : `${date}T00:00:00.000Z`;

      const linksForDay = (record.zoom_links || []).map((zl: any) => ({
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

      const dailyAttendance = record.attendance_progress?.[0];
      const attendance_status = formatAttendanceStatus(
        dailyAttendance?.attendance_status
      );

      let absentDaysCount = 0;
      if (
        startDate &&
        endDate &&
        isValid(new Date(startDate)) &&
        isValid(new Date(endDate))
      ) {
        absentDaysCount = record.attendance_progress.filter((ap: any) => {
          const attendanceDate = new Date(ap.date);
          return (
            attendanceDate >= new Date(startDate) &&
            attendanceDate <= new Date(endDate) &&
            ap.attendance_status?.toLowerCase() === "absent"
          );
        }).length;
      }

      return {
        student_id: record.wdt_ID,
        studentName: record.name || "Unknown",
        ustazName: record.teacher?.ustazname || "Unknown",
        controllerName: record.controller?.name || "N/A",
        scheduledAt,
        links: linksForDay,
        attendance_status,
        absentDaysCount,
        daypackages: record.daypackages || "All days",
      };
    });

    const total = await prisma.wpos_wpdatatable_23.count({
      where: whereClause,
    });

    const stats = {
      totalLinks: integratedData.reduce(
        (sum: number, r: any) => sum + r.links.length,
        0
      ),
      totalSent: integratedData.reduce(
        (sum: number, r: any) =>
          sum + r.links.filter((l: any) => l.sent_time).length,
        0
      ),
      totalClicked: integratedData.reduce(
        (sum: number, r: any) =>
          sum + r.links.filter((l: any) => l.clicked_at).length,
        0
      ),
      missedDeadlines: integratedData.reduce((sum: number, r: any) => {
        return (
          sum +
          r.links.filter((l: any) => {
            if (!l.sent_time) return false;
            const sent = new Date(l.sent_time);
            const scheduled = new Date(r.scheduledAt);
            return sent > new Date(scheduled.getTime() + 5 * 60000);
          }).length
        );
      }, 0),
      responseRate:
        integratedData.length > 0
          ? `${(
              (integratedData.filter(
                (r: any) => r.attendance_status === "Present"
              ).length /
                integratedData.length) *
              100
            ).toFixed(2)}%`
          : "0.00%",
    };

    return NextResponse.json({
      integratedData,
      total,
      stats,
    });
  } catch (error: any) {
    console.error("Error in /api/attendance-list:", {
      message: error.message,
      stack: error.stack,
      queryParams: Object.fromEntries(new URL(req.url).searchParams),
    });
    return NextResponse.json(
      { error: "Failed to fetch attendance data", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (
      !session ||
      !["controller", "registral", "admin"].includes(session.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { updates } = await req.json();
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "Invalid or empty updates array" },
        { status: 400 }
      );
    }

    for (const update of updates) {
      const { student_id, date, attendance_status } = update;
      if (!student_id || !date || !attendance_status) {
        return NextResponse.json(
          { error: "Missing required fields in update" },
          { status: 400 }
        );
      }

      const parsedDate = new Date(date);
      if (!isValid(parsedDate)) {
        return NextResponse.json(
          { error: `Invalid date format for student ${student_id}` },
          { status: 400 }
        );
      }

      const formattedStatus = formatAttendanceStatus(attendance_status);
      await prisma.student_attendance_progress.upsert({
        where: {
          id: student_id,
          date: startOfDay(parsedDate),
        },
        update: {
          attendance_status: formattedStatus,
        },
        create: {
          student_id,
          date: startOfDay(parsedDate),
          attendance_status: formattedStatus,
        },
      });
    }

    return NextResponse.json({ message: "Attendance updated successfully" });
  } catch (error: any) {
    console.error("Error in POST /api/attendance-list:", {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Failed to update attendance", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
