import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Check current Sunday setting
    const setting = await prisma.setting.findUnique({
      where: { key: "include_sundays_in_salary" },
    });

    return NextResponse.json({
      currentSetting: setting,
      message: setting
        ? `Sunday inclusion is currently: ${
            setting.value === "true" ? "ENABLED" : "DISABLED"
          }`
        : "Sunday inclusion setting does not exist in database",
    });
  } catch (error: any) {
    console.error("Error checking Sunday setting:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { includeSundays } = await req.json();

    if (typeof includeSundays !== "boolean") {
      return NextResponse.json(
        { error: "includeSundays must be a boolean" },
        { status: 400 }
      );
    }

    // Create or update the Sunday inclusion setting
    const setting = await prisma.setting.upsert({
      where: { key: "include_sundays_in_salary" },
      update: {
        value: includeSundays.toString(),
        updatedAt: new Date(),
      },
      create: {
        key: "include_sundays_in_salary",
        value: includeSundays.toString(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      setting,
      message: `Sunday inclusion has been ${
        includeSundays ? "ENABLED" : "DISABLED"
      }`,
    });
  } catch (error: any) {
    console.error("Error updating Sunday setting:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
