export interface BookTocItem {
  id?: string;
  title: string;
  pageIndex: number; // 0-based
  pageNumber: number; // 1-based
  summary?: string;
}

// Chuẩn hóa chuỗi tìm kiếm không dấu
function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Mục lục & phân đoạn cốt lõi của các tác phẩm kinh điển và sách y khoa
 */
export const CURATED_BOOK_TOCS: Record<string, BookTocItem[]> = {
  // Dinh Dưỡng Học Bị Thất Truyền - Đẩy Lùi Bệnh Tật (Bản gốc 136 trang)
  'dinhduonghocbithattruyen': [
    { title: 'Chương 1: Dùng quan niệm đúng đắn chỉ đạo cuộc sống', pageIndex: 0, pageNumber: 1, summary: 'Nêu bật tầm quan trọng của việc hiểu đúng về quy luật sinh học và bảo vệ sức khỏe chủ động.' },
    { title: 'Chương 2: Cơ thể con người có khả năng tự phục hồi kỳ diệu', pageIndex: 17, pageNumber: 18, summary: 'Khám phá năng lực tự sửa chữa, tự tái tạo của tế bào khi được cung cấp đầy đủ nguyên liệu dinh dưỡng.' },
    { title: 'Chương 3: Khái niệm bệnh mạn tính và vai trò của dinh dưỡng', pageIndex: 34, pageNumber: 35, summary: 'Phân tích bản chất bệnh mạn tính không phải do thiếu thuốc mà do tổn thương và thiếu hụt vi chất kéo dài.' },
    { title: 'Chương 4: Gan - Đại tổng quản sức khỏe và nhà máy sinh hóa', pageIndex: 51, pageNumber: 52, summary: 'Giải mã chức năng trung tâm của gan trong chuyển hóa đạm, đường, chất béo và giải độc toàn thân.' },
    { title: 'Chương 5: Dinh dưỡng đối với bệnh tim mạch và xơ vữa mạch', pageIndex: 73, pageNumber: 74, summary: 'Cơ chế hình thành mảng xơ vữa động mạch và phương pháp phục hồi lòng mạch tự nhiên bằng dưỡng chất.' },
    { title: 'Chương 6: Bệnh tiểu đường và rối loạn chuyển hóa đường', pageIndex: 91, pageNumber: 92, summary: 'Làm sáng tỏ nguồn gốc tiểu đường bắt đầu từ rối loạn chức năng chuyển hóa tại gan, không chỉ riêng tuyến tụy.' },
    { title: 'Chương 7: Thoái hóa xương khớp, cột sống & đĩa đệm', pageIndex: 107, pageNumber: 108, summary: 'Phân tích cơ chế tái tạo sụn khớp, đĩa đệm và khôi phục mật độ xương thông qua canxi, khoáng chất và collagen.' },
    { title: 'Chương 8: Giấc ngủ sâu và tăng cường miễn dịch tự nhiên', pageIndex: 123, pageNumber: 124, summary: 'Mối quan hệ mật thiết giữa giấc ngủ, hệ thần kinh và chu trình phục hồi miễn dịch ban đêm.' },
  ],

  // Hiểu Đúng Về Cột Sống
  'hieudungvecotsong': [
    { title: 'Chương 1: Cơ Chế Sinh Học & Giảm Xóc Đĩa Đệm', pageIndex: 0, pageNumber: 1, summary: 'Cấu trúc 33 đốt sống, 4 đường cong sinh lý và cơ chế giảm xóc của đĩa đệm ngậm nước.' },
    { title: 'Chương 2: Thoát Vị & Chèn Ép Rễ Thần Kinh L4-L5', pageIndex: 1, pageNumber: 2, summary: 'Nguyên nhân rách vòng sợi bao xơ, nhân nhầy tràn ra chèn ép thần kinh tọa và giải pháp.' },
    { title: 'Chương 3: Phương Pháp Vận Động & Khôi Phục Đường Cong Sinh Lý', pageIndex: 2, pageNumber: 3, summary: 'Các tư thế vận động sinh học giúp giải nén áp lực đĩa đệm và bảo tồn cột sống.' },
    { title: 'Phụ Lục: Bảng Tra Cứu Rễ Thần Kinh Cột Sống', pageIndex: 3, pageNumber: 4, summary: 'Sơ đồ định vị phân bổ các nhánh thần kinh tủy sống tương ứng với từng vùng cơ thể.' },
  ],

  // Cẩm Nang Đốt Sống Cổ & Vai Gáy
  'camnangdotsongco': [
    { title: 'Chương 1: Hội Chứng Cổ Vai Gáy Dân Văn Phòng', pageIndex: 0, pageNumber: 1, summary: 'Tác hại tải trọng gấp 3-5 lần khi gập đầu cúi bấm điện thoại lên các đốt sống cổ C1-C7.' },
    { title: 'Chương 2: Vận Động Giải Nén Cột Sống Cổ', pageIndex: 1, pageNumber: 2, summary: 'Bài tập giải phóng chèn ép rễ thần kinh cánh tay, giảm đau nửa đầu và tê bì ngón tay.' },
    { title: 'Chương 3: Dinh Dưỡng Kháng Viêm Vùng Cổ & Vai Gáy', pageIndex: 2, pageNumber: 3, summary: 'Chế độ ăn vi chất và khoáng chất hỗ trợ thả lỏng cơ sâu và bảo vệ bao xơ đĩa đệm cổ.' },
  ],

  // Dinh Dưỡng Nền Tảng & Phục Hồi Khớp
  'dinhduongnentang': [
    { title: 'Chương 1: Cơ Chế Kháng Viêm Sinh Học Tế Bào', pageIndex: 0, pageNumber: 1, summary: 'Axit béo Omega-3 EPA/DHA và Curcumin dập tắt ngọn lửa viêm âm thầm tại sụn khớp.' },
    { title: 'Chương 2: Tái Lập Mật Độ Xương & Đàn Hồi Sụn Khớp', pageIndex: 1, pageNumber: 2, summary: 'Collagen Type II, Canxi tảo biển, Magie cùng Vitamin D3 và K2 giúp tái tạo khung xương.' },
    { title: 'Chương 3: Thực Đơn Kháng Viêm Sinh Học Cho Người Việt', pageIndex: 2, pageNumber: 3, summary: 'Thực đơn mẫu thanh lọc và bồi bổ sụn khớp từ nguồn thực phẩm dễ tìm.' },
  ],

  // Nhân Tố Enzyme
  'nhantoenzyme': [
    { title: 'Chương 1: Nguy cơ tiềm ẩn trong các quan niệm dinh dưỡng sai lầm', pageIndex: 0, pageNumber: 1, summary: 'Bác sĩ Shinya phản biện các thói quen ăn uống ngộ nhận gây tổn hại đường ruột.' },
    { title: 'Chương 2: Giả thuyết về Enzyme Diệu Kỳ (Miracle Enzyme)', pageIndex: 1, pageNumber: 2, summary: 'Nguồn enzyme nguyên mẫu trong cơ thể quyết định tuổi thọ và khả năng phòng bệnh.' },
    { title: 'Chương 3: Thói quen ăn uống Shinya để sống thọ và trẻ lâu', pageIndex: 2, pageNumber: 3, summary: 'Chế độ ăn 85% thực vật, 15% protein động vật cùng cách uống nước tốt cho đường ruột.' },
    { title: 'Chương 4: Lắng nghe kịch bản của sinh mệnh', pageIndex: 3, pageNumber: 4, summary: 'Sự hòa hợp giữa tinh thần, lối sống điều độ và năng lực tự chữa lành của cơ thể.' },
  ],

  // Y Học Dinh Dưỡng
  'yhocdinhduong': [
    { title: 'Chương 1: Sự thức tỉnh của một bác sĩ y khoa', pageIndex: 0, pageNumber: 1, summary: 'Hành trình bác sĩ Ray Strand khám phá sức mạnh của dinh dưỡng bổ sung cứu sống vợ mình.' },
    { title: 'Chương 2: Kẻ thù vô hình - Stress oxy hóa trong tế bào', pageIndex: 1, pageNumber: 2, summary: 'Bản chất gốc tự do tàn phá màng tế bào, DNA và gây ra các bệnh thoái hóa mạn tính.' },
    { title: 'Chương 3: Hệ thống phòng thủ tự nhiên và chất chống oxy hóa', pageIndex: 2, pageNumber: 3, summary: 'Cách vitamin C, E, kẽm, selen và CoQ10 vô hiệu hóa các gốc tự do nguy hiểm.' },
    { title: 'Chương 4: Liệu pháp dưỡng chất tối ưu bảo vệ tim mạch và khớp', pageIndex: 3, pageNumber: 4, summary: 'Xây dựng chế độ dinh dưỡng tối ưu theo tiêu chuẩn y học dự phòng Hoa Kỳ.' },
  ],

  // Chí Phèo
  'chipheo': [
    { title: 'Phần 1: Tiếng chửi của Chí Phèo và lò gạch cũ', pageIndex: 0, pageNumber: 1, summary: 'Mở đầu ấn tượng với tiếng chửi say khướt và lai lịch đứa trẻ bị bỏ rơi ở lò gạch cũ.' },
    { title: 'Phần 2: Mối tình với Thị Nở bên bờ sông đêm trăng', pageIndex: 1, pageNumber: 2, summary: 'Cơn sốt rét, bát cháo hành và sự thức tỉnh của bản tính lương thiện trong lòng Chí.' },
    { title: 'Phần 3: Bi kịch bị cự tuyệt và nỗi đau tột cùng', pageIndex: 2, pageNumber: 3, summary: 'Bà cô Thị Nở ngăn cấm, cánh cửa trở lại làm người lương thiện bị đóng sầm trước mắt Chí.' },
    { title: 'Phần 4: Cuộc đối đầu Bá Kiến và cái chết đòi lương thiện', pageIndex: 3, pageNumber: 4, summary: 'Tiếng kêu xé lòng: "Ai cho tao lương thiện?" và phát dao kết liễu kẻ thù lẫn cuộc đời mình.' },
  ],

  // Số Đỏ
  'sodo': [
    { title: 'Hồi 1: Xuân Tóc Đỏ bước chân vào xã hội thượng lưu', pageIndex: 0, pageNumber: 1, summary: 'Từ đứa trẻ nhặt banh sân quần trở thành nhân vật được bà Phó Đoan nâng đỡ.' },
    { title: 'Hồi 2: Tiệm may Âu Hóa và trào lưu giải phóng nữ quyền', pageIndex: 1, pageNumber: 2, summary: 'Cảnh tượng trào phúng lố lăng tại tiệm may của vợ chồng Văn Minh.' },
    { title: 'Hồi 3: Đám ma gương mẫu của cụ Cố Tổ', pageIndex: 2, pageNumber: 3, summary: 'Cảnh đám ma vui vẻ nhất trần đời, nơi mọi thành viên gia đình đều khoe khoang sự đồi bại.' },
    { title: 'Hồi 4: Xuân Tóc Đỏ trở thành Anh hùng Cứu quốc', pageIndex: 3, pageNumber: 4, summary: 'Đỉnh cao tấn trò đời trớ trêu khi một kẻ vô lại được tôn vinh làm vĩ nhân của dân tộc.' },
  ],

  // Đắc Nhân Tâm
  'dacnhantam': [
    { title: 'Phần 1: Nghệ thuật ứng xử căn bản', pageIndex: 0, pageNumber: 1, summary: 'Không chỉ trích, oán trách; hãy khen ngợi chân thành và khơi gợi ý muốn ở người khác.' },
    { title: 'Phần 2: Sáu cách tạo thiện cảm với người đối diện', pageIndex: 1, pageNumber: 2, summary: 'Thành thật quan tâm, luôn mỉm cười, ghi nhớ tên người khác và lắng nghe chân thành.' },
    { title: 'Phần 3: Mười hai cách hướng người khác theo suy nghĩ của bạn', pageIndex: 2, pageNumber: 3, summary: 'Tôn trọng ý kiến đối phương, thừa nhận sai lầm và luôn khởi đầu bằng thái độ thân thiện.' },
    { title: 'Phần 4: Nghệ thuật lãnh đạo và chuyển hóa con người', pageIndex: 3, pageNumber: 4, summary: 'Khen ngợi trước khi góp ý, giữ thể diện cho người khác và khuyến khích họ phát triển.' },
  ],
};

/**
 * Trích xuất hoặc kiến tạo bảng mục lục thông minh cho cuốn sách
 */
export function getBookToc(
  bookTitle: string,
  totalPages: number = 1,
  epubChapters?: Array<{ id?: string; title: string; href?: string }>
): BookTocItem[] {
  // 1. Nếu có mục lục EPUB trực tiếp từ tệp
  if (Array.isArray(epubChapters) && epubChapters.length > 0) {
    return epubChapters.map((ch, idx) => ({
      id: ch.id || `epub-ch-${idx}`,
      title: ch.title || `Chương ${idx + 1}`,
      pageIndex: idx,
      pageNumber: idx + 1,
    }));
  }

  // 2. Tìm trong danh mục mục lục tuyển chọn chuẩn xác theo tên sách
  const normalizedTitle = normalizeKey(bookTitle);
  for (const [key, items] of Object.entries(CURATED_BOOK_TOCS)) {
    if (normalizedTitle.includes(key) || key.includes(normalizedTitle)) {
      return items;
    }
  }

  // 3. Nếu sách có nhiều trang mà chưa có mục lục định sẵn, phân bổ thông minh theo các mốc
  if (totalPages > 1) {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => ({
        title: `Trang ${i + 1}`,
        pageIndex: i,
        pageNumber: i + 1,
      }));
    }

    const step = Math.max(1, Math.floor(totalPages / 5));
    const checkpoints: BookTocItem[] = [];
    checkpoints.push({ title: 'Phần 1: Mở đầu & Đặt vấn đề', pageIndex: 0, pageNumber: 1 });
    if (totalPages > 10) {
      checkpoints.push({ title: 'Phần 2: Cơ sở lý thuyết & Luận điểm', pageIndex: step, pageNumber: step + 1 });
      checkpoints.push({ title: 'Phần 3: Phân tích thực tế & Giải pháp', pageIndex: step * 2, pageNumber: step * 2 + 1 });
      checkpoints.push({ title: 'Phần 4: Hướng dẫn ứng dụng chuyên sâu', pageIndex: step * 3, pageNumber: step * 3 + 1 });
      checkpoints.push({ title: 'Phần 5: Tổng kết & Tài liệu tham khảo', pageIndex: step * 4, pageNumber: step * 4 + 1 });
    } else {
      for (let p = 0; p < totalPages; p += step) {
        checkpoints.push({
          title: `Chương ${checkpoints.length + 1} (Trang ${p + 1})`,
          pageIndex: p,
          pageNumber: p + 1,
        });
      }
    }
    return checkpoints;
  }

  return [
    { title: 'Toàn bộ nội dung sách', pageIndex: 0, pageNumber: 1 },
  ];
}
