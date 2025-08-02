import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = (await getToken({
      req: req,
      secret: process.env.NEXTAUTH_SECRET,
    })) as any;

    if (!session?.user || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const user = session.user;

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
