import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || session.role !== "controller") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current month start and end dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get deposits for students under this controller for current month
    const deposits = await prisma.payment.findMany({
      where: {
        paymentdate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        wpos_wpdatatable_23: {
          u_control: session.code as string,
        },
      },
      select: {
        studentid: true,
        studentname: true,
        paymentdate: true,
        transactionid: true,
        paidamount: true,
        reason: true,
        status: true,
      },
      orderBy: {
        paymentdate: "desc",
      },
    });

    // Transform the data to match the expected format
    const transformedDeposits = deposits.map((deposit, index) => ({
      id: index + 1,
      studentid: deposit.studentid,
      studentname: deposit.studentname,
      paymentdate: deposit.paymentdate.toISOString(),
      transactionid: deposit.transactionid,
      paidamount: Number(deposit.paidamount),
      reason: deposit.reason,
      status: deposit.status,
    }));

    return NextResponse.json({
      deposits: transformedDeposits,
      month: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
    });
  } catch (error) {
    console.error("Controller deposits API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}