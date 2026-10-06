const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  const screenshotsDir = path.join(__dirname, '..', 'public', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  console.log('1. Navigating to bookshelf home...');
  await page.goto('http://localhost:3088/?skip_intro=1', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1200);

  // Screenshot 1: Home Bookshelf
  await page.screenshot({ path: path.join(screenshotsDir, '01_minimalist_bookshelf.png') });
  console.log('Captured 01_minimalist_bookshelf.png');

  // Check layout overflow
  const overflows = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const bodyWidth = document.body.scrollWidth;
    return bodyWidth > docWidth;
  });
  console.log('Horizontal page overflow detected?', overflows);

  // Check 56px bottom nav
  const bottomNavHeight = await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Điều hướng chính"] > div');
    return nav ? nav.clientHeight : null;
  });
  console.log('Bottom navigation height:', bottomNavHeight, 'px (expected: 56px)');

  // Screenshot 2: Open Deep Settings Modal
  console.log('2. Opening deep settings modal...');
  const settingsBtn = await page.$('button[aria-label="Cài đặt"]');
  if (settingsBtn) {
    await settingsBtn.click({ force: true });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, '02_deep_settings_modal.png') });
    console.log('Captured 02_deep_settings_modal.png');

    // Close settings modal
    const closeSettings = await page.$('button[aria-label="Đóng"]');
    if (closeSettings) {
      await closeSettings.click({ force: true });
      await page.waitForTimeout(400);
    }
  }

  // Screenshot 3: Open Floating AI Assistant
  console.log('3. Opening Floating AI Assistant...');
  const aiBtn = await page.$('button[aria-label="Hỏi AI"]');
  if (aiBtn) {
    await aiBtn.click({ force: true });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, '03_floating_ai_modal.png') });
    console.log('Captured 03_floating_ai_modal.png');

    // Close AI modal
    const closeAi = await page.$('button[aria-label="Đóng"]');
    if (closeAi) {
      await closeAi.click({ force: true });
      await page.waitForTimeout(400);
    }
  }

  // Screenshot 4: Open Book Reader Modal directly
  console.log('4. Opening Book Reader...');
  const bookEl = await page.$('div[title="Hiểu Đúng Về Cột Sống"]');
  if (bookEl) {
    await bookEl.click({ force: true });
    await page.waitForTimeout(500);
    const readBtn = await page.$('button:has-text("Đọc sách")');
    if (readBtn) {
      await readBtn.click({ force: true });
    }
  }

  // Wait for SideBooksReaderModal to appear
  await page.waitForSelector('div[role="dialog"]', { timeout: 8000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotsDir, '04_reader_hud.png') });
  console.log('Captured 04_reader_hud.png');

  // Screenshot 5: Switch to Trượt 3D
  console.log('5. Switching to Trượt 3D mode...');
  const rollModeBtn = await page.$('button:has-text("Trượt 3D")');
  if (rollModeBtn) {
    await rollModeBtn.click({ force: true });
    await page.waitForTimeout(500);
  }

  // Toggle bookmark on page
  const bookmarkBtn = await page.$('button[title*="đánh dấu"]');
  if (bookmarkBtn) {
    await bookmarkBtn.click({ force: true });
    await page.waitForTimeout(400);
  }

  await page.screenshot({ path: path.join(screenshotsDir, '05_reader_mode_roll.png') });
  console.log('Captured 05_reader_mode_roll.png');

  // Screenshot 6: Center click to hide HUD (distraction-free reading)
  console.log('6. Clicking canvas center to hide HUD...');
  const mainCanvas = await page.$('canvas');
  if (mainCanvas) {
    const box = await mainCanvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      await mainCanvas.click({ force: true });
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsDir, '06_reader_clean_canvas.png') });
    console.log('Captured 06_reader_clean_canvas.png');
  }

  await browser.close();
  console.log('All automated browser tests completed successfully!');
}

run().catch((err) => {
  console.error('Error running test script:', err);
  process.exit(1);
});
