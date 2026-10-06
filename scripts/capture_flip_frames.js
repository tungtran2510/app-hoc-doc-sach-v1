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
  await page.waitForTimeout(1000);
  
  // Click Lật tiếp
  await page.click('button:has-text("Lật tiếp")');
  await page.waitForTimeout(100);
  await page.screenshot({ path: 'mid_flip_click.png' });
  
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'after_flip_click.png' });

  // Now click Lật lùi
  await page.click('button:has-text("Lật lùi")');
  await page.waitForTimeout(100);
  await page.screenshot({ path: 'mid_flip_prev.png' });

  await page.waitForTimeout(400);
  await page.screenshot({ path: 'after_flip_prev.png' });

  await browser.close();
  console.log('Done capturing flip frames');
})();
