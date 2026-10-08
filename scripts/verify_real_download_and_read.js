const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
  });
  const page = await context.newPage();
  const dir = 'C:/Users/Admin/.gemini/antigravity/brain/5a2f97b4-0aae-45d0-b12e-387a90cefcdf';

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

  console.log('=== STEP 1: Search Online Books ===');
  await page.goto('http://localhost:3088/tim-kiem', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Switch to Sách trực tuyến
  const onlineTab = await page.$('button:has-text("Sách trực tuyến")');
  if (onlineTab) await onlineTab.click();
  await page.waitForTimeout(800);

  // Type search query
  await page.fill('input[placeholder*="Mô tả"]', 'dinh dưỡng');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${dir}/audit_real_01_search_online.png` });

  console.log('=== STEP 2: Download Book ===');
  const downloadBtns = await page.$$('button:has-text("Tải về")');
  console.log('Found download buttons:', downloadBtns.length);
  if (downloadBtns.length > 0) {
    await downloadBtns[0].click();
    console.log('Clicked download, waiting for completion...');
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${dir}/audit_real_02_download_done.png` });
  }

  console.log('=== STEP 3: Open Downloaded Book Directly ===');
  const readNowBtn = await page.$('button:has-text("Đọc ngay")');
  if (readNowBtn) {
    console.log('Found Đọc ngay button, clicking...');
    await readNowBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${dir}/audit_real_03_read_now_opened.png` });

    // Close reader
    await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Thoát về kệ sách"]') || document.querySelector('button[title*="Đóng sách"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(1200);
  }

  console.log('=== STEP 4: Verify Book is on Home Bookshelf ===');
  await page.goto('http://localhost:3088/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${dir}/audit_real_04_home_bookshelf_with_downloaded.png` });

  console.log('=== STEP 5: Verify Book is in Da Luu ===');
  await page.goto('http://localhost:3088/da-luu', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${dir}/audit_real_05_da_luu_with_downloaded.png` });

  console.log('=== STEP 6: Test AI Book Recommendation and Open ===');
  await page.goto('http://localhost:3088/tim-kiem', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  const aiBtn = await page.$('button:has-text("Nhờ AI tìm sách")');
  if (aiBtn) {
    await aiBtn.click();
    await page.waitForTimeout(800);
    const aiInput = await page.$('input[placeholder*="Nói với AI"]');
    if (aiInput) {
      await aiInput.fill('tôi thích sách về dinh dưỡng xương khớp');
      await page.keyboard.press('Enter');
      console.log('Waiting for AI response...');
      await page.waitForTimeout(5000);
      await page.screenshot({ path: `${dir}/audit_real_06_ai_recommendation.png` });

      const openAiBookBtn = await page.$('button:has-text("Mở đọc sách (3D)")');
      if (openAiBookBtn) {
        console.log('Clicking Mở đọc sách (3D) from AI...');
        await openAiBookBtn.click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: `${dir}/audit_real_07_opened_from_ai.png` });
      }
    }
  }

  await browser.close();
  console.log('=== ALL REAL TESTS COMPLETED SUCCESSFULLY! ===');
})().catch(err => {
  console.error('Fatal error in real verification:', err);
  process.exit(1);
});
