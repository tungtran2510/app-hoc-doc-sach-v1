const { chromium } = require('playwright');
const path = require('path');

async function verifyWoodTheme() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // Mobile phone
    deviceScaleFactor: 2,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  // Pre-seed storage
  await context.addInitScript(() => {
    try {
      localStorage.setItem('app_user_display_name', 'Học viên');
      sessionStorage.setItem('app_user_name_prompted', 'true');
      sessionStorage.setItem('pwa_banner_dismissed', 'true');
      localStorage.setItem('pwa_banner_dismissed', 'true');
      document.documentElement.classList.add('dark');
    } catch (e) {}
  });

  const page = await context.newPage();

  console.log('Navigating to http://localhost:3088/ ...');
  await page.goto('http://localhost:3088/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  // 1. Screenshot top of home page (Header, Brand card, top of bookshelf)
  await page.screenshot({
    path: path.join(__dirname, '../public/verify_home_top_wood.png'),
  });
  console.log('Saved public/verify_home_top_wood.png');

  // 2. Scroll to wooden bookshelf and capture it fully
  const shelf = page.locator('text=SideBooks 3D').first();
  await shelf.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(__dirname, '../public/verify_bookshelf_wood.png'),
  });
  console.log('Saved public/verify_bookshelf_wood.png');

  // 3. Verify book 8 image loaded
  const book8 = page.locator('img[src*="cover_loi_khuan_duong_ruot.png"]').first();
  const book8Count = await book8.count();
  console.log('Book 8 cover image count found on page:', book8Count);

  // 4. Scroll down to bottom to check Flat Books / Author / BottomNav
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(__dirname, '../public/verify_home_bottom_wood.png'),
  });
  console.log('Saved public/verify_home_bottom_wood.png');

  // 5. Also capture Desktop view (1280x900)
  const pageDesk = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  await pageDesk.goto('http://localhost:3088/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await pageDesk.waitForTimeout(2000);
  await pageDesk.screenshot({
    path: path.join(__dirname, '../public/verify_desktop_wood.png'),
  });
  console.log('Saved public/verify_desktop_wood.png');

  await browser.close();
  console.log('All verification screenshots captured successfully!');
}

verifyWoodTheme().catch((err) => {
  console.error('Error in verifyWoodTheme:', err);
  process.exit(1);
});
