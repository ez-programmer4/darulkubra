import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { Prisma } from "@prisma/client";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

interface Payment {
  id: number;
  studentid: number;
  studentname: string;
  paidamount: Decimal;
  reason: string;
  transactionid: string;
  sendername: string;
  paymentdate: Date;
  status: string;
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

    const parsedStudentId = parseInt(studentId);
    if (isNaN(parsedStudentId)) {
      return NextResponse.json(
        { error: "Invalid student ID format" },
        { status: 400 }
      );
    }

    // First, let's check if we can find any payments for this student
    const allPayments = await prisma.payment.findMany({
      where: {
        studentid: parsedStudentId,
      },
      select: {
        id: true,
        studentid: true,
        studentname: true,
        paidamount: true,
        reason: true,
        transactionid: true,
        sendername: true,
        paymentdate: true,
        status: true,
      },
    });

    console.log("All payments found:", allPayments.length);
    // Now get deposits specifically, but first check all reasons
    const uniqueReasons = [...new Set(allPayments.map((p) => p.reason))];
    // Get deposits with any reason that might indicate a deposit
    const deposits = await prisma.payment.findMany({
      where: {
        studentid: parsedStudentId,
        OR: [
          { reason: "deposit" },
          { reason: "Deposit" },
          { reason: "DEPOSIT" },
          { reason: { contains: "deposit" } },
          { reason: { contains: "Deposit" } },
          { reason: { contains: "DEPOSIT" } },
          { reason: { contains: "dep" } },
          { reason: { contains: "Dep" } },
        ],
      },
      select: {
        id: true,
        studentid: true,
        studentname: true,
        paidamount: true,
        reason: true,
        transactionid: true,
        sendername: true,
        paymentdate: true,
        status: true,
      },
      orderBy: {
        paymentdate: "desc",
      },
    });

    console.log("Deposits found:", deposits.length);
    // If we still don't find any deposits, let's try a more direct query
    if (deposits.length === 0) {
      const directDeposits = await prisma.payment.findMany({
        where: {
          studentid: parsedStudentId,
          status: "approved", // Only get approved deposits
        },
        select: {
          id: true,
          studentid: true,
          studentname: true,
          paidamount: true,
          reason: true,
          transactionid: true,
          sendername: true,
          paymentdate: true,
          status: true,
        },
        orderBy: {
          paymentdate: "desc",
        },
      });

      console.log("Direct deposits found:", directDeposits.length);
      // Use the direct query results as deposits
      const formattedDeposits = directDeposits.map((deposit) => {
        const formatted = {
          id: deposit.id,
          studentid: deposit.studentid,
          studentname: deposit.studentname,
          amount: Number(deposit.paidamount),
          reason: deposit.reason,
          transaction_id: deposit.transactionid,
          sender_name: deposit.sendername,
          payment_date: deposit.paymentdate,
          status: deposit.status || "pending",
        };
        return formatted;
      });

      console.log("Formatted deposits:", formattedDeposits.length);
      return NextResponse.json(formattedDeposits);
    }

    // Convert Decimal to number for amount
    const formattedDeposits = deposits.map((deposit) => ({
      id: deposit.id,
      studentid: deposit.studentid,
      studentname: deposit.studentname,
      paidamount: Number(deposit.paidamount),
      reason: deposit.reason,
      transactionid: deposit.transactionid,
      sendername: deposit.sendername,
      paymentdate: deposit.paymentdate,
      status: deposit.status || "pending",
    }));

    console.log("Final formatted deposits:", formattedDeposits.length);
    return NextResponse.json(formattedDeposits);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch deposits" },
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
      amount,
      status = "pending",
      reason,
      transactionId,
    } = body;

    if (!studentId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["pending", "approved"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'pending' or 'approved'" },
        { status: 400 }
      );
    }

    try {
      // Get the student to verify ownership
      const student = await prisma.wpos_wpdatatable_23.findUnique({
        where: { wdt_ID: parseInt(studentId) },
        select: { u_control: true, name: true },
      });

      if (!student) {
        return NextResponse.json(
          { error: "Student not found" },
          { status: 404 }
        );
      }

      // Check if the student belongs to this controller
      if (student.u_control !== session.code) {
        return NextResponse.json(
          { error: "You are not authorized to add deposits for this student" },
          { status: 403 }
        );
      }

      // Create the deposit payment
      const deposit = await prisma.payment.create({
        data: {
          studentid: parseInt(studentId),
          studentname: student.name ?? "",
          paidamount: new Prisma.Decimal(amount),
          reason: reason || "deposit",
          paymentdate: new Date(),
          transactionid: transactionId || `DEP-${Date.now()}`,
          status: status || "pending",
          sendername: session.username,
        },
      });

      console.log("Deposit created:", deposit.id);
      // Format the response to match the expected format
      const formattedDeposit = {
        ...deposit,
        paidamount: Number(deposit.paidamount),
      };

      return NextResponse.json(formattedDeposit);
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to create deposit" },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Add new endpoint for approving/rejecting deposits
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { paymentId, status, reason } = body;

    if (!paymentId || !status) {
      return NextResponse.json(
        { error: "Payment ID and status are required" },
        { status: 400 }
      );
    }

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    // Update the payment status
    const updatedPayment = await prisma.payment.update({
      where: {
        id: paymentId,
      },
      data: {
        status,
        reason: reason || "No reason provided",
      },
    });

    // Format the response to match the expected format
    const formattedPayment = {
      ...updatedPayment,
      paidamount: Number(updatedPayment.paidamount),
    };

    return NextResponse.json(formattedPayment);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
