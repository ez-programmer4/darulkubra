import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";

const BonusRecordSchema = z.object({
  period: z.string().min(1),
  amount: z.number(),
  reason: z.string().min(1),
});

// Helper to send SMS
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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (user.role !== "admin" && user.role !== "controller") {
      return NextResponse.json(
        { error: "Forbidden: Admins or controllers only." },
        { status: 403 }
      );
    }
    const teacherId = params.id;
    const records = await prisma.bonusrecord.findMany({
      where: { teacherId },
      orderBy: { period: "desc" },
    });
    return NextResponse.json(records);
  } catch (err) {
    const error = err as Error;
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch bonus records." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (user.role !== "admin" && user.role !== "controller") {
      return NextResponse.json(
        { error: "Forbidden: Admins or controllers only." },
        { status: 403 }
      );
    }
    const teacherId = params.id;
    const body = await req.json();
    const parseResult = BonusRecordSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.issues },
        { status: 400 }
      );
    }
    const { period, amount, reason } = parseResult.data;
    // Check if bonus record already exists for this teacher and period
    const existingRecord = await prisma.bonusrecord.findFirst({
      where: {
        teacherId,
        period,
      },
    });

    let record;
    if (existingRecord) {
      // Update existing record
      record = await prisma.bonusrecord.update({
        where: { id: existingRecord.id },
        data: {
          amount,
          reason,
        },
      });
    } else {
      // Create new record
      record = await prisma.bonusrecord.create({
        data: {
          teacherId,
          period,
          amount,
          reason,
        },
      });
    }
    // System notification
    await prisma.notification.create({
      data: {
        userId: teacherId,
        type: "bonus_awarded",
        title: "Bonus Awarded",
        message: `You have been awarded a bonus of ${amount} ETB for ${period}. Reason: ${reason}`,
        userRole: "teacher",
      },
    });
    // SMS notification
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
      select: { phone: true, ustazname: true },
    });
    if (teacher?.phone) {
      const smsMessage = `Dear ${
        teacher.ustazname || "Teacher"
      }, you have been awarded a bonus of ${amount} ETB for ${period}. Reason: ${reason}. Congratulations!`;
      await sendSMS(teacher.phone, smsMessage);
    }
    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    const error = err as Error;
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to create bonus record." },
      { status: 500 }
    );
  }
}
