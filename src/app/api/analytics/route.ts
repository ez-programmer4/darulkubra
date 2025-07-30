import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    console.log(
      "Analytics API: NEXTAUTH_SECRET exists:",
      !!process.env.NEXTAUTH_SECRET
    );

    // Fallback secret for development if NEXTAUTH_SECRET is not set
    const secret =
      process.env.NEXTAUTH_SECRET || "fallback-secret-for-development";

    const session = await getToken({ req, secret });

    console.log("Analytics API: Session token:", session);

    if (!session) {
      console.log("Analytics API: No session token found");
      return NextResponse.json({ error: "No session token" }, { status: 401 });
    }

    // Allow admin and controller roles
    if (!["admin", "controller"].includes(session.role)) {
      console.log("Analytics API: Unauthorized role:", session.role);
      return NextResponse.json(
        { error: "Admin or controller access required" },
        { status: 401 }
      );
    }

    console.log("Analytics API: Access granted for role:", session.role);

    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const startDate =
      searchParams.get("startDate") ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0]; // Default to last 30 days
    const endDate =
      searchParams.get("endDate") || new Date().toISOString().split("T")[0];
    const period = searchParams.get("period") || "monthly"; // monthly, weekly, daily

    // Get all students - for admin, get all students; for controller, get only their students
    const students = await prisma.wpos_wpdatatable_23.findMany({
      where:
        session.role === "admin"
          ? {} // Admin can see all students
          : { control: { equals: session.username } }, // Controller only sees their students
      include: {
        teacher: true,
        attendance_progress: {
          where: {
            date: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          },
        },
      },
    });

    // Calculate student performance rankings
    const studentRankings = students
      .map((student) => {
        const totalSessions = student.attendance_progress.length;
        const presentSessions = student.attendance_progress.filter(
          (ap) => ap.attendance_status === "present"
        ).length;
        const attendanceRate =
          totalSessions > 0 ? (presentSessions / totalSessions) * 100 : 0;

        return {
          studentId: student.wdt_ID,
          studentName: student.name,
          teacherName: student.teacher?.ustazname || "", // <-- FIXED HERE
          totalSessions,
          presentSessions,
          absentSessions: student.attendance_progress.filter(
            (ap) => ap.attendance_status === "absent"
          ).length,
          permissionSessions: student.attendance_progress.filter(
            (ap) => ap.attendance_status === "permission"
          ).length,
          attendanceRate: Math.round(attendanceRate * 100) / 100,
        };
      })
      .sort((a, b) => b.attendanceRate - a.attendanceRate);

    // Calculate teacher performance
    const teacherStats = await prisma.wpos_wpdatatable_24.findMany({
      where:
        session.role === "admin"
          ? {} // Admin can see all teachers
          : {
              students: {
                some: {
                  control: { equals: session.username },
                },
              },
            },
      include: {
        students: {
          where:
            session.role === "admin"
              ? {} // Admin can see all students
              : { control: { equals: session.username } }, // Controller only sees their students
          include: {
            attendance_progress: {
              where: {
                date: {
                  gte: new Date(startDate),
                  lte: new Date(endDate),
                },
              },
            },
          },
        },
      },
    });

    const teacherPerformance = teacherStats
      .map((teacher) => {
        const allAttendance = teacher.students.flatMap(
          (student) => student.attendance_progress
        );
        const totalSessions = allAttendance.length;
        const presentSessions = allAttendance.filter(
          (ap) => ap.attendance_status === "present"
        ).length;
        const attendanceRate =
          totalSessions > 0 ? (presentSessions / totalSessions) * 100 : 0;

        return {
          teacherId: teacher.ustazid,
          teacherName: teacher.ustazname,
          totalSessions,
          presentSessions,
          absentSessions: allAttendance.filter(
            (ap) => ap.attendance_status === "absent"
          ).length,
          permissionSessions: allAttendance.filter(
            (ap) => ap.attendance_status === "permission"
          ).length,
          attendanceRate: Math.round(attendanceRate * 100) / 100,
          studentCount: teacher.students.length,
        };
      })
      .sort((a, b) => b.attendanceRate - a.attendanceRate);

    // Calculate attendance trends (daily data for the period)
    const attendanceTrends = [];
    const currentDate = new Date(startDate);
    const endDateTime = new Date(endDate);

    while (currentDate <= endDateTime) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const dayAttendance = students.flatMap((student) =>
        student.attendance_progress.filter((ap) => {
          const apDate = new Date(ap.date).toISOString().split("T")[0];
          return apDate === dateStr;
        })
      );

      const totalDay = dayAttendance.length;
      const presentDay = dayAttendance.filter(
        (ap) => ap.attendance_status === "present"
      ).length;
      const absentDay = dayAttendance.filter(
        (ap) => ap.attendance_status === "absent"
      ).length;
      const permissionDay = dayAttendance.filter(
        (ap) => ap.attendance_status === "permission"
      ).length;

      attendanceTrends.push({
        date: dateStr,
        total: totalDay,
        present: presentDay,
        absent: absentDay,
        permission: permissionDay,
        attendanceRate:
          totalDay > 0
            ? Math.round((presentDay / totalDay) * 100 * 100) / 100
            : 0,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate summary statistics
    const totalStudents = students.length;
    const totalSessions = students.reduce(
      (sum, student) => sum + student.attendance_progress.length,
      0
    );
    const totalPresent = students.reduce(
      (sum, student) =>
        sum +
        student.attendance_progress.filter(
          (ap) => ap.attendance_status === "present"
        ).length,
      0
    );
    const overallAttendanceRate =
      totalSessions > 0
        ? Math.round((totalPresent / totalSessions) * 100 * 100) / 100
        : 0;

    const analyticsData = {
      period: {
        startDate,
        endDate,
        type: period,
      },
      summary: {
        totalStudents,
        totalSessions,
        totalPresent,
        overallAttendanceRate,
        averageAttendanceRate:
          studentRankings.length > 0
            ? Math.round(
                (studentRankings.reduce(
                  (sum, student) => sum + student.attendanceRate,
                  0
                ) /
                  studentRankings.length) *
                  100
              ) / 100
            : 0,
      },
      studentRankings: studentRankings.slice(0, 20), // Top 20 students
      teacherPerformance: teacherPerformance.slice(0, 10), // Top 10 teachers
      attendanceTrends,
    };

    return NextResponse.json(analyticsData);
  } catch (error: any) {
    console.error("Analytics Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
