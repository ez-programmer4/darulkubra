//api/auth/logout/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // Prevent caching

export async function POST() {
  return NextResponse.json({ success: true });
}
