const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  const pageFlipJs = fs.readFileSync(path.join(__dirname, '../node_modules/page-flip/dist/js/page-flip.browser.js'), 'utf8');

  await page.setContent(`
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #12161f; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; overflow: hidden; }
    #container { width: 340px; height: 480px; position: relative; }
  </style>
</head>
<body>
  <div id="container"></div>
  <script>
    ${pageFlipJs}
  </script>
  <script>
    const el = document.getElementById('container');
    const pf = new St.PageFlip(el, {
      width: 340,
      height: 480,
      size: 'fixed',
      drawShadow: true,
      flippingTime: 650,
      usePortrait: true,
      startPage: 0,
      showCover: false,
      mobileScrollSupport: false,
      useMouseEvents: true,
      showPageCorners: true,
      maxShadowOpacity: 0.8
    });
    
    const images = [
      'http://localhost:3088/documents/covers/cover_hieu_dung_ve_cot_song.png',
      'http://localhost:3088/documents/covers/cover_atlas_y_khoa_toan_dien.png',
      'http://localhost:3088/documents/covers/cover_cot-song.png'
    ];
    pf.loadFromImages(images);
    window.pf = pf;

    const render = pf.getRender();
    const origConvertToGlobal = render.convertToGlobal.bind(render);
    
    // 1. Vá lỗi convertToGlobal trong portrait mode
    render.convertToGlobal = function(t, e) {
      if (e == null) e = this.direction;
      if (t == null) return null;
      const rect = this.getRect();
      if ("portrait" === this.orientation) {
        if (1 === e) {
          return {
            x: rect.pageWidth - t.x,
            y: t.y + rect.top
          };
        } else {
          return {
            x: t.x,
            y: t.y + rect.top
          };
        }
      }
      return origConvertToGlobal(t, e);
    };

    // 2. Vá lỗi drawFrame không bị clip mất nửa bên trái
    render.drawFrame = function() {
      this.clear();
      if ("portrait" !== this.orientation && null != this.leftPage) {
        this.leftPage.simpleDraw(0);
      }
      if (null != this.rightPage) {
        this.rightPage.simpleDraw(1);
      }
      if (null != this.bottomPage) {
        this.bottomPage.draw();
      }
      this.drawBookShadow();
      if (null != this.flippingPage) {
        this.flippingPage.draw();
      }
      if (null != this.shadow) {
        this.drawOuterShadow();
        this.drawInnerShadow();
      }
    };

    // 3. Vá lỗi clear nền trong suốt
    render.clear = function() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    };

    pf.on('init', () => console.log('Patched PageFlip ready!'));
    pf.on('flip', (e) => console.log('Flipped to page:', e.data));
  </script>
</body>
</html>
  `);

  await page.waitForTimeout(1000);

  // 1. Flip next to Page 1
  console.log('1. Flip next to Page 1...');
  await page.evaluate(() => window.pf.flipNext('bottom'));
  await page.waitForTimeout(700);

  // 2. Flip prev back to Page 0
  console.log('2. Flip prev back to Page 0...');
  await page.evaluate(() => window.pf.flipPrev('bottom'));
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'patched_prev_to_page0_mid.png' });

  await page.waitForTimeout(500);
  await page.screenshot({ path: 'patched_prev_to_page0_done.png' });

  await browser.close();
  console.log('Test completed!');
})();
