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
        { error: "Salary access is currently disabled by administrator" },
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
      `${
        process.env.NEXTAUTH_URL
      }/api/admin/teacher-payments?startDate=${fromDate.toISOString()}&endDate=${toDate.toISOString()}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.INTERNAL_API_KEY || "internal"}`,
        },
      }
    );

    if (!res.ok) {
      // Fallback to direct calculation if admin API fails
      return await calculateTeacherSalaryDirect(
        teacherId,
        fromDate,
        toDate,
        includeDetails
      );
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
        `${
          process.env.NEXTAUTH_URL
        }/api/admin/teacher-payments?teacherId=${teacherId}&from=${fromDate.toISOString()}&to=${toDate.toISOString()}`,
        {
          headers: {
            Authorization: `Bearer ${
              process.env.INTERNAL_API_KEY || "internal"
            }`,
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

// Enhanced salary calculation using assignment tracking
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
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Get teacher's assignments during the period
    const assignments = await prisma.wpos_ustaz_occupied_times.findMany({
      where: {
        ustaz_id: teacherId,
        occupied_at: { lte: toDate },
        OR: [{ end_at: null }, { end_at: { gte: fromDate } }],
      },
      include: {
        student: {
          select: {
            wdt_ID: true,
            name: true,
            package: true,
          },
        },
      },
    });

    // Calculate base salary from zoom links with package rates
    let baseSalary = 0;

    for (const assignment of assignments) {
      // Get zoom links for this assignment period
      const assignmentStart =
        assignment.occupied_at && assignment.occupied_at > fromDate
          ? assignment.occupied_at
          : fromDate;
      const assignmentEnd =
        assignment.end_at && assignment.end_at < toDate
          ? assignment.end_at
          : toDate;

      const zoomLinks = await prisma.wpos_zoom_links.findMany({
        where: {
          ustazid: teacherId,
          studentid: assignment.student_id,
          sent_time: {
            gte: assignmentStart,
            lte: assignmentEnd,
          },
          packageRate: { not: null },
        },
        select: {
          packageRate: true,
        },
      });

      // Sum package rates from zoom links
      baseSalary += zoomLinks.reduce(
        (sum, link) => sum + Number(link.packageRate || 0),
        0
      );
    }

    // Get payment record with deductions and bonuses
    const period = `${fromDate.getFullYear()}-${String(
      fromDate.getMonth() + 1
    ).padStart(2, "0")}`;

    const payment = await prisma.teachersalarypayment.findUnique({
      where: {
        teacherId_period: { teacherId, period },
      },
      select: {
        status: true,
        latenessDeduction: true,
        absenceDeduction: true,
        bonuses: true,
      },
    });

    const latenessDeduction = payment?.latenessDeduction || 0;
    const absenceDeduction = payment?.absenceDeduction || 0;
    const bonuses = payment?.bonuses || 0;

    const totalSalary = Math.round(
      baseSalary - latenessDeduction - absenceDeduction + bonuses
    );

    const result = {
      id: teacherId,
      name: teacher.ustazname,
      baseSalary: Math.round(baseSalary),
      latenessDeduction: Math.round(latenessDeduction),
      absenceDeduction: Math.round(absenceDeduction),
      bonuses: Math.round(bonuses),
      totalSalary,
      numStudents: assignments.length,
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
