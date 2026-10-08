const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const COVERS_DIR = path.join(__dirname, '..', 'public', 'documents', 'covers');
if (!fs.existsSync(COVERS_DIR)) {
  fs.mkdirSync(COVERS_DIR, { recursive: true });
}

const coversToCreate = [
  {
    fileName: 'cover_dinh_duong_hoc_that_truyen.png',
    bgGradient: 'radial-gradient(circle at 50% 25%, #7f1d1d 0%, #450a0a 60%, #1c0505 100%)',
    goldAccent: '#f59e0b',
    borderCol: '#d97706',
    author: 'TIẾN SĨ, BÁC SĨ VƯƠNG ĐÀO',
    authorSub: 'DR. WANG TAO · ĐẠI HỌC Y KHOA TOKYO',
    title: 'DINH DƯỠNG HỌC\nBỊ THẤT TRUYỀN',
    subTitle: 'ĐẨY LÙI BỆNH TẬT',
    description: 'Năng lực tự chữa lành kỳ diệu của cơ thể và cơ chế đẩy lùi bệnh lý mạn tính bằng dinh dưỡng tế bào.',
    badge: 'TỦ SÁCH DINH DƯỠNG KINH ĐIỂN',
    extraBadge: 'BEST-SELLER Y HỌC'
  },
  {
    fileName: 'cover_nhan_to_enzyme.png',
    bgGradient: 'radial-gradient(circle at 50% 25%, #064e3b 0%, #022c22 60%, #01140e 100%)',
    goldAccent: '#34d399',
    borderCol: '#059669',
    author: 'BÁC SĨ HIROMI SHINYA',
    authorSub: 'GIÁO SƯ ĐẠI HỌC Y ALBERT EINSTEIN NEW YORK',
    title: 'NHÂN TỐ\nENZYME',
    subTitle: 'PHƯƠNG THỨC SỐNG LÀNH MẠNH',
    description: 'Phương pháp bảo tồn Miracle Enzyme giúp trẻ hóa tế bào, sống thọ và miễn nhiễm bệnh tật.',
    badge: 'HƠN 2 TRIỆU BẢN ĐÃ BÁN',
    extraBadge: 'Y HỌC NHẬT BẢN'
  },
  {
    fileName: 'cover_y_hoc_dinh_duong.png',
    bgGradient: 'radial-gradient(circle at 50% 25%, #1e1b4b 0%, #0f172a 60%, #020617 100%)',
    goldAccent: '#38bdf8',
    borderCol: '#0284c7',
    author: 'BÁC SĨ RAY D. STRAND',
    authorSub: 'CHUYÊN GIA Y HỌC DỰ PHÒNG HOA KỲ',
    title: 'Y HỌC\nDINH DƯỠNG',
    subTitle: 'NHỮNG ĐIỀU BÁC SĨ KHÔNG NÓI VỚI BẠN',
    description: 'Bảo vệ màng tế bào trước stress oxy hóa và gốc tự do bằng mạng lưới vi chất tự nhiên.',
    badge: 'Y HỌC DỰ PHÒNG HOA KỲ',
    extraBadge: 'NEW YORK TIMES BESTSELLER'
  },
  {
    fileName: 'cover_china_study.png',
    bgGradient: 'radial-gradient(circle at 50% 25%, #701a75 0%, #4a044e 60%, #2e0854 100%)',
    goldAccent: '#f472b6',
    borderCol: '#c026d3',
    author: 'TS. T. COLIN CAMPBELL',
    authorSub: 'GIÁO SƯ DANH DỰ ĐẠI HỌC CORNELL',
    title: 'BÍ MẬT DINH DƯỠNG\nCHO SỨC KHỎE',
    subTitle: 'THE CHINA STUDY',
    description: 'Nghiên cứu quy mô lớn nhất lịch sử về mối liên hệ giữa chế độ ăn thực vật và bệnh mãn tính.',
    badge: 'CÔNG TRÌNH THẾ KỶ',
    extraBadge: 'THE CHINA STUDY'
  },
  {
    fileName: 'cover_co_the_tu_chua_lanh.png',
    bgGradient: 'radial-gradient(circle at 50% 25%, #134e4a 0%, #042f2e 60%, #021a19 100%)',
    goldAccent: '#2dd4bf',
    borderCol: '#0d9488',
    author: 'ANTHONY WILLIAM',
    authorSub: 'MEDICAL MEDIUM · NEW YORK TIMES BESTSELLER',
    title: 'CƠ THỂ\nTỰ CHỮA LÀNH',
    subTitle: 'THỰC PHẨM PHỤC HỒI NĂNG LƯỢNG',
    description: 'Thanh lọc gan mật, làm dịu hệ miễn dịch và phục hồi sức sống tự nhiên từ trái cây và thảo dược.',
    badge: 'MEDICAL MEDIUM',
    extraBadge: 'HÀNG TRIỆU ĐỘC GIẢ'
  }
];

async function generateCovers() {
  console.log('🎨 Khởi chạy Playwright để render bìa sách HD xuất bản...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 500, height: 750 } });

  for (const item of coversToCreate) {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 500px;
      height: 750px;
      background: ${item.bgGradient};
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 38px 32px;
      position: relative;
      overflow: hidden;
    }
    .inner-border {
      position: absolute;
      inset: 14px;
      border: 1.5px solid ${item.borderCol}66;
      border-radius: 8px;
      pointer-events: none;
    }
    .corner-decor {
      position: absolute;
      width: 24px;
      height: 24px;
      border: 2.5px solid ${item.goldAccent};
    }
    .tl { top: 18px; left: 18px; border-right: none; border-bottom: none; }
    .tr { top: 18px; right: 18px; border-left: none; border-bottom: none; }
    .bl { bottom: 18px; left: 18px; border-right: none; border-top: none; }
    .br { bottom: 18px; right: 18px; border-left: none; border-top: none; }

    .top-meta {
      text-align: center;
      position: relative;
      z-index: 2;
    }
    .badge {
      display: inline-block;
      padding: 5px 14px;
      background: ${item.borderCol}33;
      border: 1px solid ${item.goldAccent}88;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: ${item.goldAccent};
      margin-bottom: 22px;
    }
    .author-name {
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #f3f4f6;
      margin-bottom: 4px;
    }
    .author-sub {
      font-size: 10.5px;
      font-weight: 500;
      letter-spacing: 1.5px;
      color: #9ca3af;
      text-transform: uppercase;
    }

    .main-title-block {
      text-align: center;
      position: relative;
      z-index: 2;
      margin: auto 0;
    }
    .divider {
      width: 60px;
      height: 2px;
      background: ${item.goldAccent};
      margin: 18px auto;
    }
    .main-title {
      font-size: 34px;
      line-height: 1.25;
      font-weight: 900;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #ffffff;
      text-shadow: 0 4px 16px rgba(0,0,0,0.8);
      white-space: pre-line;
    }
    .sub-title {
      font-size: 17px;
      font-weight: 700;
      letter-spacing: 3px;
      color: ${item.goldAccent};
      text-transform: uppercase;
      margin-top: 14px;
    }
    .desc {
      font-size: 12px;
      line-height: 1.6;
      color: #d1d5db;
      max-width: 380px;
      margin: 18px auto 0;
      text-align: center;
    }

    .bottom-meta {
      text-align: center;
      position: relative;
      z-index: 2;
      border-top: 1px solid ${item.borderCol}44;
      padding-top: 16px;
    }
    .publisher {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: ${item.goldAccent};
    }
    .extra-tag {
      font-size: 9.5px;
      color: #9ca3af;
      margin-top: 4px;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <div class="inner-border"></div>
  <div class="corner-decor tl"></div>
  <div class="corner-decor tr"></div>
  <div class="corner-decor bl"></div>
  <div class="corner-decor br"></div>

  <div class="top-meta">
    <div class="badge">${item.badge}</div>
    <div class="author-name">${item.author}</div>
    <div class="author-sub">${item.authorSub}</div>
  </div>

  <div class="main-title-block">
    <div class="divider"></div>
    <h1 class="main-title">${item.title}</h1>
    <div class="sub-title">${item.subTitle}</div>
    <div class="desc">${item.description}</div>
    <div class="divider"></div>
  </div>

  <div class="bottom-meta">
    <div class="publisher">THƯ VIỆN SÁCH ĐIỆN TỬ TRỰC TUYẾN</div>
    <div class="extra-tag">${item.extraBadge} · ẤN BẢN ĐỌC & NGHE TOÀN VĂN</div>
  </div>
</body>
</html>`;

    await page.setContent(html);
    await page.waitForTimeout(300);
    const targetPath = path.join(COVERS_DIR, item.fileName);
    await page.screenshot({ path: targetPath, type: 'png' });
    console.log(`📸 Đã tạo bìa: ${item.fileName}`);
  }

  await browser.close();
  console.log('🎉 ĐÃ HOÀN TẤT TOÀN BỘ ẢNH BÌA HD XUẤT BẢN!');
}

generateCovers();
