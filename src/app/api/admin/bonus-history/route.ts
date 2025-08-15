import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const teacherId = url.searchParams.get("teacherId");

  if (!teacherId) {
    return NextResponse.json(
      { error: "Missing teacherId parameter" },
      { status: 400 }
    );
  }

  try {
    const bonusRecords = await prisma.qualityassessment.findMany({
      where: {
        teacherId,
        bonusAwarded: { gt: 0 },
      },
      select: {
        bonusAwarded: true,
        weekStart: true,
        overallQuality: true,
      },
      orderBy: {
        weekStart: "desc",
      },
    });

    const bonuses = bonusRecords.map((record) => ({
      amount: record.bonusAwarded,
      period: new Date(record.weekStart).toLocaleDateString(),
      reason: `${record.overallQuality} Performance`,
    }));

    return NextResponse.json({ bonuses });
  } catch (error) {
    console.error("Bonus history fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bonus history" },
      { status: 500 }
    );
  }
}