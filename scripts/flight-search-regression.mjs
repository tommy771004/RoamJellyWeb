import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.FLIGHT_UI_BASE_URL ?? "http://localhost:3000/";
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;

const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
});

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  const originInput = page.getByRole("textbox", { name: "出發地", exact: true });
  await originInput.click();
  await page
    .locator('[role="dialog"]:visible')
    .getByRole("button", { name: /東京成田/ })
    .click();
  await page.waitForTimeout(250);

  assert.equal(await originInput.inputValue(), "東京/成田");
  assert.equal(await page.locator('[role="dialog"]:visible').count(), 0);

  const destinationInput = page.getByRole("textbox", {
    name: "目的地",
    exact: true,
  });
  await destinationInput.click();
  await page
    .locator('[role="dialog"]:visible')
    .getByRole("button", { name: /台北桃園/ })
    .click();
  await page.waitForTimeout(250);

  assert.equal(await destinationInput.inputValue(), "台北/桃園");
  assert.equal(await page.locator('[role="dialog"]:visible').count(), 0);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  assert.equal(await originInput.inputValue(), "東京/成田");
  assert.equal(await destinationInput.inputValue(), "台北/桃園");

  console.log("flight-search-regression: PASS");
} finally {
  await browser.close();
}
