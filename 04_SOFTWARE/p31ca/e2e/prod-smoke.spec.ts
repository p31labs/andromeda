import { test, expect } from "@playwright/test";

/**
 * Optional: PLAYWRIGHT_BASE_URL=https://p31ca.org PLAYWRIGHT_SKIP_WEBSERVER=1 npm run test:e2e
 * (run after deploy or against production manually)
 */
const prod = process.env.PLAYWRIGHT_BASE_URL?.includes("p31ca.org");

test.describe("production smoke (optional)", () => {
  test.skip(!prod, "set PLAYWRIGHT_BASE_URL to p31ca.org to enable");

  test("canon demo live", async ({ page }) => {
    await page.goto("/p31-canon-demo.html", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await expect(page.getByRole("heading", { name: /One canon/i })).toBeVisible();
  });
});
