import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { isTeacherAbsent, getAbsenceDeductionConfig } from "@/lib/absence-utils";

// GET: fetch recent absence records and aggregated summary
export async function GET(req: NextRequest) {
  try {
    const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const daysParam = searchParams.get("days");
    const teacherId = searchParams.get("teacherId");

    const days = Math.max(1, parseInt(daysParam || "7", 10));
    const fromDate = new Date();
    fromDate.setHours(0, 0, 0, 0);
    fromDate.setDate(fromDate.getDate() - days + 1);

    const whereClause: any = {
      classDate: { gte: fromDate },
    };
    if (teacherId && teacherId !== "all") {
      whereClause.teacherId = teacherId;
    }

    const records = await prisma.absencerecord.findMany({
      where: whereClause,
      include: {
        wpos_wpdatatable_24: { select: { ustazname: true } },
        permissionrequest: { select: { reasonCategory: true, reasonDetails: true } },
      },
      orderBy: { classDate: "desc" },
    });

    const summary = {
      totalAbsences: records.length,
      permittedAbsences: records.filter((r) => r.permitted).length,
      unpermittedAbsences: records.filter((r) => !r.permitted).length,
      totalDeductions: records.reduce((sum, r) => sum + (r.deductionApplied || 0), 0),
      pendingReview: records.filter((r) => !r.reviewedByManager).length,
    };

    return NextResponse.json({ records, summary });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: process absences (single/bulk/auto)
export async function POST(req: NextRequest) {
  try {
    const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      processType,
      teacherIds,
      date,
      forceReprocess = false,
      deductionAmount: payloadDeduction,
      applicableMonths: payloadApplicableMonths,
    } = body || {};

    if (!processType || !["single", "bulk", "auto"].includes(processType)) {
      return NextResponse.json({ error: "Invalid processType" }, { status: 400 });
    }

    const { deductionAmount: configuredDeduction, effectiveMonths } =
      await getAbsenceDeductionConfig();
    const deductionAmount = Number(payloadDeduction ?? configuredDeduction) || 0;
    const applicableMonths: string[] = Array.isArray(payloadApplicableMonths)
      ? payloadApplicableMonths
      : effectiveMonths;

    // Determine target date
    let targetDate: Date;
    if (processType === "auto") {
      targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - 1);
    } else {
      if (!date) {
        return NextResponse.json({ error: "Missing date" }, { status: 400 });
      }
      targetDate = new Date(date);
    }
    // Strip time to day boundaries
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Month applicability check
    const monthNumber = String((dayStart.getMonth() + 1));
    const monthAllowed = applicableMonths.length === 0 || applicableMonths.includes(monthNumber);

    if (!monthAllowed) {
      return NextResponse.json({
        message: "No processing for non-applicable month",
        summary: { processed: 0, errors: 0, created: 0, updated: 0, skipped: 0 },
      });
    }

    // Determine teachers to process
    let ids: string[] = [];
    if (processType === "single") {
      if (!teacherIds || typeof teacherIds !== "string") {
        return NextResponse.json({ error: "teacherIds must be a teacher id string for single processing" }, { status: 400 });
      }
      ids = [teacherIds];
    } else if (processType === "bulk") {
      if (!Array.isArray(teacherIds) || teacherIds.length === 0) {
        return NextResponse.json({ error: "teacherIds must be a non-empty array for bulk processing" }, { status: 400 });
      }
      ids = teacherIds as string[];
    } else {
      // auto: all teachers
      const teachers = await prisma.wpos_wpdatatable_24.findMany({ select: { ustazid: true } });
      ids = teachers.map((t) => t.ustazid);
    }

    let processed = 0;
    let errors = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const teacherId of ids) {
      try {
        // Validate teacher exists
        const teacher = await prisma.wpos_wpdatatable_24.findUnique({ where: { ustazid: teacherId } });
        if (!teacher) {
          skipped += 1;
          continue;
        }

        const result = await isTeacherAbsent(teacherId, dayStart);
        if (!result.isAbsent) {
          skipped += 1;
          continue;
        }

        // Check existing record for this day
        const existing = await prisma.absencerecord.findFirst({
          where: {
            teacherId,
            classDate: { gte: dayStart, lte: dayEnd },
          },
        });

        if (existing) {
          if (forceReprocess) {
            await prisma.absencerecord.update({
              where: { id: existing.id },
              data: {
                permitted: false,
                deductionApplied: deductionAmount,
                reviewedByManager: true,
                reviewNotes: result.reason || existing.reviewNotes || "System reprocessed",
              },
            });
            updated += 1;
          } else {
            skipped += 1;
          }
        } else {
          await prisma.absencerecord.create({
            data: {
              teacherId,
              classDate: dayStart,
              permitted: false,
              deductionApplied: deductionAmount,
              reviewedByManager: true,
              reviewNotes: result.reason || "System generated",
            },
          });
          created += 1;
        }

        processed += 1;
      } catch (e) {
        errors += 1;
      }
    }

    return NextResponse.json({
      message: "Absence processing completed",
      summary: { processed, errors, created, updated, skipped },
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}