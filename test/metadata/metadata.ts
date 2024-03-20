const { test, expect, beforeEach } = require("@playwright/test");

test("metadata", async ({ page }) => {
  await page.goto("/");

  const name = page.locator("h1[itemprop='name']");
  const description = page.locator("[itemprop='description']");
  const creatorName = page.locator("[itemprop='creator'] [itemprop='name']");
  const source = page.locator(".source");

  await page.goto("/");
  await name.waitFor({ state: "visible" });

  expect(await name.textContent()).toBe("metadata");
  expect(await description.textContent()).toBe(
    "This is how to configure metadata for a demo."
  );
  expect(await creatorName.textContent()).toBe("zoetrope");
  expect(await source.getAttribute("href")).toBe("https://example.com/source");
});
