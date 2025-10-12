import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  try {
    // Find the zoom link by token
    const zoomLink = await prisma.wpos_zoom_links.findFirst({
      where: { tracking_token: token },
    });

    if (!zoomLink) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    // Update session tracking fields
    await prisma.wpos_zoom_links.update({
      where: { id: zoomLink.id },
      data: {
        clicked_at: new Date(),
        session_status: "active",
        last_activity_at: new Date(),
      },
    });

    // Add leave URL to Zoom link so it redirects back when meeting ends
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      request.headers.get("origin") ||
      "http://localhost:3000";
    const leaveUrl = `${baseUrl}/api/zoom/session-complete?token=${token}`;

    // Append leave_url parameter to Zoom link
    const zoomUrl = zoomLink.link.includes("?")
      ? `${zoomLink.link}&leave_url=${encodeURIComponent(leaveUrl)}`
      : `${zoomLink.link}?leave_url=${encodeURIComponent(leaveUrl)}`;

    console.log(
      `🔗 Enhanced Zoom URL with leave redirect: ${zoomUrl.substring(
        0,
        100
      )}...`
    );

    // Tracking page with invisible iframe for continuous heartbeat
    const trackingPage = `
<!DOCTYPE html>
<html>
<head>
    <title>Connecting to Zoom...</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .message {
            background: rgba(255, 255, 255, 0.15);
            border-radius: 20px;
            padding: 40px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }
        h1 { font-size: 32px; margin: 0 0 15px 0; }
        p { font-size: 18px; margin: 0; opacity: 0.9; }
        .spinner { 
            border: 5px solid rgba(255, 255, 255, 0.3); 
            border-top: 5px solid #fff; 
            border-radius: 50%; 
            width: 60px; 
            height: 60px; 
            animation: spin 1s linear infinite; 
            margin: 25px auto; 
        }
        @keyframes spin { 
            0% { transform: rotate(0deg); } 
            100% { transform: rotate(360deg); } 
        }
    </style>
</head>
<body>
    <div class="message">
        <h1>🔗 Redirecting to Zoom...</h1>
        <div class="spinner"></div>
        <p>Please wait...</p>
    </div>
    
    <script>
        // Immediate redirect to Zoom - no delays
        window.location.href = "${zoomUrl.replace(/"/g, '\\"')}";
    </script>
</body>
</html>`;

    return new NextResponse(trackingPage, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("Error in zoom track:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
