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

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }
    if (searchQuery) {
      whereClause.OR = [
        { studentname: { contains: searchQuery } },
        { transactionid: { contains: searchQuery } },
        { sendername: { contains: searchQuery } },
      ];
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      orderBy: {
        paymentdate: "desc",
      },
    });

    return NextResponse.json(payments);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
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
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
