import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return new Response("Invalid tracking link.", { status: 400 });
  }

  const record = await prisma.wpos_zoom_links.findFirst({
    where: { tracking_token: token },
  });

  if (!record) {
    return new Response("Invalid or expired tracking link.", { status: 404 });
  }

  // Record join time
  await prisma.wpos_zoom_links.update({
    where: { id: record.id },
    data: {
      clicked_at: new Date(),
      session_status: "active",
      last_activity_at: new Date(),
    },
  });

  console.log(
    `✅ Session ${
      record.id
    } started - Student clicked at ${new Date().toISOString()}`
  );

  // Return tracking page that redirects after recording
  const trackingPage = `
<!DOCTYPE html>
<html>
<head>
    <title>Joining Zoom...</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
    <script>
        // Send heartbeat immediately
        fetch('/api/session/heartbeat/${token}', { 
          method: 'POST',
          keepalive: true 
        });

        // Redirect to Zoom immediately
        window.location.href = '${record.link.replace(/'/g, "\\'")}';
    </script>
    <p>Redirecting to Zoom...</p>
</body>
</html>`;

  return new NextResponse(trackingPage, {
    headers: { "Content-Type": "text/html" },
  });
}
