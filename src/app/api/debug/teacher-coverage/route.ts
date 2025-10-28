import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: "Missing required parameters: fromDate, toDate" },
        { status: 400 }
      );
    }

    console.log(`
🔍 TEACHER COVERAGE ANALYSIS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
From Date: ${fromDate}
To Date: ${toDate}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // Get all teachers from main table
    const mainTableTeachers = await prisma.wpos_wpdatatable_24.findMany({
      select: {
        ustazid: true,
        ustazname: true,
      },
      orderBy: { ustazid: "asc" },
    });

    // Get teachers from zoom links in the period
    const zoomLinkTeachers = await prisma.wpos_zoom_links.findMany({
      where: {
        sent_time: {
          gte: new Date(fromDate),
          lte: new Date(toDate),
        },
      },
      select: {
        ustazid: true,
      },
      distinct: ["ustazid"],
    });

    // Get teachers from occupied times in the period
    const occupiedTimeTeachers =
      await prisma.wpos_ustaz_occupied_times.findMany({
        where: {
          occupied_at: { lte: new Date(toDate) },
          OR: [{ end_at: null }, { end_at: { gte: new Date(fromDate) } }],
        },
        select: {
          ustaz_id: true,
        },
        distinct: ["ustaz_id"],
      });

    // Create comprehensive lists
    const allTeacherIds = new Set<string>();
    const mainTableIds = new Set<string>();
    const zoomLinkIds = new Set<string>();
    const occupiedTimeIds = new Set<string>();

    // Process main table teachers
    mainTableTeachers.forEach((teacher) => {
      if (teacher.ustazid && teacher.ustazid.trim() !== "") {
        allTeacherIds.add(teacher.ustazid);
        mainTableIds.add(teacher.ustazid);
      }
    });

    // Process zoom link teachers
    zoomLinkTeachers.forEach((teacher) => {
      if (teacher.ustazid && teacher.ustazid.trim() !== "") {
        allTeacherIds.add(teacher.ustazid);
        zoomLinkIds.add(teacher.ustazid);
      }
    });

    // Process occupied time teachers
    occupiedTimeTeachers.forEach((teacher) => {
      if (teacher.ustaz_id && teacher.ustaz_id.trim() !== "") {
        allTeacherIds.add(teacher.ustaz_id);
        occupiedTimeIds.add(teacher.ustaz_id);
      }
    });

    // Find teachers only in zoom links (not in main table)
    const onlyInZoomLinks = Array.from(zoomLinkIds).filter(
      (id) => !mainTableIds.has(id)
    );

    // Find teachers only in occupied times (not in main table)
    const onlyInOccupiedTimes = Array.from(occupiedTimeIds).filter(
      (id) => !mainTableIds.has(id)
    );

    // Find teachers in main table but not in zoom links or occupied times
    const onlyInMainTable = Array.from(mainTableIds).filter(
      (id) => !zoomLinkIds.has(id) && !occupiedTimeIds.has(id)
    );

    // Create final comprehensive teacher list
    const comprehensiveTeachers = Array.from(allTeacherIds).map((teacherId) => {
      const mainTeacher = mainTableTeachers.find(
        (t) => t.ustazid === teacherId
      );
      const inZoomLinks = zoomLinkIds.has(teacherId);
      const inOccupiedTimes = occupiedTimeIds.has(teacherId);

      return {
        ustazid: teacherId,
        ustazname: mainTeacher?.ustazname || `Teacher ${teacherId}`,
        inMainTable: mainTableIds.has(teacherId),
        inZoomLinks,
        inOccupiedTimes,
        sources: [
          mainTableIds.has(teacherId) ? "main_table" : null,
          inZoomLinks ? "zoom_links" : null,
          inOccupiedTimes ? "occupied_times" : null,
        ].filter(Boolean),
      };
    });

    const analysis = {
      totalUniqueTeachers: allTeacherIds.size,
      mainTableTeachers: mainTableIds.size,
      zoomLinkTeachers: zoomLinkIds.size,
      occupiedTimeTeachers: occupiedTimeIds.size,
      onlyInZoomLinks: onlyInZoomLinks.length,
      onlyInOccupiedTimes: onlyInOccupiedTimes.length,
      onlyInMainTable: onlyInMainTable.length,
      comprehensiveTeachers,
      period: {
        from: fromDate,
        to: toDate,
      },
    };

    console.log(`
📊 TEACHER COVERAGE RESULTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Unique Teachers: ${analysis.totalUniqueTeachers}
Main Table Teachers: ${analysis.mainTableTeachers}
Zoom Link Teachers: ${analysis.zoomLinkTeachers}
Occupied Time Teachers: ${analysis.occupiedTimeTeachers}

Teachers Only in Zoom Links: ${analysis.onlyInZoomLinks}
Teachers Only in Occupied Times: ${analysis.onlyInOccupiedTimes}
Teachers Only in Main Table: ${analysis.onlyInMainTable}

Missing from Main Table: ${
      analysis.onlyInZoomLinks + analysis.onlyInOccupiedTimes
    }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    return NextResponse.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in teacher coverage analysis:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
