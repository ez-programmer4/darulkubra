import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { format, endOfMonth, differenceInDays } from "date-fns";

export async function POST(request: NextRequest) {
  const session = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { studentId } = body;

  if (!studentId) {
    return NextResponse.json(
      { error: "Student ID is required" },
      { status: 400 }
    );
  }

  // Get student information including registration date
  const student = await prisma.wpos_wpdatatable_23.findUnique({
    where: { wdt_ID: parseInt(studentId) },
    select: {
      wdt_ID: true,
      classfee: true,
      registrationdate: true,
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Get registration date
  if (!student.registrationdate) {
    return NextResponse.json(
      { error: "Student registration date not found" },
      { status: 400 }
    );
  }
  const registrationDate = new Date(student.registrationdate);
  const registrationMonth = format(registrationDate, "yyyy-MM");

  // Check if there's already a payment for the registration month
  const existingPayment = await prisma.months_table.findFirst({
    where: {
      studentid: parseInt(studentId),
      month: registrationMonth,
    },
  });

  // Calculate partial payment
  const startDate = registrationDate;
  const endDate = endOfMonth(registrationDate);
  const totalDays = differenceInDays(endDate, startDate) + 1;
  const monthlyFee = Number(student.classfee);
  const dailyRate = monthlyFee / 30; // Assuming 30 days in a month
  const partialAmount = Number((dailyRate * totalDays).toFixed(2));

  let paymentRecord;

  if (existingPayment) {
    // Update existing payment
    paymentRecord = await prisma.months_table.update({
      where: { id: existingPayment.id },
      data: {
        paid_amount: partialAmount,
        payment_status: "pending",
        payment_type: "partial",
        start_date: startDate,
        end_date: endDate,
      },
    });
  } else {
    // Create new payment record
    paymentRecord = await prisma.months_table.create({
      data: {
        studentid: parseInt(studentId),
        month: registrationMonth,
        paid_amount: partialAmount,
        payment_status: "pending",
        payment_type: "partial",
        start_date: startDate,
        end_date: endDate,
      },
    });
  }

  return NextResponse.json({
    ...paymentRecord,
    calculatedAmount: partialAmount,
    daysInMonth: totalDays,
    dailyRate: dailyRate,
  });
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

    const partialPayments = await prisma.months_table.findMany({
      where: {
        studentid: parseInt(studentId),
        payment_type: "partial",
      },
      select: {
        id: true,
        studentid: true,
        month: true,
        paid_amount: true,
        payment_status: true,
        start_date: true,
        end_date: true,
      },
      orderBy: { month: "desc" },
    });

    return NextResponse.json(partialPayments);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
