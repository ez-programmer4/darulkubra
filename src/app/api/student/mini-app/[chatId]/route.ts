import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const { chatId } = params;

    // Find student by chatId
    const student = await prisma.wpos_wpdatatable_23.findFirst({
      where: { chatId: chatId },
      select: {
        wdt_ID: true,
        name: true,
        package: true,
        subject: true,
        classfee: true,
        daypackages: true,
        status: true,
        startdate: true,
        teacher: {
          select: {
            ustazname: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Status check removed - allow all students to access data

    // Get attendance data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attendanceRecords = await prisma.tarbiaAttendance.findMany({
      where: {
        studId: student.wdt_ID,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const presentDays = attendanceRecords.filter(
      (record) => record.status
    ).length;
    const absentDays = attendanceRecords.filter(
      (record) => !record.status
    ).length;
    const totalDays = presentDays + absentDays;
    const attendancePercent =
      totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    // Get zoom sessions (last 30 days)
    const zoomSessions = await prisma.wpos_zoom_links.findMany({
      where: {
        studentid: student.wdt_ID,
        sent_time: { gte: thirtyDaysAgo },
      },
      select: {
        sent_time: true,
        ustazid: true,
        wpos_wpdatatable_24: {
          select: {
            ustazname: true,
          },
        },
      },
      orderBy: { sent_time: "desc" },
    });

    // Get test results (last 30 days)
    const testAppointments = await prisma.testappointment.findMany({
      where: {
        studentId: student.wdt_ID,
        date: { gte: thirtyDaysAgo },
      },
      include: {
        test: {
          select: {
            id: true,
            name: true,
            passingResult: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // Get test results for these appointments
    const testResults = await prisma.testresult.findMany({
      where: {
        studentId: student.wdt_ID,
      },
      select: {
        result: true,
        questionId: true,
        testquestion: {
          select: {
            testId: true,
          },
        },
      },
    });

    // Calculate test performance
    const testPerformance = testAppointments.map((appointment) => {
      const results = testResults.filter(
        (result) => result.testquestion.testId === appointment.test.id
      );

      const correctAnswers = results.filter((r) => r.result > 0).length;
      const totalQuestions = results.length;
      const score =
        totalQuestions > 0
          ? Math.round((correctAnswers / totalQuestions) * 100)
          : 0;
      const passed = score >= appointment.test.passingResult;

      return {
        testName: appointment.test.name,
        date: appointment.date,
        score,
        passed,
        passingResult: appointment.test.passingResult,
      };
    });

    const passedTests = testPerformance.filter((test) => test.passed).length;
    const averageScore =
      testPerformance.length > 0
        ? Math.round(
            testPerformance.reduce((sum, test) => sum + test.score, 0) /
              testPerformance.length
          )
        : 0;

    // Get occupied times/scheduled times
    const occupiedTimes = await prisma.wpos_ustaz_occupied_times.findMany({
      where: {
        student_id: student.wdt_ID,
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

    // Get payment data
    const deposits = await prisma.payment.findMany({
      where: {
        studentid: student.wdt_ID,
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
        studentid: student.wdt_ID,
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
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1
    ).padStart(2, "0")}`;

    const paidMonths = monthlyPayments.filter(
      (p) => p.payment_status === "Paid" || p.is_free_month
    );

    const unpaidMonths = monthlyPayments.filter(
      (p) => p.payment_status !== "Paid" && !p.is_free_month
    );

    // Get Terbia progress
    const subjectPackages = await prisma.subjectPackage.findMany({
      select: {
        subject: true,
        kidpackage: true,
        packageType: true,
        packageId: true,
      },
      distinct: ["subject", "kidpackage", "packageType"],
    });

    const matchedSubjectPackage = subjectPackages.find(
      (sp) =>
        sp.subject === student.package &&
        sp.packageType === student.package &&
        sp.kidpackage === false // Assuming not kid package for now
    );

    let terbiaProgress = null;
    if (matchedSubjectPackage) {
      // Get student progress for this package
      const chapters = await prisma.chapter.findMany({
        where: { course: { packageId: matchedSubjectPackage.packageId } },
        select: { id: true },
      });

      const progress = await prisma.studentProgress.findMany({
        where: {
          studentId: student.wdt_ID,
          chapterId: { in: chapters.map((ch) => ch.id) },
        },
        select: { isCompleted: true },
      });

      const completedChapters = progress.filter((p) => p.isCompleted).length;
      const totalChapters = chapters.length;
      const progressPercent =
        totalChapters > 0
          ? Math.round((completedChapters / totalChapters) * 100)
          : 0;

      terbiaProgress = {
        courseName: matchedSubjectPackage.packageType,
        progressPercent,
        completedChapters,
        totalChapters,
      };
    }

    // Prepare response
    const studentData = {
      student: {
        name: student.name,
        package: student.package,
        subject: student.subject,
        classfee: student.classfee,
        daypackages: student.daypackages,
        startdate: student.startdate,
        teacher: student.teacher?.ustazname || "Not assigned",
      },
      stats: {
        attendancePercent,
        totalZoomSessions: zoomSessions.length,
        testsThisMonth: testPerformance.length,
        terbiaProgress: terbiaProgress?.progressPercent || 0,
      },
      attendance: {
        presentDays,
        absentDays,
        totalDays,
        thisMonth: attendanceRecords.slice(0, 10).map((record) => ({
          date: record.createdAt.toISOString().split("T")[0],
          status: record.status ? "present" : "absent",
        })),
      },
      recentTests: testPerformance.slice(0, 5),
      terbia: terbiaProgress,
      recentZoomSessions: zoomSessions.slice(0, 5).map((session) => ({
        date: session.sent_time?.toISOString().split("T")[0] || "Unknown",
        teacher: session.wpos_wpdatatable_24?.ustazname || "Unknown",
      })),
      occupiedTimes: occupiedTimes.slice(0, 10).map((time) => {
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
    };

    return NextResponse.json({
      success: true,
      data: studentData,
    });
  } catch (error) {
    console.error("Student mini app API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
