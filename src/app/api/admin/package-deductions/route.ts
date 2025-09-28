import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deductions = await prisma.packageDeduction.findMany({
      orderBy: { packageName: "asc" },
    });

    return NextResponse.json(deductions);
  } catch (error: any) {
    console.error("Error fetching package deductions:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { packageName, latenessBaseAmount, absenceBaseAmount } =
      await req.json();

    if (
      !packageName ||
      latenessBaseAmount === undefined ||
      absenceBaseAmount === undefined
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if package already exists
    const existingPackage = await prisma.packageDeduction.findUnique({
      where: { packageName },
    });

    if (existingPackage) {
      return NextResponse.json(
        { error: "Package deduction already exists" },
        { status: 409 }
      );
    }

    const deduction = await prisma.packageDeduction.create({
      data: {
        packageName,
        latenessBaseAmount: Number(latenessBaseAmount),
        absenceBaseAmount: Number(absenceBaseAmount),
      },
    });

    return NextResponse.json(deduction, { status: 201 });
  } catch (error: any) {
    console.error("Error creating package deduction:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
