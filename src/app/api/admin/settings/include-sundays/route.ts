import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const setting = await prisma.setting.findUnique({
      where: { key: "include_sundays_in_salary" },
    });

    return NextResponse.json({
      includeSundays: setting?.value === "true",
    });
  } catch (error: any) {
    console.error("Error fetching Sunday setting:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { includeSundays } = await req.json();

    if (typeof includeSundays !== "boolean") {
      return NextResponse.json(
        { error: "includeSundays must be a boolean" },
        { status: 400 }
      );
    }

    await prisma.setting.upsert({
      where: { key: "include_sundays_in_salary" },
      update: { value: includeSundays.toString() },
      create: {
        key: "include_sundays_in_salary",
        value: includeSundays.toString(),
        updatedAt: new Date(),
      },
    });

    // Clear salary calculator cache since this affects calculations
    try {
      const { createSalaryCalculator } = await import(
        "@/lib/salary-calculator"
      );
      const calculator = await createSalaryCalculator();
      calculator.clearCache();
      console.log(
        "✅ Salary calculator cache cleared after Sunday setting change"
      );
    } catch (error) {
      console.warn("⚠️ Failed to clear salary calculator cache:", error);
    }

    // Clear teacher payments API calculator cache
    try {
      const { clearCalculatorCache } = await import(
        "@/app/api/admin/teacher-payments/route"
      );
      clearCalculatorCache();
      console.log(
        "✅ Teacher payments calculator cache cleared after Sunday setting change"
      );
    } catch (error) {
      console.warn(
        "⚠️ Failed to clear teacher payments calculator cache:",
        error
      );
    }

    return NextResponse.json({
      success: true,
      includeSundays,
    });
  } catch (error: any) {
    console.error("Error updating Sunday setting:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
