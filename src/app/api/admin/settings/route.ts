import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get registrar learning settings
    const learningSettings = await prisma.registralearningsconfig.findMany({
      where: {
        key: {
          in: ['reading_reward', 'hifz_reward']
        }
      }
    });

    // Get general settings
    const generalSettings = await prisma.setting.findMany({
      where: {
        key: {
          in: ['include_sundays_in_salary', 'teacher_salary_visible']
        }
      }
    });

    const learningMap = learningSettings.reduce((acc, setting) => {
      acc[setting.key] = parseFloat(setting.value);
      return acc;
    }, {} as Record<string, number>);

    const generalMap = generalSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value === 'true';
      return acc;
    }, {} as Record<string, boolean>);

    return NextResponse.json({
      settings: [
        { key: 'reading_reward', value: String(learningMap.reading_reward || 50) },
        { key: 'hifz_reward', value: String(learningMap.hifz_reward || 100) },
        { key: 'include_sundays_in_salary', value: String(generalMap.include_sundays_in_salary || false) },
        { key: 'teacher_salary_visible', value: String(generalMap.teacher_salary_visible || false) },
      ]
    });

  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key, value } = await request.json();

    if (!key || value == null) {
      return NextResponse.json({ error: "Key and value are required" }, { status: 400 });
    }

    const stringValue = String(value);

    // Handle different setting types
    if (key === 'reading_reward' || key === 'hifz_reward') {
      await prisma.registralearningsconfig.upsert({
        where: { key },
        update: { value: stringValue },
        create: { key, value: stringValue }
      });
    } else {
      // Handle general settings
      await prisma.setting.upsert({
        where: { key },
        update: { value: stringValue, updatedAt: new Date() },
        create: { key, value: stringValue, updatedAt: new Date() }
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}