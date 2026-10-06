const { chromium } = require('playwright');
const path = require('path');

async function testDesktop() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });

  await context.addInitScript(() => {
    try {
      localStorage.setItem('app_user_display_name', 'Học viên');
      sessionStorage.setItem('app_user_name_prompted', 'true');
      sessionStorage.setItem('pwa_banner_dismissed', 'true');
      localStorage.setItem('pwa_banner_dismissed', 'true');
    } catch (e) {}
  });

  const page = await context.newPage();
  await page.goto('http://localhost:3088/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  const bookshelfHeader = page.locator('text=GIAN TRƯNG BÀY SÁCH Y KHOA').first();
  await bookshelfHeader.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(__dirname, '../public/verify_bookshelf_desktop.png'),
  });
  console.log('Saved public/verify_bookshelf_desktop.png');

  await browser.close();
}

testDesktop().catch((err) => {
  console.error('Error in testDesktop:', err);
  process.exit(1);
});
