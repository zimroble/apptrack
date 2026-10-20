import { expect, test } from "@playwright/test";
import { addApplication, boardReady, card, column, dragAndSave, moveWithMenu, signup } from "./helpers";

test("create, edit and delete an application", async ({ page }) => {
  await signup(page);
  await addApplication(page, { company: "Shopify", role: "Backend Intern", location: "Toronto", status: "APPLIED" });
  await expect(column(page, "APPLIED").getByText("Shopify")).toBeVisible();
  await expect(card(page, "Shopify")).toContainText("Applied today");

  await card(page, "Shopify").hover();
  await page.getByRole("link", { name: "Edit Shopify" }).click();
  await page.getByLabel("Role").fill("Backend Developer Intern");
  await page.getByLabel("Status").selectOption("INTERVIEW");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(column(page, "INTERVIEW").getByText("Backend Developer Intern")).toBeVisible();

  await card(page, "Shopify").hover();
  await page.getByRole("link", { name: "Edit Shopify" }).click();
  await expect(page.getByText("Applied → Interviewing")).toBeVisible(); // status history
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/board$/);
  await expect(card(page, "Shopify")).toHaveCount(0);
});

test("form validation", async ({ page }) => {
  await signup(page);
  await page.goto("/applications/new");
  await page.getByLabel("Posting link").fill("ftp://nope");
  await page.getByRole("button", { name: "Add application" }).click();
  await expect(page.getByText("Company is required")).toBeVisible();
  await expect(page.getByText("Role is required")).toBeVisible();
  await expect(page.getByText("Link must start with http:// or https://")).toBeVisible();
  await expect(page.getByLabel("Posting link")).toHaveValue("ftp://nope"); // input preserved
});

test("drag a card to another column and it persists", async ({ page }) => {
  await signup(page);
  await addApplication(page, { company: "Stripe", role: "SWE Intern" });
  await expect(column(page, "WISHLIST").getByText("Stripe")).toBeVisible();

  await dragAndSave(page, card(page, "Stripe"), column(page, "ASSESSMENT"));
  await expect(column(page, "ASSESSMENT").getByText("Stripe")).toBeVisible();

  await page.reload();
  await expect(column(page, "ASSESSMENT").getByText("Stripe")).toBeVisible();
  await expect(column(page, "WISHLIST").getByText("Stripe")).toHaveCount(0);
});

test("drag reorders cards within a column and the order persists", async ({ page }) => {
  await signup(page);
  for (const company of ["Alpha", "Bravo", "Charlie"]) await addApplication(page, { company, role: "Intern" });
  const names = () => column(page, "WISHLIST").locator("[data-card] p.font-medium").allTextContents();
  expect(await names()).toEqual(["Alpha", "Bravo", "Charlie"]);

  // Drop Charlie onto the top half of Alpha.
  await dragAndSave(page, card(page, "Charlie"), card(page, "Alpha"), { targetPosition: { x: 20, y: 5 } });
  await expect.poll(names).toEqual(["Charlie", "Alpha", "Bravo"]);
  await page.reload();
  await boardReady(page);
  expect(await names()).toEqual(["Charlie", "Alpha", "Bravo"]);
});

test("filter narrows the board", async ({ page }) => {
  await signup(page);
  await addApplication(page, { company: "Google", role: "STEP Intern" });
  await addApplication(page, { company: "Amazon", role: "SDE Intern", location: "Vancouver" });
  await page.getByLabel("Filter applications").fill("vancouver");
  await expect(card(page, "Amazon")).toBeVisible();
  await expect(card(page, "Google")).toHaveCount(0);
});

test("users cannot see or edit each other's applications", async ({ browser }) => {
  const alice = await browser.newPage();
  await signup(alice, "Alice");
  await addApplication(alice, { company: "SecretCorp", role: "Intern" });
  await card(alice, "SecretCorp").hover();
  await alice.getByRole("link", { name: "Edit SecretCorp" }).click();
  await expect(alice).toHaveURL(/\/applications\/\w+$/);
  const editUrl = alice.url();

  const bob = await browser.newPage();
  await signup(bob, "Bob");
  await expect(card(bob, "SecretCorp")).toHaveCount(0);
  const res = await bob.goto(editUrl);
  expect(res?.status()).toBe(404);
  const csv = await (await bob.request.get("/api/export")).text();
  expect(csv).not.toContain("SecretCorp");
});

test("stats and CSV export reflect the pipeline", async ({ page }) => {
  await signup(page);
  await addApplication(page, { company: "A Co", role: "Intern", status: "APPLIED" });
  await addApplication(page, { company: "B Co", role: "Intern", status: "APPLIED" });
  await addApplication(page, { company: "C Co, Inc", role: "Intern", status: "APPLIED" });
  await addApplication(page, { company: "D Co", role: "Intern" }); // wishlist: not counted as sent

  await dragAndSave(page, card(page, "B Co"), column(page, "INTERVIEW"));
  await expect(column(page, "INTERVIEW").getByText("B Co")).toBeVisible();
  // Rejected is off-screen on a 1280px board; use the keyboard-accessible "Move to…" menu.
  await card(page, "B Co").hover();
  await moveWithMenu(page, "B Co", "REJECTED");
  await expect(column(page, "REJECTED").getByText("B Co")).toBeVisible();

  await page.getByRole("link", { name: "Stats" }).click();
  await expect(page.getByTestId("kpi-sent")).toHaveText("3");
  await expect(page.getByTestId("kpi-response")).toHaveText("33%");
  await expect(page.getByTestId("kpi-interview")).toHaveText("33%"); // interviewed, even though rejected later

  const csv = await (await page.request.get("/api/export")).text();
  const lines = csv.trim().split("\r\n");
  expect(lines[0]).toBe("Company,Role,Location,Status,Applied,Link,Notes,Created");
  expect(lines).toHaveLength(5);
  expect(csv).toContain('"C Co, Inc"');
});
