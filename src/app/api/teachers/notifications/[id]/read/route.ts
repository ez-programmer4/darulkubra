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
    (session.user as { id: string; role: string }).role !== "teacher"
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const user = session.user as { id: string; role: string };
  const notificationId = Number(params.id);
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });
  if (!notification || String(notification.userId) !== String(user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
  return NextResponse.json({ message: "Marked as read" });
}
