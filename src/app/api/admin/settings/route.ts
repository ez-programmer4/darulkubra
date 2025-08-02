import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

// GET all settings
export async function GET(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const settings = await prisma.setting.findMany();
    return NextResponse.json({
      settings: settings.map((s: { key: string; value: string | null }) => ({
        key: s.key,
        value: s.value,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT to update or create a setting
export async function PUT(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { key, value }: { key: string; value: string } = await req.json();
    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }
    const updated = await prisma.setting.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: { key, value, updatedAt: new Date() },
    });
    return NextResponse.json({
      setting: { key: updated.key, value: updated.value },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 }
    );
  }
}
