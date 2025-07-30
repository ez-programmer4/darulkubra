import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    (session.user as { id: string; role: string }).role !== "admin"
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const user = session.user as { id: string; role: string };
  const notificationId = Number(params.id);
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });
  if (!notification || notification.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
  return NextResponse.json({ message: "Marked as read" });
}
