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
    pf.on('flip', (e) => console.log('FLIP SUCCESS, PAGE IS NOW:', e.data));
  </script>
</body>
</html>
  `);

  await page.waitForTimeout(1000);

  const box = await page.locator('#container').boundingBox();

  // Test touch flick / swipe
  console.log('Testing touch swipe from right to left...');
  await page.touchscreen.tap(box.x + box.width - 20, box.y + box.height - 20);
  await page.waitForTimeout(200);

  // Dispatch touch events manually or via mouse (page-flip listens to mouse and touch)
  // Let's test pf.flipNext('bottom')
  await page.evaluate(() => window.pf.flipNext('bottom'));
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'stpf_touch_flip_mid.png' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'stpf_touch_flip_done.png' });

  // Now test pf.flipPrev('bottom')
  await page.evaluate(() => window.pf.flipPrev('bottom'));
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'stpf_touch_prev_mid.png' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'stpf_touch_prev_done.png' });

  await browser.close();
  console.log('Touch test completed.');
})();
