import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    const session = await prisma.wpos_zoom_links.findFirst({
      where: { tracking_token: token },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Log join time
    await prisma.wpos_zoom_links.update({
      where: { id: session.id },
      data: {
        clicked_at: new Date(),
        session_status: "active",
      },
    });

    console.log(
      `✅ Student joined session ${session.id} at ${new Date().toISOString()}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging join:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
