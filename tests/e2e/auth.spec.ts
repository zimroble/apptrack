import { expect, test } from "@playwright/test";
import { signup, uniqueEmail } from "./helpers";

test("protected pages redirect to login", async ({ page }) => {
  for (const path of ["/board", "/stats", "/applications/new"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test("export requires a session", async ({ request }) => {
  const res = await request.get("/api/export");
  expect(res.status()).toBe(401);
});

test("sign up, log out, log back in", async ({ page }) => {
  const user = await signup(page, "Ada Lovelace");
  await expect(page.getByTestId("user-name")).toHaveText("Ada Lovelace");

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/board");
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Email").fill(user.email.toUpperCase()); // emails are case-insensitive
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/board$/);
});

test("wrong password shows a generic error", async ({ page }) => {
  const user = await signup(page);
  await page.getByRole("button", { name: "Log out" }).click();
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Incorrect email or password")).toBeVisible();

  await page.getByLabel("Email").fill(uniqueEmail("nobody"));
  await page.getByLabel("Password").fill("whatever123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Incorrect email or password")).toBeVisible();
});

test("signup validation and duplicate email", async ({ page }) => {
  await page.goto("/signup");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Name is required")).toBeVisible();
  await expect(page.getByText("Enter a valid email")).toBeVisible();
  await expect(page.getByText("Use at least 8 characters")).toBeVisible();

  const user = await signup(page);
  await page.getByRole("button", { name: "Log out" }).click();
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Someone Else");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill("another-pass-1");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("An account with this email already exists")).toBeVisible();
});

test("session cookie is httpOnly", async ({ page, context }) => {
  await signup(page);
  const cookie = (await context.cookies()).find((c) => c.name === "apptrack_session");
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
  expect(await page.evaluate(() => document.cookie)).not.toContain("apptrack_session");
});
