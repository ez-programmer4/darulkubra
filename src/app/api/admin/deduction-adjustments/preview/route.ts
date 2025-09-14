import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { adjustmentType, dateRange, teacherIds, timeSlots } = await req.json();
    
    if (!dateRange?.startDate || !dateRange?.endDate || !teacherIds?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const records: any[] = [];
    let totalAmount = 0;

    if (adjustmentType === "waive_absence") {
      // Get actual absence records that can be waived
      const absenceRecords = await prisma.absencerecord.findMany({
        where: {
          teacherId: { in: teacherIds },
          classDate: { gte: startDate, lte: endDate },
          isWaived: { not: true }
        },
        include: {
          wpos_wpdatatable_24: { select: { ustazname: true } }
        },
        orderBy: { classDate: 'desc' }
      });

      for (const record of absenceRecords) {
        records.push({
          id: `absence_${record.id}`,
          teacherId: record.teacherId,
          teacherName: record.wpos_wpdatatable_24?.ustazname || 'Unknown',
          date: record.classDate,
          type: "Absence",
          deduction: record.deductionApplied,
          permitted: record.permitted,
          details: record.permitted ? "Permitted absence" : "Unpermitted absence"
        });
        totalAmount += record.deductionApplied;
      }
    }

    if (adjustmentType === "waive_lateness") {
      // Get lateness records from teacher payment calculations
      for (const teacherId of teacherIds) {
        const teacher = await prisma.wpos_wpdatatable_24.findUnique({
          where: { ustazid: teacherId },
          select: { ustazname: true }
        });

        if (!teacher) continue;

        // Check for existing waivers to avoid duplicates
        const existingWaivers = await prisma.deduction_waivers.findMany({
          where: {
            teacherId,
            deductionType: 'lateness',
            deductionDate: { gte: startDate, lte: endDate }
          }
        });

        const waivedDates = new Set(existingWaivers.map(w => format(w.deductionDate, 'yyyy-MM-dd')));

        // Get zoom links to calculate potential lateness
        const zoomLinks = await prisma.wpos_zoom_links.findMany({
          where: {
            ustazid: teacherId,
            sent_time: { gte: startDate, lte: endDate }
          },
          include: {
            wpos_wpdatatable_23: { 
              select: { 
                name: true, 
                package: true,
                occupiedTimes: { select: { time_slot: true } }
              } 
            }
          },
          orderBy: { sent_time: 'asc' }
        });

        // Get package deduction rates
        const packageDeductions = await prisma.packageDeduction.findMany();
        const packageMap = Object.fromEntries(
          packageDeductions.map(p => [p.packageName, Number(p.latenessBaseAmount)])
        );

        // Get lateness config
        const latenessConfigs = await prisma.latenessdeductionconfig.findMany({
          orderBy: [{ tier: "asc" }, { startMinute: "asc" }]
        });

        if (latenessConfigs.length === 0) continue;

        const excusedThreshold = Math.min(...latenessConfigs.map(c => c.excusedThreshold ?? 0));
        const tiers = latenessConfigs.map(c => ({
          start: c.startMinute,
          end: c.endMinute,
          percent: c.deductionPercent
        }));

        // Group links by date and calculate lateness
        const dailyLinks = new Map<string, any[]>();
        zoomLinks.forEach(link => {
          if (link.sent_time) {
            const dateStr = format(link.sent_time, "yyyy-MM-dd");
            if (!dailyLinks.has(dateStr)) dailyLinks.set(dateStr, []);
            dailyLinks.get(dateStr)!.push(link);
          }
        });

        for (const [dateStr, links] of dailyLinks.entries()) {
          if (waivedDates.has(dateStr)) continue; // Skip already waived dates

          const firstLink = links.sort((a, b) => a.sent_time!.getTime() - b.sent_time!.getTime())[0];
          const timeSlot = firstLink.wpos_wpdatatable_23?.occupiedTimes?.[0]?.time_slot;
          
          // Filter by time slots if specified
          if (timeSlots && timeSlots.length > 0 && !timeSlots.includes(timeSlot)) {
            continue;
          }
          
          if (timeSlot && firstLink.sent_time) {
            // Parse scheduled time
            const parseTime = (timeStr: string) => {
              if (timeStr.includes('AM') || timeStr.includes('PM')) {
                const [time, period] = timeStr.split(' ');
                let [hours, minutes] = time.split(':').map(Number);
                if (period === 'PM' && hours !== 12) hours += 12;
                if (period === 'AM' && hours === 12) hours = 0;
                return { hours, minutes };
              }
              const [hours, minutes] = timeStr.split(':').map(Number);
              return { hours, minutes };
            };

            const scheduled = parseTime(timeSlot);
            const scheduledTime = new Date(dateStr);
            scheduledTime.setHours(scheduled.hours, scheduled.minutes, 0, 0);

            const latenessMinutes = Math.max(0, 
              Math.round((firstLink.sent_time.getTime() - scheduledTime.getTime()) / 60000)
            );

            if (latenessMinutes > excusedThreshold) {
              const studentPackage = firstLink.wpos_wpdatatable_23?.package || "";
              const baseAmount = packageMap[studentPackage] || 30;

              let deduction = 0;
              for (const tier of tiers) {
                if (latenessMinutes >= tier.start && latenessMinutes <= tier.end) {
                  deduction = Math.round(baseAmount * (tier.percent / 100));
                  break;
                }
              }

              if (deduction > 0) {
                records.push({
                  id: `lateness_${teacherId}_${dateStr}`,
                  teacherId,
                  teacherName: teacher.ustazname,
                  date: new Date(dateStr),
                  type: "Lateness",
                  deduction,
                  latenessMinutes,
                  details: `${latenessMinutes} minutes late, scheduled: ${timeSlot}`
                });
                totalAmount += deduction;
              }
            }
          }
        }
      }
    }

    // Calculate summary
    const teacherBreakdown = teacherIds.map((teacherId: string) => {
      const teacherRecords = records.filter(r => r.teacherId === teacherId);
      return {
        teacherId,
        teacherName: teacherRecords[0]?.teacherName || 'Unknown',
        recordCount: teacherRecords.length,
        totalDeduction: teacherRecords.reduce((sum, r) => sum + r.deduction, 0)
      };
    }).filter((t: any) => t.recordCount > 0);

    const summary = {
      totalRecords: records.length,
      totalTeachers: teacherBreakdown.length,
      totalAmount,
      totalLatenessAmount: records.filter(r => r.type === 'Lateness').reduce((sum, r) => sum + r.deduction, 0),
      totalAbsenceAmount: records.filter(r => r.type === 'Absence').reduce((sum, r) => sum + r.deduction, 0),
      teacherBreakdown
    };

    return NextResponse.json({ records, summary });

  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json({ error: "Failed to preview adjustments" }, { status: 500 });
  }
}