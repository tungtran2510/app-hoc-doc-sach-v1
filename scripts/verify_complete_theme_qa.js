const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/5a2f97b4-0aae-45d0-b12e-387a90cefcdf';
const BASE_URL = 'http://localhost:3093';

async function runQA() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  console.log('1. Testing Bookshelf in Dark Mode...');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('giao_dien', 'dark');
    document.documentElement.classList.add('dark');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_shelf_dark_mode.png') });
  console.log('Saved: mobile_shelf_dark_mode.png');

  console.log('2. Testing Bookshelf in Light Mode...');
  // Click theme toggle button or set light mode
  const themeToggle = await page.$('button[aria-label*="giao diện"], button[title*="Chế độ"]');
  if (themeToggle) {
    await themeToggle.click();
    await page.waitForTimeout(1000);
  } else {
    await page.evaluate(() => {
      localStorage.setItem('giao_dien', 'light');
      document.documentElement.classList.remove('dark');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_shelf_light_mode.png') });
  console.log('Saved: mobile_shelf_light_mode.png');

  console.log('3. Testing Settings Menu in Light Mode...');
  // Click settings button (has title="Cài đặt & Tùy chọn đọc" or icon Settings)
  const settingsBtn = await page.$('button[title*="Cài đặt"], button[aria-label*="Cài đặt"]');
  if (settingsBtn) {
    await settingsBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_settings_menu_light.png') });
    console.log('Saved: mobile_settings_menu_light.png');

    console.log('4. Testing Exit Confirm Modal in Light Mode...');
    // Click "Thoát phần mềm" inside settings menu
    const exitBtn = await page.$('button:has-text("Thoát phần mềm")');
    if (exitBtn) {
      await exitBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_exit_modal_light.png') });
      console.log('Saved: mobile_exit_modal_light.png');

      // Click "Ở lại đọc sách" to dismiss exit modal
      const stayBtn = await page.$('button:has-text("Ở lại đọc sách")');
      if (stayBtn) await stayBtn.click();
      await page.waitForTimeout(500);
    }
  }

  console.log('5. Testing QuickPeek Modal in Light Mode...');
  // Click on eye icon or book card
  const eyeBtn = await page.$('button[title*="Xem tóm tắt"], button[aria-label*="tóm tắt"]');
  if (eyeBtn) {
    await eyeBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_quickpeek_modal_light.png') });
    console.log('Saved: mobile_quickpeek_modal_light.png');

    // Click close quickpeek
    const closePeek = await page.$('button[aria-label*="Đóng tóm tắt"]');
    if (closePeek) await closePeek.click();
    await page.waitForTimeout(500);
  }

  console.log('6. Testing Reader in Light Mode...');
  // Click first book cover or Read button
  const firstBook = await page.$('button:has-text("Đọc ngay"), div[title*="Nhấn để mở sách"], img[alt*="sách"], .cursor-pointer');
  // Or navigate directly to reader
  await page.evaluate(() => {
    const bookEl = document.querySelector('[data-book-id], .cursor-pointer');
    if (bookEl) bookEl.click();
  });
  await page.waitForTimeout(2000);

  // Check if reader is open
  const readerHeader = await page.$('header, .fixed.top-0');
  if (readerHeader) {
    // Light mode
    await page.evaluate(() => {
      localStorage.setItem('ereader_theme', 'light');
    });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_reader_light_mode.png') });
    console.log('Saved: mobile_reader_light_mode.png');

    // Ivory mode
    const ivoryBtn = await page.$('button[title*="Ngà"], button:has-text("Ngà")');
    if (ivoryBtn) {
      await ivoryBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_reader_ivory_mode.png') });
      console.log('Saved: mobile_reader_ivory_mode.png');
    }
  }

  console.log('7. Testing Danh mục page in Light Mode...');
  await page.goto(`${BASE_URL}/danh-muc`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_danhmuc_light.png') });
  console.log('Saved: mobile_danhmuc_light.png');

  console.log('8. Testing Đã lưu page in Light Mode...');
  await page.goto(`${BASE_URL}/da-luu`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_daluu_light.png') });
  console.log('Saved: mobile_daluu_light.png');

  console.log('9. Testing Tìm kiếm page in Light Mode...');
  await page.goto(`${BASE_URL}/tim-kiem`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_timkiem_light.png') });
  console.log('Saved: mobile_timkiem_light.png');

  await browser.close();
  console.log('QA completed successfully!');
}

runQA().catch((err) => {
  console.error('QA Error:', err);
  process.exit(1);
});
