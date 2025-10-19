import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * Zoom Webhook Handler
 * Receives events from Zoom when meetings start, end, etc.
 */

// GET handler for testing/validation
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "ok",
    message: "Zoom webhook endpoint is ready",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    // Verify webhook signature (security)
    const signature = req.headers.get("x-zm-signature");
    const timestamp = req.headers.get("x-zm-request-timestamp");

    // TODO: Re-enable signature verification in production
    // For now, skip verification to allow testing
    if (
      false &&
      process.env.ZOOM_WEBHOOK_SECRET_TOKEN &&
      signature &&
      timestamp
    ) {
      const webhookSecret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN as string;
      const message = `v0:${timestamp}:${body}`;
      const hashForVerify = crypto
        .createHmac("sha256", webhookSecret)
        .update(message)
        .digest("hex");
      const computedSignature = `v0=${hashForVerify}`;

      if (computedSignature !== signature) {
        console.error("Invalid Zoom webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 403 }
        );
      }
    }

    const payload = JSON.parse(body);
    const event = payload.event;

    // Handle URL verification (one-time setup)
    if (event === "endpoint.url_validation") {
      const webhookSecret =
        process.env.ZOOM_WEBHOOK_SECRET_TOKEN || "default_secret";
      return NextResponse.json({
        plainToken: payload.payload.plainToken,
        encryptedToken: crypto
          .createHmac("sha256", webhookSecret)
          .update(payload.payload.plainToken)
          .digest("hex"),
      });
    }

    console.log("Zoom webhook event received:", event);

    // Handle different events
    switch (event) {
      case "meeting.started":
        await handleMeetingStarted(payload.payload.object);
        break;

      case "meeting.ended":
        await handleMeetingEnded(payload.payload.object);
        break;

      case "meeting.participant_joined":
        await handleParticipantJoined(payload.payload.object);
        break;

      case "meeting.participant_left":
        await handleParticipantLeft(payload.payload.object);
        break;

      case "recording.started":
        await handleRecordingStarted(payload.payload.object);
        break;

      case "recording.stopped":
        await handleRecordingStopped(payload.payload.object);
        break;

      case "meeting.sharing_started":
        await handleScreenShareStarted(payload.payload.object);
        break;

      case "meeting.sharing_ended":
        await handleScreenShareEnded(payload.payload.object);
        break;

      default:
        console.log("Unhandled event type:", event);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Zoom webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleMeetingStarted(meeting: any) {
  try {
    const meetingId = String(meeting.id);
    const startTime = new Date(meeting.start_time);

    console.log(`Meeting started: ${meetingId} at ${startTime}`);

    // Update zoom link record
    await prisma.wpos_zoom_links.updateMany({
      where: { zoom_meeting_id: meetingId },
      data: {
        zoom_start_time: startTime,
        session_status: "active",
        last_activity_at: startTime,
      },
    });

    // Send notification to teacher
    const { notifyMeetingStarted } = await import(
      "@/lib/meeting-notifications"
    );
    await notifyMeetingStarted(meetingId);
  } catch (error) {
    console.error("Error handling meeting.started:", error);
  }
}

async function handleMeetingEnded(meeting: any) {
  try {
    const meetingId = String(meeting.id);
    const endTime = new Date(meeting.end_time);
    const startTime = new Date(meeting.start_time);

    // Calculate ACTUAL duration from start and end times
    const actualDurationMs = endTime.getTime() - startTime.getTime();
    const actualDurationMinutes = Math.round(actualDurationMs / (1000 * 60));

    // Use actual calculated duration, not scheduled duration from webhook
    const duration = actualDurationMinutes;

    console.log(`Meeting ended: ${meetingId}`);
    console.log(`  Scheduled duration: ${meeting.duration} min`);
    console.log(`  Actual duration: ${duration} min`);
    console.log(`  Start: ${startTime.toISOString()}`);
    console.log(`  End: ${endTime.toISOString()}`);

    // Try to find the zoom link record by meeting ID or by matching the link
    let zoomLink = await prisma.wpos_zoom_links.findFirst({
      where: { zoom_meeting_id: meetingId },
      select: {
        id: true,
        ustazid: true,
        host_joined_at: true,
        host_left_at: true,
        student_joined_at: true,
        student_left_at: true,
        teacher_duration_minutes: true,
        student_duration_minutes: true,
      },
    });

    // If not found by meeting ID, try finding by link containing the meeting ID
    if (!zoomLink) {
      console.log(`Trying to find meeting by link pattern: /j/${meetingId}`);
      zoomLink = await prisma.wpos_zoom_links.findFirst({
        where: {
          link: {
            contains: `/j/${meetingId}`,
          },
          session_status: "active",
        },
        select: {
          id: true,
          ustazid: true,
          host_joined_at: true,
          host_left_at: true,
          student_joined_at: true,
          student_left_at: true,
          teacher_duration_minutes: true,
          student_duration_minutes: true,
        },
        orderBy: { sent_time: "desc" },
      });
    }

    if (!zoomLink) {
      console.warn(`No zoom link found for meeting ${meetingId}`);
      console.log(`Checking all recent active meetings...`);

      // Debug: Show recent active meetings
      const recentMeetings = await prisma.wpos_zoom_links.findMany({
        where: { session_status: "active" },
        select: { id: true, zoom_meeting_id: true, link: true },
        take: 5,
        orderBy: { sent_time: "desc" },
      });
      console.log(`Recent active meetings:`, recentMeetings);
      return;
    }

    // Calculate final durations for participants who haven't left yet
    const updateData: any = {
      session_status: "ended",
      session_duration_minutes: duration,
      session_ended_at: endTime,
      last_activity_at: endTime,
    };

    // If teacher hasn't left yet, calculate their duration to meeting end
    if (
      zoomLink.host_joined_at &&
      !zoomLink.host_left_at &&
      !zoomLink.teacher_duration_minutes
    ) {
      const teacherDurationMs =
        endTime.getTime() - zoomLink.host_joined_at.getTime();
      const teacherDurationMinutes = Math.round(
        teacherDurationMs / (1000 * 60)
      );
      updateData.teacher_duration_minutes = teacherDurationMinutes;
      updateData.host_left_at = endTime; // Mark as left when meeting ended
      console.log(
        `👨‍🏫 Final teacher duration: ${teacherDurationMinutes} minutes (meeting ended)`
      );
    }

    // If student hasn't left yet, calculate their duration to meeting end
    if (
      zoomLink.student_joined_at &&
      !zoomLink.student_left_at &&
      !zoomLink.student_duration_minutes
    ) {
      const studentDurationMs =
        endTime.getTime() - zoomLink.student_joined_at.getTime();
      const studentDurationMinutes = Math.round(
        studentDurationMs / (1000 * 60)
      );
      updateData.student_duration_minutes = studentDurationMinutes;
      updateData.student_left_at = endTime; // Mark as left when meeting ended
      console.log(
        `👨‍🎓 Final student duration: ${studentDurationMinutes} minutes (meeting ended)`
      );
    }

    // Update the found record with actual duration and participant durations
    const updated = await prisma.wpos_zoom_links.update({
      where: { id: zoomLink.id },
      data: updateData,
    });

    console.log(
      `✅ Updated zoom link ID ${updated.id} with duration ${duration} minutes`
    );

    // Clear salary calculator cache for this teacher
    if (zoomLink.ustazid) {
      const { SalaryCalculator } = await import("@/lib/salary-calculator");
      SalaryCalculator.clearGlobalTeacherCache(zoomLink.ustazid);

      const { clearCalculatorCache } = await import("@/lib/calculator-cache");
      clearCalculatorCache();

      console.log(`Cleared salary cache for teacher ${zoomLink.ustazid}`);
    }
  } catch (error) {
    console.error("Error handling meeting.ended:", error);
  }
}

async function handleParticipantJoined(participant: any) {
  try {
    const meetingId = String(participant.id);
    const joinTime = new Date(participant.participant.join_time);
    const participantName = participant.participant.user_name;
    const isHost = participant.participant.role === "host";

    console.log(
      `Participant joined meeting ${meetingId}: ${participantName} (${
        isHost ? "Host" : "Guest"
      })`
    );
    console.log(
      `🔍 Debug - Participant role: "${participant.participant.role}"`
    );
    console.log(`🔍 Debug - Participant ID: "${participant.participant.id}"`);
    console.log(
      `🔍 Debug - Participant email: "${
        participant.participant.email || "N/A"
      }"`
    );

    // Find the meeting
    const link = await prisma.wpos_zoom_links.findFirst({
      where: { zoom_meeting_id: meetingId },
      include: {
        wpos_wpdatatable_24: true, // Include teacher info
      },
    });

    if (!link) {
      console.warn(`Meeting ${meetingId} not found in database`);
      return;
    }

    // Get teacher name for identification
    const teacherName = link.wpos_wpdatatable_24?.ustazname;
    console.log(`🔍 Debug - Teacher name in DB: "${teacherName}"`);
    console.log(`🔍 Debug - Participant name: "${participantName}"`);

    // Workaround: Multiple strategies to identify teacher
    const nameMatch = teacherName && participantName.includes(teacherName);

    // Strategy 2: First person to join is usually the teacher (since join_before_host: false)
    const isFirstParticipant = (link.participant_count || 0) === 0;

    const isActuallyHost = isHost || nameMatch || isFirstParticipant;
    console.log(
      `🔍 Debug - Final host determination: ${isActuallyHost} (role: ${isHost}, name: ${nameMatch}, first: ${isFirstParticipant})`
    );

    // Update based on who joined
    const updateData: any = {
      last_activity_at: joinTime,
      participant_count: (link.participant_count || 0) + 1,
    };

    // If host (teacher) joined, mark host_joined_at
    if (isActuallyHost && !link.host_joined_at) {
      updateData.host_joined_at = joinTime;
      console.log(
        `📍 Teacher joined meeting ${meetingId} at ${joinTime.toISOString()}`
      );
    }

    // If this is the student joining (not host), mark student_joined_at
    if (!isActuallyHost) {
      if (!link.student_joined_at) {
        updateData.student_joined_at = joinTime;
        console.log(
          `📍 Student joined meeting ${meetingId} at ${joinTime.toISOString()}`
        );
      }

      if (!link.clicked_at) {
        updateData.clicked_at = joinTime;
      }

      // If student joined before teacher, notify teacher
      if (!link.host_joined_at) {
        const { notifyTeacherStudentWaiting } = await import(
          "@/lib/meeting-notifications"
        );
        await notifyTeacherStudentWaiting(meetingId);
      }
    }

    await prisma.wpos_zoom_links.update({
      where: { id: link.id },
      data: updateData,
    });
  } catch (error) {
    console.error("Error handling participant.joined:", error);
  }
}

async function handleParticipantLeft(participant: any) {
  try {
    const meetingId = String(participant.id);
    const leaveTime = new Date(participant.participant.leave_time);
    const participantName = participant.participant.user_name;
    const isHost = participant.participant.role === "host";

    console.log(
      `Participant left meeting ${meetingId}: ${participantName} (${
        isHost ? "Host" : "Guest"
      })`
    );

    // Get meeting data to calculate durations
    const meeting = await prisma.wpos_zoom_links.findFirst({
      where: { zoom_meeting_id: meetingId },
      include: {
        wpos_wpdatatable_24: true, // Include teacher info
      },
    });

    if (!meeting) {
      console.warn(`Meeting ${meetingId} not found`);
      return;
    }

    // Get teacher name for identification
    const teacherName = meeting.wpos_wpdatatable_24?.ustazname;
    console.log(`🔍 Debug - Teacher name in DB: "${teacherName}"`);
    console.log(`🔍 Debug - Participant name: "${participantName}"`);

    // Workaround: Multiple strategies to identify teacher
    const nameMatch = teacherName && participantName.includes(teacherName);

    const isActuallyHost = isHost || nameMatch;
    console.log(
      `🔍 Debug - Final host determination: ${isActuallyHost} (role: ${isHost}, name: ${nameMatch})`
    );

    const updateData: any = {
      last_activity_at: leaveTime,
      participant_count: Math.max(0, (meeting.participant_count || 1) - 1),
    };

    // Calculate and store teacher duration if host left
    if (isActuallyHost && meeting.host_joined_at) {
      updateData.host_left_at = leaveTime;
      const durationMs = leaveTime.getTime() - meeting.host_joined_at.getTime();
      const durationMinutes = Math.round(durationMs / (1000 * 60));
      updateData.teacher_duration_minutes = durationMinutes;
      console.log(
        `👨‍🏫 Teacher duration: ${durationMinutes} minutes (${meeting.host_joined_at.toISOString()} → ${leaveTime.toISOString()})`
      );
    }

    // Calculate and store student duration if student left
    if (!isActuallyHost && meeting.student_joined_at) {
      updateData.student_left_at = leaveTime;
      const durationMs =
        leaveTime.getTime() - meeting.student_joined_at.getTime();
      const durationMinutes = Math.round(durationMs / (1000 * 60));
      updateData.student_duration_minutes = durationMinutes;
      console.log(
        `👨‍🎓 Student duration: ${durationMinutes} minutes (${meeting.student_joined_at.toISOString()} → ${leaveTime.toISOString()})`
      );
    }

    await prisma.wpos_zoom_links.update({
      where: { id: meeting.id },
      data: updateData,
    });
  } catch (error) {
    console.error("Error handling participant.left:", error);
  }
}

async function handleRecordingStarted(recording: any) {
  try {
    const meetingId = String(recording.id);
    console.log(`Recording started for meeting ${meetingId}`);

    await prisma.wpos_zoom_links.updateMany({
      where: { zoom_meeting_id: meetingId },
      data: {
        recording_started: true,
        last_activity_at: new Date(),
      },
    });
  } catch (error) {
    console.error("Error handling recording.started:", error);
  }
}

async function handleRecordingStopped(recording: any) {
  try {
    const meetingId = String(recording.id);
    console.log(`Recording stopped for meeting ${meetingId}`);

    await prisma.wpos_zoom_links.updateMany({
      where: { zoom_meeting_id: meetingId },
      data: {
        recording_started: false,
        last_activity_at: new Date(),
      },
    });
  } catch (error) {
    console.error("Error handling recording.stopped:", error);
  }
}

async function handleScreenShareStarted(meeting: any) {
  try {
    const meetingId = String(meeting.id);
    console.log(`Screen share started for meeting ${meetingId}`);

    await prisma.wpos_zoom_links.updateMany({
      where: { zoom_meeting_id: meetingId },
      data: {
        screen_share_started: true,
        last_activity_at: new Date(),
      },
    });
  } catch (error) {
    console.error("Error handling screen share started:", error);
  }
}

async function handleScreenShareEnded(meeting: any) {
  try {
    const meetingId = String(meeting.id);
    console.log(`Screen share ended for meeting ${meetingId}`);

    await prisma.wpos_zoom_links.updateMany({
      where: { zoom_meeting_id: meetingId },
      data: {
        screen_share_started: false,
        last_activity_at: new Date(),
      },
    });
  } catch (error) {
    console.error("Error handling screen share ended:", error);
  }
}
