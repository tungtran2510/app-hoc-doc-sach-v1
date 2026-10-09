const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function createTestEpubs() {
  const outDir = path.join(__dirname, '..', 'public', 'test_epubs');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Tạo EPUB nhiễm mã độc (XSS test)
  const zipXss = new JSZip();
  zipXss.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zipXss.file('META-INF/container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  zipXss.file('OEBPS/content.opf', `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Sách Kiểm Thử XSS Độc Hại</dc:title>
    <dc:creator>Hacker Test</dc:creator>
  </metadata>
  <manifest>
    <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="ch1"/>
  </spine>
</package>`);

  zipXss.file('OEBPS/chapter1.xhtml', `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chương 1 Độc Hại</title></head>
<body>
  <h1>Chương 1: Kiểm thử tấn công XSS</h1>
  <script>window.__xss_fired = true; alert('XSS_SCRIPT');</script>
  <iframe src="http://evil.example.com"></iframe>
  <p>Văn bản bình thường trong sách.</p>
  <img src="invalid_path.jpg" onerror="window.__onerror_fired = true; alert('XSS_IMG');" alt="Ảnh lỗi" />
  <a href="javascript:alert('XSS_HREF')">Bấm vào đây để nhận thưởng</a>
</body>
</html>`);

  const xssBuffer = await zipXss.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(path.join(outDir, 'xss_malicious.epub'), xssBuffer);
  console.log('✅ Đã tạo file: public/test_epubs/xss_malicious.epub');

  // 2. Tạo EPUB sạch có hình ảnh (Kiểm tra bảo toàn Blob URL)
  const zipClean = new JSZip();
  zipClean.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zipClean.file('META-INF/container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  zipClean.file('OEBPS/content.opf', `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Sách Chuẩn Có Hình Ảnh Minh Họa</dc:title>
    <dc:creator>Tác giả Y Khoa</dc:creator>
  </metadata>
  <manifest>
    <item id="cover" href="images/cover.png" media-type="image/png"/>
    <item id="fig1" href="images/spine.png" media-type="image/png"/>
    <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="ch1"/>
  </spine>
</package>`);

  // Tạo ảnh PNG 1x1 pixel hợp lệ base64
  const png1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  zipClean.file('OEBPS/images/cover.png', png1x1);
  zipClean.file('OEBPS/images/spine.png', png1x1);

  zipClean.file('OEBPS/chapter1.xhtml', `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chương 1: Cấu tạo cột sống</title></head>
<body>
  <h1>Chương 1: Cấu tạo cột sống</h1>
  <p style="color: #2D3748; line-height: 1.6;">Cột sống là trục đỡ chính của cơ thể, bao gồm các đốt sống xếp chồng lên nhau.</p>
  <img src="images/spine.png" alt="Sơ đồ cột sống" width="300" height="300" style="max-width: 100%;" />
  <p>Hình ảnh minh họa cấu trúc đốt sống và đĩa đệm.</p>
</body>
</html>`);

  const cleanBuffer = await zipClean.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(path.join(outDir, 'clean_with_image.epub'), cleanBuffer);
  console.log('✅ Đã tạo file: public/test_epubs/clean_with_image.epub');
}

createTestEpubs().catch(console.error);
