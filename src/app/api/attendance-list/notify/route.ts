import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      studentId,
      urgency,
      minutesLate,
      autoNotify = false,
    } = await req.json();

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID required" },
        { status: 400 }
      );
    }

    // Enhanced notification logic based on urgency
    const urgencyMessages = {
      emergency: `🚨 EMERGENCY: Student link not sent for ${minutesLate} minutes! Immediate action required.`,
      critical: `🔴 CRITICAL: Student link ${minutesLate} minutes overdue. Please send immediately.`,
      warning: `🟡 WARNING: Student link ${minutesLate} minutes late. Please check status.`,
      alert: `🟠 ALERT: Student link ${minutesLate} minutes delayed. Please verify.`,
    };

    const message =
      urgencyMessages[urgency as keyof typeof urgencyMessages] ||
      `Student link notification - ${minutesLate} minutes late`;

    // Priority-based SMS sending
    const priority =
      urgency === "emergency"
        ? "high"
        : urgency === "critical"
        ? "medium"
        : "normal";

    // Simulate SMS sending with enhanced response
    const smsResponse = await sendEnhancedSMS({
      studentId,
      message,
      priority,
      urgency,
      autoNotify,
      minutesLate,
    });

    if (smsResponse.success) {
      // Log notification for analytics
      await logNotification({
        studentId,
        urgency,
        minutesLate,
        autoNotify,
        timestamp: new Date(),
        method: "sms",
      });

      return NextResponse.json({
        success: true,
        message: "Enhanced notification sent successfully",
        details: {
          urgency,
          minutesLate,
          autoNotify,
          priority,
          deliveryId: smsResponse.deliveryId,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: smsResponse.error || "Failed to send notification",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Enhanced notification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// Enhanced SMS sending with priority and retry logic
async function sendEnhancedSMS({
  studentId,
  message,
  priority,
  urgency,
  autoNotify,
  minutesLate,
}: {
  studentId: number;
  message: string;
  priority: string;
  urgency: string;
  autoNotify: boolean;
  minutesLate: number;
}) {
  try {
    // Add retry logic for critical/emergency cases
    const maxRetries =
      urgency === "emergency" ? 3 : urgency === "critical" ? 2 : 1;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // Your SMS API call here
        const response = await fetch(process.env.SMS_API_URL || "", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.SMS_API_KEY}`,
            "X-Priority": priority,
          },
          body: JSON.stringify({
            to: `student_${studentId}_teacher_phone`, // Replace with actual phone lookup
            message,
            priority,
            urgency,
            metadata: {
              studentId,
              minutesLate,
              autoNotify,
              attempt: attempt + 1,
            },
          }),
        });

        if (response.ok) {
          const result = await response.json();
          return {
            success: true,
            deliveryId: result.id || `delivery_${Date.now()}`,
            attempt: attempt + 1,
          };
        }

        attempt++;
        if (attempt < maxRetries) {
          // Exponential backoff for retries
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      } catch (err) {
        attempt++;
        if (attempt >= maxRetries) {
          throw err;
        }
      }
    }

    return {
      success: false,
      error: `Failed after ${maxRetries} attempts`,
    };
  } catch (error) {
    console.error("SMS sending failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "SMS sending failed",
    };
  }
}

// Log notifications for analytics and monitoring
async function logNotification({
  studentId,
  urgency,
  minutesLate,
  autoNotify,
  timestamp,
  method,
}: {
  studentId: number;
  urgency: string;
  minutesLate: number;
  autoNotify: boolean;
  timestamp: Date;
  method: string;
}) {
  try {
  } catch (error) {
    console.error("Failed to log notification:", error);
  }
}
