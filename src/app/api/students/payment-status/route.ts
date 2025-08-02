import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering
export const dynamic = "force-dynamic";

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
      return NextResponse.json(
        { error: "Authentication required" },
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
        wdt_ID: parseInt(studentId),
      },
      select: {
        u_control: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Check if the student belongs to this controller
    if (student.u_control !== session.code) {
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
