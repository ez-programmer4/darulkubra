import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getToken } from "next-auth/jwt";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const hasDateFilter = startDate && endDate;

    const paymentWhere = {
      paymentdate: hasDateFilter ? dateFilter : undefined,
    };
    const studentWhere = {
      registrationdate: hasDateFilter ? dateFilter : undefined,
    };

    const [studentCount, payments, pendingPaymentCount] =
      await prisma.$transaction([
        prisma.wpos_wpdatatable_23.count({ where: studentWhere }),
        prisma.payment.findMany({
          where: paymentWhere,
          select: { status: true, paidamount: true },
        }),
        prisma.payment.count({
          where: {
            status: "pending",
            ...(hasDateFilter && { paymentdate: dateFilter }),
          },
        }),
      ]);

    const adminCount = hasDateFilter ? 0 : await prisma.admin.count();
    const controllerCount = hasDateFilter
      ? 0
      : await prisma.wpos_wpdatatable_28.count();
    const teacherCount = hasDateFilter
      ? 0
      : await prisma.wpos_wpdatatable_24.count();
    const registralCount = hasDateFilter
      ? 0
      : await prisma.wpos_wpdatatable_33.count();

    const revenueByStatus = payments.reduce(
      (acc, p) => {
        const amount = p.paidamount?.toNumber?.() ?? 0;
        if (p.status === "approved") acc.approved += amount;
        else if (p.status === "pending") acc.pending += amount;
        else if (p.status === "rejected") acc.rejected += amount;
        return acc;
      },
      { approved: 0, pending: 0, rejected: 0 }
    );

    // Calculate total pending payment amount
    const pendingPaymentAmount = revenueByStatus.pending;

    return NextResponse.json({
      admins: adminCount,
      controllers: controllerCount,
      teachers: teacherCount,
      registrars: registralCount,
      students: studentCount,
      totalRevenue: revenueByStatus,
      paymentCount: payments.length,
      pendingPaymentCount,
      pendingPaymentAmount,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
