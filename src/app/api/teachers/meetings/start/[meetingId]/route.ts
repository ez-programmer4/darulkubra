import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { getEthiopianTime } from "@/lib/ethiopian-time";

/**
 * API to get the start URL for a teacher's meeting
 * This allows teachers to easily start their Zoom meetings with one click
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { meetingId: string } }
) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token || token.role !== "teacher") {
      return NextResponse.json(
        { error: "Unauthorized - Teacher access required" },
        { status: 403 }
      );
    }

    const teacherId = token.id as string;
    const meetingId = params.meetingId;

    // Find the meeting
    const meeting = await prisma.wpos_zoom_links.findFirst({
      where: {
        zoom_meeting_id: meetingId,
        ustazid: teacherId,
      },
      select: {
        id: true,
        start_url: true,
        link: true,
        meeting_topic: true,
        scheduled_start_time: true,
        session_status: true,
        zoom_start_time: true,
        host_joined_at: true,
        wpos_wpdatatable_23: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!meeting) {
      return NextResponse.json(
        { error: "Meeting not found or you don't have access" },
        { status: 404 }
      );
    }

    // Return meeting details with start URL
    return NextResponse.json({
      success: true,
      meeting: {
        id: meetingId,
        start_url: meeting.start_url,
        join_url: meeting.link,
        topic: meeting.meeting_topic,
        student_name: meeting.wpos_wpdatatable_23.name,
        scheduled_time: meeting.scheduled_start_time,
        status: meeting.session_status,
        started_at: meeting.zoom_start_time,
        host_joined_at: meeting.host_joined_at,
      },
    });
  } catch (error) {
    console.error("Get meeting start URL error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get meeting details",
      },
      { status: 500 }
    );
  }
}

/**
 * Mark that the teacher has clicked the start button
 * This helps track when the teacher attempts to start the meeting
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { meetingId: string } }
) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token || token.role !== "teacher") {
      return NextResponse.json(
        { error: "Unauthorized - Teacher access required" },
        { status: 403 }
      );
    }

    const teacherId = token.id as string;
    const meetingId = params.meetingId;

    // Update that the teacher has attempted to start the meeting
    const meeting = await prisma.wpos_zoom_links.updateMany({
      where: {
        zoom_meeting_id: meetingId,
        ustazid: teacherId,
      },
      data: {
        host_joined_at: getEthiopianTime(),
      },
    });

    if (meeting.count === 0) {
      return NextResponse.json(
        { error: "Meeting not found or you don't have access" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Meeting start recorded",
    });
  } catch (error) {
    console.error("Record meeting start error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to record meeting start",
      },
      { status: 500 }
    );
  }
}
