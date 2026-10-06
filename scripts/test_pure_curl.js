const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();

  // HTML page with our pure single-page conical curl engine
  await page.setContent(`
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #12161f; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; overflow: hidden; }
    canvas { display: block; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); border-radius: 4px; }
  </style>
</head>
<body>
  <canvas id="c" width="760" height="1075" style="width: 380px; height: 537px;"></canvas>
  <script>
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');
    const dpr = 2;
    const W = 380;
    const H = 537;

    const img1 = new Image();
    img1.src = 'http://localhost:3088/documents/covers/cover_hieu_dung_ve_cot_song.png';
    const img2 = new Image();
    img2.src = 'http://localhost:3088/documents/covers/cover_atlas_y_khoa_toan_dien.png';
    window.img1 = img1;
    window.img2 = img2;

    function drawFitted(image) {
      if (!image.complete) return;
      const imgRatio = image.naturalWidth / image.naturalHeight;
      const targetRatio = W / H;
      let rW = W, rH = H, ox = 0, oy = 0;
      if (imgRatio > targetRatio) {
        rH = W / imgRatio;
        oy = (H - rH) / 2;
      } else {
        rW = H * imgRatio;
        ox = (W - rW) / 2;
      }
      ctx.drawImage(image, ox, oy, rW, rH);
    }

    /**
     * Thuật toán vẽ lật trang đơn 3D Conical Curl hoàn mỹ:
     * @param {HTMLImageElement} curImg - Trang hiện tại
     * @param {HTMLImageElement} otherImg - Trang kế tiếp (hoặc trang trước)
     * @param {'next'|'prev'} dir - Hướng lật
     * @param {number} p - Tiến trình từ 0 (chưa lật) đến 1 (lật xong)
     * @param {boolean} isBottomCorner - Lật từ góc dưới hay góc trên
     */
    window.renderSinglePageCurl = function(curImg, otherImg, dir, p, isBottomCorner) {
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, W, H);

      // Nếu p <= 0: vẽ curImg tĩnh
      if (p <= 0.001) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        drawFitted(curImg);
        ctx.restore();
        return;
      }

      // Nếu p >= 0.999: vẽ otherImg tĩnh
      if (p >= 0.999) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        drawFitted(otherImg);
        ctx.restore();
        return;
      }

      // =======================================================================
      // TRƯỜNG HỢP 1: LẬT TIẾP (NEXT) - Cuộn từ góc phải sang trái
      // Trang curImg ở trên bị bóc đi, trang otherImg ở dưới lộ ra
      // =======================================================================
      if (dir === 'next') {
        // 1. LỚP ĐÁY: Trang đích (otherImg) NGUYÊN VẸN 100%
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        drawFitted(otherImg);

        // Điểm góc bị kéo P(px, py)
        // Khi p = 0: px = W. Khi p = 1: px = -W * 0.3
        const px = W - p * (W * 1.35);
        const py = isBottomCorner ? H - p * (H * 0.45) : p * (H * 0.45);
        const cornerX = W;
        const cornerY = isBottomCorner ? H : 0;

        // Điểm trung điểm M trên nếp gấp
        const mx = (cornerX + px) / 2;
        const my = (cornerY + py) / 2;

        // Vector từ corner tới P
        const vx = px - cornerX;
        const vy = py - cornerY;
        const vLen = Math.sqrt(vx * vx + vy * vy);
        // Vector pháp tuyến của nếp uốn
        const nx = -vy / vLen;
        const ny = vx / vLen;

        // Góc nghiêng của nếp uốn
        const foldAngle = Math.atan2(ny, nx);

        // 2. VẼ PHẦN PHẲNG CỦA TRANG HIỆN TẠI (curImg) - Vùng chưa bị bóc (bên trái nếp gấp)
        ctx.save();
        ctx.beginPath();
        // Vùng clip nửa mặt phẳng chứa điểm (0, 0)
        // Nếp gấp là đường thẳng đi qua M với vector chỉ phương (nx, ny)
        const L = W + H;
        const x1 = mx - nx * L;
        const y1 = my - ny * L;
        const x2 = mx + nx * L;
        const y2 = my + ny * L;

        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        // Khép góc bao phủ toàn bộ phần bên trái
        ctx.lineTo(0, isBottomCorner ? H : 0);
        ctx.lineTo(0, isBottomCorner ? 0 : H);
        ctx.lineTo(x1, isBottomCorner ? 0 : H);
        ctx.closePath();
        ctx.clip();

        // Vẽ trang hiện tại
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        drawFitted(curImg);
        ctx.restore();

        // 3. BÓNG ĐỔ CỦA NẾP UỐN LÊN TRANG DƯỚI (Drop Shadow)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(W, y2);
        ctx.lineTo(W, y1);
        ctx.closePath();
        ctx.clip();

        ctx.translate(mx, my);
        ctx.rotate(foldAngle);
        const shadowGrad = ctx.createLinearGradient(0, 0, -50, 0);
        shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
        shadowGrad.addColorStop(0.3, 'rgba(0, 0, 0, 0.18)');
        shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = shadowGrad;
        ctx.fillRect(-60, -L, 60, 2 * L);
        ctx.restore();

        // 4. MẶT LƯNG CỦA GÓC CUỘN 3D (Curled Flap)
        // Flap này là hình phản chiếu của góc giấy qua nếp gấp
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(px, py);
        ctx.closePath();
        ctx.clip();

        // Nền giấy dày dặn của mặt lưng
        ctx.fillStyle = '#faf9f5';
        ctx.fillRect(0, 0, W, H);

        // Vẽ nội dung phản chiếu của trang bị lật ngược
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(foldAngle);
        ctx.scale(-1, 1);
        ctx.rotate(-foldAngle);
        ctx.translate(-mx, -my);
        ctx.globalAlpha = 0.22;
        drawFitted(curImg);
        ctx.restore();

        // 5. HIỆU ỨNG ÁNH SÁNG NẾP UỐN HÌNH TRỤ 3D (Cylindrical Lighting & Shading)
        ctx.translate(mx, my);
        ctx.rotate(foldAngle);
        const foldShading = ctx.createLinearGradient(0, 0, 45, 0);
        foldShading.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
        foldShading.addColorStop(0.15, 'rgba(0, 0, 0, 0.08)');
        foldShading.addColorStop(0.48, 'rgba(255, 255, 255, 0.75)'); // Vệt sáng sống giấy
        foldShading.addColorStop(0.85, 'rgba(0, 0, 0, 0.1)');
        foldShading.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
        ctx.fillStyle = foldShading;
        ctx.fillRect(0, -L, 45, 2 * L);

        ctx.restore();
      }

      // =======================================================================
      // TRƯỜNG HỢP 2: LẬT LÙI (PREV) - Cuộn từ góc trái sang phải phủ kín trang
      // otherImg (trang trước) trải từ trái sang phải, đè lên curImg
      // =======================================================================
      else {
        // 1. LỚP ĐÁY: Trang hiện tại (curImg) NẰM YÊN Ở ĐÁY
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        drawFitted(curImg);

        // Tiến trình lật lùi: Điểm P(px, py) di chuyển từ trái sang phải
        // Khi p = 0: px = 0. Khi p = 1: px = W * 1.3
        const px = p * (W * 1.35);
        const py = isBottomCorner ? H - (1 - p) * (H * 0.45) : (1 - p) * (H * 0.45);
        const cornerX = 0;
        const cornerY = isBottomCorner ? H : 0;

        const mx = (cornerX + px) / 2;
        const my = (cornerY + py) / 2;

        const vx = px - cornerX;
        const vy = py - cornerY;
        const vLen = Math.sqrt(vx * vx + vy * vy);
        const nx = -vy / vLen;
        const ny = vx / vLen;
        const foldAngle = Math.atan2(ny, nx);

        const L = W + H;
        const x1 = mx - nx * L;
        const y1 = my - ny * L;
        const x2 = mx + nx * L;
        const y2 = my + ny * L;

        // 2. VẼ PHẦN PHẲNG CỦA TRANG TRƯỚC (otherImg) - Vùng bên trái nếp gấp (ĐẶC 100%)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(0, isBottomCorner ? H : 0);
        ctx.lineTo(0, isBottomCorner ? 0 : H);
        ctx.lineTo(x1, isBottomCorner ? 0 : H);
        ctx.closePath();
        ctx.clip();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        drawFitted(otherImg);
        ctx.restore();

        // 3. BÓNG ĐỔ CỦA TRANG TRƯỚC SANG PHẢI NẾP GẤP LÊN TRANG ĐÁY
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(W, y2);
        ctx.lineTo(W, y1);
        ctx.closePath();
        ctx.clip();

        ctx.translate(mx, my);
        ctx.rotate(foldAngle);
        const sGrad = ctx.createLinearGradient(0, 0, 50, 0);
        sGrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
        sGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.15)');
        sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = sGrad;
        ctx.fillRect(0, -L, 60, 2 * L);
        ctx.restore();

        // 4. MẶT LƯNG CỦA TRANG TRƯỚC ĐANG UỐN CONG SANG PHẢI
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(px, py);
        ctx.closePath();
        ctx.clip();

        ctx.fillStyle = '#faf9f5';
        ctx.fillRect(0, 0, W, H);

        // Ánh sáng sống uốn cong
        ctx.translate(mx, my);
        ctx.rotate(foldAngle);
        const foldShading = ctx.createLinearGradient(-45, 0, 0, 0);
        foldShading.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
        foldShading.addColorStop(0.52, 'rgba(255, 255, 255, 0.75)');
        foldShading.addColorStop(0.85, 'rgba(0, 0, 0, 0.08)');
        foldShading.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        ctx.fillStyle = foldShading;
        ctx.fillRect(-45, -L, 45, 2 * L);
        ctx.restore();
      }

      ctx.restore();
    };
  </script>
</body>
</html>
  `);

  await page.waitForTimeout(1000);

  // Test Next at p = 0.15, 0.4, 0.7
  for (const p of [0.15, 0.4, 0.7]) {
    await page.evaluate((val) => {
      window.renderSinglePageCurl(window.img1, window.img2, 'next', val, true);
    }, p);
    await page.waitForTimeout(50);
    await page.screenshot({ path: `pure_next_p_${Math.round(p * 100)}.png` });
  }

  // Test Prev at p = 0.15, 0.4, 0.7
  for (const p of [0.15, 0.4, 0.7]) {
    await page.evaluate((val) => {
      window.renderSinglePageCurl(window.img2, window.img1, 'prev', val, true);
    }, p);
    await page.waitForTimeout(50);
    await page.screenshot({ path: `pure_prev_p_${Math.round(p * 100)}.png` });
  }

  await browser.close();
  console.log('Pure curl tests completed!');
})();
