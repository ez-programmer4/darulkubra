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
          in: ['include_sundays_in_salary', 'allow_teachers_see_salary']
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
      reading_reward: learningMap.reading_reward || 50,
      hifz_reward: learningMap.hifz_reward || 100,
      include_sundays_in_salary: generalMap.include_sundays_in_salary || false,
      allow_teachers_see_salary: generalMap.allow_teachers_see_salary || false,
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

    const { reading_reward, hifz_reward, include_sundays_in_salary, allow_teachers_see_salary } = await request.json();

    // Validate and convert values
    const readingRewardValue = reading_reward != null ? String(reading_reward) : '50';
    const hifzRewardValue = hifz_reward != null ? String(hifz_reward) : '100';
    const includeSundaysValue = include_sundays_in_salary != null ? String(include_sundays_in_salary) : 'false';
    const allowTeachersSalaryValue = allow_teachers_see_salary != null ? String(allow_teachers_see_salary) : 'false';

    await prisma.$transaction([
      // Learning config settings
      prisma.registralearningsconfig.upsert({
        where: { key: 'reading_reward' },
        update: { value: readingRewardValue },
        create: { key: 'reading_reward', value: readingRewardValue }
      }),
      prisma.registralearningsconfig.upsert({
        where: { key: 'hifz_reward' },
        update: { value: hifzRewardValue },
        create: { key: 'hifz_reward', value: hifzRewardValue }
      }),
      // General settings
      prisma.setting.upsert({
        where: { key: 'include_sundays_in_salary' },
        update: { value: includeSundaysValue },
        create: { key: 'include_sundays_in_salary', value: includeSundaysValue }
      }),
      prisma.setting.upsert({
        where: { key: 'allow_teachers_see_salary' },
        update: { value: allowTeachersSalaryValue },
        create: { key: 'allow_teachers_see_salary', value: allowTeachersSalaryValue }
      })
    ]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}