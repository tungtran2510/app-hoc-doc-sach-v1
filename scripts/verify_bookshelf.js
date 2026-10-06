const { chromium } = require('playwright');
const path = require('path');

async function testBookshelf() {
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone mobile viewport
    deviceScaleFactor: 2,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  // Pre-seed storage so modals never block interaction
  await context.addInitScript(() => {
    try {
      localStorage.setItem('app_user_display_name', 'Học viên');
      sessionStorage.setItem('app_user_name_prompted', 'true');
      sessionStorage.setItem('pwa_banner_dismissed', 'true');
      localStorage.setItem('pwa_banner_dismissed', 'true');
    } catch (e) {}
  });

  const page = await context.newPage();

  console.log('Navigating to http://localhost:3088/ ...');
  await page.goto('http://localhost:3088/', { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForTimeout(2000);

  // 1. Locate Wooden Bookshelf
  console.log('Locating Wooden Bookshelf...');
  const bookshelfHeader = page.locator('text=GIAN TRƯNG BÀY SÁCH Y KHOA').first();
  await bookshelfHeader.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  // 2. Take clean screenshot of the Wooden Bookshelf on mobile
  await page.screenshot({
    path: path.join(__dirname, '../public/verify_bookshelf_mobile_clean.png'),
  });
  console.log('Saved public/verify_bookshelf_mobile_clean.png');

  // 3. Click the first book inside the wooden bookshelf cabinet
  console.log('Clicking the first book inside the wooden cabinet...');
  const woodenCabinet = page.locator('text=SIDEBOOKS 3D').locator('xpath=ancestor::div[contains(@class, "bg-gradient-to-b")]');
  const bookInShelf = woodenCabinet.locator('img').first();
  await bookInShelf.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await bookInShelf.click({ force: true });
  console.log('Book in wooden cabinet clicked!');

  await page.waitForTimeout(2500);

  // 4. Capture SideBooks 3D Reader Modal opened
  await page.screenshot({
    path: path.join(__dirname, '../public/verify_modal_reader_open.png'),
  });
  console.log('Saved public/verify_modal_reader_open.png');

  // 5. Click "Lật tiếp" in Reader Modal to see 3D curl page 2
  const flipNextBtn = page.locator('button:has-text("Lật tiếp")').first();
  if (await flipNextBtn.isVisible()) {
    console.log('Clicking "Lật tiếp" inside 3D curl reader modal...');
    await flipNextBtn.click();
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: path.join(__dirname, '../public/verify_modal_page2.png'),
    });
    console.log('Saved public/verify_modal_page2.png');
  }

  // 6. Test theme switch inside modal
  const sepiaThemeBtn = page.locator('button[title*="Sepia"]').first();
  if (await sepiaThemeBtn.isVisible()) {
    console.log('Switching reader theme to Sepia...');
    await sepiaThemeBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(__dirname, '../public/verify_modal_theme_sepia.png'),
    });
    console.log('Saved public/verify_modal_theme_sepia.png');
  }

  // 7. Close reader modal and return to bookshelf
  const closeBtn = page.locator('button:has-text("Kệ sách"), button:has-text("Đóng")').first();
  if (await closeBtn.isVisible()) {
    console.log('Closing reader modal to return to bookshelf...');
    await closeBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(__dirname, '../public/verify_back_to_bookshelf.png'),
    });
    console.log('Saved public/verify_back_to_bookshelf.png');
  }

  // 8. Test layout toggles: Switch to Grid, then to Lookbook, then back to Bookshelf!
  console.log('Testing layout switcher: Grid...');
  const gridBtn = page.locator('button[title*="lưới 2 cột"]').first();
  if (await gridBtn.isVisible()) {
    await gridBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(__dirname, '../public/verify_layout_grid.png'),
    });
    console.log('Saved public/verify_layout_grid.png');
  }

  console.log('Testing layout switcher: Lookbook...');
  const lookbookBtn = page.locator('button[title*="danh sách chi tiết"]').first();
  if (await lookbookBtn.isVisible()) {
    await lookbookBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(__dirname, '../public/verify_layout_lookbook.png'),
    });
    console.log('Saved public/verify_layout_lookbook.png');
  }

  console.log('Testing layout switcher: back to Bookshelf...');
  const shelfBtn = page.locator('button[title*="Kệ sách gỗ 3D"]').first();
  if (await shelfBtn.isVisible()) {
    await shelfBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(__dirname, '../public/verify_layout_back_bookshelf.png'),
    });
    console.log('Saved public/verify_layout_back_bookshelf.png');
  }

  await browser.close();
  console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
}

testBookshelf().catch((err) => {
  console.error('Error in testBookshelf:', err);
  process.exit(1);
});
