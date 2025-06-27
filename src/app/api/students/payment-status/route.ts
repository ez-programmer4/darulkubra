import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/server-auth";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 401 }
      );
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
        id: parseInt(studentId),
      },
      select: {
        control: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Check if the student belongs to this controller
    if (student.control !== user.username) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    // Get the latest payment for this student
    const latestPayment = await prisma.months_table.findFirst({
      where: {
        studentid: parseInt(studentId),
      },
      orderBy: {
        start_date: "desc",
      },
    });

    // Get all payments for this student
    const allPayments = await prisma.months_table.findMany({
      where: {
        studentid: parseInt(studentId),
      },
      orderBy: {
        start_date: "desc",
      },
    });

    // Calculate total paid amount
    let totalPaid = 0;
    for (const payment of allPayments) {
      if (payment.paid_amount) {
        totalPaid += Number(payment.paid_amount);
      }
    }

    return NextResponse.json({
      latestPayment,
      totalPaid,
      paymentCount: allPayments.length,
    });
  } catch (error) {
    console.error("Error fetching payment status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
