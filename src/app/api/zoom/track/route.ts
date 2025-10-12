import { NextRequest } from "next/server";
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

  if (!record.clicked_at) {
    // Record clicked time when student first clicks
    await prisma.wpos_zoom_links.update({
      where: { id: record.id },
      data: {
        clicked_at: new Date(),
      },
    });
  }

  // Redirect directly to Zoom link
  const target = record.link;
  return new Response(null, {
    status: 302,
    headers: { Location: target },
  });
}
