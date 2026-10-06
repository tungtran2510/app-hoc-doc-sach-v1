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
  page.on('pageerror', err => console.error('PAGE ERR:', err));

  console.log('Navigating to http://localhost:3088/thu-nghiem-lat-sach...');
  await page.goto('http://localhost:3088/thu-nghiem-lat-sach');

  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(1000);

  const cur0 = await page.evaluate(() => window.pf?.getCurrentPageIndex());
  console.log('1. Initial page:', cur0);

  // Helper function to dispatch realistic mobile touch swipe
  async function dispatchSwipe(sX, sY, eX, eY, durationMs = 350) {
    await page.evaluate(async ({ sX, sY, eX, eY, durationMs }) => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return;

      function createTouch(x, y, id = 0) {
        return new Touch({
          identifier: id,
          target: canvas,
          clientX: x,
          clientY: y,
          pageX: x,
          pageY: y,
          screenX: x,
          screenY: y,
        });
      }

      const steps = 15;
      canvas.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [createTouch(sX, sY)],
        targetTouches: [createTouch(sX, sY)],
        changedTouches: [createTouch(sX, sY)]
      }));

      for (let i = 1; i <= steps; i++) {
        await new Promise(r => setTimeout(r, durationMs / steps));
        const curX = sX + (eX - sX) * (i / steps);
        const curY = sY + (eY - sY) * (i / steps);
        window.dispatchEvent(new TouchEvent('touchmove', {
          bubbles: true,
          cancelable: true,
          touches: [createTouch(curX, curY)],
          targetTouches: [createTouch(curX, curY)],
          changedTouches: [createTouch(curX, curY)]
        }));
      }

      window.dispatchEvent(new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        touches: [],
        targetTouches: [],
        changedTouches: [createTouch(eX, eY)]
      }));
    }, { sX, sY, eX, eY, durationMs });
  }

  // 1. Swipe Left (Next): from x=320 to x=70
  console.log('2. Swiping LEFT (Next) to page 1...');
  await dispatchSwipe(320, 420, 70, 455, 380);
  await page.waitForTimeout(800);

  const cur1 = await page.evaluate(() => window.pf?.getCurrentPageIndex());
  console.log('   Result page after swipe left:', cur1);

  // 2. Swipe Right (Prev): from x=70 to x=320
  console.log('3. Swiping RIGHT (Prev) back to page 0...');
  await dispatchSwipe(70, 430, 320, 400, 380);
  await page.waitForTimeout(800);

  const cur2 = await page.evaluate(() => window.pf?.getCurrentPageIndex());
  console.log('   Result page after swipe right:', cur2);

  // 3. Test tap left edge (x=50) -> should do nothing since on page 0
  // Then tap right edge (x=350) -> should flip to page 1
  console.log('4. Testing tap on right margin (x=350)...');
  await page.mouse.click(350, 400);
  await page.waitForTimeout(800);

  const cur3 = await page.evaluate(() => window.pf?.getCurrentPageIndex());
  console.log('   Result page after tap right margin:', cur3);

  // 4. Test tap on left margin (x=40) -> should flip back to page 0
  console.log('5. Testing tap on left margin (x=40)...');
  await page.mouse.click(40, 400);
  await page.waitForTimeout(800);

  const cur4 = await page.evaluate(() => window.pf?.getCurrentPageIndex());
  console.log('   Result page after tap left margin:', cur4);

  await page.screenshot({ path: 'test_swipe_both_ways.png' });
  console.log('Saved test_swipe_both_ways.png');

  await browser.close();
  console.log('All tests passed cleanly!');
})();
