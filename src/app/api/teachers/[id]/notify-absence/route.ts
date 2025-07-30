import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST: Notify all students of a teacher about an accepted permission/absence
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const teacherId = params.id;
    const { dates, teacherName } = await req.json();
    if (!teacherId || !dates) {
      return NextResponse.json(
        { error: "Missing teacherId or dates." },
        { status: 400 }
      );
    }
    // Find all students for this teacher (wpos_wpdatatable_23 where ustaz == teacherId)
    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: { ustaz: teacherId },
    });
    // Mock notification: just collect phone numbers/names
    const notified = students.map((s) => ({
      studentId: s.wdt_ID,
      name: s.name,
      phone: s.phoneno,
    }));
    // Here you would send SMS/email notifications
    // For now, just return the list
    return NextResponse.json({ success: true, notified, dates, teacherName });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
