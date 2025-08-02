import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user ||
      (session.user as { id: string; role: string }).role !== "admin"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing from or to date parameters" },
        { status: 400 }
      );
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    // Get attendance statistics for the date range
    const stats = await prisma.wpos_wpdatatable_23.aggregate({
      where: {
        registrationdate: {
          gte: fromDate,
          lte: toDate,
        },
      },
      _count: {
        wdt_ID: true,
      },
    });

    // Get students by status
    const statusStats = await prisma.wpos_wpdatatable_23.groupBy({
      by: ["status"],
      where: {
        registrationdate: {
          gte: fromDate,
          lte: toDate,
        },
      },
      _count: {
        wdt_ID: true,
      },
    });

    // Get students by teacher
    const teacherStats = await prisma.wpos_wpdatatable_23.groupBy({
      by: ["ustaz"],
      where: {
        registrationdate: {
          gte: fromDate,
          lte: toDate,
        },
      },
      _count: {
        wdt_ID: true,
      },
    });

    // Get teacher names for the stats
    const teacherIds = teacherStats
      .map((stat) => stat.ustaz)
      .filter((id): id is string => id !== null);
    const teachers = await prisma.wpos_wpdatatable_24.findMany({
      where: {
        ustazid: {
          in: teacherIds,
        },
      },
      select: {
        ustazid: true,
        ustazname: true,
      },
    });

    const teacherMap = Object.fromEntries(
      teachers.map((t) => [t.ustazid, t.ustazname])
    );

    return NextResponse.json({
      totalStudents: stats._count.wdt_ID,
      statusBreakdown: statusStats.map((stat) => ({
        status: stat.status,
        count: stat._count.wdt_ID,
      })),
      teacherBreakdown: teacherStats.map((stat) => ({
        teacherId: stat.ustaz,
        teacherName: stat.ustaz
          ? teacherMap[stat.ustaz] || "Unknown"
          : "Unknown",
        count: stat._count.wdt_ID,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
