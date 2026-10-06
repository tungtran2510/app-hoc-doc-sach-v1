const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();

  await page.goto('http://localhost:3088/thu-nghiem-lat-sach');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(1000);

  // Take frame-by-frame of flipNext (from 0 to 1)
  console.log('Capturing flipNext frame by frame...');
  await page.evaluate(() => window.pf.flipNext('bottom'));
  for (let i = 0; i <= 10; i++) {
    await page.waitForTimeout(50);
    await page.screenshot({ path: `frame_next_${i.toString().padStart(2, '0')}.png` });
  }

  await page.waitForTimeout(600);

  // Take frame-by-frame of flipPrev (from 1 to 0)
  console.log('Capturing flipPrev frame by frame...');
  await page.evaluate(() => window.pf.flipPrev('bottom'));
  for (let i = 0; i <= 10; i++) {
    await page.waitForTimeout(50);
    await page.screenshot({ path: `frame_prev_${i.toString().padStart(2, '0')}.png` });
  }

  await browser.close();
  console.log('All frames captured.');
})();
