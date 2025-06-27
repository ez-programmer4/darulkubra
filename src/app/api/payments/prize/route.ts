import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    const prizes = await prisma.payment.findMany({
      where: {
        studentid: parseInt(studentId),
      },
      orderBy: {
        paymentdate: "desc",
      },
    });

    // Convert Decimal to number for paidamount
    const formattedPrizes = prizes.map((prize) => ({
      ...prize,
      paidamount: Number(prize.paidamount),
    }));

    return NextResponse.json(formattedPrizes);
  } catch (error) {
    console.error("Error fetching prizes:", error);
    return NextResponse.json(
      { error: "Failed to fetch prizes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      studentId,
      studentname,
      paidamount,
      reason,
      transactionid,
      sendername,
      paymentdate,
      status,
    } = body;

    if (
      !studentId ||
      !studentname ||
      !paidamount ||
      !reason ||
      !transactionid ||
      !sendername ||
      !paymentdate ||
      !status
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate status
    if (!["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json(
        {
          error: "Invalid status. Must be 'pending', 'approved', or 'rejected'",
        },
        { status: 400 }
      );
    }

    // Get the student to verify ownership
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

    // Create the prize payment
    const prize = await prisma.payment.create({
      data: {
        studentid: parseInt(studentId),
        studentname,
        paidamount,
        reason,
        transactionid,
        sendername,
        paymentdate: new Date(paymentdate),
        status,
      },
    });

    // Format the response
    const formattedPrize = {
      ...prize,
      paidamount: Number(prize.paidamount),
    };

    return NextResponse.json(formattedPrize);
  } catch (error) {
    console.error("Error creating prize payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
