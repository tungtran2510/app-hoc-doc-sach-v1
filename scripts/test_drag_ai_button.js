const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
  });
  const page = await context.newPage();

  console.log('--- 1. Testing AI Button 2.5s Hold & Drag ---');
  await page.goto('http://localhost:3088?skip_intro=1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Find the AI button
  const aiBtn = await page.locator('button[aria-label="Hỏi AI"]');
  const initialBox = await aiBtn.boundingBox();
  console.log('Initial AI button position:', initialBox);

  // Press down on AI button
  await page.mouse.move(initialBox.x + initialBox.width / 2, initialBox.y + initialBox.height / 2);
  await page.mouse.down();
  console.log('Mouse down... holding for 2.6s');
  
  // Wait 1.2s to capture the countdown pill badge
  await page.waitForTimeout(1200);
  const pillBadgeText = await page.evaluate(() => {
    const badge = document.querySelector('button[aria-label="Hỏi AI"] span.absolute');
    return badge ? badge.innerText : null;
  });
  console.log('Holding countdown badge:', pillBadgeText);
  await page.screenshot({ path: path.join(__dirname, '../public/test_09_ai_holding_badge.png') });

  // Wait remaining 1.5s to cross 2.5s threshold
  await page.waitForTimeout(1500);

  // Move pointer down by 250px and left by 100px
  const targetX = initialBox.x - 100;
  const targetY = initialBox.y + 250;
  await page.mouse.move(targetX, targetY, { steps: 10 });
  await page.waitForTimeout(300);

  // Release mouse
  await page.mouse.up();
  await page.waitForTimeout(500);

  // Check new position
  const newBox = await aiBtn.boundingBox();
  console.log('New AI button position after drag:', newBox);

  const savedPos = await page.evaluate(() => {
    return localStorage.getItem('floating_ai_btn_pos');
  });
  console.log('Saved position in localStorage:', savedPos);
  await page.screenshot({ path: path.join(__dirname, '../public/test_10_ai_button_dragged.png') });

  // Re-capture clean reader screen with pure icons and clean modal
  console.log('--- 2. Re-capturing Clean Reader Screens ---');
  await page.evaluate(() => {
    const el = document.querySelector('.group.cursor-pointer[title]');
    if (el) el.click();
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(__dirname, '../public/test_11_clean_reader_icons.png') });

  // Trigger exit confirm modal
  await page.evaluate(() => {
    const backBtn = document.querySelector('header button[aria-label="Đóng"]');
    if (backBtn) backBtn.click();
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(__dirname, '../public/test_12_clean_exit_confirm.png') });

  await browser.close();
  console.log('AI button drag & reader verification finished!');
})();
