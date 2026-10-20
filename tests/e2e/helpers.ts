import { expect, type Locator, type Page } from "@playwright/test";

let counter = 0;
export function uniqueEmail(tag: string) {
  return `${tag}-${Date.now()}-${process.pid}-${counter++}@example.com`;
}

export async function signup(page: Page, name = "Test User", email = uniqueEmail("user"), password = "correct-horse-1") {
  await page.goto("/signup");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/board$/);
  return { name, email, password };
}

export async function addApplication(
  page: Page,
  fields: { company: string; role: string; status?: string; location?: string; appliedAt?: string; url?: string },
) {
  await page.goto("/applications/new");
  await page.getByLabel("Company").fill(fields.company);
  await page.getByLabel("Role").fill(fields.role);
  if (fields.location) await page.getByLabel("Location").fill(fields.location);
  if (fields.url) await page.getByLabel("Posting link").fill(fields.url);
  if (fields.status) await page.getByLabel("Status").selectOption(fields.status);
  if (fields.appliedAt) await page.getByLabel("Date applied").fill(fields.appliedAt);
  await page.getByRole("button", { name: "Add application" }).click();
  await expect(page).toHaveURL(/\/board$/);
  await boardReady(page);
}

/** Wait until the board has hydrated, so drag-and-drop handlers are attached. */
export async function boardReady(page: Page) {
  await expect(page.locator('[data-testid="board"][data-hydrated="true"]')).toBeAttached();
}

export const column = (page: Page, status: string) => page.getByTestId(`column-${status}`);
export const card = (page: Page, company: string) => page.locator("[data-card]", { hasText: company });

/** Wait for the server action triggered by `act` (a drag or a status change) to finish. */
export async function saved(page: Page, act: () => Promise<unknown>) {
  const done = page.waitForResponse((r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/board");
  await act();
  await done;
}

export async function dragAndSave(page: Page, source: Locator, target: Locator, options?: Parameters<Locator["dragTo"]>[1]) {
  await saved(page, () => source.dragTo(target, options));
}

/** Move a card with the keyboard/touch "Move to…" menu instead of dragging. */
export async function moveWithMenu(page: Page, company: string, status: string) {
  await card(page, company).getByRole("button", { name: "Move to…" }).click();
  await saved(page, () => page.getByLabel(`Move ${company} to`).selectOption(status));
}
