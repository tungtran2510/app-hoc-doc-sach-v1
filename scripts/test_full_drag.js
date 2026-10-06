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
      flippingTime: 500,
      usePortrait: true,
      startPage: 0,
      showCover: false,
      mobileScrollSupport: false,
      useMouseEvents: true,
      showPageCorners: true,
      swipeDistance: 20,
      maxShadowOpacity: 0.8
    });
    
    const images = [
      'http://localhost:3088/documents/covers/cover_hieu_dung_ve_cot_song.png',
      'http://localhost:3088/documents/covers/cover_atlas_y_khoa_toan_dien.png',
      'http://localhost:3088/documents/covers/cover_cot-song.png'
    ];
    pf.loadFromImages(images);
    window.pf = pf;
    pf.on('flip', (e) => console.log('FLIP EVENT FIRED:', e.data));
  </script>
</body>
</html>
  `);

  page.on('console', msg => console.log('PAGE:', msg.text()));

  await page.waitForTimeout(1000);

  const box = await page.locator('#container').boundingBox();
  
  // Drag all the way to left edge
  const startX = box.x + box.width - 10;
  const startY = box.y + box.height - 20;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(50);
  await page.mouse.move(box.x - 20, startY - 50, { steps: 25 });
  await page.waitForTimeout(100);
  await page.mouse.up();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'stpf_after_full_drag.png' });

  // Now drag from left corner to turn BACK (prev)
  const prevStartX = box.x + 10;
  const prevStartY = box.y + box.height - 20;
  await page.mouse.move(prevStartX, prevStartY);
  await page.mouse.down();
  await page.waitForTimeout(50);
  await page.mouse.move(box.x + box.width * 0.5, prevStartY - 50, { steps: 20 });
  await page.waitForTimeout(100);
  await page.screenshot({ path: 'stpf_prev_dragging_mid.png' });

  await page.mouse.move(box.x + box.width + 20, prevStartY - 50, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'stpf_after_prev_drag.png' });

  await browser.close();
  console.log('Finished full drag test.');
})();
