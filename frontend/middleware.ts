import { NextRequest, NextResponse } from "next/server";

const publicRoutes = ["/", "/login", "/register", "/forgot-password"];

const protectedRoutes = {
  "/dashboard": ["users", "admin"],
  "/users": ["admin"],
  "/admin": ["admin"],
} as const;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("authToken")?.value;
  console.log(token);
  const isPublicRoute = publicRoutes.includes(pathname);
  const isPrivateRoute = Object.keys(protectedRoutes).some((route) =>
    pathname.startsWith(route)
  );

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

    // For role-based protection, we'll handle this in the component level
    // since we need to decode the JWT to get user role
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
