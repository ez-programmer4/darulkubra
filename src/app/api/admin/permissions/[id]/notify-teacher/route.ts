import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

async function sendSMS(phone: string, message: string) {
  const apiToken = process.env.AFROMSG_API_TOKEN;
  const senderUid = process.env.AFROMSG_SENDER_UID;
  const senderName = process.env.AFROMSG_SENDER_NAME;

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

  const response = await fetch("https://api.afromessage.com/api/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseData = await response.text();

  if (!response.ok) {
    console.error("SMS API Error Details:", {
      status: response.status,
      statusText: response.statusText,
      data: responseData,
    });
    throw new Error(`SMS API error: ${response.status} - ${responseData}`);
  }

  // Try to parse response as JSON to check for API-specific errors
  try {
    const jsonResponse = JSON.parse(responseData);

    // Check if AfroMessage API returned an error in the response body
    if (jsonResponse.error || jsonResponse.status === "error") {
      throw new Error(
        `SMS API returned error: ${jsonResponse.message || jsonResponse.error}`
      );
    }
  } catch (parseError) {
    // Response is not JSON, which might be okay
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

    const { status, reviewNotes, teacherName, requestDate, timeSlots } = await req.json();
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

    // Get teacher details separately
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: permission.teacherId },
      select: { ustazname: true, phone: true },
    });

    let notificationSent = false;
    let method = "none";
    let message = "";
    let smsDetails = null;

    // Use the actual permission request date
    const actualDate = permission.requestedDate;

    const dateToUse = actualDate || requestDate;

    if (teacher?.phone) {
      const statusText = status === "Approved" ? "approved" : "declined";
      const statusEmoji = status === "Approved" ? "✅" : "❌";
      const dateFormatted = new Date(dateToUse).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Enhanced SMS message with time slot information
      let timeSlotInfo = "";
      if (timeSlots) {
        try {
          const slots = JSON.parse(timeSlots);
          if (slots.includes('Whole Day')) {
            timeSlotInfo = " (Whole Day)";
          } else if (slots.length > 0) {
            timeSlotInfo = ` (${slots.length} time slot${slots.length > 1 ? 's' : ''})`;
          }
        } catch {}
      }
      
      let smsMessage = `Dear ${
        teacher.ustazname || "Teacher"
      }, your permission request for ${dateFormatted}${timeSlotInfo} has been ${statusText}. ${
        reviewNotes ? `Notes: ${reviewNotes}` : ""
      } - Darul Kubra Admin`;

      try {
        const smsSent = await sendSMS(teacher.phone, smsMessage);
        if (smsSent) {
          notificationSent = true;
          method = "SMS";
          message = `SMS sent successfully`;
          smsDetails = {
            phone: teacher.phone,
            messageLength: smsMessage.length,
            status: "sent",
          };
        } else {
          console.error(`SMS API returned false for ${teacher.phone}`);
          smsDetails = {
            phone: teacher.phone,
            status: "failed",
            error:
              "SMS API returned false - check API credentials and phone format",
          };
        }
      } catch (smsError) {
        console.error("SMS sending error:", smsError);
        smsDetails = {
          phone: teacher.phone,
          status: "error",
          error:
            smsError instanceof Error ? smsError.message : "Unknown SMS error",
        };
      }
    } else {
      smsDetails = {
        status: "no_phone",
        error: "Teacher has no phone number on file",
      };
    }

    // Create system notification
    let systemNotificationSent = false;
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: permission.teacherId,
          userRole: "teacher",
          type: "permission_response",
          title: `Permission Request ${status}`,
          message: `Your permission request for ${dateToUse} has been ${status.toLowerCase()}. ${
            reviewNotes || ""
          }`,
          isRead: false,
        },
      });

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
        error: notifError instanceof Error ? notifError.message : notifError,
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
        hasPhone: !!teacher?.phone,
      },
      requestInfo: {
        status,
        date: requestDate,
        hasNotes: !!reviewNotes?.trim(),
      },
    });
  } catch (error) {
    console.error("Notify teacher error:", error);
    return NextResponse.json(
      { error: "Failed to notify teacher" },
      { status: 500 }
    );
  }
}
