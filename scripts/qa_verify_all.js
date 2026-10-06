const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 }, // Mobile viewport
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  const outDir = path.join(__dirname, 'qa_screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Navigating to homepage...');
  await page.goto('http://127.0.0.1:3088', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  // Take screenshot of top header
  await page.screenshot({ path: path.join(outDir, '01_homepage_top.png') });
  console.log('Saved 01_homepage_top.png');

  // Scroll down to view all book shelves
  await page.evaluate(() => window.scrollBy(0, 500));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '02_bookshelf_row2.png') });
  console.log('Saved 02_bookshelf_row2.png');

  await page.evaluate(() => window.scrollBy(0, 500));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '03_bookshelf_row3.png') });
  console.log('Saved 03_bookshelf_row3.png');

  // Navigate to /tro-ly-ai
  console.log('Navigating to /tro-ly-ai...');
  await page.goto('http://127.0.0.1:3088/tro-ly-ai', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, '04_tro_ly_ai_input_bar.png') });
  console.log('Saved 04_tro_ly_ai_input_bar.png');

  await browser.close();
  console.log('QA completed successfully.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
