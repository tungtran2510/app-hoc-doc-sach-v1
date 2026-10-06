const { chromium } = require('playwright');
const path = require('path');

async function verifyBookPlatformHome() {
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone mobile viewport
    deviceScaleFactor: 2,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  await context.addInitScript(() => {
    try {
      localStorage.setItem('app_user_display_name', 'Độc giả');
      sessionStorage.setItem('app_user_name_prompted', 'true');
      sessionStorage.setItem('pwa_banner_dismissed', 'true');
      localStorage.setItem('pwa_banner_dismissed', 'true');
    } catch (e) {}
  });

  const page = await context.newPage();

  console.log('Navigating to http://localhost:3088/ ...');
  await page.goto('http://localhost:3088/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 1. Verify that 'Hoạt động gần đây' and 'Chuyên Đề Học' are NOT in the DOM/page
  const recentActivityCount = await page.locator('text="Hoạt động gần đây"').count();
  const topicsCount = await page.locator('text="Chuyên Đề Học"').count();
  console.log('Recent activity occurrences:', recentActivityCount);
  console.log('Topics occurrences:', topicsCount);

  if (recentActivityCount > 0 || topicsCount > 0) {
    console.error('FAILED: Found learning courses or recent activity on book platform!');
  } else {
    console.log('PASSED: "Hoạt động gần đây" and "Chuyên Đề Học" are completely removed!');
  }

  // 2. Verify 'GIAN TRƯNG BÀY SÁCH Y KHOA' is visible
  const bookshelfHeader = page.locator('text=GIAN TRƯNG BÀY SÁCH Y KHOA').first();
  const hasBookshelf = await bookshelfHeader.isVisible();
  console.log('Bookshelf header visible:', hasBookshelf);

  // 3. Take screenshot of the top of the mobile home page
  await page.screenshot({
    path: path.join(__dirname, '../public/verify_book_home_top.png'),
  });
  console.log('Saved public/verify_book_home_top.png');

  // 4. Scroll slightly to see full 3D wooden bookshelf
  await bookshelfHeader.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(__dirname, '../public/verify_book_bookshelf.png'),
  });
  console.log('Saved public/verify_book_bookshelf.png');

  // 5. Test clicking a book on the shelf to confirm 3D Conical Curl reader opens
  console.log('Clicking first book on shelf...');
  const firstBook = page.locator('img[alt="Hiểu Đúng Về Cột Sống"]').first();
  if (await firstBook.isVisible()) {
    await firstBook.click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(__dirname, '../public/verify_book_reader_open.png'),
    });
    console.log('Saved public/verify_book_reader_open.png');
  }

  await browser.close();
  console.log('Verification finished successfully!');
}

verifyBookPlatformHome().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
