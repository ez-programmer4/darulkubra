import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthUser } from "@/lib/server-auth";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
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

    const [studentCount, payments] = await prisma.$transaction([
      prisma.wpos_wpdatatable_23.count({ where: studentWhere }),
      prisma.payment.findMany({
        where: paymentWhere,
        select: { paidamount: true },
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

    const totalRevenue = payments.reduce(
      (sum, p) => sum + p.paidamount.toNumber(),
      0
    );
    const paymentCount = payments.length;

    return NextResponse.json({
      admins: adminCount,
      controllers: controllerCount,
      teachers: teacherCount,
      registrars: registralCount,
      students: studentCount,
      totalRevenue,
      paymentCount,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
