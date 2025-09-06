import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const configs = await prisma.latenessdeductionconfig.findMany({
      orderBy: [{ tier: "asc" }, { startMinute: "asc" }],
    });
    return NextResponse.json(configs);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
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
    const body = await req.json();
    const { isUnlimited, ...configData } = body;
    
    // Get current base deduction amount from existing configs or use default
    const existingConfig = await prisma.latenessdeductionconfig.findFirst({
      select: { baseDeductionAmount: true }
    });
    const baseAmount = Number(existingConfig?.baseDeductionAmount) || 30;
    
    const config = await prisma.latenessdeductionconfig.create({
      data: {
        ...configData,
        baseDeductionAmount: baseAmount,
        updatedAt: new Date(),
      },
    });
    return NextResponse.json(config, { status: 201 });
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
    if (!body.id)
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    const { isUnlimited, ...configData } = body;
    const config = await prisma.latenessdeductionconfig.update({
      where: { id: body.id },
      data: {
        ...configData,
        updatedAt: new Date(),
      },
    });
    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    await prisma.latenessdeductionconfig.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
