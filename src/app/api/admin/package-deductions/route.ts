import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const packageDeductions = await prisma.packageDeduction.findMany({
      orderBy: { packageName: "asc" },
    });

    return NextResponse.json(packageDeductions);
  } catch (error) {
    console.error("Error fetching package deductions:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { packageName, latenessBaseAmount, absenceBaseAmount } =
      await req.json();

    if (!packageName) {
      return NextResponse.json(
        { error: "Package name is required" },
        { status: 400 }
      );
    }

    const packageDeduction = await prisma.packageDeduction.upsert({
      where: { packageName },
      update: {
        latenessBaseAmount: latenessBaseAmount || 30,
        absenceBaseAmount: absenceBaseAmount || 25,
        updatedAt: new Date(),
      },
      create: {
        packageName,
        latenessBaseAmount: latenessBaseAmount || 30,
        absenceBaseAmount: absenceBaseAmount || 25,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(packageDeduction);
  } catch (error) {
    console.error("Error saving package deduction:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
