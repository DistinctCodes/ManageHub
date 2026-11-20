import type { UserRole } from "@/lib/auth-types";

const REDIRECT_BASE = "https://managehub.local";

export const MEMBER_LANDING_ROUTE = "/wallet";
export const ADMIN_LANDING_ROUTE = "/admin";

export function defaultLandingRoute(
  role?: UserRole | string | null,
): string {
  return role?.toLowerCase() === "admin"
    ? ADMIN_LANDING_ROUTE
    : MEMBER_LANDING_ROUTE;
}

export function buildReturnTo(pathname: string, search: string): string {
  const path = pathname.startsWith("/") ? pathname : "/";
  const query = search.replace(/^\?/, "");
  return query ? `${path}?${query}` : path;
}

export function getSafeReturnTo(
  value: string | null | undefined,
  fallback?: string,
  role?: UserRole | string | null,
): string {
  const effectiveFallback = fallback ?? defaultLandingRoute(role);
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("\u0000")
  ) {
    return effectiveFallback;
  }

  try {
    const parsed = new URL(value, REDIRECT_BASE);
    if (
      parsed.origin !== REDIRECT_BASE ||
      !parsed.pathname.startsWith("/") ||
      parsed.pathname === "/login" ||
      parsed.pathname === "/register"
    ) {
      return effectiveFallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return effectiveFallback;
  }
}
