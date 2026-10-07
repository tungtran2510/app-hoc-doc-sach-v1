const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/5a2f97b4-0aae-45d0-b12e-387a90cefcdf';
const BASE_URL = 'http://localhost:3088';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  await page.goto(`${BASE_URL}/da-luu`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('giao_dien', 'dark');
    document.documentElement.classList.add('dark');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Click vào mục Atlas Hình Ảnh Cơ Thể 3D (CBZ)
  const cbzCard = await page.$('text=Atlas Hình Ảnh Cơ Thể 3D');
  if (cbzCard) {
    await cbzCard.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_format_04_cbz_reader.png') });
    console.log('Saved: mobile_format_04_cbz_reader.png');
  }

  await browser.close();
}

run().catch(console.error);
