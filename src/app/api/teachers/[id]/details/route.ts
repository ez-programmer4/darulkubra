import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (
    !session ||
    (session.role !== "controller" &&
      session.role !== "registral" &&
      session.role !== "admin") ||
    !session.username
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teacherId = params.id;
  if (!teacherId) {
    return NextResponse.json({ error: "Invalid teacher ID" }, { status: 400 });
  }

  const url = new URL(req.url);
  const searchParams = url.searchParams;
  const startDate =
    searchParams.get("startDate") || new Date().toISOString().split("T")[0];
  const endDate =
    searchParams.get("endDate") || new Date().toISOString().split("T")[0];

  try {
    // Get teacher details
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
      include: {
        students: {
          include: {
            attendance_progress: {
              where: {
                date: {
                  gte: new Date(startDate),
                  lte: new Date(endDate),
                },
              },
            },
            zoom_links: {
              where: {
                sent_time: {
                  gte: new Date(startDate),
                  lte: new Date(endDate),
                },
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Calculate overall statistics
    let totalSessions = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalPermission = 0;
    let totalNotTaken = 0;
    let totalLinksSent = 0;
    let totalLinksClicked = 0;

    const studentPerformance = teacher.students.map((student) => {
      const attendanceBreakdown = student.attendance_progress.reduce(
        (acc, record) => {
          acc[record.attendance_status] =
            (acc[record.attendance_status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const studentSessions = student.attendance_progress.length;
      const studentPresent = attendanceBreakdown.Present || 0;
      const studentAbsent = attendanceBreakdown.Absent || 0;
      const studentPermission = attendanceBreakdown.Permission || 0;
      const studentNotTaken = attendanceBreakdown["Not Taken"] || 0;
      const studentLinksSent = student.zoom_links.length;
      const studentLinksClicked = student.zoom_links.filter(
        (link) => link.clicked_at
      ).length;

      // Add to totals
      totalSessions += studentSessions;
      totalPresent += studentPresent;
      totalAbsent += studentAbsent;
      totalPermission += studentPermission;
      totalNotTaken += studentNotTaken;
      totalLinksSent += studentLinksSent;
      totalLinksClicked += studentLinksClicked;

      return {
        studentId: student.wdt_ID,
        studentName: student.name,
        totalSessions: studentSessions,
        presentSessions: studentPresent,
        absentSessions: studentAbsent,
        permissionSessions: studentPermission,
        notTakenSessions: studentNotTaken,
        attendanceRate:
          studentSessions > 0
            ? Math.round((studentPresent / studentSessions) * 100)
            : 0,
        linksSent: studentLinksSent,
        linksClicked: studentLinksClicked,
        isAtRisk: studentSessions > 0 && studentPresent / studentSessions < 0.8,
      };
    });

    const response = {
      teacher: {
        id: teacher.ustazid,
        name: teacher.ustazname,
        phone: teacher.phone,
        schedule: teacher.schedule,
        totalStudents: teacher.students.length,
      },
      period: {
        startDate,
        endDate,
      },
      summary: {
        totalSessions,
        totalPresent,
        totalAbsent,
        totalPermission,
        totalNotTaken,
        totalLinksSent,
        totalLinksClicked,
        attendanceRate:
          totalSessions > 0
            ? Math.round((totalPresent / totalSessions) * 100)
            : 0,
        linkResponseRate:
          totalLinksSent > 0
            ? Math.round((totalLinksClicked / totalLinksSent) * 100)
            : 0,
      },
      studentPerformance,
      atRiskStudents: studentPerformance.filter((student) => student.isAtRisk),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch teacher details", details: error.message },
      { status: 500 }
    );
  }
}
