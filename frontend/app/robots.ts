import type { MetadataRoute } from "next";
import {
  authRoutePrefixes,
  protectedRoutePrefixes,
  publicCrawlerDisallowPrefixes,
} from "@/lib/protected-routes";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://managehub.app";
  const disallow = [
    ...protectedRoutePrefixes,
    ...authRoutePrefixes,
    ...publicCrawlerDisallowPrefixes,
  ].map((prefix) => `${prefix}/`);

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow,
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
