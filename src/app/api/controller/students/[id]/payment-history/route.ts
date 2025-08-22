import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || session.role !== "controller") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get controller's code from the session
    if (!session.code) {
      return NextResponse.json(
        { error: "Controller code not found" },
        { status: 404 }
      );
    }

    const studentId = parseInt(params.id, 10);
    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: "Invalid student ID" },
        { status: 400 }
      );
    }

    // Verify the student belongs to this controller
    const student = await prisma.wpos_wpdatatable_23.findFirst({
      where: {
        wdt_ID: studentId,
        u_control: session.code,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found or access denied" },
        { status: 404 }
      );
    }

    // Mock payment history data (replace with actual database query)
    const mockPaymentHistory = [
      {
        id: 1,
        studentid: studentId,
        month: "2025-01",
        paid_amount: student.classfee || 0,
        payment_status: "Paid",
        payment_type: "Paid",
        start_date: "2025-01-01",
        end_date: "2025-01-31",
      },
      {
        id: 2,
        studentid: studentId,
        month: "2025-02",
        paid_amount: student.classfee || 0,
        payment_status: "Paid",
        payment_type: "Paid",
        start_date: "2025-02-01",
        end_date: "2025-02-28",
      },
      {
        id: 3,
        studentid: studentId,
        month: "2025-03",
        paid_amount: student.classfee || 0,
        payment_status: "pending",
        payment_type: "Paid",
        start_date: "2025-03-01",
        end_date: "2025-03-31",
      },
    ];

    return NextResponse.json(mockPaymentHistory);
  } catch (error) {
    console.error("Error fetching payment history:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
