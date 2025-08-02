import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get total count of attendance records
    const totalRecords = await prisma.student_attendance_progress.count();

    // Get sample records with relationships
    const sampleRecords = await prisma.student_attendance_progress.findMany({
      take: 10,
      include: {
        wpos_wpdatatable_23: {
          include: {
            controller: true,
            teacher: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    // Get date range of data
    const dateRange = await prisma.student_attendance_progress.findMany({
      select: {
        date: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    const firstDate = dateRange[0]?.date;
    const lastDate = dateRange[dateRange.length - 1]?.date;

    // Get unique attendance statuses
    const statuses = await prisma.student_attendance_progress.findMany({
      select: {
        attendance_status: true,
      },
      distinct: ["attendance_status"],
    });

    // Get controllers
    const controllers = await prisma.wpos_wpdatatable_28.findMany({
      select: {
        username: true,
        name: true,
      },
    });

    return NextResponse.json({
      totalRecords,
      dateRange: {
        first: firstDate,
        last: lastDate,
        totalDays: dateRange.length,
      },
      uniqueStatuses: statuses.map((s) => s.attendance_status),
      controllers,
      sampleRecords: sampleRecords.map((r) => ({
        id: r.id,
        date: r.date,
        status: r.attendance_status,
        studentName: r.wpos_wpdatatable_23?.name,
        studentControl: r.wpos_wpdatatable_23?.u_control,
        teacherName: r.wpos_wpdatatable_23?.teacher?.ustazname,
        controllerName: r.wpos_wpdatatable_23?.controller?.name,
      })),
    });
  } catch (error) {
    console.error("Test data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch test data", details: error },
      { status: 500 }
    );
  }
}
