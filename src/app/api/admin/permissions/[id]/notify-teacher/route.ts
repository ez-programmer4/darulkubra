import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

async function sendSMS(phone: string, message: string) {
  const apiToken = process.env.AFROMSG_API_TOKEN;
  const senderUid = process.env.AFROMSG_SENDER_UID;
  const senderName = process.env.AFROMSG_SENDER_NAME;
  
  console.log("=== SMS API CONFIGURATION ===");
  console.log("Has Token:", !!apiToken);
  console.log("Has Sender UID:", !!senderUid);
  console.log("Has Sender Name:", !!senderName);
  console.log("Token Length:", apiToken?.length);
  console.log("Sender UID:", senderUid);
  console.log("Sender Name:", senderName);
  console.log("Target Phone:", phone);
  console.log("Phone Format Valid:", /^\+?[1-9]\d{1,14}$/.test(phone));
  console.log("==============================");
  
  if (!apiToken || !senderUid || !senderName) {
    console.error("SMS configuration incomplete");
    throw new Error("SMS configuration incomplete");
  }
  
  const payload = {
    from: senderUid,
    sender: senderName,
    to: phone,
    message,
  };
  
  console.log("=== SMS PAYLOAD ===");
  console.log("From:", payload.from);
  console.log("Sender:", payload.sender);
  console.log("To:", payload.to);
  console.log("Message Preview:", message.substring(0, 100) + "...");
  console.log("Message Length:", message.length);
  console.log("===================");
  
  const response = await fetch("https://api.afromessage.com/api/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  
  const responseData = await response.text();
  console.log("=== SMS API RESPONSE ===");
  console.log("Status:", response.status);
  console.log("OK:", response.ok);
  console.log("Headers:", Object.fromEntries(response.headers.entries()));
  console.log("Response Data:", responseData);
  console.log("========================");
  
  if (!response.ok) {
    console.error("SMS API Error Details:", {
      status: response.status,
      statusText: response.statusText,
      data: responseData
    });
    throw new Error(`SMS API error: ${response.status} - ${responseData}`);
  }
  
  // Try to parse response as JSON to check for API-specific errors
  try {
    const jsonResponse = JSON.parse(responseData);
    console.log("Parsed SMS Response:", jsonResponse);
    
    // Check if AfroMessage API returned an error in the response body
    if (jsonResponse.error || jsonResponse.status === 'error') {
      throw new Error(`SMS API returned error: ${jsonResponse.message || jsonResponse.error}`);
    }
  } catch (parseError) {
    // Response is not JSON, which might be okay
    console.log("SMS response is not JSON, treating as success");
  }
  
  return true;
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

    const { status, reviewNotes, teacherName, requestDate } = await req.json();
    const permissionId = parseInt(params.id);

    // Get permission request details
    const permission = await prisma.permissionrequest.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      return NextResponse.json({ error: "Permission request not found" }, { status: 404 });
    }

    // Get teacher details separately
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: permission.teacherId },
      select: { ustazname: true, phone: true }
    });
    
    console.log("Permission found:", { id: permission.id, teacherId: permission.teacherId });
    console.log("Teacher found:", teacher);

    let notificationSent = false;
    let method = "none";
    let message = "";
    let smsDetails = null;

    // Use the actual permission request date
    const actualDate = permission.requestedDates;
    console.log("Permission date from DB:", actualDate);
    console.log("Request date from frontend:", requestDate);
    
    const dateToUse = actualDate || requestDate;

    if (teacher?.phone) {
      const statusText = status === "Approved" ? "approved" : "declined";
      const statusEmoji = status === "Approved" ? "✅" : "❌";
      const dateFormatted = new Date(dateToUse).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Simplified SMS message for testing
      let smsMessage = `Dear ${teacher.ustazname || "Teacher"}, your permission request for ${dateFormatted} has been ${statusText}. ${reviewNotes ? `Notes: ${reviewNotes}` : ""} - Darul Kubra Admin`;
      
      console.log(`=== SMS SENDING DEBUG ===`);
      console.log(`Teacher:`, teacher.ustazname);
      console.log(`Phone:`, teacher.phone);
      console.log(`Message:`, smsMessage);
      console.log(`Message length:`, smsMessage.length);
      console.log(`=========================`);
      
      try {
        const smsSent = await sendSMS(teacher.phone, smsMessage);
        if (smsSent) {
          notificationSent = true;
          method = "SMS";
          message = `SMS sent successfully`;
          smsDetails = {
            phone: teacher.phone,
            messageLength: smsMessage.length,
            status: "sent"
          };
        } else {
          console.error(`SMS API returned false for ${teacher.phone}`);
          smsDetails = {
            phone: teacher.phone,
            status: "failed",
            error: "SMS API returned false - check API credentials and phone format"
          };
        }
      } catch (smsError) {
        console.error("SMS sending error:", smsError);
        smsDetails = {
          phone: teacher.phone,
          status: "error",
          error: smsError instanceof Error ? smsError.message : "Unknown SMS error"
        };
      }
    } else {
      smsDetails = {
        status: "no_phone",
        error: "Teacher has no phone number on file"
      };
    }

    // Create system notification
    let systemNotificationSent = false;
    try {
      console.log("Creating system notification for teacher:", permission.teacherId);
      
      const notification = await prisma.notification.create({
        data: {
          userId: permission.teacherId,
          userRole: "teacher",
          type: "permission_response",
          title: `Permission Request ${status}`,
          message: `Your permission request for ${dateToUse} has been ${status.toLowerCase()}. ${reviewNotes || ""}`,
          isRead: false,
        },
      });
      
      console.log("System notification created successfully:", notification.id);
      systemNotificationSent = true;
      
      if (!notificationSent) {
        notificationSent = true;
        method = "System Notification";
      } else {
        method += " + System Notification";
      }
    } catch (notifError) {
      console.error("Failed to create system notification:", notifError);
      console.error("Notification error details:", {
        teacherId: permission.teacherId,
        error: notifError instanceof Error ? notifError.message : notifError
      });
    }

    return NextResponse.json({
      success: notificationSent,
      method,
      message,
      smsDetails,
      systemNotificationSent,
      teacherInfo: {
        name: teacher?.ustazname || "Unknown",
        phone: teacher?.phone || "Not available",
        hasPhone: !!teacher?.phone
      },
      requestInfo: {
        status,
        date: requestDate,
        hasNotes: !!reviewNotes?.trim()
      }
    });

  } catch (error) {
    console.error("Notify teacher error:", error);
    return NextResponse.json(
      { error: "Failed to notify teacher" },
      { status: 500 }
    );
  }
}