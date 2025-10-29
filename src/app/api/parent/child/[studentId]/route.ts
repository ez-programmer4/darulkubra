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
        classfee: true,
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
        questionId: true,
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

    // Get all test questions for all tests at once to avoid N+1 queries
    const testIds = testAppointments.map((appointment) => appointment.test.id);
    const allTestQuestions = await prisma.testquestion.findMany({
      where: {
        testId: { in: testIds },
      },
      select: {
        id: true,
        testId: true,
      },
    });

    // Group questions by test ID
    const questionsByTest = allTestQuestions.reduce((acc, question) => {
      if (!acc[question.testId]) {
        acc[question.testId] = [];
      }
      acc[question.testId].push(question.id);
      return acc;
    }, {} as Record<string, string[]>);

    // Debug logging removed for production

    // Calculate test performance summary
    const testSummary = testAppointments.map((appointment) => {
      const testQuestionIds = questionsByTest[appointment.test.id] || [];

      // Get results for this specific test appointment
      const results = testResults.filter((result) =>
        testQuestionIds.includes(result.questionId)
      );

      const totalQuestions = testQuestionIds.length;
      // Count correct answers - it seems result stores the actual score/points
      // If result > 0, it means the answer was correct
      const correctAnswers = results.filter((r) => r.result > 0).length;

      // Debug logging removed for production
      const score =
        totalQuestions > 0
          ? Math.round((correctAnswers / totalQuestions) * 100)
          : 0;
      const passed = score >= appointment.test.passingResult;

      // Debug logging removed for production

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

    // Get occupied times/scheduled times
    const occupiedTimes = await prisma.wpos_ustaz_occupied_times.findMany({
      where: {
        student_id: parseInt(studentId),
        end_at: null, // Only get active assignments
      },
      select: {
        time_slot: true,
        daypackage: true,
        occupied_at: true,
        end_at: true,
        teacher: {
          select: {
            ustazname: true,
          },
        },
      },
      orderBy: { occupied_at: "desc" },
    });

    // Debug logging
    console.log(
      `Student ID: ${studentId}, Occupied times count: ${occupiedTimes.length}`
    );
    if (occupiedTimes.length > 0) {
      console.log("Sample occupied time:", occupiedTimes[0]);
    } else {
      // Try to get all occupied times for this student (including inactive ones) for debugging
      const allOccupiedTimes = await prisma.wpos_ustaz_occupied_times.findMany({
        where: {
          student_id: parseInt(studentId),
        },
        select: {
          time_slot: true,
          daypackage: true,
          occupied_at: true,
          end_at: true,
          teacher: {
            select: {
              ustazname: true,
            },
          },
        },
        orderBy: { occupied_at: "desc" },
      });
      console.log(
        `Student ID: ${studentId}, All occupied times count: ${allOccupiedTimes.length}`
      );
      if (allOccupiedTimes.length > 0) {
        console.log("Sample all occupied time:", allOccupiedTimes[0]);
      }
    }

    // Get payment data
    const deposits = await prisma.payment.findMany({
      where: {
        studentid: parseInt(studentId),
      },
      select: {
        id: true,
        paidamount: true,
        reason: true,
        paymentdate: true,
        status: true,
        transactionid: true,
      },
      orderBy: { paymentdate: "desc" },
    });

    const monthlyPayments = await prisma.months_table.findMany({
      where: {
        studentid: parseInt(studentId),
      },
      select: {
        id: true,
        month: true,
        paid_amount: true,
        payment_status: true,
        payment_type: true,
        start_date: true,
        end_date: true,
        free_month_reason: true,
        is_free_month: true,
      },
      orderBy: { month: "desc" },
    });

    // Calculate payment summary
    const totalDeposits = deposits
      .filter((d) => d.status === "Approved")
      .reduce((sum, d) => sum + Number(d.paidamount), 0);

    const totalMonthlyPayments = monthlyPayments
      .filter((p) => p.payment_status === "Paid" && p.payment_type !== "free")
      .reduce((sum, p) => sum + Number(p.paid_amount), 0);

    const remainingBalance = totalDeposits - totalMonthlyPayments;

    // Get paid and unpaid months
    const paidMonths = monthlyPayments.filter(
      (p) => p.payment_status === "Paid" || p.is_free_month
    );

    const unpaidMonths = monthlyPayments.filter(
      (p) => p.payment_status !== "Paid" && !p.is_free_month
    );

    // Debug logging for payments
    console.log(`Student ID: ${studentId}, Deposits count: ${deposits.length}`);
    console.log(
      `Student ID: ${studentId}, Monthly payments count: ${monthlyPayments.length}`
    );
    if (deposits.length > 0) {
      console.log("Sample deposit:", deposits[0]);
    }
    if (monthlyPayments.length > 0) {
      console.log("Sample monthly payment:", monthlyPayments[0]);
    }

    return NextResponse.json({
      success: true,
      student: {
        ...student,
        classfee: student.classfee || 0,
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
        occupiedTimes: occupiedTimes.map((time) => {
          // Convert 24-hour format to 12-hour format
          const convertTo12Hour = (timeStr: string) => {
            if (!timeStr) return "Unknown";

            // Handle different time formats
            let time = timeStr;

            // If it's just time (HH:MM), add a date for parsing
            if (timeStr.match(/^\d{1,2}:\d{2}$/)) {
              time = `2000-01-01 ${timeStr}`;
            }

            try {
              const date = new Date(time);
              if (isNaN(date.getTime())) return timeStr;

              return date.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              });
            } catch {
              return timeStr;
            }
          };

          return {
            timeSlot: convertTo12Hour(time.time_slot),
            dayPackage: time.daypackage,
            occupiedAt:
              time.occupied_at?.toISOString().split("T")[0] || "Unknown",
            endAt: time.end_at?.toISOString().split("T")[0] || null,
            teacher: time.teacher?.ustazname || "Unknown",
          };
        }),
        payments: {
          summary: {
            totalDeposits,
            totalMonthlyPayments,
            remainingBalance,
            paidMonths: paidMonths.length,
            unpaidMonths: unpaidMonths.length,
          },
          deposits: deposits.slice(0, 10).map((deposit) => ({
            id: deposit.id,
            amount: Number(deposit.paidamount),
            reason: deposit.reason,
            date: deposit.paymentdate.toISOString().split("T")[0],
            status: deposit.status,
            transactionId: deposit.transactionid,
          })),
          monthlyPayments: monthlyPayments.slice(0, 12).map((payment) => ({
            id: payment.id,
            month: payment.month,
            amount: Number(payment.paid_amount),
            status: payment.payment_status,
            type: payment.payment_type,
            startDate: payment.start_date?.toISOString().split("T")[0] || null,
            endDate: payment.end_date?.toISOString().split("T")[0] || null,
            isFreeMonth: payment.is_free_month,
            freeReason: payment.free_month_reason,
          })),
          paidMonths: paidMonths.map((payment) => ({
            month: payment.month,
            amount: Number(payment.paid_amount),
            type: payment.payment_type,
            isFreeMonth: payment.is_free_month,
            freeReason: payment.free_month_reason,
          })),
          unpaidMonths: unpaidMonths.map((payment) => ({
            month: payment.month,
            amount: Number(payment.paid_amount),
            status: payment.payment_status,
          })),
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
