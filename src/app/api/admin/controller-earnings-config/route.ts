import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ConfigSchema = z.object({
  mainBaseRate: z.number().min(0).max(1000),
  referralBaseRate: z.number().min(0).max(1000),
  leavePenaltyMultiplier: z.number().min(0).max(10),
  leaveThreshold: z.number().min(0).max(20),
  unpaidPenaltyMultiplier: z.number().min(0).max(10),
  referralBonusMultiplier: z.number().min(0).max(10),
  targetEarnings: z.number().min(0).max(10000),
  effectiveFrom: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user ||
      (session.user as { id: string; role: string }).role !== "admin"
    ) {
      return NextResponse.json(
        { error: "Forbidden: Admins only." },
        { status: 403 }
      );
    }

    // Get the current active configuration
    const currentConfig = await prisma.controllerEarningsConfig.findFirst({
      where: { isActive: true },
      orderBy: { effectiveFrom: "desc" },
    });

    // Get all configurations for history
    const allConfigs = await prisma.controllerEarningsConfig.findMany({
      orderBy: { effectiveFrom: "desc" },
      include: {
        admin: {
          select: {
            name: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json({
      current: currentConfig,
      history: allConfigs,
    });
  } catch (err) {
    const error = err as Error;
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch earnings config." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user ||
      (session.user as { id: string; role: string }).role !== "admin"
    ) {
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

    const {
      mainBaseRate,
      referralBaseRate,
      leavePenaltyMultiplier,
      leaveThreshold,
      unpaidPenaltyMultiplier,
      referralBonusMultiplier,
      targetEarnings,
      effectiveFrom,
    } = parseResult.data;

    const user = session.user as { id: string; role: string };

    // Deactivate all existing configurations
    await prisma.controllerEarningsConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create new configuration
    const config = await prisma.controllerEarningsConfig.create({
      data: {
        mainBaseRate,
        referralBaseRate,
        leavePenaltyMultiplier,
        leaveThreshold,
        unpaidPenaltyMultiplier,
        referralBonusMultiplier,
        targetEarnings,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        isActive: true,
        adminId: parseInt(user.id),
      },
    });

    // Log the change
    await prisma.auditLog.create({
      data: {
        actionType: "earnings_config_updated",
        adminId: parseInt(user.id),
        details: JSON.stringify({
          mainBaseRate,
          referralBaseRate,
          leavePenaltyMultiplier,
          leaveThreshold,
          unpaidPenaltyMultiplier,
          referralBonusMultiplier,
          targetEarnings,
        }),
      },
    });

    return NextResponse.json(config, { status: 201 });
  } catch (err) {
    const error = err as Error;
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to create earnings config." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user ||
      (session.user as { id: string; role: string }).role !== "admin"
    ) {
      return NextResponse.json(
        { error: "Forbidden: Admins only." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Configuration ID is required" },
        { status: 400 }
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

    const user = session.user as { id: string; role: string };

    const config = await prisma.controllerEarningsConfig.update({
      where: { id: parseInt(id) },
      data: {
        ...parseResult.data,
        adminId: parseInt(user.id),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(config);
  } catch (err) {
    const error = err as Error;
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to update earnings config." },
      { status: 500 }
    );
  }
}
