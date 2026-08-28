import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://managehub.app";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/wallet/", "/payments/", "/usage/", "/login/", "/register/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
