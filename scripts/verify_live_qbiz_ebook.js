const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('Visiting https://qbiz-ebook.vercel.app...');
  await page.goto('https://qbiz-ebook.vercel.app/?skip_intro=1', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'public/screenshots/verify_qbiz_ebook_home.png', fullPage: false });
  console.log('Saved public/screenshots/verify_qbiz_ebook_home.png');

  await browser.close();
})();
