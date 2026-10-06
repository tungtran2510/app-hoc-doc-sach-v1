const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:3088/thu-nghiem-lat-sach');
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(1000);

  console.log('1. Page 0 loaded. Flipping to Page 1...');
  await page.click('button:has-text("Lật tiếp")');
  await page.waitForTimeout(800);

  console.log('2. Now on Page 1. Flipping to Page 2...');
  await page.click('button:has-text("Lật tiếp")');
  await page.waitForTimeout(800);

  console.log('3. Now on Page 2. Clicking LẬT LÙI...');
  await page.click('button:has-text("Lật lùi")');

  // Capture multiple frames during Lật lùi
  const frames = [50, 150, 250, 350, 450, 600, 800];
  for (let i = 0; i < frames.length; i++) {
    const delay = i === 0 ? frames[0] : frames[i] - frames[i - 1];
    await page.waitForTimeout(delay);
    await page.screenshot({ path: `prev_frame_${frames[i]}ms.png` });
    console.log(`Captured prev_frame_${frames[i]}ms.png`);
  }

  await browser.close();
  console.log('Done capturing flip prev frames.');
})();
