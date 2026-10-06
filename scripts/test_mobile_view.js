const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testPageFlip() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 12/13/14
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });

  const page = await context.newPage();
  
  // HTML page testing StPageFlip
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; background: #111; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
    #book-container { width: 360px; height: 520px; }
  </style>
  <script src="/node_modules/page-flip/dist/js/page-flip.browser.js"></script>
</head>
<body>
  <div id="book-container"></div>
  <script>
    window.addEventListener('load', () => {
      const PageFlip = window.St.PageFlip;
      const el = document.getElementById('book-container');
      const pf = new PageFlip(el, {
        width: 360,
        height: 520,
        size: 'fixed',
        drawShadow: true,
        flippingTime: 500,
        usePortrait: true,
        startPage: 0,
        showCover: false,
        useMouseEvents: true,
        showPageCorners: true,
        maxShadowOpacity: 0.8
      });
      
      const images = [
        '/documents/covers/cover_hieu_dung_ve_cot_song.png',
        '/documents/covers/cover_atlas_y_khoa_toan_dien.png',
        '/documents/covers/cover_cot-song.png'
      ];
      pf.loadFromImages(images);
      window.pageFlipInstance = pf;
    });
  </script>
</body>
</html>
  `;

  // Serve or visit through localhost:3088
  await page.goto('http://localhost:3088/thu-nghiem-lat-sach');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'current_mobile_view.png' });
  console.log('Took current_mobile_view.png');

  await browser.close();
}

testPageFlip().catch(console.error);
