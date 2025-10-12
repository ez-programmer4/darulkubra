import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Teacher Left Endpoint
 *
 * Called when teacher leaves Zoom (via leave_url parameter)
 * Records the exact time teacher left and calculates duration
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session");

  if (!sessionId) {
    return new NextResponse(
      `
<!DOCTYPE html>
<html>
<head>
    <title>Invalid Session</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 40px;
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
        }
        .message {
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 20px;
        }
    </style>
</head>
<body>
    <div class="message">
        <h1>❌ Invalid Session</h1>
        <p>No session ID provided.</p>
    </div>
</body>
</html>
      `,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  try {
    console.log(`🔚 Teacher left Zoom - Session ID: ${sessionId}`);

    // Find the session
    const session = await prisma.wpos_zoom_links.findUnique({
      where: { id: parseInt(sessionId) },
      include: {
        wpos_wpdatatable_23: {
          select: { name: true },
        },
        wpos_wpdatatable_24: {
          select: { ustazname: true },
        },
      },
    });

    if (!session) {
      return new NextResponse(
        `
<!DOCTYPE html>
<html>
<head>
    <title>Session Not Found</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 40px;
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
        }
        .message {
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 20px;
        }
    </style>
</head>
<body>
    <div class="message">
        <h1>❌ Session Not Found</h1>
        <p>Session ID ${sessionId} not found in database.</p>
    </div>
</body>
</html>
        `,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    // Check if already ended
    if (
      session.session_status === "ended" ||
      session.session_status === "timeout"
    ) {
      const duration = session.session_duration_minutes || 0;
      return new NextResponse(
        `
<!DOCTYPE html>
<html>
<head>
    <title>Session Already Ended</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .message {
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 20px;
        }
        h1 { font-size: 32px; margin-bottom: 20px; }
        .duration {
            font-size: 48px;
            font-weight: bold;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="message">
        <h1>ℹ️ Session Already Ended</h1>
        <p>This session has already been completed.</p>
        <div class="duration">${duration} minutes</div>
        <p style="font-size: 14px; opacity: 0.8;">You can close this page now.</p>
    </div>
</body>
</html>
        `,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    // Calculate duration
    const startTime = session.clicked_at;
    const endTime = new Date();

    if (!startTime) {
      return new NextResponse(
        `
<!DOCTYPE html>
<html>
<head>
    <title>Error</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 40px;
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
        }
        .message {
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 20px;
        }
    </style>
</head>
<body>
    <div class="message">
        <h1>❌ Error</h1>
        <p>Session has no start time.</p>
        <p>Student may not have clicked the link yet.</p>
    </div>
</body>
</html>
        `,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    const durationMinutes = Math.round(
      (endTime.getTime() - startTime.getTime()) / 60000
    );

    // Ensure minimum 1 minute
    const finalDuration = Math.max(1, durationMinutes);

    console.log(`📊 Duration calculation:`, {
      sessionId: sessionId,
      teacher: session.ustazid,
      student: session.studentid,
      clickedAt: startTime,
      teacherLeft: endTime,
      duration: finalDuration,
    });

    // Update session
    await prisma.wpos_zoom_links.update({
      where: { id: parseInt(sessionId) },
      data: {
        session_ended_at: endTime,
        session_duration_minutes: finalDuration,
        session_status: "ended",
      },
    });

    console.log(`✅ Session ended by teacher leave: ${finalDuration} minutes`);

    // Show success page
    return new NextResponse(
      `
<!DOCTYPE html>
<html>
<head>
    <title>Session Complete</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 40px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .message {
            background: rgba(255, 255, 255, 0.15);
            padding: 50px;
            border-radius: 25px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            max-width: 500px;
        }
        h1 { 
            font-size: 42px; 
            margin: 0 0 20px 0; 
        }
        .info {
            background: rgba(255, 255, 255, 0.2);
            padding: 20px;
            border-radius: 15px;
            margin: 25px 0;
        }
        .duration {
            font-size: 56px;
            font-weight: bold;
            margin: 15px 0;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .detail {
            font-size: 16px;
            opacity: 0.9;
            margin: 8px 0;
        }
        .footer {
            font-size: 14px;
            opacity: 0.7;
            margin-top: 25px;
        }
    </style>
</head>
<body>
    <div class="message">
        <h1>✅ Session Complete!</h1>
        
        <div class="info">
            <p style="font-size: 18px; margin-bottom: 10px;">Session Duration:</p>
            <div class="duration">${finalDuration} min</div>
            
            <div style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 15px; margin-top: 15px;">
                <p class="detail">Teacher: ${
                  session.wpos_wpdatatable_24?.ustazname || "Unknown"
                }</p>
                <p class="detail">Student: ${
                  session.wpos_wpdatatable_23?.name || "Unknown"
                }</p>
                <p class="detail">Started: ${new Date(
                  startTime
                ).toLocaleTimeString()}</p>
                <p class="detail">Ended: ${endTime.toLocaleTimeString()}</p>
            </div>
        </div>
        
        <p class="footer">
            This session has been automatically recorded.<br/>
            You can close this page now.
        </p>
    </div>
</body>
</html>
      `,
      {
        headers: { "Content-Type": "text/html" },
      }
    );
  } catch (error) {
    console.error("❌ Error processing teacher leave:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
