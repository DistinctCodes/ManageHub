import { test, expect } from "@playwright/test";
import { SignJWT } from "jose";

/**
 * End-to-end coverage of the one flow that currently works end to end in
 * this app: loading and provisioning a wallet (issue FE-125).
 *
 * `/wallet` is protected by middleware and needs a valid JWT,
 * The test signs a short test-only JWT for middleware; wallet API calls are
 * still mocked and do not require the backend, keeping this smoke test fast.
 */
async function signIn(page: import("@playwright/test").Page) {
  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET ?? "managehub-e2e-only-secret",
  );
  const token = await new SignJWT({ role: "user" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("e2e-wallet-user")
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret);

  await page.context().addCookies([
    {
      name: "accessToken",
      value: token,
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

    await expect(page.getByText("Your balance", { exact: true })).toBeVisible();
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

    await expect(page.getByRole("paragraph").filter({ hasText: "Internal error" })).toBeVisible();
  });
});
