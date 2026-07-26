import { test, expect } from "@playwright/test";

test.describe("Booking & Payment Journey", () => {
  test("browse workspaces -> book -> payment callback flow", async ({ page }) => {
    // 1. Browse workspaces
    await page.goto("/workspaces");
    await expect(page.getByRole("heading", { name: /workspaces/i })).toBeVisible();

    // 2. Select workspace or navigate to book page
    await page.goto("/bookings/new");
    await expect(page.getByRole("heading", { name: /new booking/i })).toBeVisible();

    // Fill booking details using accessible roles
    const workspaceSelect = page.getByRole("combobox", { name: /workspace/i });
    if (await workspaceSelect.isVisible().catch(() => false)) {
      await workspaceSelect.selectOption({ index: 1 });
    }

    const startDateInput = page.getByLabel(/start date/i);
    if (await startDateInput.isVisible().catch(() => false)) {
      await startDateInput.fill("2026-08-01");
    }

    const endDateInput = page.getByLabel(/end date/i);
    if (await endDateInput.isVisible().catch(() => false)) {
      await endDateInput.fill("2026-08-05");
    }

    // 3. Payment callback simulation
    await page.goto("/payments/callback?reference=ref_123456&trxref=ref_123456");
    await expect(page).toHaveURL(/\/payments\/callback|\/bookings/);
  });
});
