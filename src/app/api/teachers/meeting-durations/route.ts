import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { getEthiopianTime } from "@/lib/ethiopian-time";

/**
 * Get teacher's meeting durations for a given month
 * Useful for transparency and verification
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token || token.role !== "teacher") {
      return NextResponse.json(
        { error: "Unauthorized - Teacher access required" },
        { status: 403 }
      );
    }

    const teacherId = token.id as string;
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month"); // YYYY-MM format

    // Default to current month
    // Use Ethiopian local time since we store times in UTC+3
    const now = getEthiopianTime();
    const targetDate = monthParam ? new Date(monthParam + "-01") : now;

    // Manually create Ethiopian month boundaries
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const startDate = new Date(year, month, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // Get all zoom links for this teacher in the month
    const meetings = await prisma.wpos_zoom_links.findMany({
      where: {
        ustazid: teacherId,
        sent_time: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        sent_time: true,
        zoom_meeting_id: true,
        zoom_actual_duration: true,
        session_duration_minutes: true,
        session_status: true,
        created_via_api: true,
        wpos_wpdatatable_23: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        sent_time: "desc",
      },
    });

    // Calculate stats
    const totalMeetings = meetings.length;
    const completedMeetings = meetings.filter(
      (m) => m.session_status === "ended" && m.zoom_actual_duration
    ).length;
    const totalMinutes = meetings.reduce(
      (sum, m) => sum + (m.zoom_actual_duration || 0),
      0
    );
    const averageDuration =
      completedMeetings > 0 ? Math.round(totalMinutes / completedMeetings) : 0;

    const meetingsWithDuration = meetings.map((m) => ({
      id: m.id,
      date: m.sent_time,
      studentName: m.wpos_wpdatatable_23.name,
      duration: m.zoom_actual_duration || null,
      status: m.session_status,
      createdViaApi: m.created_via_api,
      meetingId: m.zoom_meeting_id,
    }));

    return NextResponse.json({
      month: targetDate.toISOString().slice(0, 7),
      stats: {
        totalMeetings,
        completedMeetings,
        totalMinutes,
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        averageDuration,
      },
      meetings: meetingsWithDuration,
    });
  } catch (error) {
    console.error("Meeting durations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch meeting durations" },
      { status: 500 }
    );
  }
}
