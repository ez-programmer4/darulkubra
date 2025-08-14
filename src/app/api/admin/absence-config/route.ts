import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { role?: string }).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const deductionConfig = await prisma.deductionbonusconfig.findFirst({
      where: { configType: "absence", key: "unpermitted_absence_deduction" },
    });
    const monthsConfig = await prisma.deductionbonusconfig.findFirst({
      where: { configType: "absence", key: "absence_deduction_effective_months" },
    });

    const deductionAmount = deductionConfig?.value ?? "50";
    const effectiveMonths = monthsConfig?.value ? monthsConfig.value.split(",") : [];

    return NextResponse.json({ deductionAmount, effectiveMonths });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { role?: string }).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const deductionAmount: string = String(body.deductionAmount ?? "50");
    const effectiveMonths: string[] = Array.isArray(body.effectiveMonths) ? body.effectiveMonths : [];

    const existingDeductionConfig = await prisma.deductionbonusconfig.findFirst({
      where: { configType: "absence", key: "unpermitted_absence_deduction" },
    });
    if (existingDeductionConfig) {
      await prisma.deductionbonusconfig.update({
        where: { id: existingDeductionConfig.id },
        data: { value: deductionAmount, updatedAt: new Date() },
      });
    } else {
      await prisma.deductionbonusconfig.create({
        data: {
          configType: "absence",
          key: "unpermitted_absence_deduction",
          value: deductionAmount,
          updatedAt: new Date(),
        },
      });
    }

    const existingMonthsConfig = await prisma.deductionbonusconfig.findFirst({
      where: { configType: "absence", key: "absence_deduction_effective_months" },
    });
    const monthsValue = effectiveMonths.join(",");
    if (existingMonthsConfig) {
      await prisma.deductionbonusconfig.update({
        where: { id: existingMonthsConfig.id },
        data: { value: monthsValue, updatedAt: new Date() },
      });
    } else {
      await prisma.deductionbonusconfig.create({
        data: {
          configType: "absence",
          key: "absence_deduction_effective_months",
          value: monthsValue,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}