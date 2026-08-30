import { test, expect } from "@playwright/test";

/**
 * End-to-end coverage of the one flow that currently works end to end in
 * this app: loading and provisioning a wallet (issue FE-125).
 *
 * `/wallet` is a protected route (see middleware.ts) — a JWT is required,
 * but middleware.ts only verifies its signature when `JWT_SECRET` is set,
 * which it isn't in this test run, so any non-empty cookie value passes.
 * The backend itself is mocked via page.route() rather than started for
 * real, keeping this test self-contained and fast in CI.
 */
async function signIn(page: import("@playwright/test").Page) {
  await page.context().addCookies([
    {
      name: "accessToken",
      value: "e2e-test-token",
      url: "http://localhost:3000",
    },
  ]);
}

test.describe("wallet status and provisioning", () => {
  test("loads an unprovisioned wallet and provisions it", async ({ page }) => {
    await signIn(page);

    let provisioned = false;

    await page.route("**/wallets/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          provisioned
            ? {
                provisioned: true,
                walletAddress: "GE2ETESTADDRESS",
                custodyType: "CUSTODIAL",
                status: "ACTIVE",
                balance: 500,
                currency: "USD",
              }
            : {
                provisioned: false,
                walletAddress: null,
                custodyType: null,
                status: null,
                balance: 0,
                currency: "USD",
              },
        ),
      });
    });

    await page.route("**/wallets/provision", async (route) => {
      provisioned = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          provisioned: true,
          walletAddress: "GE2ETESTADDRESS",
          custodyType: "CUSTODIAL",
          status: "ACTIVE",
          balance: 500,
          currency: "USD",
        }),
      });
    });

    await page.goto("/wallet");

    await expect(page.getByRole("heading", { name: "Your balance" })).toBeVisible();
    await expect(
      page.getByText(/don't have a payment balance set up yet/),
    ).toBeVisible();

    await page.getByRole("button", { name: "Get started" }).click();

    await expect(page.getByText("5.00 USD credit")).toBeVisible();
  });

  test("shows an error state when the wallet status request fails", async ({ page }) => {
    await signIn(page);

    await page.route("**/wallets/me", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Internal error" }),
      });
    });

    await page.goto("/wallet");

    await expect(page.getByText("Internal error")).toBeVisible();
  });
});
