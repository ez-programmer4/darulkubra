import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    (session.user as { id: string; role: string }).role !== "admin"
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const user = session.user as { id: string; role: string };
  const { phone } = await req.json();
  if (!phone) {
    return NextResponse.json(
      { error: "Phone number is required" },
      { status: 400 }
    );
  }
  try {
    // Use the correct field name and type for updating the admin's phone number
    await prisma.admin.update({
      where: { id: Number(user.id) },
      data: { phone: String(phone) },
    });
    return NextResponse.json({ message: "Phone number updated" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update phone number" },
      { status: 500 }
    );
  }
}
