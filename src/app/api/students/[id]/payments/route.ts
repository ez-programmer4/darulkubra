import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { differenceInDays } from "date-fns";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const studentId = parseInt(params.id);
    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: "Invalid student ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { months, amount, transactionId } = body;

    if (!months || !Array.isArray(months) || months.length === 0 || !amount || !transactionId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate and normalize months
    const normalizedMonths = [];
    for (const month of months) {
      const monthMatch = String(month).match(/^(\d{4})-(\d{1,2})$/);
      if (!monthMatch) {
        return NextResponse.json(
          { error: `Invalid month format: ${month}. Use YYYY-MM` },
          { status: 400 }
        );
      }
      const year = monthMatch[1];
      const monthNum = String(parseInt(monthMatch[2], 10)).padStart(2, "0");
      normalizedMonths.push(`${year}-${monthNum}`);
    }

    // Get student information
    const student = await prisma.wpos_wpdatatable_23.findUnique({
      where: { wdt_ID: studentId },
      select: {
        wdt_ID: true,
        name: true,
        classfee: true,
        startdate: true,
        u_control: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Check authorization for controller role
    if (session.role === "controller" && student.u_control !== session.code) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    if (!student.classfee || !student.startdate) {
      return NextResponse.json(
        { error: "Student missing required information" },
        { status: 400 }
      );
    }

    // Get existing payments for all selected months
    const existingPayments = await prisma.months_table.findMany({
      where: {
        studentid: studentId,
        month: { in: normalizedMonths },
      },
    });

    // Check for months already covered by free payments
    const freeMonths = existingPayments
      .filter(payment => payment.payment_type === "free")
      .map(payment => payment.month);
    
    if (freeMonths.length > 0) {
      return NextResponse.json(
        { error: `These months are already covered by prizes: ${freeMonths.join(", ")}` },
        { status: 400 }
      );
    }

    // Calculate expected amounts and existing payments for each month
    const studentStartDate = new Date(student.startdate);
    const monthlyFee = Number(student.classfee);
    const totalPaidAmount = Number(amount);
    
    let totalExpectedAmount = 0;
    let totalAlreadyPaid = 0;
    const monthDetails: {
      month: string;
      expectedAmount: number;
      alreadyPaid: number;
      remaining: number;
    }[] = [];
    
    for (const month of normalizedMonths) {
      const [year, monthNum] = month.split("-").map(Number);
      
      // Calculate expected amount for this month
      let expectedAmount = monthlyFee;
      
      // If this is the student's start month, calculate prorated amount
      if (
        year === studentStartDate.getFullYear() &&
        monthNum - 1 === studentStartDate.getMonth()
      ) {
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        const monthEnd = new Date(year, monthNum, 0);
        monthEnd.setHours(23, 59, 59, 999);
        
        const startDate = new Date(studentStartDate);
        startDate.setHours(0, 0, 0, 0);
        
        const daysFromStart = Math.min(
          differenceInDays(monthEnd, startDate) + 1,
          daysInMonth
        );
        
        expectedAmount = monthlyFee * (daysFromStart / daysInMonth);
        expectedAmount = Number(expectedAmount.toFixed(2));
      }
      
      // Calculate already paid for this month
      const monthPayments = existingPayments.filter(p => p.month === month);
      const alreadyPaid = monthPayments.reduce((sum, p) => sum + Number(p.paid_amount), 0);
      
      totalExpectedAmount += expectedAmount;
      totalAlreadyPaid += alreadyPaid;
      
      monthDetails.push({
        month,
        expectedAmount,
        alreadyPaid,
        remaining: Math.max(0, expectedAmount - alreadyPaid)
      });
    }
    
    const totalRemaining = Math.max(0, totalExpectedAmount - totalAlreadyPaid);
    
    // Check if payment exceeds remaining amount
    if (totalPaidAmount > totalRemaining + 0.01) {
      return NextResponse.json(
        {
          error: "Payment amount exceeds remaining amount for selected months",
          details: {
            totalExpected: totalExpectedAmount,
            totalAlreadyPaid,
            totalRemaining,
            paidAmount: totalPaidAmount,
            monthDetails
          },
        },
        { status: 400 }
      );
    }

    // Distribute payment across months proportionally
    const createdPayments: any[] = [];
    let remainingAmount = totalPaidAmount;
    
    await prisma.$transaction(async (tx) => {
      for (const detail of monthDetails) {
        if (remainingAmount <= 0) break;
        
        const monthPayment = Math.min(remainingAmount, detail.remaining);
        if (monthPayment <= 0) continue;
        
        const [year, monthNum] = detail.month.split("-").map(Number);
        const paymentType = monthPayment >= detail.remaining ? "full" : "partial";
        
        // Create payment dates
        const isFirstMonth =
          year === studentStartDate.getFullYear() &&
          monthNum - 1 === studentStartDate.getMonth();

        const startDate = isFirstMonth
          ? new Date(
              studentStartDate.getFullYear(),
              studentStartDate.getMonth(),
              studentStartDate.getDate(),
              0,
              0,
              0
            )
          : new Date(year, monthNum - 1, 1, 0, 0, 0);

        const endDate = new Date(year, monthNum, 0, 23, 59, 59);

        const payment = await tx.months_table.create({
          data: {
            studentid: studentId,
            month: detail.month,
            paid_amount: Math.round(monthPayment),
            payment_status: "pending",
            payment_type: paymentType,
            start_date: startDate,
            end_date: endDate,
          },
        });
        
        createdPayments.push(payment);
        remainingAmount -= monthPayment;
      }
    });

    // Return updated student data
    const updatedStudent = await prisma.wpos_wpdatatable_23.findUnique({
      where: { wdt_ID: studentId },
      include: {
        teacher: {
          select: { ustazname: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      payments: createdPayments,
      student: updatedStudent,
      message: `Payment for ${normalizedMonths.length} month(s) recorded successfully`,
      summary: {
        totalAmount: totalPaidAmount,
        monthsCount: normalizedMonths.length,
        paymentsCreated: createdPayments.length
      }
    });
  } catch (error) {
    console.error("Payment submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}