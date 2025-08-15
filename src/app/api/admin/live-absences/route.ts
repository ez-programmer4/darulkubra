import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user ||
      (session.user as { role?: string }).role !== "admin"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const url = new URL(req.url);
    const daysParam = url.searchParams.get("days");
    const days =
      Number.isFinite(Number(daysParam)) && Number(daysParam) > 0
        ? Number(daysParam)
        : 30;

    const since = new Date();
    since.setDate(since.getDate() - days);

    const absences = await prisma.absencerecord.findMany({
      where: {
        classDate: {
          gte: since,
        },
      },
      include: {
        wpos_wpdatatable_24: {
          select: { ustazname: true },
        },
        permissionrequest: {
          select: { reasonCategory: true },
        },
      },
      orderBy: { classDate: "desc" },
    });

    return NextResponse.json({ absences });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
