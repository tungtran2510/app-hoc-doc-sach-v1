const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../screenshots_production_qa');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const PROD_URL = 'https://qbiz-ebook.vercel.app';

async function runQA() {
  console.log('--- STARTING PLAYWRIGHT QA ON LIVE PRODUCTION ---', PROD_URL);
  const browser = await chromium.launch({ headless: true });

  // 1. Mobile QA (iPhone 14 viewport 390x844)
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await mobileContext.newPage();

  // Test 1: Homepage & Bookshelf
  console.log('1. Testing Homepage Bookshelf...');
  await page.goto(PROD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Scroll down to bookshelf
  const shelfSection = page.locator('text=GIAN TRƯNG BÀY');
  if (await shelfSection.isVisible()) {
    await shelfSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
  }

  await page.screenshot({ path: path.join(OUTPUT_DIR, '01_mobile_bookshelf.png'), fullPage: false });
  console.log('Captured: 01_mobile_bookshelf.png');

  // Test 2: Category page /danh-muc
  console.log('2. Testing /danh-muc...');
  await page.goto(`${PROD_URL}/danh-muc`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '02_mobile_danh_muc.png'), fullPage: false });
  console.log('Captured: 02_mobile_danh_muc.png');

  // Test 3: Saved page /da-luu
  console.log('3. Testing /da-luu...');
  await page.goto(`${PROD_URL}/da-luu`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '03_mobile_da_luu.png'), fullPage: false });
  console.log('Captured: 03_mobile_da_luu.png');

  // Test 4: Search page /tim-kiem
  console.log('4. Testing /tim-kiem...');
  await page.goto(`${PROD_URL}/tim-kiem`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '04_mobile_tim_kiem.png'), fullPage: false });
  console.log('Captured: 04_mobile_tim_kiem.png');

  // Test 5: Desktop QA & Bookshelf Zoom test
  console.log('5. Testing Desktop Bookshelf & Zoom...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto(PROD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await desktopPage.waitForTimeout(2000);

  const desktopShelf = desktopPage.locator('text=GIAN TRƯNG BÀY');
  if (await desktopShelf.isVisible()) {
    await desktopShelf.scrollIntoViewIfNeeded();
    await desktopPage.waitForTimeout(1000);
  }
  await desktopPage.screenshot({ path: path.join(OUTPUT_DIR, '05_desktop_bookshelf.png'), fullPage: false });
  console.log('Captured: 05_desktop_bookshelf.png');

  await browser.close();
  console.log('--- ALL QA TESTS FINISHED SUCCESSFULLY ---');
}

runQA().catch((err) => {
  console.error('QA Error:', err);
  process.exit(1);
});
