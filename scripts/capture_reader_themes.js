const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/5a2f97b4-0aae-45d0-b12e-387a90cefcdf';
const BASE_URL = 'http://localhost:3093';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  await page.goto(`${BASE_URL}/?skip_intro=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Click on the first book
  const bookEl = await page.$('div[title*="Cột Sống"], div[title*="sách"], img[alt*="Cột Sống"]');
  if (bookEl) {
    await bookEl.click({ force: true });
    await page.waitForTimeout(800);
    const readBtn = await page.$('button:has-text("Đọc sách")');
    if (readBtn) {
      await readBtn.click({ force: true });
      await page.waitForTimeout(2000);

      // Dark Mode reader
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_reader_dark.png') });
      console.log('Saved: mobile_reader_dark.png');

      // Click settings or theme button inside reader
      const themeBtn = await page.$('button[title*="màu nền"], button[title*="Giao diện"], button[aria-label*="Giao diện"]');
      if (themeBtn) {
        await themeBtn.click();
        await page.waitForTimeout(500);
      }

      // Switch to Light
      const lightOption = await page.$('button[title*="Sáng"], button:has-text("Sáng")');
      if (lightOption) {
        await lightOption.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_reader_light.png') });
        console.log('Saved: mobile_reader_light.png');
      }

      // Switch to Ivory
      const ivoryOption = await page.$('button[title*="Ngà"], button:has-text("Ngà")');
      if (ivoryOption) {
        await ivoryOption.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_reader_ivory.png') });
        console.log('Saved: mobile_reader_ivory.png');
      }
    }
  }

  await browser.close();
  console.log('Reader theme QA completed!');
})().catch(console.error);
