import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

async function sendSMS(phone: string, message: string) {
  const apiToken = process.env.AFROMSG_API_TOKEN;
  const senderUid = process.env.AFROMSG_SENDER_UID;
  const senderName = process.env.AFROMSG_SENDER_NAME;

  if (apiToken && senderUid && senderName) {
    const payload = {
      from: senderUid,
      sender: senderName,
      to: phone,
      message,
    };

    const response = await fetch("https://api.afromessage.com/api/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return response.ok;
  }
  return false;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teacherName, absenceDate, reason } = await req.json();
    const permissionId = parseInt(params.id);

    // Get permission request details
    const permission = await prisma.permissionrequest.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      return NextResponse.json(
        { error: "Permission request not found" },
        { status: 404 }
      );
    }

    // Use actual date from permission request
    const actualDate = permission.requestedDates;
    const dateToUse = actualDate || absenceDate;
    const formattedDate = new Date(dateToUse).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Get all students assigned to this teacher
    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: { ustaz: permission.teacherId },
      select: {
        wdt_ID: true,
        name: true,
        phoneno: true,
        chatId: true,
      },
    });

    let smsCount = 0;
    let telegramCount = 0;
    const methods = [];

    const message = `Dear Student, your teacher ${
      teacherName || "your teacher"
    } will be absent on ${formattedDate} due to ${
      reason || "personal reasons"
    }. Please check for any schedule changes.`;

    // Send SMS notifications
    for (const student of students) {
      if (student.phoneno) {
        try {
          const smsSent = await sendSMS(student.phoneno, message);
          if (smsSent) {
            smsCount++;
          }
        } catch (error) {
          console.error(
            `Failed to send SMS to student ${student.wdt_ID}:`,
            error
          );
        }
      }
    }

    // Send Telegram notifications (if bot token is available)
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) {
      for (const student of students) {
        if (student.chatId) {
          try {
            const telegramResponse = await fetch(
              `https://api.telegram.org/bot${botToken}/sendMessage`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: student.chatId,
                  text: `📚 ${message}`,
                  parse_mode: "Markdown",
                }),
              }
            );

            if (telegramResponse.ok) {
              telegramCount++;
            }
          } catch (error) {
            console.error(
              `Failed to send Telegram to student ${student.wdt_ID}:`,
              error
            );
          }
        }
      }
    }

    if (smsCount > 0) methods.push("SMS");
    if (telegramCount > 0) methods.push("Telegram");

    const totalSent = smsCount + telegramCount;

    return NextResponse.json({
      success: totalSent > 0,
      sentCount: totalSent,
      smsCount,
      telegramCount,
      methods,
      totalStudents: students.length,
      message: `Notified ${totalSent} students out of ${students.length} total students`,
    });
  } catch (error) {
    console.error("Notify students error:", error);
    return NextResponse.json(
      { error: "Failed to notify students" },
      { status: 500 }
    );
  }
}
