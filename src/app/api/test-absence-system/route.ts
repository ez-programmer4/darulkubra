import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const teacherCount = await prisma.wpos_wpdatatable_24.count();
    const zoomLinkCount = await prisma.wpos_zoom_links.count();
    const absenceCount = await prisma.absencerecord.count();
    
    const sampleTeacher = await prisma.wpos_wpdatatable_24.findFirst({
      select: { ustazid: true, ustazname: true }
    });
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    return NextResponse.json({
      status: "System Ready",
      counts: { teachers: teacherCount, zoomLinks: zoomLinkCount, absences: absenceCount },
      sampleTeacher,
      testDate: yesterday.toISOString().split('T')[0],
      instructions: "Use the form above to process absences"
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Database error"
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    const teacher = await prisma.wpos_wpdatatable_24.findFirst();
    if (!teacher) {
      return NextResponse.json({ error: "No teachers found" }, { status: 404 });
    }

    const testDate = new Date();
    testDate.setDate(testDate.getDate() - 1);

    const testAbsence = await prisma.absencerecord.create({
      data: {
        teacherId: teacher.ustazid,
        classDate: testDate,
        permitted: false,
        deductionApplied: 50,
        reviewedByManager: false,
      }
    });

    return NextResponse.json({
      message: "Test absence created",
      record: testAbsence
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to create test"
    }, { status: 500 });
  }
}