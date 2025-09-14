import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { adjustmentType, dateRange, teacherIds, timeSlots, reason } = await req.json();
    console.log('🔧 ADJUSTMENT API CALLED:', { adjustmentType, dateRange, teacherIds: teacherIds?.length, reason: reason?.substring(0, 50) });
    
    if (!dateRange?.startDate || !dateRange?.endDate || !teacherIds?.length || !reason?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const adminId = (session.user as { id: string }).id;
    
    let recordsAffected = 0;
    let totalAmountWaived = 0;

    // Use transaction to ensure data consistency
    console.log('💾 Starting database transaction...');
    const result = await prisma.$transaction(async (tx) => {
      console.log('💾 Inside transaction, processing:', adjustmentType);
      if (adjustmentType === "waive_absence") {
        // Get absence records to waive
        const absenceRecords = await tx.absencerecord.findMany({
          where: {
            teacherId: { in: teacherIds },
            classDate: { gte: startDate, lte: endDate },
            isWaived: { not: true }
          }
        });

        if (absenceRecords.length > 0) {
          // Mark absence records as waived
          await tx.absencerecord.updateMany({
            where: { id: { in: absenceRecords.map(r => r.id) } },
            data: { isWaived: true, waiverReason: reason }
          });

          // Create waiver records
          const waiverData = absenceRecords.map(record => ({
            teacherId: record.teacherId,
            deductionType: 'absence',
            deductionDate: record.classDate,
            originalAmount: record.deductionApplied,
            reason,
            adminId
          }));

          await tx.deduction_waivers.createMany({ 
            data: waiverData,
            skipDuplicates: true 
          });

          recordsAffected = absenceRecords.length;
          totalAmountWaived = absenceRecords.reduce((sum, r) => sum + r.deductionApplied, 0);
        }
      }

      if (adjustmentType === "waive_lateness") {
        // Create lateness waivers for each teacher and date
        const waiverData = [];
        
        for (const teacherId of teacherIds) {
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            // Check if waiver already exists
            const existing = await tx.deduction_waivers.findFirst({
              where: { 
                teacherId, 
                deductionType: 'lateness', 
                deductionDate: new Date(d) 
              }
            });

            if (!existing) {
              // Calculate estimated deduction amount for this date
              const estimatedAmount = await calculateLatenessDeduction(tx, teacherId, new Date(d));
              
              if (estimatedAmount > 0) {
                waiverData.push({
                  teacherId,
                  deductionType: 'lateness',
                  deductionDate: new Date(d),
                  originalAmount: estimatedAmount,
                  reason,
                  adminId
                });
                totalAmountWaived += estimatedAmount;
              }
            }
          }
        }

        if (waiverData.length > 0) {
          await tx.deduction_waivers.createMany({ 
            data: waiverData,
            skipDuplicates: true 
          });
          recordsAffected = waiverData.length;
        }
      }

      // Log the adjustment
      await tx.auditlog.create({
        data: {
          actionType: "deduction_adjustment",
          adminId,
          targetId: null,
          details: JSON.stringify({
            adjustmentType,
            teacherIds,
            dateRange,
            timeSlots,
            recordsAffected,
            totalAmountWaived,
            reason
          })
        }
      });

      console.log('✅ Transaction completed:', { recordsAffected, totalAmountWaived });
      return { recordsAffected, totalAmountWaived };
    });
    
    console.log('🎉 ADJUSTMENT SUCCESSFUL:', result);

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${result.recordsAffected} deduction adjustments`,
      recordsAffected: result.recordsAffected,
      financialImpact: { 
        totalAmountWaived: result.totalAmountWaived, 
        affectedTeachers: teacherIds.length 
      }
    });

  } catch (error) {
    console.error("Adjustment error:", error);
    return NextResponse.json({ error: "Failed to process adjustments" }, { status: 500 });
  }
}

// Helper function to calculate lateness deduction for a specific date
async function calculateLatenessDeduction(tx: any, teacherId: string, date: Date): Promise<number> {
  try {
    const dateStr = date.toISOString().split('T')[0];
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get zoom links for this specific date
    const zoomLinks = await tx.wpos_zoom_links.findMany({
      where: {
        ustazid: teacherId,
        sent_time: { gte: date, lt: nextDay }
      },
      include: {
        wpos_wpdatatable_23: { 
          select: { 
            package: true,
            occupiedTimes: { select: { time_slot: true } }
          } 
        }
      },
      orderBy: { sent_time: 'asc' }
    });

    if (zoomLinks.length === 0) return 0;

    // Get package deduction rates
    const packageDeductions = await tx.packageDeduction.findMany();
    const packageMap = Object.fromEntries(
      packageDeductions.map((p: any) => [p.packageName, Number(p.latenessBaseAmount)])
    );

    // Get lateness config
    const latenessConfigs = await tx.latenessdeductionconfig.findMany({
      orderBy: [{ tier: "asc" }, { startMinute: "asc" }]
    });

    if (latenessConfigs.length === 0) return 0;

    const excusedThreshold = Math.min(...latenessConfigs.map((c: any) => c.excusedThreshold ?? 0));
    const tiers = latenessConfigs.map((c: any) => ({
      start: c.startMinute,
      end: c.endMinute,
      percent: c.deductionPercent
    }));

    const firstLink = zoomLinks[0];
    const timeSlot = firstLink.wpos_wpdatatable_23?.occupiedTimes?.[0]?.time_slot;
    
    if (!timeSlot || !firstLink.sent_time) return 0;

    // Calculate lateness
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
    const scheduledTime = new Date(date);
    scheduledTime.setHours(scheduled.hours, scheduled.minutes, 0, 0);

    const latenessMinutes = Math.max(0, 
      Math.round((firstLink.sent_time.getTime() - scheduledTime.getTime()) / 60000)
    );

    if (latenessMinutes <= excusedThreshold) return 0;

    const studentPackage = firstLink.wpos_wpdatatable_23?.package || "";
    const baseAmount = packageMap[studentPackage] || 30;

    for (const tier of tiers) {
      if (latenessMinutes >= tier.start && latenessMinutes <= tier.end) {
        return Math.round(baseAmount * (tier.percent / 100));
      }
    }

    return 0;
  } catch (error) {
    console.error("Error calculating lateness deduction:", error);
    return 0;
  }
}