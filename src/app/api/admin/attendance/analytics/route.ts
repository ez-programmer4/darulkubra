// --- PrismaClient Singleton Pattern ---
import {
  PrismaClient,
  student_attendance_progress as StudentAttendanceProgress,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { subDays, startOfDay, endOfDay, isValid } from "date-fns";

// Prevent multiple instances in dev
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// --- Types ---
interface TrendAccumulator {
  [date: string]: {
    date: string;
    Present: number;
    Absent: number;
    Total: number;
  };
}

interface PerformanceAccumulator {
  [name: string]: {
    name: string;
    Present: number;
    Absent: number;
    Total: number;
  };
}

// --- API Handler ---
export async function GET(req: NextRequest) {
  // --- Auth ---
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Query Params ---
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const controllerCode = searchParams.get("controllerId"); // Actually a code, not an id

  // --- Date Validation ---
  let endDate: Date, startDate: Date;
  try {
    endDate =
      to && isValid(new Date(to))
        ? endOfDay(new Date(to))
        : endOfDay(new Date());
    startDate =
      from && isValid(new Date(from))
        ? startOfDay(new Date(from))
        : startOfDay(subDays(endDate, 29));
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid date parameters" },
      { status: 400 }
    );
  }

  try {
    // --- Build Where Clause ---
    const whereClause: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    // --- Controller Filter ---
    if (controllerCode) {
      // Validate controller existence by code
      const controllerExists = await prisma.wpos_wpdatatable_28.findFirst({
        where: { code: controllerCode },
        select: { code: true },
      });
      if (!controllerExists) {
        return NextResponse.json(
          {
            error: `Controller code '${controllerCode}' not found in wpos_wpdatatable_28`,
          },
          { status: 404 }
        );
      }
      whereClause.wpos_wpdatatable_23 = { u_control: controllerCode };
    }

    // --- Fetch Attendance Records ---
    const attendanceRecords = await prisma.student_attendance_progress.findMany(
      {
        where: whereClause,
        include: {
          wpos_wpdatatable_23: {
            include: {
              controller: { select: { name: true } },
              teacher: { select: { ustazname: true } },
            },
          },
        },
      }
    );

    // --- Filter Valid Records ---
    const validRecords = attendanceRecords.filter((record) => {
      if (!record.date || !isValid(record.date)) {
        console.warn(
          `Skipping record with invalid date: ${JSON.stringify(record)}`
        );
        return false;
      }
      if (!record.wpos_wpdatatable_23) {
        console.warn(
          `Skipping record with missing wpos_wpdatatable_23: ${JSON.stringify(
            record
          )}`
        );
        return false;
      }
      // Ensure u_control is a string (not null/undefined)
      if (
        !record.wpos_wpdatatable_23.u_control ||
        typeof record.wpos_wpdatatable_23.u_control !== "string"
      ) {
        console.warn(
          `Skipping record with invalid u_control: ${JSON.stringify(record)}`
        );
        return false;
      }
      return true;
    });

    // --- Daily Trend ---
    const trendData = validRecords.reduce((acc: TrendAccumulator, record) => {
      const dateStr = record.date.toISOString().split("T")[0];
      if (!acc[dateStr]) {
        acc[dateStr] = { date: dateStr, Present: 0, Absent: 0, Total: 0 };
      }
      acc[dateStr].Total++;
      if (record.attendance_status === "Present") acc[dateStr].Present++;
      else if (record.attendance_status === "Absent") acc[dateStr].Absent++;
      return acc;
    }, {});

    const dailyTrend = Object.values(trendData)
      .map((day: any) => ({
        ...day,
        "Attendance Rate":
          day.Total > 0
            ? parseFloat(((day.Present / day.Total) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // --- Controller Performance ---
    const controllerPerformance = validRecords.reduce(
      (acc: PerformanceAccumulator, record) => {
        const controllerName =
          record.wpos_wpdatatable_23?.controller?.name || "Unassigned";
        if (!acc[controllerName]) {
          acc[controllerName] = {
            name: controllerName,
            Present: 0,
            Absent: 0,
            Total: 0,
          };
        }
        acc[controllerName].Total++;
        if (record.attendance_status === "Present")
          acc[controllerName].Present++;
        else if (record.attendance_status === "Absent")
          acc[controllerName].Absent++;
        return acc;
      },
      {}
    );

    const controllerData = Object.values(controllerPerformance)
      .map((c: any) => ({
        ...c,
        "Attendance Rate":
          c.Total > 0
            ? parseFloat(((c.Present / c.Total) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b["Attendance Rate"] - a["Attendance Rate"]);

    // --- Teacher Performance ---
    const teacherPerformance = validRecords.reduce(
      (acc: PerformanceAccumulator, record) => {
        const teacherName =
          record.wpos_wpdatatable_23?.teacher?.ustazname || "Unassigned";
        if (!acc[teacherName]) {
          acc[teacherName] = {
            name: teacherName,
            Present: 0,
            Absent: 0,
            Total: 0,
          };
        }
        acc[teacherName].Total++;
        if (record.attendance_status === "Present") acc[teacherName].Present++;
        else if (record.attendance_status === "Absent")
          acc[teacherName].Absent++;
        return acc;
      },
      {}
    );

    const teacherData = Object.values(teacherPerformance)
      .map((t: any) => ({
        ...t,
        "Attendance Rate":
          t.Total > 0
            ? parseFloat(((t.Present / t.Total) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b["Attendance Rate"] - a["Attendance Rate"]);

    // --- Response ---
    const result = {
      dailyTrend,
      controllerData,
      teacherData,
      dateRange: {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      },
      totalRecords: validRecords.length,
      sampleRecords: validRecords.slice(0, 3).map((r) => ({
        date: r.date ? r.date.toISOString() : "N/A",
        status: r.attendance_status || "N/A",
        studentName: r.wpos_wpdatatable_23?.name || "N/A",
        studentControl: r.wpos_wpdatatable_23?.u_control || "N/A",
        teacherName: r.wpos_wpdatatable_23?.teacher?.ustazname || "N/A",
        controllerName: r.wpos_wpdatatable_23?.controller?.name || "N/A",
      })),
    };

    return NextResponse.json(result);
  } catch (error: any) {
    // Improved error logging
    console.error("Error in /api/admin/attendance/analytics:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
