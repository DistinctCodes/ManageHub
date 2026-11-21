import { describe, expect, it } from "vitest";

import robots from "../robots";
import {
  authRoutePrefixes,
  protectedRoutePrefixes,
  publicCrawlerDisallowPrefixes,
} from "@/lib/protected-routes";

// robots() declares MetadataRoute.Robots whose `rules` may be a single rule,
// an array of rules, or even a plain path string; normalise before checking.
function disallowedPaths(): string[] {
  const { rules } = robots();
  const ruleList = Array.isArray(rules) ? rules : [rules];
  return ruleList.flatMap((rule) => {
    if (typeof rule === "string") return [];
    if (rule.disallow === undefined) return [];
    return Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];
  });
}

function parseRobotsTxt(disallow: string[]) {
  const contents = [
    "User-agent: *",
    ...disallow.map((path) => `Disallow: ${path}`),
  ];
  const disallowedPrefixes = contents.flatMap((line) => {
    const match = /^Disallow:\s*(.*)$/.exec(line);
    return match?.[1] ? [match[1]] : [];
  });

  return {
    isAllowed(url: string): boolean {
      const { pathname } = new URL(url);
      return !disallowedPrefixes.some((prefix) => pathname.startsWith(prefix));
    },
  };
}

describe("robots", () => {
  it("disallows the admin area and the component catalog", () => {
    const disallow = disallowedPaths();

    expect(disallow).toContain("/admin/");
    expect(disallow).toContain("/components/");
  });

  it("disallows every protected route and its children", () => {
    const disallow = disallowedPaths();

    for (const prefix of protectedRoutePrefixes) {
      expect(disallow).toContain(prefix);
    }
  });

  it("disallows every auth route", () => {
    const disallow = disallowedPaths();

    for (const prefix of authRoutePrefixes) {
      expect(disallow).toContain(prefix);
    }
  });

  it("blocks bare disallowed routes and their children according to a robots parser", () => {
    const parser = parseRobotsTxt(disallowedPaths());

    for (const prefix of [
      ...protectedRoutePrefixes,
      ...authRoutePrefixes,
      ...publicCrawlerDisallowPrefixes,
    ]) {
      expect(parser.isAllowed(`https://managehub.app${prefix}`, "*")).toBe(false);
      expect(parser.isAllowed(`https://managehub.app${prefix}/child`, "*")).toBe(
        false,
      );
    }
  });

  it("allows the rest of the site for everyone", () => {
    const { rules } = robots();
    const first = Array.isArray(rules) ? rules[0] : rules;

    expect(typeof first !== "string" && first.userAgent).toBe("*");
    expect(typeof first !== "string" && first.allow).toBe("/");
  });

  it("publishes the sitemap on the configured base URL", () => {
    expect(robots().sitemap).toContain("https://managehub.app/sitemap.xml");
  });
});
