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

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  const pageFlipJs = fs.readFileSync(path.join(__dirname, '../node_modules/page-flip/dist/js/page-flip.browser.js'), 'utf8');

  await page.setContent(`
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #1a1a24; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; overflow: hidden; }
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
      flippingTime: 1200,
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
  </script>
</body>
</html>
  `);

  await page.waitForTimeout(1000);

  // Get container bounding box
  const box = await page.locator('#container').boundingBox();
  console.log('Container box:', box);

  // Start touch from bottom right corner of the book
  const startX = box.x + box.width - 15;
  const startY = box.y + box.height - 15;
  const targetX = box.x + box.width * 0.45;
  const targetY = box.y + box.height * 0.65;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(100);

  // Drag towards center-left
  await page.mouse.move(targetX, targetY, { steps: 20 });
  await page.waitForTimeout(200);

  // Screenshot while holding the corner!
  await page.screenshot({ path: 'stpf_holding_corner.png' });

  // Move a bit more left
  await page.mouse.move(box.x + 40, targetY, { steps: 15 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'stpf_dragging_further.png' });

  await page.mouse.up();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'stpf_after_release.png' });

  await browser.close();
  console.log('Drag test finished.');
})();
