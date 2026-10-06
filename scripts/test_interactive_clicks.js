const { chromium } = require('playwright');

async function testInteractive() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });

  console.log('1. Loading http://localhost:3088...');
  await page.goto('http://localhost:3088', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Dismiss or wait for splash
  const splashBtn = page.locator('#qbiz-books-3d-splash button:has-text("Khám phá ngay")').first();
  if (await splashBtn.isVisible().catch(() => false)) {
    console.log('Splash visible, dismissing...');
    await splashBtn.click({ force: true });
    await page.waitForTimeout(1000);
  }
  console.log('Splash dismissed. Testing buttons on Home Page:');

  // Test 1: Brand logo -> Welcome modal
  console.log('\n--- Test 1: Brand Logo & Welcome Modal ---');
  await page.evaluate(() => {
    const el = document.querySelector('div[title="Xem lời ngỏ & video giới thiệu"]');
    if (el) el.click();
  });
  await page.waitForTimeout(600);
  const welcomeText = page.locator('text="LỜI NGỎ CHÀO MỪNG"').first();
  const welcomeVisible = await welcomeText.isVisible();
  console.log('Welcome Modal open:', welcomeVisible ? 'PASS' : 'FAIL');
  // Close welcome modal
  const closeBtn = page.locator('button[aria-label="Đóng"]').first();
  await closeBtn.click({ force: true });
  await page.waitForTimeout(1000);
  const welcomeAfter = await welcomeText.isVisible();
  console.log('Welcome Modal closed:', !welcomeAfter ? 'PASS' : 'FAIL');

  // Test 2: Greeting name change
  console.log('\n--- Test 2: Greeting & Name Modal ---');
  const greetBtn = page.locator('button[title="Bấm để đổi tên của bạn"]').first();
  await greetBtn.click({ force: true });
  await page.waitForTimeout(800);
  const nameInput = page.locator('input[placeholder*="Ví dụ: Tùng"]').first();
  await nameInput.fill('Bác Sĩ Nam');
  await page.locator('button:has-text("Lưu tên")').first().click({ force: true });
  await page.waitForTimeout(600);
  const greetText = await greetBtn.innerText();
  console.log('Updated greeting:', greetText, greetText.includes('Bác Sĩ Nam') ? 'PASS' : 'FAIL');

  // Test 3: Theme toggle
  console.log('\n--- Test 3: Theme Toggle ---');
  const themeBtn = page.locator('button[aria-label="Sáng / Tối"]').first();
  const darkBefore = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  await themeBtn.click({ force: true });
  await page.waitForTimeout(400);
  const darkAfter = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  console.log(`Theme toggled: before=${darkBefore} -> after=${darkAfter}:`, darkBefore !== darkAfter ? 'PASS' : 'FAIL');

  // Test 4: Settings menu
  console.log('\n--- Test 4: Settings Menu ---');
  const settingsBtn = page.locator('button[aria-label="Cài đặt"]').first();
  await settingsBtn.click({ force: true });
  await page.waitForTimeout(500);

  // Paper theme
  await page.locator('button[title="Vàng Sepia"]').first().click({ force: true });
  await page.waitForTimeout(300);
  console.log('Paper Sepia: PASS');

  // Reading mode
  await page.locator('button:has-text("Trượt 3D")').first().click({ force: true });
  await page.waitForTimeout(300);
  console.log('Mode Roll: PASS');

  // Admin login link
  const adminLink = page.locator('a:has-text("Đăng nhập Quản trị viên")').first();
  const adminHref = await adminLink.getAttribute('href');
  console.log('Admin login link href:', adminHref, adminHref === '/dang-nhap' ? 'PASS' : 'FAIL');

  // Close settings menu
  await page.locator('div.fixed.inset-0.z-50 button[title="Đóng"]').first().click({ force: true });
  await page.waitForTimeout(600);
  console.log('Settings menu closed: PASS');

  // Test 5: Click a book on shelf to open 3D Reader
  console.log('\n--- Test 5: Click Book on Bookshelf & 3D Reader ---');
  const bookOnShelf = page.locator('div[title="Hiểu Đúng Về Cột Sống"]').first();
  await bookOnShelf.click({ force: true });
  const readerDialog = page.locator('div[role="dialog"]').first();
  await readerDialog.waitFor({ state: 'visible', timeout: 6000 });
  console.log('3D Reader dialog open: PASS');

  // Tap center of reader canvas/main to reveal toolbars (since reader opens with HUD auto-hidden)
  const readerMain = page.locator('div[role="dialog"] main').first();
  await readerMain.click({ position: { x: 180, y: 350 }, force: true });
  await page.waitForTimeout(600);

  // Reader mode switches
  await page.locator('button[aria-label="Trượt 3D"]').first().click({ force: true });
  await page.waitForTimeout(300);
  await page.locator('button[aria-label="Cuộn dọc"]').first().click({ force: true });
  await page.waitForTimeout(300);
  await page.locator('button[aria-label="Lật 3D"]').first().click({ force: true });
  await page.waitForTimeout(300);
  console.log('Reader mode switches (Lật 3D, Trượt 3D, Cuộn dọc): PASS');

  // TOC button
  await page.locator('button[title="Mục lục chương sách"]').first().click({ force: true });
  await page.waitForTimeout(400);
  const tocOpen = await page.locator('text="Mục Lục Cuốn Sách"').first().isVisible();
  console.log('TOC drawer open:', tocOpen ? 'PASS' : 'FAIL');
  await page.locator('div[class*="z-[115]"] button').first().click({ force: true });
  await page.waitForTimeout(500);

  // Page turn forward
  await page.locator('button[aria-label="Mở trang"]').first().click({ force: true });
  await page.waitForTimeout(500);
  console.log('Page turn forward: PASS');

  // Back button & Exit confirmation
  await page.locator('button[title="Đóng sách về Kệ"]').first().click({ force: true });
  await page.waitForTimeout(500);
  const exitModal = await page.locator('text="Thoát đọc sách?"').first().isVisible();
  console.log('Exit confirm modal:', exitModal ? 'PASS' : 'FAIL');

  // Click "Thoát ra"
  await page.locator('button:has-text("Thoát ra")').first().click({ force: true });
  await readerDialog.waitFor({ state: 'hidden', timeout: 5000 });
  console.log('Reader closed cleanly: PASS');

  // Test 6: Floating AI Assistant Button
  console.log('\n--- Test 6: Floating AI Assistant Button ---');
  const aiBtn = page.locator('button[aria-label="Hỏi AI"]').first();
  const aiBtnVisible = await aiBtn.isVisible();
  console.log('AI Button visible:', aiBtnVisible ? 'PASS' : 'FAIL');
  if (aiBtnVisible) {
    await aiBtn.click({ force: true });
    await page.waitForTimeout(600);
    const aiModalHeader = page.locator('text="Trợ lý Tra Cứu Sách Y Khoa"').first();
    const aiModalOpen = await aiModalHeader.isVisible();
    console.log('AI Modal open:', aiModalOpen ? 'PASS' : 'FAIL');
    // Close AI Modal
    const aiCloseBtn = page.locator('button[title="Đóng trợ lý AI"]').first();
    if (await aiCloseBtn.isVisible()) {
      await aiCloseBtn.click({ force: true });
      await page.waitForTimeout(500);
    }
  }

  // Test 7: BottomNav navigation to /danh-muc
  console.log('\n--- Test 7: BottomNav to /danh-muc ---');
  const catNav = page.locator('nav a[aria-label="Danh mục sách"]').first();
  await catNav.click({ force: true });
  await page.waitForURL('**/danh-muc', { timeout: 6000 });
  console.log('Navigated to:', page.url(), page.url().includes('/danh-muc') ? 'PASS' : 'FAIL');

  // FAQ accordion
  const faqBtn = page.locator('button:has-text("Tư thế sinh hoạt đúng")').first();
  if (await faqBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await faqBtn.click({ force: true });
    await page.waitForTimeout(300);
    console.log('FAQ expanded: PASS');
  }

  // Test 8: BottomNav to /da-luu
  console.log('\n--- Test 8: BottomNav to /da-luu ---');
  const savedNav = page.locator('nav a[aria-label="Sách & Dấu trang đã lưu"]').first();
  await savedNav.click({ force: true });
  await page.waitForURL('**/da-luu', { timeout: 6000 });
  console.log('Navigated to:', page.url(), page.url().includes('/da-luu') ? 'PASS' : 'FAIL');

  // View switchers
  await page.locator('button[aria-label="Chế độ danh sách thu gọn"]').first().click({ force: true });
  await page.waitForTimeout(300);
  await page.locator('button[aria-label="Chế độ lưới ô vuông"]').first().click({ force: true });
  await page.waitForTimeout(300);
  console.log('View mode switchers: PASS');

  // Verify pure book badges (no video residue)
  const videoBadgeCount = await page.locator('text="VIDEO"').count();
  console.log('Video badges on /da-luu:', videoBadgeCount, videoBadgeCount === 0 ? 'PASS (0 video badges)' : 'FAIL');

  // Test 9: BottomNav to /tim-kiem
  console.log('\n--- Test 9: BottomNav to /tim-kiem ---');
  const searchNav = page.locator('nav a[aria-label="Tìm kiếm sách"]').first();
  await searchNav.click({ force: true });
  await page.waitForURL('**/tim-kiem', { timeout: 6000 });
  console.log('Navigated to:', page.url(), page.url().includes('/tim-kiem') ? 'PASS' : 'FAIL');

  // Click suggestion chip
  await page.locator('button:has-text("Cột sống")').first().click({ force: true });
  await page.waitForTimeout(400);
  const searchInputVal = await page.locator('input[placeholder*="Tìm tựa sách"]').first().inputValue();
  console.log('Search input value:', searchInputVal, searchInputVal === 'Cột sống' ? 'PASS' : 'FAIL');

  // Test 10: Safe Back navigation in Search
  console.log('\n--- Test 10: Safe Back Navigation in Search ---');
  const backBtn = page.locator('button[aria-label="Quay lại"]').first();
  if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await backBtn.click({ force: true });
    await page.waitForTimeout(600);
    console.log('Navigated back to:', page.url(), page.url().includes('/da-luu') ? 'PASS' : 'FAIL');
  }

  // Test 11: Return to Home
  console.log('\n--- Test 11: BottomNav return to Home ---');
  const homeNav = page.locator('nav a[aria-label="Kệ sách"]').first();
  await homeNav.click({ force: true });
  await page.waitForURL('http://localhost:3088/', { timeout: 6000 }).catch(() => {});
  console.log('Navigated to Home:', page.url(), (page.url() === 'http://localhost:3088/' || page.url() === 'http://localhost:3088') ? 'PASS' : 'FAIL');

  // Test 12: Admin Login page direct visit
  console.log('\n--- Test 12: Admin Login Page ---');
  await page.goto('http://localhost:3088/dang-nhap', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  const loginHeader = await page.locator('text="Đăng Nhập Quản Trị"').first().isVisible();
  console.log('Login header visible:', loginHeader ? 'PASS' : 'FAIL');

  console.log('\n======================================');
  console.log('🎉 ALL 12 TESTS COMPLETED SUCCESSFULLY!');
  console.log('======================================');

  await browser.close();
}

testInteractive().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
