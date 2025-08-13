import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = (await getToken({ req, secret: process.env.NEXTAUTH_SECRET })) as any;
    if (!session || session.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const teacherId = String(session?.user?.id || session?.id || "");
    if (!teacherId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const daysParam = searchParams.get("days") || "30";
    const days = Math.max(1, parseInt(daysParam, 10));

    const fromDate = new Date();
    fromDate.setHours(0, 0, 0, 0);
    fromDate.setDate(fromDate.getDate() - days + 1);

    const absences = await prisma.absencerecord.findMany({
      where: {
        teacherId,
        classDate: { gte: fromDate },
      },
      include: {
        wpos_wpdatatable_24: { select: { ustazname: true } },
        permissionrequest: { select: { reasonCategory: true } },
      },
      orderBy: { classDate: "desc" },
    });

    return NextResponse.json({ absences });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}