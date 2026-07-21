import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const publicRoutes = ["/", "/login", "/register", "/forgot-password"];

const protectedRoutes: Record<string, string[]> = {
  "/dashboard": ["user", "admin"],
  "/profile": ["user", "admin"],
  "/settings": ["user", "admin"],
  "/users": ["admin"],
  "/admin": ["admin"],
};

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret"
);

async function decodeToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { sub?: string; role?: string; email?: string };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("authToken")?.value;
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
