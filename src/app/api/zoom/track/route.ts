import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEthiopianTime } from "@/lib/ethiopian-time";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || searchParams.get("t"); // Support both formats

  console.log(`🔍 Tracking request received - Token: ${token}`);

  if (!token) {
    console.error("❌ No token provided in tracking URL");
    return new Response("Invalid tracking link - no token.", { status: 400 });
  }

  const record = await prisma.wpos_zoom_links.findFirst({
    where: { tracking_token: token },
  });

  if (!record) {
    console.error(`❌ No record found for token: ${token}`);
    return new Response("Invalid or expired tracking link.", { status: 404 });
  }

  console.log(`✅ Found zoom link record ID: ${record.id}`);
  console.log(`📍 Redirecting to: ${record.link}`);

  if (!record.clicked_at) {
    // Record clicked time when student first clicks
    // Use Ethiopian local time (UTC+3)
    await prisma.wpos_zoom_links.update({
      where: { id: record.id },
      data: {
        clicked_at: getEthiopianTime(),
      },
    });
    console.log(`✅ Recorded click time for student`);
  }

  // Redirect directly to Zoom link
  const target = record.link;

  if (!target || target.trim() === "") {
    console.error("❌ Empty Zoom link in database");
    return new Response("Zoom link not found.", { status: 404 });
  }

  console.log(`🚀 Redirecting student to Zoom...`);

  return new Response(null, {
    status: 302,
    headers: { Location: target },
  });
}
