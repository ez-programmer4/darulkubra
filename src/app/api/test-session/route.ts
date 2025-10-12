import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function GET() {
  try {
    // Create a test session
    const token = crypto.randomBytes(16).toString("hex").toUpperCase();
    const testZoomLink = "https://zoom.us/j/123456789?pwd=test";

    // Find first student and teacher for testing
    const student = await prisma.wpos_wpdatatable_23.findFirst({
      select: { wdt_ID: true, ustaz: true },
    });

    if (!student) {
      return NextResponse.json({ error: "No students found" }, { status: 404 });
    }

    // Create test session
    const session = await prisma.wpos_zoom_links.create({
      data: {
        studentid: student.wdt_ID,
        ustazid: student.ustaz || "TEST",
        link: testZoomLink,
        tracking_token: token,
        sent_time: new Date(),
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const wrapperURL = `${baseUrl}/join-session/${token}`;

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      token: token,
      wrapperURL: wrapperURL,
      message: "Test session created! Visit the wrapper URL to test tracking.",
    });
  } catch (error) {
    console.error("Error creating test session:", error);
    return NextResponse.json(
      { error: "Failed to create test session" },
      { status: 500 }
    );
  }
}
