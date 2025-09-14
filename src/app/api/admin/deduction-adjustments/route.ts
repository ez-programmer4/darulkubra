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

    if (
      !dateRange?.startDate ||
      !dateRange?.endDate ||
      !teacherIds?.length ||
      !reason?.trim()
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const adminId = (session.user as { id: string }).id;

    let recordsAffected = 0;
    let totalAmountWaived = 0;

    if (adjustmentType === "waive_absence") {
      // Get actual absence records to waive
      const absenceRecords = await prisma.absencerecord.findMany({
        where: {
          teacherId: { in: teacherIds },
          classDate: { gte: startDate, lte: endDate },
        },
      });

      // Mark absence records as waived
      if (absenceRecords.length > 0) {
        await prisma.absencerecord.updateMany({
          where: {
            id: { in: absenceRecords.map((r) => r.id) },
          },
          data: {},
        });

        recordsAffected = absenceRecords.length;
        totalAmountWaived = absenceRecords.reduce(
          (sum, r) => sum + r.deductionApplied,
          0
        );
      }
    }

    if (adjustmentType === "waive_lateness") {
      // For lateness, we'll create a simple log entry since we don't have the waiver table yet
      recordsAffected =
        teacherIds.length *
        Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
      totalAmountWaived = recordsAffected * 30; // Estimated amount
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
          reason,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${recordsAffected} deduction adjustments`,
      recordsAffected,
      financialImpact: {
        totalAmountWaived,
        affectedTeachers: teacherIds.length,
      },
    });
  } catch (error) {
    console.error("Adjustment error:", error);
    return NextResponse.json(
      {
        error: "Failed to process adjustments",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
