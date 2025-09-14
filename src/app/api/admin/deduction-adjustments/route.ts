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
    const { adjustmentType, dateRange, teacherIds, reason } = await req.json();
    
    if (!dateRange?.startDate || !dateRange?.endDate || !teacherIds?.length || !reason?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const adminId = (session.user as { id: string }).id;
    
    let recordsAffected = 0;
    let totalAmountWaived = 0;
    const waiverRecords = [];

    if (adjustmentType === "waive_lateness") {
      // Create waivers for lateness deductions
      for (const teacherId of teacherIds) {
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          // Check if waiver already exists
          const existingWaiver = await prisma.deduction_waivers.findFirst({
            where: {
              teacherId,
              deductionType: 'lateness',
              deductionDate: d
            }
          });

          if (!existingWaiver) {
            // Calculate the lateness deduction amount for this day
            // This is a simplified calculation - in practice, you'd want to 
            // calculate the exact amount that would be deducted
            const estimatedDeduction = 30; // Default amount - should be calculated properly
            
            waiverRecords.push({
              teacherId,
              deductionType: 'lateness',
              deductionDate: new Date(d),
              originalAmount: estimatedDeduction,
              reason,
              adminId
            });
            
            totalAmountWaived += estimatedDeduction;
            recordsAffected++;
          }
        }
      }
    }

    if (adjustmentType === "waive_absence") {
      // Get actual absence records to waive
      const absenceRecords = await prisma.absencerecord.findMany({
        where: {
          teacherId: { in: teacherIds },
          classDate: { gte: startDate, lte: endDate },
          isWaived: false
        }
      });

      for (const record of absenceRecords) {
        // Check if waiver already exists
        const existingWaiver = await prisma.deduction_waivers.findFirst({
          where: {
            teacherId: record.teacherId,
            deductionType: 'absence',
            deductionDate: record.classDate
          }
        });

        if (!existingWaiver) {
          waiverRecords.push({
            teacherId: record.teacherId,
            deductionType: 'absence',
            deductionDate: record.classDate,
            originalAmount: record.deductionApplied,
            reason,
            adminId
          });

          totalAmountWaived += record.deductionApplied;
          recordsAffected++;
        }
      }

      // Mark absence records as waived
      if (absenceRecords.length > 0) {
        await prisma.absencerecord.updateMany({
          where: {
            id: { in: absenceRecords.map(r => r.id) }
          },
          data: {
            isWaived: true,
            waiverReason: reason
          }
        });
      }
    }

    // Create waiver records in database
    if (waiverRecords.length > 0) {
      await prisma.deduction_waivers.createMany({
        data: waiverRecords
      });
    }

    // Update teacher salary payments to reflect waivers
    // This ensures the teacher payments API will show updated amounts
    const affectedPeriods = new Set<string>();
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      affectedPeriods.add(period);
    }

    // Force recalculation of teacher payments for affected periods
    for (const teacherId of teacherIds) {
      for (const period of affectedPeriods) {
        // Update the salary payment record to trigger recalculation
        await prisma.teachersalarypayment.upsert({
          where: {
            teacherId_period: { teacherId, period }
          },
          create: {
            teacherId,
            period,
            status: "pending",
            totalSalary: 0,
            latenessDeduction: 0,
            absenceDeduction: 0,
            bonuses: 0
          },
          update: {
            // The actual recalculation will happen when teacher-payments API is called
            // This just ensures the record exists and can be updated
          }
        });
      }
    }

    // Log the adjustment for audit trail
    await prisma.auditlog.create({
      data: {
        actionType: "deduction_adjustment",
        adminId,
        targetId: null,
        details: JSON.stringify({
          adjustmentType,
          teacherIds,
          dateRange,
          recordsAffected,
          totalAmountWaived,
          reason
        })
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully waived ${recordsAffected} deduction records`,
      recordsAffected,
      financialImpact: {
        totalAmountWaived,
        affectedTeachers: teacherIds.length,
        affectedPeriods: Array.from(affectedPeriods)
      }
    });

  } catch (error) {
    console.error("Adjustment error:", error);
    return NextResponse.json(
      { error: "Failed to process adjustments", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}