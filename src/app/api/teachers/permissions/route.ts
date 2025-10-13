import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdminNotification } from "@/lib/notifications";

/**
 * Normalize Ethiopian phone number to international format
 * Accepts: 0911234567, 911234567, +251911234567, 251911234567
 * Returns: +251911234567
 */
function normalizePhoneNumber(phone: string): string | null {
  if (!phone) return null;

  // Remove all spaces, dashes, and parentheses
  let cleaned = phone.replace(/[\s\-()]/g, "");

  // Handle different formats
  if (cleaned.startsWith("+251")) {
    // Already in correct format
    return cleaned;
  } else if (cleaned.startsWith("251")) {
    // Add + prefix
    return "+" + cleaned;
  } else if (cleaned.startsWith("0")) {
    // Ethiopian local format (0911234567) → +251911234567
    return "+251" + cleaned.substring(1);
  } else if (cleaned.startsWith("9") && cleaned.length === 9) {
    // Missing country code and leading 0 (911234567) → +251911234567
    return "+251" + cleaned;
  }

  // Invalid format
  return null;
}

async function sendSMS(
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string; details?: any }> {
  console.log(`\n🔧 sendSMS function called with phone: "${phone}"`);
  
  const apiToken = process.env.AFROMSG_API_TOKEN;
  const senderUid = process.env.AFROMSG_SENDER_UID;
  const senderName = process.env.AFROMSG_SENDER_NAME;

  console.log(`🔑 Environment check:`);
  console.log(`   API Token: ${apiToken ? '✅ SET (length: ' + apiToken.length + ')' : '❌ NOT SET'}`);
  console.log(`   Sender UID: ${senderUid ? '✅ ' + senderUid : '❌ NOT SET'}`);
  console.log(`   Sender Name: ${senderName ? '✅ ' + senderName : '❌ NOT SET'}`);

  // Debug: Check environment variables
  if (!apiToken || !senderUid || !senderName) {
    const missing = [];
    if (!apiToken) missing.push("AFROMSG_API_TOKEN");
    if (!senderUid) missing.push("AFROMSG_SENDER_UID");
    if (!senderName) missing.push("AFROMSG_SENDER_NAME");

    console.error(
      `❌ SMS Configuration Error: Missing environment variables: ${missing.join(
        ", "
      )}`
    );
    return {
      success: false,
      error: `SMS not configured. Missing: ${missing.join(", ")}`,
    };
  }

  // Normalize phone number
  const normalizedPhone = normalizePhoneNumber(phone);
  if (!normalizedPhone) {
    console.error(
      `❌ Invalid phone number format: "${phone}". Expected Ethiopian format (e.g., 0911234567, +251911234567)`
    );
    return {
      success: false,
      error: `Invalid phone format: ${phone}`,
    };
  }

  const payload = {
    from: senderUid,
    sender: senderName,
    to: normalizedPhone,
    message,
  };

  console.log(`📱 Sending SMS to ${normalizedPhone} (original: ${phone})`);
  console.log(`📝 Message: ${message.substring(0, 50)}...`);

  try {
    const response = await fetch("https://api.afromessage.com/api/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const resultText = await response.text();
    let result: any;

    try {
      result = JSON.parse(resultText);
    } catch {
      result = resultText;
    }

    if (!response.ok) {
      console.error(
        `❌ SMS API Error for ${normalizedPhone}:`,
        `\n  Status: ${response.status}`,
        `\n  Response: ${JSON.stringify(result, null, 2)}`
      );
      return {
        success: false,
        error: `API returned ${response.status}`,
        details: result,
      };
    }

    console.log(
      `✅ SMS sent successfully to ${normalizedPhone}:`,
      JSON.stringify(result, null, 2)
    );
    return { success: true, details: result };
  } catch (error) {
    console.error(
      `❌ SMS Network Error for ${normalizedPhone}:`,
      error instanceof Error ? error.message : error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("\n\n🚀 ======================================");
    console.log("🚀 PERMISSION REQUEST API CALLED");
    console.log("🚀 ======================================\n");

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

    console.log(`📋 Permission Request Details:`);
    console.log(`   Teacher ID: ${user.id}`);
    console.log(`   Date: ${date}`);
    console.log(`   Time Slots: ${JSON.stringify(timeSlots)}`);
    console.log(`   Reason: ${reason}`);

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
    console.log("\n📞 === SMS NOTIFICATION DEBUG ===");
    console.error("\n📞 === SMS NOTIFICATION DEBUG (STDERR) ==="); // Also to stderr

    const adminsWithPhone = await prisma.admin.findMany({
      where: {
        phoneno: {
          not: null,
          notIn: ["", " "], // Exclude empty strings
        },
      },
      select: {
        id: true,
        name: true,
        phoneno: true,
      },
    });

    console.log(
      `📊 Found ${adminsWithPhone.length} admins with phone numbers:`
    );
    console.error(
      `📊 (STDERR) Found ${adminsWithPhone.length} admins with phone numbers`
    );
    
    adminsWithPhone.forEach((admin, idx) => {
      const logMsg = `  ${idx + 1}. ${admin.name || "Unnamed"} - Phone: "${admin.phoneno}"`;
      console.log(logMsg);
      console.error(logMsg);
    });

    // Format time slots for SMS
    const timeSlotText = timeSlots.includes("Whole Day")
      ? "Whole Day"
      : timeSlots.join(", ");

    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const smsMessage = `🔔 DarulKubra Alert: ${teacherName} requests permission for ${formattedDate} (${timeSlotText}). Reason: ${reason}. Please review.`;

    console.log(`📝 SMS Message (${smsMessage.length} chars): "${smsMessage}"`);

    let smsCount = 0;
    const smsResults: Array<{
      admin: string;
      phone: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const admin of adminsWithPhone) {
      if (admin.phoneno) {
        console.log(`\n📤 Attempting to send SMS to ${admin.name}...`);
        const result = await sendSMS(admin.phoneno, smsMessage);

        smsResults.push({
          admin: admin.name || admin.id.toString(),
          phone: admin.phoneno,
          success: result.success,
          error: result.error,
        });

        if (result.success) {
          smsCount++;
          console.log(`✅ SMS sent successfully to ${admin.name}`);
        } else {
          console.log(
            `❌ SMS failed for ${admin.name}: ${
              result.error || "Unknown error"
            }`
          );
        }
      }
    }

    console.log(
      `\n📊 SMS Summary: ${smsCount}/${adminsWithPhone.length} sent successfully`
    );
    console.log("=== END SMS DEBUG ===\n");

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

    // Also check environment variables for debug response
    const envCheck = {
      api_token: process.env.AFROMSG_API_TOKEN ? '✅ SET' : '❌ MISSING',
      sender_uid: process.env.AFROMSG_SENDER_UID || '❌ MISSING',
      sender_name: process.env.AFROMSG_SENDER_NAME || '❌ MISSING',
    };

    return NextResponse.json(
      {
        success: true,
        message:
          "✅ Permission request submitted successfully! Admin team has been notified and will review your request soon.",
        permissionRequest,
        notifications: {
          sms_sent: smsCount,
          sms_failed: adminsWithPhone.length - smsCount,
          system_notifications: notificationCount,
          total_admins: adminsWithPhone.length,
          sms_results: smsResults,
        },
        debug: {
          sms_attempts: adminsWithPhone.length,
          sms_success_rate:
            adminsWithPhone.length > 0
              ? `${Math.round((smsCount / adminsWithPhone.length) * 100)}%`
              : "N/A",
          admins_with_phone: adminsWithPhone.map((a) => ({
            name: a.name,
            phone: a.phoneno,
          })),
          environment: envCheck,
          warning: adminsWithPhone.length === 0 
            ? "⚠️ No admins with phone numbers found in database"
            : smsCount === 0 && adminsWithPhone.length > 0
            ? "⚠️ SMS failed for all admins - check environment variables and server logs"
            : null,
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
