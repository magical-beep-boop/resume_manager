import { chromium } from "playwright";

const appUrl = "http://localhost:3000";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });

  await page.goto(appUrl, { waitUntil: "networkidle" });
  await page.screenshot({ path: "docs/images/studio-overview.png", fullPage: true });

  await page.getByRole("button", { name: "Load Sample" }).click();
  await page.getByRole("button", { name: "Generate Resume" }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "docs/images/generated-resume.png", fullPage: true });

  const formattingSummary = page.locator("summary").filter({ hasText: "3. Formatting & Layout" });
  await formattingSummary.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "docs/images/formatting-controls.png", fullPage: true });

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
