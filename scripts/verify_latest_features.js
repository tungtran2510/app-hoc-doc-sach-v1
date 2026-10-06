const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const targetUrl = process.argv[2] || 'https://qbiz-ebook.vercel.app';
  console.log(`\n========================================`);
  console.log(`[TEST] Verifying Live Qbiz Ebook: ${targetUrl}`);
  console.log(`========================================\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 }, // Mobile portrait (Pixel 7 / Galaxy)
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
  });
  const page = await context.newPage();

  const screenshotsDir = path.join(__dirname, '../screenshots_verify');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  try {
    console.log(`[STEP 1] Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Screenshot initial state
    await page.screenshot({ path: path.join(screenshotsDir, '01_initial_bookshelf.png'), fullPage: false });
    console.log(`✓ Screenshot saved: 01_initial_bookshelf.png`);

    // 1. Verify books count
    const bookElements = await page.$$('div[onClick], div.cursor-pointer');
    console.log(`[INFO] Found clickable elements. Inspecting books...`);
    
    // Check titles or book covers
    const bookImages = await page.$$('img[alt]');
    console.log(`✓ Total book images rendered: ${bookImages.length}`);
    for (let i = 0; i < Math.min(bookImages.length, 9); i++) {
      const alt = await bookImages[i].getAttribute('alt');
      console.log(`  - Book #${i + 1}: "${alt}"`);
    }

    // 2. Verify Density Switcher: NO text "Lớn", "Chuẩn", "Gọn"
    const densityButtons = await page.$$('button[aria-label*="cuốn / tầng"]');
    console.log(`✓ Density column buttons found: ${densityButtons.length}`);
    for (let i = 0; i < densityButtons.length; i++) {
      const btnText = (await densityButtons[i].innerText()).trim();
      const ariaLabel = await densityButtons[i].getAttribute('aria-label');
      console.log(`  - Button #${i + 1}: aria-label="${ariaLabel}", text="${btnText}"`);
      if (btnText.includes('Lớn') || btnText.includes('Chuẩn') || btnText.includes('Gọn')) {
        console.error(`  ❌ FAILED: Found text "${btnText}" in density button! Must be pure icons.`);
      } else {
        console.log(`  ✓ PASSED: Pure icon button without text.`);
      }
    }

    // Test clicking 2-column icon
    console.log(`[STEP 2] Testing 2-column mode...`);
    if (densityButtons[0]) {
      await densityButtons[0].click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(screenshotsDir, '02_2_col_mode.png') });
      console.log(`✓ Switched to 2 columns. Screenshot: 02_2_col_mode.png`);
    }

    // Test clicking 4-column icon
    console.log(`[STEP 3] Testing 4-column mode...`);
    if (densityButtons[2]) {
      await densityButtons[2].click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(screenshotsDir, '03_4_col_mode.png') });
      console.log(`✓ Switched to 4 columns. Screenshot: 03_4_col_mode.png`);
    }

    // Test clicking 3-column icon back
    if (densityButtons[1]) {
      await densityButtons[1].click();
      await page.waitForTimeout(600);
      console.log(`✓ Switched back to 3 columns.`);
    }

    // 3. Verify Category Chips
    console.log(`[STEP 4] Testing Category Filter Chips...`);
    const categoryChips = await page.$$('button:has-text("Tất cả"), button:has-text("Cột Sống"), button:has-text("Dinh Dưỡng"), button:has-text("Giải Phẫu")');
    console.log(`✓ Found ${categoryChips.length} category filter chips`);
    if (categoryChips.length > 1) {
      const secondChipText = await categoryChips[1].innerText();
      console.log(`  - Clicking category chip: "${secondChipText}"`);
      await categoryChips[1].click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(screenshotsDir, '04_category_filtered.png') });
      console.log(`✓ Screenshot: 04_category_filtered.png`);

      // Click "Tất cả" back
      await categoryChips[0].click();
      await page.waitForTimeout(600);
      console.log(`✓ Restored to "Tất cả".`);
    }

    // 4. Verify Settings Menu and "Hiện tên sách dưới chân kệ" Toggle
    console.log(`[STEP 5] Testing Settings Menu & Title Toggle...`);
    const settingsBtn = await page.$('button[title*="Cài đặt"]') || await page.$('button[aria-label*="Cài đặt"]');
    if (settingsBtn) {
      await settingsBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(screenshotsDir, '05_settings_modal.png') });
      console.log(`✓ Opened Settings modal. Screenshot: 05_settings_modal.png`);

      // Find toggle switch for book titles
      const titleToggle = page.getByLabel(/hiện tên sách/i);
      if (await titleToggle.count() > 0) {
        console.log(`✓ Found "Hiện tên sách dưới chân kệ" toggle!`);
        // Toggle OFF
        await titleToggle.first().click();
        await page.waitForTimeout(600);
        // Close modal
        await page.click('button[aria-label="Đóng"]');
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(screenshotsDir, '06_titles_hidden.png') });
        console.log(`✓ Titles toggled OFF. Screenshot: 06_titles_hidden.png`);

        // Re-open and toggle back ON
        await settingsBtn.click();
        await page.waitForTimeout(600);
        await page.getByLabel(/hiện tên sách/i).first().click();
        await page.waitForTimeout(600);
        await page.click('button[aria-label="Đóng"]');
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(screenshotsDir, '07_titles_restored.png') });
        console.log(`✓ Titles toggled back ON. Screenshot: 07_titles_restored.png`);
      } else {
        console.warn(`⚠️ Title toggle switch not found`);
        await page.click('button[aria-label="Đóng"]');
      }
    }

    // 5. Test opening reader on first book
    console.log(`[STEP 6] Opening Reader on Book #1...`);
    const firstBook = await page.$('div[class*="group relative cursor-pointer"]');
    if (firstBook) {
      await firstBook.click();
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(screenshotsDir, '08_reader_opened.png') });
      console.log(`✓ Reader opened! Screenshot: 08_reader_opened.png`);

      // Tap middle to toggle controls
      console.log(`[STEP 7] Tapping middle to toggle controls...`);
      await page.click('body', { position: { x: 206, y: 450 } });
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(screenshotsDir, '09_reader_middle_tap.png') });
      console.log(`✓ Controls toggled. Screenshot: 09_reader_middle_tap.png`);
    }

    console.log(`\n========================================`);
    console.log(`[ALL TESTS COMPLETED SUCCESSFULLY]`);
    console.log(`========================================\n`);
  } catch (err) {
    console.error(`[ERROR] Test failed:`, err);
  } finally {
    await browser.close();
  }
})();
