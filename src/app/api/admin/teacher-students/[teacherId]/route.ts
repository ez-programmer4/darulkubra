import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import dayjs from "dayjs";

export async function GET(
  request: NextRequest,
  { params }: { params: { teacherId: string } }
) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token || token.role !== "registral") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || "1");
    const year = parseInt(searchParams.get("year") || "2024");
    const { teacherId } = params;

    // Get month range
    const from = dayjs(`${year}-${String(month).padStart(2, "0")}-01`)
      .startOf("month")
      .toDate();
    const to = dayjs(from).endOf("month").toDate();

    // Get working days configuration
    const settings = await prisma.setting.findFirst({
      where: { key: "include_sundays_in_salary" },
    });
    const includeSundays = settings?.value === "true";

    // Calculate working days
    const workingDays = calculateWorkingDays(from, to, includeSundays);
    const daysInMonth = dayjs(to).date();

    // Get teacher's students for the period
    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        ustaz: teacherId,
        startdate: {
          lte: to,
        },
        OR: [
          { status: "Active" },
          { status: "Not yet" },
          { status: "On Progress" },
        ],
      },
      select: {
        wdt_ID: true,
        name: true,
        package: true,
        daypackages: true,
        startdate: true,
        status: true,
      },
    });

    // Get package salaries
    const packageSalaries = await prisma.packageSalary.findMany();
    const packageSalaryMap = packageSalaries.reduce((acc, ps) => {
      acc[ps.packageName] = Number(ps.salaryPerStudent);
      return acc;
    }, {} as Record<string, number>);

    // Group students by package and calculate breakdown
    const packageBreakdown = Object.entries(
      students.reduce((acc, student) => {
        const pkg = student.package || "0 Fee";
        if (!acc[pkg]) {
          acc[pkg] = {
            packageName: pkg,
            students: [],
            count: 0,
            salaryPerStudent: packageSalaryMap[pkg] || 0,
            totalSalary: 0,
          };
        }
        acc[pkg].students.push(student);
        acc[pkg].count++;
        acc[pkg].totalSalary += packageSalaryMap[pkg] || 0;
        return acc;
      }, {} as Record<string, any>)
    ).map(([_, data]) => data);

    // Get Zoom link activity for verification
    const zoomActivity = await getZoomLinkActivity(teacherId, from, to);

    return NextResponse.json({
      teacherId,
      month,
      year,
      daysInMonth,
      workingDays,
      includeSundays,
      totalStudents: students.length,
      packageBreakdown,
      zoomActivity,
      students: students.map((s) => ({
        id: s.wdt_ID,
        name: s.name,
        package: s.package,
        dayPackage: s.daypackages,
        status: s.status,
        startDate: s.startdate,
      })),
    });
  } catch (error) {
    console.error("Teacher students breakdown error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function calculateWorkingDays(from: Date, to: Date, includeSundays: boolean) {
  let workingDays = 0;
  let current = dayjs(from);
  const end = dayjs(to);

  while (current.isBefore(end) || current.isSame(end, "day")) {
    const dayOfWeek = current.day();
    if (includeSundays || dayOfWeek !== 0) {
      workingDays++;
    }
    current = current.add(1, "day");
  }

  return workingDays;
}

async function getZoomLinkActivity(teacherId: string, from: Date, to: Date) {
  const zoomLinks = await prisma.wpos_zoom_links.findMany({
    where: {
      ustazid: teacherId,
      sent_time: {
        gte: from,
        lte: to,
      },
    },
    select: {
      sent_time: true,
      studentid: true,
    },
  });

  const uniqueDays = new Set(
    zoomLinks.map((link) => dayjs(link.sent_time).format("YYYY-MM-DD"))
  );

  const dailyActivity = Array.from(uniqueDays).map((date) => ({
    date,
    linksCount: zoomLinks.filter(
      (link) => dayjs(link.sent_time).format("YYYY-MM-DD") === date
    ).length,
  }));

  return {
    totalDays: uniqueDays.size,
    totalLinks: zoomLinks.length,
    dailyActivity,
    averageLinksPerDay:
      uniqueDays.size > 0 ? Math.round(zoomLinks.length / uniqueDays.size) : 0,
  };
}
