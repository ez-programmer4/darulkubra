import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get("search") || "";

    console.log(`
🔍 CHECKING TEACHERS IN DATABASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Search Term: ${searchTerm}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // Get all teachers
    const teachers = await prisma.wpos_wpdatatable_24.findMany({
      select: {
        ustazid: true,
        ustazname: true,
      },
      orderBy: { ustazid: "asc" },
    });

    console.log(`
📊 TOTAL TEACHERS FOUND: ${teachers.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // Filter by search term if provided
    let filteredTeachers = teachers;
    if (searchTerm) {
      filteredTeachers = teachers.filter(
        (teacher) =>
          teacher.ustazid.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (teacher.ustazname &&
            teacher.ustazname.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Check for specific teacher IDs that might be similar
    const specificIds = ["U299", "U294", "U250"];
    const similarTeachers = teachers.filter((teacher) =>
      specificIds.some(
        (id) =>
          teacher.ustazid.includes(id.replace("U", "")) ||
          teacher.ustazid.includes(id)
      )
    );

    // Check for teachers with zoom links but no salary calculation
    const teachersWithZoomLinks = await prisma.wpos_zoom_links.findMany({
      where: {
        sent_time: {
          gte: new Date("2024-01-01"),
          lte: new Date("2024-01-31"),
        },
      },
      select: {
        ustazid: true,
      },
      distinct: ["ustazid"],
    });

    const zoomLinkTeacherIds = teachersWithZoomLinks.map(
      (link) => link.ustazid
    );
    const teachersNotInMainTable = zoomLinkTeacherIds.filter(
      (id) => !teachers.some((teacher) => teacher.ustazid === id)
    );

    console.log(`
🔍 ANALYSIS RESULTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Teachers in Database: ${teachers.length}
Teachers with Zoom Links: ${zoomLinkTeacherIds.length}
Teachers with Zoom Links but NOT in Main Table: ${teachersNotInMainTable.length}
Similar to U299/U294/U250: ${similarTeachers.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    return NextResponse.json({
      totalTeachers: teachers.length,
      filteredTeachers: filteredTeachers.slice(0, 50), // Limit to first 50 for performance
      similarTeachers,
      teachersWithZoomLinks: zoomLinkTeacherIds.slice(0, 20), // Limit for performance
      teachersNotInMainTable,
      specificIds,
      searchTerm,
    });
  } catch (error) {
    console.error("Error checking teachers:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
