import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(
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

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Package deduction ID is required" },
        { status: 400 }
      );
    }

    // Get the package deduction
    const packageDeduction = await prisma.packageDeduction.findUnique({
      where: { id: parseInt(id) },
    });

    if (!packageDeduction) {
      return NextResponse.json(
        { error: "Package deduction not found" },
        { status: 404 }
      );
    }

    // Count active students using this package
    const activeStudentCount = await prisma.wpos_wpdatatable_23.count({
      where: {
        package: packageDeduction.packageName,
        status: {
          in: ["Active", "Not yet"],
        },
      },
    });

    return NextResponse.json({
      ...packageDeduction,
      activeStudentCount,
    });
  } catch (error: any) {
    console.error("Error fetching package deduction:", error);
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

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Package deduction ID is required" },
        { status: 400 }
      );
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

    // Check if the package deduction exists
    const existingDeduction = await prisma.packageDeduction.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingDeduction) {
      return NextResponse.json(
        { error: "Package deduction not found" },
        { status: 404 }
      );
    }

    // Check if another package deduction with the same name exists (excluding current one)
    const duplicatePackage = await prisma.packageDeduction.findFirst({
      where: {
        packageName,
        id: { not: parseInt(id) },
      },
    });

    if (duplicatePackage) {
      return NextResponse.json(
        { error: "Package deduction with this name already exists" },
        { status: 409 }
      );
    }

    // Update the package deduction
    const updatedDeduction = await prisma.packageDeduction.update({
      where: { id: parseInt(id) },
      data: {
        packageName,
        latenessBaseAmount: Number(latenessBaseAmount),
        absenceBaseAmount: Number(absenceBaseAmount),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedDeduction);
  } catch (error: any) {
    console.error("Error updating package deduction:", error);

    // Handle Prisma unique constraint error specifically
    if (error.code === "P2002") {
      return NextResponse.json(
        {
          error: "Package name already exists",
          message:
            "A package deduction with this name already exists. Please choose a different name.",
        },
        { status: 409 }
      );
    }

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

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Package deduction ID is required" },
        { status: 400 }
      );
    }

    // Check if the package deduction exists
    const existingDeduction = await prisma.packageDeduction.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingDeduction) {
      return NextResponse.json(
        { error: "Package deduction not found" },
        { status: 404 }
      );
    }

    // Check if there are any active students using this package
    const activeStudentCount = await prisma.wpos_wpdatatable_23.count({
      where: {
        package: existingDeduction.packageName,
        status: {
          in: ["Active", "Not yet"],
        },
      },
    });

    if (activeStudentCount > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete package deduction",
          message: `Cannot delete this package deduction because ${activeStudentCount} active students are using this package. Please reassign these students first.`,
        },
        { status: 400 }
      );
    }

    // Delete the package deduction
    await prisma.packageDeduction.delete({
      where: { id: parseInt(id) },
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
