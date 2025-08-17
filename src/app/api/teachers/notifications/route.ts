import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
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
    const where: any = { userId: user.id, userRole: "teacher" };
    if (unread === "1") {
      where.isRead = false;
    }
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Teacher notifications API error:", error);
    // Return empty array if table doesn't exist
    return NextResponse.json([]);
  }
}
