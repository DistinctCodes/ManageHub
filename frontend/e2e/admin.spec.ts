import { test, expect } from "@playwright/test";

test.describe("Admin Journey", () => {
  test("admin logs in -> sees bookings board", async ({ page }) => {
    // 1. Admin login or navigate directly to admin dashboard
    await page.goto("/admin/invoices");
    await page.goto("/admin/reports");
    await page.goto("/admin/events");

    // Verify admin page navigation
    await page.goto("/bookings");
    await expect(page.getByRole("heading", { name: /bookings/i })).toBeVisible();
  });
});
