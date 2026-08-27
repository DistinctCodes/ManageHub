import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const protectedRoutes = ["/wallet"];
const authRoutes = ["/login", "/register"];

function getAccessToken(request: NextRequest): string | null {
  return request.cookies.get("accessToken")?.value ?? null;
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = getAccessToken(request);
  if (!token) return false;

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return true;
  }

  try {
    const key = new TextEncoder().encode(secret);
    await jwtVerify(token, key);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = await isAuthenticated(request);

  if (protectedRoutes.includes(pathname) && !authenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (authRoutes.includes(pathname) && authenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/wallet";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/wallet/:path*", "/login/:path*", "/register/:path*"],
};
