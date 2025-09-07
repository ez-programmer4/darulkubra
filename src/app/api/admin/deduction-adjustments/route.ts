import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { 
      adjustmentType,
      dateRange, 
      teacherIds, 
      timeSlots,
      reason
    } = body;

    const { startDate, endDate } = dateRange;
    const adminId = token.id;

    let adjustedRecords = 0;
    const adjustmentTimestamp = new Date();

    try {
      await prisma.$transaction(async (tx) => {
        if (adjustmentType === 'waive_lateness') {
          const latenessRecords = await tx.latenessrecord.findMany({
            where: {
              teacherId: { in: teacherIds },
              classDate: {
                gte: new Date(startDate),
                lte: new Date(endDate)
              },
              deductionApplied: { gt: 0 } // Only adjust records with actual deductions
            }
          });

          for (const record of latenessRecords) {
            await tx.latenessrecord.update({
              where: { id: record.id },
              data: {
                deductionApplied: 0,
                deductionTier: `${record.deductionTier} (System Issue Waived)`
              }
            });
          }
          adjustedRecords += latenessRecords.length;
        }

        if (adjustmentType === 'waive_absence') {
          const absenceRecords = await tx.absencerecord.findMany({
            where: {
              teacherId: { in: teacherIds },
              classDate: {
                gte: new Date(startDate),
                lte: new Date(endDate)
              },
              deductionApplied: { gt: 0 } // Only adjust records with actual deductions
            }
          });

          for (const record of absenceRecords) {
            await tx.absencerecord.update({
              where: { id: record.id },
              data: {
                deductionApplied: 0,
                reviewNotes: `${record.reviewNotes || ''} - System Issue: ${reason} (Adjusted by admin on ${adjustmentTimestamp.toLocaleDateString()})`
              }
            });
          }
          adjustedRecords += absenceRecords.length;
        }

        // Log the adjustment for audit trail
        await tx.auditlog.create({
          data: {
            actionType: 'deduction_adjustment',
            adminId: adminId,
            details: JSON.stringify({
              adjustmentType,
              teacherIds,
              dateRange: { startDate, endDate },
              timeSlots,
              reason,
              recordsAffected: adjustedRecords
            })
          }
        });
      });
    } catch (error) {
      throw new Error('Failed to process adjustments in transaction');
    }

    if (adjustedRecords === 0) {
      return NextResponse.json({ 
        success: true, 
        recordsAffected: 0,
        message: "No records found with deductions in the specified date range"
      });
    }

    return NextResponse.json({ 
      success: true, 
      recordsAffected: adjustedRecords,
      message: `Successfully adjusted ${adjustedRecords} deduction record(s)`
    });

  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}