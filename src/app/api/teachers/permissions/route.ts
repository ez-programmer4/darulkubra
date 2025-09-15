import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdminNotification } from "@/lib/notifications";

async function sendSMS(phone: string, message: string) {
  const apiToken = process.env.AFROMSG_API_TOKEN;
  const senderUid = process.env.AFROMSG_SENDER_UID;
  const senderName = process.env.AFROMSG_SENDER_NAME;

  if (!apiToken || !senderUid || !senderName) {
    return false;
  }

  const payload = {
    from: senderUid,
    sender: senderName,
    to: phone,
    message,
  };

  try {
    const response = await fetch("https://api.afromessage.com/api/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.text();

    if (!response.ok) {
      console.error(`SMS failed for ${phone}: ${response.status} - ${result}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`SMS error for ${phone}:`, error);
    return false;
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
    const { date, timeSlots, reason, details } = body;

    if (!date || !timeSlots || !reason || !details) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: date, timeSlots, reason, and details are required",
        },
        { status: 400 }
      );
    }

    // Check for existing requests for the same date
    const existingRequest = await prisma.permissionrequest.findFirst({
      where: {
        teacherId: user.id,
        requestedDate: date,
      },
    });
    if (existingRequest) {
      return NextResponse.json(
        {
          error:
            "❌ Duplicate Request: You have already submitted a permission request for this date. Please check your existing requests.",
        },
        { status: 400 }
      );
    }

    // Check for multiple permission requests in a single day (limit to 1 per day)
    const today = new Date().toISOString().split("T")[0];
    const todayRequests = await prisma.permissionrequest.count({
      where: {
        teacherId: user.id,
        createdAt: {
          gte: new Date(today + "T00:00:00.000Z"),
          lt: new Date(today + "T23:59:59.999Z"),
        },
      },
    });

    if (todayRequests >= 1) {
      return NextResponse.json(
        {
          error:
            "⚠️ Daily Limit Reached: You can only submit one permission request per day. Please wait until tomorrow to submit another request.",
        },
        { status: 400 }
      );
    }

    // Additional validation: Check if the requested date is not in the past
    const requestedDate = new Date(date);
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    if (requestedDate < currentDate) {
      return NextResponse.json(
        {
          error:
            "📅 Invalid Date: You cannot request permission for past dates. Please select a future date.",
        },
        { status: 400 }
      );
    }

    // Check if the requested date is too far in the future (e.g., more than 30 days)
    const maxFutureDate = new Date();
    maxFutureDate.setDate(maxFutureDate.getDate() + 30);

    if (requestedDate > maxFutureDate) {
      return NextResponse.json(
        {
          error:
            "📅 Date Too Far: Permission requests can only be made up to 30 days in advance. Please select a nearer date.",
        },
        { status: 400 }
      );
    }

    const permissionRequest = await prisma.permissionrequest.create({
      data: {
        teacherId: user.id,
        requestedDate: date,
        timeSlots: JSON.stringify(timeSlots),
        reasonCategory: reason,
        reasonDetails: details,
        status: "Pending",
      },
    });
    // Get teacher info for notifications
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: user.id },
    });
    const teacherName = teacher?.ustazname || user.id;

    // Send SMS notifications to admins with phone numbers
    const adminsWithPhone = await prisma.admin.findMany({
      where: { phoneno: { not: null } },
    });

    // Format time slots for SMS
    const timeSlotText = timeSlots.includes("Whole Day")
      ? "Whole Day"
      : timeSlots.join(", ");

    const smsMessage = `New absence request from ${teacherName} for ${date} (${timeSlotText}). Reason: ${reason}. Please review in admin panel.`;
    
    let smsCount = 0;

    for (const admin of adminsWithPhone) {
      if (admin.phoneno) {
        const success = await sendSMS(admin.phoneno, smsMessage);
        if (success) {
          smsCount++;
        }
      }
    }

    // Create system notifications for all admins
    let notificationCount = 0;
    try {
      const notifications = await createAdminNotification(
        "🔔 New Permission Request",
        `${teacherName} has requested permission for absence on ${new Date(
          date
        ).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })} (${timeSlotText}). Reason: ${reason}. Click to review and approve/decline.`,
        "permission_request"
      );
      notificationCount = notifications.length;
    } catch (error) {
      console.error("Failed to create admin notifications:", error);
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "✅ Permission request submitted successfully! Admin team has been notified and will review your request soon.",
        permissionRequest,
        notifications: {
          sms_sent: smsCount,
          system_notifications: notificationCount,
          total_admins: adminsWithPhone.length
        },
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
