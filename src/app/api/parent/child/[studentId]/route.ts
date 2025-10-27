import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const { studentId } = params;
    const { searchParams } = new URL(req.url);
    const parentPhone = searchParams.get("parentPhone");

    if (!parentPhone) {
      return NextResponse.json(
        { error: "Parent phone is required" },
        { status: 400 }
      );
    }

    // Verify this student belongs to this parent
    const student = await prisma.wpos_wpdatatable_23.findFirst({
      where: {
        wdt_ID: parseInt(studentId),
        parent_phone: parentPhone,
      },
      select: {
        wdt_ID: true,
        name: true,
        package: true,
        status: true,
        ustaz: true,
        daypackages: true,
        registrationdate: true,
        startdate: true,
        teacher: {
          select: {
            ustazname: true,
            phone: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found or access denied" },
        { status: 404 }
      );
    }

    // Get attendance data
    const attendanceData = await prisma.student_attendance_progress.findMany({
      where: {
        student_id: parseInt(studentId),
      },
      select: {
        id: true,
        date: true,
        attendance_status: true,
        surah: true,
        pages_read: true,
        level: true,
        lesson: true,
        notes: true,
      },
      orderBy: {
        date: "desc",
      },
      take: 30, // Last 30 attendance records
    });

    // Get zoom session history
    const zoomSessions = await prisma.wpos_zoom_links.findMany({
      where: {
        studentid: parseInt(studentId),
      },
      select: {
        sent_time: true,
        link: true,
        ustazid: true,
        wpos_wpdatatable_24: {
          select: {
            ustazname: true,
          },
        },
      },
      orderBy: {
        sent_time: "desc",
      },
      take: 20, // Last 20 zoom sessions
    });

    // Calculate attendance summary
    const totalDays = attendanceData.length;
    const presentDays = attendanceData.filter(
      (a) =>
        a.attendance_status?.toLowerCase() === "present" ||
        a.attendance_status?.toLowerCase() === "attended"
    ).length;
    const absentDays = attendanceData.filter(
      (a) =>
        a.attendance_status?.toLowerCase() === "absent" ||
        a.attendance_status?.toLowerCase() === "not attended"
    ).length;
    const attendancePercentage =
      totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    // Get recent activity (last 7 days)
    const recentActivity = await prisma.wpos_zoom_links.findMany({
      where: {
        studentid: parseInt(studentId),
        sent_time: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      select: {
        sent_time: true,
        wpos_wpdatatable_24: {
          select: {
            ustazname: true,
          },
        },
      },
      orderBy: {
        sent_time: "desc",
      },
    });

    // Get test appointments for this student
    const testAppointments = await prisma.testappointment.findMany({
      where: {
        studentId: parseInt(studentId),
      },
      select: {
        id: true,
        date: true,
        test: {
          select: {
            id: true,
            name: true,
            passingResult: true,
            lastSubject: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    // Get test results for this student
    const testResults = await prisma.testresult.findMany({
      where: {
        studentId: parseInt(studentId),
      },
      select: {
        id: true,
        result: true,
        testquestion: {
          select: {
            id: true,
            question: true,
            odd: true,
            test: {
              select: {
                id: true,
                name: true,
                passingResult: true,
              },
            },
          },
        },
      },
      orderBy: {
        testquestion: {
          test: {
            name: "desc",
          },
        },
      },
    });

    // Calculate test performance summary
    const testSummary = testAppointments.map((appointment) => {
      const results = testResults.filter(
        (result) => result.testquestion.test.id === appointment.test.id
      );

      const totalQuestions = results.length;
      const correctAnswers = results.filter((r) => r.result === 1).length;
      const score =
        totalQuestions > 0
          ? Math.round((correctAnswers / totalQuestions) * 100)
          : 0;
      const passed = score >= appointment.test.passingResult;

      return {
        testId: appointment.test.id,
        testName: appointment.test.name,
        appointmentDate: appointment.date,
        totalQuestions,
        correctAnswers,
        score,
        passed,
        passingResult: appointment.test.passingResult,
        lastSubject: appointment.test.lastSubject,
      };
    });

    return NextResponse.json({
      success: true,
      student: {
        ...student,
        attendance: {
          totalDays,
          presentDays,
          absentDays,
          percentage: attendancePercentage,
          recentRecords: attendanceData.slice(0, 10).map((record) => ({
            id: record.id,
            date: record.date.toISOString().split("T")[0],
            status: record.attendance_status,
            surah: record.surah,
            pages_read: record.pages_read,
            level: record.level,
            lesson: record.lesson,
            notes: record.notes,
          })), // Last 10 records
        },
        zoomSessions: zoomSessions,
        recentActivity: recentActivity,
        testResults: testSummary,
        summary: {
          totalZoomSessions: zoomSessions.length,
          recentSessions: recentActivity.length,
          lastSession: zoomSessions[0]?.sent_time || null,
          totalTests: testSummary.length,
          passedTests: testSummary.filter((t) => t.passed).length,
          averageScore:
            testSummary.length > 0
              ? Math.round(
                  testSummary.reduce((sum, t) => sum + t.score, 0) /
                    testSummary.length
                )
              : 0,
        },
      },
    });
  } catch (error: any) {
    console.error("Parent child data error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
