import type { MetadataRoute } from "next";
import { shouldBlockSandbox } from "@/lib/sandbox";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://managehub.app";
  const routes = ["/", "/privacy-policy", "/terms-of-service"];

  if (!shouldBlockSandbox("/sandbox", process.env)) {
    routes.push("/sandbox");
  }

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }));
}
