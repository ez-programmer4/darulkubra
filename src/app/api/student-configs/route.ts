import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Fetch all student configurations
    const [statuses, packages, subjects] = await Promise.all([
      prisma.studentstatus.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" }
      }),
      prisma.studentpackage.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" }
      }),
      prisma.studentsubject.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" }
      })
    ]);

    return NextResponse.json({
      statuses: statuses || [],
      packages: packages || [],
      subjects: subjects || []
    });

  } catch (error) {
    console.error("Error fetching student configurations:", error);
    return NextResponse.json(
      { error: "Failed to fetch student configurations" },
      { status: 500 }
    );
  }
}