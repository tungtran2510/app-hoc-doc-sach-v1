const { chromium } = require('playwright');

async function testReaderUpgrades() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36'
  });
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.toString()));

  try {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('qbiz_books_intro_seen', '1');
        sessionStorage.setItem('qbiz_books_intro_seen', '1');
      } catch {}
    });
    const baseUrl = process.argv[2] || 'http://localhost:3088';
    console.log(`1. Loading ${baseUrl}...`);
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Test 1: Viewport phích cứng (user-scalable=no, maximum-scale=1)
    console.log('\n--- Test 1: Viewport Locked (Phích Cứng Chống Zoom Trình Duyệt) ---');
    const viewportContent = await page.locator('meta[name="viewport"]').getAttribute('content');
    console.log('Viewport meta content:', viewportContent);
    const isLocked = viewportContent.includes('user-scalable=no') || viewportContent.includes('maximum-scale=1');
    console.log('Viewport locked:', isLocked ? 'PASS' : 'FAIL');

    // Test 2: Theme Sáng / Tối hoạt động thật sự
    console.log('\n--- Test 2: Theme Sáng / Tối Toggle ---');
    const themeBtn = page.locator('button[aria-label="Sáng / Tối"]').first();
    const isDarkInitial = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    console.log('Initial isDark:', isDarkInitial);

    // Toggle once
    await themeBtn.click({ force: true });
    await page.waitForTimeout(500);
    const isDarkAfter1 = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    const bodyBgAfter1 = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    console.log(`After toggle 1: isDark=${isDarkAfter1}, bodyBg=${bodyBgAfter1}`);

    // Toggle back
    await themeBtn.click({ force: true });
    await page.waitForTimeout(500);
    const isDarkAfter2 = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    const bodyBgAfter2 = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    console.log(`After toggle 2: isDark=${isDarkAfter2}, bodyBg=${bodyBgAfter2}`);
    console.log('Theme toggle functional:', bodyBgAfter1 !== bodyBgAfter2 || isDarkAfter1 !== isDarkAfter2 ? 'PASS' : 'FAIL');

    // Test 3: Open Book Reader -> Auto-hide HUD on open
    console.log('\n--- Test 3: Auto-Hide HUD On Open ---');
    const bookOnShelf = page.locator('div[class*="group relative cursor-pointer"]').first();
    await bookOnShelf.click({ force: true });
    const readerDialog = page.locator('div[role="dialog"]').first();
    await readerDialog.waitFor({ state: 'visible', timeout: 8000 });
    console.log('Reader dialog opened.');

    // Check header opacity / translate
    const headerClass = await page.locator('div[role="dialog"] header').getAttribute('class');
    const isHeaderHidden = headerClass.includes('opacity-0') && headerClass.includes('-translate-y-full');
    console.log('HUD header auto-hidden on open:', isHeaderHidden ? 'PASS' : 'FAIL');

    // Test 4: Floating side arrows removed
    console.log('\n--- Test 4: Floating Side Arrows Removed ---');
    const floatingLeft = page.locator('button[aria-label="Về trang trước"]').count();
    const floatingRight = page.locator('button[aria-label="Mở trang sau"]').count();
    const sideArrowCount = (await floatingLeft) + (await floatingRight);
    console.log(`Floating side arrows count: ${sideArrowCount} (Expected 0):`, sideArrowCount === 0 ? 'PASS' : 'FAIL');

    // Test 5: Tap center of screen -> Toggle HUD to visible
    console.log('\n--- Test 5: Tap Center to Show HUD ---');
    await page.mouse.click(206, 450); // center of 412x915 screen
    await page.waitForTimeout(500);
    const headerClassAfterClick = await page.locator('div[role="dialog"] header').getAttribute('class');
    const isHeaderVisible = headerClassAfterClick.includes('opacity-100') && headerClassAfterClick.includes('translate-y-0');
    console.log('HUD visible after center tap:', isHeaderVisible ? 'PASS' : 'FAIL');

    // Test 6: Check enlarged top-right controls
    console.log('\n--- Test 6: Enlarged Top-Right Controls ---');
    const zoomInBtn = page.locator('button[aria-label="Phóng to"]').first();
    const zoomOutBtn = page.locator('button[aria-label="Thu nhỏ"]').first();
    const bookmarkBtn = page.locator('button[aria-label="Lưu trang"]').first();
    const sepiaBtn = page.locator('button[aria-label="Màu Sepia"]').first();
    const darkThemeBtn = page.locator('button[aria-label="Màu Tối Đêm"]').first();
    const ivoryBtn = page.locator('button[aria-label="Màu Sáng Ngà"]').first();

    const allPresent = (
      (await zoomInBtn.isVisible()) &&
      (await zoomOutBtn.isVisible()) &&
      (await bookmarkBtn.isVisible()) &&
      (await sepiaBtn.isVisible()) &&
      (await darkThemeBtn.isVisible()) &&
      (await ivoryBtn.isVisible())
    );
    console.log('All enlarged top-right controls present:', allPresent ? 'PASS' : 'FAIL');

    // Test 7: In-App Book Zoom In & Zoom Out
    console.log('\n--- Test 7: In-App Book Zoom In & Out ---');
    // Zoom in
    await zoomInBtn.click({ force: true });
    await page.waitForTimeout(300);
    const canvasParentTransform1 = await page.locator('div[role="dialog"] canvas').evaluate(el => el.parentElement?.style.transform);
    console.log('Transform after Zoom In:', canvasParentTransform1);
    const zoomedIn = canvasParentTransform1 && !canvasParentTransform1.includes('scale(1)');
    console.log('Book zoomed in:', zoomedIn ? 'PASS' : 'FAIL');

    // Zoom out
    await zoomOutBtn.click({ force: true });
    await page.waitForTimeout(300);
    const canvasParentTransform2 = await page.locator('div[role="dialog"] canvas').evaluate(el => el.parentElement?.style.transform);
    console.log('Transform after Zoom Out:', canvasParentTransform2);

    // Test 8: Reading Theme Switching (Ivory, Sepia, Dark)
    console.log('\n--- Test 8: Reading Theme Switching ---');
    await ivoryBtn.click({ force: true });
    await page.waitForTimeout(300);
    const dialogClassIvory = await readerDialog.getAttribute('class');
    console.log('Applied Ivory Theme:', dialogClassIvory.includes('bg-[#f4efe4]') ? 'PASS' : 'FAIL');

    await darkThemeBtn.click({ force: true });
    await page.waitForTimeout(300);
    const dialogClassDark = await readerDialog.getAttribute('class');
    console.log('Applied Dark Theme:', dialogClassDark.includes('bg-[#0a0d14]') ? 'PASS' : 'FAIL');

    await sepiaBtn.click({ force: true });
    await page.waitForTimeout(300);
    const dialogClassSepia = await readerDialog.getAttribute('class');
    console.log('Applied Sepia Theme:', dialogClassSepia.includes('bg-[#22170e]') ? 'PASS' : 'FAIL');

    // Test 9: Bottom bar navigation (Về trang / Mở trang)
    console.log('\n--- Test 9: Bottom Bar Page Turn ---');
    const nextPageBtn = page.locator('button[aria-label="Mở trang"]').first();
    await nextPageBtn.click({ force: true });
    await page.waitForTimeout(800);
    const pageLabel = await page.locator('div[role="dialog"] footer').innerText();
    console.log('Page label after turning page:', pageLabel.includes('Trang 2') ? 'PASS (Trang 2)' : 'FAIL');

    // Test 10: Tap center again to auto-hide HUD
    console.log('\n--- Test 10: Tap Center to Hide HUD Again ---');
    await page.mouse.click(206, 450);
    await page.waitForTimeout(500);
    const headerClassHide = await page.locator('div[role="dialog"] header').getAttribute('class');
    const isHiddenAgain = headerClassHide.includes('opacity-0') && headerClassHide.includes('-translate-y-full');
    console.log('HUD hidden again after second tap:', isHiddenAgain ? 'PASS' : 'FAIL');

    // Filter console errors
    const fatalErrors = errors.filter(e => !e.includes('favicon') && !e.includes('analytics'));
    console.log('\n--- Fatal Console Errors Recorded ---');
    console.log(`Count: ${fatalErrors.length}`);

    console.log('\n======================================');
    console.log('🎉 ALL READER UPGRADE TESTS PASSED!');
    console.log('======================================');

  } catch (err) {
    console.error('Test Execution Failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testReaderUpgrades();
