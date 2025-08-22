import { NextResponse } from "next/server";

// Define the MonthlyPayment interface (consistent with StudentList.tsx)
interface MonthlyPayment {
  id: number;
  studentid: number;
  month: string; // e.g., "2025-06"
  paid_amount: number;
  payment_status: string; // e.g., "paid", "rejected", "pending"
  payment_type: string; // e.g., "free", "paid"
  start_date: string | null; // e.g., "2025-06-01"
  end_date: string | null; // e.g., "2025-06-30"
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");

  // Validate studentId
  if (!studentId) {
    return NextResponse.json(
      { error: "Student ID is required" },
      { status: 400 }
    );
  }

  // Convert studentId to number for consistency
  const id = parseInt(studentId, 10);

  // Mock data source (replace with your database query)
  const mockPaymentHistory: MonthlyPayment[] = [
    {
      id: 1,
      studentid: 11,
      month: "2025-06",
      paid_amount: 100.0,
      payment_status: "Paid",
      payment_type: "Paid",
      start_date: "2025-06-01",
      end_date: "2025-06-30",
    },
    // Add more mock data as needed
  ];

  // Filter payment history for the specific student
  const paymentHistory = mockPaymentHistory.filter(
    (payment) => payment.studentid === id
  );

  // If no payment history found, return 404
  if (paymentHistory.length === 0) {
    return NextResponse.json(
      { error: "Student not found or no payment history" },
      { status: 404 }
    );
  }

  // Return the payment history
  return NextResponse.json(paymentHistory);
}
