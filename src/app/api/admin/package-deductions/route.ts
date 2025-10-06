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

    // Get all student packages
    const studentPackages = await prisma.studentPackage.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    // Get all configured package deductions
    const packageDeductions = await prisma.packageDeduction.findMany();

    // Create a map of configured deductions for quick lookup
    const deductionMap = new Map(
      packageDeductions.map((deduction) => [deduction.packageName, deduction])
    );

    // Combine student packages with their deduction configurations
    const packagesWithDeductions = await Promise.all(
      studentPackages.map(async (studentPackage) => {
        const deductionConfig = deductionMap.get(studentPackage.name);

        // Count active students using this package
        const activeStudentCount = await prisma.wpos_wpdatatable_23.count({
          where: {
            package: studentPackage.name,
            status: {
              not: "exit",
            },
          },
        });

        return {
          id: studentPackage.id,
          packageName: studentPackage.name,
          isActive: studentPackage.isActive,
          createdAt: studentPackage.createdAt,
          updatedAt: studentPackage.updatedAt,
          activeStudentCount,
          deductionConfigured: !!deductionConfig,
          latenessBaseAmount: deductionConfig?.latenessBaseAmount || 0,
          absenceBaseAmount: deductionConfig?.absenceBaseAmount || 0,
          deductionId: deductionConfig?.id || null,
          deductionCreatedAt: deductionConfig?.createdAt || null,
          deductionUpdatedAt: deductionConfig?.updatedAt || null,
        };
      })
    );

    return NextResponse.json(packagesWithDeductions);
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
