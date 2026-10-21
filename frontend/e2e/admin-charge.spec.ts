import { expect, test } from "@playwright/test";

const password = "ManageHub-e2e-Password-2026";

test("an authenticated admin can charge a member through the admin page", async ({
  browser,
  page,
}) => {
  const email = `e2e-charge-${crypto.randomUUID()}@example.com`;
  let memberId = "";

  const registerResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/auth/register") && response.request().method() === "POST",
  );
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  memberId = (await (await registerResponse).json()).user.id;

  const memberChargeStatus = await page.evaluate(async () => {
    const response = await fetch("http://localhost:6100/credits/charge", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "00000000-0000-4000-8000-000000000000",
        amount: 1,
        reference: "member-role-check",
        reason: "This member request must be rejected",
      }),
    });
    return response.status;
  });
  expect(memberChargeStatus).toBe(403);

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await adminPage.goto("/login");
  await adminPage.getByLabel("Email").fill(
    process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@example.com",
  );
  await adminPage.getByLabel("Password").fill(
    process.env.E2E_ADMIN_PASSWORD ?? "ManageHub-e2e-Admin-2026",
  );
  await adminPage.getByRole("button", { name: "Sign in" }).click();
  await expect(adminPage).toHaveURL(/\/wallet$/);

  const adjustment = await adminContext.request.post(
    "http://localhost:6100/credits/admin/adjustments",
    {
      data: {
        userId: memberId,
        delta: 500,
        currency: "USD",
        reference: `e2e-fund-${crypto.randomUUID()}`,
        reason: "Fund balance for admin charge e2e",
      },
    },
  );
  expect(adjustment.ok()).toBeTruthy();

  await adminPage.goto("/admin/charge");
  await adminPage.getByLabel("User ID").fill(memberId);
  await adminPage.getByLabel("Amount (minor units)").fill("125");
  await adminPage.getByLabel("Currency (optional)").fill("USD");
  await adminPage.getByLabel("Reference (idempotency key)").fill(`e2e-charge-${crypto.randomUUID()}`);
  await adminPage.getByLabel("Reason").fill("E2E admin charge");
  await adminPage.getByRole("button", { name: "Charge credits" }).click();

  const confirmationDialog = adminPage.getByRole("dialog", {
    name: "Confirm charge",
  });
  await expect(confirmationDialog).toBeVisible();

  const chargeResponse = adminPage.waitForResponse(
    (response) =>
      response.url().endsWith("/credits/charge") &&
      response.request().method() === "POST",
  );
  await confirmationDialog
    .getByRole("button", { name: "Confirm charge" })
    .click();
  expect((await chargeResponse).ok()).toBeTruthy();

  await expect(adminPage.getByText(/Posted.*new balance/)).toBeVisible();
  await expect(adminPage.getByText("Transaction", { exact: false })).toBeVisible();
  await adminContext.close();
});
