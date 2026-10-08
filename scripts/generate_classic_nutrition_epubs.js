const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const DOCUMENTS_DIR = path.join(__dirname, '..', 'public', 'documents');

/**
 * Helper tạo file EPUB hoàn chỉnh chuẩn IDPF EPUB 3
 */
async function createEpub({ filename, title, author, description, chapters }) {
  const zip = new JSZip();

  // 1. mimetype (bắt buộc STORE)
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

  const oebps = zip.folder('OEBPS');

  // CSS phong cách đọc sách y khoa cao cấp
  const css = `
    @charset "utf-8";
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.8;
      color: #2b2b2b;
      margin: 0;
      padding: 1.5rem;
      background: #faf8f5;
    }
    h1 {
      font-size: 1.6rem;
      color: #78350f;
      border-bottom: 2px solid #d97706;
      padding-bottom: 0.5rem;
      margin-top: 0;
      line-height: 1.4;
    }
    h2 {
      font-size: 1.3rem;
      color: #92400e;
      margin-top: 1.5rem;
      margin-bottom: 0.5rem;
    }
    h3 {
      font-size: 1.1rem;
      color: #b45309;
      margin-top: 1.2rem;
    }
    p {
      margin-bottom: 1rem;
      text-align: justify;
    }
    .lead {
      font-size: 1.08rem;
      font-weight: 500;
      color: #78350f;
      background: #fef3c7;
      padding: 1rem;
      border-left: 4px solid #f59e0b;
      border-radius: 4px;
      margin-bottom: 1.5rem;
    }
    ul, ol {
      padding-left: 1.5rem;
      margin-bottom: 1.2rem;
    }
    li {
      margin-bottom: 0.5rem;
    }
    .callout {
      padding: 1rem;
      margin: 1.5rem 0;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    .callout.tip {
      background: #ecfdf5;
      border-color: #10b981;
      color: #065f46;
    }
    .callout.warning {
      background: #fffbeb;
      border-color: #f59e0b;
      color: #92400e;
    }
    .quote-box {
      font-style: italic;
      background: #f3f4f6;
      border-left: 4px solid #6b7280;
      padding: 0.8rem 1.2rem;
      margin: 1.2rem 0;
      color: #374151;
    }
    code {
      background: #fee2e2;
      color: #991b1b;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: bold;
    }
  `;
  oebps.file('style.css', css);

  // Tạo từng xhtml
  chapters.forEach((chap) => {
    const html = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="vi" xml:lang="vi">
<head>
  <title>${chap.title}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  ${chap.content}
</body>
</html>`;
    oebps.file(`${chap.id}.xhtml`, html);
  });

  // content.opf
  const manifestItems = chapters
    .map(c => `    <item id="${c.id}" href="${c.id}.xhtml" media-type="application/xhtml+xml"/>`)
    .join('\n');
  const spineItems = chapters
    .map(c => `    <itemref idref="${c.id}"/>`)
    .join('\n');

  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${title}</dc:title>
    <dc:creator>${author}</dc:creator>
    <dc:language>vi</dc:language>
    <dc:identifier id="BookId">urn:uuid:${path.parse(filename).name}</dc:identifier>
    <dc:description>${description}</dc:description>
    <meta property="dcterms:modified">2026-10-09T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="css" href="style.css" media-type="text/css"/>
    <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>
${manifestItems}
  </manifest>
  <spine>
    <itemref idref="toc"/>
${spineItems}
  </spine>
</package>`;
  oebps.file('content.opf', contentOpf);

  // toc.xhtml
  const tocLinks = chapters
    .map(c => `      <li><a href="${c.id}.xhtml">${c.title}</a></li>`)
    .join('\n');

  const tocXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="vi" xml:lang="vi">
<head>
  <title>Mục lục - ${title}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Mục Lục Tác Phẩm</h1>
    <ol>
${tocLinks}
    </ol>
  </nav>
</body>
</html>`;
  oebps.file('toc.xhtml', tocXhtml);

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  const targetPath = path.join(DOCUMENTS_DIR, filename);
  fs.writeFileSync(targetPath, buffer);
  console.log(`✅ Đã tạo thành công EPUB: ${filename} (${buffer.length} bytes)`);
}

/**
 * 1. TẠO CUỐN SÁCH KINH ĐIỂN: DINH DƯỠNG HỌC BỊ THẤT TRUYỀN (TS. BS. VƯƠNG ĐÀO)
 */
async function generateDinhDuongHocBiThatTruyen() {
  await createEpub({
    filename: 'dinh_duong_hoc_bi_that_truyen.epub',
    title: 'Dinh Dưỡng Học Bị Thất Truyền - Đẩy Lùi Bệnh Tật',
    author: 'Tiến sĩ, Bác sĩ Vương Đào (Dr. Wang Tao)',
    description: 'Tác phẩm kinh điển về y học dinh dưỡng của Tiến sĩ Bác sĩ Vương Đào. Giải mã cơ chế tự chữa lành kỳ diệu của cơ thể và phục hồi các bệnh lý mạn tính bằng dinh dưỡng chuẩn xác.',
    chapters: [
      {
        id: 'intro',
        title: 'Lời Mở Đầu: Điều Kỳ Diệu Mang Tên Tự Chữa Lành',
        content: `
          <h1>Lời Mở Đầu: Điều Kỳ Diệu Mang Tên Tự Chữa Lành</h1>
          <p class="lead">"Cơ thể con người là một cỗ máy sinh học tinh xảo và hoàn mỹ nhất trên thế giới. Năng lực tự chữa lành của nó mạnh mẽ hơn bất kỳ loại thuốc hay vị bác sĩ tài hoa nào." – TS. BS. Vương Đào</p>
          
          <p>Tôi từng là một bác sĩ ngoại khoa được đào tạo chính quy về Tây y, sau đó tiếp tục học tập và lấy bằng Tiến sĩ Y khoa Đông - Tây y kết hợp tại Đại học Y khoa Tokyo danh tiếng của Nhật Bản. Suốt hàng chục năm đứng trên bục giảng trường đại học y và trực tiếp điều trị lâm sàng cho hàng ngàn bệnh nhân, tôi luôn trăn trở trước một thực tế cay đắng:</p>
          
          <div class="quote-box">
            Tại sao y học hiện đại ngày càng phát triển, bệnh viện mọc lên nguy nga, trang thiết bị tối tân, nhưng số lượng người mắc bệnh mãn tính như tiểu đường, tim mạch, cao huyết áp, gout, thoái hóa khớp, ung thư lại tăng theo cấp số nhân từng ngày?
          </div>

          <p>Thuốc tây có thể tạm thời hạ huyết áp, hạ đường huyết, ức chế cơn đau khớp, nhưng tuyệt đối không thể phục hồi được các tế bào đã bị tổn thương. Bệnh nhân uống thuốc suốt đời, và cái kết sau cùng vẫn là các biến chứng suy tim, suy thận, tai biến, mù lòa hay hoại tử chi.</p>
          <p>Chỉ khi đi sâu vào bản chất sinh hóa của tế bào và <strong>Y Học Dinh Dưỡng</strong>, tôi mới bừng tỉnh nhận ra chân lý: Bệnh viện chữa triệu chứng bề mặt, chỉ có cơ thể mới có thể tự chữa lành căn nguyên gốc rễ!</p>
        `
      },
      {
        id: 'chap1',
        title: 'Chương 1: Quy Luật Tự Phục Hồi & Năng Lực Kỳ Diệu Của Sự Sống',
        content: `
          <h1>Chương 1: Quy Luật Tự Phục Hồi & Năng Lực Kỳ Diệu Của Sự Sống</h1>
          <p class="lead">Bạn đứt tay một nhát dao, một tuần sau vết thương liền da không còn dấu vết. Gãy xương, bác sĩ bó bột cố định xương gãy nhưng ai là người hàn gắn hai đầu xương lại? Chính là cơ thể bạn!</p>

          <h2>1. Bản Chất Của Năng Lực Phục Hồi</h2>
          <p>Tự phục hồi là đặc tính bẩm sinh và vĩ đại nhất của sự sống. Từ thời khắc tinh trùng thụ tinh tạo thành hợp tử, cơ thể đã chứa đựng toàn bộ bản vẽ thiết kế hoàn hảo và khả năng liên tục sửa chữa mọi hư tổn.</p>
          <p>Mỗi giây trôi qua, trong cơ thể bạn có hàng triệu tế bào già yếu chết đi và hàng triệu tế bào mới được tái sinh. Lớp niêm mạc dạ dày tái tạo sau mỗi 3-5 ngày; da thay mới sau 28 ngày; hồng cầu tuần hoàn 120 ngày; và toàn bộ khung xương của bạn được thay mới hoàn toàn sau mỗi 7-10 năm.</p>

          <h2>2. Tại Sao Cơ Thể Lại Không Thể Tự Chữa Lành Bệnh Mãn Tính?</h2>
          <p>Nếu cơ thể thông minh và kỳ diệu như vậy, tại sao bạn lại bị thoái hóa đốt sống 5 năm không khỏi? Tại sao đường huyết cứ cao mãi? Tại sao viêm dạ dày tái đi tái lại?</p>
          
          <div class="callout warning">
            <strong>Nguyên lý bức tường hỏng:</strong><br/>
            Hãy tưởng tượng cơ thể bạn giống như một bức tường gạch. Nếu một viên gạch bị vỡ, người thợ xây cần gì để sửa lại? Anh ta cần gạch và vữa mới!<br/>
            Cơ thể con người được cấu tạo từ: <strong>Protein (chất đạm), Chất béo tốt, Nước, Vitamin, Khoáng chất và Carbohydrate</strong>. Khi tế bào bị hư tổn, bạn lại đưa vào cơ thể thuốc tây – một hợp chất hóa học ngoại lai mà cơ thể không thể dùng làm gạch vữa tái tạo tế bào!
          </div>

          <p>Thuốc tây giống như chuông báo cháy reo lên, bạn không tìm cách dập tắt ngọn lửa mà chỉ đến bấm tắt chuông báo động. Ngọn lửa âm thầm thiêu rụi ngôi nhà mà bạn không hề hay biết!</p>
        `
      },
      {
        id: 'chap2',
        title: 'Chương 2: Gan - Tổng Quản Lý Sức Khỏe & Nhà Máy Hóa Chất Của Cơ Thể',
        content: `
          <h1>Chương 2: Gan - Tổng Quản Lý Sức Khỏe & Nhà Máy Hóa Chất Của Cơ Thể</h1>
          <p class="lead">"Gan là vị tổng quản tài ba nhất của cơ thể. Gan khỏe, trăm bệnh tiêu tan; Gan suy kiệt, vạn bệnh phát sinh."</p>

          <h2>1. Quy Mô Vĩ Đại Của Lá Gan</h2>
          <p>Gan là nội tạng lớn nhất trong cơ thể, đảm nhiệm hơn 500 chức năng sinh hóa phức tạp đồng thời mỗi giây. Tất cả thức ăn, nước uống sau khi được hấp thu qua đường tiêu hóa đều phải đi qua tĩnh mạch cửa để gan kiểm duyệt, khử độc và tái phân phối.</p>
          
          <h2>2. Ba Nhà Máy Trọng Yếu Tại Gan</h2>
          <ul>
            <li><strong>Nhà máy chuyển hóa chất đạm (Protein):</strong> Sản sinh albumin duy trì áp lực keo máu, globulin miễn dịch và các enzyme xúc tác sự sống.</li>
            <li><strong>Nhà máy chuyển hóa chất béo (Lipid):</strong> Tổng hợp phospholipid màng tế bào, cholesterol nội sinh và điều hòa vận chuyển mỡ máu.</li>
            <li><strong>Nhà máy giải độc tối thượng:</strong> Biến đổi các độc tố hòa tan trong mỡ thành dạng tan trong nước nhờ hệ enzyme Cytochrome P450 để thận và đại tràng đào thải ra ngoài an toàn.</li>
          </ul>

          <div class="callout tip">
            <strong>Bí quyết trường thọ của BS Vương Đào:</strong> Muốn chữa bất kỳ căn bệnh nào, từ tim mạch, dị ứng, đĩa đệm đến mất ngủ, khâu đầu tiên và quan trọng nhất luôn là phục hồi chức năng chuyển hóa của gan!
          </div>
        `
      },
      {
        id: 'chap3',
        title: 'Chương 3: Bệnh Tim Mạch & Xơ Vữa Động Mạch Dưới Góc Nhìn Dinh Dưỡng',
        content: `
          <h1>Chương 3: Bệnh Tim Mạch & Xơ Vữa Động Mạch Dưới Góc Nhìn Dinh Dưỡng</h1>
          <p class="lead">Cholesterol không phải là kẻ thù gây xơ vữa động mạch! Thủ phạm thực sự là sự tổn thương và viêm nhiễm mạn tính của lớp nội mạc mạch máu do thiếu hụt vi chất bảo vệ.</p>

          <h2>1. Sự Thật Về Cholesterol</h2>
          <p>Y học thông thường nhìn thấy mảng xơ vữa chứa nhiều cholesterol liền quy tội cho cholesterol và kê thuốc hạ mỡ máu (Statin). Nhưng họ không tự hỏi: Tại sao cholesterol lại lắng đọng ở đó?</p>
          <p>Cholesterol là nguyên liệu quan trọng cấu tạo nên màng tế bào của 60 ngàn tỷ tế bào trong cơ thể, là tiền chất tổng hợp hormone giới tính và acid mật. Khi thành mạch máu bị gốc tự do tấn công tạo ra vết nứt rách, gan lập tức sản sinh cholesterol vận chuyển đến để "trát xi măng" vá lại vết nứt đó!</p>

          <h2>2. Giải Pháp Gốc Rễ Từ Dinh Dưỡng</h2>
          <p>Để phục hồi thành mạch máu mềm mại và sạch bóng mảng bám:</p>
          <ul>
            <li><strong>Vitamin C & Vitamin E sinh học:</strong> Chống oxy hóa bảo vệ cholesterol không bị biến đổi thành dạng LDL oxy hóa nguy hiểm.</li>
            <li><strong>Protein chất lượng cao & B-Complex:</strong> Cung cấp nguyên liệu tái tạo sợi collagen và elastin giúp thành mạch đàn hồi, hạ huyết áp tự nhiên mà không cần thuốc ức chế canxi.</li>
            <li><strong>Axit béo Omega-3:</strong> Làm sạch mỡ máu trung tính và ngăn ngừa hình thành cục máu đông.</li>
          </ul>
        `
      },
      {
        id: 'chap4',
        title: 'Chương 4: Bệnh Tiểu Đường & Phục Hồi Chức Năng Chuyển Hóa Gan',
        content: `
          <h1>Chương 4: Bệnh Tiểu Đường & Phục Hồi Chức Năng Chuyển Hóa Gan</h1>
          <p class="lead">Tiểu đường tuýp 2 bản chất không phải bệnh của tuyến tụy, mà là bệnh rối loạn chuyển hóa toàn diện xuất phát từ gan!</p>

          <h2>1. Vai Trò Điều Tiết Đường Huyết Của Gan</h2>
          <p>Khi bạn ăn cơm, lượng đường glucose trong máu tăng lên. Cơ quan đầu tiên thu gom glucose và biến nó thành glycogen dự trữ chính là gan. Khi bạn đói, gan lại phân giải glycogen giải phóng glucose vào máu duy trì năng lượng ổn định cho não bộ.</p>
          <p>Khi gan bị tổn thương chuyển hóa do thiếu protein, vitamin B và chất chống oxy hóa, gan mất đi khả năng tổng hợp glycogen. Glucose tràn ngập trong máu, tụy phải tăng tiết insulin bù trừ dẫn đến tình trạng <em>Kháng Insulin</em>.</p>

          <div class="callout tip">
            <strong>Chiến lược phục hồi tiểu đường:</strong> Không phải nhịn ăn kham khổ đến kiệt sức, mà là bổ sung protein thực vật tinh khiết, crom, kẽm, magie và vitamin nhóm B để tế bào gan phục hồi lại khả năng điều phối đường huyết tự động.
          </div>
        `
      },
      {
        id: 'chap5',
        title: 'Chương 5: Thoái Hóa Cột Sống, Đĩa Đệm & Cơ Chế Bù Trừ Xương Khớp',
        content: `
          <h1>Chương 5: Thoái Hóa Cột Sống, Đĩa Đệm & Cơ Chế Bù Trừ Xương Khớp</h1>
          <p class="lead">Gai xương hay thoái hóa đốt sống không phải là bệnh thừa canxi, mà là hệ quả trực tiếp của việc thiếu hụt canxi và protein cấu trúc dài hạn!</p>

          <h2>1. Nghịch Lý Gai Xương: Càng Thiếu Canxi Càng Mọc Gai</h2>
          <p>Khi máu bị thiếu canxi do chế độ ăn uống nghèo nàn, tuyến cận giáp lập tức tiết hormone rút canxi từ xương vào máu để bảo vệ tim và não bộ. Khung xương bị rút canxi trở nên giòn xốp và suy giảm khả năng chịu lực.</p>
          <p>Tại các điểm chịu lực đè nén mạnh như bờ đốt sống cổ, đốt sống thắt lưng hay khớp gối, cơ thể phát tín hiệu cấp cứu: "Cần tăng diện tích tiếp xúc để giảm áp lực đè nén!". Canxi lắng đọng bù trừ tạo thành các mấu xương nhô ra, mà dân gian gọi là <strong>Gai xương</strong>.</p>

          <h2>2. Phục Hồi Đĩa Đệm & Sụn Khớp</h2>
          <p>Để đĩa đệm hết thoát vị và sụn khớp trơn tru:</p>
          <ul>
            <li><strong>Canxi sinh học + Magie + Vitamin D3 + K2:</strong> Đưa canxi chuẩn xác vào xương, làm tan dần các mấu gai xương tự nhiên.</li>
            <li><strong>Collagen Peptide + Vitamin C:</strong> Tái tạo vòng sợi đàn hồi bao bọc nhân nhầy đĩa đệm.</li>
            <li><strong>Glucosamine & Chondroitin Sulfate:</strong> Tăng cường hút dịch bôi trơn khớp.</li>
          </ul>
        `
      },
      {
        id: 'chap6',
        title: 'Chương 6: Mất Ngủ, Đau Nửa Đầu & Giải Tỏa Suy Nhược Thần Kinh',
        content: `
          <h1>Chương 6: Mất Ngủ, Đau Nửa Đầu & Giải Tỏa Suy Nhược Thần Kinh</h1>
          <p class="lead">Mất ngủ không phải là bệnh tâm thần, mà là tiếng kêu cứu của tế bào não bị đói năng lượng và mất cân bằng dẫn truyền thần kinh.</p>

          <h2>1. Nguyên Nhân Gốc Rễ Của Giấc Ngủ Kém</h2>
          <p>Để chìm vào giấc ngủ sâu, não bộ cần tổng hợp hormone Melatonin từ chất dẫn truyền thần kinh Serotonin. Để sản xuất được Serotonin, cơ thể bắt buộc phải có axit amin thiết yếu <em>Tryptophan</em> kết hợp cùng Vitamin B6, B3, Folate và Magie.</p>
          <p>Khi bạn căng thẳng kéo dài, tiêu hao vi chất tăng gấp bội nhưng bữa ăn chỉ toàn tinh bột rỗng và đồ ăn nhanh, não bộ hoàn toàn cạn kiệt nguyên liệu để tiết hormone thư giãn.</p>

          <h2>2. Thực Đơn Dinh Dưỡng Cho Giấc Ngủ Vàng</h2>
          <p>Uống thuốc ngủ chỉ làm ức chế hệ thần kinh trung ương giống như đập bất tỉnh não bộ, sáng dậy người nặng trĩu uể oải. Thay vào đó, hãy bổ sung một ly nước ấm pha Canxi - Magie chelate hữu cơ cùng vitamin nhóm B 30 phút trước khi ngủ để các sợi cơ và tế bào thần kinh thả lỏng sâu hoàn toàn.</p>
        `
      },
      {
        id: 'chap7',
        title: 'Chương 7: Hệ Miễn Dịch & Phòng Ngừa Khối U Tự Nhiên',
        content: `
          <h1>Chương 7: Hệ Miễn Dịch & Phòng Ngừa Khối U Tự Nhiên</h1>
          <p class="lead">Mỗi ngày trong cơ thể người bình thường sinh ra hàng ngàn tế bào đột biến. Nhưng tại sao chúng ta không bị ung thư? Vì đội quân miễn dịch đã tiêu diệt chúng ngay từ trong trứng nước!</p>

          <h2>1. Đội Quân Phòng Vệ Sinh Học</h2>
          <p>Hệ thống miễn dịch gồm đại thực bào, tế bào tiêu diệt tự nhiên (NK Cell) và tế bào lympho T. Vũ khí để các tế bào này tiêu diệt mầm bệnh và tế bào lạ chính là các gốc tự do có kiểm soát, kháng thể và enzyme tiêu protein.</p>
          <p>Tất cả các tế bào miễn dịch và kháng thể này đều được xây dựng 100% từ <strong>Chất đạm (Protein)</strong> và được kích hoạt bởi Vitamin A, C, E, Kẽm và Selen.</p>

          <h2>2. Chặn Đứng Khối U Từ Gốc</h2>
          <p>Khối u chỉ phát triển khi hệ miễn dịch bị bỏ đói, suy kiệt và môi trường cơ thể bị nhiễm độc axit kéo dài. Bằng cách nâng cấp dinh dưỡng tối ưu và giữ tinh thần an lạc, bạn đang kích hoạt vị bác sĩ phòng ngự tốt nhất trong chính mình.</p>
        `
      },
      {
        id: 'chap8',
        title: 'Chương 8: Béo Phì, Mỡ Máu & Giảm Cân Khoa Học',
        content: `
          <h1>Chương 8: Béo Phì, Mỡ Máu & Giảm Cân Khoa Học</h1>
          <p class="lead">Béo phì không phải do bạn ăn quá nhiều dinh dưỡng, mà là do bạn ăn thừa năng lượng rỗng nhưng thiếu trầm trọng các chất xúc tác đốt mỡ!</p>

          <h2>1. Cơ Chế Đốt Mỡ Của Gan</h2>
          <p>Chất béo trong cơ thể muốn được đốt cháy thành năng lượng bắt buộc phải có các enzyme xúc tác và chất vận chuyển <em>L-Carnitine</em>, Coenzyme Q10 cùng vitamin nhóm B. Khi gan thiếu các chất này, mỡ không thể đốt cháy mà bị tích tụ lại dưới da và bao quanh nội tạng.</p>

          <h2>2. Sai Lầm Chết Người Khi Nhịn Ăn Giảm Cân</h2>
          <p>Nhịn ăn làm cơ thể rơi vào trạng thái sinh tồn: cơ bắp bị tiêu biến để lấy năng lượng, tốc độ trao đổi chất cơ bản sụt giảm nghiêm trọng. Ngay khi bạn ăn trở lại, cơ thể sẽ lập tức tích trữ mỡ gấp đôi (hiệu ứng Yoyo).</p>
          <p>Giảm cân đúng chuẩn y học là: <strong>Ăn đủ đạm sạch, bổ sung vi chất đốt mỡ, tăng cường cơ bắp và thanh lọc gan mật</strong>.</p>
        `
      },
      {
        id: 'chap9',
        title: 'Chương 9: Xây Dựng Thực Đơn Dinh Dưỡng Trọn Đời Cho Gia Đình',
        content: `
          <h1>Chương 9: Xây Dựng Thực Đơn Dinh Dưỡng Trọn Đời Cho Gia Đình</h1>
          <p class="lead">Sức khỏe của cả gia đình nằm trong căn bếp của người nội trợ có tri thức đúng đắn.</p>

          <h2>1. Tháp Dinh Dưỡng Tế Bào Hàng Ngày</h2>
          <ul>
            <li><strong>Tầng 1 - Nước tinh khiết và khoáng tự nhiên:</strong> 0.04L/kg cân nặng, uống từng ngụm rải đều trong ngày.</li>
            <li><strong>Tầng 2 - Đạm thực vật & động vật sạch:</strong> Đậu nành không biến đổi gen, cá béo, trứng gà ta, ức gà, hạt dinh dưỡng.</li>
            <li><strong>Tầng 3 - Rau củ quả ngũ sắc:</strong> Cung cấp chất xơ hòa tan nuôi lợi khuẩn và hàng ngàn phytochemical chống oxy hóa.</li>
            <li><strong>Tầng 4 - Tinh bột phức hợp nguyên cám:</strong> Gạo lứt, yến mạch, khoai lang thay thế hoàn toàn đường tinh luyện và bánh mì trắng.</li>
            <li><strong>Tầng 5 - Chất béo chưa bão hòa:</strong> Dầu ô liu nguyên chất, dầu hạt lanh, quả bơ, hạt óc chó.</li>
          </ul>

          <div class="callout tip">
            <strong>Lời kết của TS. BS. Vương Đào:</strong> Đầu tư cho dinh dưỡng hôm nay là khoản đầu tư sinh lời vĩ đại nhất của đời người. Tiền viện phí đắt đỏ và nỗi đau thể xác không bao giờ có thể mua lại được tuổi thanh xuân và sự an yên trong tâm hồn!
          </div>
        `
      },
    ]
  });
}

/**
 * 2. TẠO CUỐN SÁCH: NHÂN TỐ ENZYME (BS. HIROMI SHINYA)
 */
async function generateNhanToEnzyme() {
  await createEpub({
    filename: 'nhan_to_enzyme.epub',
    title: 'Nhân Tố Enzyme - Phương Thức Sống Lành Mạnh',
    author: 'Bác sĩ Hiromi Shinya (Giáo sư Đại học Y Albert Einstein)',
    description: 'Bí quyết sống thọ và trẻ khỏe không cần dùng thuốc của Bác sĩ Hiromi Shinya - người phát minh ra phương pháp phẫu thuật cắt polyp đại tràng bằng nội soi đầu tiên trên thế giới.',
    chapters: [
      {
        id: 'intro',
        title: 'Lời Mở Đầu: Tướng Dạ Dày & Tướng Ruột Của Bạn',
        content: `
          <h1>Lời Mở Đầu: Tướng Dạ Dày & Tướng Ruột Của Bạn</h1>
          <p class="lead">"Người có tướng dạ dày và tướng ruột đẹp thì chắc chắn sẽ khỏe mạnh, sống thọ và tràn đầy sinh lực." – Bác sĩ Hiromi Shinya</p>
          <p>Trong hơn 40 năm hành nghề y tại Mỹ và Nhật Bản, tôi đã trực tiếp kiểm tra dạ dày và đại tràng của hơn 300.000 bệnh nhân. Qua hàng trăm ngàn hình ảnh nội soi lâm sàng, tôi nhận thấy một quy luật bất biến: Những người có sức khỏe kém, mắc bệnh mạn tính hay ung thư đều có niêm mạc đường ruột bị viêm loét, xơ cứng và tích tụ đầy độc tố cặn bã.</p>
          <p>Ngược lại, những người sống thọ trăm tuổi mà không bệnh tật luôn sở hữu một đường ruột màu hồng hào, trơn bóng và mềm mại tuyệt đối!</p>
        `
      },
      {
        id: 'chap1',
        title: 'Chương 1: Khám Phá Enzyme Diệu Kỳ (Miracle Enzyme)',
        content: `
          <h1>Chương 1: Khám Phá Enzyme Diệu Kỳ (Miracle Enzyme)</h1>
          <p class="lead">Enzyme là cội nguồn của mọi phản ứng hóa học tạo nên sự sống. Không có enzyme, sinh mệnh lập tức ngừng lại.</p>
          <h2>1. Enzyme Nguyên Mẫu Của Cơ Thể</h2>
          <p>Trong cơ thể con người có hơn 5.000 loại enzyme khác nhau, đảm nhận mọi chức năng từ tiêu hóa thức ăn, dẫn truyền xung thần kinh đến sửa chữa DNA. Tôi đưa ra giả thuyết rằng cơ thể sở hữu một loại <strong>Enzyme Diệu Kỳ (Enzyme Nguyên Mẫu)</strong>. Khi một cơ quan bị quá tải, enzyme nguyên mẫu sẽ biến đổi thành loại enzyme chuyên biệt để phục vụ cơ quan đó.</p>
          <p>Nếu bạn tiêu tốn quá nhiều enzyme cho việc giải độc rượu bia, thịt đỏ, thuốc lá và căng thẳng, cơ thể sẽ không còn đủ enzyme để tái tạo tế bào và ngăn chặn ung thư.</p>
        `
      },
      {
        id: 'chap2',
        title: 'Chương 2: 7 Phương Pháp Sống Lành Mạnh Của Shinya',
        content: `
          <h1>Chương 2: 7 Phương Pháp Sống Lành Mạnh Của Shinya</h1>
          <p class="lead">Phương pháp Shinya giúp bảo tồn và gia tăng nguồn enzyme diệu kỳ trong cơ thể bạn trọn đời.</p>
          <ol>
            <li><strong>Chế độ ăn 85% thực vật và 15% động vật:</strong> Ưu tiên ngũ cốc nguyên hạt, rau quả theo mùa, chỉ ăn cá nhỏ, hạn chế tối đa thịt đỏ và sữa bò.</li>
            <li><strong>Uống nước tốt (Kangen water):</strong> Uống 1.5 - 2 lít nước ion kiềm giàu hydrogen mỗi ngày khi bụng đói.</li>
            <li><strong>Bài tiết tự nhiên và đều đặn:</strong> Tránh để phân ứ đọng sinh độc tố ngấm ngược vào máu.</li>
            <li><strong>Vận động điều độ:</strong> Đi bộ và hít thở sâu, không tập luyện quá sức gây stress oxy hóa.</li>
            <li><strong>Nghỉ ngơi và ngủ sâu:</strong> Ngủ đủ 6-8 tiếng và chợp mắt 15 phút buổi trưa.</li>
            <li><strong>Hô hấp sâu và thiền định:</strong> Cung cấp dồi dào oxy cho tế bào.</li>
            <li><strong>Tâm thế hạnh phúc và biết ơn:</strong> Tình yêu thương kích hoạt lượng enzyme diệu kỳ tuôn chảy mạnh mẽ nhất.</li>
          </ol>
        `
      }
    ]
  });
}

/**
 * 3. TẠO CUỐN SÁCH: Y HỌC DINH DƯỠNG (TS. BS. RAY D. STRAND)
 */
async function generateYHocDinhDuong() {
  await createEpub({
    filename: 'y_hoc_dinh_duong_ray_strand.epub',
    title: 'Y Học Dinh Dưỡng - Những Điều Bác Sĩ Không Nói Với Bạn',
    author: 'TS. BS. Ray D. Strand (Chuyên gia Y học Dự phòng Hoa Kỳ)',
    description: 'Cuốn sách khai sáng của Bác sĩ Ray D. Strand về vai trò then chốt của dinh dưỡng tế bào và chất chống oxy hóa trong việc đẩy lùi các căn bệnh nan y thời hiện đại.',
    chapters: [
      {
        id: 'intro',
        title: 'Lời Mở Đầu: Sự Thức Tỉnh Của Một Bác Sĩ Gia Đình',
        content: `
          <h1>Lời Mở Đầu: Sự Thức Tỉnh Của Một Bác Sĩ Gia Đình</h1>
          <p class="lead">"Sau hơn 23 năm hành nghề y khoa, tôi đã chứng kiến vợ tôi Liz lâm vào cảnh thập tử nhất sinh vì bệnh đau cơ xơ hóa và viêm phổi mạn tính mà mọi loại thuốc kháng sinh mạnh nhất của Mỹ đều bất lực..." – BS. Ray D. Strand</p>
          <p>Khi y học thông thường hoàn toàn đầu hàng, một người bạn khuyên vợ tôi thử dùng các chất bổ sung dinh dưỡng chất lượng cao (vitamin C, E, CoQ10, kẽm). Là một bác sĩ bảo thủ, ban đầu tôi phản đối gay gắt. Nhưng trước sự đau đớn cùng cực của vợ, tôi đã đồng ý thử.</p>
          <p>Và một phép màu y học đã xảy ra: Chỉ sau 3 tháng bổ sung dinh dưỡng đúng cách, sức khỏe của vợ tôi hồi phục phi thường, cô ấy có thể đạp xe và sinh hoạt trở lại như một kỳ tích!</p>
        `
      },
      {
        id: 'chap1',
        title: 'Chương 1: Kẻ Thù Thầm Lặng - Stress Oxy Hóa & Gốc Tự Do',
        content: `
          <h1>Chương 1: Kẻ Thù Thầm Lặng - Stress Oxy Hóa & Gốc Tự Do</h1>
          <p class="lead">Gốc tự do giống như những que diêm đang cháy rực bắn ra từ lò sưởi. Nếu không có tấm lưới bảo vệ chống oxy hóa, chúng sẽ thiêu rụi toàn bộ ngôi nhà cơ thể bạn.</p>
          <p>Hơn 80 căn bệnh thoái hóa mạn tính phổ biến nhất hiện nay – từ bệnh Alzheimer, xơ vữa động mạch, thoái hóa điểm vàng đến viêm khớp dạng thấp và tiểu đường – đều có chung một nguồn gốc sinh bệnh học: <strong>Stress oxy hóa</strong>.</p>
          <p>Chỉ khi cung cấp đầy đủ một mạng lưới dưỡng chất hiệp đồng chống oxy hóa (Antioxidant Cocktail), cơ thể mới có thể trung hòa các gốc tự do và phục hồi sự tươi trẻ cho từng tế bào.</p>
        `
      }
    ]
  });
}

/**
 * 4. TẠO CUỐN SÁCH: THE CHINA STUDY (TS. T. COLIN CAMPBELL)
 */
async function generateChinaStudy() {
  await createEpub({
    filename: 'the_china_study.epub',
    title: 'Bí Mật Dinh Dưỡng Cho Sức Khỏe Toàn Diện (The China Study)',
    author: 'TS. T. Colin Campbell & Thomas M. Campbell II',
    description: 'Nghiên cứu quy mô lớn nhất lịch sử y học về mối liên hệ giữa chế độ ăn thực vật toàn phần và việc đẩy lùi bệnh tim mạch, tiểu đường và ung thư.',
    chapters: [
      {
        id: 'intro',
        title: 'Lời Mở Đầu: Nghiên Cứu Dinh Dưỡng Toàn Diện Nhất Thế Giới',
        content: `
          <h1>Lời Mở Đầu: Nghiên Cứu Dinh Dưỡng Toàn Diện Nhất Thế Giới</h1>
          <p class="lead">"Hầu hết các căn bệnh mãn tính tàn phá cuộc sống con người hôm nay đều có thể phòng ngừa, ngăn chặn và thậm chí đảo ngược bằng một chế độ ăn thực vật toàn phần." – TS. T. Colin Campbell</p>
          <p>Dự án Trung Quốc (The China Study) được tờ The New York Times ca ngợi là "đỉnh cao của các nghiên cứu dịch tễ học". Được phối hợp thực hiện bởi Đại học Cornell, Đại học Oxford và Viện Y học Dự phòng Trung Quốc suốt hơn 20 năm, công trình đã khảo sát thói quen ăn uống và bệnh tật của hàng chục ngàn người dân.</p>
        `
      },
      {
        id: 'chap1',
        title: 'Chương 1: Sức Mạnh Đảo Ngược Bệnh Tật Của Chế Độ Ăn Thực Vật',
        content: `
          <h1>Chương 1: Sức Mạnh Đảo Ngược Bệnh Tật Của Chế Độ Ăn Thực Vật</h1>
          <p class="lead">Dinh dưỡng không hoạt động theo từng vi chất cô lập, mà hoạt động như một dàn nhạc giao hưởng tổng hợp.</p>
          <p>Khi tỷ lệ protein động vật vượt quá 10% tổng lượng calo hàng ngày, sự phát triển của các khối u và mảng xơ vữa mạch máu tăng vọt. Ngược lại, khi chuyển sang chế độ ăn thực vật toàn phần ít dầu mỡ, cơ thể lập tức kích hoạt cơ chế tự làm sạch thành mạch và bảo vệ tế bào.</p>
        `
      }
    ]
  });
}

/**
 * 5. TẠO CUỐN SÁCH: CƠ THỂ TỰ CHỮA LÀNH (ANTHONY WILLIAM)
 */
async function generateCoTheTuChuaLanh() {
  await createEpub({
    filename: 'co_the_tu_chua_lanh.epub',
    title: 'Cơ Thể Tự Chữa Lành - Thực Phẩm Phục Hồi Não Bộ & Gan',
    author: 'Anthony William (Medical Medium)',
    description: 'Khám phá năng lực giải độc tự nhiên của gan mật và phục hồi hệ miễn dịch bằng nước ép cần tây và các loại quả mọng tự nhiên.',
    chapters: [
      {
        id: 'intro',
        title: 'Lời Mở Đầu: Đánh Thức Năng Lực Trực Giác Của Tế Bào',
        content: `
          <h1>Lời Mở Đầu: Đánh Thức Năng Lực Trực Giác Của Tế Bào</h1>
          <p class="lead">"Cơ thể bạn không bao giờ tự chống lại chính nó. Mọi triệu chứng đau mỏi, sương mù não hay mệt mỏi đều là tín hiệu cầu cứu chân thực nhất." – Anthony William</p>
          <p>Cơ thể con người sở hữu một trí tuệ sinh học phi thường. Khi bạn hỗ trợ đúng nguyên liệu tự nhiên tinh khiết nhất từ thiên nhiên, mọi căn bệnh tự miễn và viêm nhiễm mạn tính đều có thể từng bước được xoa dịu và phục hồi kỳ diệu.</p>
        `
      },
      {
        id: 'chap1',
        title: 'Chương 1: Cứu Lấy Lá Gan & Giải Phóng Độc Tố Mạn Tính',
        content: `
          <h1>Chương 1: Cứu Lấy Lá Gan & Giải Phóng Độc Tố Mạn Tính</h1>
          <p class="lead">Lá gan là tấm khiên dũng cảm nhất bảo vệ trái tim và não bộ của bạn trước hàng ngàn hóa chất độc hại của thời hiện đại.</p>
          <p>Bằng cách bổ sung nước chanh ấm buổi sáng, nước ép cần tây nguyên chất và chế độ ăn giàu chất chống oxy hóa tự nhiên, bạn đang tạo điều kiện để gan đào thải kim loại nặng, virus tiềm ẩn và phục hồi sinh lực trọn vẹn.</p>
        `
      }
    ]
  });
}

async function main() {
  console.log('🚀 Bắt đầu tạo các đầu sách EPUB Dinh Dưỡng Kinh Điển Thế Giới & Việt Nam...');
  await generateDinhDuongHocBiThatTruyen();
  await generateNhanToEnzyme();
  await generateYHocDinhDuong();
  await generateChinaStudy();
  await generateCoTheTuChuaLanh();
  console.log('🎉 ĐÃ HOÀN TẤT TOÀN BỘ CÁC FILE EPUB!');
}

main();

