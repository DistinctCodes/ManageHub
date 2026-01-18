// frontend/src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define public routes that don't require authentication
const publicRoutes = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/verify-email",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/2fa",
];

// Define routes that require authentication
const protectedRoutes = ["/dashboard", "/onboarding", "/profile"];

// Define admin-only routes
const adminRoutes = ["/admin"];

// Helper function to check if a path matches a route pattern
function matchesRoute(path: string, routes: string[]): boolean {
  return routes.some((route) => {
    if (route === path) return true;
    if (path.startsWith(route + "/")) return true;
    return false;
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get the token from cookies
  const token = request.cookies.get("auth_token")?.value;

  // Get user data from cookies (if available)
  const userDataCookie = request.cookies.get("user_data")?.value;
  let userData = null;

  try {
    if (userDataCookie) {
      userData = JSON.parse(userDataCookie);
    }
  } catch (error) {
    // Invalid user data, treat as unauthenticated
    userData = null;
  }

  const isAuthenticated = !!token;
  const isAdmin =
    userData?.role === "manager" || userData?.role === "super-admin";

  // Check if the current path is a public route
  const isPublicRoute = matchesRoute(pathname, publicRoutes);

  // Check if the current path is a protected route
  const isProtectedRoute = matchesRoute(pathname, protectedRoutes);

  // Check if the current path is an admin route
  const isAdminRoute = matchesRoute(pathname, adminRoutes);

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && isPublicRoute && pathname.startsWith("/auth/")) {
    // If user has completed onboarding, redirect to dashboard
    if (userData?.status === "active") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    // If user hasn't completed onboarding, redirect to onboarding
    if (
      userData?.status === "pending-verification" &&
      !userData?.emailVerified
    ) {
      return NextResponse.redirect(new URL("/auth/verify-email", request.url));
    }
    // Redirect to onboarding if payment not completed
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // Protect routes that require authentication
  if (!isAuthenticated && isProtectedRoute) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Protect admin routes
  if (isAdminRoute) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!isAdmin) {
      // Non-admin users trying to access admin routes
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Check onboarding status for authenticated users
  if (isAuthenticated && userData) {
    // If email not verified and trying to access anything other than verify-email
    if (
      !userData.emailVerified &&
      !pathname.startsWith("/auth/verify-email") &&
      !pathname.startsWith("/auth/login") &&
      !pathname.startsWith("/auth/logout")
    ) {
      return NextResponse.redirect(new URL("/auth/verify-email", request.url));
    }

    // If email verified but onboarding not completed
    if (
      userData.emailVerified &&
      !userData.onboardingCompleted &&
      !pathname.startsWith("/onboarding") &&
      !pathname.startsWith("/auth/")
    ) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    // If trying to access onboarding but already completed
    if (userData.onboardingCompleted && pathname.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Add security headers
  const response = NextResponse.next();

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  // Add CSP header for production
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; " +
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.paystack.co; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: blob: https:; " +
        "font-src 'self' data:; " +
        "connect-src 'self' https://api.paystack.co https://api.stellar.org; " +
        "frame-src https://js.paystack.co;",
    );
  }

  return response;
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)",
  ],
};
