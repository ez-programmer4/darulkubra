import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (
    !session ||
    !["registral", "controller", "admin"].includes(session.role)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const controllers = await prisma.wpos_wpdatatable_28.findMany({
      select: { username: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ controllers });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch controllers" },
      { status: 500 }
    );
  }
}
