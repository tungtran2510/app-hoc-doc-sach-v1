const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function verifyProduction() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  const outDir = path.join(__dirname, 'production_screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const liveUrl = 'https://qbiz-ebook.vercel.app';
  console.log(`Checking production: ${liveUrl}`);

  await page.goto(liveUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // 1. Homepage & Bookshelf
  await page.screenshot({ path: path.join(outDir, 'prod_01_homepage.png') });
  console.log('Captured prod_01_homepage.png');

  // 2. AI Assistant page
  console.log(`Checking AI Assistant: ${liveUrl}/tro-ly-ai`);
  await page.goto(`${liveUrl}/tro-ly-ai`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(outDir, 'prod_02_tro_ly_ai.png') });
  console.log('Captured prod_02_tro_ly_ai.png');

  await browser.close();
  console.log('Production verification complete!');
}

verifyProduction().catch((err) => {
  console.error('QA Error:', err);
  process.exit(1);
});
