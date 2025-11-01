import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

/**
 * API to get all active meetings for a teacher
 * Shows meetings that are scheduled or currently in progress
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

    // Get all active meetings for this teacher
    const meetings = await prisma.wpos_zoom_links.findMany({
      where: {
        ustazid: teacherId,
        session_status: "active",
        created_via_api: true, // Only show API-created meetings with start URLs
      },
      select: {
        id: true,
        zoom_meeting_id: true,
        start_url: true,
        link: true,
        meeting_topic: true,
        scheduled_start_time: true,
        sent_time: true,
        zoom_start_time: true,
        host_joined_at: true,
        session_status: true,
        participant_count: true,
        wpos_wpdatatable_23: {
          select: {
            wdt_ID: true,
            name: true,
          },
        },
      },
      orderBy: {
        scheduled_start_time: "asc",
      },
    });

    // Separate upcoming and in-progress meetings
    const now = new Date();
    const upcoming = meetings.filter((m) => {
      if (!m.scheduled_start_time) return false;
      return m.scheduled_start_time > now && !m.zoom_start_time;
    });

    const inProgress = meetings.filter((m) => {
      return m.zoom_start_time && !m.host_joined_at;
    });

    const readyToStart = meetings.filter((m) => {
      if (!m.scheduled_start_time) return false;
      const timeDiff = m.scheduled_start_time.getTime() - now.getTime();
      const minutesUntilStart = Math.floor(timeDiff / (1000 * 60));
      return (
        minutesUntilStart <= 5 && minutesUntilStart >= -10 && !m.zoom_start_time
      );
    });

    return NextResponse.json({
      success: true,
      meetings: {
        ready_to_start: readyToStart.map((m) => ({
          id: m.id,
          meeting_id: m.zoom_meeting_id,
          start_url: m.start_url,
          join_url: m.link,
          topic: m.meeting_topic,
          student_id: m.wpos_wpdatatable_23.wdt_ID,
          student_name: m.wpos_wpdatatable_23.name,
          scheduled_time: m.scheduled_start_time,
          participant_count: m.participant_count,
        })),
        in_progress: inProgress.map((m) => ({
          id: m.id,
          meeting_id: m.zoom_meeting_id,
          start_url: m.start_url,
          join_url: m.link,
          topic: m.meeting_topic,
          student_id: m.wpos_wpdatatable_23.wdt_ID,
          student_name: m.wpos_wpdatatable_23.name,
          started_at: m.zoom_start_time,
          participant_count: m.participant_count,
        })),
        upcoming: upcoming.map((m) => ({
          id: m.id,
          meeting_id: m.zoom_meeting_id,
          topic: m.meeting_topic,
          student_id: m.wpos_wpdatatable_23.wdt_ID,
          student_name: m.wpos_wpdatatable_23.name,
          scheduled_time: m.scheduled_start_time,
        })),
      },
      total: meetings.length,
    });
  } catch (error) {
    console.error("Get active meetings error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get active meetings",
      },
      { status: 500 }
    );
  }
}























