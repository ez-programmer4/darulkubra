import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return new NextResponse(
      `
<!DOCTYPE html>
<html>
<head>
    <title>Session Complete</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .message {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 40px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        h1 { font-size: 32px; margin-bottom: 20px; }
        p { font-size: 18px; }
    </style>
</head>
<body>
    <div class="message">
        <h1>✅ Session Complete</h1>
        <p>Thank you for attending the session!</p>
        <p style="font-size: 14px; margin-top: 20px; opacity: 0.8;">You can close this page now.</p>
    </div>
</body>
</html>
      `,
      {
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  try {
    console.log(`📍 Session complete callback for token: ${token}`);

    // Find the session
    const session = await prisma.wpos_zoom_links.findFirst({
      where: {
        tracking_token: token,
        session_status: "active",
      },
    });

    if (!session) {
      console.log(`⚠️ No active session found for token: ${token}`);
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
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .message {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 40px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        h1 { font-size: 32px; margin-bottom: 20px; }
        p { font-size: 18px; }
    </style>
</head>
<body>
    <div class="message">
        <h1>ℹ️ Session Already Ended</h1>
        <p>This session has already been completed.</p>
        <p style="font-size: 14px; margin-top: 20px; opacity: 0.8;">You can close this page now.</p>
    </div>
</body>
</html>
        `,
        {
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    // Calculate duration
    const startTime = session.clicked_at!;
    const endTime = new Date();
    const durationMinutes = Math.round(
      (endTime.getTime() - startTime.getTime()) / 60000
    );

    // Ensure minimum 1 minute
    const finalDuration = Math.max(1, durationMinutes);

    console.log(`📊 Duration calculation:`, {
      clickedAt: startTime,
      endedAt: endTime,
      durationMinutes: durationMinutes,
      finalDuration: finalDuration,
    });

    // Update session
    await prisma.wpos_zoom_links.update({
      where: { id: session.id },
      data: {
        session_ended_at: endTime,
        session_duration_minutes: finalDuration,
        session_status: "ended",
      },
    });

    console.log(`✅ Session ended automatically: {
      token: '${token}',
      studentId: ${session.studentid},
      teacherId: '${session.ustazid}',
      duration: ${finalDuration},
      reason: 'zoom_leave'
    }`);

    return new NextResponse(
      `
<!DOCTYPE html>
<html>
<head>
    <title>Session Complete</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .message {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 40px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        h1 { font-size: 32px; margin-bottom: 20px; }
        p { font-size: 18px; }
        .duration {
            font-size: 24px;
            font-weight: bold;
            margin: 20px 0;
            padding: 15px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
        }
    </style>
</head>
<body>
    <div class="message">
        <h1>✅ Session Complete</h1>
        <p>Thank you for attending the session!</p>
        <div class="duration">
            Session Duration: ${finalDuration} minutes
        </div>
        <p style="font-size: 14px; margin-top: 20px; opacity: 0.8;">Your session has been recorded.</p>
        <p style="font-size: 14px; opacity: 0.8;">You can close this page now.</p>
    </div>
</body>
</html>
      `,
      {
        headers: { "Content-Type": "text/html" },
      }
    );
  } catch (error) {
    console.error("Error ending session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
