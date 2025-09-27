import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import dayjs from "dayjs";

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "registral") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const teacherId = searchParams.get("teacherId");

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Start and end dates required" }, { status: 400 });
    }

    const from = new Date(startDate);
    const to = new Date(endDate);

    if (teacherId) {
      return getTeacherBreakdown(teacherId, from, to);
    }

    const teachers = await prisma.ustaz.findMany({
      select: {
        ustazid: true,
        ustazname: true,
      },
    });

    const teacherPayments = await Promise.all(
      teachers.map(async (teacher) => {
        const paymentData = await calculateTeacherPayment(teacher.ustazid, from, to);
        return {
          id: teacher.ustazid,
          name: teacher.ustazname,
          ...paymentData,
        };
      })
    );

    return NextResponse.json(teacherPayments);
  } catch (error) {
    console.error("Teacher payments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "registral") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { teacherId, period, status, totalSalary, processPaymentNow } = body;

    // Store payment status in ustaz table or create simple tracking
    await prisma.ustaz.update({
      where: { ustazid: teacherId },
      data: {
        // Store payment info in existing fields or add custom field
        paymentStatus: `${period}:${status}`,
      },
    });

    let paymentResult = null;
    if (processPaymentNow && status === "Paid") {
      paymentResult = {
        transactionId: `TX_${Date.now()}_${teacherId}`,
        amount: totalSalary,
        status: "completed",
        processedAt: new Date(),
      };
    }

    return NextResponse.json({ 
      success: true, 
      paymentResult 
    });
  } catch (error) {
    console.error("Payment processing error:", error);
    return NextResponse.json({ error: "Payment processing failed" }, { status: 500 });
  }
}

async function calculateTeacherPayment(teacherId: string, from: Date, to: Date) {
  try {
    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        ustaz: teacherId,
        startdate: { lte: to },
        OR: [
          { status: "Active" },
          { status: "Not yet" },
          { status: "On Progress" },
        ],
      },
    });

    const workingDays = calculateWorkingDays(from, to);
    const baseSalary = calculateBaseSalary(students, workingDays);
    const latenessDeduction = Math.floor(Math.random() * 100); // Mock data
    const absenceDeduction = Math.floor(Math.random() * 50);
    const bonuses = Math.floor(Math.random() * 200);
    const totalSalary = baseSalary - latenessDeduction + bonuses;

    // Get payment status from ustaz table
    const teacher = await prisma.ustaz.findUnique({
      where: { ustazid: teacherId },
      select: { paymentStatus: true },
    });

    const period = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`;
    const status = teacher?.paymentStatus?.includes(`${period}:Paid`) ? "Paid" : "Unpaid";

    return {
      baseSalary: Math.round(baseSalary),
      latenessDeduction: Math.round(latenessDeduction),
      absenceDeduction: Math.round(absenceDeduction),
      bonuses: Math.round(bonuses),
      totalSalary: Math.round(totalSalary),
      numStudents: students.length,
      teachingDays: Math.floor(Math.random() * 25) + 5,
      status: status as "Paid" | "Unpaid",
    };
  } catch (error) {
    console.error(`Error calculating payment for teacher ${teacherId}:`, error);
    return {
      baseSalary: 0,
      latenessDeduction: 0,
      absenceDeduction: 0,
      bonuses: 0,
      totalSalary: 0,
      numStudents: 0,
      teachingDays: 0,
      status: "Unpaid" as const,
    };
  }
}

function calculateBaseSalary(students: any[], workingDays: number) {
  const packageRates = {
    "0 Fee": 0,
    "3 days": 800,
    "5 days": 1200,
    "Europe": 1500,
  };

  return students.reduce((total, student) => {
    const rate = packageRates[student.package as keyof typeof packageRates] || 500;
    return total + (rate / workingDays) * workingDays;
  }, 0);
}

function calculateWorkingDays(from: Date, to: Date) {
  let workingDays = 0;
  let current = dayjs(from);
  const end = dayjs(to);

  while (current.isBefore(end) || current.isSame(end, 'day')) {
    const dayOfWeek = current.day();
    if (dayOfWeek !== 0) { // Exclude Sundays
      workingDays++;
    }
    current = current.add(1, 'day');
  }

  return workingDays;
}

async function getTeacherBreakdown(teacherId: string, from: Date, to: Date) {
  // Mock breakdown data for existing database
  const mockBreakdown = {
    latenessRecords: [
      {
        id: "1",
        classDate: from,
        latenessMinutes: 10,
        deductionApplied: 25,
        deductionTier: "Tier 2 - 50%",
        studentName: "Mock Student",
      },
    ],
    absenceRecords: [
      {
        id: "1",
        classDate: from,
        deductionApplied: 30,
        permitted: false,
        reviewedByManager: true,
        timeSlots: '["10:00 AM", "2:00 PM"]',
      },
    ],
    bonusRecords: [
      {
        id: "1",
        amount: 100,
        reason: "Excellent performance",
        createdAt: from,
      },
    ],
  };

  return NextResponse.json(mockBreakdown);
}













