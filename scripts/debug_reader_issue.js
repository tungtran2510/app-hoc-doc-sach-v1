const { chromium } = require('playwright');
const path = require('path');

async function testReader() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const page = await context.newPage();

  console.log('Navigating to tim-kiem...');
  await page.goto('http://localhost:3088/tim-kiem', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Switch to tab "Sách trực tuyến"
  const onlineTab = page.locator('button:has-text("Sách trực tuyến")').first();
  if (await onlineTab.isVisible()) {
    await onlineTab.click();
    await page.waitForTimeout(1500);
  }

  // Find "Việt Nam Sử Lược"
  const vnBook = page.locator('text=Việt Nam Sử Lược').first();
  if (await vnBook.isVisible()) {
    console.log('Found Việt Nam Sử Lược, clicking...');
    await vnBook.click();
    await page.waitForTimeout(4000);

    const shot1 = path.join(__dirname, '../public/qa_screenshots/debug_reader_vn_su_luoc.png');
    await page.screenshot({ path: shot1 });
    console.log('Saved screenshot:', shot1);
  } else {
    console.log('Still not found, searching...');
    const searchInput = page.locator('input[placeholder*="Tìm"]').first();
    await searchInput.fill('Việt Nam Sử Lược');
    await page.waitForTimeout(2000);

    const book = page.locator('text=Việt Nam Sử Lược').first();
    if (await book.isVisible()) {
      await book.click();
      await page.waitForTimeout(4000);
      const shot2 = path.join(__dirname, '../public/qa_screenshots/debug_reader_vn_su_luoc.png');
      await page.screenshot({ path: shot2 });
      console.log('Saved shot 2:', shot2);
    }
  }

  await browser.close();
}

testReader().catch(console.error);
