import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type AuthUser = {
  id: string;
  role: string;
  // add other properties as needed
};

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as AuthUser).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const deductionConfig = await prisma.deductionbonusconfig.findFirst({
      where: {
        configType: "absence",
        key: "unpermitted_absence_deduction",
      },
    });

    const effectiveMonthsConfig = await prisma.deductionbonusconfig.findFirst({
      where: {
        configType: "absence",
        key: "absence_deduction_effective_months",
      },
    });

    const permissionReasons = await prisma.permissionreason.findMany();

    return NextResponse.json({
      deductionAmount: deductionConfig?.value,
      effectiveMonths: effectiveMonthsConfig?.value?.split(",") || [],
      permissionReasons: permissionReasons.map((r) => r.reason),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as AuthUser).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { deductionAmount, effectiveMonths, permissionReasons } =
      await req.json();

    // Update deduction amount
    const existingDeductionConfig = await prisma.deductionbonusconfig.findFirst(
      {
        where: {
          configType: "absence",
          key: "unpermitted_absence_deduction",
        },
      }
    );

    if (existingDeductionConfig) {
      await prisma.deductionbonusconfig.update({
        where: { id: existingDeductionConfig.id },
        data: {
          value: deductionAmount.toString(),
        },
      });
    } else {
      await prisma.deductionbonusconfig.create({
        data: {
          configType: "absence",
          key: "unpermitted_absence_deduction",
          value: deductionAmount.toString(),
          updatedAt: new Date(),
        },
      });
    }

    // Update effective months
    const existingMonthsConfig = await prisma.deductionbonusconfig.findFirst({
      where: {
        configType: "absence",
        key: "absence_deduction_effective_months",
      },
    });

    if (existingMonthsConfig) {
      await prisma.deductionbonusconfig.update({
        where: { id: existingMonthsConfig.id },
        data: {
          value: effectiveMonths.join(","),
        },
      });
    } else {
      await prisma.deductionbonusconfig.create({
        data: {
          configType: "absence",
          key: "absence_deduction_effective_months",
          value: effectiveMonths.join(","),
          updatedAt: new Date(),
        },
      });
    }

    // Update permission reasons
    await prisma.permissionreason.deleteMany({});
    if (permissionReasons && permissionReasons.length > 0) {
      await prisma.permissionreason.createMany({
        data: permissionReasons.map((reason: string) => ({ reason })),
      });
    }

    // Create an audit log entry
    let logAdminId: string | null = null;
    const adminId = (session.user as AuthUser).id;
    if (adminId) {
      const adminExists = await prisma.admin.findUnique({
        where: { id: adminId },
      });
      if (adminExists) logAdminId = adminId;
    }
    if (logAdminId === null) {
      const firstAdmin = await prisma.admin.findFirst();
      if (firstAdmin) logAdminId = firstAdmin.id;
    }
    if (logAdminId !== null) {
      await prisma.auditlog.create({
        data: {
          actionType: "UPDATE_ABSENCE_SETTINGS",
          adminId: logAdminId,
          details: JSON.stringify({
            deductionAmount,
            effectiveMonths,
            permissionReasons,
          }),
        },
      });
    }

    return NextResponse.json({ message: "Settings saved successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
