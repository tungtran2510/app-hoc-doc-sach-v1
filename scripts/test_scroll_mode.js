const { chromium } = require('playwright');

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

  const bookEl = await page.$('div[title="Hiểu Đúng Về Cột Sống"]');
  if (bookEl) {
    await bookEl.click({ force: true });
    await page.waitForTimeout(500);
    const readBtn = await page.$('button:has-text("Đọc sách")');
    if (readBtn) {
      await readBtn.click({ force: true });
      await page.waitForTimeout(1200);

      // Click "Cuộn dọc"
      const scrollBtn = await page.$('button:has-text("Cuộn dọc")');
      console.log('Found scrollBtn:', Boolean(scrollBtn));
      if (scrollBtn) {
        await scrollBtn.click({ force: true });
        await page.waitForTimeout(1000);
      }

      await page.screenshot({ path: 'public/screenshots/debug_scroll_mode.png' });
      console.log('Captured debug_scroll_mode.png');

      // Inspect images dimensions
      const imgInfo = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('main img'));
        return imgs.map((img) => ({
          src: img.src,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          clientWidth: img.clientWidth,
          clientHeight: img.clientHeight,
          parentClientHeight: img.parentElement ? img.parentElement.clientHeight : null,
          parentComputedStyle: img.parentElement ? window.getComputedStyle(img.parentElement).height : null,
        }));
      });
      console.log('Images info in scroll mode:', JSON.stringify(imgInfo, null, 2));
    }
  }

  await browser.close();
})();
