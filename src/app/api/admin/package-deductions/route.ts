import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET() {
  try {
    const packageDeductions = await prisma.packageDeduction.findMany({
      orderBy: { packageName: "asc" }
    });
    return NextResponse.json(packageDeductions);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch package deductions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { packageName, latenessBaseAmount, absenceBaseAmount } = await req.json();
    
    if (!packageName || latenessBaseAmount == null || absenceBaseAmount == null) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const packageDeduction = await prisma.packageDeduction.upsert({
      where: { packageName },
      update: { latenessBaseAmount, absenceBaseAmount },
      create: { packageName, latenessBaseAmount, absenceBaseAmount }
    });

    return NextResponse.json(packageDeduction);
  } catch (error) {
    return NextResponse.json({ error: "Failed to save package deduction" }, { status: 500 });
  }
}