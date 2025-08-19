import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { startOfDay, endOfDay, isValid } from "date-fns";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const controllerId = searchParams.get("controllerId") || "";
    const attendanceFilter = searchParams.get("attendanceStatus") || "";

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
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    // Build where clause
    const whereClause: any = {
      status: { in: ["active", "not yet", "Active", "Not Yet"] },
    };

    // Filter by controller if specified
    if (controllerId) {
      whereClause.u_control = controllerId;
    }

    // Fetch students
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
        },
        attendance_progress: {
          where: {
            date: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        },
        controller: { select: { name: true } },
        occupiedTimes: { select: { time_slot: true } },
      },
    });

    const integratedData = records.map((record: any) => {
      const scheduledTime = record.occupiedTimes?.[0]?.time_slot;
      const scheduledAt = scheduledTime ? `${date}T${scheduledTime}:00.000Z` : null;

      const linksForDay = (record.zoom_links || []).map((zl: any) => ({
        id: zl.id,
        link: zl.link,
        sent_time: zl.sent_time ? zl.sent_time.toISOString() : null,
        clicked_at: zl.clicked_at ? zl.clicked_at.toISOString() : null,
        expiration_date: zl.expiration_date ? zl.expiration_date.toISOString() : null,
        report: zl.report || null,
        tracking_token: zl.tracking_token || null,
      }));

      // Get attendance status - use raw value from database
      const dailyAttendance = record.attendance_progress?.[0];
      let attendance_status = "Not Taken";
      
      if (dailyAttendance?.attendance_status) {
        const status = dailyAttendance.attendance_status.toLowerCase();
        switch (status) {
          case "present":
            attendance_status = "Present";
            break;
          case "absent":
            attendance_status = "Absent";
            break;
          case "permission":
            attendance_status = "Permission";
            break;
          default:
            attendance_status = "Not Taken";
        }
      }

      return {
        student_id: record.wdt_ID,
        studentName: record.name || "Unknown",
        ustazName: record.teacher?.ustazname || "Unknown",
        controllerName: record.controller?.name || "N/A",
        scheduledAt,
        links: linksForDay,
        attendance_status,
        daypackages: record.daypackages || "All days",
      };
    });

    // Apply attendance filter if specified
    const filteredData = attendanceFilter 
      ? integratedData.filter(record => record.attendance_status === attendanceFilter)
      : integratedData;

    const stats = {
      totalLinks: filteredData.reduce((sum: number, r: any) => sum + r.links.length, 0),
      totalSent: filteredData.reduce((sum: number, r: any) => 
        sum + r.links.filter((l: any) => l.sent_time).length, 0),
      totalClicked: filteredData.reduce((sum: number, r: any) => 
        sum + r.links.filter((l: any) => l.clicked_at).length, 0),
      missedDeadlines: 0,
      responseRate: filteredData.length > 0
        ? `${((filteredData.filter((r: any) => r.attendance_status === "Present").length / filteredData.length) * 100).toFixed(2)}%`
        : "0.00%",
    };

    return NextResponse.json({
      integratedData: filteredData,
      total: filteredData.length,
      stats,
    });
  } catch (error: any) {
    console.error("Error in /api/admin/daily-attendance:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance data", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}