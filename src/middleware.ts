import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AuthUser } from "./lib/auth";

export default withAuth(
  function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = (req as any).nextauth.token as AuthUser | null;

    // If the user is authenticated, prevent them from accessing login pages
    if (token) {
      if (
        pathname.startsWith("/login") ||
        pathname.startsWith("/teachers/login")
      ) {
        const role = token.role;
        const url =
          role === "teacher"
            ? "/teachers/dashboard"
            : role === "admin"
            ? "/admin"
            : role === "controller"
            ? "/controller"
            : "/dashboard"; // Default for registral
        return NextResponse.redirect(new URL(url, req.url));
      }

      // Role-based route protection
      if (pathname.startsWith("/teachers") && token.role !== "teacher") {
        return NextResponse.redirect(
          new URL("/login?error=AccessDenied", req.url)
        );
      }
      if (pathname.startsWith("/admin") && token.role !== "admin") {
        return NextResponse.redirect(
          new URL("/login?error=AccessDenied", req.url)
        );
      }
      if (pathname.startsWith("/controller") && token.role !== "controller") {
        return NextResponse.redirect(
          new URL("/login?error=AccessDenied", req.url)
        );
      }
      if (pathname.startsWith("/dashboard") && token.role !== "registral") {
        return NextResponse.redirect(
          new URL("/login?error=AccessDenied", req.url)
        );
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const { pathname } = req.nextUrl;

        // Login pages are always accessible, the logic inside middleware handles redirects
        if (
          pathname.startsWith("/login") ||
          pathname.startsWith("/teachers/login")
        ) {
          return true;
        }

        // For any other page, a token is required.
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/controller/:path*",
    "/dashboard/:path*",
    "/teachers/:path*",
    "/login",
    "/teachers/login",
  ],
};
