import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://managehub.app";

  // Only publicly indexable routes belong here. Authenticated and admin routes
  // (e.g. /wallet, /payments, /usage, /admin, /login, /register) are excluded
  // and disallowed in robots.ts. Append new public landing pages (such as a
  // payment verify-return page) to this list as they ship.
  const publicRoutes = ["/"];

  return publicRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }));
}
