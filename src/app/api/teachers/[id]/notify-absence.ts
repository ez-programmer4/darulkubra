import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    await fetch("https://api.afromessage.com/api/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const teacherId = params.id;
    const { dates, teacherName } = await req.json();
    // Find all students for this teacher
    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: { ustaz: teacherId },
      select: { wdt_ID: true, name: true, phoneno: true },
    });
    // Create a notification for each student and send SMS if phone exists
    const message = `Teacher ${teacherName} will be absent on ${dates}. Your class is cancelled/rescheduled.`;
    let smsSent = 0;
    await Promise.all(
      students.map(async (student) => {
        await prisma.notification.create({
          data: {
            userId: student.wdt_ID,
            type: "absence",
            message,
            read: false,
          },
        });
        if (student.phoneno) {
          await sendSMS(student.phoneno, message);
          smsSent++;
        }
      })
    );
    return NextResponse.json({
      success: true,
      notified: students.length,
      smsSent,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to notify students." },
      { status: 500 }
    );
  }
}
