import {
  PrismaClient,
  student_attendance_progress as StudentAttendanceProgress,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { subDays, startOfDay, endOfDay } from "date-fns";

const prisma = new PrismaClient();

// Define types for the accumulators
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

export async function GET(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const controllerId = searchParams.get("controllerId");

  // Default to the last 30 days if no date range is provided
  const endDate = to ? endOfDay(new Date(to)) : endOfDay(new Date());
  const startDate = from
    ? startOfDay(new Date(from))
    : startOfDay(subDays(endDate, 29));

  try {
    const whereClause: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (controllerId) {
      whereClause.wpos_wpdatatable_23 = {
        control: controllerId,
      };
    }

    const attendanceRecords = await prisma.student_attendance_progress.findMany(
      {
        where: whereClause,
        include: {
          wpos_wpdatatable_23: {
            include: {
              controller: true,
              teacher: true,
            },
          },
        },
      }
    );

    return NextResponse.json({
      endDate: endDate.toISOString(),
      controllerId,
      totalRecords: attendanceRecords.length,
      whereClause,
      sampleRecords: attendanceRecords.slice(0, 3).map((r) => ({
        date: r.date,
        status: r.attendance_status,
        studentName: r.wpos_wpdatatable_23?.name,
        studentControl: r.wpos_wpdatatable_23?.u_control,
        teacherName: r.wpos_wpdatatable_23?.teacher?.ustazname,
        controllerName: r.wpos_wpdatatable_23?.controller?.name,
      })),
    });

    type AttendanceRecordWithRelations = (typeof attendanceRecords)[0];

    // 1. Attendance Trend Over Time
    const trendData = attendanceRecords.reduce(
      (acc: TrendAccumulator, record: AttendanceRecordWithRelations) => {
        const dateStr = record.date.toISOString().split("T")[0];
        if (!acc[dateStr]) {
          acc[dateStr] = { date: dateStr, Present: 0, Absent: 0, Total: 0 };
        }
        acc[dateStr].Total++;
        if (record.attendance_status === "present") {
          acc[dateStr].Present++;
        } else if (record.attendance_status === "absent") {
          acc[dateStr].Absent++;
        }
        return acc;
      },
      {}
    );

    const dailyTrend = Object.values(trendData)
      .map((day: any) => ({
        ...day,
        "Attendance Rate":
          day.Total > 0
            ? parseFloat(((day.Present / day.Total) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 2. Performance by Controller
    const controllerPerformance = attendanceRecords.reduce(
      (acc: PerformanceAccumulator, record: AttendanceRecordWithRelations) => {
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
        if (record.attendance_status === "present")
          acc[controllerName].Present++;
        else if (record.attendance_status === "absent")
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

    // 3. Performance by Teacher
    const teacherPerformance = attendanceRecords.reduce(
      (acc: PerformanceAccumulator, record: AttendanceRecordWithRelations) => {
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
        if (record.attendance_status === "present") acc[teacherName].Present++;
        else if (record.attendance_status === "absent")
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

    const result = {
      dailyTrend,
      controllerData,
      teacherData,
      dateRange: {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      },
    };

    return NextResponse.json({
      dailyTrend,
      controllerData,
      teacherData,
      dateRange: {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      },
      sampleControllerData: controllerData.slice(0, 3),
      sampleTeacherData: teacherData.slice(0, 3),
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
