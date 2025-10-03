import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET() {
  try {
    const packageSalaries = await prisma.packageSalary.findMany({
      orderBy: { packageName: "asc" },
    });
    return NextResponse.json(packageSalaries);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch package salaries" },
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
    if (
      !session ||
      (session.role !== "admin" && session.role !== "controller")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { packageName, salaryPerStudent } = await req.json();

    if (!packageName || salaryPerStudent === undefined) {
      return NextResponse.json(
        { error: "Package name and salary are required" },
        { status: 400 }
      );
    }

    if (salaryPerStudent <= 0) {
      return NextResponse.json(
        { error: "Salary per student must be greater than 0" },
        { status: 400 }
      );
    }

    // Check if package already exists
    const existingPackage = await prisma.packageSalary.findUnique({
      where: { packageName },
    });

    if (existingPackage) {
      return NextResponse.json(
        { error: "Package salary already exists" },
        { status: 409 }
      );
    }

    const packageSalary = await prisma.packageSalary.create({
      data: {
        packageName,
        salaryPerStudent: Number(salaryPerStudent),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(packageSalary, { status: 201 });
  } catch (error: any) {
    console.error("Error creating package salary:", error);
    return NextResponse.json(
      {
        error: "Failed to save package salary",
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
