import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Validate admin session
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current settings
    const [salaryVisibility, customMessage, adminContact] = await Promise.all([
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

    return NextResponse.json({
      showTeacherSalary:
        salaryVisibility?.value === "true" || !salaryVisibility,
      customMessage:
        customMessage?.value ||
        "Salary information is currently hidden by administrator. Please contact the administration for more details.",
      adminContact:
        adminContact?.value ||
        "Contact the administration office for assistance.",
    });
  } catch (error: any) {
    console.error("Error fetching teacher salary settings:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Validate admin session
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { showTeacherSalary, customMessage, adminContact } = await req.json();

    // Update settings
    const updates = [];

    if (typeof showTeacherSalary === "boolean") {
      updates.push(
        prisma.setting.upsert({
          where: { key: "teacher_salary_visible" },
          update: { value: showTeacherSalary.toString() },
          create: {
            key: "teacher_salary_visible",
            value: showTeacherSalary.toString(),
            updatedAt: new Date(),
          },
        })
      );
    }

    if (customMessage) {
      updates.push(
        prisma.setting.upsert({
          where: { key: "teacher_salary_hidden_message" },
          update: { value: customMessage },
          create: {
            key: "teacher_salary_hidden_message",
            value: customMessage,
            updatedAt: new Date(),
          },
        })
      );
    }

    if (adminContact) {
      updates.push(
        prisma.setting.upsert({
          where: { key: "admin_contact_info" },
          update: { value: adminContact },
          create: {
            key: "admin_contact_info",
            value: adminContact,
            updatedAt: new Date(),
          },
        })
      );
    }

    await Promise.all(updates);

    // Clear salary calculator cache since this affects calculations
    try {
      const { createSalaryCalculator } = await import(
        "@/lib/salary-calculator"
      );
      const calculator = await createSalaryCalculator();
      calculator.clearCache();
      console.log(
        "✅ Salary calculator cache cleared after teacher salary setting change"
      );
    } catch (error) {
      console.warn("⚠️ Failed to clear salary calculator cache:", error);
    }

    // Clear teacher payments API calculator cache
    try {
      const { clearCalculatorCache } = await import("@/lib/calculator-cache");
      clearCalculatorCache();
      console.log(
        "✅ Teacher payments calculator cache cleared after teacher salary setting change"
      );
    } catch (error) {
      console.warn(
        "⚠️ Failed to clear teacher payments calculator cache:",
        error
      );
    }

    return NextResponse.json({
      success: true,
      showTeacherSalary,
      customMessage,
      adminContact,
    });
  } catch (error: any) {
    console.error("Error updating teacher salary settings:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
