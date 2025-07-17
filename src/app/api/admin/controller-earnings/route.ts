import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const controllerUsername =
    searchParams.get("controllerUsername") || undefined;
  const paidOutParam = searchParams.get("paidOut");
  let paidOut: boolean | undefined = undefined;
  if (paidOutParam === "true") paidOut = true;
  if (paidOutParam === "false") paidOut = false;

  try {
    const earnings = await prisma.controllerEarning.findMany({
      where: {
        ...(controllerUsername ? { controllerUsername } : {}),
        ...(paidOut !== undefined ? { paidOut } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(earnings);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch controller earnings" },
      { status: 500 }
    );
  }
}
