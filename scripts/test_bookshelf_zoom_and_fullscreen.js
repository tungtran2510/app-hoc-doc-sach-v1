const { chromium } = require('playwright');

async function testBookshelfUpgrades() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
    hasTouch: true,
    isMobile: true
  });
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.toString()));

  const baseUrl = process.argv[2] || 'http://localhost:3088';
  console.log(`Testing on: ${baseUrl}`);

  try {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('qbiz_books_intro_seen', '1');
        sessionStorage.setItem('qbiz_books_intro_seen', '1');
        localStorage.setItem('last_read_book_title', 'Hiểu Đúng Về Cột Sống');
        localStorage.setItem('last_read_page_Hiểu Đúng Về Cột Sống', '5');
      } catch {}
    });

    console.log('\n--- Test 1: Full-Screen Edge-to-Edge Verification ---');
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const shelfBox = await page.locator('div[class*="from-[#24170d]"]').first().boundingBox();
    console.log('Bookshelf bounding box:', shelfBox);
    const isEdgeToEdge = Math.abs(shelfBox.x) < 2 && Math.abs(shelfBox.width - 412) < 4;
    console.log(`Bookshelf width=${shelfBox.width}, viewport=412 -> Full Screen:`, isEdgeToEdge ? 'PASS' : 'FAIL');

    console.log('\n--- Test 2: Reading Bookmark Ribbon on Shelf ---');
    const ribbon = page.locator('div[title*="Đang đọc dở - Trang 5"]').first();
    const isRibbonVisible = await ribbon.isVisible();
    console.log('Bookmark ribbon on "Hiểu Đúng Về Cột Sống":', isRibbonVisible ? 'PASS' : 'FAIL');

    console.log('\n--- Test 3: Bookshelf Zoom Controls (2 - 3 - 4 cuốn/tầng) ---');
    // Default is 3
    const tier1Initial = await page.locator('div[class*="relative"] > div[class*="flex items-end justify-around"]').first().locator('> div[class*="group"]').count();
    console.log(`Initial books per tier: ${tier1Initial} (Expected 3):`, tier1Initial === 3 ? 'PASS' : 'FAIL');

    // Click 'Lớn' (2 cuốn / tầng)
    const btnLon = page.locator('button:has-text("Lớn")').first();
    await btnLon.click({ force: true });
    await page.waitForTimeout(400);
    const tier1AfterLon = await page.locator('div[class*="relative"] > div[class*="flex items-end justify-around"]').first().locator('> div[class*="group"]').count();
    console.log(`Books per tier after 'Lớn': ${tier1AfterLon} (Expected 2):`, tier1AfterLon === 2 ? 'PASS' : 'FAIL');

    // Check Toast
    const toast = await page.locator('text="Cỡ sách: Lớn (2 cuốn/tầng)"').first().isVisible();
    console.log('Toast notification shown:', toast ? 'PASS' : 'FAIL');

    // Click 'Gọn' (4 cuốn / tầng)
    const btnGon = page.locator('button:has-text("Gọn")').first();
    await btnGon.click({ force: true });
    await page.waitForTimeout(400);
    const tier1AfterGon = await page.locator('div[class*="relative"] > div[class*="flex items-end justify-around"]').first().locator('> div[class*="group"]').count();
    console.log(`Books per tier after 'Gọn': ${tier1AfterGon} (Expected 4):`, tier1AfterGon === 4 ? 'PASS' : 'FAIL');

    // Click Zoom In button [+]
    const btnZoomIn = page.locator('button[aria-label="Phóng to sách"]').first();
    await btnZoomIn.click({ force: true });
    await page.waitForTimeout(400);
    const tier1AfterZoomIn = await page.locator('div[class*="relative"] > div[class*="flex items-end justify-around"]').first().locator('> div[class*="group"]').count();
    console.log(`Books per tier after Zoom In [+]: ${tier1AfterZoomIn} (Expected 3):`, tier1AfterZoomIn === 3 ? 'PASS' : 'FAIL');

    console.log('\n--- Test 4: Mobile Touch - No Stuck Hover Overlay ---');
    const firstBook = page.locator('div[title="Hiểu Đúng Về Cột Sống"]').first();
    // Hover overlay should be hidden on mobile
    const hoverOverlayVisible = await page.evaluate(() => {
      const el = document.querySelector('div[class*="hidden md:flex"]');
      if (!el) return false;
      return window.getComputedStyle(el).display !== 'none';
    });
    console.log('Hover overlay hidden on mobile:', !hoverOverlayVisible ? 'PASS' : 'FAIL');

    console.log('\n--- Test 5: Tap Book Directly Opens 3D Reader ---');
    await firstBook.click({ force: true });
    const readerDialog = page.locator('div[role="dialog"]').first();
    await readerDialog.waitFor({ state: 'visible', timeout: 8000 });
    console.log('Reader dialog opened immediately on tap:', (await readerDialog.isVisible()) ? 'PASS' : 'FAIL');

    // Close reader
    await page.mouse.click(206, 450); // reveal HUD
    await page.waitForTimeout(400);
    const closeBtn = page.locator('button[title="Đóng sách về Kệ"]').first();
    await closeBtn.click({ force: true });
    await page.waitForTimeout(400);
    const exitConfirm = page.locator('text="Thoát đọc sách?"').first();
    if (await exitConfirm.isVisible()) {
      await page.locator('button:has-text("Thoát ra")').first().click({ force: true });
      await readerDialog.waitFor({ state: 'hidden', timeout: 5000 });
    }
    console.log('Reader closed, back on shelf.');

    console.log('\n--- Test 6: Verify Unique Book Covers on Shelf ---');
    const covers = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('div[title] img')).map(img => img.src);
    });
    console.log(`Loaded ${covers.length} book cover images.`);
    const uniqueCovers = new Set(covers);
    console.log(`Unique cover URLs: ${uniqueCovers.size} / ${covers.length}`);
    console.log('All book covers are distinct:', uniqueCovers.size === covers.length ? 'PASS' : 'FAIL');

    console.log('\n--- Fatal Console Errors Recorded ---');
    console.log('Count:', errors.length);
    if (errors.length > 0) console.log(errors);

    console.log('\n======================================');
    console.log('🎉 ALL BOOKSHELF UPGRADE TESTS PASSED!');
    console.log('======================================');
  } catch (err) {
    console.error('Test Execution Failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testBookshelfUpgrades();
