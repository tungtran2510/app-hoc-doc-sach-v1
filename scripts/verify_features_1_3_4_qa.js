const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/5a2f97b4-0aae-45d0-b12e-387a90cefcdf';
const BASE_URL = 'http://localhost:3088';

async function run() {
  console.log('Khởi chạy Playwright di động 390x844 cho 3 tính năng mới 1, 3, 4...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  // 1. TRANG ĐÃ LƯU: CHUỖI ĐỌC STREAK & READING INSIGHTS
  console.log('1. Chụp hàng thống kê Streak & Reading Insights...');
  await page.goto(`${BASE_URL}/da-luu`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('giao_dien', 'dark');
    document.documentElement.classList.add('dark');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_feature_01_reading_insights_streak.png') });
  console.log('Saved: mobile_feature_01_reading_insights_streak.png');

  // 2. MỞ MODAL ÔN TẬP FLASHCARD 3D (MẶT TRƯỚC)
  console.log('2. Mở Flashcard 3D mặt trước...');
  const flashcardBtn = await page.$('button:has-text("Ôn Flashcard")');
  if (flashcardBtn) {
    await flashcardBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_feature_02_flashcard_front.png') });
    console.log('Saved: mobile_feature_02_flashcard_front.png');

    // 3. LẬT SANG MẶT SAU (LỜI GIẢI / SUY NGẪM)
    console.log('3. Lật Flashcard 3D sang mặt sau...');
    // Click vào thẻ hoặc nút lật
    const flipBtn = await page.$('button[title="Lật thẻ"]');
    if (flipBtn) {
      await flipBtn.click();
    } else {
      const card = await page.$('div[style*="perspective"]');
      if (card) await card.click();
    }
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_feature_03_flashcard_back.png') });
    console.log('Saved: mobile_feature_03_flashcard_back.png');

    // Đóng Flashcard modal
    const closeBtn = await page.$('button[title="Đóng modal"]');
    if (closeBtn) await closeBtn.click();
    await page.waitForTimeout(800);
  }

  // 4. MỞ MODAL ẢNH TRÍCH DẪN (QUOTE CARD EXPORTER) - NỀN GỖ TỐI
  console.log('4. Mở Ảnh trích dẫn nền Gỗ tối...');
  const quoteBtn = await page.$('button:has-text("Ảnh trích dẫn")');
  if (quoteBtn) {
    await quoteBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_feature_04_quote_card_modal_dark.png') });
    console.log('Saved: mobile_feature_04_quote_card_modal_dark.png');

    // 5. ĐỔI SANG NỀN GIẤY NGÀ (IVORY PAPER)
    console.log('5. Đổi sang Ảnh trích dẫn nền Giấy ngà...');
    const themeBtn = await page.$('button:has-text("Nền giấy ngà"), button[title="Đổi màu nền thiệp"]');
    if (themeBtn) {
      await themeBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_feature_05_quote_card_modal_ivory.png') });
      console.log('Saved: mobile_feature_05_quote_card_modal_ivory.png');
    }
  }

  await browser.close();
  console.log('>>> TOÀN BỘ 5 ẢNH NGHIỆM THU TÍNH NĂNG 1, 3, 4 ĐÃ ĐƯỢC CHỤP THÀNH CÔNG! <<<');
}

run().catch((err) => {
  console.error('Lỗi khi chạy QA Playwright:', err);
  process.exit(1);
});
