import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const [statuses, packages, subjects, daypackages] = await Promise.all([
      prisma.studentStatus.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.studentPackage.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.studentSubject.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.studentdaypackage.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      statuses,
      packages,
      subjects,
      daypackages,
    });
  } catch (error) {
    console.error("Error fetching student configurations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
