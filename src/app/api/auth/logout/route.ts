//api/auth/logout/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // Prevent caching

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: "authToken",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
