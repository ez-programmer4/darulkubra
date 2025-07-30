import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";

// TODO: Add real authentication/authorization middleware

// GET: Fetch all absence records for a teacher
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (user.role === "teacher" && user.id !== params.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const teacherId = params.id;
    const records = await prisma.absenceRecord.findMany({
      where: { teacherId },
      orderBy: { classDate: "desc" },
    });
    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

const AbsenceRecordSchema = z.object({
  classDate: z.string().datetime(),
  permitted: z.boolean(),
  permissionRequestId: z.number().int().nullable().optional(),
  deductionApplied: z.number(),
  reviewedByManager: z.boolean(),
  reviewNotes: z.string().nullable().optional(),
});

// POST: Create a new absence record for a teacher
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (user.role === "teacher" && user.id !== params.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const teacherId = params.id;
    const body = await req.json();
    const parseResult = AbsenceRecordSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.issues },
        { status: 400 }
      );
    }
    const {
      classDate,
      permitted,
      permissionRequestId,
      deductionApplied,
      reviewedByManager,
      reviewNotes,
    } = parseResult.data;
    const record = await prisma.absenceRecord.create({
      data: {
        teacherId,
        classDate: new Date(classDate),
        permitted,
        permissionRequestId,
        deductionApplied,
        reviewedByManager,
        reviewNotes,
      },
    });
    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    const error = err as Error;
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to create absence record." },
      { status: 500 }
    );
  }
}
