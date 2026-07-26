import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { shouldBlockSandbox } from "./lib/sandbox";

const publicRoutes = ["/", "/login", "/register", "/forgot-password"];

const protectedRoutes: Record<string, string[]> = {
  "/dashboard": ["user", "admin"],
  "/onboarding": ["user", "admin"],
  "/profile": ["user", "admin"],
  "/settings": ["user", "admin"],
  "/workspaces": ["user", "admin"],
  "/bookings": ["user", "admin"],
  "/invoices": ["user", "admin"],
  "/check-in": ["user", "admin"],
  "/notifications": ["user", "admin"],
  "/members": ["user", "admin"],
  "/events": ["user", "admin"],
  "/admin": ["admin"],
  "/users": ["admin"],
};

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret"
);

const REFRESH_THRESHOLD_SECONDS = 5 * 60;

async function decodeToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { sub?: string; role?: string; email?: string; exp?: number };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("authToken")?.value;

  if (pathname.startsWith("/sandbox")) {
    const response = shouldBlockSandbox(pathname, process.env)
      ? new NextResponse("Not Found", {
          status: 404,
          headers: {
            "X-Robots-Tag": "noindex, nofollow",
          },
        })
      : NextResponse.next();

    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  const isPublicRoute = publicRoutes.includes(pathname);
  const matchedRoute = Object.keys(protectedRoutes).find((route) =>
    pathname.startsWith(route)
  );
  const isPrivateRoute = !!matchedRoute;

  if (isPublicRoute) {
    if (token && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (isPrivateRoute) {
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await decodeToken(token);

    if (!payload) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("authToken");
      return response;
    }

    if (payload.exp) {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const secondsUntilExpiry = payload.exp - nowSeconds;

      if (secondsUntilExpiry <= 0) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete("authToken");
        return response;
      }

      if (secondsUntilExpiry <= REFRESH_THRESHOLD_SECONDS) {
        const response = NextResponse.next();
        response.headers.set("X-Token-Expiring-Soon", "true");
        return response;
      }
    }

    const userRole = payload.role;
    const allowedRoles = protectedRoutes[matchedRoute];

    if (allowedRoles && !allowedRoles.includes(userRole || "")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
