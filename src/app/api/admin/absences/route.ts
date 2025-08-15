import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const absences = await prisma.absencerecord.findMany({
      where: {
        classDate: { gte: startDate }
      },
      include: {
        wpos_wpdatatable_24: {
          select: { ustazname: true }
        },
        permissionrequest: {
          select: { reasonCategory: true }
        }
      },
      orderBy: { classDate: "desc" }
    });

    return NextResponse.json({ absences });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch absences" }, { status: 500 });
  }
}