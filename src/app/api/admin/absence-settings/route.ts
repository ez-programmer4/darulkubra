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

    const deductionConfig = await prisma.deductionBonusConfig.findFirst({
      where: {
        configType: "absence",
        key: "unpermitted_absence_deduction",
      },
    });

    const effectiveMonthsConfig = await prisma.deductionBonusConfig.findFirst({
      where: {
        configType: "absence",
        key: "absence_deduction_effective_months",
      },
    });

    const permissionReasons = await prisma.permissionReason.findMany();

    return NextResponse.json({
      deductionAmount: deductionConfig?.value,
      effectiveMonths: effectiveMonthsConfig?.value?.split(",") || [],
      permissionReasons: permissionReasons.map((r) => r.reason),
    });
  } catch (error) {
    console.error("Error fetching absence settings:", error);
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
    const existingDeductionConfig = await prisma.deductionBonusConfig.findFirst(
      {
        where: {
          configType: "absence",
          key: "unpermitted_absence_deduction",
        },
      }
    );

    if (existingDeductionConfig) {
      await prisma.deductionBonusConfig.update({
        where: { id: existingDeductionConfig.id },
        data: {
          value: deductionAmount.toString(),
        },
      });
    } else {
      await prisma.deductionBonusConfig.create({
        data: {
          configType: "absence",
          key: "unpermitted_absence_deduction",
          value: deductionAmount.toString(),
        },
      });
    }

    // Update effective months
    const existingMonthsConfig = await prisma.deductionBonusConfig.findFirst({
      where: {
        configType: "absence",
        key: "absence_deduction_effective_months",
      },
    });

    if (existingMonthsConfig) {
      await prisma.deductionBonusConfig.update({
        where: { id: existingMonthsConfig.id },
        data: {
          value: effectiveMonths.join(","),
        },
      });
    } else {
      await prisma.deductionBonusConfig.create({
        data: {
          configType: "absence",
          key: "absence_deduction_effective_months",
          value: effectiveMonths.join(","),
        },
      });
    }

    // Update permission reasons
    await prisma.permissionReason.deleteMany({});
    if (permissionReasons && permissionReasons.length > 0) {
      await prisma.permissionReason.createMany({
        data: permissionReasons.map((reason: string) => ({ reason })),
      });
    }

    // Create an audit log entry
    let logAdminId: number | null = null;
    const adminId = parseInt((session.user as AuthUser).id);
    console.log("AuditLog adminId:", adminId, "session.user:", session.user);
    if (!isNaN(adminId)) {
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
      await prisma.auditLog.create({
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
    console.error("Error saving absence settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
