import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const deduction = await prisma.packageDeduction.update({
      where: { id: parseInt(params.id) },
      data: {
        packageName,
        latenessBaseAmount: Number(latenessBaseAmount),
        absenceBaseAmount: Number(absenceBaseAmount),
      },
    });

    return NextResponse.json(deduction);
  } catch (error: any) {
    console.error("Error updating package deduction:", error);
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.packageDeduction.delete({
      where: { id: parseInt(params.id) },
    });

    return NextResponse.json({
      message: "Package deduction deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting package deduction:", error);
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
