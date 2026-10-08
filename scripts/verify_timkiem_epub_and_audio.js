const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/5a2f97b4-0aae-45d0-b12e-387a90cefcdf';

async function run() {
  console.log('🚀 Bắt đầu kiểm thử toàn diện EPUB Văn học Việt Nam và Sách Nói tại /tim-kiem...');

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
    console.log('📍 1. Mở trang Thư Viện Trực Tuyến & Tìm Kiếm http://localhost:3088/tim-kiem');
    await page.goto('http://localhost:3088/tim-kiem', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);

    // Bấm chuyển sang tab "Sách trực tuyến"
    console.log('🌐 2. Chuyển sang Tab Sách trực tuyến...');
    const onlineTabBtn = page.locator('button:has-text("Sách trực tuyến")').first();
    await onlineTabBtn.click();
    await page.waitForTimeout(1200);

    // Chụp ảnh giao diện Thư viện trực tuyến
    const screenshotSearchHome = path.join(ARTIFACT_DIR, 'v2_36_online_library_shelf.png');
    await page.screenshot({ path: screenshotSearchHome });
    console.log('📸 Đã chụp v2_36_online_library_shelf.png');

    // Tìm và mở cuốn sách Chí Phèo EPUB
    console.log('📖 3. Tìm thẻ sách Chí Phèo...');
    const titleEl = page.locator('h4', { hasText: 'Chí Phèo' }).first();
    const chiPheoCard = page.locator('div.rounded-2xl', { has: titleEl }).first();
    await chiPheoCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    let docNgayBtn = chiPheoCard.locator('button:has-text("Đọc ngay")').first();
    const taiBtn = chiPheoCard.locator('button:has-text("Tải về")').first();

    if (!(await docNgayBtn.isVisible()) && (await taiBtn.isVisible())) {
      console.log('⬇️ Tải sách Chí Phèo về máy...');
      await taiBtn.click();
      await page.waitForTimeout(3000);
      docNgayBtn = chiPheoCard.locator('button:has-text("Đọc ngay")').first();
    }

    console.log('📖 4. Bấm "Đọc ngay" mở Trình đọc EPUB...');
    await docNgayBtn.click();
    await page.waitForSelector('div[role="dialog"][aria-label*="Đang đọc sách"]', { timeout: 12000 });
    await page.waitForTimeout(2000);

    // Chụp ảnh Header EPUB với tiêu đề chuẩn tinh gọn
    const screenshotEpubHeader = path.join(ARTIFACT_DIR, 'v2_37_epub_reader_header.png');
    await page.screenshot({ path: screenshotEpubHeader });
    console.log('📸 Đã chụp v2_37_epub_reader_header.png');

    // Click nút Ba Thanh [≡] để kiểm tra Mục Lục Chương EPUB xổ ra
    console.log('📑 5. Click nút Ba Thanh [≡] Mục Lục Chương EPUB (xổ ra)...');
    const tocBtn = page.locator('button[aria-label="Mục lục"]').first();
    await tocBtn.click();
    await page.waitForTimeout(800);

    const screenshotEpubToc = path.join(ARTIFACT_DIR, 'v2_38_epub_dropdown_toc_chapters.png');
    await page.screenshot({ path: screenshotEpubToc });
    console.log('📸 Đã chụp v2_38_epub_dropdown_toc_chapters.png');

    // Click chọn Chương 2 từ mục lục hoặc đóng
    console.log('📖 6. Đóng menu mục lục...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Click nút Chế độ đọc để xổ ra dropdown và chuyển sang Cuộn vô hạn
    console.log('🔄 7. Click nút Chế độ đọc và chọn Cuộn vô hạn...');
    const modeBtn = page.locator('button[aria-label="Chế độ đọc sách"]').first();
    await modeBtn.click();
    await page.waitForTimeout(700);

    const screenshotEpubMode = path.join(ARTIFACT_DIR, 'v2_39_epub_dropdown_modes.png');
    await page.screenshot({ path: screenshotEpubMode });
    console.log('📸 Đã chụp v2_39_epub_dropdown_modes.png');

    // Kích hoạt cuộn vô hạn
    console.log('📜 8. Bấm chọn Cuộn vô hạn xuống...');
    const scrollOption = page.locator('button:has-text("Cuộn vô hạn xuống")').first();
    await scrollOption.click();
    await page.waitForTimeout(1500);

    // Cuộn dọc trong chế độ Cuộn vô hạn để kiểm tra luồng văn bản và tiêu đề chương vừa vặn
    console.log('📜 Cuộn dọc để kiểm tra tiêu đề chương vừa vặn và nội dung liên tục...');
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(1000);

    const screenshotEpubScroll = path.join(ARTIFACT_DIR, 'v2_40_epub_scroll_infinite_stream.png');
    await page.screenshot({ path: screenshotEpubScroll });
    console.log('📸 Đã chụp v2_40_epub_scroll_infinite_stream.png');

    // Thoát sách về Kho Sách
    console.log('🚪 9. Thoát sách...');
    const exitBtn = page.locator('button[aria-label="Thoát về kệ sách"]').first();
    await exitBtn.click();
    await page.waitForTimeout(1200);

    // Bây giờ kiểm tra Sách Nói (Audiobook)
    console.log('🎧 10. Chuyển sang tab Sách Nói trong Thư viện...');
    const audioTab = page.locator('button:has-text("Sách nói")').first();
    await audioTab.scrollIntoViewIfNeeded();
    await audioTab.click();
    await page.waitForTimeout(800);

    // Bấm phát cuốn Sách Nói: Chí Phèo & Bát Cháo Hành
    console.log('▶️ 11. Bấm phát Sách Nói: Chí Phèo & Bát Cháo Hành...');
    const audioTitle = page.locator('h4', { hasText: 'Chí Phèo' }).first();
    const audioCard = page.locator('div.rounded-2xl', { has: audioTitle }).first();
    const playBtn = audioCard.locator('button:has-text("Nghe ngay")').first();
    await playBtn.click();
    await page.waitForTimeout(3000);

    const screenshotAudio = path.join(ARTIFACT_DIR, 'v2_41_audiobook_playing_active.png');
    await page.screenshot({ path: screenshotAudio });
    console.log('📸 Đã chụp v2_41_audiobook_playing_active.png');

    console.log('🎉 Toàn bộ quy trình kiểm thử hoàn tất thành công 100%!');
  } catch (err) {
    console.error('❌ Lỗi kiểm thử Playwright:', err);
  } finally {
    await browser.close();
  }
}

run();
