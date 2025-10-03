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

    const { packageName, salaryPerStudent } = await req.json();

    if (!packageName || salaryPerStudent === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (salaryPerStudent <= 0) {
      return NextResponse.json(
        { error: "Salary per student must be greater than 0" },
        { status: 400 }
      );
    }

    const salary = await prisma.packageSalary.update({
      where: { id: parseInt(params.id) },
      data: {
        packageName,
        salaryPerStudent: Number(salaryPerStudent),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(salary);
  } catch (error: any) {
    console.error("Error updating package salary:", error);
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

    // Check if any students are using this package
    const studentsUsingPackage = await prisma.wpos_wpdatatable_23.count({
      where: {
        package: {
          equals: await prisma.packageSalary
            .findUnique({
              where: { id: parseInt(params.id) },
              select: { packageName: true },
            })
            .then((pkg) => pkg?.packageName),
        },
      },
    });

    if (studentsUsingPackage > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete package salary",
          message: `This package is currently used by ${studentsUsingPackage} student(s). Please reassign students to other packages first.`,
        },
        { status: 409 }
      );
    }

    await prisma.packageSalary.delete({
      where: { id: parseInt(params.id) },
    });

    return NextResponse.json({
      message: "Package salary deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting package salary:", error);
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
