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

    // Extract meeting ID from Zoom URL for app deep linking
    const meetingIdMatch = zoomUrl.match(/\/j\/(\d+)/);
    const meetingId = meetingIdMatch ? meetingIdMatch[1] : null;

    // Create Zoom app protocol URL for mobile (zoomus://)
    const zoomAppUrl = meetingId
      ? `zoomus://zoom.us/join?confno=${meetingId}`
      : zoomUrl;

    // Tracking page that tries Zoom app first, then falls back to web
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
            margin: 0;
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
        <h1>🔗 Opening Zoom...</h1>
        <div class="spinner"></div>
        <p>Connecting to your session...</p>
        <p style="font-size: 14px; margin-top: 15px; opacity: 0.8;">
          If Zoom doesn't open automatically, <a href="${zoomUrl.replace(
            /"/g,
            "&quot;"
          )}" style="color: #fbbf24; text-decoration: underline;">click here</a>
        </p>
    </div>
    
    <script>
        // Try to open Zoom app first (for mobile)
        const appUrl = "${zoomAppUrl.replace(/"/g, '\\"')}";
        const webUrl = "${zoomUrl.replace(/"/g, '\\"')}";
        
        // Detect mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // On mobile, try app protocol first
            console.log('Mobile detected - trying Zoom app...');
            window.location.href = appUrl;
            
            // Fallback to web URL after 2 seconds if app doesn't open
            setTimeout(() => {
                window.location.href = webUrl;
            }, 2000);
        } else {
            // On desktop, go directly to web URL
            console.log('Desktop detected - opening Zoom web...');
            window.location.href = webUrl;
        }
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
