import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET() {
  try {
    const packageSalaries = await prisma.packageSalary.findMany({
      orderBy: { packageName: "asc" }
    });
    return NextResponse.json(packageSalaries);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch package salaries" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!session || (session.role !== "admin" && session.role !== "controller")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { packageName, salaryPerStudent } = await req.json();
    
    if (!packageName || !salaryPerStudent) {
      return NextResponse.json({ error: "Package name and salary are required" }, { status: 400 });
    }

    const packageSalary = await prisma.packageSalary.upsert({
      where: { packageName },
      update: { salaryPerStudent },
      create: { packageName, salaryPerStudent }
    });

    return NextResponse.json(packageSalary);
  } catch (error) {
    return NextResponse.json({ error: "Failed to save package salary" }, { status: 500 });
  }
}