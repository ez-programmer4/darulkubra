import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../../lib/auth";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("authToken")?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/registration/:path*"],
};
