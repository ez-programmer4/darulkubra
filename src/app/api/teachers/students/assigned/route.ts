import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = (await getToken({ req, secret: process.env.NEXTAUTH_SECRET })) as any;
    if (!session?.user || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const teacherId = session.user.id as string;

    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        ustaz: teacherId,
        status: { in: ["active", "not yet"] },
      },
      select: {
        wdt_ID: true,
        name: true,
        phoneno: true,
        subject: true,
        package: true,
        daypackages: true,
        occupiedTimes: {
          select: {
            time_slot: true,
            daypackage: true,
          },
        },
      },
      orderBy: [{ daypackages: "asc" }, { name: "asc" }],
    });

    // Group by student.daypackages
    const groups: Record<string, any[]> = {};
    for (const s of students) {
      const key = (s.daypackages || "Unknown").trim();
      if (!groups[key]) groups[key] = [];
      groups[key].push({
        id: s.wdt_ID,
        name: s.name,
        phone: s.phoneno,
        subject: s.subject,
        pack: s.package,
        daypackages: s.daypackages,
        occupied: s.occupiedTimes,
      });
    }

    const result = Object.entries(groups).map(([group, students]) => ({ group, students }));
    return NextResponse.json({ groups: result });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}