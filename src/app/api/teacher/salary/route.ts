import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createSalaryCalculator } from "@/lib/salary-calculator";
import { parseISO } from "date-fns";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Validate session
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if teacher salary visibility is enabled
    const [salaryVisibilitySetting, customMessageSetting, adminContactSetting] =
      await Promise.all([
        prisma.setting.findUnique({
          where: { key: "teacher_salary_visible" },
        }),
        prisma.setting.findUnique({
          where: { key: "teacher_salary_hidden_message" },
        }),
        prisma.setting.findUnique({
          where: { key: "admin_contact_info" },
        }),
      ]);

    // Default to true if setting doesn't exist
    const showTeacherSalary =
      salaryVisibilitySetting?.value === "true" || !salaryVisibilitySetting;

    if (!showTeacherSalary) {
      return NextResponse.json(
        {
          error:
            customMessageSetting?.value ||
            "Salary information is currently hidden by administrator. Please contact the administration for more details.",
          showTeacherSalary: false,
          adminContact:
            adminContactSetting?.value ||
            "Contact the administration office for assistance.",
        },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing startDate or endDate" },
        { status: 400 }
      );
    }

    // Parse and validate dates
    const from = parseISO(startDate);
    const to = parseISO(endDate);

    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
      return NextResponse.json(
        { error: "Invalid date range. Use UTC ISO format (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    // Get teacher's salary data
    const calculator = await createSalaryCalculator();
    const salaryData = await calculator.calculateTeacherSalary(
      session.id,
      from,
      to
    );

    if (!salaryData) {
      return NextResponse.json(
        { error: "No salary data found for this period" },
        { status: 404 }
      );
    }

    // Ensure net salary consistency - use breakdown.summary.netSalary
    const correctedSalaryData = {
      ...salaryData,
      totalSalary: salaryData.breakdown.summary.netSalary,
    };

    return NextResponse.json(correctedSalaryData);
  } catch (error: any) {
    console.error("Error in teacher salary API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
