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
    const url = new URL(req.url);
    const month = url.searchParams.get("month") || new Date().getMonth() + 1;
    const year = url.searchParams.get("year") || new Date().getFullYear();
    
    // Calculate date range for the month
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0);
    const daysInMonth = endDate.getDate();
    
    // Get working days configuration (default: exclude Sundays)
    const workingDaysConfig = await prisma.setting.findUnique({
      where: { key: "include_sundays_in_salary" }
    });
    const includeSundays = workingDaysConfig?.value === "true" || false;
    
    // Calculate working days
    let workingDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(Number(year), Number(month) - 1, day);
      if (includeSundays || date.getDay() !== 0) {
        workingDays++;
      }
    }

    // Get students with their zoom links for the period
    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        ustaz: teacherId,
        status: { in: ["active", "Active"] }
      },
      select: {
        wdt_ID: true,
        name: true,
        package: true,
        zoom_links: {
          where: {
            sent_time: {
              gte: startDate,
              lte: endDate
            }
          },
          select: {
            sent_time: true
          }
        }
      }
    });

    // Get package salaries
    const packageSalaries = await prisma.packageSalary.findMany();
    const salaryMap: Record<string, number> = {};
    packageSalaries.forEach(ps => {
      salaryMap[ps.packageName] = Number(ps.salaryPerStudent);
    });

    // Group students by package and calculate daily-based totals
    const packageBreakdown: Record<string, any> = {};
    let totalEarnedSalary = 0;
    let totalPossibleSalary = 0;

    students.forEach(student => {
      const pkg = student.package || "No Package";
      const packageSalary = salaryMap[pkg] || 0;
      const dailySalary = packageSalary / workingDays;
      
      // Count unique working days where zoom link was sent
      const sentDates = new Set();
      student.zoom_links.forEach(link => {
        if (link.sent_time) {
          const linkDate = new Date(link.sent_time);
          // Count based on configuration
          if (includeSundays || linkDate.getDay() !== 0) {
            const dateStr = link.sent_time.toISOString().split('T')[0];
            sentDates.add(dateStr);
          }
        }
      });
      
      const teachingDays = sentDates.size;
      const earnedSalary = dailySalary * teachingDays;
      
      if (!packageBreakdown[pkg]) {
        packageBreakdown[pkg] = {
          packageName: pkg,
          students: [],
          count: 0,
          salaryPerStudent: packageSalary,
          dailySalary: dailySalary,
          totalSalary: 0,
          totalTeachingDays: 0,
          totalPossibleDays: 0
        };
      }
      
      packageBreakdown[pkg].students.push({
        id: student.wdt_ID,
        name: student.name,
        teachingDays,
        earnedSalary: earnedSalary.toFixed(2)
      });
      packageBreakdown[pkg].count++;
      packageBreakdown[pkg].totalSalary += earnedSalary;
      packageBreakdown[pkg].totalTeachingDays += teachingDays;
      packageBreakdown[pkg].totalPossibleDays += daysInMonth;
      
      totalEarnedSalary += earnedSalary;
      totalPossibleSalary += packageSalary;
    });

    // Calculate attendance rate
    const totalPossibleTeachingDays = students.length * workingDays;
    const totalActualTeachingDays = Object.values(packageBreakdown).reduce(
      (sum: number, pkg: any) => sum + pkg.totalTeachingDays, 0
    );
    const attendanceRate = totalPossibleTeachingDays > 0 
      ? (totalActualTeachingDays / totalPossibleTeachingDays * 100).toFixed(2)
      : "0";

    return NextResponse.json({
      teacherId,
      month: Number(month),
      year: Number(year),
      daysInMonth,
      workingDays,
      totalStudents: students.length,
      totalEarnedSalary: totalEarnedSalary.toFixed(2),
      totalPossibleSalary: totalPossibleSalary.toFixed(2),
      attendanceRate: `${attendanceRate}%`,
      totalTeachingDays: totalActualTeachingDays,
      totalPossibleDays: totalPossibleTeachingDays,
      packageBreakdown: Object.values(packageBreakdown)
    });
  } catch (error) {
    console.error("Teacher students API error:", error);
    return NextResponse.json({ error: "Failed to fetch teacher students" }, { status: 500 });
  }
}