import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get base deduction amount from any config record
    const config = await prisma.latenessdeductionconfig.findFirst({
      select: { baseDeductionAmount: true }
    });

    return NextResponse.json({ 
      baseDeductionAmount: config?.baseDeductionAmount || 30 
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { baseDeductionAmount } = body;

    if (!baseDeductionAmount || baseDeductionAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid base deduction amount" },
        { status: 400 }
      );
    }

    // Update all existing config records with the new base amount
    await prisma.latenessdeductionconfig.updateMany({
      data: {
        baseDeductionAmount: parseFloat(baseDeductionAmount),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ 
      success: true, 
      baseDeductionAmount: parseFloat(baseDeductionAmount) 
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}