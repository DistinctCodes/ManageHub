export const protectedRoutePrefixes = [
  "/wallet",
  "/credits",
  "/usage",
  "/payments",
  "/admin",
] as const;

export const authRoutePrefixes = ["/login", "/register"] as const;

export const publicCrawlerDisallowPrefixes = ["/components"] as const;

export function isProtectedRoute(pathname: string): boolean {
  return protectedRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAuthRoute(pathname: string): boolean {
  return (authRoutePrefixes as readonly string[]).includes(pathname);
}
