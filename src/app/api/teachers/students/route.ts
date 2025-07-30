import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
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

    const count = await prisma.wpos_wpdatatable_23.count({
      where: { ustaz: user.id },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching student count:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
