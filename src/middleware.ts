import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Public paths that don't require authentication
const publicPaths = ["/login", "/_next", "/favicon.ico", "/api/registrations"];

// Role-based access control paths
const roleBasedPaths = {
  controller: [
    "/controller",
    "/api/controller/students",
    "/api/controller/students/[id]",
    "/api/controller/attendance",
    "/api/payments",
    "/api/payments/monthly",
    "/api/payments/deposit",
    "/api/payments/free-month",
    "/api/payments/student/[id]",
    "/api/payments/prize",
    "/api/students/payment-status",
    "/api/payments/reminders",
    "/api/auth/me",
    "/paymentmanagement",
    "/paymentmanagement/[id]", // Ensure consistent [id] notation
    "/api/students",
    "/api/students/[id]",
    "/api/registrations",
    "/api/time-slots",
    "/api/control-options",
    "/api/teachers-by-time",
    "/api/occupied-times",
    "/registration",
    "/attendance-list",
    "/api/zoom-links",
    "/api/attendance-list",
    "/analytics",
    "/api/analytics",
    "/reports",
    "/api/reports",
  ],
  registral: [
    "/dashboard",
    "/registration", // Base registration path for registral (e.g., new registration)
    "/api/registrations",
    "/api/time-slots",
    "/api/control-options",
    "/api/teachers-by-time",
    "/api/occupied-times",
    "/api/auth/me",
    "/api/students",
    "/api/students/[id]",
  ],
  admin: ["/admin", "/api/admin", "/api/auth/me"],
};

// Dynamic route patterns
const dynamicRoutePatterns = {
  studentId: /^\/api\/students\/\d+$/,
  paymentManagement: /^\/paymentmanagement\/\d+(\/)?$/i, // Matches /paymentmanagement/19
  apiStudents: /^\/api\/students\/\d+$/,
  registrationEdit: /^\/registration\?id=\d+(&step=\d+)?$/, // Matches /registration?id=19&step=3 for both roles
};

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const fullUrl = request.url; // Include query parameters for pattern matching
  console.log("Middleware processing path:", path, "Full URL:", fullUrl); // Debug log

  // Always allow all NextAuth API routes
  if (path.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Allow public paths
  if (publicPaths.some((publicPath) => path.startsWith(publicPath))) {
    console.log("Allowing public path:", path);
    return NextResponse.next();
  }

  // Use NextAuth's getToken to check for a valid session
  const session = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!session) {
    console.log("No NextAuth session found, redirecting to login from:", path);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // You can access session.user.role, session.user, etc. here for role-based logic
  // ... (rest of your role-based access logic, using session instead of user)

  // For now, just allow access if session exists
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
