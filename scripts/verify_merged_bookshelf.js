const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  // 1. Mobile iPhone viewport 390x844
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3088/?skip_intro=1...');
  await page.goto('http://localhost:3088/?skip_intro=1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  // Take screenshot of home page
  await page.screenshot({ path: 'public/verify_merged_bookshelf_mobile.png', fullPage: false });
  console.log('Saved public/verify_merged_bookshelf_mobile.png');

  // Test clicking on Settings icon to verify settings modal
  const settingsBtn = await page.$('button[title="Cài đặt & Tài khoản"]');
  if (settingsBtn) {
    await settingsBtn.click({ force: true });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'public/verify_settings_modal_open.png' });
    console.log('Saved public/verify_settings_modal_open.png');
    // Close settings modal
    const closeBtn = await page.$('button:has(svg.lucide-x)');
    if (closeBtn) await closeBtn.click({ force: true });
    await page.waitForTimeout(400);
  }

  // Test clicking on Greeting to verify name edit modal
  const greetingBtn = await page.$('button[title="Bấm để đổi tên của bạn"]');
  if (greetingBtn) {
    await greetingBtn.click({ force: true });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'public/verify_name_modal_open.png' });
    console.log('Saved public/verify_name_modal_open.png');
  }

  // Also test clicking a book to open 3D reader
  const firstBook = await page.$('div[title="Hiểu Đúng Về Cột Sống"]');
  if (firstBook) {
    await firstBook.click({ force: true });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'public/verify_book_reader_from_shelf.png' });
    console.log('Saved public/verify_book_reader_from_shelf.png');
  }

  await browser.close();
  console.log('Finished visual verification!');
})();
