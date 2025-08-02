import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const reasons = await prisma.permissionreason.findMany({
      orderBy: { createdAt: "desc" },
      select: { reason: true },
    });
    return NextResponse.json({ reasons: reasons.map((r) => r.reason) });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
