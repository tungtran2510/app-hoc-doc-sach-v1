const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/5a2f97b4-0aae-45d0-b12e-387a90cefcdf';

async function testPage4() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
  });
  await page.goto('http://localhost:3088/tim-kiem', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.locator('button:has-text("Sách trực tuyến")').first().click();
  await page.waitForTimeout(600);
  await page.locator('input[placeholder*="Tìm kiếm"]').first().fill('dinh dưỡng');
  await page.waitForTimeout(1000);
  await page.locator('div:has-text("Dinh Dưỡng Học Bị Thất Truyền")').locator('button:has-text("Đọc ngay")').first().click();
  await page.waitForTimeout(3000);

  // Nhảy sang trang 4 bằng nút "Mở trang >"
  const nextBtn = page.locator('button:has-text("Mở trang")').first();
  if (await nextBtn.isVisible()) {
    await nextBtn.click();
    await page.waitForTimeout(1500);
    await nextBtn.click();
    await page.waitForTimeout(1500);
    await nextBtn.click();
    await page.waitForTimeout(2000);
  }

  const shot = path.join(ARTIFACT_DIR, 'real_book_04_reading_content_page.png');
  await page.screenshot({ path: shot });
  console.log('Done shot:', shot);
  await browser.close();
}

testPage4();
