const REDIRECT_BASE = "https://managehub.local";

export function buildReturnTo(pathname: string, search: string): string {
  const path = pathname.startsWith("/") ? pathname : "/";
  const query = search.replace(/^\?/, "");
  return query ? `${path}?${query}` : path;
}

export function getSafeReturnTo(
  value: string | null | undefined,
  fallback = "/wallet",
): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("\u0000")
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(value, REDIRECT_BASE);
    if (
      parsed.origin !== REDIRECT_BASE ||
      !parsed.pathname.startsWith("/") ||
      parsed.pathname === "/login" ||
      parsed.pathname === "/register"
    ) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
