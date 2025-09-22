import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { format, addDays, isWithinInterval } from "date-fns";

// Helper function to check if a student is scheduled for a specific day
async function checkIfStudentScheduledForDay(
  studentId: number,
  dayOfWeek: number
): Promise<boolean> {
  // Check if student has any scheduled time for this day of week
  const schedule = await prisma.wpos_ustaz_occupied_times.findFirst({
    where: {
      student_id: studentId,
      // Assuming daypackage contains the day name (e.g., "Monday")
      daypackage: {
        contains: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
        // Remove mode as it's not supported in the current Prisma version
      }
    }
  });
  
  return !!schedule;
}

// Payment integration function
async function processPayment(
  teacherId: string,
  amount: number,
  period: string
) {
  try {
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
      select: { ustazname: true, phone: true },
    });

    if (!teacher) throw new Error("Teacher not found");

    // Call external payment API
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
    console.error("Payment processing error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Payment failed",
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const teacherId = url.searchParams.get("teacherId");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required parameters: startDate and endDate" },
        { status: 400 }
      );
    }

    if (!teacherId) {
      return NextResponse.json({
        latenessRecords: [],
        absenceRecords: [],
        bonusRecords: [],
      });
    }

    const fromDate = new Date(startDate);
    const toDate = new Date(endDate);

    // Get package-specific deduction configurations
    const packageDeductions = await prisma.packageDeduction.findMany();
    const packageDeductionMap: Record<string, { lateness: number; absence: number }> = packageDeductions.reduce((acc, pkg) => ({
      ...acc,
      [pkg.packageName]: {
        lateness: Number(pkg.latenessBaseAmount) || 30,
        absence: Number(pkg.absenceBaseAmount) || 25,
      },
    }), {} as Record<string, { lateness: number; absence: number }>);

    // Fetch lateness deduction config from DB
    const latenessConfigs = await prisma.latenessdeductionconfig.findMany({
      orderBy: [{ tier: "asc" }, { startMinute: "asc" }],
    });

    if (latenessConfigs.length === 0) {
      return NextResponse.json({
        latenessRecords: [],
        absenceRecords: [],
        bonusRecords: [],
      });
    }

    const excusedThreshold = Math.min(
      ...latenessConfigs.map((c) => c.excusedThreshold ?? 0)
    );

    const tiers = latenessConfigs.map((c) => ({
      start: c.startMinute,
      end: c.endMinute,
      percent: c.deductionPercent,
      excusedThreshold: c.excusedThreshold,
    }));

    const maxTierEnd = Math.max(...tiers.map((t) => t.end));

    // Process each day in the date range
    const processedDays = [];
    const currentDate = new Date(fromDate);
    
    while (currentDate <= toDate) {
      processedDays.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get absence records from database
    const absenceRecords = await prisma.absencerecord.findMany({
      where: {
        teacherId,
        classDate: { gte: fromDate, lte: toDate },
      },
      orderBy: { classDate: "asc" },
    });

    // Process lateness for each day
    const latenessRecords = [];
    
    for (const date of processedDays) {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Get students with zoom links for this day
      const dayStudents = await prisma.wpos_wpdatatable_23.findMany({
      where: { 
        ustaz: teacherId,
        status: { in: ["active", "Active", "Not yet", "not yet"] },
        zoom_links: {
          some: {
            sent_time: {
              gte: new Date(`${dateStr}T00:00:00.000Z`),
              lt: new Date(`${dateStr}T23:59:59.999Z`)
            }
          }
        }
      },
      include: {
        zoom_links: {
          where: {
            sent_time: {
              gte: new Date(`${dateStr}T00:00:00.000Z`),
              lt: new Date(`${dateStr}T23:59:59.999Z`)
            }
          },
          orderBy: { sent_time: 'asc' }
        },
        occupiedTimes: true
      }
    } as const);

      for (const student of dayStudents) {
        const timeSlot = student.occupiedTimes?.[0]?.time_slot;
        if (!timeSlot) continue;

        const [startTimeStr] = timeSlot.split('-').map(s => s.trim());
        const [hours, minutes] = startTimeStr.split(':').map(Number);
        const scheduledTime = new Date(date);
        scheduledTime.setHours(hours, minutes, 0, 0);

        const actualStartTime = student.zoom_links[0]?.sent_time;
        if (!actualStartTime) continue;

        const latenessMinutes = Math.max(
          0,
          Math.round(
            (actualStartTime.getTime() - scheduledTime.getTime()) / 60000
          )
        );

        // Skip if not late or within excused threshold
        if (latenessMinutes <= excusedThreshold) continue;

        // Calculate lateness deduction
        const studentPackage = student.package || "";
        const baseDeductionAmount =
          packageDeductionMap[studentPackage]?.lateness || 30;

        let deductionApplied = 0;
        let deductionTier = "Excused";
        let isWaived = false;

        const tier = tiers.find(t => 
          latenessMinutes >= t.start && latenessMinutes <= t.end
        );

        if (tier) {
          deductionApplied = baseDeductionAmount * (tier.percent / 100);
          deductionTier = `Tier (${tier.percent}%) - ${studentPackage}`;
        } else if (latenessMinutes > maxTierEnd) {
          deductionApplied = baseDeductionAmount;
          deductionTier = `> Max Tier - ${studentPackage}`;
        }

        // Check for waiver
        try {
          const { isDeductionWaived } = await import("@/lib/deduction-waivers");
          isWaived = await isDeductionWaived(
            teacherId,
            scheduledTime,
            "lateness"
          );
          if (isWaived) {
            deductionApplied = 0;
            deductionTier = `${deductionTier} (WAIVED)`;
          }
        } catch (error) {
          console.error("Error checking waiver:", error);
        }

        latenessRecords.push({
          studentId: student.wdt_ID,
          studentName: student.name,
          classDate: new Date(date),
          scheduledTime,
          actualStartTime,
          latenessMinutes,
          deductionApplied,
          deductionTier,
          isWaived,
          package: studentPackage
        });
      }
    }

    // Get bonus records
    const bonusRecords = await prisma.bonusrecord.findMany({
      where: {
        teacherId,
        createdAt: { gte: fromDate, lte: toDate },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      latenessRecords,
      absenceRecords,
      bonusRecords,
    });

  } catch (error) {
    console.error("Error in teacher payments API:", error);
    return NextResponse.json({
      latenessRecords: [],
      absenceRecords: [],
      bonusRecords: [],
      error: "Internal server error"
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { teacherId, amount, period } = await req.json();
    
    if (!teacherId || !amount || !period) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const paymentResult = await processPayment(teacherId, amount, period);

    if (!paymentResult.success) {
      return NextResponse.json(
        { error: paymentResult.error || "Payment failed" },
        { status: 500 }
      );
    }

    // Record the payment in the database using teachersalarypayment model
    await prisma.teachersalarypayment.create({
      data: {
        teacherId,
        period,
        totalSalary: amount,
        status: paymentResult.status,
        paidAt: new Date(),
        latenessDeduction: 0, // These should be calculated based on the payment period
        absenceDeduction: 0,  // These should be calculated based on the payment period
        bonuses: 0,           // These should be calculated based on the payment period
      },
    });

    return NextResponse.json({
      success: true,
      transactionId: paymentResult.transactionId,
      status: paymentResult.status,
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 }
    );
  }
}
