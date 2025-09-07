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
    const { adjustmentType, dateRange, teacherIds, timeSlots } = body;
    const { startDate, endDate } = dateRange;

    let records: any[] = [];
    let totalLatenessAmount = 0;
    let totalAbsenceAmount = 0;

    if (adjustmentType === 'waive_lateness') {
      const latenessRecords = await prisma.latenessrecord.findMany({
        where: {
          teacherId: { in: teacherIds },
          classDate: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          },
          deductionApplied: { gt: 0 }
        },
        include: {
          wpos_wpdatatable_24: {
            select: { ustazname: true }
          }
        },
        orderBy: [{ classDate: 'desc' }, { teacherId: 'asc' }]
      });

      records = latenessRecords.map(record => {
        totalLatenessAmount += Number(record.deductionApplied);
        return {
          id: record.id,
          teacherId: record.teacherId,
          teacherName: record.wpos_wpdatatable_24?.ustazname || 'Unknown Teacher',
          date: record.classDate,
          type: 'Lateness',
          deduction: Number(record.deductionApplied),
          originalAmount: Number(record.deductionApplied),
          details: `${record.latenessMinutes} min late - ${record.deductionTier}`,
          scheduledTime: record.scheduledTime,
          actualTime: record.actualStartTime
        };
      });
    }

    if (adjustmentType === 'waive_absence') {
      const absenceRecords = await prisma.absencerecord.findMany({
        where: {
          teacherId: { in: teacherIds },
          classDate: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          },
          deductionApplied: { gt: 0 }
        },
        include: {
          wpos_wpdatatable_24: {
            select: { ustazname: true }
          }
        },
        orderBy: [{ classDate: 'desc' }, { teacherId: 'asc' }]
      });

      records = absenceRecords.map(record => {
        totalAbsenceAmount += Number(record.deductionApplied);
        return {
          id: record.id,
          teacherId: record.teacherId,
          teacherName: record.wpos_wpdatatable_24?.ustazname || 'Unknown Teacher',
          date: record.classDate,
          type: 'Absence',
          deduction: Number(record.deductionApplied),
          originalAmount: Number(record.deductionApplied),
          details: record.timeSlots || 'Full day absence',
          permitted: record.permitted,
          reviewNotes: record.reviewNotes
        };
      });
    }

    // Group records by teacher for better analysis
    const teacherSummary = records.reduce((acc, record) => {
      if (!acc[record.teacherId]) {
        acc[record.teacherId] = {
          teacherName: record.teacherName,
          totalDeduction: 0,
          recordCount: 0,
          records: []
        };
      }
      acc[record.teacherId].totalDeduction += record.deduction;
      acc[record.teacherId].recordCount += 1;
      acc[record.teacherId].records.push(record);
      return acc;
    }, {});

    console.log('Preview Debug:', {
      adjustmentType,
      teacherIds,
      dateRange: { startDate, endDate },
      recordsFound: records.length,
      totalLatenessAmount,
      totalAbsenceAmount,
      totalAmount: totalLatenessAmount + totalAbsenceAmount
    });

    return NextResponse.json({ 
      records,
      summary: {
        totalRecords: records.length,
        totalTeachers: Object.keys(teacherSummary).length,
        totalLatenessAmount,
        totalAbsenceAmount,
        totalAmount: totalLatenessAmount + totalAbsenceAmount,
        teacherBreakdown: Object.values(teacherSummary)
      },
      debug: {
        searchCriteria: { adjustmentType, teacherIds, dateRange: { startDate, endDate } },
        tablesChecked: ['latenessrecord', 'absencerecord']
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}