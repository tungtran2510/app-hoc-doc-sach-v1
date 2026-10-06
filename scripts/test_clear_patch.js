const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();

  await page.goto('http://localhost:3088/thu-nghiem-lat-sach');
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(500);

  // Apply monkey patch to pf.getRender().clear
  await page.evaluate(() => {
    // Find pf instance
    // Let's test if we patch render.clear in the component
  });

  await browser.close();
})();
