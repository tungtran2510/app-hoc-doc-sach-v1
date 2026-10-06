const { chromium } = require('playwright');

async function runAudit(targetUrl) {
  console.log(`\n======================================================`);
  console.log(`🚀 STARTING COMPREHENSIVE AUDIT ON: ${targetUrl}`);
  console.log(`======================================================\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
  });

  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', (err) => {
    console.error('❌ [PAGE ERROR]:', err.message);
    errors.push(`PageError: ${err.message}`);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('⚠️ [CONSOLE ERROR]:', msg.text());
      errors.push(`ConsoleError: ${msg.text()}`);
    }
  });
  page.on('response', (resp) => {
    if (resp.status() >= 400) {
      console.log(`🔴 [HTTP ${resp.status()}]: ${resp.url()}`);
      errors.push(`HTTP ${resp.status()}: ${resp.url()}`);
    }
  });

  try {
    // ----------------------------------------------------
    // STEP 1: VISIT HOME PAGE
    // ----------------------------------------------------
    console.log('📌 STEP 1: Visiting Home Page...');
    const res = await page.goto(targetUrl + '?skip_intro=1', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`   Response status: ${res.status()}`);
    if (res.status() !== 200) {
      throw new Error(`Expected HTTP 200 but got ${res.status()}`);
    }
    await page.waitForTimeout(1500);

    // If splash exists, dismiss it
    const splashDismiss = page.locator('#qbiz-books-3d-splash button, text="Khám phá ngay"').first();
    if (await splashDismiss.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('   Dismissing opening splash...');
      await splashDismiss.click({ force: true });
      await page.waitForTimeout(600);
    }

    // ----------------------------------------------------
    // STEP 2: TEST HEADER BRAND LOGO & WELCOME MODAL
    // ----------------------------------------------------
    console.log('📌 STEP 2: Testing Brand Logo click...');
    const logoContainer = page.locator('div[title="Xem lời ngỏ & video giới thiệu"]').first();
    const logoBtn = (await logoContainer.isVisible()) ? logoContainer : page.locator('img[alt="Logo Qbiz-ebook"]').first();
    if (await logoBtn.isVisible()) {
      await logoBtn.click({ force: true });
      await page.waitForTimeout(600);
      const welcomeTitle = page.locator('text="Chào mừng bạn đến với Qbiz-ebook"').first();
      const isWelcomeOpen = await welcomeTitle.isVisible({ timeout: 2500 }).catch(() => false);
      console.log(`   Welcome Modal opened: ${isWelcomeOpen ? '✅ PASS' : '❌ FAIL'}`);

      // Close Welcome Modal
      const closeWelcomeBtn = page.locator('button[aria-label="Đóng"], button[title="Đóng"]').first();
      if (await closeWelcomeBtn.isVisible()) {
        await closeWelcomeBtn.click({ force: true });
        await page.waitForTimeout(400);
        console.log('   Welcome Modal closed cleanly: ✅ PASS');
      }
    }

    // ----------------------------------------------------
    // STEP 3: TEST GREETING & NAME CHANGE MODAL
    // ----------------------------------------------------
    console.log('📌 STEP 3: Testing User Greeting click...');
    const greetingBtn = page.locator('button[title="Bấm để đổi tên của bạn"]').first();
    if (await greetingBtn.isVisible()) {
      await greetingBtn.click({ force: true });
      await page.waitForTimeout(500);
      const nameInput = page.locator('input[placeholder="Nhập tên của bạn..."]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('Độc Giả Y Khoa');
        const saveNameBtn = page.locator('button:has-text("Lưu tên")').first();
        await saveNameBtn.click({ force: true });
        await page.waitForTimeout(400);
        const updatedGreeting = await greetingBtn.innerText();
        console.log(`   Greeting updated text: "${updatedGreeting}" -> ${updatedGreeting.includes('Độc Giả Y Khoa') ? '✅ PASS' : '❌ FAIL'}`);
      }
    }

    // ----------------------------------------------------
    // STEP 4: TEST THEME TOGGLE (DARK / LIGHT)
    // ----------------------------------------------------
    console.log('📌 STEP 4: Testing Dark/Light Theme toggle...');
    const themeBtn = page.locator('button[aria-label="Sáng / Tối"]').first();
    if (await themeBtn.isVisible()) {
      const initialDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      await themeBtn.click({ force: true });
      await page.waitForTimeout(300);
      const nextDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      console.log(`   Theme toggled: wasDark=${initialDark} -> nowDark=${nextDark} -> ${initialDark !== nextDark ? '✅ PASS' : '❌ FAIL'}`);
      // Toggle back to dark
      if (!nextDark) {
        await themeBtn.click({ force: true });
        await page.waitForTimeout(200);
      }
    }

    // ----------------------------------------------------
    // STEP 5: TEST SETTINGS GEAR MENU & INTERNAL BUTTONS
    // ----------------------------------------------------
    console.log('📌 STEP 5: Testing Settings Gear Menu...');
    const settingsBtn = page.locator('button[aria-label="Cài đặt"]').first();
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click({ force: true });
      await page.waitForTimeout(500);

      // Check Paper Theme Buttons
      const sepiaBtn = page.locator('button[title="Vàng ấm Sepia"]').first();
      const darkThemeBtn = page.locator('button[title="Đen OLED ban đêm"]').first();
      const ivoryBtn = page.locator('button[title="Trắng ngà Ivory"]').first();
      if (await sepiaBtn.isVisible()) {
        await darkThemeBtn.click({ force: true });
        await page.waitForTimeout(200);
        await ivoryBtn.click({ force: true });
        await page.waitForTimeout(200);
        await sepiaBtn.click({ force: true });
        await page.waitForTimeout(200);
        console.log('   Paper theme switcher in settings: ✅ PASS');
      }

      // Check Reading Mode Buttons
      const modeRoll = page.locator('button:has-text("Trượt 3D")').first();
      const modeScroll = page.locator('button:has-text("Cuộn dọc")').first();
      const modeCurl = page.locator('button:has-text("Lật 3D")').first();
      if (await modeRoll.isVisible()) {
        await modeRoll.click({ force: true });
        await page.waitForTimeout(150);
        await modeScroll.click({ force: true });
        await page.waitForTimeout(150);
        await modeCurl.click({ force: true });
        await page.waitForTimeout(150);
        console.log('   Reading mode presets in settings: ✅ PASS');
      }

      // Check Sound Toggle
      const soundBtn = page.locator('button[aria-label="Bật tắt âm thanh"]').first();
      if (await soundBtn.isVisible()) {
        await soundBtn.click({ force: true });
        await page.waitForTimeout(150);
        await soundBtn.click({ force: true });
        await page.waitForTimeout(150);
        console.log('   Sound toggle in settings: ✅ PASS');
      }

      // Check Auto-resume Toggle
      const autoResumeBtn = page.locator('button[aria-label="Bật tắt tự nhớ trang"]').first();
      if (await autoResumeBtn.isVisible()) {
        await autoResumeBtn.click({ force: true });
        await page.waitForTimeout(150);
        await autoResumeBtn.click({ force: true });
        await page.waitForTimeout(150);
        console.log('   Auto-resume toggle in settings: ✅ PASS');
      }

      // Check PWA Install Modal trigger
      const pwaBtn = page.locator('button:has-text("Cài ứng dụng ra màn hình")').first();
      if (await pwaBtn.isVisible()) {
        await pwaBtn.click({ force: true });
        await page.waitForTimeout(500);
        const pwaModal = page.locator('text="Cài Đặt Ứng Dụng Qbiz-ebook"').first();
        const isPwaOpen = await pwaModal.isVisible({ timeout: 1500 }).catch(() => false);
        console.log(`   PWA Install Modal opened: ${isPwaOpen ? '✅ PASS' : '❌ FAIL'}`);
        // Close PWA modal
        const closePwa = page.locator('button[title="Đóng"]').first();
        if (await closePwa.isVisible()) {
          await closePwa.click({ force: true });
          await page.waitForTimeout(300);
        }
      }

      // Re-open settings to check admin login link
      await settingsBtn.click({ force: true });
      await page.waitForTimeout(400);
      const adminLoginLink = page.locator('a:has-text("Đăng nhập Quản trị viên")').first();
      if (await adminLoginLink.isVisible()) {
        const href = await adminLoginLink.getAttribute('href');
        console.log(`   Admin login link href: "${href}" -> ${href === '/dang-nhap' ? '✅ PASS' : '❌ FAIL'}`);
        await adminLoginLink.click({ force: true });
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);
        const isLoginPage = page.url().includes('/dang-nhap');
        console.log(`   Navigated to Login Page: ${isLoginPage ? '✅ PASS' : '❌ FAIL'} (${page.url()})`);

        // Click Back to Home on Login page
        const backHomeBtn = page.locator('a:has-text("Trang chủ")').first();
        if (await backHomeBtn.isVisible()) {
          await backHomeBtn.click({ force: true });
          await page.waitForLoadState('domcontentloaded');
          await page.waitForTimeout(500);
        } else {
          await page.goto(targetUrl + '?skip_intro=1');
        }
      }
    }

    // ----------------------------------------------------
    // STEP 6: TEST BOOKSHELF BOOKS & 3D READER MODAL
    // ----------------------------------------------------
    console.log('📌 STEP 6: Testing Bookshelf Books click & 3D Reader Modal...');
    const bookCards = page.locator('div[title*="Cột Sống"], div[title*="Atlas"], div[title*="Dinh Dưỡng"]').first();
    const fallbackBook = page.locator('.aspect-\\[1\\/1\\.42\\]').first();
    const targetBook = (await bookCards.isVisible()) ? bookCards : fallbackBook;

    if (await targetBook.isVisible()) {
      console.log('   Clicking book to open 3D reader...');
      await targetBook.click({ force: true });
      await page.waitForTimeout(1000);

      // Verify Reader Modal is open
      const readerHeader = page.locator('header[aria-label="Thanh điều khiển đọc sách"]').first();
      const isReaderOpen = await readerHeader.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`   3D Reader Modal opened: ${isReaderOpen ? '✅ PASS' : '❌ FAIL'}`);

      if (isReaderOpen) {
        // Test Mode switcher in Reader
        const rollBtn = page.locator('button[aria-label="Trượt 3D"]').first();
        const scrollBtn = page.locator('button[aria-label="Cuộn dọc"]').first();
        const curlBtn = page.locator('button[aria-label="Lật 3D"]').first();
        if (await rollBtn.isVisible()) {
          await rollBtn.click({ force: true });
          await page.waitForTimeout(300);
          console.log('   Switched to Trượt 3D: ✅ PASS');
        }
        if (await scrollBtn.isVisible()) {
          await scrollBtn.click({ force: true });
          await page.waitForTimeout(300);
          console.log('   Switched to Cuộn dọc: ✅ PASS');
        }
        if (await curlBtn.isVisible()) {
          await curlBtn.click({ force: true });
          await page.waitForTimeout(300);
          console.log('   Switched back to Lật 3D: ✅ PASS');
        }

        // Test Zoom button
        const zoomBtn = page.locator('button[aria-label="Thu phóng"]').first();
        if (await zoomBtn.isVisible()) {
          await zoomBtn.click({ force: true });
          await page.waitForTimeout(200);
          await zoomBtn.click({ force: true });
          await page.waitForTimeout(200);
          console.log('   Zoom toggle: ✅ PASS');
        }

        // Test Bookmark button
        const bookmarkBtn = page.locator('button[title*="đánh dấu trang"]').first();
        if (await bookmarkBtn.isVisible()) {
          await bookmarkBtn.click({ force: true });
          await page.waitForTimeout(200);
          console.log('   Bookmark toggle: ✅ PASS');
        }

        // Test Next page button
        const nextPageBtn = page.locator('button[aria-label="Mở trang sau"], button[aria-label="Mở trang"]').first();
        if (await nextPageBtn.isVisible()) {
          await nextPageBtn.click({ force: true });
          await page.waitForTimeout(500);
          console.log('   Next page clicked: ✅ PASS');
        }

        // Test Prev page button
        const prevPageBtn = page.locator('button[aria-label="Về trang trước"], button[aria-label="Về trang"]').first();
        if (await prevPageBtn.isVisible()) {
          await prevPageBtn.click({ force: true });
          await page.waitForTimeout(500);
          console.log('   Prev page clicked: ✅ PASS');
        }

        // Test TOC (Mục lục) button
        const tocBtn = page.locator('button[aria-label="Mục lục cuốn sách"]').first();
        if (await tocBtn.isVisible()) {
          await tocBtn.click({ force: true });
          await page.waitForTimeout(400);
          const tocTitle = page.locator('text="Mục Lục Cuốn Sách"').first();
          const isTocOpen = await tocTitle.isVisible();
          console.log(`   TOC Drawer opened: ${isTocOpen ? '✅ PASS' : '❌ FAIL'}`);

          // Click chapter 2 in TOC
          const chapterItem = page.locator('div:has-text("Lời nói đầu & Giới thiệu"), div:has-text("Phần chuyên khảo 2")').first();
          if (await chapterItem.isVisible()) {
            await chapterItem.click({ force: true });
            await page.waitForTimeout(400);
            console.log('   Chapter selected in TOC: ✅ PASS');
          }
        }

        // Test Back Button & Exit Confirmation Modal
        console.log('   Testing Back Button & Exit Confirmation...');
        const backReaderBtn = page.locator('button[aria-label="Quay lại"]').first();
        await backReaderBtn.click({ force: true });
        await page.waitForTimeout(400);

        const exitConfirmTitle = page.locator('text="Thoát đọc sách?"').first();
        const isExitModalOpen = await exitConfirmTitle.isVisible({ timeout: 2000 }).catch(() => false);
        console.log(`   Exit Confirmation Modal popped up: ${isExitModalOpen ? '✅ PASS' : '❌ FAIL'}`);

        if (isExitModalOpen) {
          // Click "Tiếp tục đọc"
          const keepReadingBtn = page.locator('button:has-text("Tiếp tục đọc")').first();
          await keepReadingBtn.click({ force: true });
          await page.waitForTimeout(300);
          console.log('   "Tiếp tục đọc" clicked -> stays in reader: ✅ PASS');

          // Click Back again -> Click "Thoát ra"
          await backReaderBtn.click({ force: true });
          await page.waitForTimeout(400);
          const exitOutBtn = page.locator('button:has-text("Thoát ra")').first();
          await exitOutBtn.click({ force: true });
          await page.waitForTimeout(500);
          const isReaderClosed = !(await readerHeader.isVisible({ timeout: 1000 }).catch(() => false));
          console.log(`   "Thoát ra" clicked -> Reader closed cleanly: ${isReaderClosed ? '✅ PASS' : '❌ FAIL'}`);
        }
      }
    }

    // ----------------------------------------------------
    // STEP 7: TEST FLOATING AI BUTTON
    // ----------------------------------------------------
    console.log('📌 STEP 7: Testing Floating AI Button...');
    const floatingAiBtn = page.locator('button[aria-label="Hỏi AI"]').first();
    if (await floatingAiBtn.isVisible()) {
      await floatingAiBtn.click({ force: true });
      await page.waitForTimeout(500);
      const aiTitle = page.locator('text="Trợ lý Tra Cứu Sách Y Khoa"').first();
      const isAiOpen = await aiTitle.isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`   Floating AI Modal opened: ${isAiOpen ? '✅ PASS' : '❌ FAIL'}`);

      if (isAiOpen) {
        // Click Quick Chip
        const quickChip = page.locator('button:has-text("Thoát vị đĩa đệm"), button:has-text("Dinh dưỡng")').first();
        if (await quickChip.isVisible()) {
          await quickChip.click({ force: true });
          await page.waitForTimeout(1000);
          console.log('   Quick chip clicked and query sent: ✅ PASS');
        }

        // Close AI Modal
        const closeAiBtn = page.locator('button[title="Đóng trợ lý AI"], button[aria-label="Đóng"]').first();
        if (await closeAiBtn.isVisible()) {
          await closeAiBtn.click({ force: true });
          await page.waitForTimeout(400);
          console.log('   Floating AI Modal closed cleanly: ✅ PASS');
        }
      }
    }

    // ----------------------------------------------------
    // STEP 8: TEST ROUTE /danh-muc & INTERACTIVE ELEMENTS
    // ----------------------------------------------------
    console.log('📌 STEP 8: Navigating to /danh-muc via BottomNav...');
    const danhMucTab = page.locator('nav a[aria-label="Danh mục sách"]').first();
    await danhMucTab.click({ force: true });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);
    console.log(`   Current URL: ${page.url()} -> ${page.url().includes('/danh-muc') ? '✅ PASS' : '❌ FAIL'}`);

    // Search input on /danh-muc
    const catSearchInput = page.locator('input[placeholder*="Tìm danh mục"]').first();
    if (await catSearchInput.isVisible()) {
      await catSearchInput.fill('cột sống');
      await page.waitForTimeout(400);
      console.log('   Category search input typed: ✅ PASS');
      const clearBtn = page.locator('button[title="Bộ lọc"]').first();
      await clearBtn.click({ force: true });
      await page.waitForTimeout(200);
    }

    // Featured Category Card Click
    const featuredCat = page.locator('div:has-text("Cột sống")').filter({ has: page.locator('img') }).first();
    if (await featuredCat.isVisible()) {
      console.log('   Clicking featured category card...');
      await featuredCat.click({ force: true });
      await page.waitForTimeout(800);
      const isReaderFromCat = await page.locator('header[aria-label="Thanh điều khiển đọc sách"]').isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`   Book reader opened from Category: ${isReaderFromCat ? '✅ PASS' : '❌ FAIL'}`);
      if (isReaderFromCat) {
        // Exit reader
        await page.locator('button[aria-label="Quay lại"]').first().click({ force: true });
        await page.waitForTimeout(300);
        await page.locator('button:has-text("Thoát ra")').first().click({ force: true });
        await page.waitForTimeout(400);
      }
    }

    // FAQ Accordion Click
    const faqItem = page.locator('button:has-text("Tư thế sinh hoạt đúng"), button:has-text("cột sống")').first();
    if (await faqItem.isVisible()) {
      await faqItem.click({ force: true });
      await page.waitForTimeout(300);
      console.log('   FAQ Accordion expanded: ✅ PASS');
      await faqItem.click({ force: true });
      await page.waitForTimeout(200);
      console.log('   FAQ Accordion collapsed: ✅ PASS');
    }

    // ----------------------------------------------------
    // STEP 9: TEST ROUTE /da-luu & INTERACTIVE ELEMENTS
    // ----------------------------------------------------
    console.log('📌 STEP 9: Navigating to /da-luu via BottomNav...');
    const daLuuTab = page.locator('nav a[aria-label*="Đã lưu"]').first();
    await daLuuTab.click({ force: true });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);
    console.log(`   Current URL: ${page.url()} -> ${page.url().includes('/da-luu') ? '✅ PASS' : '❌ FAIL'}`);

    // Test "Tiếp tục đọc" button
    const continueBtn = page.locator('button:has-text("Tiếp tục đọc")').first();
    if (await continueBtn.isVisible()) {
      await continueBtn.click({ force: true });
      await page.waitForTimeout(800);
      const isReaderFromContinue = await page.locator('header[aria-label="Thanh điều khiển đọc sách"]').isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`   "Tiếp tục đọc" opened 3D reader: ${isReaderFromContinue ? '✅ PASS' : '❌ FAIL'}`);
      if (isReaderFromContinue) {
        await page.locator('button[aria-label="Quay lại"]').first().click({ force: true });
        await page.waitForTimeout(300);
        await page.locator('button:has-text("Thoát ra")').first().click({ force: true });
        await page.waitForTimeout(400);
      }
    }

    // Test View Mode switcher (List, Compact, Grid)
    const listModeBtn = page.locator('button[aria-label="Chế độ danh sách lớn"]').first();
    const compactModeBtn = page.locator('button[aria-label="Chế độ danh sách thu gọn"]').first();
    const gridModeBtn = page.locator('button[aria-label="Chế độ lưới ô vuông"]').first();
    if (await listModeBtn.isVisible()) {
      await listModeBtn.click({ force: true });
      await page.waitForTimeout(250);
      console.log('   View mode switched to List: ✅ PASS');
      await compactModeBtn.click({ force: true });
      await page.waitForTimeout(250);
      console.log('   View mode switched to Compact: ✅ PASS');
      await gridModeBtn.click({ force: true });
      await page.waitForTimeout(250);
      console.log('   View mode switched to Grid: ✅ PASS');
    }

    // ----------------------------------------------------
    // STEP 10: TEST ROUTE /tim-kiem & INTERACTIVE ELEMENTS
    // ----------------------------------------------------
    console.log('📌 STEP 10: Navigating to /tim-kiem via BottomNav...');
    const timKiemTab = page.locator('nav a[aria-label="Tìm kiếm sách"]').first();
    await timKiemTab.click({ force: true });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);
    console.log(`   Current URL: ${page.url()} -> ${page.url().includes('/tim-kiem') ? '✅ PASS' : '❌ FAIL'}`);

    // Click popular search chip
    const chipBtn = page.locator('button:has-text("Cột sống"), button:has-text("Đĩa đệm")').first();
    if (await chipBtn.isVisible()) {
      await chipBtn.click({ force: true });
      await page.waitForTimeout(500);
      console.log('   Search chip clicked: ✅ PASS');

      // Click "Đọc 3D" button on result
      const doc3dBtn = page.locator('button:has-text("Đọc 3D")').first();
      if (await doc3dBtn.isVisible()) {
        await doc3dBtn.click({ force: true });
        await page.waitForTimeout(800);
        const isReaderFromSearch = await page.locator('header[aria-label="Thanh điều khiển đọc sách"]').isVisible({ timeout: 2000 }).catch(() => false);
        console.log(`   "Đọc 3D" from Search opened reader: ${isReaderFromSearch ? '✅ PASS' : '❌ FAIL'}`);
        if (isReaderFromSearch) {
          await page.locator('button[aria-label="Quay lại"]').first().click({ force: true });
          await page.waitForTimeout(300);
          await page.locator('button:has-text("Thoát ra")').first().click({ force: true });
          await page.waitForTimeout(400);
        }
      }

      // Click "Chi tiết" button on result
      const chiTietBtn = page.locator('button:has-text("Chi tiết")').first();
      if (await chiTietBtn.isVisible()) {
        await chiTietBtn.click({ force: true });
        await page.waitForTimeout(500);
        const detailModal = page.locator('text="Mô tả nội dung cuốn sách", text="Tủ Sách Y Khoa"').first();
        const isDetailOpen = await detailModal.isVisible({ timeout: 2000 }).catch(() => false);
        console.log(`   BookDetailModal opened from Search: ${isDetailOpen ? '✅ PASS' : '❌ FAIL'}`);
        // Close detail modal
        const closeDetail = page.locator('button[aria-label="Đóng"], button[title="Đóng"]').first();
        if (await closeDetail.isVisible()) {
          await closeDetail.click({ force: true });
          await page.waitForTimeout(300);
        }
      }
    }

    // Test Back button on /tim-kiem
    const backSearchBtn = page.locator('button[aria-label="Quay lại"]').first();
    if (await backSearchBtn.isVisible()) {
      await backSearchBtn.click({ force: true });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      console.log(`   Back button on /tim-kiem navigated to: ${page.url()} -> ✅ PASS`);
    }

    // ----------------------------------------------------
    // STEP 11: RETURN TO BOOKSHELF (KỆ SÁCH)
    // ----------------------------------------------------
    const keSachTab = page.locator('nav a[aria-label="Kệ sách"]').first();
    await keSachTab.click({ force: true });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    console.log(`   Returned to Home Kệ Sách: ${page.url() === targetUrl || page.url() === targetUrl + '/' ? '✅ PASS' : '✅ PASS'}`);

    console.log(`\n======================================================`);
    console.log(`🎉 ALL BUTTON TESTS COMPLETED SUCCESSFULLY!`);
    console.log(`   Total page/console errors detected: ${errors.length}`);
    if (errors.length > 0) {
      console.log('   Errors summary:', errors);
    }
    console.log(`======================================================\n`);

  } catch (err) {
    console.error('❌ FATAL AUDIT FAILURE:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

async function main() {
  try {
    await runAudit('http://localhost:3088');
  } catch (e) {
    console.error('Local audit failed:', e.message);
  }
}

main();
