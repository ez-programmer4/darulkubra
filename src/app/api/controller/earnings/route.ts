import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!session || session.role !== "controller" || !session.username) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const earnings = await prisma.controllerEarning.findMany({
      where: { controllerUsername: session.username },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(earnings);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch earnings" },
      { status: 500 }
    );
  }
}
