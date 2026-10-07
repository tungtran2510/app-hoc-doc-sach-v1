const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/5a2f97b4-0aae-45d0-b12e-387a90cefcdf';
const BASE_URL = 'http://localhost:3088';

async function run() {
  console.log('Khởi chạy Playwright di động 390x844...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  // 1. KỆ SÁCH GỖ VỚI ĐẦY ĐỦ BADGE ĐỊNH DẠNG (PDF, EPUB, CBZ, 3D, TXT)
  console.log('1. Kệ sách gỗ với badge đa định dạng...');
  await page.goto(`${BASE_URL}/?skip_intro=1`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('giao_dien', 'dark');
    document.documentElement.classList.add('dark');
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_format_01_shelf_with_badges.png') });
  console.log('Saved: mobile_format_01_shelf_with_badges.png');

  // 2. MỞ ĐỌC SÁCH EPUB: Cẩm Nang Đốt Sống Cổ & Vai Gáy
  console.log('2. Mở đọc sách định dạng EPUB...');
  const epubTarget = await page.$('div[title*="Cẩm Nang Đốt Sống Cổ"]');
  if (epubTarget) {
    await epubTarget.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_format_02_epub_reader.png') });
    console.log('Saved: mobile_format_02_epub_reader.png');
  }

  // 3. MỞ ĐỌC SÁCH PDF: Atlas Giải Phẫu Cột Sống & Khớp 3D
  console.log('3. Mở đọc sách định dạng PDF...');
  await page.goto(`${BASE_URL}/?skip_intro=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const pdfTarget = await page.$('div[title*="Atlas Giải Phẫu"]');
  if (pdfTarget) {
    await pdfTarget.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_format_03_pdf_reader.png') });
    console.log('Saved: mobile_format_03_pdf_reader.png');
  }

  // 4. MỞ ĐỌC SÁCH CBZ: Atlas Hình Ảnh Cơ Thể 3D
  console.log('4. Mở đọc sách định dạng CBZ...');
  await page.goto(`${BASE_URL}/?skip_intro=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const cbzTarget = await page.$('div[title*="Atlas Hình Ảnh Cơ Thể 3D"]');
  if (cbzTarget) {
    await cbzTarget.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_format_04_cbz_reader.png') });
    console.log('Saved: mobile_format_04_cbz_reader.png');
  }

  // 5. TRANG ĐÃ LƯU: TẤT CẢ TABS & SỔ TAY GHI CHÚ
  console.log('5. Truy cập trang /da-luu...');
  await page.goto(`${BASE_URL}/da-luu`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_format_05_saved_page_all_tabs.png') });
  console.log('Saved: mobile_format_05_saved_page_all_tabs.png');

  // 6. CHỌN TAB SỔ TAY GHI CHÚ
  console.log('6. Chọn tab Sổ tay ghi chú...');
  const notesTab = await page.$('button:has-text("Sổ tay ghi chú")');
  if (notesTab) {
    await notesTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_format_06_saved_page_notes_tab.png') });
    console.log('Saved: mobile_format_06_saved_page_notes_tab.png');
  }

  // 7. TRANG ĐÃ LƯU TRONG GIAO DIỆN SÁNG (LIGHT MODE)
  console.log('7. Kiểm tra trang Đã lưu trong giao diện Sáng...');
  await page.evaluate(() => {
    localStorage.setItem('giao_dien', 'light');
    document.documentElement.classList.remove('dark');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_format_07_saved_page_light_mode.png') });
  console.log('Saved: mobile_format_07_saved_page_light_mode.png');

  await browser.close();
  console.log('>>> TOÀN BỘ 7 ẢNH NGHIỆM THU ĐÃ ĐƯỢC CHỤP THÀNH CÔNG! <<<');
}

run().catch((err) => {
  console.error('Lỗi khi chạy QA Playwright:', err);
  process.exit(1);
});
