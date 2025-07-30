import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    (session.user as { id: string; role: string }).role !== "teacher"
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const user = session.user as { id: string; role: string };
  const url = new URL(req.url);
  const unread = url.searchParams.get("unread");
  // Always include userId, add read filter if needed
  const where: any = { userId: Number(user.id) };
  if (unread === "1") {
    where.read = false;
  }
  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(notifications);
}
