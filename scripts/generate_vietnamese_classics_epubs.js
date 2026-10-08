const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const DOCUMENTS_DIR = path.join(__dirname, '..', 'public', 'documents');

function createEpubBuffer(title, author, identifier, chapters) {
  const zip = new JSZip();

  // 1. mimetype (STORE)
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

  // Manifest items & spine items
  const manifestItems = chapters.map((c, i) =>
    `<item id="chap_${i}" href="chapter_${i}.html" media-type="application/xhtml+xml"/>`
  ).join('\n    ');

  const spineItems = chapters.map((c, i) =>
    `<itemref idref="chap_${i}"/>`
  ).join('\n    ');

  // content.opf
  oebps.file(
    'content.opf',
    `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${title}</dc:title>
    <dc:creator>${author}</dc:creator>
    <dc:language>vi</dc:language>
    <dc:identifier id="BookId">${identifier}</dc:identifier>
  </metadata>
  <manifest>
    ${manifestItems}
  </manifest>
  <spine>
    ${spineItems}
  </spine>
</package>`
  );

  // Chapter files
  chapters.forEach((chap, idx) => {
    oebps.file(
      `chapter_${idx}.html`,
      `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>${chap.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Times New Roman", serif; line-height: 1.8; padding: 1.5rem; color: #1e1e1e; background-color: #faf8f5; }
    h1 { color: #8B4513; border-bottom: 2px solid #8B4513; padding-bottom: 0.5rem; font-size: 1.4rem; font-weight: bold; }
    h2 { color: #5c2c16; font-size: 1.15rem; margin-top: 1.2rem; }
    p { margin-bottom: 1rem; text-indent: 1.5rem; text-align: justify; font-size: 1.05rem; }
    .quote { font-style: italic; color: #6d4c41; border-left: 3px solid #8B4513; padding-left: 1rem; margin: 1rem 0; }
    .tag { display: inline-block; background: #e8d8c8; color: #5c2c16; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="tag">TỦ SÁCH KINH ĐIỂN VIỆT NAM</div>
  <h1>${chap.title}</h1>
  ${chap.content}
</body>
</html>`
    );
  });

  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
}

async function main() {
  console.log('📚 Bắt đầu tạo 9 tệp EPUB Sách Kinh Điển Việt Nam chuẩn mực...');

  const books = [
    {
      filename: 'vietnam_chi_pheo.epub',
      title: 'Chí Phèo',
      author: 'Nam Cao',
      id: 'urn:uuid:qbiz-vietnam-chi-pheo',
      chapters: [
        {
          title: 'Chương 1: Tiếng Chửi Đầu Làng Vũ Đại',
          content: `<p>Hắn vừa đi vừa chửi. Bao giờ cũng thế, cứ rượu xong là hắn chửi. Bắt đầu chửi trời, có hề gì? Trời có của riêng nhà nào? Rồi hắn chửi đời. Thế cũng chẳng sao: Đời là tất cả nhưng chẳng là ai. Tức mình hắn chửi ngay tất cả làng Vũ Đại. Nhưng cả làng Vũ Đại ai cũng nhủ: "Chắc nó trừ mình ra!". Không ai lên tiếng cả. Thế thì tức thật! Ờ! Thế này thì tức thật! Tức chết đi được mất!</p>
          <p>Đã thế, hắn phải chửi cha đứa nào không chửi nhau với hắn. Nhưng cũng không ai ra điều. Mẹ kiếp! Thế thì có phí rượu không? Thế thì có khổ hắn không? Không biết đứa chết mẹ nào đẻ ra thân hắn cho hắn khổ đến nông nỗi này? Hắn nghiến răng vào mà chửi cái đứa đã đẻ ra Chí Phèo, đẻ ra cái sự đời hắn!</p>`
        },
        {
          title: 'Chương 2: Bát Cháo Hành & Đêm Trăng Bờ Sông',
          content: `<p>Hôm ấy trời sáng trăng vằng vặc. Chí Phèo gặp Thị Nở ở vườn chuối ven sông. Một người đàn bà xấu ma chê quỷ hờn, lại dở hơi, nghèo rớt mồng tơi. Nhưng chính người đàn bà ấy đã mang đến cho Chí Phèo điều kỳ diệu nhất cuộc đời: một bát cháo hành nóng hổi bốc khói nghi ngút.</p>
          <p class="quote">"Hắn húp một húp. Trời ơi cháo hành mới thơm làm sao! Hắn thấy mắt mình ươn ướt. Đây là lần đầu tiên trong đời hắn được một bàn tay đàn bà chăm sóc cho ăn mà không phải đi cướp giật."</p>
          <p>Hắn bỗng thấy thèm lương thiện. Hắn muốn làm hòa với mọi người biết bao! Thị Nở sẽ mở đường cho hắn. Nhưng hỡi ôi, định kiến tàn nhẫn của bà cô Thị Nở và làng Vũ Đại đã đạp đổ ước mơ vừa nhen nhóm.</p>`
        },
        {
          title: 'Chương 3: Khát Vọng Làm Người Lương Thiện',
          content: `<p>Chí Phèo ôm mặt khóc rưng rức rồi lại uống đẫm rượu. Hắn xách dao đi, miệng lẩm bẩm: "Tao phải đâm chết đứa con đĩ Nở!". Nhưng bước chân dẫn hắn không đến nhà Thị Nở, mà đến thẳng dinh cơ cụ Bá Kiến.</p>
          <p>Hắn xộc vào sân, rút dao ra gầm lên: <em>"Tao muốn làm người lương thiện! Ai cho tao lương thiện? Làm thế nào cho mất được những vết mảnh chai trên mặt này? Tao không thể là người lương thiện nữa rồi! Chỉ có một cách... chỉ còn một cách này thôi!"</em></p>
          <p>Chí Phèo vung dao đâm trúng cổ họng Bá Kiến rồi tự kết liễu đời mình trong vũng máu. Tiếng kêu xé lòng của một kiếp người khao khát được nhìn nhận như một con người bình thường vang vọng mãi trong lịch sử văn học Việt Nam.</p>`
        }
      ]
    },
    {
      filename: 'vietnam_so_do.epub',
      title: 'Số Đỏ',
      author: 'Vũ Trọng Phụng',
      id: 'urn:uuid:qbiz-vietnam-so-do',
      chapters: [
        {
          title: 'Hồi 1: Cơ Duyên Kỳ Ngộ Của Anh Thợ Nhặt Bóng',
          content: `<p>Xuân, biệt hiệu là Xuân Tóc Đỏ, vốn là một đứa trẻ mồ côi đi lang thang nhặt bóng quần vợt ở sân Tao Đàn. Nhờ tính mồm mép liến thoắng và một dịp may kỳ lạ, hắn được bà Phó Đoan - một me Tây goá bụa tiết hạnh khả phong - giới thiệu vào làm việc tại hiệu may Âu Hóa của vợ chồng Văn Minh.</p>
          <p>Thời bấy giờ, phong trào Âu hóa, thể thao hóa, cải cách y phục đang làm mưa làm gió trong giới thượng lưu Hà thành. Người ta đua nhau mặc áo hở ngực, quần loe, nói tiếng Tây nửa mùa và cổ xúy lối sống tân thời lố lăng.</p>`
        },
        {
          title: 'Hồi 2: Biến Thành Đốc Tờ Xuân & Đại Biểu Thể Thao',
          content: `<p>Tại tiệm may Âu Hóa, Xuân Tóc Đỏ học thuộc lòng mấy câu quảng cáo thuốc lậu và triết lý ba xu. Thế mà đám thượng lưu trí thức lại tưởng hắn là bậc kỳ tài xuất chúng, phong cho hắn danh hiệu "Đốc tờ Xuân", bậc cứu tinh của phong hóa nước nhà!</p>
          <p class="quote">"Hắn bước đi vênh váo giữa những tràng vỗ tay tán thưởng của đám thị dân giàu xổi. Một kẻ dốt nát mù chữ bỗng chốc trở thành thần tượng của giới văn minh tư sản."</p>`
        },
        {
          title: 'Hồi 3: Đám Ma Gương Mẫu & Đỉnh Cao Trào Phúng',
          content: `<p>Cụ cố Tổ ốm liệt giường. Cả gia đình cụ cố Hồng ngày đêm mong cụ chết để chia gia tài. Khi Xuân Tóc Đỏ buông lời trêu ngươi làm cụ tức thở hắt ra chết thật, cả nhà họ Hồng vui mừng khôn xiết!</p>
          <p>Đám ma cụ cố Tổ được tổ chức như một ngày hội hoa đăng. Người ta mặc tang phục tân thời, khoe xe hơi, bàn tán chuyện chim câu, ghen tuông và chụp ảnh lưu niệm rầm rộ. Cụ cố Hồng nhắm nghiền mắt gật gù: "Biết rồi, khổ lắm, nói mãi!". Xuân Tóc Đỏ bước lên đỉnh cao vinh quang của một xã hội kim tiền đảo điên.</p>`
        }
      ]
    },
    {
      filename: 'vietnam_truyen_kieu.epub',
      title: 'Truyện Kiều (Đoạn Trường Tân Thanh)',
      author: 'Đại thi hào Nguyễn Du',
      id: 'urn:uuid:qbiz-vietnam-truyen-kieu',
      chapters: [
        {
          title: 'Phần 1: Tiết Thanh Minh & Kim Kiều Kỳ Ngộ',
          content: `<p><em>Trăm năm trong cõi người ta,<br/>Chữ tài chữ mệnh khéo là ghét nhau.<br/>Trải qua một cuộc bể dâu,<br/>Những điều trông thấy mà đau đớn lòng.</em></p>
          <p>Thúy Kiều là trang tuyệt sắc giai nhân, tài sắc vẹn toàn, thông minh đĩnh ngộ, cung thương làu bậc họa miêu. Trong tiết Thanh minh hoa lê trắng muốt, nàng cùng em đi du xuân và gặp gỡ chàng thư sinh Kim Trọng phong tư tài mạo tuyệt vời.</p>
          <p class="quote">"Người quốc sắc, kẻ thiên tài,<br/>Tình trong như đã, mặt ngoài còn e.<br/>Chập chờn lau lách ngô nghê,<br/>Gió đưa ngọn trúc, trăng kề cành tiêu."</p>`
        },
        {
          title: 'Phần 2: Bán Mình Chuộc Cha & Mười Lăm Năm Lưu Lạc',
          content: `<p>Gia đình mắc oan sai, cha và em bị giam cầm tra tấn dã man. Đứng trước chữ Hiếu và chữ Tình, Thúy Kiều đành dứt bỏ mối duyên đầu sâu nặng với Kim Trọng, bán mình chuộc cha cho Mã Giám Sinh.</p>
          <p>Từ đây bắt đầu mười lăm năm phong trần chìm nổi. Kiều rơi vào tay Tú Bà, Sở Khanh, bị ép tiếp khách ở lầu xanh, rồi làm tì thiếp cho Thúc Sinh, chịu sự ghen tuông cay độc của Hoạn Thư. Dù thân vùi dập nơi bùn nhơ, tâm hồn nàng vẫn vằng vặc sáng trong như trăng rằm.</p>`
        },
        {
          title: 'Phần 3: Gặp Gỡ Từ Hải & Tái Hợp Kim Trọng',
          content: `<p>Người anh hùng Từ Hải xuất hiện, rước Kiều về dinh, giúp nàng báo ân báo oán oanh liệt. Nhưng rồi vì mắc lừa gian thần Hồ Tôn Hiến, Từ Hải trúng kế tử trận, Kiều gieo mình xuống sông Tiền Đường tự vẫn, được sư giác Duyên cứu sống.</p>
          <p>Trải qua bao thăng trầm bể dâu, Kim Trọng lặn lội tìm lại người thương. Đôi lứa tương phùng sau mười lăm năm cách biệt, cùng nhau nâng chén rượu đoàn viên:</p>
          <p class="quote">"Thiện căn ở tại lòng ta,<br/>Chữ tâm kia mới bằng ba chữ tài.<br/>Lời quê chắp nhặt dông dài,<br/>Mua vui cũng được một vài trống canh."</p>`
        }
      ]
    },
    {
      filename: 'vietnam_tat_den.epub',
      title: 'Tắt Đèn',
      author: 'Ngô Tất Tố',
      id: 'urn:uuid:qbiz-vietnam-tat-den',
      chapters: [
        {
          title: 'Chương 1: Tiếng Trống Thúc Sưu & Nỗi Lo Xé Lòng',
          content: `<p>Mùa sưu thuế ập xuống làng Đông Xá như một cơn bão quét. Tiếng trống, tiếng mõ, tiếng tù và inh ỏi từ sáng sớm tinh mơ. Nhà chị Dậu nghèo nhất làng, anh Dậu đang ốm liệt giường vì sốt rét cũng bị bọn cai lệ trói nghiến lôi ra đình làng đánh đập dã man.</p>
          <p>Để cứu chồng khỏi tay bọn cường hào ác bá, chị Dậu phải cắn răng bế đứa con gái đầu lòng - cái Tý bảy tuổi - và đàn chó con sang bán cho lão Nghị Quế với giá rẻ mạt.</p>`
        },
        {
          title: 'Chương 2: Chị Dậu Vùng Lên Quyết Liệt',
          content: `<p>Anh Dậu vừa được cõng về nhà như một cái xác không hồn. Chị Dậu vừa múc cho chồng bát cháo hoa thì tên cai lệ và người nhà lý trưởng lại sầm sập xông vào đòi tiền sưu của người em chồng đã chết!</p>
          <p>Chị Dậu hết lời van xin nhưng tên cai lệ vung roi song quất vào mặt chị rồi sấn đến trói anh Dậu. Sự uất ức dồn nén bấy lâu bùng cháy thành ngọn lửa phẫn nộ dữ dội:</p>
          <p class="quote">"Chị Dậu nghiến hai hàm răng: Mày trói ngay chồng bà đi, bà cho mày xem! Rồi chị túm cổ áo tên cai lệ, ấn dúi ra cửa. Tên người nhà lý trưởng nhảy vào, chị túm tóc lẳng một cái ngã nhào ra thềm..."</p>`
        },
        {
          title: 'Chương 3: Lao Vào Đêm Tối Mịt Mùng',
          content: `<p>Chị Dậu phải trốn lên tỉnh làm vú em cho nhà quan cụ. Lão quan già dâm ô mò vào phòng toan giở trò đồi bại. Chị Dậu giằng tay chạy thục mạng ra khỏi cổng dinh thự.</p>
          <p>Trời tối như mực. Đêm tối tăm mịt mùng như tiền đồ của chị và của hàng triệu người nông dân Việt Nam dưới ách áp bức thực dân phong kiến thời bấy giờ.</p>`
        }
      ]
    },
    {
      filename: 'vietnam_gio_dau_mua.epub',
      title: 'Gió Đầu Mùa',
      author: 'Thạch Lam',
      id: 'urn:uuid:qbiz-vietnam-gio-dau_mua',
      chapters: [
        {
          title: 'Gió Đầu Mùa: Tình Người Nơi Phố Huyện',
          content: `<p>Sáng nay ngủ dậy, Sơn thấy gió lạnh luồn qua khe liếp. Mẹ và chị Sơn đã ngồi bên chậu than sưởi ấm, đem những chiếc áo bông cũ ra phơi. Sơn mặc chiếc áo dạ chỉ đỏ ấm áp ra chợ chơi với lũ trẻ con xóm nghèo.</p>
          <p>Nhìn thấy cái Hiên, con bé hàng xóm nghèo khổ đang đứng co ro bên cột quán với manh áo rách tả tơi để hở cả lưng và tay, lòng trắc ẩn của hai đứa trẻ trỗi dậy. Sơn bàn với chị Lan chạy về nhà lấy chiếc áo bông cũ đem cho cái Hiên.</p>
          <p class="quote">"Một cử chỉ ngây thơ, thuần khiết chan chứa tình nhân ái của tuổi thơ sưởi ấm cả một mùa đông buốt giá."</p>`
        },
        {
          title: 'Hai Đứa Trẻ: Chuyến Tàu Đêm Mang Ánh Sáng',
          content: `<p>Chiều tà buông xuống phố huyện nghèo xơ xác. Hai chị em Liên và An ngồi ngắm phiên chợ tàn với những vỏ bưởi, rác rưởi trôi theo dòng nước mương. Bác Siêu nhóm lửa gánh phở thơm nức, gia đình bác Xẩm ngồi trên chiếu rách gảy đàn bầu.</p>
          <p>Dù buồn ngủ ríu mắt, hai đứa trẻ vẫn cố thức đợi chuyến tàu đêm từ Hà Nội đi qua. Con tàu mang theo ánh sáng rực rỡ của những toa hạng sang, tiếng còi rít rền vang và dư âm của một thế giới phồn hoa, khác hẳn cuộc đời lầm lũi tăm tối nơi phố huyện quạnh quẽ.</p>`
        }
      ]
    },
    {
      filename: 'vietnam_ha_noi_36_pho_phuong.epub',
      title: 'Hà Nội 36 Phố Phường',
      author: 'Thạch Lam',
      id: 'urn:uuid:qbiz-vietnam-ha-noi-36',
      chapters: [
        {
          title: 'Chương 1: Nghệ Thuật Ẩm Thực Phở & Quà Bánh Hà Thành',
          content: `<p>Hà Nội có một sức quyến rũ kỳ lạ không chỉ ở mái ngói rêu phong, cây đa quán nước, mà còn ở nghệ thuật ăn quà tinh tế thanh tao. Phở là món quà đặc biệt của Hà Nội, không phải vì chỉ Hà Nội mới có, mà chỉ ở Hà Nội phở mới ngon.</p>
          <p class="quote">"Nước dùng trong và ngọt, bánh dẻo mà không nát, thịt mỡ gầu giòn chứ không dai, chanh ớt với hành tây đủ cả. Một bát phở buổi sớm mai làm ấm lòng người lữ khách đi trong sương gió Thủ đô."</p>`
        },
        {
          title: 'Chương 2: Cốm Làng Vòng & Nét Duyên Phố Cổ',
          content: `<p>Cốm Làng Vòng xanh màu ngọc thạch, gói trong lá sen ngát hương mùa thu. Ăn cốm phải ăn từng hạt nhỏ, nhai chậm rãi để cảm nhận vị ngọt bùi của bông lúa nếp non hòa quyện với hương sen đồng nội thanh khiết.</p>
          <p>Ba mươi sáu phố phường với Hàng Bạc, Hàng Đào, Hàng Gai, Mã Mây... lưu giữ linh hồn ngàn năm văn hiến của một vùng đất kinh kỳ tài hoa, hào hoa và trầm mặc.</p>`
        }
      ]
    },
    {
      filename: 'vietnam_lao_hac.epub',
      title: 'Lão Hạc',
      author: 'Nam Cao',
      id: 'urn:uuid:qbiz-vietnam-lao-hac',
      chapters: [
        {
          title: 'Chương 1: Cậu Vàng & Tấm Lòng Người Cha Nghèo',
          content: `<p>Lão Hạc có một mảnh vườn nhỏ và một con chó vàng tên là Cậu Vàng. Đó là kỷ vật duy nhất mà đứa con trai độc nhất của lão để lại trước khi phẫn chí đi làm đồn điền cao su vì không đủ tiền cưới vợ.</p>
          <p>Lão cưng chiều con chó như con đẻ, cho nó ăn cơm trong bát sứ, bắt rận, tắm rửa và trò chuyện với nó mỗi khi cô đơn quạnh quẽ. Nhưng một trận ốm thập tử nhất sinh đã cướp đi toàn bộ số tiền dành dụm của lão.</p>`
        },
        {
          title: 'Chương 2: Bán Cậu Vàng & Nỗi Đau Giằng Xé',
          content: `<p>Lão Hạc sang nhà ông giáo, đôi mắt ầng ậng nước thông báo đã bán con Vàng. Lão khóc hu hu như một đứa trẻ, miệng mếu máo tự trách mình là kẻ lừa đảo một con vật trung thành:</p>
          <p class="quote">"Khốn nạn... Ông giáo ơi! Nó có biết gì đâu! Nó thấy tôi gọi thì chạy ngay về, ngoáy đuôi mừng. Tôi cho nó ăn cơm rồi thằng Mục, thằng Xiên núp sau nhà tóm lấy chân nó trói nghiến lại... Nó nhìn tôi như muốn bảo: A, lão già tệ lắm! Tôi ăn ở với lão như thế mà lão xử với tôi như thế này à?"</p>`
        },
        {
          title: 'Chương 3: Cái Chết Bất Khuất Bảo Toàn Nhân Phẩm',
          content: `<p>Để không phải tiêu lạm vào mảnh vườn thừa kế của con trai và không phiền hà đến hàng xóm, lão Hạc đã xin bả chó của Binh Tư rồi tự kết liễu đời mình trong căn nhà lá rách nát.</p>
          <p>Cái chết dữ dội, đau đớn oằn quại của lão Hạc là minh chứng cảm động tột cùng cho nhân cách cao thượng, lòng tự trọng thanh khiết của người nông dân nghèo Việt Nam.</p>`
        }
      ]
    },
    {
      filename: 'vietnam_vang_bong_mot_thoi.epub',
      title: 'Vang Bóng Một Thời',
      author: 'Nguyễn Tuân',
      id: 'urn:uuid:qbiz-vietnam-vang-bong',
      chapters: [
        {
          title: 'Chữ Người Tử Tù: Khí Phách Huấn Cao',
          content: `<p>Huấn Cao - một tử tù nổi tiếng viết chữ đẹp và có chí lớn chống lại triều đình - bị giam tại trại giam tỉnh Sơn. Viên quản ngục là một người yêu quý cái đẹp, kính trọng nhân cách tài hoa của Huấn Cao nên đã hết lòng biệt đãi ông trong xà lim ẩm thấp.</p>
          <p>Đêm cuối cùng trước ngày xử chém, cảnh tượng cho chữ kỳ diệu có một không hai trong lịch sử đã diễn ra giữa chốn ngục tù:</p>
          <p class="quote">"Một ngọn đuốc tẩm dầu rực cháy trong căn buồng giam tối tăm hôi hám. Người tử tù cổ đeo gông, chân vướng xiềng đang dĩnh đạc tô từng nét chữ vuông vắn tươi tắn trên tấm lụa bạch trắng tinh căng phẳng trên mảnh ván..."</p>`
        },
        {
          title: 'Hương Cuội & Thú Uống Trà Tao Nhã',
          content: `<p>Nguyễn Tuân phục dựng lại những thú chơi tao nhã thanh cao của người xưa: thú thưởng trà sớm mai với sương đọng trên lá sen, thú thả thơ, chọi gà, chơi hoa thủy tiên ngày Tết.</p>
          <p>Từng trang văn nồng nàn tình yêu văn hóa cổ truyền, trân trọng những nét đẹp tinh hoa thanh nhã đang dần bị làn sóng thực dụng cuốn trôi.</p>`
        }
      ]
    },
    {
      filename: 'vietnam_viet_nam_su_luoc.epub',
      title: 'Việt Nam Sử Lược',
      author: 'Trần Trọng Kim',
      id: 'urn:uuid:qbiz-vietnam-su-luoc',
      chapters: [
        {
          title: 'Kỷ Hồng Bàng & Hào Khí Độc Lập Ngàn Năm',
          content: `<p>Việt Nam Sử Lược là bộ thông sử đầu tiên được viết bằng chữ quốc ngữ, hệ thống hóa toàn bộ tiến trình lịch sử bốn ngàn năm dựng nước và giữ nước oai hùng của dân tộc Việt Nam.</p>
          <p>Từ thuở Vua Hùng khai quốc, truyền thuyết Trọng Thủy Mỵ Châu, đến cuộc khởi nghĩa quật cường của Hai Bà Trưng, Bà Triệu và chiến thắng Bạch Đằng lừng lẫy của Ngô Quyền chấm dứt nghìn năm Bắc thuộc, mở ra kỷ nguyên độc lập tự chủ rực rỡ.</p>`
        },
        {
          title: 'Hào Khí Đông A Nhà Trần & Chiến Công Bạch Đằng Giang',
          content: `<p>Dưới sự lãnh đạo kiệt xuất của Trần Hưng Đạo và các vua Trần, quân dân Đại Việt đã ba lần đánh tan đạo quân Nguyên Mông hung hãn nhất thế giới thời bấy giờ.</p>
          <p class="quote">"Hịch Tướng Sĩ vang vọng non sông: Dẫu cho trăm thân này phơi ngoài nội cỏ, nghìn thây này bọc trong da ngựa, ta cũng cam lòng! Hào khí Đông A bất diệt sáng ngời muôn thuở."</p>`
        }
      ]
    }
  ];

  for (const b of books) {
    const targetPath = path.join(DOCUMENTS_DIR, b.filename);
    const buf = await createEpubBuffer(b.title, b.author, b.id, b.chapters);
    fs.writeFileSync(targetPath, buf);
    console.log(`✅ Đã tạo thành công: ${b.filename} (${(buf.length / 1024).toFixed(1)} KB)`);
  }

  console.log('🎉 ĐÃ HOÀN THÀNH TẠO 9 TỆP EPUB KINH ĐIỂN VIỆT NAM THỰC TẾ!');
}

main().catch(console.error);
