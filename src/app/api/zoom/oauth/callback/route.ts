import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ZoomService } from "@/lib/zoom-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      return NextResponse.redirect(
        new URL(
          `/teachers/dashboard?zoom_error=${encodeURIComponent(error)}`,
          req.url
        )
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/teachers/dashboard?zoom_error=missing_parameters", req.url)
      );
    }

    // Decode state to get teacher ID
    let teacherId: string;
    try {
      const stateData = JSON.parse(
        Buffer.from(state, "base64").toString("utf-8")
      );
      teacherId = stateData.teacherId;

      // Verify state is recent (within 10 minutes)
      const stateAge = Date.now() - stateData.timestamp;
      if (stateAge > 10 * 60 * 1000) {
        throw new Error("State expired");
      }
    } catch (err) {
      return NextResponse.redirect(
        new URL("/teachers/dashboard?zoom_error=invalid_state", req.url)
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.ZOOM_REDIRECT_URI!,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Zoom token exchange failed:", errorText);
      return NextResponse.redirect(
        new URL("/teachers/dashboard?zoom_error=token_exchange_failed", req.url)
      );
    }

    const tokenData = await tokenResponse.json();

    // Get Zoom user info
    const userInfo = await ZoomService.getZoomUser(tokenData.access_token);

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Store tokens in database
    await prisma.wpos_wpdatatable_24.update({
      where: { ustazid: teacherId },
      data: {
        zoom_user_id: userInfo.id,
        zoom_access_token: tokenData.access_token,
        zoom_refresh_token: tokenData.refresh_token,
        zoom_token_expires_at: expiresAt,
        zoom_connected_at: new Date(),
      },
    });

    // Redirect to success page
    return NextResponse.redirect(
      new URL("/teachers/dashboard?zoom_connected=success", req.url)
    );
  } catch (error) {
    console.error("Zoom OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/teachers/dashboard?zoom_error=${encodeURIComponent(
          error instanceof Error ? error.message : "unknown_error"
        )}`,
        req.url
      )
    );
  }
}
