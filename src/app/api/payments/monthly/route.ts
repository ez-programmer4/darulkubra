import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { differenceInDays } from "date-fns";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

interface MonthlyPayment {
  id: number;
  studentid: number;
  month: string;
  paid_amount: number;
  payment_status: string;
  payment_type: string;
  start_date: string | null;
  end_date: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (
      !session ||
      (session.role !== "controller" &&
        session.role !== "registral" &&
        session.role !== "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    const student = await prisma.wpos_wpdatatable_23.findUnique({
      where: {
        wdt_ID: parseInt(studentId),
      },
      select: {
        u_control: true,
        startdate: true,
        classfee: true,
      },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (session.role === "controller" && student.u_control !== session.code) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    const monthlyPayments = await prisma.months_table.findMany({
      where: {
        studentid: parseInt(studentId),
      },
      orderBy: {
        month: "desc",
      },
    });
    const formattedPayments = monthlyPayments.map((payment) => ({
      ...payment,
      paid_amount: Number(payment.paid_amount),
      start_date: payment.start_date?.toISOString() || null,
      end_date: payment.end_date?.toISOString() || null,
      payment_type:
        payment.payment_type === "prize" ? "free" : payment.payment_type,
    }));

    return NextResponse.json(formattedPayments);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (
    !session ||
    (session.role !== "controller" &&
      session.role !== "registral" &&
      session.role !== "admin")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      studentId,
      month,
      paidAmount,
      paymentStatus,
      payment_type,
      free_month_reason = "", // Default to empty string
    } = body;

    if (
      studentId === undefined ||
      studentId === null ||
      month === undefined ||
      month === null ||
      paidAmount === undefined ||
      paidAmount === null || // Fixed check
      paymentStatus === undefined ||
      paymentStatus === null ||
      payment_type === undefined ||
      payment_type === null
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          debug: {
            studentId,
            month,
            paidAmount,
            paymentStatus,
            payment_type,
            body,
          },
        },
        { status: 400 }
      );
    }

    // Validate month format (YYYY-MM)
    const [year, monthNum] = month.split("-");
    if (
      !year ||
      !monthNum ||
      isNaN(parseInt(year)) ||
      isNaN(parseInt(monthNum)) ||
      monthNum.length !== 2 ||
      parseInt(monthNum) < 1 ||
      parseInt(monthNum) > 12
    ) {
      return NextResponse.json(
        { error: "Invalid month format. Use YYYY-MM (e.g., 2025-06)" },
        { status: 400 }
      );
    }

    // Validate payment type
    if (!["full", "partial", "prizepartial", "free"].includes(payment_type)) {
      return NextResponse.json(
        {
          error:
            "Invalid payment type. Must be 'full', 'partial', 'prizepartial', or 'free'",
        },
        { status: 400 }
      );
    }

    // Validate payment status
    if (!["pending", "paid", "rejected"].includes(paymentStatus)) {
      return NextResponse.json(
        {
          error:
            "Invalid payment status. Must be 'pending', 'paid', or 'rejected'",
        },
        { status: 400 }
      );
    }

    // Get the student to verify ownership
    const student = await prisma.wpos_wpdatatable_23.findUnique({
      where: {
        wdt_ID: parseInt(studentId),
      },
      select: {
        u_control: true,
        startdate: true,
        classfee: true,
        refer: true, // <-- Add refer field
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (!student.classfee) {
      return NextResponse.json(
        { error: "Student has no class fee set" },
        { status: 400 }
      );
    }

    if (!student.startdate) {
      return NextResponse.json(
        { error: "Student start date is not set" },
        { status: 400 }
      );
    }

    // Check if the student belongs to this controller (for controller role)
    if (session.role === "controller" && student.u_control !== session.code) {
      return NextResponse.json(
        { error: "You are not authorized to add payments for this student" },
        { status: 403 }
      );
    }

    // Get all monthly payments for the student
    const allPayments = await prisma.months_table.findMany({
      where: {
        studentid: parseInt(studentId),
      },
      orderBy: {
        month: "asc",
      },
    });

    // Check for any unpaid months before the current month
    const currentMonthDate = new Date(
      parseInt(year),
      parseInt(monthNum) - 1,
      1
    );
    const studentStartDate = new Date(student.startdate);

    // Get all months up to the current month
    const monthsToCheck = [];
    let checkDate = new Date(studentStartDate);
    while (checkDate < currentMonthDate) {
      monthsToCheck.push(
        `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(
          2,
          "0"
        )}`
      );
      checkDate.setMonth(checkDate.getMonth() + 1);
    }

    // Check each month in sequence
    for (const monthToCheck of monthsToCheck) {
      const monthPayments = allPayments.filter((p) => p.month === monthToCheck);
      const totalPaid = monthPayments.reduce(
        (sum, p) => sum + Number(p.paid_amount),
        0
      );
      const hasFullPrize = monthPayments.some((p) => p.payment_type === "free");
      const hasPartialPrize = monthPayments.some(
        (p) => p.payment_type === "prizepartial"
      );
      const hasRemainingPayment = monthPayments.some(
        (p) => p.payment_type === "partial"
      );

      // Skip if month is covered by a full prize
      if (hasFullPrize) continue;

      // Skip if month has both partial prize and remaining payment
      if (hasPartialPrize && hasRemainingPayment) continue;

      // Calculate expected amount for this month
      const [checkYear, checkMonth] = monthToCheck.split("-").map(Number);
      const monthStart = new Date(checkYear, checkMonth - 1, 1);
      const monthEnd = new Date(checkYear, checkMonth, 0);

      // Calculate prorated amount for this month
      const daysInMonth = monthEnd.getDate();
      const daysInClass = Math.min(
        differenceInDays(monthEnd, monthStart) + 1,
        differenceInDays(monthEnd, studentStartDate) + 1
      );
      const expectedAmount =
        (Number(student.classfee) * daysInClass) / daysInMonth;

      // If this is a prize payment, skip the unpaid check
      if (payment_type === "prizepartial" || payment_type === "free") continue;

      // Check if the month is fully paid
      if (totalPaid < expectedAmount) {
        return NextResponse.json(
          {
            error: `Month ${monthToCheck} is not fully paid. Please complete previous months first.`,
          },
          { status: 400 }
        );
      }
    }

    // Check if payment already exists for this month
    const existingPayments = allPayments.filter((p) => p.month === month);

    // If there's a full prize (free month), block any additional payments
    const hasFullPrize = existingPayments.some(
      (payment) => payment.payment_type === "free"
    );
    if (hasFullPrize) {
      return NextResponse.json(
        { error: "This month is fully covered by a prize" },
        { status: 400 }
      );
    }

    // Get all prizes for this student
    const prizes = await prisma.months_table.findMany({
      where: {
        studentid: studentId,
        payment_type: "prizepartial",
      },
    });

    // Calculate total paid amount for this month
    const totalPaid = existingPayments.reduce((sum, payment) => {
      return sum + Number(payment.paid_amount);
    }, 0);

    // Calculate expected amount for this month
    let expectedAmount = student.classfee || 0;

    // If this is a prorated month (student's start month)
    if (
      parseInt(year) === studentStartDate.getFullYear() &&
      parseInt(monthNum) - 1 === studentStartDate.getMonth()
    ) {
      const daysInMonth = new Date(
        parseInt(year),
        parseInt(monthNum),
        0
      ).getDate();

      // Match frontend's endOfMonth calculation
      const monthEnd = new Date(parseInt(year), parseInt(monthNum), 0);
      monthEnd.setHours(23, 59, 59, 999);

      // Match frontend's startDate calculation
      const startDate = new Date(studentStartDate);
      startDate.setHours(0, 0, 0, 0);

      const daysFromStart = Math.min(
        differenceInDays(monthEnd, startDate) + 1,
        daysInMonth
      );

      expectedAmount = (student.classfee || 0) * (daysFromStart / daysInMonth);
      expectedAmount = Number(expectedAmount.toFixed(2)); // Round to 2 decimal places

      console.log("Payment calculation:", {
        startDate: startDate.toISOString(),
        monthEnd: monthEnd.toISOString(),
      });
    }

    // Add the new payment amount
    const newTotal = totalPaid + Number(paidAmount);

    // Ensure paidAmount is a number for Prisma
    const paidAmountNumber =
      typeof paidAmount === "string" ? parseFloat(paidAmount) : paidAmount;
    // Skip exceeding check for free payments, allow paidAmount: 0
    if (payment_type !== "free" && newTotal > expectedAmount + 0.01) {
      // Add small tolerance for floating point arithmetic, only for non-free payments
      return NextResponse.json(
        {
          error: "Total payment amount exceeds expected amount",
          details: {
            totalPaid,
            paidAmount,
            newTotal,
            expectedAmount,
            difference: newTotal - expectedAmount,
          },
        },
        { status: 400 }
      );
    }

    // Create the monthly payment record
    const isFirstMonth =
      parseInt(year) === studentStartDate.getFullYear() &&
      parseInt(monthNum) - 1 === studentStartDate.getMonth();

    const startDate = isFirstMonth
      ? new Date(
          studentStartDate.getFullYear(),
          studentStartDate.getMonth(),
          studentStartDate.getDate(),
          0,
          0,
          0
        )
      : new Date(parseInt(year), parseInt(monthNum) - 1, 1, 0, 0, 0);

    const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59);

    const monthlyPayment = await prisma.months_table.create({
      data: {
        studentid: parseInt(studentId),
        month: month,
        paid_amount: paidAmountNumber,
        payment_status: paymentStatus,
        payment_type: payment_type,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        is_free_month: payment_type === "free" ? true : false,
        free_month_reason: payment_type === "free" ? free_month_reason : null,
      },
    });

    // Controller Earnings Logic
    if (
      paymentStatus === "paid" &&
      student.u_control &&
      Number(paidAmount) > 0 &&
      ["full", "partial", "prizepartial"].includes(payment_type)
    ) {
      // Only one earning per student per month
      const existingEarning = await prisma.controllerearning.findFirst({
        where: {
          controllerUsername: student.u_control,
          studentId: parseInt(studentId),
        },
      });
      if (!existingEarning) {
        await prisma.controllerearning.create({
          data: {
            controllerUsername: student.u_control,
            studentId: parseInt(studentId),
            paymentId: monthlyPayment.id,
            amount: (Number(paidAmount) * 0.1).toFixed(2), // 10% commission
          },
        });
      }
    }

    return NextResponse.json(monthlyPayment);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
