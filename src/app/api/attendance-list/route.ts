import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { startOfDay, endOfDay, isValid } from "date-fns";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
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

  const dayStart = startOfDay(new Date(date));
  const dayEnd = endOfDay(new Date(date));

  // Determine day packages for the selected day
  const selectedDayName = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
  });
  const isMWFDay = ["Monday", "Wednesday", "Friday"].includes(selectedDayName);
  const isTTSDay = ["Tuesday", "Thursday", "Saturday"].includes(
    selectedDayName
  );
  const dayPackageOr = [
    { daypackages: { contains: selectedDayName } },
    { daypackages: { contains: "all" } },
    { daypackages: { contains: "All" } },
    { daypackages: { contains: "ALL" } },
    { daypackages: { contains: "All days" } },
    ...(isMWFDay
      ? [
          { daypackages: { contains: "MWF" } },
          { daypackages: { contains: "mwf" } },
        ]
      : []),
    ...(isTTSDay
      ? [
          { daypackages: { contains: "TTS" } },
          { daypackages: { contains: "tts" } },
        ]
      : []),
  ];

  console.log("dayPackageOr filter:", JSON.stringify(dayPackageOr, null, 2));
  console.log(
    "Raw daypackages in database:",
    await prisma.wpos_wpdatatable_23.findMany({
      where: { u_control: controllerId, status: { in: ["Active", "Not Yet"] } },
      select: { wdt_ID: true, name: true, daypackages: true },
    })
  );

  // Log all students for debugging
  const allStudents = await prisma.wpos_wpdatatable_23.findMany({
    where: { u_control: controllerId },
    select: { wdt_ID: true, name: true, daypackages: true },
  });
  console.log(
    `Controller ${controllerId}: All students`,
    allStudents.map((s) => ({
      id: s.wdt_ID,
      name: s.name,
      daypackages: s.daypackages,
    }))
  );

  // Notify logic
  if (notify) {
    const student = await prisma.wpos_wpdatatable_23.findUnique({
      where: { wdt_ID: notify },
      include: {
        teacher: true,
        occupiedTimes: { select: { time_slot: true } },
      },
    });
    if (student && student.teacher) {
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
    return NextResponse.json(
      { message: "Student or teacher not found" },
      { status: 404 }
    );
  }

  try {
    // Build where clause
    const whereClause: any = {
      u_control: controllerId,
      status: { in: ["Active", "Not Yet"] },
      OR: dayPackageOr,
    };

    if (ustaz) {
      whereClause.ustaz = ustaz;
    }

    // Fetch students with matching day packages
    const records = await prisma.wpos_wpdatatable_23.findMany({
      where: whereClause,
      include: {
        teacher: { select: { ustazname: true } },
        zoom_links: {
          where: { sent_time: { gte: dayStart, lte: dayEnd } },
        },
        attendance_progress: {
          where: { date: { gte: dayStart, lte: dayEnd } },
        },
        controller: { select: { name: true } },
        occupiedTimes: { select: { time_slot: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    if (records.length > 0) {
      console.log(
        `Controller ${controllerId}: Filtered students for ${selectedDayName}`,
        records.map((r) => ({ name: r.name, daypackages: r.daypackages }))
      );
    } else {
      console.log(
        `Controller ${controllerId}: No students found for ${selectedDayName}`
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

      const dailyAttendance = record.attendance_progress[0];
      const attendance_status =
        dailyAttendance?.attendance_status || "not-taken";

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
        links: linksForDay,
        attendance_status,
        absentDaysCount,
        daypackages: record.daypackages || "N/A",
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
                (r: any) => r.attendance_status === "present"
              ).length /
                integratedData.length) *
              100
            ).toFixed(2)}%`
          : "0%",
    };

    return NextResponse.json({
      integratedData,
      total,
      stats,
    });
  } catch (error: any) {
    console.error("Error in /api/attendance-list:", error.message, error.stack);
    return NextResponse.json(
      { error: "Failed to fetch attendance data", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
