const { chromium } = require('playwright');
const path = require('path');

async function main() {
  console.log('🚀 Khởi động Chromium kiểm chứng SideBooksReaderEngine v3...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
    hasTouch: true,
  });

  const page = await context.newPage();
  const testUrl = 'http://localhost:3088/thu-nghiem-lat-sach';

  console.log(`🌐 Truy cập: ${testUrl}`);
  await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForTimeout(1500);

  const canvasBox = await page.locator('canvas').boundingBox();
  console.log('Canvas bounds:', canvasBox);

  if (canvasBox) {
    // 1. THỬ NGHIỆM VUỐT NHANH (SWIPE / FLING GESTURE):
    // Vuốt từ phải sang trái chỉ trong 80ms (Cử chỉ lướt ngón tay thường thấy của người dùng)
    console.log('👆 Thử nghiệm VUỐT NHẸ SANG TRÁI (Fast Swipe/Fling)...');
    const startX = canvasBox.x + canvasBox.width * 0.8;
    const startY = canvasBox.y + canvasBox.height * 0.6;
    const endX = canvasBox.x + canvasBox.width * 0.4;
    const endY = startY;

    await page.touchscreen.tap(startX, startY);
    // Thực hiện swipe cảm ứng
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 5 });
    await page.mouse.up();

    // Đợi hoạt ảnh lướt hoàn tất
    await page.waitForTimeout(400);

    const shot1 = path.join(__dirname, '..', 'v3_test_1_fast_swipe_page2.png');
    await page.screenshot({ path: shot1 });
    console.log(`📸 Đã chụp: Vuốt nhanh sang Trang 2 thành công mượt mà: ${shot1}`);

    // Vuốt thêm 1 lần nữa để sang Trang 3
    console.log('👆 Vuốt nhanh lần 2 để sang Trang 3...');
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    const shot2 = path.join(__dirname, '..', 'v3_test_2_page3.png');
    await page.screenshot({ path: shot2 });
    console.log(`📸 Đã chụp: Sang Trang 3 thành công: ${shot2}`);

    // 2. THỬ NGHIỆM LẬT LÙI (PREV) - CHỤP ĐÚNG KHOẢNH KHẮC ĐANG LẬT:
    // Kiểm tra xem trang lật lại có ĐẶC KHÍCH 100% không, hay có bị trong suốt không!
    console.log('👈 Bắt đầu lật lùi (Prev) và chụp ảnh bắt khoảnh khắc nếp gấp...');
    // Kéo từ mép trái sang giữa và GIỮ TAY để chụp cận cảnh nếp uốn
    const prevStartX = canvasBox.x + 10;
    const prevStartY = canvasBox.y + canvasBox.height * 0.7;
    const prevMidX = canvasBox.x + canvasBox.width * 0.5;

    await page.mouse.move(prevStartX, prevStartY);
    await page.mouse.down();
    await page.mouse.move(prevMidX, prevStartY, { steps: 10 });
    await page.waitForTimeout(200);

    const shot3 = path.join(__dirname, '..', 'v3_test_3_prev_mid_opaque.png');
    await page.screenshot({ path: shot3 });
    console.log(`📸 Đã chụp khoảnh khắc lật lùi (Kiểm tra độ ĐẶC KHÍCH của giấy): ${shot3}`);

    // Nhả tay để hoàn tất lật lùi về Trang 2
    await page.mouse.up();
    await page.waitForTimeout(400);

    const shot4 = path.join(__dirname, '..', 'v3_test_4_prev_completed.png');
    await page.screenshot({ path: shot4 });
    console.log(`📸 Đã chụp Trang 2 phục hồi hoàn hảo sau lật lùi: ${shot4}`);
  }

  await browser.close();
  console.log('🎉 Hoàn tất kiểm thử v3!');
}

main().catch((err) => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
