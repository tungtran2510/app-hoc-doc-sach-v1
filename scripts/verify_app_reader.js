const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // Mobile viewport
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('Navigating to http://localhost:3088/thu-nghiem-lat-sach ...');
  await page.goto('http://localhost:3088/thu-nghiem-lat-sach');

  // Wait for canvas to be mounted by PageFlip
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'app_test_1_initial.png' });
  console.log('1. Captured initial state.');

  // Click Lật tiếp
  console.log('2. Clicking Lật tiếp...');
  await page.click('button:has-text("Lật tiếp")');
  await page.waitForTimeout(250); // Mid-animation
  await page.screenshot({ path: 'app_test_2_flipping_next_mid.png' });

  await page.waitForTimeout(600); // Complete
  await page.screenshot({ path: 'app_test_3_page2_done.png' });
  console.log('3. Captured flip next completion.');

  // Click Lật lùi
  console.log('4. Clicking Lật lùi...');
  await page.click('button:has-text("Lật lùi")');
  await page.waitForTimeout(250); // Mid-animation
  await page.screenshot({ path: 'app_test_4_flipping_prev_mid.png' });

  await page.waitForTimeout(600); // Complete
  await page.screenshot({ path: 'app_test_5_page1_restored.png' });
  console.log('5. Captured flip prev completion.');

  // Interactive Corner Drag
  console.log('6. Testing interactive corner drag...');
  const canvas = await page.locator('canvas').first();
  const box = await canvas.boundingBox();
  console.log('Canvas box:', box);

  const startX = box.x + box.width - 15;
  const startY = box.y + box.height - 15;
  const targetX = box.x + box.width * 0.4;
  const targetY = box.y + box.height * 0.7;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(100);
  await page.mouse.move(targetX, targetY, { steps: 20 });
  await page.waitForTimeout(200);

  await page.screenshot({ path: 'app_test_6_holding_corner_curl.png' });
  console.log('6. Captured interactive corner curl.');

  await page.mouse.up();
  await page.waitForTimeout(600);

  await browser.close();
  console.log('Verification completed successfully!');
})();
