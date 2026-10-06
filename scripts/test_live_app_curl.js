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
  page.on('pageerror', err => console.error('PAGE ERROR:', err));
  page.on('requestfailed', req => console.log('REQUEST FAILED:', req.url(), req.failure()?.errorText));

  console.log('Navigating to http://localhost:3088/thu-nghiem-lat-sach...');
  await page.goto('http://localhost:3088/thu-nghiem-lat-sach', { waitUntil: 'domcontentloaded' });

  console.log('Waiting for canvas to be mounted...');
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForTimeout(1500); // Wait for images to load into StPageFlip

  await page.screenshot({ path: 'live_01_init.png' });
  console.log('Captured live_01_init.png');

  // Find Lật tiếp button
  const nextBtn = page.getByRole('button', { name: 'Lật tiếp' });
  const prevBtn = page.getByRole('button', { name: 'Lật lùi' });

  // 1. Flip forward to page 2 (index 1)
  console.log('Clicking "Lật tiếp"...');
  await nextBtn.click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'live_02_flip_next_mid.png' });
  console.log('Captured live_02_flip_next_mid.png');

  await page.waitForTimeout(600);
  await page.screenshot({ path: 'live_03_page2_ready.png' });
  console.log('Captured live_03_page2_ready.png');

  // 2. Flip backward to page 1 (index 0)
  console.log('Clicking "Lật lùi"...');
  await prevBtn.click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'live_04_flip_prev_mid.png' });
  console.log('Captured live_04_flip_prev_mid.png');

  await page.waitForTimeout(600);
  await page.screenshot({ path: 'live_05_back_to_page1.png' });
  console.log('Captured live_05_back_to_page1.png');

  // 3. Test Touch / Mouse Corner Drag Prev
  console.log('Flipping forward again to page 2 to test touch corner drag...');
  await nextBtn.click();
  await page.waitForTimeout(800);

  // Locate the canvas / book container
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();

  if (box) {
    console.log(`Canvas found at x=${box.x}, y=${box.y}, w=${box.width}, h=${box.height}`);
    // Bottom-left corner drag (peeling back page 0 from left to right)
    const startX = box.x + 15;
    const startY = box.y + box.height - 20;
    const midX = box.x + box.width * 0.45;
    const midY = box.y + box.height * 0.65;

    console.log('Dragging bottom-left corner to peel backward...');
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.move(midX, midY, { steps: 20 });
    await page.waitForTimeout(250);

    await page.screenshot({ path: 'live_06_drag_prev_peel.png' });
    console.log('Captured live_06_drag_prev_peel.png');

    // Complete drag across to turn page back
    await page.mouse.move(box.x + box.width + 40, midY, { steps: 15 });
    await page.mouse.up();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'live_07_after_drag_prev.png' });
    console.log('Captured live_07_after_drag_prev.png');
  }

  await browser.close();
  console.log('All tests completed successfully!');
})();
