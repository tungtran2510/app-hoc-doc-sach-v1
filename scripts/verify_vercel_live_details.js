const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
  });
  const page = await context.newPage();
  const dir = 'C:/Users/Admin/.gemini/antigravity/brain/5a2f97b4-0aae-45d0-b12e-387a90cefcdf';

  // 1. Settings modal on Home (4 Bookshelf themes)
  console.log('1. Settings modal on Vercel home...');
  await page.goto('https://qbiz-ebook.vercel.app/?t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  const settingsBtn = await page.$('button[title*="Cài đặt"], button:has(svg.lucide-settings)');
  if (settingsBtn) {
    await settingsBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${dir}/vercel_live_05_settings_themes.png` });
  }

  // 2. Online book search tab
  console.log('2. Online books tab on Vercel tim-kiem...');
  await page.goto('https://qbiz-ebook.vercel.app/tim-kiem?t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  const onlineTab = await page.$('button:has-text("Sách trực tuyến")');
  if (onlineTab) {
    await onlineTab.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${dir}/vercel_live_06_online_store.png` });
  }

  await browser.close();
  console.log('Detailed Vercel screenshots completed!');
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
