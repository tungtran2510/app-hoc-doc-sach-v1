const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testAudioBook() {
  const screenshotsDir = path.join(__dirname, '..', 'public', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  try {
    // 1. KIỂM THỬ TRÊN MÁY TÍNH (DESKTOP 1280x800)
    console.log('--- 1. BẮT ĐẦU KIỂM THỬ DESKTOP (1280x800) ---');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const desktopPage = await desktopContext.newPage();

    await desktopPage.goto('http://127.0.0.1:3088/?skip_intro=1', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await desktopPage.waitForTimeout(1500);

    // Mở sách
    console.log('   Mở sách trên kệ...');
    const bookCard = await desktopPage.$('div[title="Hiểu Đúng Về Cột Sống"], div[title*="Cột Sống"], article, .group');
    if (bookCard) {
      await bookCard.click({ force: true });
      await desktopPage.waitForTimeout(600);
      const readBtn = await desktopPage.$('button:has-text("Đọc sách"), button:has-text("Đọc ngay")');
      if (readBtn) {
        await readBtn.click({ force: true });
      }
    }

    await desktopPage.waitForSelector('div[role="dialog"]', { timeout: 8000 });
    await desktopPage.waitForTimeout(2000);

    // Chụp giao diện đọc ban đầu
    const initialShot = path.join(screenshotsDir, 'audio_01_reader_desktop.png');
    await desktopPage.screenshot({ path: initialShot });
    console.log('   Đã chụp ảnh trình đọc:', initialShot);

    // Tìm nút Sách nói
    const audioBtn = await desktopPage.$('button:has-text("Sách nói"), button[title*="Sách Nói"]');
    if (audioBtn) {
      console.log('   Tìm thấy nút Sách nói, đang click kích hoạt...');
      await audioBtn.dispatchEvent('click');
      await desktopPage.waitForTimeout(1500);

      // Chụp ảnh Sách nói đang mở trên Desktop
      const audioActiveShot = path.join(screenshotsDir, 'audio_02_player_active_desktop.png');
      await desktopPage.screenshot({ path: audioActiveShot });
      console.log('   Đã chụp ảnh Sách nói Desktop:', audioActiveShot);

      // Mở cài đặt giọng đọc
      const settingsBtn = await desktopPage.$('button[title*="Cài đặt giọng đọc"]');
      if (settingsBtn) {
        await settingsBtn.dispatchEvent('click');
        await desktopPage.waitForTimeout(600);
        const settingsShot = path.join(screenshotsDir, 'audio_03_settings_desktop.png');
        await desktopPage.screenshot({ path: settingsShot });
        console.log('   Đã chụp ảnh Cài đặt giọng đọc Desktop:', settingsShot);
      }
    } else {
      console.log('   Không tìm thấy nút Sách nói trên Desktop');
    }
    await desktopContext.close();

    // 2. KIỂM THỬ TRÊN ĐIỆN THOẠI (MOBILE 390x844 - iPhone / Android)
    console.log('\n--- 2. BẮT ĐẦU KIỂM THỬ ĐIỆN THOẠI (390x844) ---');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();

    await mobilePage.goto('http://127.0.0.1:3088/?skip_intro=1', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await mobilePage.waitForTimeout(1500);

    const mBookCard = await mobilePage.$('div[title="Hiểu Đúng Về Cột Sống"], div[title*="Cột Sống"], article, .group');
    if (mBookCard) {
      await mBookCard.dispatchEvent('click');
      await mobilePage.waitForTimeout(800);
      const mReadBtn = await mobilePage.$('button:has-text("Đọc sách"), button:has-text("Đọc ngay")');
      if (mReadBtn) {
        await mReadBtn.dispatchEvent('click');
      }
    }

    await mobilePage.waitForSelector('div[role="dialog"]', { timeout: 8000 });
    await mobilePage.waitForTimeout(2000);

    const mAudioBtn = await mobilePage.$('button:has-text("Sách nói"), button[title*="Sách Nói"]');
    if (mAudioBtn) {
      console.log('   Tìm thấy nút Sách nói trên Điện thoại, đang kích hoạt...');
      await mAudioBtn.dispatchEvent('click');
      await mobilePage.waitForTimeout(1500);

      const mAudioShot = path.join(screenshotsDir, 'audio_04_player_mobile.png');
      await mobilePage.screenshot({ path: mAudioShot });
      console.log('   Đã chụp ảnh Sách nói Mobile:', mAudioShot);

      const mSettingsBtn = await mobilePage.$('button[title*="Cài đặt giọng đọc"]');
      if (mSettingsBtn) {
        await mSettingsBtn.dispatchEvent('click');
        await mobilePage.waitForTimeout(600);
        const mSettingsShot = path.join(screenshotsDir, 'audio_05_settings_mobile.png');
        await mobilePage.screenshot({ path: mSettingsShot });
        console.log('   Đã chụp ảnh Cài đặt giọng đọc Mobile:', mSettingsShot);
      }
    } else {
      console.log('   Không tìm thấy nút Sách nói trên Mobile');
    }
    await mobileContext.close();

    console.log('\n=== TẤT CẢ KIỂM THỬ TRÌNH DUYỆT ĐÃ HOÀN TẤT THÀNH CÔNG ===');
  } catch (err) {
    console.error('Lỗi kiểm thử:', err);
  } finally {
    await browser.close();
  }
}

testAudioBook();
