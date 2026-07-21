import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const publicRoutes = ["/", "/login", "/register", "/forgot-password"];

const authOnly = [
  "/dashboard",
  "/onboarding",
  "/profile",
  "/settings",
  "/workspaces",
  "/bookings",
  "/invoices",
  "/check-in",
  "/notifications",
];
const adminOnly = ["/admin", "/users"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("authToken")?.value;
  const isPublicRoute = publicRoutes.includes(pathname);
  const isAuthRoute = authOnly.some((route) => pathname.startsWith(route));
  const isAdminRoute = adminOnly.some((route) => pathname.startsWith(route));
  const isPrivateRoute = isAuthRoute || isAdminRoute;

  // Check if the route is public
  if (isPublicRoute) {
    // If user is authenticated and trying to access auth pages, redirect to dashboard
    if (token && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // If not authenticated, Let the request continue as normal (take them to the public route they were trying to go to).
    return NextResponse.next();
  }

  // Check if the route is protected and need authentication
  if (isPrivateRoute) {
    // if no token, redirect to login
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
      const { payload } = await jwtVerify(token, secret);
      const userRole = payload.role as string;

      if (isAdminRoute) {
        if (
          userRole !== "super_admin" &&
          userRole !== "admin" &&
          userRole !== "staff"
        ) {
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
      }
    } catch (error) {
      // If token is invalid or expired
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
