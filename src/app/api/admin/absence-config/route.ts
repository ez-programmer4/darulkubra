import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user ||
      (session.user as { role?: string }).role !== "admin"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const deductionConfig = await prisma.deductionbonusconfig.findFirst({
      where: { configType: "absence", key: "unpermitted_absence_deduction" },
    });
    const timeSlotDeductionConfig = await prisma.deductionbonusconfig.findFirst({
      where: { configType: "absence", key: "deduction_per_time_slot" },
    });
    const monthsConfig = await prisma.deductionbonusconfig.findFirst({
      where: {
        configType: "absence",
        key: "absence_deduction_effective_months",
      },
    });
    const sundayConfig = await prisma.deductionbonusconfig.findFirst({
      where: {
        configType: "absence",
        key: "exclude_sundays",
      },
    });

    const deductionAmount = deductionConfig?.value ?? "50";
    const deductionPerTimeSlot = timeSlotDeductionConfig?.value ?? "25";
    const effectiveMonths = monthsConfig?.effectiveMonths
      ? monthsConfig.effectiveMonths.split(",")
      : [];
    const excludeSundays = sundayConfig?.value === "true";

    return NextResponse.json({ deductionAmount, deductionPerTimeSlot, effectiveMonths, excludeSundays });
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
    if (
      !session?.user ||
      (session.user as { role?: string }).role !== "admin"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const deductionAmount: string = String(body.deductionAmount ?? "50");
    const deductionPerTimeSlot: string = String(body.deductionPerTimeSlot ?? "25");
    const effectiveMonths: string[] = Array.isArray(body.effectiveMonths)
      ? body.effectiveMonths
      : [];
    const excludeSundays: boolean = body.excludeSundays ?? true;

    const existingDeductionConfig = await prisma.deductionbonusconfig.findFirst(
      {
        where: { configType: "absence", key: "unpermitted_absence_deduction" },
      }
    );
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

    // Handle per-time-slot deduction config
    const existingTimeSlotConfig = await prisma.deductionbonusconfig.findFirst({
      where: { configType: "absence", key: "deduction_per_time_slot" },
    });
    if (existingTimeSlotConfig) {
      await prisma.deductionbonusconfig.update({
        where: { id: existingTimeSlotConfig.id },
        data: { value: deductionPerTimeSlot, updatedAt: new Date() },
      });
    } else {
      await prisma.deductionbonusconfig.create({
        data: {
          configType: "absence",
          key: "deduction_per_time_slot",
          value: deductionPerTimeSlot,
          updatedAt: new Date(),
        },
      });
    }

    const existingMonthsConfig = await prisma.deductionbonusconfig.findFirst({
      where: {
        configType: "absence",
        key: "absence_deduction_effective_months",
      },
    });
    const monthsValue = effectiveMonths.join(",");
    if (existingMonthsConfig) {
      await prisma.deductionbonusconfig.update({
        where: { id: existingMonthsConfig.id },
        data: { 
          value: "effective_months", 
          effectiveMonths: monthsValue, 
          updatedAt: new Date() 
        },
      });
    } else {
      await prisma.deductionbonusconfig.create({
        data: {
          configType: "absence",
          key: "absence_deduction_effective_months",
          value: "effective_months",
          effectiveMonths: monthsValue,
          updatedAt: new Date(),
        },
      });
    }

    // Handle Sunday exclusion config
    const existingSundayConfig = await prisma.deductionbonusconfig.findFirst({
      where: {
        configType: "absence",
        key: "exclude_sundays",
      },
    });
    if (existingSundayConfig) {
      await prisma.deductionbonusconfig.update({
        where: { id: existingSundayConfig.id },
        data: { 
          value: excludeSundays.toString(), 
          updatedAt: new Date() 
        },
      });
    } else {
      await prisma.deductionbonusconfig.create({
        data: {
          configType: "absence",
          key: "exclude_sundays",
          value: excludeSundays.toString(),
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
