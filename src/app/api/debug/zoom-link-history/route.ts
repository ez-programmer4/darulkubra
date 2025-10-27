import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherIds = searchParams.get("teacherIds") || "U299,U294,U250";

    console.log(`
🔍 CHECKING ZOOM LINK HISTORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Teacher IDs: ${teacherIds}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    const teacherIdList = teacherIds.split(",").map((id) => id.trim());

    // Get zoom links for these teachers across all time
    const zoomLinks = await prisma.wpos_zoom_links.findMany({
      where: {
        ustazid: {
          in: teacherIdList,
        },
      },
      include: {
        wpos_wpdatatable_23: {
          select: {
            wdt_ID: true,
            name: true,
            package: true,
            daypackages: true,
            status: true,
            ustaz: true,
          },
        },
      },
      orderBy: { sent_time: "desc" },
    });

    // Group by teacher
    const teacherZoomHistory: Record<
      string,
      {
        totalLinks: number;
        linksByMonth: Record<string, number>;
        recentLinks: Array<{
          date: string;
          studentId: number;
          studentName: string;
          studentPackage: string;
        }>;
        students: Set<string>;
      }
    > = {};

    teacherIdList.forEach((teacherId) => {
      teacherZoomHistory[teacherId] = {
        totalLinks: 0,
        linksByMonth: {},
        recentLinks: [],
        students: new Set(),
      };
    });

    // Process zoom links
    zoomLinks.forEach((link) => {
      const teacherId = link.ustazid;

      // Skip if sent_time is null or teacherId is null
      if (!link.sent_time || !teacherId) return;

      const month = link.sent_time.toISOString().substring(0, 7); // YYYY-MM

      // Ensure teacher exists in history
      if (!teacherZoomHistory[teacherId]) {
        teacherZoomHistory[teacherId] = {
          totalLinks: 0,
          linksByMonth: {},
          recentLinks: [],
          students: new Set(),
        };
      }

      teacherZoomHistory[teacherId].totalLinks++;

      if (!teacherZoomHistory[teacherId].linksByMonth[month]) {
        teacherZoomHistory[teacherId].linksByMonth[month] = 0;
      }
      teacherZoomHistory[teacherId].linksByMonth[month]++;

      if (link.wpos_wpdatatable_23 && link.wpos_wpdatatable_23.name) {
        teacherZoomHistory[teacherId].students.add(
          link.wpos_wpdatatable_23.name
        );
      }

      // Keep only recent links (last 10)
      if (teacherZoomHistory[teacherId].recentLinks.length < 10) {
        teacherZoomHistory[teacherId].recentLinks.push({
          date: link.sent_time.toISOString().split("T")[0],
          studentId: link.studentid,
          studentName: link.wpos_wpdatatable_23?.name || "Unknown",
          studentPackage: link.wpos_wpdatatable_23?.package || "Unknown",
        });
      }
    });

    // Convert sets to arrays for JSON serialization
    const serializedHistory: Record<
      string,
      {
        totalLinks: number;
        linksByMonth: Record<string, number>;
        recentLinks: Array<{
          date: string;
          studentId: number;
          studentName: string;
          studentPackage: string;
        }>;
        students: string[];
      }
    > = {};

    Object.keys(teacherZoomHistory).forEach((teacherId) => {
      serializedHistory[teacherId] = {
        ...teacherZoomHistory[teacherId],
        students: Array.from(teacherZoomHistory[teacherId].students),
      };
    });

    // Get overall statistics
    const totalZoomLinks = await prisma.wpos_zoom_links.count();
    const recentZoomLinks = await prisma.wpos_zoom_links.count({
      where: {
        sent_time: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 3)), // Last 3 months
        },
      },
    });

    console.log(`
📊 ZOOM LINK HISTORY RESULTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Zoom Links in Database: ${totalZoomLinks}
Recent Zoom Links (3 months): ${recentZoomLinks}
Links Found for Target Teachers: ${zoomLinks.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    return NextResponse.json({
      teacherZoomHistory: serializedHistory,
      totalZoomLinks,
      recentZoomLinks,
      teacherIds: teacherIdList,
      summary: {
        teachersWithLinks: Object.values(serializedHistory).filter(
          (history) => history.totalLinks > 0
        ).length,
        teachersWithoutLinks: Object.values(serializedHistory).filter(
          (history) => history.totalLinks === 0
        ).length,
      },
    });
  } catch (error) {
    console.error("Error checking zoom link history:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
