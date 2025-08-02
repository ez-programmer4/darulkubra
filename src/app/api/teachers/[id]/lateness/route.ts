import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { calculateLatenessAndDeduction } from "@/lib/attendance";

// GET: Fetch lateness records for a specific teacher
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admins only." },
        { status: 403 }
      );
    }
    const teacherId = params.id;
    const records = await prisma.latenessrecord.findMany({
      where: { teacherId },
      orderBy: { classDate: "desc" },
    });
    return NextResponse.json(records);
  } catch (err) {
    const error = err as Error;
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch lateness records." },
      { status: 500 }
    );
  }
}

// POST: Create lateness records for a teacher (server-side calculation)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admins only." },
        { status: 403 }
      );
    }
    const teacherId = params.id;
    const body = await req.json();
    // Expect: { classDate, students: [{ studentId, selectedTime, zoom_links: [{ sent_time }] }] }
    const { classDate, students } = body;
    if (!classDate || !Array.isArray(students)) {
      return NextResponse.json(
        { error: "Invalid input: classDate and students required" },
        { status: 400 }
      );
    }
    // Calculate lateness and deduction for each student
    const latenessRecords = await calculateLatenessAndDeduction({
      teacherId,
      classDate,
      students,
    });
    // Store lateness records in DB
    const createdRecords = await prisma.$transaction(
      latenessRecords.map((rec) => prisma.latenessrecord.create({ data: rec }))
    );
    return NextResponse.json(createdRecords, { status: 201 });
  } catch (err) {
    const error = err as Error;
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to create lateness record." },
      { status: 500 }
    );
  }
}
