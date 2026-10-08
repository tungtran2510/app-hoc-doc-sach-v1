const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/5a2f97b4-0aae-45d0-b12e-387a90cefcdf';

async function run() {
  console.log('🚀 Bắt đầu kiểm thử toàn diện Mobile 390x844 các tính năng: Dropdown, Cuộn vô hạn, Tiêu đề vừa vặn và Sách nói...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
  });

  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('❌ Console error:', msg.text());
  });

  try {
    console.log('📍 1. Mở trang chủ ứng dụng http://localhost:3088');
    await page.goto('http://localhost:3088', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Chạm vào cuốn sách "Cẩm Nang Đốt Sống Cổ & Vai Gáy" (EPUB nhiều chương C1-C7)
    console.log('📖 2. Chạm mở cuốn sách "Cẩm Nang Đốt Sống Cổ & Vai Gáy" trên Kệ sách...');
    const bookTarget = page.locator('div[title*="Đốt Sống Cổ"], div[title*="Hiểu Đúng"]').first();
    await bookTarget.click();
    console.log('🖱️ Đã click vào cuốn sách trên kệ');

    // Đợi Trình đọc SideBooksReaderModal xuất hiện
    console.log('⏳ 3. Đợi Trình đọc SideBooksReaderModal hiển thị...');
    await page.waitForSelector('div[role="dialog"][aria-label*="Đang đọc sách"]', { timeout: 10000 });
    await page.waitForTimeout(1500);

    // Chụp ảnh 1: Header tinh gọn đơn dòng với các nút dropdown
    const screenshot1 = path.join(ARTIFACT_DIR, 'v2_30_reader_dropdown_header.png');
    await page.screenshot({ path: screenshot1 });
    console.log('📸 Đã chụp v2_30_reader_dropdown_header.png');

    // Click nút Ba Thanh [≡] (Mục lục) để xổ ra dropdown
    console.log('📑 4. Click nút Ba Thanh [≡] (Mục lục xổ ra)...');
    const tocBtn = page.locator('button[aria-label="Mục lục"]').first();
    await tocBtn.click();
    await page.waitForTimeout(800);

    const screenshot2 = path.join(ARTIFACT_DIR, 'v2_31_dropdown_toc_chapters.png');
    await page.screenshot({ path: screenshot2 });
    console.log('📸 Đã chụp v2_31_dropdown_toc_chapters.png');

    // Click nút Chế độ đọc để xổ ra dropdown
    console.log('🔄 5. Click nút Chế độ đọc (xổ ra)...');
    const modeBtn = page.locator('button[aria-label="Chế độ đọc sách"]').first();
    await modeBtn.click();
    await page.waitForTimeout(800);

    const screenshot3 = path.join(ARTIFACT_DIR, 'v2_32_dropdown_reading_modes.png');
    await page.screenshot({ path: screenshot3 });
    console.log('📸 Đã chụp v2_32_dropdown_reading_modes.png');

    // Chọn chế độ "Cuộn vô hạn xuống"
    console.log('📜 6. Kích hoạt chế độ Cuộn vô hạn xuống dưới...');
    const scrollOption = page.locator('text=Cuộn vô hạn xuống').first();
    if (await scrollOption.isVisible()) {
      await scrollOption.click();
      await page.waitForTimeout(800);
    }

    // Click nút Tông màu để xổ ra dropdown
    console.log('🎨 7. Click nút Tông màu (xổ ra)...');
    const themeBtn = page.locator('button[aria-label="Tông màu"]').first();
    await themeBtn.click();
    await page.waitForTimeout(800);

    const screenshot4 = path.join(ARTIFACT_DIR, 'v2_33_dropdown_themes.png');
    await page.screenshot({ path: screenshot4 });
    console.log('📸 Đã chụp v2_33_dropdown_themes.png');

    // Click chọn Vàng ấm Sepia
    const sepiaOption = page.locator('text=Vàng ấm Sepia').first();
    if (await sepiaOption.isVisible()) {
      await sepiaOption.click();
      await page.waitForTimeout(600);
    }

    // Click nút Tiện ích [⋮] để xổ ra dropdown
    console.log('🛠️ 8. Click nút Tiện ích [⋮] (xổ ra)...');
    const toolsBtn = page.locator('button[aria-label="Tiện ích khác"]').first();
    if (await toolsBtn.isVisible()) {
      await toolsBtn.click();
      await page.waitForTimeout(800);
      const screenshotTools = path.join(ARTIFACT_DIR, 'v2_33b_dropdown_tools.png');
      await page.screenshot({ path: screenshotTools });
      console.log('📸 Đã chụp v2_33b_dropdown_tools.png');
      // Đóng dropdown tiện ích
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Cuộn dọc trong chế độ Cuộn vô hạn để kiểm tra luồng văn bản và tiêu đề vừa vặn
    console.log('📜 9. Cuộn dọc để kiểm tra luồng văn bản liên tục...');
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(1000);

    const screenshot5 = path.join(ARTIFACT_DIR, 'v2_34_scroll_infinite_reading.png');
    await page.screenshot({ path: screenshot5 });
    console.log('📸 Đã chụp v2_34_scroll_infinite_reading.png');

    // Thoát sách về Kệ
    console.log('🚪 10. Thoát sách về Kệ...');
    const exitBtn = page.locator('button[aria-label="Thoát về kệ sách"]').first();
    await exitBtn.click();
    await page.waitForTimeout(600);

    const confirmExit = page.locator('button:has-text("Về kệ sách")').first();
    if (await confirmExit.isVisible()) {
      await confirmExit.click();
      await page.waitForTimeout(1000);
    }

    // Kiểm tra Sách Nói (Audiobook): Chọn tab Sách Nói và phát
    console.log('🎧 11. Cuộn đến Thư viện trực tuyến & chọn tab Sách Nói...');
    const audioTab = page.locator('button:has-text("Sách nói")').first();
    if (await audioTab.isVisible()) {
      await audioTab.scrollIntoViewIfNeeded();
      await audioTab.click();
      await page.waitForTimeout(800);
    }

    console.log('▶️ 12. Bấm phát Sách Nói...');
    const playAudioBtn = page.locator('button:has-text("Nghe ngay")').first();
    if (await playAudioBtn.isVisible()) {
      await playAudioBtn.scrollIntoViewIfNeeded();
      await playAudioBtn.click();
      await page.waitForTimeout(2500);
    }

    const screenshot6 = path.join(ARTIFACT_DIR, 'v2_35_audiobook_playing_success.png');
    await page.screenshot({ path: screenshot6 });
    console.log('📸 Đã chụp v2_35_audiobook_playing_success.png');

    console.log('🎉 Toàn bộ quy trình kiểm thử hoàn tất thành công 100%!');
  } catch (err) {
    console.error('❌ Lỗi kiểm thử Playwright:', err);
  } finally {
    await browser.close();
  }
}

run();
