import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/server-auth";

// Public paths that don't require authentication
const publicPaths = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/_next",
  "/favicon.ico",
  "/api/registrations",
];

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

  // Allow public paths
  if (publicPaths.some((publicPath) => path.startsWith(publicPath))) {
    console.log("Allowing public path:", path);
    return NextResponse.next();
  }

  // Check for auth token
  const token = request.cookies.get("authToken")?.value;
  if (!token) {
    console.log("No auth token found, redirecting to login from:", path);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verify token
  const user = await verifyToken(token);
  if (!user) {
    console.log("Invalid token for path:", path, "redirecting to login");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  console.log("User role:", user.role, "checking access for:", path); // Debug log

  // Check if user has access to the requested path
  const allowedPaths = roleBasedPaths[user.role] || [];
  const hasAccess = allowedPaths.some((allowedPath) => {
    console.log("Checking path:", path, "against allowed:", allowedPath); // Debug log
    // Check for exact path match or if path is a sub-path
    if (path.startsWith(allowedPath)) {
      console.log("Matched with startsWith:", path, "with base:", allowedPath);
      return true;
    }

    // Check for path prefix with [id]
    if (allowedPath.endsWith("[id]")) {
      const basePath = allowedPath.replace("[id]", "");
      if (path.startsWith(basePath)) {
        console.log("Matched [id] prefix:", path, "with base:", basePath);
        return true;
      }
    }

    // Inside the hasAccess check
    const isPaymentManagementRoute =
      path.toLowerCase().startsWith("/paymentmanagement/") &&
      /^\/paymentmanagement\/\d+$/i.test(path);

    if (
      user.role === "controller" &&
      path.match(/^\/paymentmanagement\/\d+$/)
    ) {
      return true;
    }
    // Inside the hasAccess check
    if (path.toLowerCase().startsWith("/paymentmanagement/")) {
      console.log("Payment management path detected:", path);
      if (dynamicRoutePatterns.paymentManagement.test(path)) {
        console.log("Matched payment management pattern");
        return true;
      }
    }

    // Check dynamic routes
    if (dynamicRoutePatterns.studentId.test(path)) {
      console.log("Matched dynamic studentId pattern:", path);
      return true;
    }
    if (dynamicRoutePatterns.paymentManagement.test(path)) {
      console.log("Matched dynamic paymentManagement pattern:", path);
      return true;
    }
    if (dynamicRoutePatterns.apiStudents.test(path)) {
      console.log("Matched dynamic apiStudents pattern:", path);
      return true;
    }
    if (dynamicRoutePatterns.registrationEdit.test(fullUrl)) {
      console.log("Matched dynamic registrationEdit pattern:", fullUrl);
      return true; // Allow both controller and registral to edit
    }

    return false;
  });

  if (!hasAccess) {
    console.log(`User ${user.role} not authorized for path: ${path}`);
    // Redirect to appropriate dashboard based on role
    let redirectPath = "/login";
    if (user.role === "controller") redirectPath = "/controller";
    else if (user.role === "registral") redirectPath = "/dashboard";
    else if (user.role === "admin") redirectPath = "/admin/users";
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  // Add user info to request headers for API routes
  if (path.startsWith("/api/")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", user.id.toString());
    requestHeaders.set("x-user-role", user.role);

    console.log("Adding headers for API route:", path);
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  console.log("Allowing access to path:", path);
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
