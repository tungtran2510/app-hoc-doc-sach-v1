const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PORT = 3088;
const BASE_URL = `http://localhost:${PORT}`;
const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/5a2f97b4-0aae-45d0-b12e-387a90cefcdf';
const PUBLIC_DIR = path.join(__dirname, '..', 'public', 'qa_screenshots');

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

async function saveBoth(page, filename) {
  const p1 = path.join(ARTIFACT_DIR, filename);
  const p2 = path.join(PUBLIC_DIR, filename);
  await page.screenshot({ path: p1, fullPage: false });
  await page.screenshot({ path: p2, fullPage: false });
  console.log(`📸 Đã lưu ảnh: ${filename}`);
}

async function runVisualQa() {
  console.log('====================================================');
  console.log('📱 BẮT ĐẦU KIỂM THỬ GIAO DIỆN & TRỰC QUAN PLAYWRIGHT 390x844');
  console.log('====================================================');

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  let dialogFired = false;
  let dialogMessage = '';

  page.on('dialog', async (dialog) => {
    dialogFired = true;
    dialogMessage = dialog.message();
    console.log(`⚠️ PHÁT HIỆN DIALOG BẬT LÊN: ${dialogMessage}`);
    await dialog.dismiss();
  });

  // --- MÀN HÌNH 1: /dang-nhap ---
  console.log('\n[1/7] Kiểm tra trang /dang-nhap');
  await page.goto(`${BASE_URL}/dang-nhap`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  
  const passwordPlaceholder = await page.getAttribute('#admin-password', 'placeholder');
  console.log(`Placeholder ô mật khẩu: "${passwordPlaceholder}"`);
  if (passwordPlaceholder !== 'Nhập mật khẩu quản trị') {
    throw new Error(`FAILED: Placeholder mật khẩu chưa đúng: "${passwordPlaceholder}"`);
  }
  const pageText = await page.innerText('body');
  if (pageText.includes('Tung@2510')) {
    throw new Error('FAILED: Trang /dang-nhap vẫn còn chữ Tung@2510');
  }
  await saveBoth(page, '01_dang_nhap_clean_placeholder.png');

  // --- MÀN HÌNH 2: / (Trang chủ) ---
  console.log('\n[2/7] Kiểm tra Trang chủ /');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const scrollWidthHome = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log(`Trang chủ scrollWidth: ${scrollWidthHome}px`);
  await saveBoth(page, '02_home_mobile_390x844.png');

  // --- MÀN HÌNH 3: /tim-kiem ---
  console.log('\n[3/7] Kiểm tra /tim-kiem');
  await page.goto(`${BASE_URL}/tim-kiem`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const scrollWidthSearch = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log(`Tìm kiếm scrollWidth: ${scrollWidthSearch}px`);
  await saveBoth(page, '03_tim_kiem_mobile_390x844.png');

  // --- MÀN HÌNH 4: /danh-muc ---
  console.log('\n[4/7] Kiểm tra /danh-muc');
  await page.goto(`${BASE_URL}/danh-muc`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const scrollWidthTopics = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log(`Danh mục scrollWidth: ${scrollWidthTopics}px`);
  await saveBoth(page, '04_danh_muc_mobile_390x844.png');

  // --- MÀN HÌNH 5: /da-luu ---
  console.log('\n[5/7] Kiểm tra /da-luu');
  await page.goto(`${BASE_URL}/da-luu`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const scrollWidthSaved = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log(`Đã lưu scrollWidth: ${scrollWidthSaved}px`);
  await saveBoth(page, '05_da_luu_mobile_390x844.png');

  // --- MÀN HÌNH 6: /tro-ly-ai ---
  console.log('\n[6/7] Kiểm tra /tro-ly-ai');
  await page.goto(`${BASE_URL}/tro-ly-ai`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const scrollWidthAi = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log(`Trợ lý AI scrollWidth: ${scrollWidthAi}px`);
  await saveBoth(page, '06_tro_ly_ai_mobile_390x844.png');

  // --- MÀN HÌNH 7: MỞ SÁCH EPUB TRONG TRÌNH ĐỌC ---
  console.log('\n[7/7] Kiểm tra mở sách EPUB trong trình đọc (EpubReaderView)');
  await page.goto(`${BASE_URL}/tim-kiem`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Click vào cuốn sách Dinh Dưỡng Học Bị Thất Truyền
  const bookEl = page.locator('h4:has-text("Dinh Dưỡng Học Bị Thất Truyền")').first();
  if (await bookEl.isVisible()) {
    console.log('Bấm mở sách Dinh Dưỡng Học Bị Thất Truyền...');
    await bookEl.click();
    await page.waitForTimeout(3000);
    await saveBoth(page, '07_epub_reader_clean_content.png');
  } else {
    console.log('Không thấy sách trên tìm kiếm, mở thử trên trang chủ...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const firstBook = page.locator('h4').first();
    if (await firstBook.isVisible()) {
      await firstBook.click();
      await page.waitForTimeout(3000);
      await saveBoth(page, '07_epub_reader_clean_content.png');
    }
  }

  // Kiểm tra xem dialog có bị nổ không trong toàn bộ phiên
  if (dialogFired) {
    throw new Error(`FAILED: Bị nổ hộp thoại XSS alert: "${dialogMessage}"`);
  }
  console.log('✅ PASS: Không có bất kỳ hộp thoại alert nào xuất hiện trên toàn bộ các trang.');

  await browser.close();
  console.log('\n====================================================');
  console.log('🎉 TOÀN BỘ KIỂM THỬ PLAYWRIGHT 390x844 HOÀN THÀNH XUẤT SẮC!');
  console.log('====================================================');
}

runVisualQa().catch((err) => {
  console.error('\n❌ ERROR:', err);
  process.exit(1);
});
