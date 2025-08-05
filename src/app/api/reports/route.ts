import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "controller" || !session.username) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const searchParams = url.searchParams;
  const startDate =
    searchParams.get("startDate") ||
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const endDate =
    searchParams.get("endDate") || new Date().toISOString().split("T")[0];
  const reportType = searchParams.get("type") || "comprehensive";

  try {
    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        u_control: { equals: session.code },
        status: { equals: "active" }, // Only active students
      },
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

    const teachers = await prisma.wpos_wpdatatable_24.findMany({
      where: {
        students: {
          some: {
            u_control: { equals: session.code },
            status: { equals: "active" }, // Only active students
          },
        },
      },
      include: {
        students: {
          where: {
            u_control: { equals: session.code },
            status: { equals: "active" }, // Only active students
          },
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

    let reportData: any = {};

    switch (reportType) {
      case "comprehensive":
        reportData = await generateComprehensiveReport(
          students,
          teachers,
          startDate,
          endDate
        );
        break;
      case "student":
        reportData = await generateStudentReport(students, startDate, endDate);
        break;
      case "teacher":
        reportData = await generateTeacherReport(teachers, startDate, endDate);
        break;
      case "daily":
        reportData = await generateDailyReport(students, startDate, endDate);
        break;
      default:
        reportData = await generateComprehensiveReport(
          students,
          teachers,
          startDate,
          endDate
        );
    }

    return NextResponse.json(reportData);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to generate report", details: error.message },
      { status: 500 }
    );
  }
}

async function generateComprehensiveReport(
  students: any[],
  teachers: any[],
  startDate: string,
  endDate: string
) {
  const totalStudents = students.length;
  const totalSessions = students.reduce(
    (sum, student) => sum + student.attendance_progress.length,
    0
  );
  const totalPresent = students.reduce(
    (sum, student) =>
      sum +
      student.attendance_progress.filter(
        (ap: any) => ap.attendance_status === "present"
      ).length,
    0
  );
  const totalAbsent = students.reduce(
    (sum, student) =>
      sum +
      student.attendance_progress.filter(
        (ap: any) => ap.attendance_status === "absent"
      ).length,
    0
  );
  const totalPermission = students.reduce(
    (sum, student) =>
      sum +
      student.attendance_progress.filter(
        (ap: any) => ap.attendance_status === "permission"
      ).length,
    0
  );

  const overallAttendanceRate =
    totalSessions > 0
      ? Math.round((totalPresent / totalSessions) * 100 * 100) / 100
      : 0;

  const studentPerformance = students
    .map((student) => {
      const totalSessions = student.attendance_progress.length;
      const presentSessions = student.attendance_progress.filter(
        (ap: any) => ap.attendance_status === "present"
      ).length;
      const absentSessions = student.attendance_progress.filter(
        (ap: any) => ap.attendance_status === "absent"
      ).length;
      const permissionSessions = student.attendance_progress.filter(
        (ap: any) => ap.attendance_status === "permission"
      ).length;
      const attendanceRate =
        totalSessions > 0
          ? Math.round((presentSessions / totalSessions) * 100 * 100) / 100
          : 0;

      return {
        studentId: student.id,
        studentName: student.name,
        teacherName: student.teacher.ustazname,
        totalSessions,
        presentSessions,
        absentSessions,
        permissionSessions,
        attendanceRate,
        status: student.status,
        package: student.package,
        subject: student.subject,
      };
    })
    .sort((a, b) => b.attendanceRate - a.attendanceRate);

  const teacherPerformance = teachers
    .map((teacher) => {
      const allAttendance = teacher.students.flatMap(
        (student: any) => student.attendance_progress
      );
      const totalSessions = allAttendance.length;
      const presentSessions = allAttendance.filter(
        (ap: any) => ap.attendance_status === "present"
      ).length;
      const absentSessions = allAttendance.filter(
        (ap: any) => ap.attendance_status === "absent"
      ).length;
      const permissionSessions = allAttendance.filter(
        (ap: any) => ap.attendance_status === "permission"
      ).length;
      const attendanceRate =
        totalSessions > 0
          ? Math.round((presentSessions / totalSessions) * 100 * 100) / 100
          : 0;

      return {
        teacherId: teacher.ustazid,
        teacherName: teacher.ustazname,
        totalStudents: teacher.students.length,
        totalSessions,
        presentSessions,
        absentSessions,
        permissionSessions,
        attendanceRate,
      };
    })
    .sort((a, b) => b.attendanceRate - a.attendanceRate);

  const dailyTrends = [];
  const currentDate = new Date(startDate);
  const endDateTime = new Date(endDate);

  while (currentDate <= endDateTime) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const dayAttendance = students.flatMap((student) =>
      student.attendance_progress.filter((ap: any) => {
        const apDate = new Date(ap.date).toISOString().split("T")[0];
        return apDate === dateStr;
      })
    );

    const totalDay = dayAttendance.length;
    const presentDay = dayAttendance.filter(
      (ap: any) => ap.attendance_status === "present"
    ).length;
    const absentDay = dayAttendance.filter(
      (ap: any) => ap.attendance_status === "absent"
    ).length;
    const permissionDay = dayAttendance.filter(
      (ap: any) => ap.attendance_status === "permission"
    ).length;

    dailyTrends.push({
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

  const packageAnalysis = students.reduce((acc: any, student) => {
    const packageName = student.package || "Unknown";
    if (!acc[packageName]) {
      acc[packageName] = { count: 0, totalSessions: 0, presentSessions: 0 };
    }
    acc[packageName].count++;
    acc[packageName].totalSessions += student.attendance_progress.length;
    acc[packageName].presentSessions += student.attendance_progress.filter(
      (ap: any) => ap.attendance_status === "present"
    ).length;
    return acc;
  }, {});

  Object.keys(packageAnalysis).forEach((packageName) => {
    const pkg = packageAnalysis[packageName];
    pkg.attendanceRate =
      pkg.totalSessions > 0
        ? Math.round((pkg.presentSessions / pkg.totalSessions) * 100 * 100) /
          100
        : 0;
  });

  return {
    reportType: "comprehensive",
    period: { startDate, endDate },
    summary: {
      totalStudents,
      totalSessions,
      totalPresent,
      totalAbsent,
      totalPermission,
      overallAttendanceRate,
    },
    studentPerformance: studentPerformance.slice(0, 50),
    teacherPerformance: teacherPerformance.slice(0, 20),
    dailyTrends,
    packageAnalysis,
    recommendations: generateRecommendations(
      studentPerformance,
      teacherPerformance,
      dailyTrends
    ),
  };
}

async function generateStudentReport(
  students: any[],
  startDate: string,
  endDate: string
) {
  const studentDetails = students
    .map((student) => {
      const totalSessions = student.attendance_progress.length;
      const presentSessions = student.attendance_progress.filter(
        (ap: any) => ap.attendance_status === "present"
      ).length;
      const absentSessions = student.attendance_progress.filter(
        (ap: any) => ap.attendance_status === "absent"
      ).length;
      const permissionSessions = student.attendance_progress.filter(
        (ap: any) => ap.attendance_status === "permission"
      ).length;
      const attendanceRate =
        totalSessions > 0
          ? Math.round((presentSessions / totalSessions) * 100 * 100) / 100
          : 0;

      let maxConsecutiveAbsences = 0;
      let currentConsecutiveAbsences = 0;
      const sortedAttendance = student.attendance_progress.sort(
        (a: any, b: any) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      for (const attendance of sortedAttendance) {
        if (attendance.attendance_status === "absent") {
          currentConsecutiveAbsences++;
          maxConsecutiveAbsences = Math.max(
            maxConsecutiveAbsences,
            currentConsecutiveAbsences
          );
        } else {
          currentConsecutiveAbsences = 0;
        }
      }

      return {
        studentId: student.id,
        studentName: student.name,
        teacherName: student.teacher.ustazname,
        phoneNumber: student.phoneno,
        package: student.package,
        subject: student.subject,
        status: student.status,
        totalSessions,
        presentSessions,
        absentSessions,
        permissionSessions,
        attendanceRate,
        maxConsecutiveAbsences,
        lastAttendance:
          sortedAttendance.length > 0
            ? sortedAttendance[sortedAttendance.length - 1].date
            : null,
      };
    })
    .sort((a, b) => b.attendanceRate - a.attendanceRate);

  return {
    reportType: "student",
    period: { startDate, endDate },
    totalStudents: students.length,
    studentDetails,
  };
}

async function generateTeacherReport(
  teachers: any[],
  startDate: string,
  endDate: string
) {
  const teacherDetails = teachers
    .map((teacher) => {
      const allAttendance = teacher.students.flatMap(
        (student: any) => student.attendance_progress
      );
      const totalSessions = allAttendance.length;
      const presentSessions = allAttendance.filter(
        (ap: any) => ap.attendance_status === "present"
      ).length;
      const absentSessions = allAttendance.filter(
        (ap: any) => ap.attendance_status === "absent"
      ).length;
      const permissionSessions = allAttendance.filter(
        (ap: any) => ap.attendance_status === "permission"
      ).length;
      const attendanceRate =
        totalSessions > 0
          ? Math.round((presentSessions / totalSessions) * 100 * 100) / 100
          : 0;

      const studentBreakdown = teacher.students.map((student: any) => {
        const studentSessions = student.attendance_progress.length;
        const studentPresent = student.attendance_progress.filter(
          (ap: any) => ap.attendance_status === "present"
        ).length;
        const studentRate =
          studentSessions > 0
            ? Math.round((studentPresent / studentSessions) * 100 * 100) / 100
            : 0;

        return {
          studentId: student.id,
          studentName: student.name,
          attendanceRate: studentRate,
          totalSessions: studentSessions,
        };
      });

      return {
        teacherId: teacher.ustazid,
        teacherName: teacher.ustazname,
        totalStudents: teacher.students.length,
        totalSessions,
        presentSessions,
        absentSessions,
        permissionSessions,
        attendanceRate,
        studentBreakdown,
      };
    })
    .sort((a, b) => b.attendanceRate - a.attendanceRate);

  return {
    reportType: "teacher",
    period: { startDate, endDate },
    totalTeachers: teachers.length,
    teacherDetails,
  };
}

async function generateDailyReport(
  students: any[],
  startDate: string,
  endDate: string
) {
  const dailyData = [];
  const currentDate = new Date(startDate);
  const endDateTime = new Date(endDate);

  while (currentDate <= endDateTime) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const dayAttendance = students.flatMap((student) =>
      student.attendance_progress.filter((ap: any) => {
        const apDate = new Date(ap.date).toISOString().split("T")[0];
        return apDate === dateStr;
      })
    );

    const totalDay = dayAttendance.length;
    const presentDay = dayAttendance.filter(
      (ap: any) => ap.attendance_status === "present"
    ).length;
    const absentDay = dayAttendance.filter(
      (ap: any) => ap.attendance_status === "absent"
    ).length;
    const permissionDay = dayAttendance.filter(
      (ap: any) => ap.attendance_status === "permission"
    ).length;

    const teacherBreakdown = students.reduce((acc: any, student) => {
      const teacherName = student.teacher.ustazname;
      const studentAttendance = student.attendance_progress.filter(
        (ap: any) => {
          const apDate = new Date(ap.date).toISOString().split("T")[0];
          return apDate === dateStr;
        }
      );

      if (!acc[teacherName]) {
        acc[teacherName] = { total: 0, present: 0, absent: 0, permission: 0 };
      }

      studentAttendance.forEach((ap: any) => {
        acc[teacherName].total++;
        acc[teacherName][ap.attendance_status]++;
      });

      return acc;
    }, {});

    dailyData.push({
      date: dateStr,
      total: totalDay,
      present: presentDay,
      absent: absentDay,
      permission: permissionDay,
      attendanceRate:
        totalDay > 0
          ? Math.round((presentDay / totalDay) * 100 * 100) / 100
          : 0,
      teacherBreakdown,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    reportType: "daily",
    period: { startDate, endDate },
    dailyData,
  };
}

function generateRecommendations(
  studentPerformance: any[],
  teacherPerformance: any[],
  dailyTrends: any[]
) {
  const recommendations = [];

  const lowAttendanceStudents = studentPerformance.filter(
    (s) => s.attendanceRate < 70
  );
  if (lowAttendanceStudents.length > 0) {
    recommendations.push({
      type: "student",
      priority: "high",
      message: `${lowAttendanceStudents.length} students have attendance rates below 70%. Consider intervention strategies.`,
      students: lowAttendanceStudents.slice(0, 5).map((s) => s.studentName),
    });
  }

  const lowAttendanceTeachers = teacherPerformance.filter(
    (t) => t.attendanceRate < 75
  );
  if (lowAttendanceTeachers.length > 0) {
    recommendations.push({
      type: "teacher",
      priority: "medium",
      message: `${lowAttendanceTeachers.length} teachers have attendance rates below 75%. Consider additional support.`,
      teachers: lowAttendanceTeachers.slice(0, 3).map((t) => t.teacherName),
    });
  }

  const recentTrends = dailyTrends.slice(-7);
  const averageRecentRate =
    recentTrends.reduce((sum, day) => sum + day.attendanceRate, 0) /
    recentTrends.length;

  if (averageRecentRate < 80) {
    recommendations.push({
      type: "trend",
      priority: "medium",
      message:
        "Recent attendance trend shows declining rates. Consider reviewing scheduling and communication.",
    });
  }

  return recommendations;
}
