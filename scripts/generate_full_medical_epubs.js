const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const DOCUMENTS_DIR = path.join(__dirname, '..', 'public', 'documents');

/**
 * Tạo sách EPUB toàn văn 10 chương: Dinh Dưỡng Nền Tảng & Phục Hồi Khớp
 */
async function generateFullEpubDinhDuong() {
  const zip = new JSZip();

  // 1. mimetype (không nén)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. container.xml
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

  const chapters = [
    {
      id: 'chapter1',
      title: 'Chương 1: Sinh Hóa Tế Bào Sụn Khớp & Mạng Lưới Collagen Type II',
      content: `
        <h1>Chương 1: Sinh Hóa Tế Bào Sụn Khớp & Mạng Lưới Collagen Type II</h1>
        <p class="lead">Sụn khớp không phải là một khối xương chết tĩnh tại, mà là một mô liên kết sống hoạt động chuyển hóa không ngừng nghỉ từng giây trong cơ thể bạn.</p>
        
        <h2>1. Cấu Trúc Đa Tầng Của Sụn Khớp Chuẩn Y Khoa</h2>
        <p>Sụn khớp là mô liên kết chuyên biệt được cấu tạo từ 3 thành phần chính:</p>
        <ul>
          <li><strong>Nước (chiếm 65 - 80% trọng lượng ướt):</strong> Đóng vai trò như bộ đệm thủy lực phân tán lực đè nén khi di chuyển và vận động mạnh.</li>
          <li><strong>Collagen Type II (chiếm 15 - 20%):</strong> Tạo thành hệ thống khung giàn sợi 3D chịu lực căng kéo, giữ chặt các phân tử proteoglycan tại chỗ.</li>
          <li><strong>Proteoglycan & Aggrecan (chiếm 9 - 10%):</strong> Các phân tử đại phân tử tích điện âm cực mạnh, đóng vai trò như những "nam châm hút nước" giữ chặt dịch khớp bên trong mô sụn.</li>
        </ul>

        <h2>2. Chu Kỳ Đồng Hóa & Dị Hóa Của Tế Bào Chondrocyte</h2>
        <p>Các tế bào sụn (chondrocyte) là tế bào duy nhất cư trú trong mô sụn. Ở người khỏe mạnh, tốc độ tổng hợp mô mới (đồng hóa) và tốc độ phân hủy chất nền cũ (dị hóa) luôn nằm ở trạng thái cân bằng động hoàn hảo.</p>
        <div class="callout warning">
          <strong>Cảnh báo sinh học:</strong> Khi ngọn lửa viêm bùng phát, các tế bào sụn bị kích thích sản sinh ồ ạt các enzyme phá hủy mô như <em>Matrix Metalloproteinase (MMP-13)</em> và <em>ADAMTS-5</em>. Các enzyme này cắt đứt mạng lưới collagen type II nhanh gấp 5 đến 10 lần tốc độ tự sửa chữa của cơ thể, dẫn đến hiện tượng nứt nẻ, bào mòn và xơ cứng bề mặt sụn.
        </div>

        <h2>3. Chiến Lược Dinh Dưỡng Bảo Vệ Khung Sợi Collagen</h2>
        <p>Để ngăn chặn quá trình thoái hóa sụn, chế độ dinh dưỡng cần cung cấp trực tiếp các khối xây dựng peptide giàu Proline, Hydroxyproline và Glycine kết hợp cùng Vitamin C sinh học – co-factor bắt buộc cho enzyme hydroxylase gắn kết các chuỗi xoắn ba collagen bền vững.</p>
      `
    },
    {
      id: 'chapter2',
      title: 'Chương 2: Cấp Nước Tế Bào & Cơ Chế Bơm Hút Thẩm Thấu Đĩa Đệm',
      content: `
        <h1>Chương 2: Cấp Nước Tế Bào & Cơ Chế Bơm Hút Thẩm Thấu Đĩa Đệm</h1>
        <p class="lead">Đĩa đệm ở người trưởng thành là cấu trúc hoàn toàn vô mạch. Làm thế nào một cấu trúc không có mạch máu nuôi dưỡng trực tiếp lại có thể duy trì sự sống suốt hàng chục năm?</p>

        <h2>1. Cơ Chế Thẩm Thấu Nhịp Sinh Học Ngày - Đêm</h2>
        <p>Toàn bộ dinh dưỡng và oxy đến đĩa đệm đều thông qua cơ chế <strong>bơm hút thẩm thấu vi mô</strong> qua các tấm sụn tận cùng (cartilaginous endplates):</p>
        <ul>
          <li><strong>Ban ngày (Tải trọng đè nén):</strong> Khi bạn đứng, ngồi và di chuyển, trọng lượng cơ thể ép nước và chất thải chuyển hóa ra khỏi đĩa đệm vào hệ tuần hoàn. Chiều cao cơ thể vào buổi tối thường giảm đi từ 1 đến 1.5 cm so với buổi sáng.</li>
          <li><strong>Ban đêm (Thư giãn giải áp):</strong> Khi bạn nằm ngủ ở tư thế thả lỏng tự nhiên, áp lực nội đĩa đệm giảm về gần 0. Lực hút thẩm thấu kéo nước tinh khiết cùng dưỡng chất hòa tan thẩm thấu ngược trở lại vào nhân nhầy, giúp đĩa đệm phồng căng và hồi phục hoàn toàn.</li>
        </ul>

        <div class="callout tip">
          <strong>Công Thức Cấp Nước Chuẩn Tế Bào Của Dr. Tùng:</strong><br/>
          Lượng nước tối ưu mỗi ngày = <code>Cân nặng (kg) × 0.04 Lít</code>.<br/>
          <em>Ví dụ: Người nặng 60kg cần uống đúng: 60 × 0.04 = 2.4 Lít nước mỗi ngày.</em>
        </div>

        <h2>2. Quy Tắc Uống Nước Đạt Hiệu Quả Thẩm Thấu Cao Nhất</h2>
        <p>1. <strong>Uống từng ngụm nhỏ:</strong> Giữ nước trong khoang miệng 3 giây trước khi nuốt để tế bào tiếp nhận tín hiệu điện giải, không uống ực một cốc lớn làm tăng gánh nặng lọc cho thận.</p>
        <p>2. <strong>Ly nước vàng buổi sáng:</strong> Ngay sau khi thức dậy, uống 300ml nước ấm nhẹ để bù đắp lượng nước hao hụt qua đường thở trong đêm và kích hoạt lưu thông dịch tủy sống.</p>
      `
    },
    {
      id: 'chapter3',
      title: 'Chương 3: Kháng Viêm Sinh Học Tế Bào Với Omega-3 & Curcumin',
      content: `
        <h1>Chương 3: Kháng Viêm Sinh Học Tế Bào Với Omega-3 & Curcumin</h1>
        <p class="lead">Cơn đau khớp không đơn thuần là cảm giác khó chịu cơ học, mà là hệ quả trực tiếp của một phản ứng viêm tế bào mạn tính đang âm ỉ tàn phá mô liên kết.</p>

        <h2>1. Con Đường Axit Arachidonic & Dập Tắt Cơn Bão Cytokine</h2>
        <p>Khi màng tế bào bị tổn thương, phospholipid màng giải phóng axit arachidonic. Dưới tác động của enzyme COX-2 và 5-LOX, chất này chuyển hóa thành Prostaglandin E2 (PGE2) và Leukotriene B4 – hai thủ phạm hàng đầu gây sưng tấy, xung huyết và kích thích rễ thần kinh cảm giác đau nhói.</p>

        <h2>2. Sức Mạnh Của Tỷ Lệ Vàng Omega-3 EPA/DHA</h2>
        <p>Axit béo Omega-3 tinh khiết từ cá biển sâu cạnh tranh trực tiếp với axit arachidonic tại thụ thể tế bào. Thay vì tạo ra các chất gây viêm, Omega-3 chuyển hóa thành các hợp chất chuyên biệt dập tắt viêm gọi là <strong>SPMs (Specialized Pro-resolving Mediators)</strong> bao gồm Resolvins, Protectins và Maresins, giúp:</p>
        <ul>
          <li>Làm dịu nhanh cảm giác nóng rát, phù nề tại bao hoạt dịch khớp.</li>
          <li>Kích thích đại thực bào dọn dẹp xác tế bào hoại tử mà không gây tổn thương mô lành xung quanh.</li>
          <li>Bảo toàn nguyên vẹn tính toàn vẹn của màng sụn đĩa đệm.</li>
        </ul>

        <h2>3. Curcumin Tinh Khiết & Hoạt Chất Bio-Piperine</h2>
        <p>Curcuminoid từ nghệ vàng là chất ức chế tự nhiên mạnh nhất đối với yếu tố phiên mã nhân <em>NF-kB</em> (công tắc tổng kích hoạt hơn 400 gen gây viêm trong cơ thể). Sử dụng Curcumin kết hợp Piperine từ hạt tiêu đen giúp tăng độ hấp thu qua ruột lên gấp <strong>2.000%</strong> (20 lần), mang lại hiệu quả giảm đau khớp tương đương thuốc kháng viêm thông thường nhưng hoàn toàn bảo vệ niêm mạc dạ dày.</p>
      `
    },
    {
      id: 'chapter4',
      title: 'Chương 4: Canxi Sinh Học Tảo Biển & Dẫn Truyền Khoáng Chất Vitamin D3, K2',
      content: `
        <h1>Chương 4: Canxi Sinh Học Tảo Biển & Dẫn Truyền Khoáng Chất Vitamin D3, K2</h1>
        <p class="lead">Bổ sung canxi sai cách không những không giúp xương chắc khỏe mà còn làm tăng nguy cơ vôi hóa mạch máu và sỏi thận. Chìa khóa nằm ở bộ ba Canxi Tảo Đỏ - D3 - K2.</p>

        <h2>1. Sự Khác Biệt Giữa Canxi Vô Cơ & Canxi Tảo Biển Aquamin F</h2>
        <p>Canxi vô cơ thông thường (Canxi Carbonate) có nguồn gốc từ đá vôi, cấu trúc tinh thể đặc cứng khó tan, tỷ lệ hấp thu thấp và dễ gây nóng trong, táo bón. Ngược lại, Canxi sinh học từ tảo đỏ <em>Lithothamnion</em> tự nhiên sở hữu cấu trúc xốp tổ ong xốp độc nhất vô nhị:</p>
        <ul>
          <li>Độ hòa tan và hấp thu sinh khả dụng cao gấp 3-4 lần canxi thông thường.</li>
          <li>Chứa đồng thời 72 loại khoáng chất vi lượng quý (Magie, Kẽm, Boron, Silic, Selen...) hỗ trợ tái lập mật độ xương toàn diện.</li>
        </ul>

        <h2>2. Cơ Chế Điều Hướng Chính Xác Của Vitamin K2 (Dạng MK-7)</h2>
        <p>Nếu Vitamin D3 là người gác cổng giúp canxi hấp thu từ ruột vào máu, thì <strong>Vitamin K2 (MK-7)</strong> chính là "người hoa tiêu" điều hướng dòng canxi:</p>
        <p>• K2 kích hoạt protein <em>Osteocalcin</em> để gắn chặt canxi vào các hốc rỗng của khung xương và đĩa đệm.</p>
        <p>• Đồng thời, K2 kích hoạt <em>Matrix Gla Protein (MGP)</em> để khóa canxi lại, tuyệt đối ngăn không cho canxi lắng đọng vào thành động mạch và van tim.</p>
      `
    },
    {
      id: 'chapter5',
      title: 'Chương 5: Glucosamine, Chondroitin & Tái Lập Glycosaminoglycan',
      content: `
        <h1>Chương 5: Glucosamine, Chondroitin & Tái Lập Glycosaminoglycan</h1>
        <p class="lead">Glycosaminoglycan (GAG) là chuỗi polysaccharide dài chịu trách nhiệm tạo nên độ trơn láng và tính đàn hồi sinh học của mọi ổ khớp trong cơ thể người.</p>

        <h2>1. Glucosamine Sulfate Tinh Thể – Nền Móng Dịch Khớp</h2>
        <p>Glucosamine là tiền chất tự nhiên để cơ thể tổng hợp nên Proteoglycan. Các nghiên cứu lâm sàng chỉ ra rằng <strong>Glucosamine Sulfate tinh thể</strong> với liều chuẩn 1.500 mg/ngày giúp kích thích tế bào sụn tăng tổng hợp dịch bôi trơn ổ khớp, làm giảm tiếng kêu lạo xạo khi gập duỗi gối và xoay cột sống.</p>

        <h2>2. Chondroitin Sulfate & Khả Năng Ngậm Nước Đỉnh Cao</h2>
        <p>Chondroitin là phân tử cấu trúc chính của sụn khớp, có các nhóm sulfate mang điện tích âm dày đặc. Chúng đẩy nhau tạo nên không gian mở để giữ nước giống như một miếng bọt biển cao cấp. Khi khớp chịu tải, nước bị ép ra; khi nhấc chân lên, Chondroitin lập tức hút nước trở lại, bảo vệ hai đầu xương không bị cọ xát trực tiếp vào nhau.</p>

        <h2>3. Methylsulfonylmethane (MSM) – Cầu Nối Disunfua Bền Vững</h2>
        <p>MSM là hợp chất lưu huỳnh sinh học hữu cơ giúp củng cố liên kết chéo giữa các sợi collagen, gia tăng sức chịu lực căng của dây chằng quanh cột sống và làm dịu nhanh cơn co thắt cơ bắp lưng vai.</p>
      `
    },
    {
      id: 'chapter6',
      title: 'Chương 6: Trục Não - Ruột - Khớp: Hệ Vi Sinh Đường Ruột & Kháng Viêm',
      content: `
        <h1>Chương 6: Trục Não - Ruột - Khớp: Hệ Vi Sinh Đường Ruột & Kháng Viêm</h1>
        <p class="lead">Bạn có biết rằng hơn 70% hệ thống miễn dịch của toàn cơ thể nằm ngay tại lớp niêm mạc ruột non và đại tràng?</p>

        <h2>1. Hội Chứng Rò Rỉ Ruột (Leaky Gut) & Viêm Khớp Mạn Tính</h2>
        <p>Khi chế độ ăn chứa nhiều đường tinh luyện, đồ dầu mỡ biến tính và căng thẳng kéo dài, hàng rào biểu mô ruột bị phá vỡ. Các khe liên kết tế bào bị mở rộng cho phép độc tố vi khuẩn <strong>Lipopolysaccharide (LPS)</strong> và các mảnh protein chưa tiêu hóa thẩm thấu thẳng vào dòng máu.</p>
        <p>Hệ thống miễn dịch nhận diện các phân tử ngoại lai này và phát động cuộc tổng tấn công viêm toàn thân. Thật không may, các kháng thể này thường tấn công nhầm vào mô bao hoạt dịch và đĩa đệm do hiện tượng bắt chước phân tử (molecular mimicry), kích hoạt các đợt sưng đau tái phát dai dẳng.</p>

        <h2>2. Khôi Phục Lợi Khuẩn Probiotics & Axit Béo Chuỗi Ngắn SCFA</h2>
        <p>Bổ sung các chủng lợi khuẩn đường ruột như <em>Lactobacillus rhamnosus</em> và <em>Bifidobacterium lactis</em> giúp lên men chất xơ hòa tan (Prebiotics) thành axit béo chuỗi ngắn <strong>Butyrate</strong>. Butyrate là nhiên liệu chính nuôi dưỡng tế bào biểu mô ruột, hàn gắn các vết rò rỉ và ra lệnh cho tế bào T điều hòa (T-reg) dập tắt phản ứng viêm tự miễn tại các ổ khớp.</p>
      `
    },
    {
      id: 'chapter7',
      title: 'Chương 7: Thực Đơn 7 Ngày Kháng Viêm Toàn Diện Cho Người Đau Khớp',
      content: `
        <h1>Chương 7: Thực Đơn 7 Ngày Kháng Viêm Toàn Diện Cho Người Đau Khớp</h1>
        <p class="lead">Ứng dụng trực tiếp triết lý "Thức ăn là phương thuốc tự nhiên nhất" với thực đơn 7 ngày thuần Việt giàu dược tính sinh học.</p>

        <h2>Nguyên Tắc Thiết Kế Thực Đơn:</h2>
        <ul>
          <li><strong>Tỷ lệ đĩa thức ăn:</strong> 50% rau củ nhiều màu sắc giàu Polyphenol, 25% đạm sạch dễ tiêu (cá béo, ức gà, đậu hạt), 25% tinh bột phức hợp chỉ số GI thấp (gạo lứt, khoai lang).</li>
          <li><strong>Gia vị kháng viêm chủ đạo:</strong> Nghệ tươi, gừng già, tỏi cô đơn, hành tím, dầu ô liu ép lạnh.</li>
        </ul>

        <h2>Lịch Trình Chi Tiết Trong Tuần:</h2>
        <p>• <strong>Thứ Hai:</strong> Sáng cháo yến mạch hạt chia nước cốt dừa. Trưa cá hồi áp chảo dầu ô liu, bông cải xanh luộc, gạo lứt tím. Tối canh bí đỏ nấu thịt nạc, đậu hũ sốt cà chua tươi.</p>
        <p>• <strong>Thứ Ba:</strong> Sáng sinh tố bơ chuối cải xoăn kale. Trưa ức gà hấp lá chanh, rau củ kho quẹt thanh đạm, khoai lang hấp. Tối canh mồng tơi nấu tôm tươi giàu canxi sinh học.</p>
        <p>• <strong>Thứ Tư:</strong> Sáng súp nấm đông cô hạt sen. Trưa cá thu kho nghệ tươi dập lửa nhỏ, rau muống xào tỏi, cơm gạo lứt. Tối salad ớt chuông, dưa chuột, trứng gà ta luộc và hạt óc chó.</p>
        <p>• <strong>Thứ Năm:</strong> Sáng khoai lang nướng ăn cùng sữa hạt óc chó hạnh nhân. Trưa chả cá lăng nướng thì là, canh chua cá lóc miền Tây thanh mát. Tối súp rau củ thập cẩm thanh lọc đường ruột.</p>
        <p>• <strong>Thứ Sáu:</strong> Sáng cháo cá bống nấu gừng giải cảm thông kinh lạc. Trưa tôm hấp sả, bông atiso hầm giò nạc lấy collagen tự nhiên. Tối đậu cô ve luộc chấm muối mè đen giàu kẽm.</p>
        <p>• <strong>Thứ Bảy:</strong> Sáng bánh mì nguyên cám kẹp bơ nghiền và trứng ốp la lòng đào. Trưa lẩu nấm dưỡng sinh thảo mộc các loại nấm tươi. Tối canh rong biển nấu đậu hũ non thanh lọc độc tố.</p>
        <p>• <strong>Chủ Nhật:</strong> Ngày thanh lọc nhẹ nhàng: Nước hầm xương bò ninh nhừ 12 tiếng giàu Gelatin tự nhiên kết hợp rau củ củ quả tươi ép lạnh giàu enzyme.</p>
      `
    },
    {
      id: 'chapter8',
      title: 'Chương 8: Độc Tố AGEs & Tác Hại Của Đường Tinh Luyện Lên Mô Khớp',
      content: `
        <h1>Chương 8: Độc Tố AGEs & Tác Hại Của Đường Tinh Luyện Lên Mô Khớp</h1>
        <p class="lead">Đường tinh luyện và thực phẩm chiên nướng nhiệt độ cao là kẻ thù số một âm thầm biến mạng lưới collagen dẻo dai thành những sợi giòn gãy như thủy tinh.</p>

        <h2>1. Phản Ứng Glycat Hóa & Sự Xuất Hiện Của AGEs</h2>
        <p>Khi nồng độ glucose trong máu tăng cao kéo dài, các phân tử đường tự do bám dính vào các protein cấu trúc mà không cần enzyme xúc tác. Hiện tượng này gọi là phản ứng glycat hóa sinh ra <strong>AGEs (Advanced Glycation End-products)</strong>.</p>
        <p>Mô đĩa đệm và sụn khớp có tốc độ thay mới protein rất chậm (thời gian bán hủy của collagen sụn lên tới 100 năm!). Do đó, một khi AGEs đã lắng đọng vào collagen khớp:</p>
        <ul>
          <li>Các sợi collagen mất hoàn toàn tính đàn hồi, trở nên xơ cứng và dễ nứt vỡ dưới tải trọng bình thường.</li>
          <li>Kích thích thụ thể RAGE trên tế bào sụn giải phóng các gốc tự do tàn phá bao hoạt dịch.</li>
        </ul>

        <h2>2. Ba Hành Động Cắt Đứt Nguồn Gốc AGEs</h2>
        <p>1. <strong>Loại bỏ hoàn toàn nước ngọt có gas và siro bắp cao phân tử (HFCS):</strong> Fructose tự do sinh ra độc tố AGEs nhanh gấp 10 lần glucose thông thường.</p>
        <p>2. <strong>Ưu tiên phương pháp nấu nhiệt độ thấp:</strong> Hấp, luộc, hầm chậm thay vì chiên ngập dầu hoặc nướng trực tiếp trên than hồng.</p>
        <p>3. <strong>Sử dụng nước cốt chanh hoặc giấm táo khi ướp thịt:</strong> Môi trường axit tự nhiên giúp giảm tới 50% lượng AGEs hình thành trong quá trình chế biến nhiệt.</p>
      `
    },
    {
      id: 'chapter9',
      title: 'Chương 9: Nước Ion Kiềm & Cân Bằng Toan Kiềm Cho Cơ Xương Khớp',
      content: `
        <h1>Chương 9: Nước Ion Kiềm & Cân Bằng Toan Kiềm Cho Cơ Xương Khớp</h1>
        <p class="lead">Độ pH máu nội môi bắt buộc phải dao động trong giới hạn cực kỳ hẹp từ 7.35 đến 7.45. Khi cơ thể bị toan hóa do sinh hoạt, điều gì sẽ xảy ra với hệ cơ xương khớp?</p>

        <h2>1. Cái Giá Của Môi Trường Toan Hóa (Acidosis)</h2>
        <p>Chế độ ăn nhiều thịt đỏ công nghiệp, rượu bia, cà phê quá mức và căng thẳng thần kinh sản sinh lượng lớn axit lactic, axit uric và axit phosphoric. Để giữ pH máu không tụt xuống ngưỡng nguy hiểm tính mạng, cơ thể buộc phải kích hoạt cơ chế tự vệ khẩn cấp: <strong>Rút các ion kiềm (Canxi, Magie, Kali) từ ngân hàng dự trữ xương và đĩa đệm</strong> để trung hòa axit.</p>
        <p>Hệ quả là mật độ khoáng chất xương suy giảm nhanh chóng, dịch khớp bị chua hóa làm các đầu mút dây thần kinh trở nên siêu nhạy cảm với các xung động đau.</p>

        <h2>2. Lợi Ích Của Nước Giàu Hydrogen Phân Tử Nhỏ</h2>
        <p>Nước điện giải ion kiềm giàu phân tử Hydro (H2) có đặc tính vượt trội:</p>
        <ul>
          <li><strong>Cụm phân tử nước siêu nhỏ (5-6 phân tử):</strong> Thẩm thấu qua màng tế bào sụn nhanh gấp 3 lần nước lọc thông thường.</li>
          <li><strong>Chỉ số chống oxy hóa ORP âm sâu (-300mV đến -600mV):</strong> Trung hòa có chọn lọc các gốc tự do hydroxyl (•OH) độc hại nhất mà không ảnh hưởng đến các gốc có lợi của hệ miễn dịch.</li>
        </ul>
      `
    },
    {
      id: 'chapter10',
      title: 'Chương 10: Quy Trình 3 Bước Tự Phục Hồi Khớp Bền Vững Tại Nhà',
      content: `
        <h1>Chương 10: Quy Trình 3 Bước Tự Phục Hồi Khớp Bền Vững Tại Nhà</h1>
        <p class="lead">Tổng hợp toàn bộ kiến thức thành lộ trình hành động 90 ngày rõ ràng, giúp bạn tự tin làm chủ sức khỏe cột sống và khớp của chính mình.</p>

        <h2>Giai Đoạn 1: Cắt Đứt Ổ Viêm (Ngày 1 - 21)</h2>
        <p>• Áp dụng triệt để thực đơn 7 ngày kháng viêm tự nhiên.</p>
        <p>• Bổ sung liều tấn công: Omega-3 EPA/DHA tinh khiết kết hợp Curcumin phytosome.</p>
        <p>• Uống đủ 0.04L nước/kg trọng lượng cơ thể chia đều từng ngụm nhỏ suốt ngày.</p>
        <p>• Tránh mọi động tác cúi gập gắt hoặc mang vác vật nặng sai tư thế.</p>

        <h2>Giai Đoạn 2: Tái Lập Chất Nền & Tăng Độ Đàn Hồi (Ngày 22 - 60)</h2>
        <p>• Bổ sung Glucosamine Sulfate tinh thể kết hợp Chondroitin và Canxi tảo đỏ Lithothamnion (có D3, K2 MK-7).</p>
        <p>• Bắt đầu chuỗi 15 phút bài tập sinh học giải nén cột sống thắt lưng và cổ gáy mỗi ngày.</p>
        <p>• Thiết lập lại không gian làm việc công thái học: màn hình ngang tầm mắt, tựa lưng giữ góc ưỡn sinh lý 100-110 độ.</p>

        <h2>Giai Đoạn 3: Củng Cố & Duy Trì Phong Độ Đỉnh Cao (Ngày 61 - 90+)</h2>
        <p>• Duy trì lối sống dinh dưỡng sạch 80% kiềm - 20% toan.</p>
        <p>• Thực hiện quy tắc 20-20-20 khi ngồi máy tính: cứ sau 20 phút nhìn xa 6 mét trong 20 giây.</p>
        <p>• Đo lường sự cải thiện: Biên độ vận động khớp tăng lên, không còn cảm giác tê bì buốt nhói khi thức dậy buổi sáng.</p>

        <div class="callout tip">
          <strong>Lời Kết Của Dr. Tùng:</strong> Cơ thể bạn là một cỗ máy sinh học kỳ diệu với khả năng tự chữa lành phi thường, miễn là bạn cung cấp cho nó đúng nguyên liệu và đối xử với nó bằng sự thấu hiểu mỗi ngày. Chúc bạn luôn dồi dào sức sống và tự do chuyển động!
        </div>
      `
    }
  ];

  // OPF Manifest & Spine
  const manifestItems = chapters.map(c => `    <item id="${c.id}" href="${c.id}.html" media-type="application/xhtml+xml"/>`).join('\n');
  const spineItems = chapters.map(c => `    <itemref idref="${c.id}"/>`).join('\n');

  oebps.file(
    'content.opf',
    `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Dinh Dưỡng Nền Tảng &amp; Phục Hồi Khớp (Toàn Văn 10 Chương)</dc:title>
    <dc:creator>Dr. Tùng · Tủ Sách Y Khoa Qbiz</dc:creator>
    <dc:language>vi</dc:language>
    <dc:identifier id="BookId">urn:uuid:qbiz-ebook-dinhduong-full-10chap</dc:identifier>
  </metadata>
  <manifest>
    <item id="style" href="style.css" media-type="text/css"/>
${manifestItems}
  </manifest>
  <spine>
${spineItems}
  </spine>
</package>`
  );

  const cssContent = `
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.8; padding: 1.5rem; color: #2c1a0e; background-color: #fcfbf9; }
    h1 { color: #854d0e; font-size: 1.55rem; font-weight: 800; border-bottom: 2px solid #fde047; padding-bottom: 0.6rem; margin-top: 0; margin-bottom: 1.2rem; }
    h2 { color: #92400e; font-size: 1.25rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.8rem; }
    p { margin-bottom: 1.1rem; text-align: justify; font-size: 1.05rem; }
    .lead { font-size: 1.12rem; font-weight: 600; color: #78350f; background: #fefce8; padding: 0.8rem 1rem; border-left: 4px solid #ca8a04; border-radius: 0 8px 8px 0; margin-bottom: 1.4rem; }
    ul { margin-bottom: 1.2rem; padding-left: 1.5rem; }
    li { margin-bottom: 0.6rem; font-size: 1.02rem; }
    .callout { padding: 1rem 1.2rem; border-radius: 8px; margin: 1.5rem 0; font-size: 1rem; }
    .callout.warning { background: #fff1f2; border-left: 4px solid #f43f5e; color: #881337; }
    .callout.tip { background: #ecfdf5; border-left: 4px solid #10b981; color: #064e3b; }
    code { background: #fef08a; padding: 0.2rem 0.4rem; border-radius: 4px; font-weight: bold; color: #713f12; }
  `;

  oebps.file('style.css', cssContent);

  for (const c of chapters) {
    const html = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>${c.title}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  ${c.content}
</body>
</html>`;
    oebps.file(`${c.id}.html`, html);
  }

  const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const targetPath = path.join(DOCUMENTS_DIR, 'dinh_duong_phuc_hoi_khop_va_dia_dem.epub');
  fs.writeFileSync(targetPath, content);
  console.log('✅ Đã nâng cấp thành công EPUB Dinh Dưỡng Toàn Văn 10 Chương:', targetPath, `(${content.length} bytes)`);
}

/**
 * Nâng cấp sách EPUB toàn văn 8 chương: Cẩm Nang Đốt Sống Cổ & Vai Gáy
 */
async function generateFullEpubCotsongCo() {
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

  const chapters = [
    {
      id: 'chapter1',
      title: 'Chương 1: Giải Phẫu Chi Tiết 7 Đốt Sống Cổ C1-C7 & Đĩa Đệm Cổ',
      content: `
        <h1>Chương 1: Giải Phẫu Chi Tiết 7 Đốt Sống Cổ C1-C7 & Đĩa Đệm Cổ</h1>
        <p class="lead">Đoạn cột sống cổ là phần linh hoạt nhất nhưng cũng mỏng manh và chịu nhiều tải trọng đè nén bất đối xứng nhất trên toàn bộ trục thân thể người.</p>
        <h2>1. Kiến Trúc Cơ Học Đốt Đội C1 (Atlas) & Đốt Trục C2 (Axis)</h2>
        <p>Cột sống cổ gồm <strong>7 đốt sống</strong> ký hiệu C1 đến C7 tạo thành đường cong ưỡn sinh lý tự nhiên hướng ra phía trước khoảng 35-45 độ:</p>
        <ul>
          <li><strong>Đốt C1 (Atlas):</strong> Không có thân đốt sống, hình vành khuyên tiếp xúc với lồi cầu xương chẩm, chịu toàn bộ tải trọng 5kg của hộp sọ não.</li>
          <li><strong>Đốt C2 (Axis):</strong> Có mỏm răng nhô lên cắm vào lòng khớp đốt C1, giữ bởi dây chằng ngang cực kỳ chắc chắn, chịu trách nhiệm cho 50% tầm vận động xoay trái phải của toàn bộ vùng cổ.</li>
        </ul>
        <h2>2. Cấu Trúc Đĩa Đệm Cổ C3 - C7</h2>
        <p>Các đốt từ C3 đến C7 có khớp mỏm móc (Uncovertebral joints of Luschka) đặc thù. Khớp này giúp hạn chế trượt ngang nhưng lại là nơi dễ mọc gai xương nhất khi đĩa đệm bị xẹp, gây chèn ép động mạch đốt sống thân nền và rễ thần kinh.</p>
      `
    },
    {
      id: 'chapter2',
      title: 'Chương 2: Hội Chứng Cổ Vai Gáy Hiện Đại & Tải Trọng 27kg Khi Cúi Đầu',
      content: `
        <h1>Chương 2: Hội Chứng Cổ Vai Gáy Hiện Đại & Tải Trọng 27kg Khi Cúi Đầu</h1>
        <p class="lead">Nghiên cứu cơ sinh học chấn động của Tiến sĩ Kenneth Hansraj (Hoa Kỳ) đã vạch trần cái giá đắt đỏ của thói quen dán mắt vào màn hình điện thoại thông minh.</p>
        <h2>1. Biểu Đồ Áp Lực Đè Nén Theo Góc Gập Đầu</h2>
        <ul>
          <li><strong>Góc 0 độ (Thẳng trục tự nhiên):</strong> Trọng lượng tác động lên đốt sống cổ khoảng <strong>4.5 - 5.5 kg</strong>.</li>
          <li><strong>Góc 15 độ:</strong> Áp lực tăng lên <strong>12 kg</strong>.</li>
          <li><strong>Góc 30 độ:</strong> Áp lực tăng lên <strong>18 kg</strong>.</li>
          <li><strong>Góc 45 độ:</strong> Áp lực tăng vọt lên <strong>22 kg</strong>.</li>
          <li><strong>Góc 60 độ (Tư thế bấm điện thoại thông thường):</strong> Áp lực đè nén lên các đĩa đệm C5-C6 lên tới <strong>27 kg</strong> – tương đương bạn đang cho một đứa trẻ 8 tuổi ngồi vắt vẻo trên cổ suốt hàng giờ đồng hồ!</li>
        </ul>
        <h2>2. Hậu Quả Thoái Hóa & Mất Đường Cong Sinh Lý</h2>
        <p>Khi các cơ dựng cổ phía sau phải gồng căng liên tục để giữ khối đầu 27kg, máu nuôi cơ bị tắc nghẽn tạo thành các điểm nút co thắt cơ kích hoạt (Trigger Points) gây đau đầu vận mạch, cứng gáy buổi sáng và lâu dần làm thẳng đơ hoặc đảo ngược đường cong sinh lý cột sống cổ.</p>
      `
    },
    {
      id: 'chapter3',
      title: 'Chương 3: Đám Rối Thần Kinh Cánh Tay & Đường Dẫn Truyền Rễ C5-T1',
      content: `
        <h1>Chương 3: Đám Rối Thần Kinh Cánh Tay & Đường Dẫn Truyền Rễ C5-T1</h1>
        <p class="lead">Tại sao tổn thương ở cổ lại làm tê buốt ngón tay cái hoặc yếu lực cầm nắm bàn tay? Bí mật nằm ở mạng lưới dây thần kinh xuất phát từ tủy sống cổ.</p>
        <h2>1. Bản Đồ Phân Bổ Vùng Chi Phối Thần Kinh (Dermatome)</h2>
        <ul>
          <li><strong>Rễ thần kinh C5:</strong> Chi phối vận động cơ delta dạng cánh tay và cảm giác mặt ngoài bắp tay.</li>
          <li><strong>Rễ thần kinh C6:</strong> Chi phối gập cẳng tay (cơ nhị đầu) và cảm giác dọc bờ ngoài cẳng tay xuống <em>ngón tay cái và ngón trỏ</em>.</li>
          <li><strong>Rễ thần kinh C7:</strong> Chi phối duỗi khuỷu tay (cơ tam đầu) và cảm giác <em>ngón tay giữa</em>.</li>
          <li><strong>Rễ thần kinh C8:</strong> Chi phối các cơ gấp ngón tay và cảm giác <em>ngón áp út và ngón út</em>.</li>
        </ul>
        <h2>2. Dấu Hiệu Nhận Biết Sớm Chèn Ép Rễ Thần Kinh Cổ</h2>
        <p>Nếu bạn xuất hiện cảm giác kiến bò, tê châm kim lan từ cổ xuống cánh tay, hoặc cảm thấy cầm đũa, cài khuy áo vụng về, đó là tín hiệu báo động đỏ cho thấy đĩa đệm C5-C6 hoặc C6-C7 đang lồi ra chèn ép vào bao rễ thần kinh.</p>
      `
    },
    {
      id: 'chapter4',
      title: 'Chương 4: Nguyên Lý Công Thái Học & Tư Thế Vàng Nơi Công Sở',
      content: `
        <h1>Chương 4: Nguyên Lý Công Thái Học & Tư Thế Vàng Nơi Công Sở</h1>
        <p class="lead">Bạn không thể chữa lành cổ gáy nếu mỗi ngày vẫn tiếp tục ngồi sai tư thế 8 đến 10 tiếng trước bàn làm việc.</p>
        <h2>1. Ba Điểm Căn Chỉnh Vàng Cho Bàn Làm Việc:</h2>
        <p>1. <strong>Màn hình ngang tầm mắt:</strong> Cạnh trên của màn hình máy tính phải ngang bằng hoặc thấp hơn mắt 2-3 cm. Khoảng cách từ mắt đến màn hình từ 50 - 70 cm (khoảng một sải tay).</p>
        <p>2. <strong>Khuỷu tay vuông góc 90 độ:</strong> Cẳng tay và cổ tay đặt thoải mái trên mặt bàn hoặc tay vịn ghế, không nhấc vai gồng cơ thang khi gõ phím.</p>
        <p>3. <strong>Hông và đầu gối góc 90-100 độ:</strong> Bàn chân đặt vững chãi trên sàn nhà, mông chạm sát vào lưng ghế có gối tựa thắt lưng hỗ trợ.</p>
        <h2>2. Quy Tắc 20-20-20 Chống Đơ Cứng Khớp</h2>
        <p>Cứ sau mỗi 20 phút tập trung làm việc, hãy đưa mắt nhìn ra xa 20 feet (6 mét) trong 20 giây và thực hiện 3 nhịp hít sâu, vươn cằm thụt cổ giải nén áp lực cho đĩa đệm.</p>
      `
    },
    {
      id: 'chapter5',
      title: 'Chương 5: Chuỗi 6 Bài Tập Vận Động Giải Nén Cột Sống Cổ 15 Phút Mỗi Ngày',
      content: `
        <h1>Chương 5: Chuỗi 6 Bài Tập Vận Động Giải Nén Cột Sống Cổ 15 Phút Mỗi Ngày</h1>
        <p class="lead">Các bài tập sinh cơ học được thiết kế để mở rộng lỗ liên hợp đốt sống, giải phóng rễ thần kinh bị chèn ép mà không cần bất kỳ dụng cụ đắt tiền nào.</p>
        <h2>Bài Tập 1: Thụt Cằm Giải Nén (Chin Tuck)</h2>
        <p>Ngồi thẳng lưng, mắt nhìn thẳng. Đặt ngón tay trỏ lên cằm, nhẹ nhàng đẩy cằm ra sau như thể đang tạo "nọng cằm kép". Giữ 5 giây rồi thả lỏng. Thực hiện 10 lần. Bài tập này kéo giãn khối cơ dưới chẩm và kích hoạt cơ gấp cổ sâu.</p>
        <h2>Bài Tập 2: Kéo Giãn Cơ Ức Đòn Chũm & Cơ Thang Trên</h2>
        <p>Ngồi trên ghế, tay phải nắm nhẹ mép ghế để cố định vai. Nghiêng đầu sang trái 45 độ, tay trái đặt nhẹ lên đỉnh đầu kéo nhẹ nhàng cảm nhận sức căng êm dịu bên phải cổ. Giữ 20 giây, đổi bên.</p>
        <h2>Bài Tập 3: Tư Thế Cánh Bướm Mở Rộng Lồng Ngực (Chest Opener)</h2>
        <p>Đan hai tay sau gáy, hít sâu mở rộng hai khuỷu tay sang hai bên, ép nhẹ hai bả vai vào nhau và ngửa nhẹ đầu ra sau. Thở ra từ từ trở về vị trí cũ. Thực hiện 8 lần giúp đảo ngược tư thế gù lưng rụt cổ.</p>
      `
    },
    {
      id: 'chapter6',
      title: 'Chương 6: Kỹ Thuật Trượt Dây Thần Kinh (Nerve Flossing) Chống Tê Tay',
      content: `
        <h1>Chương 6: Kỹ Thuật Trượt Dây Thần Kinh (Nerve Flossing) Chống Tê Tay</h1>
        <p class="lead">Dây thần kinh cần được trượt trơn tru qua các khe cơ và xương. Khi bị dính dính do viêm, kỹ thuật trượt thần kinh là cứu tinh giải thoát triệu chứng tê bì.</p>
        <h2>Nguyên Lý Trượt Dây Thần Kinh Giữa (Median Nerve Floss):</h2>
        <p>1. Đứng thẳng, đưa cánh tay phải sang ngang ngang vai, gập khuỷu tay 90 độ hướng lên trần nhà.</p>
        <p>2. Duỗi thẳng cánh tay sang phải, bẻ ngược cổ tay ra sau như đang nâng một khay trà, đồng thời nghiêng đầu sang bên trái (kéo căng thần kinh).</p>
        <p>3. Ngay lập tức gập khuỷu tay lại và nghiêng đầu sang bên phải (thả chùng thần kinh).</p>
        <p>4. Chuyển động nhịp nhàng như sợi chỉ luồn qua lỗ kim từ 10 - 15 nhịp. Tuyệt đối không kéo giật mạnh mà duy trì chuyển động trơn láng êm dịu.</p>
      `
    },
    {
      id: 'chapter7',
      title: 'Chương 7: Tiêu Chuẩn Gối Ngủ & Tư Thế Bảo Vệ Cổ Suốt Đêm',
      content: `
        <h1>Chương 7: Tiêu Chuẩn Gối Ngủ & Tư Thế Bảo Vệ Cổ Suốt Đêm</h1>
        <p class="lead">Bạn dành 1/3 cuộc đời trên giường ngủ. Một chiếc gối sai kích cỡ chính là thủ phạm âm thầm bẻ gãy đường cong sinh lý cổ mỗi đêm.</p>
        <h2>1. Chiều Cao Gối Lý Tưởng:</h2>
        <ul>
          <li><strong>Khi nằm ngửa:</strong> Gối cần có độ dày từ <strong>8 đến 10 cm</strong> khi đã chịu sức nặng của đầu. Phần lõm giữa đỡ hộp sọ, phần gờ nhô cao nâng đỡ kín khoảng trống sau gáy, giữ cho trán và cằm nằm trên cùng một đường thẳng song song với mặt nệm.</li>
          <li><strong>Khi nằm nghiêng:</strong> Chiều cao gối phải bằng đúng khoảng cách từ bờ ngoài mỏm cùng vai đến gốc cổ (khoảng 12 - 14 cm) để giữ trục cột sống từ cổ qua ngực và thắt lưng luôn thẳng tắp.</li>
        </ul>
        <h2>2. Tuyệt Đối Tránh Nằm Sấp:</h2>
        <p>Nằm sấp buộc bạn phải xoay vặn cổ 90 độ suốt nhiều giờ liền để thở, gây xoắn vặn đốt C1-C2 và bóp nghẹt động mạch cảnh, dẫn đến thiếu máu não thoáng qua và cứng đơ cổ khi thức dậy.</p>
      `
    },
    {
      id: 'chapter8',
      title: 'Chương 8: Dinh Dưỡng & Vi Khoáng Giảm Co Thắt Cơ Cổ Thang Mạn Tính',
      content: `
        <h1>Chương 8: Dinh Dưỡng & Vi Khoáng Giảm Co Thắt Cơ Cổ Thang Mạn Tính</h1>
        <p class="lead">Cơ bắp vùng cổ gáy bị co cứng mạn tính liên tục cần các khoáng chất vi lượng thư giãn thần kinh cơ để lập lại trạng thái mềm dẻo tự nhiên.</p>
        <h2>1. Bộ Đôi Magie Bisglycinate & Kali Hữu Cơ</h2>
        <p>Canxi gây co cơ, trong khi Magie là chất chủ vận bắt buộc để cơ bắp thư giãn. Khi thiếu Magie tế bào, các sợi actin và myosin bị khóa chặt trong trạng thái co cứng:</p>
        <p>• Bổ sung 300 - 400 mg <strong>Magie Bisglycinate</strong> (dạng gắn kết amino acid hấp thu cao) vào buổi tối giúp làm dịu hệ thần kinh giao cảm và giãn cơ sâu.</p>
        <p>• Ăn các thực phẩm giàu Kali như chuối tiêu, bơ sáp, nước dừa tươi giúp cân bằng điện giải màng tế bào cơ.</p>
        <h2>2. Vitamin Nhóm B Liều Cao Phục Hồi Vỏ Bọc Myelin</h2>
        <p>Vitamin B1 (Benfotiamine), B6 và B12 (Methylcobalamin) tham gia trực tiếp vào quá trình tái tạo lớp vỏ bao myelin bảo vệ dây thần kinh tủy sống cổ, cắt đứt dẫn truyền xung động đau mạn tính và phục hồi cảm giác xúc giác tinh tế cho bàn tay.</p>
      `
    }
  ];

  const manifestItems = chapters.map(c => `    <item id="${c.id}" href="${c.id}.html" media-type="application/xhtml+xml"/>`).join('\n');
  const spineItems = chapters.map(c => `    <itemref idref="${c.id}"/>`).join('\n');

  oebps.file(
    'content.opf',
    `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Cẩm Nang Đốt Sống Cổ &amp; Vai Gáy (Toàn Văn 8 Chương)</dc:title>
    <dc:creator>Dr. Tùng · Tủ Sách Y Khoa Qbiz</dc:creator>
    <dc:language>vi</dc:language>
    <dc:identifier id="BookId">urn:uuid:qbiz-ebook-cotsong-co-full-8chap</dc:identifier>
  </metadata>
  <manifest>
    <item id="style" href="style.css" media-type="text/css"/>
${manifestItems}
  </manifest>
  <spine>
${spineItems}
  </spine>
</package>`
  );

  const cssContent = `
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.8; padding: 1.5rem; color: #2c1a0e; background-color: #fcfbf9; }
    h1 { color: #854d0e; font-size: 1.55rem; font-weight: 800; border-bottom: 2px solid #fde047; padding-bottom: 0.6rem; margin-top: 0; margin-bottom: 1.2rem; }
    h2 { color: #92400e; font-size: 1.25rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.8rem; }
    p { margin-bottom: 1.1rem; text-align: justify; font-size: 1.05rem; }
    .lead { font-size: 1.12rem; font-weight: 600; color: #78350f; background: #fefce8; padding: 0.8rem 1rem; border-left: 4px solid #ca8a04; border-radius: 0 8px 8px 0; margin-bottom: 1.4rem; }
    ul { margin-bottom: 1.2rem; padding-left: 1.5rem; }
    li { margin-bottom: 0.6rem; font-size: 1.02rem; }
    .callout { padding: 1rem 1.2rem; border-radius: 8px; margin: 1.5rem 0; font-size: 1rem; }
    .callout.warning { background: #fff1f2; border-left: 4px solid #f43f5e; color: #881337; }
    .callout.tip { background: #ecfdf5; border-left: 4px solid #10b981; color: #064e3b; }
    code { background: #fef08a; padding: 0.2rem 0.4rem; border-radius: 4px; font-weight: bold; color: #713f12; }
  `;

  oebps.file('style.css', cssContent);

  for (const c of chapters) {
    const html = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>${c.title}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  ${c.content}
</body>
</html>`;
    oebps.file(`${c.id}.html`, html);
  }

  const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const targetPath = path.join(DOCUMENTS_DIR, 'cam_nang_dot_song_co_vai_gay.epub');
  fs.writeFileSync(targetPath, content);
  console.log('✅ Đã nâng cấp thành công EPUB Đốt Sống Cổ Toàn Văn 8 Chương:', targetPath, `(${content.length} bytes)`);
}

async function main() {
  console.log('🚀 Bắt đầu nâng cấp toàn diện các đầu sách EPUB Y khoa & Dinh dưỡng thành TOÀN VĂN ĐẦY ĐỦ...');
  await generateFullEpubDinhDuong();
  await generateFullEpubCotsongCo();
  console.log('🎉 Hoàn thành xuất sắc toàn bộ sách EPUB Y khoa & Dinh dưỡng!');
}

main().catch(console.error);
