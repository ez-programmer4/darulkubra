import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// import { Decimal } from "@prisma/client/runtime/library";
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
      free_month_reason = "",
      legacyPaidThrough, // optional YYYY-MM to bypass unpaid checks before this month (admin/registral only)
      ignoreHistoricalUnpaid = false, // optional boolean to bypass unpaid checks entirely (admin/registral only)
    } = body;

    if (
      studentId === undefined ||
      studentId === null ||
      month === undefined ||
      month === null ||
      paidAmount === undefined ||
      paidAmount === null ||
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

    // Validate month format (accept YYYY-MM or YYYY-M) and normalize to YYYY-MM
    const monthMatch = String(month).match(/^(\d{4})-(\d{1,2})$/);
    if (!monthMatch) {
      return NextResponse.json(
        { error: "Invalid month format. Use YYYY-MM (e.g., 2025-06)" },
        { status: 400 }
      );
    }
    const year = monthMatch[1];
    const rawMonthNum = monthMatch[2];
    const monthInt = parseInt(rawMonthNum, 10);
    if (monthInt < 1 || monthInt > 12) {
      return NextResponse.json(
        { error: "Invalid month number. Must be between 1 and 12" },
        { status: 400 }
      );
    }
    const monthNum = String(monthInt).padStart(2, "0");
    const normalizedMonth = `${year}-${monthNum}`;

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
    if (!["pending", "Paid", "rejected"].includes(paymentStatus)) {
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
        refer: true,
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

    // Compute baseline for historical unpaid checks
    const canOverrideChecks =
      session.role === "admin" || session.role === "registral";
    let normalizedLegacyPaidThrough: string | null = null;
    if (canOverrideChecks && legacyPaidThrough) {
      const legMatch = String(legacyPaidThrough).match(/^(\d{4})-(\d{1,2})$/);
      if (legMatch) {
        const ly = legMatch[1];
        const lm = String(parseInt(legMatch[2], 10)).padStart(2, "0");
        normalizedLegacyPaidThrough = `${ly}-${lm}`;
      }
    }

    const earliestRecordedMonth =
      allPayments.length > 0 ? allPayments[0].month : null; // sorted asc
    // If we have records, don't enforce checks before the earliest recorded month
    const baselineStartMonth = normalizedLegacyPaidThrough
      ? normalizedLegacyPaidThrough
      : earliestRecordedMonth ?? null;

    // Enhanced validation logic for unpaid months
    const currentMonthDate = new Date(
      parseInt(year),
      parseInt(monthNum) - 1,
      1
    );
    const studentStartDate = new Date(student.startdate);

    // Helper function to calculate expected amount for a month
    const calculateExpectedAmount = (monthStr: string): number => {
      const [checkYear, checkMonth] = monthStr.split("-").map(Number);
      const monthStart = new Date(checkYear, checkMonth - 1, 1);
      const monthEnd = new Date(checkYear, checkMonth, 0);
      
      // If month is before student start date, return 0
      if (monthStart < new Date(studentStartDate.getFullYear(), studentStartDate.getMonth(), 1)) {
        return 0;
      }
      
      const daysInMonth = monthEnd.getDate();
      let daysInClass = daysInMonth;
      
      // Handle prorated first month
      if (checkYear === studentStartDate.getFullYear() && 
          checkMonth - 1 === studentStartDate.getMonth()) {
        const startDate = new Date(studentStartDate);
        startDate.setHours(0, 0, 0, 0);
        monthEnd.setHours(23, 59, 59, 999);
        daysInClass = Math.min(
          differenceInDays(monthEnd, startDate) + 1,
          daysInMonth
        );
      }
      
      // Expected can have cents, but months_table.paid_amount is integer.
      // Round to nearest integer so comparisons are consistent.
      const expected = (Number(student.classfee) * daysInClass) / daysInMonth;
      return Math.round(expected);
    };

    // Helper function to check if a month is fully covered
    const isMonthFullyCovered = (monthStr: string, payments: any[]): boolean => {
      const monthPayments = payments.filter(p => p.month === monthStr);
      
      // Check for full prize (free month)
      const hasFullPrize = monthPayments.some(p => p.payment_type === "free");
      if (hasFullPrize) return true;
      
      // Check if partial prize + remaining payment covers the month
      const hasPartialPrize = monthPayments.some(p => p.payment_type === "prizepartial");
      const hasRemainingPayment = monthPayments.some(p => p.payment_type === "partial" || p.payment_type === "full");
      if (hasPartialPrize && hasRemainingPayment) return true;
      
      // Check if total payments meet expected amount
      const totalPaid = monthPayments.reduce((sum, p) => sum + Number(p.paid_amount), 0);
      const expectedAmountInt = calculateExpectedAmount(monthStr);
      
      return totalPaid >= expectedAmountInt;
    };

    // Get all months that need to be checked
    const monthsToCheck = [] as string[];
    let checkDate = baselineStartMonth
      ? new Date(
          parseInt(baselineStartMonth.split("-")[0]),
          parseInt(baselineStartMonth.split("-")[1]) - 1,
          1
        )
      : new Date(studentStartDate.getFullYear(), studentStartDate.getMonth(), 1);
    
    while (checkDate < currentMonthDate) {
      const monthStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}`;
      monthsToCheck.push(monthStr);
      checkDate.setMonth(checkDate.getMonth() + 1);
    }

    // Enhanced validation with better error messages
    if (!(canOverrideChecks && ignoreHistoricalUnpaid === true)) {
      const unpaidMonths = [];
      
      for (const monthToCheck of monthsToCheck) {
        const expectedAmount = calculateExpectedAmount(monthToCheck);
        
        // Skip months with no expected payment
        if (expectedAmount === 0) continue;
        
        // Allow prize and partial payments to bypass sequential checks
        if (["prizepartial", "free", "partial"].includes(payment_type) && 
            monthToCheck === normalizedMonth) {
          continue;
        }
        
        if (!isMonthFullyCovered(monthToCheck, allPayments)) {
          unpaidMonths.push({
            month: monthToCheck,
            expected: expectedAmount,
            paid: allPayments
              .filter(p => p.month === monthToCheck)
              .reduce((sum, p) => sum + Number(p.paid_amount), 0)
          });
        }
      }
      
      if (unpaidMonths.length > 0 && !["prizepartial", "free"].includes(payment_type)) {
        const firstUnpaid = unpaidMonths[0];
        return NextResponse.json(
          {
            error: `Previous month ${firstUnpaid.month} is not fully paid (${firstUnpaid.paid.toFixed(2)}/${firstUnpaid.expected.toFixed(2)}). Please complete previous months first or add a prize/partial payment.`,
            unpaidMonths: unpaidMonths.map(m => ({
              month: m.month,
              shortfall: (m.expected - m.paid).toFixed(2)
            }))
          },
          { status: 400 }
        );
      }
    }

    // Check if payment already exists for this month
    const existingPayments = allPayments.filter(
      (p) => p.month === normalizedMonth
    );

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
        studentid: parseInt(studentId),
        payment_type: "prizepartial",
      },
    });

    // Calculate total paid amount for this month
    const totalPaid = existingPayments.reduce((sum, payment) => {
      return sum + Number(payment.paid_amount);
    }, 0);

    // Calculate expected amount for this month (rounded to integer to match storage)
    let expectedAmount = Math.round(Number(student.classfee || 0));

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

      const expectedProrated = (Number(student.classfee || 0) * daysFromStart) / daysInMonth;
      expectedAmount = Math.round(expectedProrated);
    }

    // Add the new payment amount
    // Coerce to integer (months_table.paid_amount is Int)
    const paidAmountNumber =
      typeof paidAmount === "string" ? parseFloat(paidAmount) : paidAmount;
    const paidAmountInt =
      payment_type === "free" ? 0 : Math.round(Number(paidAmountNumber));
    const finalPaidAmount = paidAmountInt;
    const newTotal = totalPaid + finalPaidAmount;

    // Skip exceeding check for free payments, allow paidAmount: 0
    if (payment_type !== "free" && newTotal > expectedAmount) {
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

    // Create the monthly payment record and controller earning in a transaction
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

    // Check if controllerEarning table exists (production DB may not have it)
    let controllerEarningTableExists = false;
    try {
      const rows = (await prisma.$queryRaw`
        SELECT COUNT(*) as cnt
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = 'controllerEarning'
      `) as Array<{ cnt: bigint | number }>;
      const cnt = rows && rows.length > 0 ? Number((rows[0] as any).cnt) : 0;
      controllerEarningTableExists = cnt > 0;
    } catch {
      controllerEarningTableExists = false;
    }

    const result = await prisma.$transaction(async (tx) => {
      const monthlyPayment = await tx.months_table.create({
        data: {
          studentid: parseInt(studentId),
          month: normalizedMonth,
          paid_amount: finalPaidAmount,
          payment_status: paymentStatus,
          payment_type: payment_type,
          start_date: startDate,
          end_date: endDate,
          is_free_month: payment_type === "free" ? true : false,
          free_month_reason: payment_type === "free" ? free_month_reason : null,
        },
      });

      if (
        controllerEarningTableExists &&
        paymentStatus === "Paid" &&
        student.u_control &&
        Number(finalPaidAmount) > 0 &&
        ["full", "partial", "prizepartial"].includes(payment_type)
      ) {
        try {
          // Ensure one earning per monthly payment id
          const existingEarning = await tx.controllerearning.findFirst({
            where: { paymentId: monthlyPayment.id },
          });
          if (!existingEarning) {
            await tx.controllerearning.create({
              data: {
                controllerUsername: student.u_control,
                studentId: parseInt(studentId),
                paymentId: monthlyPayment.id,
                amount: (Number(finalPaidAmount) * 0.1).toFixed(2), // 10% commission
              },
            });
          }
        } catch {
          // If table disappears or fails mid-transaction, skip earning creation
        }
      }

      return monthlyPayment;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Monthly payment POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
