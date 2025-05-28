//api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../../../../../lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("authToken")?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  const user = verifyToken(token);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}
