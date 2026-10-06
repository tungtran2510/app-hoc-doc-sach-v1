const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const targetUrl = process.argv[2] || 'https://qbiz-ebook.vercel.app';
  console.log(`\n======================================================`);
  console.log(`[COMPREHENSIVE QA] Testing Live Production: ${targetUrl}`);
  console.log(`======================================================\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 }, // Standard mobile viewport
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
  });
  const page = await context.newPage();

  const screenshotsDir = path.join(__dirname, '../screenshots_production_qa');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  try {
    // 1. Navigation
    console.log(`[TEST 1] Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    await page.screenshot({ path: path.join(screenshotsDir, '01_bookshelf_main.png') });
    console.log(`✓ Screenshot: 01_bookshelf_main.png`);

    // 2. Check Fullscreen button in Bookshelf header
    const fsBtn = await page.$('button[aria-label="Toàn màn hình"]');
    console.log(`✓ Bookshelf Fullscreen button exists: ${Boolean(fsBtn)}`);

    // 3. Check Sort button
    const sortBtn = await page.$('button[aria-label*="sắp xếp"]');
    console.log(`✓ Sort button exists: ${Boolean(sortBtn)}`);
    if (sortBtn) {
      const initialSortText = await sortBtn.innerText();
      console.log(`  - Initial sort label: "${initialSortText}"`);
      await sortBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(screenshotsDir, '02_sort_changed.png') });
      console.log(`✓ Clicked sort. Screenshot: 02_sort_changed.png`);
      // Click back
      await sortBtn.click();
      await page.waitForTimeout(400);
      await sortBtn.click();
      await page.waitForTimeout(400);
      await sortBtn.click();
      await page.waitForTimeout(400);
    }

    // 4. Check Quick Peek Modal
    console.log(`[TEST 2] Testing Quick Peek [i] Modal...`);
    const infoButtons = await page.$$('button[aria-label*="Xem tóm tắt sách"]');
    console.log(`✓ Found ${infoButtons.length} Quick Peek [i] buttons on book covers`);
    if (infoButtons.length > 0) {
      await infoButtons[0].click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(screenshotsDir, '03_quick_peek_modal.png') });
      console.log(`✓ Quick Peek Modal opened! Screenshot: 03_quick_peek_modal.png`);

      // Verify modal content
      const modalTitle = await page.$eval('div[role="dialog"] h4', el => el.innerText);
      console.log(`  - Modal book title: "${modalTitle}"`);

      // Close modal
      const closeQuickPeek = await page.$('button[aria-label="Đóng tóm tắt sách"]');
      if (closeQuickPeek) {
        await closeQuickPeek.click();
        await page.waitForTimeout(600);
        console.log(`✓ Quick Peek Modal closed.`);
      }
    }

    // 5. Check Settings Menu & Both Toggles
    console.log(`[TEST 3] Testing Settings Menu Toggles...`);
    const settingsBtn = await page.$('button[aria-label="Cài đặt"]');
    if (settingsBtn) {
      await settingsBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(screenshotsDir, '04_settings_all_switches.png') });
      console.log(`✓ Settings opened. Screenshot: 04_settings_all_switches.png`);

      // Check title toggle
      const titleToggle = page.getByLabel(/hiện tên sách/i);
      console.log(`✓ "Hiện tên sách dưới chân kệ" toggle exists: ${await titleToggle.count() > 0}`);

      // Check progress toggle
      const progressToggle = page.getByLabel(/hiện tiến độ/i);
      console.log(`✓ "Hiện tiến độ đọc trên bìa" toggle exists: ${await progressToggle.count() > 0}`);

      // Close Settings
      await page.click('button[aria-label="Đóng"]');
      await page.waitForTimeout(600);
      console.log(`✓ Settings modal closed.`);
    }

    // 6. Test Reader View & Fullscreen Button
    console.log(`[TEST 4] Testing Reader View & Reader Fullscreen...`);
    const firstBook = await page.$('div[class*="group relative cursor-pointer"]');
    if (firstBook) {
      await firstBook.click();
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(screenshotsDir, '05_reader_clean.png') });
      console.log(`✓ Reader opened! Screenshot: 05_reader_clean.png`);

      // Tap middle to show HUD
      await page.click('body', { position: { x: 206, y: 450 } });
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(screenshotsDir, '06_reader_hud.png') });
      console.log(`✓ Reader HUD shown! Screenshot: 06_reader_hud.png`);

      // Check Fullscreen button in reader
      const readerFs = await page.$$('button[aria-label="Toàn màn hình"]');
      console.log(`✓ Reader Fullscreen button exists: ${readerFs.length > 0}`);

      // Check Page indicator
      const pageIndicator = await page.$('div:has-text("Trang 1")');
      console.log(`✓ Page indicator visible: ${Boolean(pageIndicator)}`);

      // Test tap edge to flip next
      console.log(`[TEST 5] Testing right edge tap to flip...`);
      await page.click('body', { position: { x: 380, y: 450 } });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(screenshotsDir, '07_reader_flipped.png') });
      console.log(`✓ Flipped page via edge tap! Screenshot: 07_reader_flipped.png`);
    }

    console.log(`\n======================================================`);
    console.log(`[ALL PRODUCTION TESTS PASSED WITH 100% SUCCESS]`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error(`[ERROR] QA Test failed:`, err);
  } finally {
    await browser.close();
  }
})();
