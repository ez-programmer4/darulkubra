import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || session.role !== "registral") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month =
      searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const registralName = session.name || session.username; // Get current registral's name

    // Convert month to start and end dates
    const [year, monthNum] = month.split("-");
    const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59);

    // Get registrations for this specific registral (only students with no referral)
    const registrations = await prisma.wpos_wpdatatable_23.findMany({
      select: {
        wdt_ID: true,
        rigistral: true,
        status: true,
        subject: true,
        registrationdate: true,
        startdate: true,
      },
      where: {
        rigistral: registralName,
        OR: [{ refer: null }, { refer: "" }],
      },
    });

    // Get payment data
    const payments = await prisma.months_table.findMany({
      select: {
        studentid: true,
        month: true,
        payment_status: true,
      },
      where: {
        payment_status: "Paid",
      },
    });

    // Create payment lookup
    const paymentLookup = new Map();
    payments.forEach((payment) => {
      if (!paymentLookup.has(payment.studentid)) {
        paymentLookup.set(payment.studentid, []);
      }
      paymentLookup.get(payment.studentid).push(payment);
    });

    // Calculate earnings for this registral
    const stats = {
      registral: registralName,
      totalReg: 0,
      successReg: 0,
      reading: 0,
      hifz: 0,
      notSuccess: 0,
      reward: 0,
      level: null as string | null,
    };

    registrations.forEach((reg) => {
      // Check if registration is in the selected month
      const regDate = reg.registrationdate
        ? new Date(reg.registrationdate)
        : null;
      const startDateReg = reg.startdate ? new Date(reg.startdate) : null;

      const isRegInMonth =
        regDate && regDate >= startDate && regDate <= endDate;
      const isStartInMonth =
        startDateReg && startDateReg >= startDate && startDateReg <= endDate;

      // Total registrations in month with specific statuses
      if (
        isRegInMonth &&
        reg.status &&
        ["Active", "Not yet", "Not Succeed"].includes(reg.status)
      ) {
        stats.totalReg++;
      }

      // Not success count
      if (isRegInMonth && reg.status === "Not Succeed") {
        stats.notSuccess++;
      }

      // Success registrations (started and paid in same month)
      if (
        isStartInMonth &&
        reg.status &&
        ["Active", "Not yet"].includes(reg.status)
      ) {
        const studentPayments = paymentLookup.get(reg.wdt_ID) || [];
        const hasPaymentInMonth = studentPayments.some((payment: any) => {
          const paymentDate = new Date(payment.month);
          return paymentDate >= startDate && paymentDate <= endDate;
        });

        if (hasPaymentInMonth) {
          stats.successReg++;

          // Calculate reading and hifz
          if (reg.subject && ["Nethor", "Qaidah"].includes(reg.subject)) {
            stats.reading++;
          } else if (reg.subject === "Hifz") {
            stats.hifz++;
          }
        }
      }
    });

    // Calculate reward
    stats.reward = stats.reading * 50 + stats.hifz * 100;

    // Determine level
    if (registralName === "Abdulrahim") {
      stats.level = "Level 1";
    } else if (registralName !== "Unsigned") {
      stats.level = "Level 2";
    }

    return NextResponse.json({
      earnings: stats.totalReg > 0 || stats.successReg > 0 ? stats : null,
      month,
    });
  } catch (error) {
    console.error("Error fetching registral earnings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
