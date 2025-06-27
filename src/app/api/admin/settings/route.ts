import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/server-auth";

// GET all settings
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
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
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { key, value }: { key: string; value: string } = await req.json();
    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }
    const updated = await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
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
