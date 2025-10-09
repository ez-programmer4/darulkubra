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

    // Get all unique packages that students are actually using
    const studentPackagesUsed = (await prisma.$queryRawUnsafe(`
      SELECT DISTINCT package as name
      FROM wpos_wpdatatable_23 
      WHERE package IS NOT NULL 
        AND package != '' 
        AND package != 'null'
      ORDER BY package ASC
    `)) as { name: string }[];

    // Get all packages from studentPackage table
    const studentPackagesFromTable = await prisma.studentPackage.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    // Combine both sources and remove duplicates
    const allPackageNames = new Set<string>();

    // Add packages from studentPackage table
    studentPackagesFromTable.forEach((pkg) => allPackageNames.add(pkg.name));

    // Add packages actually used by students
    studentPackagesUsed.forEach((pkg) => allPackageNames.add(pkg.name));

    // Get all configured package deductions
    const packageDeductions = await prisma.packageDeduction.findMany();

    // Create a map of configured deductions for quick lookup
    const deductionMap = new Map(
      packageDeductions.map((deduction) => [deduction.packageName, deduction])
    );

    // Create a map of student packages from table for metadata
    const studentPackageMap = new Map(
      studentPackagesFromTable.map((pkg) => [pkg.name, pkg])
    );

    // Combine all packages with their deduction configurations
    const packagesWithDeductions = await Promise.all(
      Array.from(allPackageNames).map(async (packageName) => {
        const deductionConfig = deductionMap.get(packageName);
        const studentPackageInfo = studentPackageMap.get(packageName);

        // Count active students using this package
        const activeStudentCount = await prisma.wpos_wpdatatable_23.count({
          where: {
            package: packageName,
            status: {
              in: ["Active", "Not yet"],
            },
          },
        });

        return {
          id: studentPackageInfo?.id || 0, // Use 0 if not in studentPackage table
          packageName: packageName,
          isActive: studentPackageInfo?.isActive ?? true, // Default to true if not in table
          createdAt: studentPackageInfo?.createdAt || new Date(),
          updatedAt: studentPackageInfo?.updatedAt || new Date(),
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
