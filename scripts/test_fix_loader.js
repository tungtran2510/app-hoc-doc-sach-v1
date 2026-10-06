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
      if ("portrait" !== this.orientation) {
        this.drawBookShadow();
      }
      if (null != this.flippingPage) {
        this.flippingPage.draw();
      }
      if (null != this.shadow) {
        this.drawOuterShadow();
        this.drawInnerShadow();
      }
    };

    render.clear = function() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    };

    pf.on('init', () => {
      console.log('Book ready, patching pages...');
      const pages = pf.getPageCollection().getPages();
      pages.forEach((p) => {
        // Đảm bảo isLoad luôn luôn true nếu image đã tải xong
        p.isLoad = true;
        const origDraw = p.draw.bind(p);
        p.draw = function(t) {
          this.isLoad = true;
          origDraw(t);
        };
        const origSimpleDraw = p.simpleDraw.bind(p);
        p.simpleDraw = function(t) {
          this.isLoad = true;
          origSimpleDraw(t);
        };
      });
      console.log('Pages patched successfully!');
    });
  </script>
</body>
</html>
  `);

  await page.waitForTimeout(1000);

  // Flip to page 1
  console.log('Flipping to page 1...');
  await page.evaluate(() => window.pf.flipNext('bottom'));
  await page.waitForTimeout(800);

  // Drag bottom-left corner to turn back
  const box = await page.locator('#container').boundingBox();
  const startX = box.x + 15;
  const startY = box.y + box.height - 20;
  const targetX = box.x + box.width * 0.5;
  const targetY = box.y + box.height * 0.65;

  console.log('Dragging bottom-left corner...');
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(100);
  await page.mouse.move(targetX, targetY, { steps: 20 });
  await page.waitForTimeout(200);

  await page.screenshot({ path: 'fixed_drag_prev_holding.png' });
  console.log('Captured fixed_drag_prev_holding.png');

  await page.mouse.move(box.x + box.width + 30, targetY, { steps: 15 });
  await page.mouse.up();
  await page.waitForTimeout(700);

  // Test button Lật lùi from page 1 to page 0
  console.log('Testing button flipPrev mid-turn...');
  await page.evaluate(() => window.pf.flipNext('bottom'));
  await page.waitForTimeout(800);

  await page.evaluate(() => window.pf.flipPrev('bottom'));
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'fixed_btn_prev_mid.png' });
  await page.waitForTimeout(500);

  await browser.close();
  console.log('Test completed.');
})();
