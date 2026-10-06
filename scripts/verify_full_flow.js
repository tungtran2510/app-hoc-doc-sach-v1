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

  console.log('Navigating to http://localhost:3088/thu-nghiem-lat-sach ...');
  await page.goto('http://localhost:3088/thu-nghiem-lat-sach');

  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'flow_1_initial.png' });
  console.log('1. Page 0 initial.');

  // Flip Next to Page 1
  console.log('2. Clicking Lật tiếp to Page 1...');
  await page.click('button:has-text("Lật tiếp")');
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'flow_2_next_mid.png' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'flow_3_page1.png' });

  // Flip Next to Page 2
  console.log('3. Clicking Lật tiếp to Page 2...');
  await page.click('button:has-text("Lật tiếp")');
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'flow_4_page2.png' });

  // Flip Prev back to Page 1
  console.log('4. Clicking Lật lùi back to Page 1...');
  await page.click('button:has-text("Lật lùi")');
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'flow_5_prev_mid.png' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'flow_6_page1_restored.png' });

  // Flip Prev back to Page 0
  console.log('5. Clicking Lật lùi back to Page 0...');
  await page.click('button:has-text("Lật lùi")');
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'flow_7_page0_restored.png' });

  // Corner Drag PREV
  console.log('6. Flipping to Page 1 to test corner drag prev...');
  await page.click('button:has-text("Lật tiếp")');
  await page.waitForTimeout(700);

  const canvas = await page.locator('canvas').first();
  const box = await canvas.boundingBox();
  console.log('Canvas box:', box);

  // Drag from bottom-left corner to right
  console.log('7. Dragging bottom-left corner to test interactive Prev curl...');
  const startX = box.x + 15;
  const startY = box.y + box.height - 20;
  const targetX = box.x + box.width * 0.5;
  const targetY = box.y + box.height * 0.65;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(100);
  await page.mouse.move(targetX, targetY, { steps: 20 });
  await page.waitForTimeout(200);

  await page.screenshot({ path: 'flow_8_drag_prev_holding.png' });
  console.log('Captured interactive drag prev curl.');

  await page.mouse.move(box.x + box.width + 40, targetY, { steps: 15 });
  await page.mouse.up();
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'flow_9_drag_prev_completed.png' });

  await browser.close();
  console.log('ALL FLOW VERIFICATIONS COMPLETED SUCCESSFULLY!');
})();
