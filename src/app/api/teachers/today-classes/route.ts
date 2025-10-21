import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { getEthiopianTime } from "@/lib/ethiopian-time";

function normalize(str: string | null | undefined) {
  return (str || "").trim().toLowerCase();
}

function packageIncludesToday(pkg: string, dayIndex: number) {
  // dayIndex: 0 Sun ... 6 Sat
  const p = normalize(pkg);
  if (!p) return true;
  if (p === "all days" || p === "alldays" || p === "everyday") return true;
  const map: Record<string, number[]> = {
    mwf: [1, 3, 5],
    tts: [2, 4, 6],
    ss: [0, 6],
    weekdays: [1, 2, 3, 4, 5],
    weekend: [0, 6],
  };
  if (map[p]) return map[p].includes(dayIndex);
  // Try tokenized days like "mon,wed,fri" or "mon wed"
  const tokens = p.split(/[^a-z]+/).filter(Boolean);
  if (tokens.length > 0) {
    const dayMap: Record<string, number> = {
      sun: 0,
      mon: 1,
      tue: 2,
      tues: 2,
      wed: 3,
      thu: 4,
      thur: 4,
      thuers: 4,
      fri: 5,
      sat: 6,
    };
    const days = tokens
      .map((t) => dayMap[t])
      .filter((n) => n !== undefined) as number[];
    if (days.length > 0) return days.includes(dayIndex);
  }
  // Default: include
  return true;
}

export async function GET(req: NextRequest) {
  try {
    const session = (await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    })) as any;
    const role = session?.role || session?.user?.role;
    if (!session || role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const teacherId = String(session?.user?.id || session?.id || "");
    if (!teacherId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use Ethiopian time to get correct day of week
    const today = getEthiopianTime();
    const dayIndex = today.getDay();

    const records = await prisma.wpos_ustaz_occupied_times.findMany({
      where: { ustaz_id: teacherId },
      select: {
        time_slot: true,
        daypackage: true,
        student_id: true,
        student: {
          select: {
            wdt_ID: true,
            name: true,
            daypackages: true,
            subject: true,
          },
        },
      },
    });

    const classes = records
      .filter((r) => packageIncludesToday(r.daypackage, dayIndex))
      .map((r) => ({
        time: r.time_slot,
        daypackage: r.daypackage,
        studentId: r.student_id,
        studentName: r.student?.name || "-",
        subject: r.student?.subject || "-",
      }))
      .sort((a, b) => a.time.localeCompare(b.time));

    return NextResponse.json({ date: today.toISOString(), classes });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
