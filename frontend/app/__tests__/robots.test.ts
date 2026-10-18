import { describe, expect, it } from "vitest";

import robots from "../robots";

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

describe("robots", () => {
  it("disallows the admin area and the component catalog", () => {
    const disallow = disallowedPaths();

    expect(disallow).toContain("/admin/");
    expect(disallow).toContain("/components/");
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
