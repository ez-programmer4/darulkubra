import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      (session.user as { id: string; role: string }).role !== "teacher"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const user = session.user as { id: string; role: string };
    const body = await req.json();
    const { date, reason, details } = body;

    if (!date || !reason || !details) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: date, reason, and details are required",
        },
        { status: 400 }
      );
    }

    // Prevent duplicate requests for the same date
    const existingRequest = await prisma.permissionrequest.findFirst({
      where: {
        teacherId: user.id,
        requestedDates: date,
      },
    });
    if (existingRequest) {
      return NextResponse.json(
        {
          error:
            "You have already submitted a permission request for this date.",
        },
        { status: 400 }
      );
    }

    const permissionRequest = await prisma.permissionrequest.create({
      data: {
        teacherId: user.id,
        requestedDates: date,
        reasonCategory: reason,
        reasonDetails: details,
        status: "Pending",
      },
    });
    // Notify all admins with a phone number
    const admins = await prisma.admin.findMany({
      where: { phoneno: { not: null } },
    });
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: user.id },
    });
    const teacherName = teacher?.ustazname || user.id;
    const message = `New absence permission request from ${teacherName} for ${date}. Please review in the admin panel.`;

    for (const admin of admins) {
      try {
        if (admin.phoneno) {
          await sendSMS(admin.phoneno, message);
        }
        // Temporarily disable notification creation due to database schema mismatch
        // await prisma.notification.create({
        //   data: {
        //     userId: admin.id.toString(),
        //     type: "permission_request",
        //     message,
        //     userRole: "admin",
        //   },
        // });
      } catch (notificationError) {
        // Continue with other admins even if one fails
      }
    }

    return NextResponse.json(
      {
        message: "Permission request submitted successfully",
        permissionRequest,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      (session.user as { id: string; role: string }).role !== "teacher"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const user = session.user as { id: string; role: string };

    const permissions = await prisma.permissionrequest.findMany({
      where: { teacherId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(permissions);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
