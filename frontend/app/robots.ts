import type { MetadataRoute } from "next";
import { shouldBlockSandbox } from "@/lib/sandbox";

export default function robots(): MetadataRoute.Robots {
  const disallow = shouldBlockSandbox("/sandbox", process.env)
    ? ["/sandbox"]
    : [];

  return {
    rules: {
      userAgent: "*",
      disallow,
    },
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || "https://managehub.app"}/sitemap.xml`,
  };
}
