import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    const session = await prisma.wpos_zoom_links.findFirst({
      where: { tracking_token: token },
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
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({
      zoomLink: session.link,
      teacherName: session.wpos_wpdatatable_24?.ustazname || "Teacher",
      studentName: session.wpos_wpdatatable_23?.name || "Student",
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
