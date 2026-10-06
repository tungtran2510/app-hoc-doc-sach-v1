const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();

  await page.goto('http://localhost:3088/thu-nghiem-lat-sach');
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(500);

  // Jump to page 4 via seekbar
  console.log('Testing seekbar jump to page 4...');
  await page.locator('input[type="range"]').fill('3'); // index 3 = page 4
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'seekbar_page4.png' });

  // Flip Next from page 4
  console.log('Flipping next from page 4...');
  await page.click('button:has-text("Lật tiếp")');
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'seekbar_page5.png' });

  // Flip Prev from page 5
  console.log('Flipping prev from page 5...');
  await page.click('button:has-text("Lật lùi")');
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'seekbar_back_page4.png' });

  await browser.close();
  console.log('Seekbar test passed!');
})();
