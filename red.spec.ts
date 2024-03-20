const { test, expect, beforeEach } = require("@playwright/test");

test("red background", async ({ page }) => {
  const body = page.locator("body");
  const loading = page.locator("[aria-label='loading']");

  await page.goto("/");
  await loading.waitFor({ state: "visible" });
  await loading.waitFor({ state: "hidden" });
  const backgroundColor = await body.evaluate((el) => {
    return window.getComputedStyle(el).getPropertyValue("background-color");
  });

  expect(backgroundColor).toBe("rgb(255, 0, 0)");
});
