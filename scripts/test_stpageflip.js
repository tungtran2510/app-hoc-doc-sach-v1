const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  
  // Go to test page or a custom HTML that runs StPageFlip
  await page.setContent(`
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; background: #12161f; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
    #book { width: 340px; height: 480px; }
  </style>
  <script src="http://localhost:3088/scripts/page-flip.browser.js"></script>
</head>
<body>
  <div id="book"></div>
  <script>
    // We will test here
  </script>
</body>
</html>
  `);

  await browser.close();
})();
