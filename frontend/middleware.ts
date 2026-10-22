import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getSafeReturnTo } from "./lib/auth-redirect";

// NOTE: This middleware is a UX convenience (redirects unauthenticated users
// to /login). It is NOT a security boundary. Authorization and authentication
// must always be enforced by the backend API; never rely on this middleware
// to protect data or actions on its own.
const protectedRoutePrefixes = [
  "/wallet",
  "/account",
  "/credits",
  "/usage",
  "/payments",
  "/admin",
];
const authRoutes = ["/login", "/register"];

function getAccessToken(request: NextRequest): string | null {
  return request.cookies.get("accessToken")?.value ?? null;
}

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = getAccessToken(request);
  if (!token) return false;

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Fail closed: without a secret we cannot verify the token, so treat the
    // request as unauthenticated rather than trusting any non-empty cookie.
    return false;
  }

  try {
    const key = new TextEncoder().encode(secret);
    await jwtVerify(token, key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Decodes the verified token's `role` claim (issue #1973). The backend signs
 * the `user`/`admin` enum values, and role changes bump `tokenVersion`, so a
 * role claim that still verifies is fresh enough to gate admin pages here.
 * The backend still enforces authorization on every endpoint.
 */
async function isAdminToken(request: NextRequest): Promise<boolean> {
  const token = getAccessToken(request);
  if (!token) return false;

  const secret = process.env.JWT_SECRET;
  if (!secret) return false;

  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = await isAuthenticated(request);

  if (isProtectedRoute(pathname) && !authenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set(
      "returnTo",
      getSafeReturnTo(pathname + request.nextUrl.search),
    );
    return NextResponse.redirect(loginUrl);
  }

  if (authRoutes.includes(pathname) && authenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/wallet";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Member-role tokens must land on a "not authorised" page instead of the
  // admin shell (issue #1973). The dedicated forbidden page skips this check
  // so the redirect cannot loop.
  if (
    authenticated &&
    isProtectedRoute(pathname) &&
    (pathname === "/admin" || pathname.startsWith("/admin/")) &&
    pathname !== "/admin/forbidden"
  ) {
    const isAdmin = await isAdminToken(request);
    if (!isAdmin) {
      const forbiddenUrl = request.nextUrl.clone();
      forbiddenUrl.pathname = "/admin/forbidden";
      forbiddenUrl.search = "";
      return NextResponse.redirect(forbiddenUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/wallet/:path*",
    "/account/:path*",
    "/credits/:path*",
    "/usage/:path*",
    "/payments/:path*",
    "/admin/:path*",
    "/login/:path*",
    "/register/:path*",
  ],
};
