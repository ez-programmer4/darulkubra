import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
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
    const studentId = Number(params.id);

    if (!Number.isFinite(studentId)) {
      return NextResponse.json(
        { error: "Invalid student id" },
        { status: 400 }
      );
    }
    const { link, tracking_token, expiration_date } = await req.json();
    if (!link) {
      return NextResponse.json({ error: "link is required" }, { status: 400 });
    }

    // Verify ownership and collect student messaging info
    const student = await prisma.wpos_wpdatatable_23.findUnique({
      where: { wdt_ID: studentId },
      select: {
        wdt_ID: true,
        country: true,
        ustaz: true,
        chatId: true,
        name: true,
        phoneno: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (student.ustaz !== teacherId) {
      return NextResponse.json({ error: "Not your student" }, { status: 403 });
    }

    // Coerce/validate fields - adjust for local timezone (Ethiopia is UTC+3)
    const now = new Date();
    const localTime = new Date(now.getTime() + 3 * 60 * 60 * 1000); // Add 3 hours for Ethiopia timezone
    const expiry = expiration_date ? new Date(expiration_date) : null;

    // Format as 12-hour time string
    const timeString = localTime.toLocaleTimeString("en-US", { hour12: true });

    // Format time as 12-hour with AM/PM for display
    const formattedTime = localTime.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    const tokenToUse: string =
      (tracking_token && String(tracking_token)) ||
      crypto.randomBytes(16).toString("hex").toUpperCase();

    // Persist record
    let created;
    try {
      created = await prisma.wpos_zoom_links.create({
        data: {
          studentid: studentId,
          ustazid: teacherId,
          link,
          tracking_token: tokenToUse,
          sent_time: localTime,
          expiration_date: expiry ?? undefined,
        },
      });
    } catch (createError: any) {
      console.error("Zoom link creation error:", createError);

      // Try raw SQL as fallback
      try {
        await prisma.$executeRaw`
          INSERT INTO wpos_zoom_links (studentid, ustazid, link, tracking_token, sent_time, expiration_date, clicked_at, report, Click, Status)
          VALUES (${studentId}, ${teacherId}, ${link}, ${tokenToUse}, ${localTime}, ${expiry}, NULL, 0, 0, 'sent')
        `;

        // Get the created record
        created = await prisma.wpos_zoom_links.findFirst({
          where: {
            studentid: studentId,
            tracking_token: tokenToUse,
          },
          orderBy: { id: "desc" },
        });

        if (!created) {
          throw new Error("Failed to retrieve created zoom link");
        }
      } catch (rawError: any) {
        console.error("Raw SQL zoom link creation failed:", {
          error: rawError,
          code: rawError.code,
          message: rawError.message,
          meta: rawError.meta,
        });

        // Return a response instead of throwing to avoid 500 error
        return NextResponse.json(
          {
            error: "Database error",
            details: rawError.message || "Failed to create zoom link",
            notification_sent: false,
            notification_method: "none",
          },
          { status: 500 }
        );
      }
    }

    // Build tracking URL from request headers
    const host = req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") ?? "http";
    const baseUrl = `${proto}://${host}`;
    const trackURL = `${baseUrl}/api/zoom/track?token=${encodeURIComponent(
      tokenToUse
    )}`;

    let notificationSent = false;
    let notificationError = null;

    if (student.country === "USA") {
      // send email
      await fetch(`https://darulkubra.com/api/email`, {
        method: "POST",
        body: JSON.stringify({ id: student.wdt_ID, token: tokenToUse }),
      });
    } else {
      // Send Telegram notification
      const botToken = process.env.TELEGRAM_BOT_TOKEN;

      if (!botToken) {
        notificationError = "Telegram bot token not configured";
        console.error("TELEGRAM_BOT_TOKEN environment variable is missing");
      } else if (!student.chatId) {
        notificationError = "Student has no Telegram chat ID";
      } else {
        try {
          const message = `🎓 Assalamu Alaikum dear ${
            student.name ?? "student"
          },\n\nYour teacher has shared a Zoom link for your class. Click the button below to join:`;

          const requestPayload = {
            chat_id: student.chatId,
            text: message,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🔗 Join Zoom Class",
                    url: trackURL,
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
                "User-Agent": "ZoomLinkBot/1.0",
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
            console.error("❌ Telegram API error:", {
              error_code: responseData.error_code,
              description: responseData.description,
              parameters: responseData.parameters,
            });
          }
        } catch (err) {
          notificationError =
            err instanceof Error ? err.message : "Unknown error";
          console.error("❌ Telegram request failed:", err);
        }
      }
    }
    return NextResponse.json(
      {
        id: created.id,
        tracking_token: tokenToUse,
        tracking_url: trackURL,
        notification_sent: notificationSent,
        notification_method: notificationSent ? "telegram" : "none",
        notification_error: notificationError,
        student_name: student.name,
        student_chat_id: student.chatId,
        sent_time_formatted: timeString,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Zoom API - Error", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
