import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  createSalaryCalculator,
  SalaryCalculator,
} from "@/lib/salary-calculator";
import { format, parseISO } from "date-fns";
import {
  getCachedCalculator,
  setCachedCalculator,
} from "@/lib/calculator-cache";

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 10;

  const record = requestCounts.get(ip);
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

async function getSalaryCalculator(): Promise<SalaryCalculator> {
  const cacheKey = "teacher-payments";

  let calculator = getCachedCalculator(cacheKey);
  if (!calculator) {
    calculator = await createSalaryCalculator();
    setCachedCalculator(cacheKey, calculator);
  }

  return calculator;
}

export async function GET(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const teacherId = url.searchParams.get("teacherId");
    const details = url.searchParams.get("details") === "true";

    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing startDate or endDate" },
        { status: 400 }
      );
    }

    // Parse and validate dates
    const from = parseISO(startDate);
    const to = parseISO(endDate);

    console.log(
      `🔍 API Route - Parsed dates: from=${from.toISOString()}, to=${to.toISOString()}`
    );
    console.log(
      `🔍 API Route - Input strings: startDate=${startDate}, endDate=${endDate}`
    );

    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
      return NextResponse.json(
        { error: "Invalid date range. Use UTC ISO format (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    const calculator = await getSalaryCalculator();

    // Handle detailed view for a specific teacher
    if (details && teacherId) {
      const details = await calculator.getTeacherSalaryDetails(
        teacherId,
        from,
        to
      );
      return NextResponse.json(details);
    }

    // Handle single teacher calculation
    if (teacherId) {
      const salary = await calculator.calculateTeacherSalary(
        teacherId,
        from,
        to
      );
      return NextResponse.json(salary);
    }

    // Handle all teachers calculation
    const salaries = await calculator.calculateAllTeacherSalaries(from, to);
    return NextResponse.json(salaries);
  } catch (error: any) {
    console.error("Error in teacher payments API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const {
      teacherId,
      period,
      status,
      totalSalary,
      latenessDeduction,
      absenceDeduction,
      bonuses,
      processPaymentNow = false,
    } = body;

    // Validate session
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate required fields
    if (!teacherId || !period || !status) {
      return NextResponse.json(
        { error: "Missing required fields: teacherId, period, status" },
        { status: 400 }
      );
    }

    // Validate payment processing
    if (processPaymentNow && status !== "Paid") {
      return NextResponse.json(
        { error: "Cannot process payment unless status is 'Paid'" },
        { status: 400 }
      );
    }

    if (processPaymentNow && totalSalary <= 0) {
      return NextResponse.json(
        { error: "Cannot process payment with non-positive totalSalary" },
        { status: 400 }
      );
    }

    // Process payment if requested
    let paymentResult = null;
    let transactionId = null;

    if (processPaymentNow && status === "Paid" && totalSalary > 0) {
      paymentResult = await processPayment(teacherId, totalSalary, period);
      if (!paymentResult.success) {
        return NextResponse.json(
          { error: `Payment failed: ${paymentResult.error}` },
          { status: 400 }
        );
      }
      transactionId = paymentResult.transactionId;
    }

    // Update or create payment record
    const { prisma } = await import("@/lib/prisma");
    const payment = await prisma.teachersalarypayment.upsert({
      where: {
        teacherId_period: { teacherId, period },
      },
      update: {
        status,
        paidAt: status === "Paid" ? new Date() : null,
        adminId: session.id || undefined,
        totalSalary,
        latenessDeduction,
        absenceDeduction,
        bonuses,
      },
      create: {
        teacherId,
        period,
        status,
        paidAt: status === "Paid" ? new Date() : null,
        adminId: session.id || undefined,
        totalSalary,
        latenessDeduction,
        absenceDeduction,
        bonuses,
      },
    });

    // Log the action
    await prisma.auditlog.create({
      data: {
        actionType: "teacher_salary_status_update",
        adminId: session.id || null,
        targetId: payment.id,
        details: JSON.stringify({
          teacherId,
          period,
          status,
          paymentProcessed: !!paymentResult?.success,
          transactionId,
        }),
      },
    });

    // Clear cache for this teacher
    const calculator = await getSalaryCalculator();
    calculator.clearCache();

    return NextResponse.json({
      success: true,
      payment,
      paymentResult: paymentResult?.success
        ? { transactionId, status: paymentResult.status }
        : null,
    });
  } catch (error: any) {
    console.error("Error updating salary status:", error);
    return NextResponse.json(
      {
        error: "Failed to update salary status",
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Payment processing function with retry logic
async function processPayment(
  teacherId: string,
  amount: number,
  period: string,
  retries = 3
): Promise<{
  success: boolean;
  transactionId?: string;
  status?: string;
  error?: string;
}> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { prisma } = await import("@/lib/prisma");

      const teacher = await prisma.wpos_wpdatatable_24.findUnique({
        where: { ustazid: teacherId },
        select: { ustazname: true, phone: true },
      });

      if (!teacher) throw new Error("Teacher not found");

      const paymentResponse = await fetch(process.env.PAYMENT_API_URL || "", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.PAYMENT_API_KEY}`,
        },
        body: JSON.stringify({
          recipient: {
            id: teacherId,
            name: teacher.ustazname,
            phone: teacher.phone,
            email: teacher.phone
              ? `${teacher.phone}@darulkubra.com`
              : `teacher_${teacherId}@darulkubra.com`,
          },
          amount: amount,
          currency: "ETB",
          reference: `salary_${teacherId}_${period}`,
          description: `Teacher salary payment for ${period}`,
        }),
      });

      const paymentResult = await paymentResponse.json();

      if (!paymentResponse.ok) {
        throw new Error(paymentResult.message || "Payment failed");
      }

      return {
        success: true,
        transactionId: paymentResult.transactionId,
        status: paymentResult.status,
      };
    } catch (error) {
      if (attempt === retries) {
        console.error(
          `Payment processing failed after ${retries} attempts:`,
          error
        );
        return {
          success: false,
          error: error instanceof Error ? error.message : "Payment failed",
        };
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  return { success: false, error: "Payment failed after retries" };
}
