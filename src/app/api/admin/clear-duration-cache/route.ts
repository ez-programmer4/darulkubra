import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DurationCacheService } from "@/lib/duration-cache";

/**
 * Clear duration tracking cache
 * GET /api/admin/clear-duration-cache
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Clear all duration cache
    await DurationCacheService.clearAll();
    await DurationCacheService.clearExpired();

    return NextResponse.json({
      success: true,
      message: "Cache cleared successfully",
    });
  } catch (error) {
    console.error("Clear cache error:", error);
    return NextResponse.json(
      { error: "Failed to clear cache" },
      { status: 500 }
    );
  }
}
