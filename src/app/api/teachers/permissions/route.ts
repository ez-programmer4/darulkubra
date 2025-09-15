import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdminNotification } from "@/lib/notifications";

async function sendSMS(phone: string, message: string) {
  console.log('🔧 SMS DEBUG: Starting SMS send process');
  
  const apiToken = process.env.AFROMSG_API_TOKEN;
  const senderUid = process.env.AFROMSG_SENDER_UID;
  const senderName = process.env.AFROMSG_SENDER_NAME;

  console.log('🔧 SMS DEBUG: Environment variables check:', {
    hasApiToken: !!apiToken,
    hasSenderUid: !!senderUid,
    hasSenderName: !!senderName,
    apiTokenLength: apiToken?.length || 0,
    senderUid: senderUid || 'MISSING',
    senderName: senderName || 'MISSING'
  });

  if (!apiToken || !senderUid || !senderName) {
    console.log('❌ SMS DEBUG: Missing environment variables');
    return { success: false, error: 'Missing SMS configuration' };
  }

  const payload = {
    from: senderUid,
    sender: senderName,
    to: phone,
    message,
  };

  console.log('🔧 SMS DEBUG: Payload prepared:', {
    to: phone,
    messageLength: message.length,
    from: senderUid,
    sender: senderName
  });

  try {
    console.log('🔧 SMS DEBUG: Making API request to AfroMessage...');
    
    const response = await fetch("https://api.afromessage.com/api/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.text();
    
    console.log('🔧 SMS DEBUG: API Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      result: result
    });

    if (!response.ok) {
      const error = `SMS API error: ${response.status} - ${result}`;
      console.error('❌ SMS DEBUG: API Error:', error);
      return { success: false, error };
    }

    console.log('✅ SMS DEBUG: SMS sent successfully!');
    return { success: true, result };
  } catch (error) {
    console.error('❌ SMS DEBUG: Exception occurred:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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
    console.log('📱 SMS NOTIFICATION: Starting SMS notification process');
    
    const adminsWithPhone = await prisma.admin.findMany({
      where: { phoneno: { not: null } },
    });

    console.log('📱 SMS NOTIFICATION: Found admins:', {
      totalAdmins: adminsWithPhone.length,
      adminPhones: adminsWithPhone.map(a => ({ id: a.id, phone: a.phoneno }))
    });

    // Format time slots for SMS
    const timeSlotText = timeSlots.includes("Whole Day")
      ? "Whole Day"
      : timeSlots.join(", ");

    const smsMessage = `New absence request from ${teacherName} for ${date} (${timeSlotText}). Reason: ${reason}. Please review in admin panel.`;
    
    console.log('📱 SMS NOTIFICATION: Message prepared:', {
      teacherName,
      date,
      timeSlotText,
      reason,
      messageLength: smsMessage.length,
      message: smsMessage
    });
    
    let smsCount = 0;
    const smsResults = [];

    for (const admin of adminsWithPhone) {
      try {
        if (admin.phoneno) {
          console.log(`📱 SMS NOTIFICATION: Sending to admin ${admin.id} (${admin.phoneno})`);
          
          const result = await sendSMS(admin.phoneno, smsMessage);
          
          smsResults.push({
            adminId: admin.id,
            phone: admin.phoneno,
            success: result.success,
            error: result.error || null
          });
          
          if (result.success) {
            smsCount++;
            console.log(`✅ SMS NOTIFICATION: Success for admin ${admin.id}`);
          } else {
            console.log(`❌ SMS NOTIFICATION: Failed for admin ${admin.id}: ${result.error}`);
          }
        } else {
          console.log(`⚠️ SMS NOTIFICATION: Admin ${admin.id} has no phone number`);
        }
      } catch (error) {
        console.error(`❌ SMS NOTIFICATION: Exception for admin ${admin.id}:`, error);
        smsResults.push({
          adminId: admin.id,
          phone: admin.phoneno,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    console.log('📱 SMS NOTIFICATION: Final results:', {
      totalAttempts: adminsWithPhone.length,
      successCount: smsCount,
      failureCount: adminsWithPhone.length - smsCount,
      results: smsResults
    });

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
          total_admins: adminsWithPhone.length,
          debug: {
            admins_with_phone: adminsWithPhone.length,
            sms_attempts: adminsWithPhone.filter((a) => a.phoneno).length,
            sms_results: smsResults,
            teacher_name: teacherName,
            sms_message: smsMessage,
            env_check: {
              has_api_token: !!process.env.AFROMSG_API_TOKEN,
              has_sender_uid: !!process.env.AFROMSG_SENDER_UID,
              has_sender_name: !!process.env.AFROMSG_SENDER_NAME
            }
          },
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
