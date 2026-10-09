const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PORT = 3088;
const BASE_URL = `http://localhost:${PORT}`;
const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/5a2f97b4-0aae-45d0-b12e-387a90cefcdf';

async function captureReader() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const page = await context.newPage();

  console.log('Navigating to /tim-kiem...');
  await page.goto(`${BASE_URL}/tim-kiem`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Click vào nút Đọc 3D
  const doc3dBtn = page.locator('button:has-text("Đọc 3D")').first();
  console.log('Clicking Đọc 3D...');
  await doc3dBtn.click();
  await page.waitForTimeout(3500);

  const outPath = path.join(ARTIFACT_DIR, '07_epub_reader_clean_content.png');
  await page.screenshot({ path: outPath });
  console.log('📸 Saved reader screenshot to:', outPath);

  await browser.close();
}

captureReader().catch(console.error);
