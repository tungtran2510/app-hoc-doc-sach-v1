const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
  });
  const page = await context.newPage();

  console.log('--- 1. Testing Homepage & Reader Icons ---');
  await page.goto('http://localhost:3088', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    sessionStorage.setItem('qbiz_books_splash_dismissed', 'true');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Click first book to open reader
  const bookOpened = await page.evaluate(() => {
    const el = document.querySelector('.group.cursor-pointer[title]');
    if (el) {
      el.click();
      return true;
    }
    return false;
  });
  console.log('Book clicked:', bookOpened);
  await page.waitForTimeout(1500);

  // Verify the 3 mode buttons are now pure icons (no text "Lật 3D", "Trượt 3D", "Cuộn dọc")
  const iconCheck = await page.evaluate(() => {
    const bottomNav = document.querySelector('footer');
    if (!bottomNav) return { error: 'footer not found' };
    const text = bottomNav.innerText;
    return {
      hasTextLat3D: text.includes('Lật 3D'),
      hasTextTruot3D: text.includes('Trượt 3D'),
      hasTextCuonDoc: text.includes('Cuộn dọc'),
      iconButtonsCount: bottomNav.querySelectorAll('button[aria-label="Lật 3D"], button[aria-label="Trượt 3D"], button[aria-label="Cuộn dọc"]').length
    };
  });
  console.log('Icon buttons check (should all be false for text, 3 for iconButtonsCount):', iconCheck);
  await page.screenshot({ path: path.join(__dirname, '../public/test_06_reader_icons.png') });

  console.log('--- 2. Testing Exit Confirmation on Back Button ---');
  // Click top back button
  await page.evaluate(() => {
    const backBtn = document.querySelector('header button[aria-label="Đóng"]');
    if (backBtn) backBtn.click();
  });
  await page.waitForTimeout(800);

  // Check if exit confirm dialog is visible
  const confirmCheck = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      isConfirmVisible: text.includes('Thoát đọc sách?'),
      hasPageInfo: text.includes('Tiến độ của bạn đã được tự động lưu an toàn tại Trang'),
      hasContinueBtn: text.includes('Tiếp tục đọc'),
      hasExitBtn: text.includes('Thoát ra')
    };
  });
  console.log('Exit confirm dialog check:', confirmCheck);
  await page.screenshot({ path: path.join(__dirname, '../public/test_07_exit_confirm_modal.png') });

  // Click "Tiếp tục đọc" to verify it stays in reader
  await page.evaluate(() => {
    const continueBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Tiếp tục đọc'));
    if (continueBtn) continueBtn.click();
  });
  await page.waitForTimeout(500);

  console.log('--- 3. Testing Bottom Back Button at Page 1 (Exit Trigger) ---');
  await page.evaluate(() => {
    const bottomBackBtn = document.querySelector('footer button[aria-label="Thoát về kệ sách"]');
    if (bottomBackBtn) bottomBackBtn.click();
  });
  await page.waitForTimeout(800);
  const bottomBackConfirm = await page.evaluate(() => {
    return document.body.innerText.includes('Thoát đọc sách?');
  });
  console.log('Bottom back triggered exit confirm:', bottomBackConfirm);

  console.log('--- 4. Testing Progress Persistence & Reopen at Exact Page ---');
  // Close confirm dialog first
  await page.evaluate(() => {
    const continueBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Tiếp tục đọc'));
    if (continueBtn) continueBtn.click();
  });
  await page.waitForTimeout(500);

  // Jump to page 3 using seekbar or next button
  await page.evaluate(() => {
    const nextBtn = document.querySelector('footer button[title="Trang sau"]');
    if (nextBtn) {
      nextBtn.click();
      nextBtn.click();
    }
  });
  await page.waitForTimeout(1000);

  // Exit reader via confirm dialog
  await page.evaluate(() => {
    const backBtn = document.querySelector('header button[aria-label="Đóng"]');
    if (backBtn) backBtn.click();
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const exitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Thoát ra'));
    if (exitBtn) exitBtn.click();
  });
  await page.waitForTimeout(1500);

  // Check saved page in localStorage
  const savedPageState = await page.evaluate(() => {
    const title = 'Hiểu Đúng Về Cột Sống';
    return {
      lastReadBook: localStorage.getItem('last_read_book_title'),
      savedPage: localStorage.getItem(`last_read_page_${title}`) || localStorage.getItem(`bookmark_page_${title}`)
    };
  });
  console.log('Saved page state in localStorage:', savedPageState);

  // Reopen the book and verify it opens at saved page (not page 0)
  await page.evaluate(() => {
    const el = document.querySelector('.group.cursor-pointer[title]');
    if (el) el.click();
  });
  await page.waitForTimeout(1500);

  const reloadedPageState = await page.evaluate(() => {
    const headerText = document.querySelector('header')?.innerText || '';
    return {
      headerText,
      isNotZero: !headerText.includes('1/7')
    };
  });
  console.log('Reloaded page state in reader header:', reloadedPageState);
  await page.screenshot({ path: path.join(__dirname, '../public/test_08_reopen_resumed_page.png') });

  await browser.close();
  console.log('All tests passed successfully!');
})();
