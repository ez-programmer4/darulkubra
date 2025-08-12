import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = (await getToken({ req, secret: process.env.NEXTAUTH_SECRET })) as any;
    const role = session?.role || session?.user?.role;
    if (!session || role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const teacherId = String(session?.user?.id || session?.id || "");
    if (!teacherId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
        zoom_links: {
          select: { sent_time: true, clicked_at: true },
          orderBy: { sent_time: "desc" },
          take: 1,
        },
      },
      orderBy: [{ daypackages: "asc" }, { name: "asc" }],
    });

    const groups: Record<string, any[]> = {};
    for (const s of students) {
      const key = (s.daypackages || "Unknown").trim();
      if (!groups[key]) groups[key] = [];
      const last = (s.zoom_links && s.zoom_links[0]) || undefined;
      groups[key].push({
        id: s.wdt_ID,
        name: s.name,
        phone: s.phoneno,
        subject: s.subject,
        pack: s.package,
        daypackages: s.daypackages,
        occupied: s.occupiedTimes,
        lastZoomSentAt: last?.sent_time ?? null,
        lastZoomClickedAt: last?.clicked_at ?? null,
      });
    }

    const result = Object.entries(groups).map(([group, students]) => ({ group, students }));
    return NextResponse.json({ groups: result });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}