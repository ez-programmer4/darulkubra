import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { format } from "date-fns";
import { createSalaryCalculator } from "@/lib/salary-calculator";

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

// Enhanced salary calculation using teacher change history
async function calculateTeacherSalaryDirect(
  teacherId: string,
  fromDate: Date,
  toDate: Date,
  includeDetails: boolean
) {
  try {
    // Use the same salary calculator that includes teacher change history
    const calculator = await createSalaryCalculator();

    if (includeDetails) {
      const details = await calculator.getTeacherSalaryDetails(
        teacherId,
        fromDate,
        toDate
      );
      return NextResponse.json(details);
    } else {
      const salary = await calculator.calculateTeacherSalary(
        teacherId,
        fromDate,
        toDate
      );
      return NextResponse.json(salary);
    }
  } catch (error) {
    console.error("Direct calculation error:", error);
    return NextResponse.json(
      { error: "Failed to calculate salary" },
      { status: 500 }
    );
  }
}
