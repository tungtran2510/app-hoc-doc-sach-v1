const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, '../screenshots_light_qa');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function testLightMode() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  // Test on live production
  await page.goto('https://qbiz-ebook.vercel.app/da-luu', { waitUntil: 'domcontentloaded' });
  // Force light mode
  await page.evaluate(() => {
    localStorage.setItem('giao_dien', 'light');
    document.documentElement.classList.remove('dark');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, 'live_da_luu_light.png') });
  console.log('Saved: live_da_luu_light.png');

  await page.goto('https://qbiz-ebook.vercel.app/danh-muc', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, 'live_danh_muc_light.png') });
  console.log('Saved: live_danh_muc_light.png');

  // Also test dark mode
  await page.evaluate(() => {
    localStorage.setItem('giao_dien', 'dark');
    document.documentElement.classList.add('dark');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, 'danh_muc_dark.png') });
  console.log('Saved: danh_muc_dark.png');

  await browser.close();
}

testLightMode().catch(console.error);
