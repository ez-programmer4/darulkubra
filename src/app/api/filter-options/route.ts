import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [statuses, packages, subjects] = await Promise.all([
      prisma.studentstatus.findMany({ select: { name: true } }),
      prisma.studentpackage.findMany({ select: { name: true } }),
      prisma.studentsubject.findMany({ select: { name: true } })
    ]);

    return NextResponse.json({
      statuses: statuses.map(s => s.name),
      packages: packages.map(p => p.name),
      subjects: subjects.map(s => s.name)
    });
  } catch (error) {
    console.error("Error fetching filter options:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}