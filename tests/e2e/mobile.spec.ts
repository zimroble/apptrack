import { expect, test } from "@playwright/test";
import { addApplication, column, moveWithMenu, signup } from "./helpers";

test("on touch devices cards move with the status menu", async ({ page }) => {
  await signup(page);
  await addApplication(page, { company: "Wealthsimple", role: "Intern" });
  await moveWithMenu(page, "Wealthsimple", "APPLIED");
  await expect(column(page, "APPLIED").getByText("Wealthsimple")).toBeVisible();
  await page.reload();
  await expect(column(page, "APPLIED").getByText("Wealthsimple")).toBeVisible();
});
