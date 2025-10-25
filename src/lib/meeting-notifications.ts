import { prisma } from "@/lib/prisma";

/**
 * Send meeting reminder notification to teacher
 */
export async function sendMeetingReminder(meetingId: string) {
  try {
    const meeting = await prisma.wpos_zoom_links.findFirst({
      where: {
        zoom_meeting_id: meetingId,
      },
      include: {
        wpos_wpdatatable_23: {
          select: {
            name: true,
          },
        },
        wpos_wpdatatable_24: {
          select: {
            ustazid: true,
            ustazname: true,
          },
        },
      },
    });

    if (!meeting || !meeting.scheduled_start_time) {
      return;
    }

    const now = new Date();
    const timeDiff = meeting.scheduled_start_time.getTime() - now.getTime();
    const minutesUntilStart = Math.floor(timeDiff / (1000 * 60));

    // Only send reminder if meeting is 5-10 minutes away
    if (minutesUntilStart < 5 || minutesUntilStart > 10) {
      return;
    }

    // Create notification for teacher
    await prisma.notification.create({
      data: {
        title: "Upcoming Class",
        message: `Your class with ${meeting.wpos_wpdatatable_23.name} starts in ${minutesUntilStart} minutes`,
        type: "meeting_reminder",
        userId: meeting.ustazid || "",
        userRole: "teacher",
        isRead: false,
      },
    });

    console.log(
      `📬 Sent meeting reminder to teacher ${meeting.ustazid} for meeting ${meetingId}`
    );
  } catch (error) {
    console.error("Error sending meeting reminder:", error);
  }
}

/**
 * Send notification when student joins before teacher
 */
export async function notifyTeacherStudentWaiting(meetingId: string) {
  try {
    const meeting = await prisma.wpos_zoom_links.findFirst({
      where: {
        zoom_meeting_id: meetingId,
      },
      include: {
        wpos_wpdatatable_23: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!meeting || !meeting.ustazid) {
      return;
    }

    // Create urgent notification for teacher
    await prisma.notification.create({
      data: {
        title: "Student Waiting",
        message: `${meeting.wpos_wpdatatable_23.name} has joined the meeting and is waiting for you`,
        type: "student_waiting",
        userId: meeting.ustazid,
        userRole: "teacher",
        isRead: false,
      },
    });

    console.log(
      `📬 Notified teacher ${meeting.ustazid} that student is waiting in meeting ${meetingId}`
    );
  } catch (error) {
    console.error("Error notifying teacher:", error);
  }
}

/**
 * Get upcoming meetings that need reminders
 */
export async function getUpcomingMeetingsForReminders() {
  const now = new Date();
  const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  return await prisma.wpos_zoom_links.findMany({
    where: {
      scheduled_start_time: {
        gte: fiveMinutesFromNow,
        lte: tenMinutesFromNow,
      },
      session_status: "active",
      created_via_api: true,
    },
    include: {
      wpos_wpdatatable_23: {
        select: {
          name: true,
        },
      },
    },
  });
}

/**
 * Send meeting started notification
 */
export async function notifyMeetingStarted(meetingId: string) {
  try {
    const meeting = await prisma.wpos_zoom_links.findFirst({
      where: {
        zoom_meeting_id: meetingId,
      },
      include: {
        wpos_wpdatatable_23: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!meeting || !meeting.ustazid) {
      return;
    }

    await prisma.notification.create({
      data: {
        title: "Meeting Started",
        message: `Your class with ${meeting.wpos_wpdatatable_23.name} has started`,
        type: "meeting_started",
        userId: meeting.ustazid,
        userRole: "teacher",
        isRead: false,
      },
    });
  } catch (error) {
    console.error("Error sending meeting started notification:", error);
  }
}











