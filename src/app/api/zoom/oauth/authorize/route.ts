import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token || token.role !== "teacher") {
      return NextResponse.json(
        { error: "Unauthorized - Teacher access required" },
        { status: 403 }
      );
    }

    const teacherId = token.id as string;

    // Build Zoom OAuth URL
    const clientId = process.env.ZOOM_CLIENT_ID;
    const redirectUri = process.env.ZOOM_REDIRECT_URI;

    console.log("🔍 Zoom OAuth Authorize Debug:");
    console.log("  Teacher ID:", teacherId);
    console.log("  Client ID:", clientId ? "Present" : "Missing");
    console.log("  Redirect URI:", redirectUri);

    if (!clientId || !redirectUri) {
      console.error("❌ Zoom OAuth not configured:", {
        clientId: !!clientId,
        redirectUri: !!redirectUri,
      });
      return NextResponse.json(
        { error: "Zoom OAuth not configured" },
        { status: 500 }
      );
    }

    const state = Buffer.from(
      JSON.stringify({
        teacherId,
        timestamp: Date.now(),
        retryCount: 0, // Track retry attempts
      })
    ).toString("base64");

    const authUrl = new URL("https://zoom.us/oauth/authorize");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);

    console.log("🔗 Redirecting to Zoom OAuth URL:", authUrl.toString());
    console.log("📋 OAuth Parameters:");
    console.log("  - response_type: code");
    console.log("  - client_id:", clientId);
    console.log("  - redirect_uri:", redirectUri);
    console.log("  - state:", state);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("Zoom OAuth authorize error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Zoom OAuth" },
      { status: 500 }
    );
  }
}
