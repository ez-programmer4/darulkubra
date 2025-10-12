import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * Zoom Webhook Endpoint
 *
 * Receives events from Zoom when:
 * - Meeting starts
 * - Participant joins
 * - Participant leaves
 * - Meeting ends
 *
 * This allows automatic, trustworthy duration tracking
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("📥 Zoom webhook received:", {
      event: body.event,
      payload: body.payload,
    });

    // Verify webhook signature (security)
    const signature = request.headers.get("x-zm-signature");
    const timestamp = request.headers.get("x-zm-request-timestamp");

    // TODO: Verify signature for production
    // const isValid = verifyZoomSignature(signature, timestamp, body);
    // if (!isValid) {
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    // }

    const event = body.event;
    const payload = body.payload;

    // Handle different Zoom events
    switch (event) {
      case "meeting.participant_joined":
        await handleParticipantJoined(payload);
        break;

      case "meeting.participant_left":
        await handleParticipantLeft(payload);
        break;

      case "meeting.ended":
        await handleMeetingEnded(payload);
        break;

      default:
        console.log(`ℹ️ Unhandled Zoom event: ${event}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error processing Zoom webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleParticipantJoined(payload: any) {
  try {
    const { object } = payload;
    const { participant } = object;
    const meetingId = object.id || object.uuid;

    console.log(
      `👋 Participant joined: ${participant.user_name} in meeting ${meetingId}`
    );

    // Find session by meeting ID (need to store meeting ID when creating link)
    // For now, just log the event
  } catch (error) {
    console.error("Error handling participant join:", error);
  }
}

async function handleParticipantLeft(payload: any) {
  try {
    const { object } = payload;
    const { participant } = object;
    const meetingId = object.id || object.uuid;

    console.log(
      `👋 Participant left: ${participant.user_name} from meeting ${meetingId}`
    );
    console.log(`Duration: ${participant.duration} minutes`);

    // Check if this is the HOST (teacher) leaving
    const isHost =
      participant.role === "host" || participant.user_id === object.host_id;

    if (isHost) {
      console.log("🎓 HOST (teacher) left the meeting - ending session");

      // Find active session for this meeting
      // We need to match by meeting ID or teacher ID + time
      const session = await prisma.wpos_zoom_links.findFirst({
        where: {
          session_status: "active",
          // TODO: Add meeting_id field to match
          // For now, find most recent active session for any teacher
          clicked_at: {
            gte: new Date(Date.now() - 3 * 60 * 60 * 1000), // Within last 3 hours
          },
        },
        orderBy: { clicked_at: "desc" },
      });

      if (session && session.clicked_at) {
        const startTime = session.clicked_at;
        const endTime = new Date();
        const durationMinutes = Math.round(
          (endTime.getTime() - startTime.getTime()) / 60000
        );

        await prisma.wpos_zoom_links.update({
          where: { id: session.id },
          data: {
            session_ended_at: endTime,
            session_duration_minutes: durationMinutes,
            session_status: "ended",
          },
        });

        console.log(
          `✅ Session auto-ended when teacher left: ${durationMinutes} minutes`
        );
      }
    }
  } catch (error) {
    console.error("Error handling participant leave:", error);
  }
}

async function handleMeetingEnded(payload: any) {
  try {
    const { object } = payload;
    const meetingId = object.id || object.uuid;
    const duration = object.duration; // In minutes

    console.log(
      `🔚 Meeting ended: ${meetingId}, Duration: ${duration} minutes`
    );

    // Find and end all active sessions for this meeting
    // TODO: Match by meeting_id when we add that field
  } catch (error) {
    console.error("Error handling meeting end:", error);
  }
}

// Verify Zoom webhook signature
function verifyZoomSignature(
  signature: string | null,
  timestamp: string | null,
  body: any
): boolean {
  if (!signature || !timestamp) return false;

  const secretToken = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
  if (!secretToken) return true; // Skip verification in development

  const message = `v0:${timestamp}:${JSON.stringify(body)}`;
  const hashForVerify = crypto
    .createHmac("sha256", secretToken)
    .update(message)
    .digest("hex");
  const expectedSignature = `v0=${hashForVerify}`;

  return signature === expectedSignature;
}
