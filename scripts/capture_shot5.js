const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function main() {
  const outputDir = path.join(__dirname, '../public/qa_screenshots');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    deviceScaleFactor: 2,
    hasTouch: true,
  });

  const page = await context.newPage();

  console.log('--- TEST 5: MỞ SÁCH KHÔNG CÓ AUDIO ĐỂ KIỂM CHỨNG NÚT TAI NGHE BỊ ẨN ---');
  await page.goto('http://localhost:3088/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Mở sách "Hiểu Đúng Về Cột Sống" từ Kệ sách
  const cotSongCard = page.locator('text=Hiểu Đúng Về Cột Sống').first();
  if (await cotSongCard.isVisible()) {
    await cotSongCard.click();
    await page.waitForTimeout(1500);

    const readBtn = page.locator('button:has-text("Đọc ngay"), button:has-text("Đọc sách")').first();
    if (await readBtn.isVisible()) {
      await readBtn.click();
      await page.waitForTimeout(3000);

      const screen5Path = path.join(outputDir, '10_05_reader_no_audio_headphone_hidden.png');
      await page.screenshot({ path: screen5Path, fullPage: false });
      console.log('Saved shot 5:', screen5Path);
    }
  }

  await browser.close();
  console.log('Done test 5!');
}

main().catch(console.error);
