import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!session || (session.role !== "admin" && session.role !== "controller")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get unique packages from students table
    const packages = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        package: { not: null },
        status: { in: ["active", "Active"] }
      },
      select: { package: true },
      distinct: ["package"]
    });

    const uniquePackages = packages
      .map(p => p.package)
      .filter(Boolean)
      .sort();

    return NextResponse.json(uniquePackages);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch packages" }, { status: 500 });
  }
}