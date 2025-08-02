import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";

const ConfigSchema = z.object({
  configType: z.enum(["lateness", "absence", "attendance", "bonus"]),
  key: z.string().min(1),
  value: z.string().min(1),
  effectiveMonths: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admins only." },
        { status: 403 }
      );
    }
    const configs = await prisma.deductionbonusconfig.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(configs);
  } catch (err) {
    const error = err as Error;
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch config." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admins only." },
        { status: 403 }
      );
    }
    const body = await req.json();
    const parseResult = ConfigSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.issues },
        { status: 400 }
      );
    }
    const { configType, key, value, effectiveMonths } = parseResult.data;
    const config = await prisma.deductionbonusconfig.create({
      data: {
        configType,
        key,
        value,
        effectiveMonths,
        adminId: user.id,
        updatedAt: new Date(),
      },
    });
    return NextResponse.json(config, { status: 201 });
  } catch (err) {
    const error = err as Error;
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to create config." },
      { status: 500 }
    );
  }
}
