const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3088/thu-nghiem-lat-sach');
  await page.waitForSelector('canvas', { timeout: 10000 });
  
  const elInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const parent = canvas ? canvas.parentElement : null;
    const grandparent = parent ? parent.parentElement : null;
    return {
      canvas: {
        w: canvas.width,
        h: canvas.height,
        styleW: canvas.style.width,
        styleH: canvas.style.height,
        bg: window.getComputedStyle(canvas).backgroundColor,
      },
      parent: parent ? {
        className: parent.className,
        w: parent.clientWidth,
        h: parent.clientHeight,
        bg: window.getComputedStyle(parent).backgroundColor,
      } : null,
      grandparent: grandparent ? {
        className: grandparent.className,
        w: grandparent.clientWidth,
        h: grandparent.clientHeight,
        bg: window.getComputedStyle(grandparent).backgroundColor,
      } : null
    };
  });

  console.log('Element Info:', JSON.stringify(elInfo, null, 2));
  await browser.close();
})();
