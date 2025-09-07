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
        }
      });

      records = latenessRecords.map(record => ({
        id: record.id,
        teacherName: record.wpos_wpdatatable_24?.ustazname || 'Unknown',
        date: record.classDate,
        type: 'Lateness',
        deduction: record.deductionApplied,
        details: `${record.latenessMinutes} min late - ${record.deductionTier}`
      }));
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
        }
      });

      records = absenceRecords.map(record => ({
        id: record.id,
        teacherName: record.wpos_wpdatatable_24?.ustazname || 'Unknown',
        date: record.classDate,
        type: 'Absence',
        deduction: record.deductionApplied,
        details: record.timeSlots || 'Full day'
      }));
    }

    return NextResponse.json({ records });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}