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

    const settings = await prisma.registralearningsconfig.findMany({
      where: {
        key: {
          in: ['reading_reward', 'hifz_reward']
        }
      }
    });

    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = parseFloat(setting.value);
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      reading_reward: settingsMap.reading_reward || 50,
      hifz_reward: settingsMap.hifz_reward || 100,
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

    const { reading_reward, hifz_reward } = await request.json();

    // Validate and convert values
    const readingRewardValue = reading_reward != null ? String(reading_reward) : '50';
    const hifzRewardValue = hifz_reward != null ? String(hifz_reward) : '100';

    await prisma.$transaction([
      prisma.registralearningsconfig.upsert({
        where: { key: 'reading_reward' },
        update: { value: readingRewardValue },
        create: { key: 'reading_reward', value: readingRewardValue }
      }),
      prisma.registralearningsconfig.upsert({
        where: { key: 'hifz_reward' },
        update: { value: hifzRewardValue },
        create: { key: 'hifz_reward', value: hifzRewardValue }
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