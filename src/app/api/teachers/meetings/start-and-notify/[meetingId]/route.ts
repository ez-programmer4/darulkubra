import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { getEthiopianTime } from "@/lib/ethiopian-time";

/**
 * Start meeting and send notification to student
 * Teacher clicks button -> Meeting starts -> Student gets notified
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

    // Find the meeting
    const meeting = await prisma.wpos_zoom_links.findFirst({
      where: {
        zoom_meeting_id: meetingId,
        ustazid: teacherId,
      },
      include: {
        wpos_wpdatatable_23: {
          select: {
            wdt_ID: true,
            name: true,
            chatId: true,
            country: true,
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

    const student = meeting.wpos_wpdatatable_23;

    // Record that teacher started the meeting
    await prisma.wpos_zoom_links.update({
      where: { id: meeting.id },
      data: {
        host_joined_at: getEthiopianTime(),
      },
    });

    // Now send notification to student
    let notificationSent = false;
    let notificationError = null;

    if (student.country === "USA") {
      // Send email
      try {
        await fetch(`https://darulkubra.com/api/email`, {
          method: "POST",
          body: JSON.stringify({
            id: student.wdt_ID,
            token: meeting.tracking_token,
          }),
        });
        notificationSent = true;
      } catch (error) {
        notificationError = "Failed to send email";
      }
    } else if (student.chatId) {
      // Send Telegram notification
      const botToken = process.env.TELEGRAM_BOT_TOKEN;

      if (!botToken) {
        notificationError = "Telegram bot token not configured";
      } else {
        try {
          const now = new Date();
          const message = `📚 **Your Teacher is Ready!**

🎓 Assalamu Alaikum ${student.name ?? "dear student"},

✅ Your teacher has started the class and is waiting for you!

📅 **Class Started:**
• **Time:** ${now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            timeZone: "Africa/Addis_Ababa",
          })}
• **Platform:** Zoom Meeting

🔗 **Join NOW:**
Click the button below to join your teacher in the class.

⏰ **Your teacher is waiting - please join immediately!**

*May Allah bless your learning journey*`;

          // Use direct Zoom link (student clicks = opens Zoom immediately)
          console.log(
            `📱 Sending Telegram with direct Zoom link: ${meeting.link}`
          );

          const requestPayload = {
            chat_id: student.chatId,
            text: message,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🔗 Join Teacher Now",
                    url: meeting.link,
                  },
                ],
              ],
            },
          };

          const telegramResponse = await fetch(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(requestPayload),
            }
          );

          const responseData = await telegramResponse.json();

          if (telegramResponse.ok && responseData.ok) {
            notificationSent = true;
          } else {
            notificationError =
              responseData.description || "Telegram API error";
          }
        } catch (err) {
          notificationError =
            err instanceof Error ? err.message : "Unknown error";
        }
      }
    }

    return NextResponse.json({
      success: true,
      start_url: meeting.start_url,
      notification_sent: notificationSent,
      notification_error: notificationError,
      student_name: student.name,
      message: notificationSent
        ? "Meeting started and student notified!"
        : "Meeting ready to start. Please notify student manually.",
    });
  } catch (error) {
    console.error("Start and notify error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to start meeting",
      },
      { status: 500 }
    );
  }
}
