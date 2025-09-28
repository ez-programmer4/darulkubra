import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Fallback secret for development if NEXTAUTH_SECRET is not set
    const secret =
      process.env.NEXTAUTH_SECRET || "fallback-secret-for-development";

    const session = await getToken({ req, secret });

    if (!session) {
      return NextResponse.json({ error: "No session token" }, { status: 401 });
    }

    if (session.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const hasDateFilter = startDate && endDate;

    // 1. Revenue Over Time (monthly)
    const revenueData = await prisma.payment.groupBy({
      by: ["paymentdate"],
      _sum: {
        paidamount: true,
      },
      where: {
        status: "approved",
        paymentdate: hasDateFilter ? dateFilter : undefined,
      },
      orderBy: {
        paymentdate: "asc",
      },
    });

    const monthlyRevenue = revenueData.reduce(
      (acc: Record<string, number>, payment) => {
        const month = new Date(payment.paymentdate).toISOString().slice(0, 7); // YYYY-MM
        const amount = payment._sum.paidamount?.toNumber() || 0;
        acc[month] = (acc[month] || 0) + amount;
        return acc;
      },
      {} as Record<string, number>
    );

    // 2. Registration Trends (monthly)
    const registrationData = await prisma.wpos_wpdatatable_23.groupBy({
      by: ["registrationdate"],
      _count: {
        wdt_ID: true,
      },
      where: {
        registrationdate: hasDateFilter ? dateFilter : undefined,
      },
      orderBy: {
        registrationdate: "asc",
      },
    });

    const monthlyRegistrations = registrationData.reduce(
      (acc: Record<string, number>, reg) => {
        if (!reg.registrationdate) return acc;
        const month = new Date(reg.registrationdate).toISOString().slice(0, 7); // YYYY-MM
        const count = reg._count.wdt_ID;
        acc[month] = (acc[month] || 0) + count;
        return acc;
      },
      {} as Record<string, number>
    );

    // 3. Payment Status Breakdown
    const paymentStatusData = await prisma.payment.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
      where: {
        paymentdate: hasDateFilter ? dateFilter : undefined,
      },
    });

    const paymentStatusBreakdown = paymentStatusData.map((item) => ({
      name:
        item.status?.charAt(0)?.toUpperCase() + item.status?.slice(1) ||
        "Unknown",
      value: item._count.id,
    }));

    return NextResponse.json({
      monthlyRevenue,
      monthlyRegistrations,
      paymentStatusBreakdown,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
