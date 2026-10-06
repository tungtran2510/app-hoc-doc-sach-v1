const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // Mobile iPhone 12/13/14
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
  });
  const page = await context.newPage();

  console.log('--- 1. Testing Splash Pure Books Branding ---');
  // Load home with cleared splash dismissal
  await page.goto('http://localhost:3088', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    sessionStorage.removeItem('qbiz_books_splash_dismissed');
    window.location.reload();
  });
  await page.waitForTimeout(1000);

  // Take screenshot of Splash
  const splashVisible = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasQbizBooks: text.includes('TỦ SÁCH Y KHOA ĐIỆN TỬ') || text.includes('QBIZ BOOKS'),
      hasReadNow: text.includes('Mở sách & Đọc ngay') || text.includes('BẮT ĐẦU ĐỌC'),
      hasOldCourseWording: text.includes('KHOA HỌC & GIẢI PHẪU 3D') || text.includes('Mở sách & Học ngay')
    };
  });
  console.log('Splash verification:', splashVisible);
  await page.screenshot({ path: path.join(__dirname, '../public/test_01_splash.png') });

  // Dismiss splash by clicking or setting flag
  await page.evaluate(() => {
    sessionStorage.setItem('qbiz_books_splash_dismissed', 'true');
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Mở sách') || b.innerText.includes('BẮT ĐẦU') || b.innerText.includes('Đóng'));
    if (btn) btn.click();
  });
  await page.waitForTimeout(1500);

  console.log('--- 2. Testing Bookshelf Minimalist UI ---');
  await page.screenshot({ path: path.join(__dirname, '../public/test_02_bookshelf.png') });

  console.log('--- 3. Testing Pure Book Search (/tim-kiem) ---');
  await page.goto('http://localhost:3088/tim-kiem', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Check search page content
  const searchCheck = await page.evaluate(async () => {
    // Fill query
    const input = document.querySelector('input');
    if (input) {
      input.value = 'Đĩa đệm';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        const text = document.body.innerText;
        resolve({
          hasVideosSection: text.includes('VIDEO HƯỚNG DẪN'),
          hasLessonsSection: text.includes('BÀI HỌC NỘI DUNG'),
          hasFloatingInstall: text.includes('Cài app') && !!document.querySelector('.fixed.bottom-20'),
          hasBookResults: text.includes('Tủ Sách') || text.includes('quyển sách') || text.includes('Đọc 3D') || text.includes('Chi tiết')
        });
      }, 1000);
    });
  });
  console.log('Search page check:', searchCheck);
  await page.screenshot({ path: path.join(__dirname, '../public/test_03_search.png') });

  console.log('--- 4. Testing Bookmarks Pure Book (/da-luu) ---');
  await page.goto('http://localhost:3088/da-luu', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const daLuuCheck = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasBookmarksHeading: text.includes('Dấu Trang Đã Lưu') || text.includes('Tủ Sách Đã Lưu'),
      hasVideoRelics: text.includes('Video đã xem') || text.includes('Đồng bộ tài khoản qua SĐT') || text.includes('BÀI HỌC'),
      hasGarbledText: text.includes('Ã¡') || text.includes('Ã¨') || text.includes('áº')
    };
  });
  console.log('Bookmarks page check:', daLuuCheck);
  await page.screenshot({ path: path.join(__dirname, '../public/test_04_bookmarks.png') });

  console.log('--- 5. Testing Reader Cuộn Dọc (Vertical Scroll) Aspect Ratio ---');
  await page.goto('http://localhost:3088', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Click on the first book on the wooden shelf
  const bookClicked = await page.evaluate(() => {
    const bookEl = document.querySelector('[title="Hiểu đúng về Cột sống"]') || document.querySelector('.group.cursor-pointer[title]');
    if (bookEl) {
      bookEl.click();
      return true;
    }
    return false;
  });
  console.log('Book clicked on shelf:', bookClicked);
  await page.waitForTimeout(2000);

  // Switch to Cuộn Dọc mode in reader
  const readerScrollCheck = await page.evaluate(async () => {
    // Find Cuộn dọc button
    const cuonDocBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Cuộn dọc');
    if (cuonDocBtn) {
      cuonDocBtn.click();
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        const imgElements = Array.from(document.querySelectorAll('img[alt*="Trang"]'));
        const heights = imgElements.map(img => ({
          height: img.clientHeight,
          naturalHeight: img.naturalHeight,
          width: img.clientWidth,
          isSquished: img.clientHeight < 120
        }));
        resolve({
          modalFound: !!document.querySelector('.fixed.inset-0.z-\\[100\\]'),
          cuonDocBtnFound: !!cuonDocBtn,
          imgCount: imgElements.length,
          heights: heights.slice(0, 3)
        });
      }, 1500);
    });
  });
  console.log('Reader scroll mode check:', readerScrollCheck);
  await page.screenshot({ path: path.join(__dirname, '../public/test_05_reader_scroll.png') });

  await browser.close();
  console.log('All QA checks completed successfully!');
})();
