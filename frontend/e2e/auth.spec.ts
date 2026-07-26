import { test, expect } from "@playwright/test";

test.describe("Authentication Journey", () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // Start unauthenticated

  test("register -> verify OTP -> login flow", async ({ page }) => {
    // 1. Register
    await page.goto("/register");
    await page.getByRole("textbox", { name: /full name|name/i }).fill("John Doe");
    await page.getByRole("textbox", { name: /email/i }).fill("johndoe@example.com");
    await page.getByLabel(/password/i).fill("Password123!");
    await page.getByRole("button", { name: /register|sign up|create account/i }).click();

    // 2. Verify OTP (if redirect or modal exists)
    const otpInput = page.getByRole("textbox", { name: /otp|code|verification/i });
    if (await otpInput.isVisible().catch(() => false)) {
      await otpInput.fill("123456");
      await page.getByRole("button", { name: /verify/i }).click();
    }

    // 3. Login
    await page.goto("/login");
    await page.getByRole("textbox", { name: /email/i }).fill("johndoe@example.com");
    await page.getByLabel(/password/i).fill("Password123!");
    await page.getByRole("button", { name: /sign in|log in/i }).click();

    // Expect navigation to dashboard or home page
    await expect(page).toHaveURL(/\/(dashboard|workspaces|bookings)?$/);
  });
});
