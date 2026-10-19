import { expect, test } from "@playwright/test";

const password = "ManageHub-e2e-Password-2026";

test("registers, restores, logs out, and logs in through the real auth API", async ({
  page,
}) => {
  const email = `e2e-auth-${crypto.randomUUID()}@example.com`;
  const registerResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/auth/register") && response.request().method() === "POST",
  );
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  const response = await registerResponse;
  expect(response.ok()).toBeTruthy();
  const registration: { user: { id: string; email: string; role: string } } =
    await response.json();
  expect(registration.user).toMatchObject({ email, role: "user" });
  await expect(page).toHaveURL(/\/wallet$/);

  const cookie = (await page.context().cookies("http://localhost:3000")).find(
    (item) => item.name === "accessToken",
  );
  expect(cookie?.httpOnly).toBe(true);

  const meResponse = await page.evaluate(async () => {
    const response = await fetch("http://localhost:6000/auth/me", {
      credentials: "include",
    });
    return { status: response.status, body: await response.json() };
  });
  expect(meResponse.status).toBe(200);
  expect(meResponse.body).toMatchObject({ id: registration.user.id, email });

  const logoutResponse = await page.evaluate(async () => {
    const response = await fetch("http://localhost:6000/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    return response.status;
  });
  expect(logoutResponse).toBe(201);

  const revokedResponse = await page.evaluate(async () => {
    const response = await fetch("http://localhost:6000/auth/me", {
      credentials: "include",
    });
    return response.status;
  });
  expect(revokedResponse).toBe(401);

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/wallet$/);

  const loggedInResponse = await page.evaluate(async () => {
    const response = await fetch("http://localhost:6000/auth/me", {
      credentials: "include",
    });
    return { status: response.status, body: await response.json() };
  });
  expect(loggedInResponse.status).toBe(200);
  expect(loggedInResponse.body).toMatchObject({ id: registration.user.id, email });
});
