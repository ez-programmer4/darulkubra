import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "registral") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const packageDeductions = await prisma.packageDeduction.findMany({
      orderBy: {
        packageName: 'asc',
      },
    });

    return NextResponse.json(packageDeductions);
  } catch (error) {
    console.error("Package deductions fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "registral") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { packageName, latenessBaseAmount, absenceBaseAmount } = body;

    if (!packageName || latenessBaseAmount === undefined || absenceBaseAmount === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const packageDeduction = await prisma.packageDeduction.upsert({
      where: {
        packageName,
      },
      update: {
        latenessBaseAmount: parseFloat(latenessBaseAmount),
        absenceBaseAmount: parseFloat(absenceBaseAmount),
        updatedAt: new Date(),
      },
      create: {
        packageName,
        latenessBaseAmount: parseFloat(latenessBaseAmount),
        absenceBaseAmount: parseFloat(absenceBaseAmount),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      packageDeduction,
    });
  } catch (error) {
    console.error("Package deduction update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}