import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

// GET /api/payments?studentId=123&calculate=true
export async function GET(request: NextRequest) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const calculate = searchParams.get("calculate") === "true";

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    if (calculate) {
      // Get student's class fee
      const student = await prisma.wpos_wpdatatable_23.findUnique({
        where: { wdt_ID: parseInt(studentId) },
        select: { classfee: true },
      });

      if (!student || !student.classfee) {
        return NextResponse.json(
          { error: "Student not found or missing class fee" },
          { status: 404 }
        );
      }

      // Get all payments for this student
      const payments = await prisma.payment.findMany({
        where: {
          studentid: parseInt(studentId),
          status: "completed",
        },
        orderBy: {
          paymentdate: "desc",
        },
      });

      // Calculate totals
      const totalPaid = payments.reduce(
        (sum, payment) => sum + Number(payment.paidamount),
        0
      );
      const monthlyPayment = student.classfee;
      const remainingBalance = totalPaid % monthlyPayment;

      // Calculate next payment date and amount
      const lastPayment = payments[0];
      const nextPaymentDate = lastPayment
        ? new Date(lastPayment.paymentdate)
        : new Date();
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      const nextPaymentAmount = monthlyPayment - remainingBalance;

      return NextResponse.json({
        monthlyPayment,
        totalPaid,
        remainingBalance,
        nextPaymentDate,
        nextPaymentAmount,
        paymentCount: payments.length,
      });
    } else {
      // Regular payment fetching
      const payments = await prisma.payment.findMany({
        where: {
          studentid: parseInt(studentId),
        },
        orderBy: {
          paymentdate: "desc",
        },
      });

      return NextResponse.json({ payments });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/payments
export async function POST(request: NextRequest) {
  try {
    const session = (await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })) as any;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { studentId, amount, type, notes } = body;

    if (!studentId || !amount || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.create({
      data: {
        studentid: parseInt(studentId),
        paidamount: parseFloat(amount),
        reason: type,
        status: "completed",
        sendername: session.user.name,
        studentname: "", // This will be updated by a trigger
        paymentdate: new Date(),
        transactionid: Math.random().toString(36).substring(7),
      },
    });

    return NextResponse.json(payment);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT /api/payments/:id
export async function PUT(request: NextRequest) {
  try {
    const session = (await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })) as any;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Payment ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, notes } = body;

    const payment = await prisma.payment.update({
      where: {
        id: parseInt(id),
      },
      data: {
        status,
        reason: notes,
        sendername: session.user.name,
      },
    });

    return NextResponse.json(payment);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
