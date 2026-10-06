const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3088/?skip_intro=1...');
  await page.goto('http://localhost:3088/?skip_intro=1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  // Directly click first book on the shelf
  const bookEl = await page.$('div[title="Hiểu Đúng Về Cột Sống"]');
  if (bookEl) {
    await bookEl.click({ force: true });
    await page.waitForTimeout(500);
    const readBtn = await page.$('button:has-text("Đọc sách")');
    if (readBtn) {
      await readBtn.click({ force: true });
      await page.waitForTimeout(1200);
      
      // 1. Capture Reader with standard HUD
      await page.screenshot({ path: 'public/screenshots/04_reader_hud.png' });
      console.log('Captured public/screenshots/04_reader_hud.png');

      // 2. Switch to Trượt 3D mode
      const rollBtn = await page.$('button:has-text("Trượt 3D")');
      if (rollBtn) {
        await rollBtn.click({ force: true });
        await page.waitForTimeout(500);
      }

      // 3. Click bookmark button
      const bookmarkBtn = await page.$('header button[title*="đánh dấu"]');
      if (bookmarkBtn) {
        await bookmarkBtn.click({ force: true });
        await page.waitForTimeout(300);
      }

      // 4. Flip to next page
      const nextBtn = await page.$('footer button[aria-label="Trang sau"]');
      if (nextBtn) {
        await nextBtn.click({ force: true });
        await page.waitForTimeout(800);
      }

      await page.screenshot({ path: 'public/screenshots/05_reader_mode_roll_page2.png' });
      console.log('Captured public/screenshots/05_reader_mode_roll_page2.png');

      // 5. Click canvas center to hide all HUDs (completely distraction-free reading)
      const canvasEl = await page.$('canvas');
      if (canvasEl) {
        const box = await canvasEl.boundingBox();
        if (box) {
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          await page.waitForTimeout(500);
          await page.screenshot({ path: 'public/screenshots/06_reader_clean_canvas.png' });
          console.log('Captured public/screenshots/06_reader_clean_canvas.png');
        }
      }
    }
  }

  await browser.close();
  console.log('Done!');
})();
