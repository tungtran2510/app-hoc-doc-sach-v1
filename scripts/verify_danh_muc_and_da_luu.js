const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 }, // Pixel 7 viewport
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('1. Checking /da-luu...');
  await page.goto('http://127.0.0.1:3088/da-luu', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  // Take screenshot of /da-luu (Grid view)
  await page.screenshot({ path: 'public/screenshots/verify_da_luu_grid.png', fullPage: false });
  console.log('Saved public/screenshots/verify_da_luu_grid.png');

  // Click on Compact list view button (index 1)
  const compactBtn = page.locator('button[aria-label="Chế độ danh sách thu gọn"]');
  if (await compactBtn.count() > 0) {
    await compactBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'public/screenshots/verify_da_luu_compact.png', fullPage: false });
    console.log('Saved public/screenshots/verify_da_luu_compact.png');
  }

  // Click on "Tiếp tục học" button to verify reader modal opens
  const continueBtn = page.locator('button:has-text("Tiếp tục học")');
  if (await continueBtn.count() > 0) {
    await continueBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'public/screenshots/verify_da_luu_reader_opened.png', fullPage: false });
    console.log('Saved public/screenshots/verify_da_luu_reader_opened.png');
  }

  console.log('2. Checking /danh-muc...');
  await page.goto('http://127.0.0.1:3088/danh-muc', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  // Take screenshot of /danh-muc
  await page.screenshot({ path: 'public/screenshots/verify_danh_muc_page.png', fullPage: false });
  console.log('Saved public/screenshots/verify_danh_muc_page.png');

  // Check BottomNav on /danh-muc
  const bottomNavDanhs = page.locator('nav a:has-text("Danh mục")');
  console.log('BottomNav Danh muc count:', await bottomNavDanhs.count());

  await browser.close();
  console.log('DONE ALL QA VERIFICATION!');
})();
