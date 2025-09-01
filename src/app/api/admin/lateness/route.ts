import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const { searchParams } = url;
  const date =
    searchParams.get("date") || new Date().toISOString().split("T")[0];
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayStart.getDate() + 1);

  // New: pagination and filters
  const pageParam = Number(searchParams.get("page") || 1);
  const limitParam = Number(searchParams.get("limit") || 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 10;
  const controllerFilter = searchParams.get("controllerId") || "";
  const teacherFilter = searchParams.get("teacherId") || ""; // may be id or name

  // Get base deduction amount from settings
  const baseDeductionSetting = await prisma.setting.findUnique({
    where: { key: "lateness_base_deduction" },
  });
  const baseDeductionAmount = baseDeductionSetting?.value ? parseFloat(baseDeductionSetting.value) : 30;

  // Fetch lateness deduction config from DB - no fallback tiers
  const latenessConfigs = await prisma.latenessdeductionconfig.findMany({
    orderBy: [{ tier: "asc" }, { startMinute: "asc" }],
  });
  
  // Only use database configuration, no predefined tiers
  if (latenessConfigs.length === 0) {
    return NextResponse.json({ latenessData: [], total: 0, page, limit });
  }
  
  const excusedThreshold = Math.min(
    ...latenessConfigs.map((c) => c.excusedThreshold ?? 0)
  );
  const tiers = latenessConfigs.map((c) => ({
    start: c.startMinute,
    end: c.endMinute,
    percent: c.deductionPercent,
  }));
  const maxTierEnd = Math.max(...latenessConfigs.map((c) => c.endMinute));

  try {
    // 2. Get all students with their teacher and zoom links for the day
    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        status: { in: ["active", "not yet"] },
      },
      include: {
        teacher: true,
        controller: true,
        zoom_links: {
          where: {
            sent_time: {
              gte: dayStart,
              lt: dayEnd,
            },
          },
        },
        occupiedTimes: {
          select: {
            time_slot: true,
          },
        },
      },
    });

    // 3. Calculate lateness for each student
    const allRecords = students
      .map((student) => {
        const timeSlot = student.occupiedTimes?.[0]?.time_slot as string | undefined;
        if (!timeSlot || !student.ustaz) return null;

        // Robust time parser supporting "HH:mm", "HH:mm:ss", and "h[:mm[:ss]] AM/PM"
        function parseTimeToHms(raw: string): { h: number; m: number; s: number } {
          if (!raw) return { h: 0, m: 0, s: 0 };
          const trimmed = raw.trim().toUpperCase();

          // 12-hour: "h[:mm[:ss]] AM/PM"
          const ampmMatch = trimmed.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(AM|PM)$/);
          if (ampmMatch) {
            let h = parseInt(ampmMatch[1], 10);
            const m = parseInt(ampmMatch[2] || "0", 10);
            const s = parseInt(ampmMatch[3] || "0", 10);
            const ampm = ampmMatch[4];
            if (ampm === "AM" && h === 12) h = 0;
            if (ampm === "PM" && h !== 12) h += 12;
            return { h, m, s };
          }

          // 24-hour: "HH:mm[:ss]" - handle existing database format
          const hmsMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
          if (hmsMatch) {
            const h = parseInt(hmsMatch[1], 10);
            const m = parseInt(hmsMatch[2], 10);
            const s = parseInt(hmsMatch[3] || "0", 10);
            return { h, m, s };
          }

          return { h: 0, m: 0, s: 0 };
        }

        const { h, m, s } = parseTimeToHms(timeSlot);

        // Build scheduledTime on the day by setting hours/minutes/seconds
        const scheduledTime = new Date(dayStart);
        scheduledTime.setHours(h, m, s, 0);

        // Find the earliest sent_time for this student/teacher/date
        const sentTimes = (student.zoom_links || [])
          .filter((zl) => zl.sent_time)
          .map((zl) => zl.sent_time as Date)
          .sort((a, b) => a.getTime() - b.getTime());
        const actualStartTime = sentTimes.length > 0 ? sentTimes[0] : null;
        if (!actualStartTime) return null;

        const minutesDiff = Math.round(
          (actualStartTime.getTime() - scheduledTime.getTime()) / 60000
        );
        const latenessMinutes = Math.max(0, Number.isFinite(minutesDiff) ? minutesDiff : 0);

        // Deduction logic (configurable base amount)
        let deductionApplied = 0;
        let deductionTier = "Excused";
        if (latenessMinutes > excusedThreshold) {
          let foundTier = false;
          for (const [i, tier] of tiers.entries()) {
            if (latenessMinutes >= tier.start && latenessMinutes <= tier.end) {
              deductionApplied = baseDeductionAmount * (tier.percent / 100);
              deductionTier = `Tier ${i + 1}`;
              foundTier = true;
              break;
            }
          }
          if (!foundTier && latenessMinutes > maxTierEnd) {
            deductionApplied = baseDeductionAmount;
            deductionTier = "> Max Tier";
          }
        }
        return {
          studentId: student.wdt_ID,
          studentName: student.name,
          teacherId: student.ustaz,
          teacherName: student.teacher?.ustazname || student.ustaz,
          controllerId: student.controller?.wdt_ID ?? null,
          controllerName: student.controller?.name ?? null,
          classDate: scheduledTime,
          scheduledTime,
          actualStartTime,
          latenessMinutes,
          deductionApplied,
          deductionTier,
        };
      })
      .filter(Boolean) as Array<{
      studentId: any;
      studentName: string;
      teacherId: any;
      teacherName: string;
      controllerId: any;
      controllerName: string | null;
      classDate: Date;
      scheduledTime: Date;
      actualStartTime: Date;
      latenessMinutes: number;
      deductionApplied: number;
      deductionTier: string;
    }>;

    // 4. Apply filters
    const filtered = allRecords.filter((rec) => {
      // controller filter (id match)
      if (controllerFilter) {
        if (String(rec.controllerId ?? "") !== String(controllerFilter)) {
          return false;
        }
      }
      // teacher filter (allow id or name)
      if (teacherFilter) {
        const byId =
          String(rec.teacherId ?? "").toLowerCase() ===
          teacherFilter.toLowerCase();
        const byName =
          (rec.teacherName ?? "").toLowerCase() === teacherFilter.toLowerCase();
        if (!byId && !byName) return false;
      }
      return true;
    });

    // 5. Pagination
    const total = filtered.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);

    return NextResponse.json({ latenessData: paginated, total, page, limit });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
