const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const DOCUMENTS_DIR = path.join(__dirname, '..', 'public', 'documents');

async function createEpubCotsongCo() {
  const zip = new JSZip();

  // 1. mimetype (không nén)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  zip.folder('META-INF').file(
    'container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  // 3. OEBPS files
  const oebps = zip.folder('OEBPS');

  oebps.file(
    'content.opf',
    `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Cẩm Nang Đốt Sống Cổ &amp; Vai Gáy (EPUB Chuẩn)</dc:title>
    <dc:creator>Dr. Tùng</dc:creator>
    <dc:language>vi</dc:language>
    <dc:identifier id="BookId">urn:uuid:qbiz-ebook-cotsong-co-epub</dc:identifier>
  </metadata>
  <manifest>
    <item id="chapter1" href="chapter1.html" media-type="application/xhtml+xml"/>
    <item id="chapter2" href="chapter2.html" media-type="application/xhtml+xml"/>
    <item id="chapter3" href="chapter3.html" media-type="application/xhtml+xml"/>
    <item id="chapter4" href="chapter4.html" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="chapter1"/>
    <itemref idref="chapter2"/>
    <itemref idref="chapter3"/>
    <itemref idref="chapter4"/>
  </spine>
</package>`
  );

  oebps.file(
    'chapter1.html',
    `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>Chương 1: Giải Phẫu 7 Đốt Sống Cổ C1-C7</title>
  <style>
    body { font-family: sans-serif; line-height: 1.7; padding: 1.5rem; color: #1e1e1e; }
    h1 { color: #854d0e; font-size: 1.5rem; border-bottom: 2px solid #fef08a; padding-bottom: 0.5rem; }
    p { margin-bottom: 1rem; text-align: justify; }
    .highlight { background: #fef9c3; padding: 0.2rem 0.4rem; border-radius: 4px; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Chương 1: Giải Phẫu 7 Đốt Sống Cổ C1-C7</h1>
  <p>Cột sống cổ gồm <strong>7 đốt sống</strong> ký hiệu từ <strong>C1 đến C7</strong>, tạo thành đường cong ưỡn sinh lý tự nhiên hướng ra phía trước.</p>
  <p>Đốt đội <strong>C1 (Atlas)</strong> nâng đỡ toàn bộ khối lượng hộp sọ, tiếp nối với đốt trục <strong>C2 (Axis)</strong> thông qua mỏm răng, cho phép đầu xoay linh hoạt sang hai bên.</p>
  <p class="highlight">Đặc điểm sinh học: Khi đầu ở vị trí thẳng trục 0 độ, trọng lượng tác động lên cổ khoảng 5 kg. Nhưng khi bạn cúi gập 45-60 độ lướt điện thoại, áp lực lên các đĩa đệm cổ tăng vọt lên tới 27 kg!</p>
</body>
</html>`
  );

  oebps.file(
    'chapter2.html',
    `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>Chương 2: Cơ Chế Chèn Ép Rễ Thần Kinh & Tê Bì Tay</title>
  <style>
    body { font-family: sans-serif; line-height: 1.7; padding: 1.5rem; color: #1e1e1e; }
    h1 { color: #854d0e; font-size: 1.5rem; border-bottom: 2px solid #fef08a; padding-bottom: 0.5rem; }
    p { margin-bottom: 1rem; text-align: justify; }
    ul { margin-bottom: 1rem; padding-left: 1.5rem; }
    li { margin-bottom: 0.5rem; }
  </style>
</head>
<body>
  <h1>Chương 2: Cơ Chế Chèn Ép Rễ Thần Kinh & Tê Bì Tay</h1>
  <p>Đám rối thần kinh cánh tay xuất phát từ các rễ thần kinh tủy sống cổ <strong>C5, C6, C7, C8</strong> và ngực <strong>T1</strong>:</p>
  <ul>
    <li><strong>Rễ C5 - C6:</strong> Chi phối cảm giác và vận động cho cơ delta, khớp vai và bờ ngoài cẳng tay đến ngón tay cái.</li>
    <li><strong>Rễ C7:</strong> Chi phối cơ tam đầu cánh tay và cảm giác mặt mu của ngón trỏ, ngón giữa.</li>
    <li><strong>Rễ C8:</strong> Chi phối cảm giác mép trong bàn tay và hai ngón út - áp út.</li>
  </ul>
  <p>Khi thoái hóa đĩa đệm C5-C6 hoặc C6-C7 gây thoát vị, lỗ ghép bị thu hẹp chèn ép trực tiếp rễ thần kinh, gây nên hội chứng đau nhói lan dọc cánh tay và tê bì các đầu ngón tay.</p>
</body>
</html>`
  );

  oebps.file(
    'chapter3.html',
    `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>Chương 3: Quy Tắc Công Thái Học & Tư Thế Vàng</title>
  <style>
    body { font-family: sans-serif; line-height: 1.7; padding: 1.5rem; color: #1e1e1e; }
    h1 { color: #854d0e; font-size: 1.5rem; border-bottom: 2px solid #fef08a; padding-bottom: 0.5rem; }
    p { margin-bottom: 1rem; text-align: justify; }
    .box { border-left: 4px solid #ca8a04; background: #fefce8; padding: 0.8rem; margin: 1rem 0; border-radius: 0 8px 8px 0; }
  </style>
</head>
<body>
  <h1>Chương 3: Quy Tắc Công Thái Học & Tư Thế Vàng</h1>
  <div class="box">
    <strong>Quy tắc 20-20-20:</strong> Cứ sau 20 phút ngồi làm việc trước màn hình, hãy nhìn xa 20 feet (6 mét) trong 20 giây và thực hiện 3 nhịp xoay vươn cằm giải nén cổ gáy.
  </div>
  <p>1. <strong>Nâng màn hình ngang tầm mắt:</strong> Trọng tâm mắt thẳng vào 1/3 trên của màn hình để giữ góc nhìn tự nhiên 0-15 độ.</p>
  <p>2. <strong>Chọn gối ngủ đúng độ cao:</strong> Gối quá cao làm gập cổ, gối quá thấp làm ngửa cổ quá mức. Chiều cao gối lý tưởng từ 8-10 cm khi nằm ngửa và nâng đỡ kín khoảng lõm sau gáy.</p>
</body>
</html>`
  );

  oebps.file(
    'chapter4.html',
    `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>Chương 4: Dinh Dưỡng Nuôi Dưỡng Bao Hoạt Dịch Đốt Sống</title>
  <style>
    body { font-family: sans-serif; line-height: 1.7; padding: 1.5rem; color: #1e1e1e; }
    h1 { color: #854d0e; font-size: 1.5rem; border-bottom: 2px solid #fef08a; padding-bottom: 0.5rem; }
    p { margin-bottom: 1rem; text-align: justify; }
  </style>
</head>
<body>
  <h1>Chương 4: Dinh Dưỡng Nuôi Dưỡng Bao Hoạt Dịch Đốt Sống</h1>
  <p>Các đĩa đệm đốt sống cổ là cấu trúc vô mạch ở người trưởng thành, hoàn toàn thẩm thấu dưỡng chất từ dịch mô bao quanh thông qua các tấm sụn tận cùng.</p>
  <p>Để duy trì độ ngậm nước của nhân nhầy và tính đàn hồi của vòng sợi collagen, cơ thể cần:</p>
  <p>• <strong>Bổ sung đủ nước từng ngụm nhỏ</strong> phân bổ đều trong ngày.</p>
  <p>• <strong>Collagen Type II không biến tính</strong> kết hợp Glucosamine và Chondroitin sinh học tự nhiên.</p>
  <p>• <strong>Magie và Vitamin B-Complex</strong> (B1, B6, B12) giúp dẫn truyền xung thần kinh ổn định và giảm các cơn co thắt cơ cổ thang mạn tính.</p>
</body>
</html>`
  );

  const content = await zip.generateAsync({ type: 'nodebuffer' });
  const targetPath = path.join(DOCUMENTS_DIR, 'cam_nang_dot_song_co_vai_gay.epub');
  fs.writeFileSync(targetPath, content);
  console.log('✅ Đã tạo thành công EPUB 1:', targetPath, `(${content.length} bytes)`);
}

async function createEpubDinhDuong() {
  const zip = new JSZip();

  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.folder('META-INF').file(
    'container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  const oebps = zip.folder('OEBPS');
  oebps.file(
    'content.opf',
    `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Dinh Dưỡng Phục Hồi Khớp &amp; Đĩa Đệm (EPUB Chuẩn)</dc:title>
    <dc:creator>Dr. Tùng</dc:creator>
    <dc:language>vi</dc:language>
    <dc:identifier id="BookId">urn:uuid:qbiz-ebook-dinhduong-epub</dc:identifier>
  </metadata>
  <manifest>
    <item id="chapter1" href="chapter1.html" media-type="application/xhtml+xml"/>
    <item id="chapter2" href="chapter2.html" media-type="application/xhtml+xml"/>
    <item id="chapter3" href="chapter3.html" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="chapter1"/>
    <itemref idref="chapter2"/>
    <itemref idref="chapter3"/>
  </spine>
</package>`
  );

  oebps.file(
    'chapter1.html',
    `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>Chương 1: Sinh Hóa Tế Bào Sụn Khớp</title>
  <style>body { font-family: sans-serif; line-height: 1.7; padding: 1.5rem; color: #1e1e1e; } h1 { color: #047857; font-size: 1.5rem; border-bottom: 2px solid #a7f3d0; padding-bottom: 0.5rem; } p { margin-bottom: 1rem; }</style>
</head>
<body>
  <h1>Chương 1: Sinh Hóa Tế Bào Sụn Khớp</h1>
  <p>Sụn khớp là mô liên kết chuyên biệt được cấu tạo từ 3 thành phần chính: <strong>Nước (chiếm 65-80%)</strong>, <strong>Collagen Type II (tạo khung giàn chịu lực)</strong> và <strong>Proteoglycan (giữ nước)</strong>.</p>
  <p>Các tế bào sụn (chondrocyte) liên tục trải qua quá trình đồng hóa (tổng hợp mô mới) và dị hóa (phân hủy chất nền cũ). Khi ngọn lửa viêm bùng phát, các enzyme metalloproteinase phá hủy cấu trúc sụn nhanh hơn tốc độ tự tái tạo.</p>
</body>
</html>`
  );

  oebps.file(
    'chapter2.html',
    `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>Chương 2: Thực Đơn Kháng Viêm Tự Nhiên</title>
  <style>body { font-family: sans-serif; line-height: 1.7; padding: 1.5rem; color: #1e1e1e; } h1 { color: #047857; font-size: 1.5rem; border-bottom: 2px solid #a7f3d0; padding-bottom: 0.5rem; } p { margin-bottom: 1rem; }</style>
</head>
<body>
  <h1>Chương 2: Thực Đơn Kháng Viêm Tự Nhiên</h1>
  <p>Dập tắt ngọn lửa viêm âm ỉ bằng các hoạt chất kháng viêm sinh học nguồn gốc thực vật:</p>
  <p>• <strong>Curcumin từ nghệ vàng:</strong> Ức chế hoạt động của phân tử NF-kB – chất kích hoạt phản ứng viêm khớp.</p>
  <p>• <strong>Omega-3 EPA/DHA:</strong> Cạnh tranh với axit arachidonic, chuyển hóa thành resolvin và protectin giúp làm dịu sưng tấy.</p>
  <p>• <strong>Gừng và Quả mọng (Berries):</strong> Giàu anthocyanin và gingerol chống oxy hóa màng sụn.</p>
</body>
</html>`
  );

  oebps.file(
    'chapter3.html',
    `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>Chương 3: Cấp Nước Tế Bào & Khoáng Chất Vi Lượng</title>
  <style>body { font-family: sans-serif; line-height: 1.7; padding: 1.5rem; color: #1e1e1e; } h1 { color: #047857; font-size: 1.5rem; border-bottom: 2px solid #a7f3d0; padding-bottom: 0.5rem; } p { margin-bottom: 1rem; }</style>
</head>
<body>
  <h1>Chương 3: Cấp Nước Tế Bào & Khoáng Chất Vi Lượng</h1>
  <p>Nước tinh khiết giàu khoáng chất vi lượng (Magie, Kẽm, Silic sinh học) giúp kích hoạt enzyme tổng hợp glycosaminoglycan. Uống đủ 0.04L nước trên mỗi kg trọng lượng cơ thể mỗi ngày để đĩa đệm luôn giữ được độ đàn hồi tối đa.</p>
</body>
</html>`
  );

  const content = await zip.generateAsync({ type: 'nodebuffer' });
  const targetPath = path.join(DOCUMENTS_DIR, 'dinh_duong_phuc_hoi_khop_va_dia_dem.epub');
  fs.writeFileSync(targetPath, content);
  console.log('✅ Đã tạo thành công EPUB 2:', targetPath, `(${content.length} bytes)`);
}

async function createCbzAtlas() {
  const zip = new JSZip();

  const coverFiles = [
    'cover_atlas_y_khoa_toan_dien.png',
    'cover_cot-song.png',
    'bang_tra_cuu_re_than_kinh_cot_song.png',
    'cover_dinh-duong.png',
    'cover_tieu-hoa.png',
    'cover_nuoc.png',
    'cover_tu_chua_lanh_lung_co.png',
    'cover_cam_nang_dot_song_co.png',
    'back_cover_atlas_y_khoa_toan_dien.png',
  ];

  let addedCount = 0;
  for (let i = 0; i < coverFiles.length; i++) {
    const filename = coverFiles[i];
    let filePath = path.join(DOCUMENTS_DIR, 'covers', filename);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(DOCUMENTS_DIR, filename);
    }

    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      const pageName = `page_${String(i + 1).padStart(2, '0')}.png`;
      zip.file(pageName, buffer);
      addedCount++;
    }
  }

  const content = await zip.generateAsync({ type: 'nodebuffer' });
  const targetPath = path.join(DOCUMENTS_DIR, 'atlas_giai_phau_hinh_anh_3d.cbz');
  fs.writeFileSync(targetPath, content);
  console.log(`✅ Đã tạo thành công CBZ (${addedCount} trang):`, targetPath, `(${content.length} bytes)`);
}

async function main() {
  console.log('Bắt đầu tạo các định dạng sách Ebook mẫu chuẩn (EPUB, CBZ)...');
  await createEpubCotsongCo();
  await createEpubDinhDuong();
  await createCbzAtlas();
  console.log('Hoàn thành toàn bộ định dạng sách Ebook!');
}

main().catch(console.error);
