import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: [],
    },
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || "https://managehub.app"}/sitemap.xml`,
  };
}
