const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/5a2f97b4-0aae-45d0-b12e-387a90cefcdf';

async function investigate() {
  console.log('🔍 Bắt đầu điều tra lỗi trên Live Vercel: https://qbiz-ebook.vercel.app ...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required']
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
  });

  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER PAGE ERROR:', err.message));
  page.on('response', resp => {
    if (resp.status() >= 400) {
      console.log('NETWORK ERROR:', resp.status(), resp.url());
    }
  });

  try {
    console.log('1. Mở trang https://qbiz-ebook.vercel.app/tim-kiem ...');
    await page.goto('https://qbiz-ebook.vercel.app/tim-kiem', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);

    // Bấm tab Sách trực tuyến
    console.log('2. Bấm tab Sách trực tuyến...');
    const onlineTab = page.locator('button:has-text("Sách trực tuyến")').first();
    await onlineTab.click();
    await page.waitForTimeout(1000);

    // Gõ dinh dưỡng
    console.log('3. Gõ dinh dưỡng...');
    const searchInput = page.locator('input[placeholder*="Tìm kiếm"]').first();
    await searchInput.fill('dinh dưỡng');
    await page.waitForTimeout(2000);

    // Test 1: Bấm nút "Đọc ngay" của cuốn thứ 2 (Giáo Trình Y Khoa & Sức Khỏe Tổng Quan)
    console.log('4. TEST CUỐN 2: Giáo Trình Y Khoa (PDF)...');
    const readBtns = page.locator('button:has-text("Đọc ngay")');
    const count = await readBtns.count();
    console.log('Số nút Đọc ngay tìm thấy:', count);

    if (count >= 2) {
      const btn2 = readBtns.nth(1);
      await btn2.click();
      console.log('Đã bấm Đọc ngay cuốn 2, chờ 4s...');
      await page.waitForTimeout(4000);

      const screenCuon2 = path.join(ARTIFACT_DIR, 'investigate_cuon2_pdf.png');
      await page.screenshot({ path: screenCuon2 });
      console.log('📸 Chụp ảnh cuốn 2:', screenCuon2);

      // Nhấn Escape để đóng modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }

    // Test 2: Bấm nút "Đọc ngay" của cuốn 1 (Dinh Dưỡng)
    console.log('5. TEST CUỐN 1: Dinh Dưỡng Nền Tảng (EPUB)...');
    if (count >= 1) {
      const btn1 = readBtns.nth(0);
      await btn1.click();
      console.log('Đã bấm Đọc ngay cuốn 1, chờ 4s...');
      await page.waitForTimeout(4000);

      const screenCuon1 = path.join(ARTIFACT_DIR, 'investigate_cuon1_epub.png');
      await page.screenshot({ path: screenCuon1 });
      console.log('📸 Chụp ảnh cuốn 1:', screenCuon1);

      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }

    // Test 3: Bấm vào ảnh bìa hoặc tiêu đề của thẻ sách
    console.log('6. TEST BẤM VÀO THẺ / TIÊU ĐỀ SÁCH TRỰC TUYẾN...');
    const bookTitle = page.locator('h4:has-text("Dinh Dưỡng Nền Tảng")').first();
    if (await bookTitle.isVisible()) {
      await bookTitle.click();
      await page.waitForTimeout(2000);
      const screenClickTitle = path.join(ARTIFACT_DIR, 'investigate_click_title.png');
      await page.screenshot({ path: screenClickTitle });
      console.log('📸 Chụp ảnh sau khi click tiêu đề:', screenClickTitle);
    }

    // Test 4: Gõ từ khóa phổ biến: "đắc nhân tâm"
    console.log('7. TEST GÕ "đắc nhân tâm"...');
    await searchInput.fill('đắc nhân tâm');
    await page.waitForTimeout(2000);
    const screenDacNhanTam = path.join(ARTIFACT_DIR, 'investigate_dac_nhan_tam.png');
    await page.screenshot({ path: screenDacNhanTam });
    console.log('📸 Chụp ảnh tìm "đắc nhân tâm":', screenDacNhanTam);

    // Test 5: Gõ từ khóa bất kỳ khác: "kinh tế"
    console.log('8. TEST GÕ "kinh tế"...');
    await searchInput.fill('kinh tế');
    await page.waitForTimeout(2000);
    const screenKinhTe = path.join(ARTIFACT_DIR, 'investigate_kinh_te.png');
    await page.screenshot({ path: screenKinhTe });
    console.log('📸 Chụp ảnh tìm "kinh tế":', screenKinhTe);

    // Test 6: Kiểm tra tab "Sách của bạn" khi tìm "dinh dưỡng"
    console.log('9. TEST TAB "Sách của bạn" KHI TÌM "dinh dưỡng"...');
    const localTab = page.locator('button:has-text("Sách của bạn")').first();
    await localTab.click();
    await page.waitForTimeout(1500);
    const screenLocalTab = path.join(ARTIFACT_DIR, 'investigate_local_tab_dinhduong.png');
    await page.screenshot({ path: screenLocalTab });
    console.log('📸 Chụp ảnh Tab Sách của bạn:', screenLocalTab);

  } catch (err) {
    console.error('❌ Lỗi investigate:', err);
  } finally {
    await browser.close();
  }
}

investigate();
