const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
  });
  const page = await context.newPage();
  const dir = 'C:/Users/Admin/.gemini/antigravity/brain/5a2f97b4-0aae-45d0-b12e-387a90cefcdf';

  console.log('1. Navigating to Vercel home...');
  await page.goto('https://qbiz-ebook.vercel.app/?t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${dir}/vercel_live_01_home.png` });

  console.log('2. Click mini shelf...');
  const miniBtn = await page.$('button[title*="Mini"]');
  if (miniBtn) {
    await miniBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${dir}/vercel_live_02_home_mini.png` });
  }

  console.log('3. Navigating to Vercel Da Luu...');
  await page.goto('https://qbiz-ebook.vercel.app/da-luu?t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${dir}/vercel_live_03_da_luu.png` });

  console.log('4. Navigating to Vercel Tim Kiem...');
  await page.goto('https://qbiz-ebook.vercel.app/tim-kiem?t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${dir}/vercel_live_04_tim_kiem.png` });

  await browser.close();
  console.log('All Vercel screenshots captured successfully!');
})().catch(err => {
  console.error('Error during Vercel screenshot verification:', err);
  process.exit(1);
});
