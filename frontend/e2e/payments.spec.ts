import { expect, test } from "@playwright/test";

test("creates a FIAT sandbox payment and confirms it on the payment return page", async ({
  page,
}) => {
  const email = `e2e-payment-${crypto.randomUUID()}@example.com`;
  const password = "ManageHub-e2e-Password-2026";

  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/wallet$/);

  await page.goto("/payments/new");
  await page.getByLabel("Booking ID").fill(crypto.randomUUID());
  await page.getByLabel("Amount (minor units)").fill("1250");
  await page.getByLabel("Currency (ISO 4217)").fill("USD");
  await page.getByLabel("Rail").selectOption("FIAT");

  const initiateResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/payments/initiate") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Initiate payment" }).click();
  const payment = await (await initiateResponse).json();
  expect(payment).toMatchObject({ rail: "FIAT", status: "AWAITING_CONFIRMATION" });
  await expect(page.getByText(`Payment created: ${payment.id}`)).toBeVisible();

  await page.goto(`/payments/return?paymentId=${payment.id}`);
  await expect(page.getByText("Payment verified")).toBeVisible();
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
  await expect(page.getByText("$12.50")).toBeVisible();
});
