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
      flippingTime: 600,
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

    pf.on('init', () => {
      console.log('Book ready. Rect:', JSON.stringify(pf.getRender().getRect()));
    });
    pf.on('flip', (e) => {
      console.log('Flip event:', e.data);
    });
  </script>
</body>
</html>
  `);

  await page.waitForTimeout(1000);

  // Flip next to Page 1
  console.log('1. Flip next to Page 1');
  await page.evaluate(() => window.pf.flipNext('bottom'));
  await page.waitForTimeout(800);

  // Flip next to Page 2
  console.log('2. Flip next to Page 2');
  await page.evaluate(() => window.pf.flipNext('bottom'));
  await page.waitForTimeout(800);

  // Test custom flipPrev call with rect.left + 10
  console.log('3. Test custom flipPrev with rect.left + 10');
  await page.evaluate(() => {
    const rect = window.pf.getRender().getRect();
    console.log('Current rect:', JSON.stringify(rect));
    window.pf.flipController.flip({ x: rect.left + 10, y: rect.height - 2 });
  });

  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test_custom_flipPrev_mid.png' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test_custom_flipPrev_done.png' });

  await browser.close();
  console.log('Done custom test.');
})();
