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
  await page.waitForSelector('canvas');
  await page.waitForTimeout(500);

  // Apply the 2 key patches in browser context to evaluate:
  await page.evaluate(() => {
    const pf = window.pf;
    const render = pf.getRender();
    const pageCollection = pf.getPageCollection();

    // 1. Vá getBottomPage: trang dưới khi lật lùi phải là trang e (trang hiện tại)
    const origGetBottomPage = pageCollection.getBottomPage.bind(pageCollection);
    pageCollection.getBottomPage = function (direction) {
      if ('portrait' === this.render.getOrientation()) {
        const e = this.currentSpreadIndex;
        return 0 === direction ? this.pages[e + 1] : this.pages[e];
      }
      return origGetBottomPage(direction);
    };

    // 2. Vá drawFrame: dùng save/restore và clip chính xác khung trang đơn (pageWidth)
    render.drawFrame = function () {
      this.ctx.save();
      this.clear();

      if ('portrait' === this.orientation) {
        const t = this.getRect();
        this.ctx.beginPath();
        this.ctx.rect(t.left + t.pageWidth, t.top, t.pageWidth, t.height);
        this.ctx.clip();
      }

      if ('portrait' !== this.orientation && null != this.leftPage) {
        this.leftPage.simpleDraw(0);
      }
      if (null != this.rightPage) {
        this.rightPage.simpleDraw(1);
      }
      if (null != this.bottomPage && this.bottomPage !== this.flippingPage) {
        this.bottomPage.draw();
      }
      if ('portrait' !== this.orientation) {
        this.drawBookShadow();
      }
      if (null != this.flippingPage) {
        this.flippingPage.draw();
      }
      if (null != this.shadow) {
        this.drawOuterShadow();
        this.drawInnerShadow();
      }

      this.ctx.restore();
    };
  });

  // Turn to page 1
  console.log('Flipping next to page 1...');
  await page.evaluate(() => window.pf.flipNext('bottom'));
  await page.waitForTimeout(800);

  // Capture frames of flipPrev
  console.log('Capturing flipPrev frames with fix...');
  await page.evaluate(() => window.pf.flipPrev('bottom'));
  for (let i = 0; i <= 8; i++) {
    await page.waitForTimeout(60);
    await page.screenshot({ path: `fix_prev_${i.toString().padStart(2, '0')}.png` });
  }

  await browser.close();
  console.log('Done capturing fix_prev frames.');
})();
