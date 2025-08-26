import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getToken } from "next-auth/jwt";

const prisma = new PrismaClient();

// GET all payments with filtering
export async function GET(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";
    const searchQuery = searchParams.get("search") || "";
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }
    if (searchQuery) {
      whereClause.OR = [
        { studentname: { contains: searchQuery } },
        { transactionid: { contains: searchQuery } },
      ];
    }
    // Date range filter
    if (startDateStr || endDateStr) {
      whereClause.paymentdate = {};
      if (startDateStr) {
        const sd = new Date(startDateStr);
        if (!isNaN(sd.getTime())) (whereClause.paymentdate as any).gte = sd;
      }
      if (endDateStr) {
        const ed = new Date(endDateStr);
        if (!isNaN(ed.getTime())) (whereClause.paymentdate as any).lte = ed;
      }
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      orderBy: {
        paymentdate: "desc",
      },
    });
    // Map DB records to include derived sendername for frontend compatibility
    const mapped = payments.map((p) => ({
      ...p,
      sendername: p.studentname || "Unknown",
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Payment fetch error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// PUT to update a payment status
export async function PUT(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: "Payment ID and status are required" },
        { status: 400 }
      );
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: Number(id) },
      data: { status },
    });

    return NextResponse.json(updatedPayment);
  } catch (error) {
    console.error("Payment update error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
