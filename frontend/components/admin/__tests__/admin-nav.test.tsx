import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { AdminNav, ADMIN_NAV, ADMIN_NAV_EXEMPT_ROUTES } from "../admin-nav";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_PAGES_DIR = path.resolve(TEST_DIR, "../../../app/admin");

function collectAdminPageRoutes(): string[] {
  const routes: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
      } else if (entry.name === "page.tsx") {
        const relative = path.relative(ADMIN_PAGES_DIR, entryPath);
        const route = path.dirname(relative)
          .split(path.sep)
          .filter((segment) => segment && segment !== ".")
          .join("/");
        routes.push(`admin${route ? `/${route}` : ""}`);
      }
    }
  };
  walk(ADMIN_PAGES_DIR);
  return routes;
}

describe("admin nav", () => {
  describe("route completeness", () => {
    it("has an entry (or an explicit exemption) for every admin page", () => {
      const navHrefs = ADMIN_NAV.map((item) => item.href);
      const missing: string[] = [];

      for (const route of collectAdminPageRoutes()) {
        const isNavRoute = navHrefs.includes(`/${route}`);
        const isExempt = ADMIN_NAV_EXEMPT_ROUTES.includes(route);
        if (!isNavRoute && !isExempt) {
          missing.push(route);
        }
      }

      expect(missing).toEqual([]);
    });

    it("does not repeat hrefs across nav entries", () => {
      const navHrefs = ADMIN_NAV.map((item) => item.href);
      expect(new Set(navHrefs).size).toBe(navHrefs.length);
    });
  });

  describe("active marking", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("marks only the current route link with aria-current and the active color", () => {
      vi.mocked(usePathname).mockReturnValue("/admin/payments");

      render(<AdminNav />);

      const paymentsLink = screen.getByRole("link", { name: "Payments" });
      expect(paymentsLink).toHaveAttribute("aria-current", "page");
      expect(paymentsLink).toHaveClass("text-blue-600");

      const dashboardLink = screen.getByRole("link", { name: "Dashboard" });
      expect(dashboardLink).not.toHaveAttribute("aria-current");

      const links = screen.getAllByRole("link");
      const marked = links.filter(
        (link) => link.getAttribute("aria-current") === "page",
      );
      expect(marked).toHaveLength(1);
      expect(marked[0]).toBe(paymentsLink);
    });

    it("keeps the dashboard link unmarked on nested routes", () => {
      vi.mocked(usePathname).mockReturnValue("/admin/settlements/batch-1");

      render(<AdminNav />);

      const dashboardLink = screen.getByRole("link", { name: "Dashboard" });
      expect(dashboardLink).not.toHaveAttribute("aria-current");

      const settlementsLink = screen.getByRole("link", {
        name: "Settlement",
      });
      expect(settlementsLink).toHaveAttribute("aria-current", "page");
    });
  });
});
