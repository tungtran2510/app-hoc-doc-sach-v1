const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  const outDir = path.join(__dirname, 'qa_screenshots_v2');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Check /da-luu
  console.log('Visiting /da-luu...');
  await page.goto('http://127.0.0.1:3088/da-luu', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, '01_da_luu_default_compact.png') });
  console.log('Saved 01_da_luu_default_compact.png');

  // 2. Check /danh-muc
  console.log('Visiting /danh-muc...');
  await page.goto('http://127.0.0.1:3088/danh-muc', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, '02_danh_muc_top_and_cards.png') });
  console.log('Saved 02_danh_muc_top_and_cards.png');

  // Click on "+ Thêm danh mục" button
  console.log('Clicking "+ Thêm danh mục"...');
  await page.click('button:has-text("Thêm danh mục")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '03_danh_muc_add_modal.png') });
  console.log('Saved 03_danh_muc_add_modal.png');

  // Close modal
  await page.click('button:has-text("Hủy")');
  await page.waitForTimeout(500);

  // Click on Category: "Cột Sống & Thoát Vị Đĩa Đệm"
  console.log('Clicking Category "Cột Sống & Thoát Vị Đĩa Đệm"...');
  await page.click('text=Cột Sống & Thoát Vị Đĩa Đệm');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '04_danh_muc_active_category_books.png') });
  console.log('Saved 04_danh_muc_active_category_books.png');

  await browser.close();
  console.log('All tests finished successfully!');
}

test().catch((err) => {
  console.error(err);
  process.exit(1);
});
