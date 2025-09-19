import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || session.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if salary visibility is enabled
    const visibilitySetting = await prisma.setting.findUnique({
      where: { key: "teacher_salary_visible" },
    });

    if (visibilitySetting?.value !== "true") {
      return NextResponse.json(
        { error: "Salary access is currently disabled" },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const includeDetails = url.searchParams.get("details") === "true";

    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing date range parameters" },
        { status: 400 }
      );
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const teacherId = session.id as string;

    // Get teacher's salary data using the same logic as admin
    const res = await fetch(
      `${process.env.NEXTAUTH_URL}/api/admin/teacher-payments?startDate=${fromDate.toISOString()}&endDate=${toDate.toISOString()}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal'}`,
        },
      }
    );

    if (!res.ok) {
      // Fallback to direct calculation if admin API fails
      return await calculateTeacherSalaryDirect(teacherId, fromDate, toDate, includeDetails);
    }

    const allTeachers = await res.json();
    const teacherData = allTeachers.find((t: any) => t.id === teacherId);

    if (!teacherData) {
      return NextResponse.json(
        { error: "Teacher salary data not found" },
        { status: 404 }
      );
    }

    // If details requested, get breakdown
    if (includeDetails) {
      const breakdownRes = await fetch(
        `${process.env.NEXTAUTH_URL}/api/admin/teacher-payments?teacherId=${teacherId}&from=${fromDate.toISOString()}&to=${toDate.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal'}`,
          },
        }
      );

      if (breakdownRes.ok) {
        const breakdown = await breakdownRes.json();
        return NextResponse.json({
          ...teacherData,
          breakdown,
        });
      }
    }

    return NextResponse.json(teacherData);
  } catch (error: any) {
    console.error("Teacher salary API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Fallback direct calculation
async function calculateTeacherSalaryDirect(
  teacherId: string,
  fromDate: Date,
  toDate: Date,
  includeDetails: boolean
) {
  try {
    // Get teacher info
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
      select: { ustazname: true },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher not found" },
        { status: 404 }
      );
    }

    // Get teacher's students
    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        ustaz: teacherId,
        status: { in: ["active", "Active"] },
      },
      select: {
        wdt_ID: true,
        name: true,
        package: true,
        zoom_links: {
          where: {
            sent_time: { gte: fromDate, lte: toDate },
          },
          select: { sent_time: true },
        },
      },
    });

    // Get package salaries
    const packageSalaries = await prisma.packageSalary.findMany();
    const salaryMap: Record<string, number> = {};
    packageSalaries.forEach((pkg) => {
      salaryMap[pkg.packageName] = Number(pkg.salaryPerStudent);
    });

    // Get working days configuration
    const workingDaysConfig = await prisma.setting.findUnique({
      where: { key: "include_sundays_in_salary" },
    });
    const includeSundays = workingDaysConfig?.value === "true" || false;

    // Calculate working days
    const daysInMonth = new Date(
      fromDate.getFullYear(),
      fromDate.getMonth() + 1,
      0
    ).getDate();
    let workingDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(fromDate.getFullYear(), fromDate.getMonth(), day);
      if (includeSundays || date.getDay() !== 0) {
        workingDays++;
      }
    }

    // Calculate base salary
    let baseSalary = 0;
    const dailyEarnings = new Map();

    for (const student of students) {
      if (!student.package || !salaryMap[student.package]) continue;

      const monthlyPackageSalary = Math.round(salaryMap[student.package] || 0);
      const dailyRate = Math.round(monthlyPackageSalary / workingDays);

      // Count teaching days
      const teachingDates = new Set();
      const dailyLinks = new Map();

      student.zoom_links.forEach((link) => {
        if (link.sent_time) {
          const linkDate = new Date(link.sent_time);
          if (includeSundays || linkDate.getDay() !== 0) {
            const dateStr = link.sent_time.toISOString().split("T")[0];
            if (!dailyLinks.has(dateStr) || link.sent_time < dailyLinks.get(dateStr)) {
              dailyLinks.set(dateStr, link.sent_time);
            }
          }
        }
      });

      dailyLinks.forEach((_, dateStr) => {
        teachingDates.add(dateStr);
        if (!dailyEarnings.has(dateStr)) {
          dailyEarnings.set(dateStr, 0);
        }
        dailyEarnings.set(dateStr, dailyEarnings.get(dateStr) + dailyRate);
      });
    }

    baseSalary = Array.from(dailyEarnings.values()).reduce((sum, amount) => sum + amount, 0);

    // Get deductions and bonuses
    const [absenceRecords, bonusRecords] = await Promise.all([
      prisma.absencerecord.findMany({
        where: {
          teacherId,
          classDate: { gte: fromDate, lte: toDate },
        },
      }),
      prisma.qualityassessment.aggregate({
        where: {
          teacherId,
          weekStart: { gte: fromDate, lte: toDate },
          managerApproved: true,
        },
        _sum: { bonusAwarded: true },
      }),
    ]);

    const absenceDeduction = absenceRecords.reduce((sum, r) => sum + r.deductionApplied, 0);
    const bonuses = Math.round(bonusRecords._sum?.bonusAwarded ?? 0);

    // Calculate lateness deduction (simplified)
    let latenessDeduction = 0;
    // This would need the full lateness calculation logic from admin API

    // Get payment status
    const period = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, "0")}`;
    const payment = await prisma.teachersalarypayment.findUnique({
      where: {
        teacherId_period: { teacherId, period },
      },
      select: { status: true },
    });

    const totalSalary = Math.round(baseSalary - latenessDeduction - absenceDeduction + bonuses);

    const result = {
      id: teacherId,
      name: teacher.ustazname,
      baseSalary: Math.round(baseSalary),
      latenessDeduction: Math.round(latenessDeduction),
      absenceDeduction: Math.round(absenceDeduction),
      bonuses,
      totalSalary,
      numStudents: students.length,
      teachingDays: dailyEarnings.size,
      status: (payment?.status as "Paid" | "Unpaid") || "Unpaid",
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Direct calculation error:", error);
    return NextResponse.json(
      { error: "Failed to calculate salary" },
      { status: 500 }
    );
  }
}