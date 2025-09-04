import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest, { params }: { params: { teacherId: string } }) {
  try {
    const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!session || (session.role !== "admin" && session.role !== "controller")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teacherId } = params;

    // Get students grouped by package for this teacher
    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        ustaz: teacherId,
        status: { in: ["active", "Active"] }
      },
      select: {
        wdt_ID: true,
        name: true,
        package: true
      }
    });

    // Get package salaries
    const packageSalaries = await prisma.packageSalary.findMany();
    const salaryMap: Record<string, number> = {};
    packageSalaries.forEach(ps => {
      salaryMap[ps.packageName] = Number(ps.salaryPerStudent);
    });

    // Group students by package and calculate totals
    const packageBreakdown: Record<string, any> = {};
    let totalBaseSalary = 0;

    students.forEach(student => {
      const pkg = student.package || "No Package";
      if (!packageBreakdown[pkg]) {
        packageBreakdown[pkg] = {
          packageName: pkg,
          students: [],
          count: 0,
          salaryPerStudent: salaryMap[pkg] || 0,
          totalSalary: 0
        };
      }
      
      packageBreakdown[pkg].students.push({
        id: student.wdt_ID,
        name: student.name
      });
      packageBreakdown[pkg].count++;
      packageBreakdown[pkg].totalSalary = packageBreakdown[pkg].count * packageBreakdown[pkg].salaryPerStudent;
      totalBaseSalary += packageBreakdown[pkg].salaryPerStudent;
    });

    return NextResponse.json({
      teacherId,
      totalStudents: students.length,
      totalBaseSalary,
      packageBreakdown: Object.values(packageBreakdown)
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch teacher students" }, { status: 500 });
  }
}