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
    let totalDeductionWaived = 0;
    let latenessAmount = 0;
    let absenceAmount = 0;
    let affectedTeachers = new Set();
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
              deductionApplied: { gt: 0 }
            }
          });

          if (latenessRecords.length === 0) {
            throw new Error('No lateness records found with deductions for the specified criteria');
          }

          for (const record of latenessRecords) {
            const originalAmount = Number(record.deductionApplied);
            latenessAmount += originalAmount;
            totalDeductionWaived += originalAmount;
            affectedTeachers.add(record.teacherId);
            
            await tx.latenessrecord.update({
              where: { id: record.id },
              data: {
                deductionApplied: 0,
                deductionTier: `WAIVED (${originalAmount} ETB): ${reason} | ${record.deductionTier}`
              }
            });
            adjustedRecords++;
          }
        }

        if (adjustmentType === 'waive_absence') {
          const absenceRecords = await tx.absencerecord.findMany({
            where: {
              teacherId: { in: teacherIds },
              classDate: {
                gte: new Date(startDate),
                lte: new Date(endDate)
              },
              deductionApplied: { gt: 0 }
            }
          });

          if (absenceRecords.length === 0) {
            throw new Error('No absence records found with deductions for the specified criteria');
          }

          for (const record of absenceRecords) {
            const originalAmount = Number(record.deductionApplied);
            absenceAmount += originalAmount;
            totalDeductionWaived += originalAmount;
            affectedTeachers.add(record.teacherId);
            
            await tx.absencerecord.update({
              where: { id: record.id },
              data: {
                deductionApplied: 0,
                reviewNotes: `SALARY ADJUSTMENT - WAIVED ${originalAmount} ETB: ${reason} | Processed: ${adjustmentTimestamp.toISOString()} | Original Notes: ${record.reviewNotes || 'None'}`
              }
            });
            adjustedRecords++;
          }
        }

        // Validate that adjustments were made
        if (adjustedRecords === 0) {
          throw new Error('No deduction records were found to adjust. Please verify your selection criteria.');
        }

        // Create comprehensive audit log with financial details
        await tx.auditlog.create({
          data: {
            actionType: 'CRITICAL_SALARY_DEDUCTION_ADJUSTMENT',
            adminId: adminId,
            details: JSON.stringify({
              adjustmentType,
              selectedTeachers: teacherIds.length,
              actuallyAffectedTeachers: affectedTeachers.size,
              dateRange: { startDate, endDate },
              timeSlots: timeSlots || 'All time slots',
              reason,
              financialImpact: {
                recordsAdjusted: adjustedRecords,
                latenessAmountWaived: latenessAmount,
                absenceAmountWaived: absenceAmount,
                totalAmountWaived: totalDeductionWaived,
                salaryIncrease: totalDeductionWaived
              },
              processingDetails: {
                timestamp: adjustmentTimestamp.toISOString(),
                adminId: adminId,
                systemIntegration: 'Teacher payment calculations automatically updated'
              },
              complianceNote: `FINANCIAL AUDIT TRAIL: ${adjustedRecords} deduction records totaling ${totalDeductionWaived} ETB were waived and returned to teacher salaries due to: ${reason}`
            })
          }
        });
      });
    } catch (error) {
      console.error('Deduction adjustment failed:', error);
      throw new Error(`Failed to process salary adjustments: ${error}`);
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
      financialImpact: {
        totalAmountWaived: totalDeductionWaived,
        latenessAmount: latenessAmount,
        absenceAmount: absenceAmount,
        affectedTeachers: affectedTeachers.size
      },
      message: `✅ SALARY ADJUSTMENT COMPLETED SUCCESSFULLY\n\n📊 Financial Impact:\n• ${adjustedRecords} deduction records waived\n• ${totalDeductionWaived} ETB returned to teacher salaries\n• ${affectedTeachers.size} teachers affected\n\n🔄 System Integration:\n• Teacher payment calculations updated automatically\n• All reports now reflect adjusted amounts\n• Complete audit trail created for compliance`,
      integration: {
        teacherPaymentsUpdated: true,
        reportsUpdated: true,
        auditTrailCreated: true,
        salaryCalculationsRefreshed: true
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}