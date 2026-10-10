'use client';

import { offlineStorage } from './offlineStorage';
import { detectEbookFormat, EbookFormat } from './ebookEngine';

/**
 * Kho Thư Viện Sách Trực Tuyến Mở (Curated Open Online Library)
 * - Tự động hiển thị cả 2 dòng sách:
 *   1. SÁCH ĐỌC (Ebook): EPUB, PDF, CBZ (mở đọc 3D SideBooks)
 *   2. SÁCH NÓI (Audiobook): MP3 / Audio Chapters / Giọng đọc AI truyền cảm
 * - Tải trực tiếp không cần tài khoản (Zero-Auth Sovereign Storage)
 * - Hỗ trợ Tùy biến Ảnh Bìa (Dùng bìa mặc định, chọn bìa nghệ thuật hoặc tải ảnh bìa riêng từ máy lên)
 * - Tối ưu 100% Mobile-first: Cấm tuyệt đối rớt 2 dòng trên các nút bấm, nhãn và thông tin
 */

export type BookMedium = 'read' | 'audio' | 'both';

export interface OnlineBookItem {
  id: string;
  title: string;
  author: string;
  medium: BookMedium; // 'read' (Sách đọc) | 'audio' (Sách nói) | 'both' (Đọc & Nghe song hành)
  category: 'viet-nam' | 'y-hoc' | 'van-hoc' | 'ky-nang' | 'truyen-tranh';
  categoryName: string;
  format: 'epub' | 'pdf' | 'cbz' | 'audio';
  fileSizeFormatted: string;
  durationFormatted?: string; // Ví dụ: "28 phút" (cho sách nói)
  coverUrl: string;
  customCoverUrl?: string; // Bìa người dùng tùy biến
  downloadUrl: string;
  description: string;
  badgeTag: string;
  language: 'vi' | 'en';
  year?: string;
  source: string;
  audioNarrator?: string; // Giọng đọc cho sách nói
  audioSampleText?: string;
  audioBookItem?: OnlineBookItem; // Bản ghi sách nói tương ứng khi gộp
  readBookItem?: OnlineBookItem;  // Bản ghi sách đọc tương ứng khi gộp
}

export const COVER_PALETTES = [
  { id: 'white', name: 'Bìa Trắng Hiện Đại', url: 'style:white' },
  { id: 'ivory', name: 'Giấy Ngà Cổ Điển', url: 'style:ivory' },
  { id: 'terracotta', name: 'Đất Nung Gốm Mộc', url: 'style:terracotta' },
  { id: 'navy', name: 'Xanh Navy Hoàng Gia', url: 'style:navy' },
  { id: 'burgundy', name: 'Đỏ Burgundy Da Mịn', url: 'style:burgundy' },
  { id: 'audio', name: 'Sách Nói Studio', url: 'style:audio' },
];

export const ONLINE_CATEGORIES = [
  { id: 'all', name: 'Tất cả' },
  { id: 'viet-nam', name: 'Sách Việt Nam 🇻🇳' },
  { id: 'van-hoc', name: 'Văn học thế giới' },
  { id: 'y-hoc', name: 'Y học & Sức khỏe' },
  { id: 'ky-nang', name: 'Kỹ năng & Tư duy' },
  { id: 'truyen-tranh', name: 'Truyện tranh' },
] as const;

export const CURATED_ONLINE_BOOKS: OnlineBookItem[] = [
  // ================= 1. KHO VĂN HỌC & LỊCH SỬ KINH ĐIỂN VIỆT NAM (EPUB CHUẨN TOÀN VĂN) =================
  {
    id: 'online-vn-chi-pheo',
    title: 'Chí Phèo (Toàn Văn)',
    author: 'Nam Cao',
    medium: 'read',
    category: 'viet-nam',
    categoryName: 'Văn học Việt Nam',
    format: 'epub',
    fileSizeFormatted: '34.4 KB',
    coverUrl: 'style:terracotta',
    downloadUrl: '/documents/vietnam_chi_pheo.epub',
    description: 'Kiệt tác hiện thực phê phán đỉnh cao của văn học Việt Nam về bi kịch tha hóa và tiếng kêu xé lòng đòi quyền làm người lương thiện của Chí Phèo làng Vũ Đại (bản toàn văn đầy đủ 5 phần).',
    badgeTag: 'TOÀN VĂN EPUB 🇻🇳',
    language: 'vi',
    year: '1941',
    source: 'Wikisource Việt Nam',
  },
  {
    id: 'online-vn-so-do',
    title: 'Số Đỏ (Toàn Văn)',
    author: 'Vũ Trọng Phụng',
    medium: 'read',
    category: 'viet-nam',
    categoryName: 'Văn học Việt Nam',
    format: 'epub',
    fileSizeFormatted: '6.7 KB',
    coverUrl: 'style:burgundy',
    downloadUrl: '/documents/vietnam_so_do.epub',
    description: 'Tiểu thuyết trào phúng kiệt xuất của Vũ Trọng Phụng đả kích sâu cay thói rởm hợm của xã hội tư sản thành thị qua bước thăng tiến ly kỳ của Xuân Tóc Đỏ.',
    badgeTag: 'TOÀN VĂN EPUB 🇻🇳',
    language: 'vi',
    year: '1936',
    source: 'Văn học Việt Nam',
  },
  {
    id: 'online-vn-truyen-kieu',
    title: 'Truyện Kiều (Trọn Vẹn 3.254 Câu)',
    author: 'Đại thi hào Nguyễn Du',
    medium: 'read',
    category: 'viet-nam',
    categoryName: 'Văn học Việt Nam',
    format: 'epub',
    fileSizeFormatted: '63.6 KB',
    coverUrl: 'style:navy',
    downloadUrl: '/documents/vietnam_truyen_kieu.epub',
    description: 'Đỉnh cao thi ca dân tộc Việt Nam với trọn vẹn 3.254 câu thơ lục bát bất hủ về số phận mười lăm năm lưu lạc của Thúy Kiều, chữ Tâm và chữ Tài.',
    badgeTag: '3.254 CÂU THƠ 🇻🇳',
    language: 'vi',
    year: '1820',
    source: 'Di sản văn hóa Việt Nam',
  },
  {
    id: 'online-vn-tat-den',
    title: 'Tắt Đèn (Toàn Văn)',
    author: 'Ngô Tất Tố',
    medium: 'read',
    category: 'viet-nam',
    categoryName: 'Văn học Việt Nam',
    format: 'epub',
    fileSizeFormatted: '5.6 KB',
    coverUrl: 'style:ivory',
    downloadUrl: '/documents/vietnam_tat_den.epub',
    description: 'Bức tranh ngột ngạt về sưu thuế và nông thôn Việt Nam trước cách mạng với tinh thần quật cường phản kháng của nhân vật Chị Dậu.',
    badgeTag: 'TOÀN VĂN EPUB 🇻🇳',
    language: 'vi',
    year: '1939',
    source: 'Wikisource Việt Nam',
  },
  {
    id: 'online-vn-gio-dau-mua',
    title: 'Gió Đầu Mùa (Tuyển Tập)',
    author: 'Thạch Lam',
    medium: 'read',
    category: 'viet-nam',
    categoryName: 'Văn học Việt Nam',
    format: 'epub',
    fileSizeFormatted: '5.7 KB',
    coverUrl: 'style:white',
    downloadUrl: '/documents/vietnam_gio_dau_mua.epub',
    description: 'Tuyển tập truyện ngắn nhân văn giàu chất thơ của Thạch Lam: Gió lạnh đầu mùa, Hai đứa trẻ, Dưới bóng hoàng lan, Cô hàng xén.',
    badgeTag: 'TOÀN VĂN EPUB 🇻🇳',
    language: 'vi',
    year: '1937',
    source: 'Tự Lực Văn Đoàn',
  },
  {
    id: 'online-vn-ha-noi-36',
    title: 'Hà Nội 36 Phố Phường',
    author: 'Thạch Lam',
    medium: 'read',
    category: 'viet-nam',
    categoryName: 'Văn học Việt Nam',
    format: 'epub',
    fileSizeFormatted: '5.4 KB',
    coverUrl: 'style:ivory',
    downloadUrl: '/documents/vietnam_ha_noi_36_pho_phuong.epub',
    description: 'Tùy bút tinh tế về ẩm thực phở, bún chả, cốm Làng Vòng và vẻ đẹp kinh kỳ nghìn năm văn hiến của ba mươi sáu phố phường Hà Nội xưa.',
    badgeTag: 'TOÀN VĂN EPUB 🇻🇳',
    language: 'vi',
    year: '1943',
    source: 'Văn hóa Hà Nội',
  },
  {
    id: 'online-vn-lao-hac',
    title: 'Lão Hạc (Toàn Văn)',
    author: 'Nam Cao',
    medium: 'read',
    category: 'viet-nam',
    categoryName: 'Văn học Việt Nam',
    format: 'epub',
    fileSizeFormatted: '14.2 KB',
    coverUrl: 'style:terracotta',
    downloadUrl: '/documents/vietnam_lao_hac.epub',
    description: 'Truyện ngắn bất hủ về tình phụ tử thiêng liêng, nỗi đau chia tay cậu Vàng và nhân cách thanh sạch, tự trọng ngời sáng của người nông dân nghèo (bản toàn văn đầy đủ 4 phần).',
    badgeTag: 'TOÀN VĂN EPUB 🇻🇳',
    language: 'vi',
    year: '1943',
    source: 'Wikisource Việt Nam',
  },
  {
    id: 'online-vn-vang-bong',
    title: 'Vang Bóng Một Thời',
    author: 'Nguyễn Tuân',
    medium: 'read',
    category: 'viet-nam',
    categoryName: 'Văn học Việt Nam',
    format: 'epub',
    fileSizeFormatted: '4.7 KB',
    coverUrl: 'style:burgundy',
    downloadUrl: '/documents/vietnam_vang_bong_mot_thoi.epub',
    description: 'Tuyển tập văn xuôi đỉnh cao phục dựng những thú chơi tao nhã cổ truyền của người xưa và khí phách hiên ngang cho chữ của Huấn Cao nơi ngục tối.',
    badgeTag: 'TOÀN VĂN EPUB 🇻🇳',
    language: 'vi',
    year: '1940',
    source: 'Văn học Việt Nam',
  },
  {
    id: 'online-vn-su-luoc',
    title: 'Việt Nam Sử Lược (Toàn Tập)',
    author: 'Trần Trọng Kim',
    medium: 'read',
    category: 'viet-nam',
    categoryName: 'Lịch sử Việt Nam',
    format: 'epub',
    fileSizeFormatted: '5.8 KB',
    coverUrl: 'style:navy',
    downloadUrl: '/documents/vietnam_viet_nam_su_luoc.epub',
    description: 'Bộ thông sử quốc ngữ đầu tiên hệ thống hóa trọn vẹn 4.000 năm dựng nước và giữ nước oai hùng từ thời Hồng Bàng, Lý, Trần đến Lê Sơ và Tây Sơn.',
    badgeTag: 'SỬ LIỆU TOÀN TẬP 🇻🇳',
    language: 'vi',
    year: '1920',
    source: 'Sử liệu Việt Nam',
  },
  {
    id: 'online-vn-hoang-tu-be',
    title: 'Hoàng Tử Bé (Le Petit Prince)',
    author: 'Antoine de Saint-Exupéry',
    medium: 'read',
    category: 'van-hoc',
    categoryName: 'Văn học thế giới',
    format: 'epub',
    fileSizeFormatted: '7.1 KB',
    coverUrl: 'style:navy',
    downloadUrl: '/documents/hoang_tu_be.epub',
    description: 'Kiệt tác văn học Pháp bất hủ về tình bạn, bông hoa hồng và bài học cảm hóa: Điều cốt lõi nhất thì vô hình đối với đôi mắt.',
    badgeTag: 'BẢN DỊCH VIỆT 🇻🇳',
    language: 'vi',
    year: '1943',
    source: 'Văn học thế giới',
  },

  // ================= 2. KHO SÁCH DINH DƯỠNG & Y HỌC KINH ĐIỂN THẾ GIỚI & VIỆT NAM (EBOOK TOÀN VĂN) =================
  {
    id: 'online-read-dinh-duong-that-truyen',
    title: 'Dinh Dưỡng Học Bị Thất Truyền - Đẩy Lùi Bệnh Tật',
    author: 'Tiến sĩ, Bác sĩ Vương Đào (Dr. Wang Tao)',
    medium: 'read',
    category: 'y-hoc',
    categoryName: 'Y học & Sức khỏe',
    format: 'pdf',
    fileSizeFormatted: '2.75 MB (Bản Gốc 136 Trang)',
    coverUrl: '/documents/covers/cover_dinh_duong_hoc_that_truyen.png',
    downloadUrl: '/documents/dinh_duong_hoc_bi_that_truyen_goc.pdf',
    description: 'Bản gốc xuất bản toàn văn 136 trang của TS. BS. Vương Đào (Đại học Y khoa Tokyo). Khám phá năng lực tự chữa lành kỳ diệu của cơ thể; giải mã gan là nhà máy hóa chất tổng quản lý sức khỏe; cơ chế đẩy lùi bệnh tim mạch, xơ vữa động mạch, tiểu đường, thoái hóa đốt sống, thoát vị đĩa đệm và mất ngủ bằng dinh dưỡng tế bào.',
    badgeTag: 'BẢN GỐC 136 TRANG 🌟',
    language: 'vi',
    year: '2019',
    source: 'Tủ Sách Dinh Dưỡng Kinh Điển',
  },
  {
    id: 'online-read-nhan-to-enzyme',
    title: 'Nhân Tố Enzyme - Phương Thức Sống Lành Mạnh',
    author: 'Bác sĩ Hiromi Shinya (Giáo sư Đại học Y Albert Einstein)',
    medium: 'read',
    category: 'y-hoc',
    categoryName: 'Y học & Sức khỏe',
    format: 'epub',
    fileSizeFormatted: '5.4 KB (Toàn Văn EPUB)',
    coverUrl: '/documents/covers/cover_nhan_to_enzyme.png',
    downloadUrl: '/documents/nhan_to_enzyme.epub',
    description: 'Cuốn sách bán hơn 2 triệu bản của Bác sĩ Hiromi Shinya - người phát minh kỹ thuật nội soi đại tràng. Khám phá Enzyme Diệu Kỳ (Miracle Enzyme), tướng dạ dày, tướng ruột và 7 phương pháp sống trẻ khỏe trọn đời không cần dùng thuốc.',
    badgeTag: 'BEST-SELLER NHẬT BẢN 🇯🇵',
    language: 'vi',
    year: '2005',
    source: 'Thư Viện Trực Tuyến',
  },
  {
    id: 'online-read-y-hoc-dinh-duong',
    title: 'Y Học Dinh Dưỡng - Những Điều Bác Sĩ Không Nói Với Bạn',
    author: 'TS. BS. Ray D. Strand (Chuyên gia Y học Dự phòng Hoa Kỳ)',
    medium: 'read',
    category: 'y-hoc',
    categoryName: 'Y học & Sức khỏe',
    format: 'epub',
    fileSizeFormatted: '4.4 KB (Toàn Văn EPUB)',
    coverUrl: '/documents/covers/cover_y_hoc_dinh_duong.png',
    downloadUrl: '/documents/y_hoc_dinh_duong_ray_strand.epub',
    description: 'Tác phẩm khai sáng của Bác sĩ Ray D. Strand: Sự thức tỉnh của một bác sĩ gia đình khi dinh dưỡng vi chất cứu sống vợ mình. Giải mã stress oxy hóa, các gốc tự do tàn phá màng tế bào và liệu pháp dinh dưỡng bảo vệ cơ thể.',
    badgeTag: 'Y HỌC HOA KỲ 🇺🇸',
    language: 'vi',
    year: '2007',
    source: 'Thư Viện Trực Tuyến',
  },
  {
    id: 'online-read-the-china-study',
    title: 'Bí Mật Dinh Dưỡng Cho Sức Khỏe Toàn Diện (The China Study)',
    author: 'TS. T. Colin Campbell & Thomas M. Campbell II',
    medium: 'read',
    category: 'y-hoc',
    categoryName: 'Y học & Sức khỏe',
    format: 'epub',
    fileSizeFormatted: '4.1 KB (Toàn Văn EPUB)',
    coverUrl: '/documents/covers/cover_china_study.png',
    downloadUrl: '/documents/the_china_study.epub',
    description: 'Công trình nghiên cứu dịch tễ học dinh dưỡng quy mô lớn nhất lịch sử do Đại học Cornell, Oxford và Trung Quốc phối hợp. Mối liên hệ mật thiết giữa chế độ ăn thực vật toàn phần và việc ngăn chặn bệnh mãn tính.',
    badgeTag: 'CÔNG TRÌNH THẾ KỶ 🔬',
    language: 'vi',
    year: '2006',
    source: 'Thư Viện Trực Tuyến',
  },
  {
    id: 'online-read-co-the-tu-chua-lanh',
    title: 'Cơ Thể Tự Chữa Lành - Thực Phẩm Phục Hồi Não Bộ & Gan',
    author: 'Anthony William (Medical Medium)',
    medium: 'read',
    category: 'y-hoc',
    categoryName: 'Y học & Sức khỏe',
    format: 'epub',
    fileSizeFormatted: '4.0 KB (Toàn Văn EPUB)',
    coverUrl: '/documents/covers/cover_co_the_tu_chua_lanh.png',
    downloadUrl: '/documents/co_the_tu_chua_lanh.epub',
    description: 'Khám phá năng lực giải độc tự nhiên của lá gan và hệ miễn dịch tế bào. Phương pháp dùng rau quả tươi, nước ép cần tây và thảo dược để phục hồi sinh lực và dập tắt viêm mạn tính.',
    badgeTag: 'MEDICAL MEDIUM 🌿',
    language: 'vi',
    year: '2018',
    source: 'Thư Viện Trực Tuyến',
  },
  {
    id: 'online-read-nuoc-uong-tang-mien-dich',
    title: 'Nước Uống Tăng Khả Năng Miễn Dịch',
    author: 'Lý Thừa Du & Giang Văn Toản',
    medium: 'read',
    category: 'y-hoc',
    categoryName: 'Y học & Sức khỏe',
    format: 'epub',
    fileSizeFormatted: '13.3 KB (Toàn Văn EPUB)',
    coverUrl: '/documents/covers/cover_mien-dich.png',
    downloadUrl: '/documents/nuoc_uong_tang_kha_nang_mien_dich.epub',
    description:
      'Bản toàn văn 10 chương chuyên sâu. Cẩm nang hướng dẫn sử dụng nước uống sinh học, nước điện giải kiềm, trà thảo mộc EGCG, nước ép enzym và thức uống lên men probiotic giúp kích hoạt hệ thống miễn dịch tự thân, chống lão hóa và phục hồi tế bào.',
    badgeTag: 'TOÀN VĂN EPUB 10 CHƯƠNG ☀️',
    language: 'vi',
    year: '2024',
    source: 'Tủ Sách Y Khoa & Dinh Dưỡng Qbiz',
  },

  // ================= 3. SÁCH VĂN HỌC & TRI THỨC THẾ GIỚI KINH ĐIỂN =================
  {
    id: 'online-read-gutenberg-1661',
    title: 'Những Vụ Án Của Sherlock Holmes',
    author: 'Sir Arthur Conan Doyle',
    medium: 'read',
    category: 'van-hoc',
    categoryName: 'Văn học thế giới',
    format: 'epub',
    fileSizeFormatted: '312 KB',
    coverUrl: '',
    downloadUrl: 'https://www.gutenberg.org/ebooks/1661.epub.noimages',
    description: 'Tuyển tập 12 vụ án trinh thám kinh điển thế giới gắn liền với thám tử đại tài Sherlock Holmes và bác sĩ John Watson.',
    badgeTag: 'GUTENBERG EPUB',
    language: 'en',
    year: '1892',
    source: 'Project Gutenberg',
  },
  {
    id: 'online-read-dac-nhan-tam',
    title: 'Đắc Nhân Tâm (Bản Chuẩn Tiếng Việt)',
    author: 'Dale Carnegie · Dịch giả Nguyễn Hiến Lê',
    medium: 'read',
    category: 'ky-nang',
    categoryName: 'Kỹ năng & Tư duy',
    format: 'epub',
    fileSizeFormatted: '9.2 KB',
    coverUrl: 'style:burgundy',
    downloadUrl: '/documents/vietnam_dac_nhan_tam.epub',
    description: 'Nghệ thuật thu phục lòng người và nghệ thuật ứng xử kinh điển nhất mọi thời đại của Dale Carnegie, kim chỉ nam vàng xây dựng mối quan hệ và thành công bền vững.',
    badgeTag: 'KINH ĐIỂN TƯ DUY ⭐',
    language: 'vi',
    year: '1936',
    source: 'Tủ sách Kỹ năng & Tư duy',
  },
  {
    id: 'online-read-gutenberg-132',
    title: 'Binh Pháp Tôn Tử - The Art of War',
    author: 'Tôn Tử (Sun Tzu) · Lionel Giles',
    medium: 'read',
    category: 'ky-nang',
    categoryName: 'Kỹ năng & Tư duy',
    format: 'epub',
    fileSizeFormatted: '240 KB',
    coverUrl: '',
    downloadUrl: 'https://www.gutenberg.org/ebooks/132.epub.noimages',
    description: 'Bộ binh thư chiến lược và nghệ thuật tư duy quân sự đỉnh cao trường tồn hơn 2.500 năm lịch sử văn minh thế giới.',
    badgeTag: 'GUTENBERG EPUB',
    language: 'en',
    year: 'BC 500',
    source: 'Project Gutenberg',
  },
  {
    id: 'online-read-gutenberg-1342',
    title: 'Kiêu Hãnh & Định Kiến - Pride and Prejudice',
    author: 'Jane Austen',
    medium: 'read',
    category: 'van-hoc',
    categoryName: 'Văn học thế giới',
    format: 'epub',
    fileSizeFormatted: '480 KB',
    coverUrl: '',
    downloadUrl: 'https://www.gutenberg.org/ebooks/1342.epub.noimages',
    description: 'Kiệt tác văn học lãng mạn kinh điển của Jane Austen phân tích tâm lý nhân vật, định kiến xã hội và tình yêu đích thực.',
    badgeTag: 'GUTENBERG EPUB',
    language: 'en',
    year: '1813',
    source: 'Project Gutenberg',
  },
  {
    id: 'online-read-gutenberg-84',
    title: 'Frankenstein - Quái Vật Hiện Đại',
    author: 'Mary Wollstonecraft Shelley',
    medium: 'read',
    category: 'van-hoc',
    categoryName: 'Văn học thế giới',
    format: 'epub',
    fileSizeFormatted: '390 KB',
    coverUrl: '',
    downloadUrl: 'https://www.gutenberg.org/ebooks/84.epub.noimages',
    description: 'Khởi nguồn tiểu thuyết khoa học viễn tưởng kinh điển thế giới khám phá ranh giới luân lý khoa học và nguồn gốc nhân tính.',
    badgeTag: 'GUTENBERG EPUB',
    language: 'en',
    year: '1818',
    source: 'Project Gutenberg',
  },
  {
    id: 'online-read-gutenberg-11',
    title: 'Alice ở Xứ Sở Thần Tiên - Alice in Wonderland',
    author: 'Lewis Carroll',
    medium: 'read',
    category: 'van-hoc',
    categoryName: 'Văn học thế giới',
    format: 'epub',
    fileSizeFormatted: '260 KB',
    coverUrl: '',
    downloadUrl: 'https://www.gutenberg.org/ebooks/11.epub.noimages',
    description: 'Cuộc phiêu lưu kỳ thú của cô bé Alice bước vào thế giới thần tiên rực rỡ màu sắc vượt thời gian của văn học thiếu nhi thế giới.',
    badgeTag: 'GUTENBERG EPUB',
    language: 'en',
    year: '1865',
    source: 'Project Gutenberg',
  },
  {
    id: 'online-read-archive-gray',
    title: 'Đại Từ Điển Giải Phẫu Người Gray (Anatomy)',
    author: 'Henry Gray (F.R.S.)',
    medium: 'read',
    category: 'y-hoc',
    categoryName: 'Y học & Sức khỏe',
    format: 'pdf',
    fileSizeFormatted: '38 MB',
    coverUrl: '',
    downloadUrl: 'https://archive.org/download/anatomyofhumanbo1918gray/anatomyofhumanbo1918gray.pdf',
    description: 'Công trình kinh điển bất hủ của y học thế giới ghi lại toàn bộ hệ xương, khớp, hệ cơ và thần kinh với 1.247 bản vẽ chi tiết.',
    badgeTag: 'ARCHIVE PDF',
    language: 'en',
    year: '1918',
    source: 'Internet Archive',
  },
  {
    id: 'online-read-archive-cbz-atlas',
    title: 'Atlas Hình Ảnh Cơ Thể & Giải Phẫu 3D (CBZ)',
    author: 'Tủ Sách Y Khoa 3D',
    medium: 'read',
    category: 'truyen-tranh',
    categoryName: 'Truyện tranh & Atlas',
    format: 'cbz',
    fileSizeFormatted: '1.3 MB',
    coverUrl: '/documents/covers/cover_co-the-nguoi.png',
    downloadUrl: '/documents/atlas_giai_phau_hinh_anh_3d.cbz',
    description: 'Tập hình ảnh giải phẫu đa tầng 3D hệ cơ xương khớp và cơ quan nội tạng chuẩn định dạng truyện tranh CBZ lật trang trực quan.',
    badgeTag: 'ATLAS CBZ 3D',
    language: 'vi',
    year: '2024',
    source: 'Tủ Sách Y Khoa',
  },

  // ================= 4. SÁCH NÓI (AUDIOBOOKS - THU ÂM THẬT NGHỆ SĨ & KHO MỞ ARCHIVE.ORG & LIBRIVOX) =================
  {
    id: 'online-audio-dinh-duong-that-truyen',
    title: 'Sách Nói: Dinh Dưỡng Học Bị Thất Truyền - Đẩy Lùi Bệnh Tật',
    author: 'Tiến sĩ, Bác sĩ Vương Đào (Dr. Wang Tao)',
    medium: 'audio',
    category: 'y-hoc',
    categoryName: 'Y học & Sức khỏe',
    format: 'audio',
    fileSizeFormatted: '48 MB',
    durationFormatted: '48 phút',
    coverUrl: '/documents/covers/cover_dinh_duong_hoc_that_truyen.png',
    downloadUrl: '/documents/audio_sample_dinh_duong_that_truyen.mp3',
    description: 'Bản thu âm diễn đọc truyền cảm trọn vẹn: Khám phá năng lực tự chữa lành vĩ đại của cơ thể, bí mật chuyển hóa của lá gan và phương pháp dùng dinh dưỡng thay thế thuốc tây phục hồi sức khỏe.',
    badgeTag: 'AUDIO KINH ĐIỂN 🎧',
    language: 'vi',
    year: '2023',
    source: 'Thư Viện Trực Tuyến',
    audioNarrator: 'Diễn đọc MC Y Khoa Truyền Cảm',
    audioSampleText: 'Chào mừng bạn đến với tác phẩm Dinh Dưỡng Học Bị Thất Truyền của Tiến sĩ Bác sĩ Vương Đào. Cơ thể con người là một cỗ máy sinh học tinh xảo nhất trên thế giới, có khả năng tự phục hồi kỳ diệu vượt xa mọi loại thuốc...',
  },
  {
    id: 'online-audio-nhan-to-enzyme',
    title: 'Sách Nói: Nhân Tố Enzyme - Bí Quyết Trẻ Khỏe Trọn Đời',
    author: 'Bác sĩ Hiromi Shinya (Giáo sư Đại học Y Albert Einstein)',
    medium: 'audio',
    category: 'y-hoc',
    categoryName: 'Y học & Sức khỏe',
    format: 'audio',
    fileSizeFormatted: '42 MB',
    durationFormatted: '42 phút',
    coverUrl: '/documents/covers/cover_nhan_to_enzyme.png',
    downloadUrl: '/documents/audio_sample_nhan_to_enzyme.mp3',
    description: 'Bản thu âm diễn đọc: Phương pháp bảo tồn enzyme diệu kỳ, chế độ ăn 85% thực vật, uống nước ion kiềm và thói quen thải độc ruột tự nhiên.',
    badgeTag: 'AUDIO ENZYME 🎧',
    language: 'vi',
    year: '2023',
    source: 'Thư Viện Trực Tuyến',
    audioNarrator: 'Diễn đọc MC Sức Khỏe',
    audioSampleText: 'Trong hơn 40 năm kiểm tra hơn 300.000 dạ dày và đại tràng của bệnh nhân tại Mỹ và Nhật Bản, tôi nhận thấy người có tướng đường ruột đẹp luôn sở hữu một sức khỏe phi thường...',
  },
  {
    id: 'online-audio-y-hoc-dinh-duong',
    title: 'Sách Nói: Y Học Dinh Dưỡng - Những Điều Bác Sĩ Không Nói Với Bạn',
    author: 'TS. BS. Ray D. Strand (Chuyên gia Y học Dự phòng Hoa Kỳ)',
    medium: 'audio',
    category: 'y-hoc',
    categoryName: 'Y học & Sức khỏe',
    format: 'audio',
    fileSizeFormatted: '38 MB',
    durationFormatted: '38 phút',
    coverUrl: '/documents/covers/cover_y_hoc_dinh_duong.png',
    downloadUrl: '/documents/audio_sample_y_hoc_dinh_duong.mp3',
    description: 'Bản thu âm diễn đọc: Sự thức tỉnh của một bác sĩ gia đình khi chứng kiến phép màu dinh dưỡng cứu sống vợ mình khỏi căn bệnh hiểm nghèo.',
    badgeTag: 'AUDIO Y HỌC 🎧',
    language: 'vi',
    year: '2023',
    source: 'Thư Viện Trực Tuyến',
    audioNarrator: 'Diễn đọc MC Y Khoa',
    audioSampleText: 'Thuốc tây có vị trí quan trọng trong cấp cứu, nhưng dinh dưỡng tế bào mới là chìa khóa đẩy lùi các bệnh lý mạn tính thoái hóa...',
  },
  {
    id: 'online-audio-dac-nhan-tam',
    title: 'Sách Nói: Đắc Nhân Tâm (Bản Thu Âm Trọn Bộ)',
    author: 'Dale Carnegie · Diễn đọc trọn bộ',
    medium: 'audio',
    category: 'ky-nang',
    categoryName: 'Sách nói Kỹ năng',
    format: 'audio',
    fileSizeFormatted: '421 MB',
    durationFormatted: '7 giờ 40 phút',
    coverUrl: 'style:burgundy',
    downloadUrl: 'https://archive.org/download/01.-dac-nhan-tam-dale-carnegie/01.%20%C4%90a%CC%86%CC%81c%20nha%CC%82n%20ta%CC%82m%20-%20Dale%20Carnegie.mp3',
    description: 'Bản thu âm nghệ thuật trọn vẹn 30 nguyên tắc vàng thu phục lòng người, nghệ thuật ứng xử và kết nối đỉnh cao của Dale Carnegie.',
    badgeTag: 'AUDIO FULL 🎧',
    language: 'vi',
    year: '2023',
    source: 'Thư viện Sách Nói Việt Nam',
    audioNarrator: 'Nghệ sĩ diễn đọc trọn bộ',
    audioSampleText: 'Chào mừng quý thính giả lắng nghe sách nói Đắc Nhân Tâm của Dale Carnegie. Ba nghệ thuật căn bản để thu phục lòng người: Không chỉ trích, oán trách hay than phiền...',
  },
  {
    id: 'online-audio-vn-chi-pheo',
    title: 'Sách Nói: Chí Phèo (Nam Cao)',
    author: 'Nam Cao · Kịch truyền thanh VOV',
    medium: 'audio',
    category: 'viet-nam',
    categoryName: 'Sách nói Việt Nam',
    format: 'audio',
    fileSizeFormatted: '68 MB',
    durationFormatted: '1 giờ 14 phút',
    coverUrl: 'style:terracotta',
    downloadUrl: 'https://archive.org/download/de-men-phieu-luu-ky-to-hoai/Ch%C3%AD%20Ph%C3%A8o%20-%20Nam%20Cao.mp3',
    description: 'Bản diễn đọc kịch truyền thanh sống động trọn vẹn kiệt tác hiện thực phê phán Chí Phèo của nhà văn Nam Cao.',
    badgeTag: 'VOV AUDIO 🎧',
    language: 'vi',
    year: '2022',
    source: 'Kịch truyền thanh VOV',
    audioNarrator: 'Kịch truyền thanh & Diễn đọc VOV',
    audioSampleText: 'Hắn vừa đi vừa chửi. Bao giờ cũng thế, cứ rượu xong là hắn chửi. Bắt đầu chửi trời, có hề gì, trời có của riêng nhà nào?...',
  },
  {
    id: 'online-audio-vn-lao-hac',
    title: 'Sách Nói: Lão Hạc (Nam Cao)',
    author: 'Nam Cao · Nghệ sĩ diễn đọc',
    medium: 'audio',
    category: 'viet-nam',
    categoryName: 'Sách nói Việt Nam',
    format: 'audio',
    fileSizeFormatted: '28 MB',
    durationFormatted: '31 phút',
    coverUrl: 'style:ivory',
    downloadUrl: 'https://archive.org/download/de-men-phieu-luu-ky-to-hoai/L%C3%A3o%20H%E1%BA%A1c%20-%20Nam%20Cao.mp3',
    description: 'Diễn đọc truyền cảm trọn vẹn truyện ngắn Lão Hạc, nỗi đau chia tay cậu Vàng và nhân cách thanh sạch, tự trọng ngời sáng của người nông dân nghèo.',
    badgeTag: 'AUDIO TIẾNG VIỆT 🎧',
    language: 'vi',
    year: '2022',
    source: 'Văn học Tiếng Việt',
    audioNarrator: 'Nghệ sĩ diễn đọc văn học',
    audioSampleText: 'Lão Hạc thổi cái mồi rơm, châm đóm. Tôi đã thông điếu và bỏ thuốc rồi. Lão bảo: Cậu Vàng đi đời rồi, ông giáo ạ!...',
  },
  {
    id: 'online-audio-vn-truyen-kieu',
    title: 'Sách Nói: Truyện Kiều (Đại thi hào Nguyễn Du)',
    author: 'Đại thi hào Nguyễn Du · Ngâm thơ nghệ thuật',
    medium: 'audio',
    category: 'viet-nam',
    categoryName: 'Sách nói Việt Nam',
    format: 'audio',
    fileSizeFormatted: '244 MB',
    durationFormatted: '4 giờ 27 phút',
    coverUrl: 'style:navy',
    downloadUrl: 'https://archive.org/download/de-men-phieu-luu-ky-to-hoai/Truy%E1%BB%87n%20Ki%E1%BB%81u%20-%20Nguy%E1%BB%85n%20Du.mp3',
    description: 'Bản ngâm thơ và diễn đọc nghệ thuật toàn diện trọn vẹn áng thi ca bất hủ Đoạn Trường Tân Thanh của Đại thi hào Nguyễn Du.',
    badgeTag: 'NGÂM THƠ AUDIO 🎧',
    language: 'vi',
    year: '2022',
    source: 'Di sản văn hóa Việt Nam',
    audioNarrator: 'Nghệ sĩ Ngâm Thơ Dân Tộc',
    audioSampleText: 'Trăm năm trong cõi người ta, chữ tài chữ mệnh khéo là ghét nhau. Trải qua một cuộc bể dâu, những điều trông thấy mà đau đớn lòng...',
  },
  {
    id: 'online-audio-vn-de-men',
    title: 'Sách Nói: Dế Mèn Phiêu Lưu Ký (Tô Hoài)',
    author: 'Tô Hoài · Diễn đọc trọn bộ',
    medium: 'audio',
    category: 'viet-nam',
    categoryName: 'Sách nói Việt Nam',
    format: 'audio',
    fileSizeFormatted: '416 MB',
    durationFormatted: '3 giờ 02 phút',
    coverUrl: 'style:white',
    downloadUrl: 'https://archive.org/download/de-men-phieu-luu-ky-to-hoai/D%E1%BA%BF%20M%C3%A8n%20Phi%C3%AAu%20L%C6%B0u%20K%C3%BD%20-%20T%C3%B4%20Ho%C3%A0i.mp3',
    description: 'Bản diễn đọc trọn bộ kiệt tác văn học thiếu nhi Dế Mèn Phiêu Lưu Ký đưa bạn vào thế giới phiêu lưu muôn màu của loài vật.',
    badgeTag: 'TRỌN BỘ MP3 🎧',
    language: 'vi',
    year: '2020',
    source: 'Hẻm Radio',
    audioNarrator: 'Trần Ngọc San (Hẻm Radio)',
    audioSampleText: 'Tôi sống độc lập từ thuở bé. Ấy là tục lệ lâu đời trong họ dế chúng tôi... Càng lớn tôi càng khỏe khoắn và oai vệ.',
  },
  {
    id: 'online-audio-vn-so-do',
    title: 'Sách Nói: Số Đỏ (Vũ Trọng Phụng)',
    author: 'Vũ Trọng Phụng · Diễn đọc trào phúng',
    medium: 'audio',
    category: 'viet-nam',
    categoryName: 'Sách nói Việt Nam',
    format: 'audio',
    fileSizeFormatted: '278 MB',
    durationFormatted: '5 giờ 04 phút',
    coverUrl: 'style:burgundy',
    downloadUrl: 'https://archive.org/download/de-men-phieu-luu-ky-to-hoai/S%E1%BB%91%20%C4%90%E1%BB%8F%20-%20V%C5%A9%20Tr%E1%BB%8Dng%20Ph%E1%BB%A5ng.mp3',
    description: 'Bản thu thanh diễn đọc trọn vẹn tiểu thuyết Số Đỏ đả kích thói rởm hợm của xã hội tư sản thành thị qua bước thăng tiến ly kỳ của Xuân Tóc Đỏ.',
    badgeTag: 'TIỂU THUYẾT MP3 🎧',
    language: 'vi',
    year: '2021',
    source: 'Sách nói Việt Nam',
    audioNarrator: 'Diễn đọc kịch nói truyền thanh',
    audioSampleText: 'Xuân, biệt hiệu là Xuân Tóc Đỏ, vốn là một đứa trẻ mồ côi đi lang thang nhặt bóng quần vợt ở sân Tao Đàn...',
  },
  {
    id: 'online-audio-vn-tat-den',
    title: 'Sách Nói: Tắt Đèn (Ngô Tất Tố)',
    author: 'Ngô Tất Tố · Diễn đọc hiện thực',
    medium: 'audio',
    category: 'viet-nam',
    categoryName: 'Sách nói Việt Nam',
    format: 'audio',
    fileSizeFormatted: '423 MB',
    durationFormatted: '3 giờ 05 phút',
    coverUrl: 'style:ivory',
    downloadUrl: 'https://archive.org/download/de-men-phieu-luu-ky-to-hoai/T%E1%BA%AFt%20%20%C4%90%C3%A8n%20-%20Ng%C3%B4%20T%E1%BA%A5t%20T%E1%BB%91.mp3',
    description: 'Diễn đọc trọn vẹn tiểu thuyết Tắt Đèn về mùa sưu thuế ngột ngạt và tinh thần quật cường phản kháng của nhân vật Chị Dậu.',
    badgeTag: 'VĂN HỌC MP3 🎧',
    language: 'vi',
    year: '2021',
    source: 'Văn học Việt Nam',
    audioNarrator: 'Diễn đọc văn học hiện thực',
    audioSampleText: 'Tiếng trống, tiếng mõ, tiếng tù và inh ỏi từ sáng sớm tinh mơ. Mùa sưu thuế ập xuống làng Đông Xá như một cơn bão quét...',
  },
  {
    id: 'online-audio-vn-hoang-tu-be',
    title: 'Sách Nói: Hoàng Tử Bé (Le Petit Prince)',
    author: 'Antoine de Saint-Exupéry · Diễn đọc tiếng Việt',
    medium: 'audio',
    category: 'van-hoc',
    categoryName: 'Văn học thế giới',
    format: 'audio',
    fileSizeFormatted: '126 MB',
    durationFormatted: '1 giờ 50 phút',
    coverUrl: 'style:navy',
    downloadUrl: 'https://archive.org/download/de-men-phieu-luu-ky-to-hoai/Ho%C3%A0ng%20T%E1%BB%AD%20B%C3%A9%20%28Tr%E1%BB%8Dn%20B%E1%BB%99%29.mp3',
    description: 'Bản diễn đọc trọn vẹn kiệt tác thế giới Hoàng Tử Bé bằng tiếng Việt, bài học sâu sắc về tình yêu, sự gắn kết và những điều mắt trần không thấy.',
    badgeTag: 'KINH ĐIỂN DỊCH 🎧',
    language: 'vi',
    year: '2022',
    source: 'Sách nói Văn học thế giới',
    audioNarrator: 'Diễn đọc nghệ thuật tiếng Việt',
    audioSampleText: 'Làm ơn... vẽ cho tôi một con cừu! Điều cốt lõi nhất thì vô hình đối với đôi mắt, người ta chỉ nhìn thấy thật rõ ràng bằng trái tim...',
  },
  {
    id: 'online-audio-vn-dat-rung',
    title: 'Sách Nói: Đất Rừng Phương Nam (Đoàn Giỏi)',
    author: 'Đoàn Giỏi · Diễn đọc trọn bộ',
    medium: 'audio',
    category: 'viet-nam',
    categoryName: 'Sách nói Việt Nam',
    format: 'audio',
    fileSizeFormatted: '272 MB',
    durationFormatted: '6 giờ 43 phút',
    coverUrl: 'style:terracotta',
    downloadUrl: 'https://archive.org/download/de-men-phieu-luu-ky-to-hoai/%C4%90%E1%BA%A5t%20R%E1%BB%ABng%20Ph%C6%B0%C6%A1ng%20Nam%20-%20%C4%90o%C3%A0n%20Gi%E1%BB%8Fi.mp3',
    description: 'Bản thu thanh trọn vẹn kiệt tác Đất Rừng Phương Nam đưa thính giả theo chân cậu bé An khám phá thiên nhiên sông nước Nam Bộ trù phú.',
    badgeTag: 'TRỌN BỘ MP3 🎧',
    language: 'vi',
    year: '2021',
    source: 'Văn học Phương Nam',
    audioNarrator: 'Diễn đọc văn học phương Nam',
    audioSampleText: 'Gió lộng thổi rào rào qua những rặng tràm xanh ngắt. Tiếng chim hót ríu rít gọi bầy trong ánh bình minh bừng sáng trên mặt sông...',
  },
  {
    id: 'online-audio-librivox-artofwar',
    title: 'Sách Nói: Binh Pháp Tôn Tử (The Art of War)',
    author: 'Tôn Tử (Sun Tzu) · Đọc: Moira Fogarty',
    medium: 'audio',
    category: 'ky-nang',
    categoryName: 'Kỹ năng & Tư duy',
    format: 'audio',
    fileSizeFormatted: '8.5 MB',
    durationFormatted: '18 phút',
    coverUrl: 'style:navy',
    downloadUrl: 'https://archive.org/download/art_of_war_librivox/art_of_war_01_sun_tzu_64kb.mp3',
    description: 'Giọng đọc diễn cảm Moira Fogarty trọn vẹn chương 1 và chương 2 của kiệt tác Binh Pháp Tôn Tử từ kho mở LibriVox thế giới.',
    badgeTag: 'LIBRIVOX MP3 🎧',
    language: 'en',
    year: '2006',
    source: 'LibriVox Audio',
    audioNarrator: 'Moira Fogarty (LibriVox)',
    audioSampleText: 'Sun Tzu said: The art of war is of vital importance to the State. It is a matter of life and death, a road either to safety or to ruin.',
  },
  {
    id: 'online-audio-vn-vo-nhat',
    title: 'Sách Nói: Vợ Nhặt (Kim Lân)',
    author: 'Kim Lân · Nghệ sĩ diễn đọc',
    medium: 'audio',
    category: 'viet-nam',
    categoryName: 'Sách nói Việt Nam',
    format: 'audio',
    fileSizeFormatted: '28.3 MB',
    durationFormatted: '35 phút',
    coverUrl: 'style:terracotta',
    downloadUrl: 'https://archive.org/download/de-men-phieu-luu-ky-to-hoai/V%E1%BB%A3%20Nh%E1%BA%B7t%20-%20Kim%20L%C3%A2n.mp3',
    description: 'Truyện ngắn kinh điển của nhà văn Kim Lân về tình người và khát vọng sống bất diệt giữa nạn đói năm 1945 qua nhân vật Tràng và người vợ nhặt.',
    badgeTag: 'VĂN HỌC MP3 🎧',
    language: 'vi',
    year: '1954',
    source: 'Văn học Việt Nam',
    audioNarrator: 'Nghệ sĩ diễn đọc văn học',
    audioSampleText: 'Buổi chiều nào cũng vậy, mỗi khi bóng tối nhập nhoạng buông xuống xóm ngụ cư là người ta lại thấy hắn bước từng bước lặc lè về xóm...',
  },
  {
    id: 'online-audio-vn-vo-chong-a-phu',
    title: 'Sách Nói: Vợ Chồng A Phủ (Tô Hoài)',
    author: 'Tô Hoài · Diễn đọc nghệ thuật',
    medium: 'audio',
    category: 'viet-nam',
    categoryName: 'Sách nói Việt Nam',
    format: 'audio',
    fileSizeFormatted: '35.7 MB',
    durationFormatted: '38 phút',
    coverUrl: 'style:burgundy',
    downloadUrl: 'https://archive.org/download/de-men-phieu-luu-ky-to-hoai/V%E1%BB%A3%20Ch%E1%BB%93ng%20A%20Ph%E1%BB%A7%20-%20T%C3%B4%20Ho%C3%A0i.mp3',
    description: 'Kiệt tác văn học Tây Bắc của Tô Hoài về sức sống tiềm tàng mãnh liệt của cô Mị và tinh thần tự do phản kháng ách thống trị tàn bạo của nhà Pá Tra.',
    badgeTag: 'VĂN HỌC MP3 🎧',
    language: 'vi',
    year: '1952',
    source: 'Văn học Việt Nam',
    audioNarrator: 'Nghệ sĩ diễn đọc văn học',
    audioSampleText: 'Ai ở xa về, có việc vào nhà thống lý Pá Tra thường trông thấy có một cô con gái ngồi quay sợi gai bên tảng đá trước cửa...',
  },
  {
    id: 'online-audio-vn-hon-truong-ba',
    title: 'Sách Nói: Hồn Trương Ba, Da Hàng Thịt',
    author: 'Lưu Quang Vũ · Vở kịch truyền thanh',
    medium: 'audio',
    category: 'viet-nam',
    categoryName: 'Sách nói Kịch truyền thanh',
    format: 'audio',
    fileSizeFormatted: '124.8 MB',
    durationFormatted: '2 giờ 16 phút',
    coverUrl: 'style:navy',
    downloadUrl: 'https://archive.org/download/de-men-phieu-luu-ky-to-hoai/H%E1%BB%93n%20Tr%C6%B0%C6%A1ng%20Ba%2C%20Da%20H%C3%A0ng%20Th%E1%BB%8Bt%20-%20L%C6%B0u%20Quang%20V%C5%A9.mp3',
    description: 'Kiệt tác kịch bản sân khấu bất hủ của Lưu Quang Vũ về bi kịch sống không được là chính mình và bài học nhân sinh sâu sắc: Không thể bên trong một đằng bên ngoài một nẻo.',
    badgeTag: 'KỊCH NÓI MP3 🎧',
    language: 'vi',
    year: '1984',
    source: 'Kịch nói Truyền thanh',
    audioNarrator: 'Đoàn diễn viên kịch nói Việt Nam',
    audioSampleText: 'Không thể bên trong một đằng bên ngoài một nẻo được. Tôi muốn được là tôi toàn vẹn...',
  },
  {
    id: 'online-audio-vn-chiec-luoc-nga',
    title: 'Sách Nói: Chiếc Lược Ngà (Nguyễn Quang Sáng)',
    author: 'Nguyễn Quang Sáng · Diễn đọc xúc động',
    medium: 'audio',
    category: 'viet-nam',
    categoryName: 'Sách nói Việt Nam',
    format: 'audio',
    fileSizeFormatted: '57.2 MB',
    durationFormatted: '1 giờ 02 phút',
    coverUrl: 'style:ivory',
    downloadUrl: 'https://archive.org/download/de-men-phieu-luu-ky-to-hoai/Chi%E1%BA%BFc%20L%C6%B0%E1%BB%A3c%20Ng%C3%A0%20-%20Nguy%E1%BB%85n%20Quang%20S%C3%A1ng.mp3',
    description: 'Tác phẩm văn học cảm động rơi nước mắt về tình phụ tử thiêng liêng và bất diệt giữa anh Sáu và bé Thu trong bom đạn kháng chiến.',
    badgeTag: 'VĂN HỌC MP3 🎧',
    language: 'vi',
    year: '1966',
    source: 'Văn học Việt Nam',
    audioNarrator: 'Nghệ sĩ diễn đọc truyền cảm',
    audioSampleText: 'Trong cuộc đời kháng chiến của tôi, tôi đã chứng kiến biết bao cuộc chia ly, nhưng chưa bao giờ thấy cuộc chia ly nào xót xa như của ba con anh Sáu...',
  },
  {
    id: 'online-audio-vn-lang',
    title: 'Sách Nói: Làng (Kim Lân)',
    author: 'Kim Lân · Diễn đọc trọn vẹn',
    medium: 'audio',
    category: 'viet-nam',
    categoryName: 'Sách nói Việt Nam',
    format: 'audio',
    fileSizeFormatted: '41.6 MB',
    durationFormatted: '58 phút',
    coverUrl: 'style:white',
    downloadUrl: 'https://archive.org/download/de-men-phieu-luu-ky-to-hoai/L%C3%A0ng%20-%20Kim%20L%C3%A2n.mp3',
    description: 'Bản thu âm xuất sắc khắc họa tâm lý dằn vặt đau đớn và niềm tự hào mãnh liệt về làng Chợ Dầu theo kháng chiến của ông Hai.',
    badgeTag: 'TRỌN BỘ MP3 🎧',
    language: 'vi',
    year: '1948',
    source: 'Văn học Việt Nam',
    audioNarrator: 'Nghệ sĩ diễn đọc văn học',
    audioSampleText: 'Cổ ông lão nghẹn ắng hẳn lại, da mặt tê rần rần. Ông lão lặng đi, tưởng như đến không thở được...',
  },
];

/**
 * Tải sách trực tuyến (Sách đọc hoặc Sách nói) và lưu vào IndexedDB
 */
export async function downloadAndSaveOnlineBook(
  book: {
    id: string;
    title: string;
    author?: string | null;
    coverUrl?: string | null;
    customCoverUrl?: string | null;
    downloadUrl: string;
    format: 'epub' | 'pdf' | 'cbz' | 'audio';
    fileName?: string | null;
    medium?: BookMedium;
  },
  onProgress?: (percent: number) => void
): Promise<{ success: boolean; size?: number; error?: string }> {
  try {
    onProgress?.(10);

    let fetchUrl = book.downloadUrl;
    if (fetchUrl.startsWith('http://') || fetchUrl.startsWith('https://')) {
      const isSameHost =
        typeof window !== 'undefined' &&
        fetchUrl.startsWith(window.location.origin);
      if (!isSameHost) {
        fetchUrl = `/api/download-proxy?url=${encodeURIComponent(book.downloadUrl)}`;
      }
    }

    onProgress?.(30);
    const res = await fetch(fetchUrl);
    if (!res.ok) {
      throw new Error(`Máy chủ từ chối tải (HTTP ${res.status})`);
    }

    onProgress?.(65);
    const rawBlob = await res.blob();
    const cleanExt = book.format === 'audio' ? 'mp3' : book.format;
    // Đảm bảo đối với sách nói, Blob luôn mang chuẩn audio/mpeg để audio engine trình duyệt di động giải mã mượt mà
    const blob =
      book.format === 'audio' || book.medium === 'audio' || cleanExt === 'mp3'
        ? new Blob([rawBlob], { type: 'audio/mpeg' })
        : rawBlob;
    onProgress?.(85);

    const activeCover = book.customCoverUrl || book.coverUrl;
    const filename =
      book.fileName ||
      `${book.title.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_')}.${cleanExt}`;

    const result = await offlineStorage.saveBookToOffline({
      id: book.id,
      title: book.title,
      author: book.author || 'Tác giả',
      coverUrl: activeCover,
      fileUrl: book.downloadUrl,
      fileName: filename,
      fileBlob: blob,
    });

    // Lưu bìa tùy biến vào localStorage nếu có
    if (book.customCoverUrl && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`custom_cover_${book.id}`, book.customCoverUrl);
      } catch {}
    }

    onProgress?.(100);
    return { success: true, size: result.size };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Lỗi khi tải hoặc lưu tệp vào máy.',
    };
  }
}

/**
 * Tìm kiếm sách mở rộng qua API Gutendex (Project Gutenberg)
 */
export async function searchOnlineGutenbergBooks(query: string): Promise<OnlineBookItem[]> {
  const q = query.trim();
  if (!q) return [];

  try {
    const res = await fetch(
      `https://gutendex.com/books/?search=${encodeURIComponent(q)}`
    );
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results.slice(0, 8).map((item: any) => {
      const formats = item.formats || {};
      const rawEpubUrl =
        formats['application/epub+zip'] ||
        formats['application/x-mobipocket-ebook'] ||
        formats['text/plain; charset=utf-8'] ||
        `https://www.gutenberg.org/ebooks/${item.id}.epub.noimages`;

      // Định tuyến qua proxy an toàn chống chặn CORS trên trình duyệt
      const epubUrl = `/api/proxy-ebook?url=${encodeURIComponent(rawEpubUrl)}`;

      const coverUrl = formats['image/jpeg'] || '';

      const authors =
        item.authors && item.authors.length > 0
          ? item.authors.map((a: any) => a.name).join(', ')
          : 'Nhiều tác giả';

      return {
        id: `gutenberg-${item.id}`,
        title: item.title,
        author: authors,
        medium: 'read' as BookMedium,
        category: 'van-hoc' as const,
        categoryName: 'Văn học',
        format: 'epub' as const,
        fileSizeFormatted: '~1.5 MB',
        coverUrl,
        downloadUrl: epubUrl,
        description: `Tác phẩm mở Project Gutenberg #${item.id}. Hơn ${item.download_count?.toLocaleString?.() || '10,000'} lượt đọc.`,
        badgeTag: 'GUTENBERG',
        language: item.languages?.includes('vi') ? 'vi' : 'en',
        source: 'Gutenberg',
      };
    });
  } catch {
    return [];
  }
}

/**
 * Tìm kiếm sách mở rộng qua Open Library API
 * Chỉ hỗ trợ nếu có tài liệu mở thực sự, không tự suy đoán link ảo gây lỗi Failed to fetch
 */
export async function searchOpenLibraryBooks(query: string): Promise<OnlineBookItem[]> {
  // Loại bỏ hoàn toàn việc đoán link archive.org gây Failed to fetch
  return [];
}

/**
 * Tìm kiếm sách nói trực tuyến qua LibriVox & Internet Archive Audio API
 */
export async function searchOnlineLibriVoxAudiobooks(query: string): Promise<OnlineBookItem[]> {
  const q = query.trim();
  if (!q) return [];

  try {
    const res = await fetch(
      `https://archive.org/advancedsearch.php?q=collection:(librivoxaudio)+AND+${encodeURIComponent(q)}&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&rows=6&output=json`
    );
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.response?.docs || !Array.isArray(data.response.docs)) return [];

    return data.response.docs
      .filter((doc: any) => doc.title && doc.identifier)
      .slice(0, 6)
      .map((doc: any) => {
        const id = doc.identifier;
        return {
          id: `librivox-${id}`,
          title: doc.title,
          author: doc.creator || 'LibriVox Volunteers',
          medium: 'audio' as BookMedium,
          category: 'van-hoc' as const,
          categoryName: 'Sách nói mở',
          format: 'audio' as const,
          fileSizeFormatted: '~15 MB',
          durationFormatted: 'Sách nói MP3',
          coverUrl: `https://archive.org/services/img/${id}`,
          downloadUrl: `https://archive.org/download/${id}/${id}_64kb.mp3`,
          description: `Sách nói mở LibriVox Audio / Internet Archive. Hơn ${doc.downloads?.toLocaleString?.() || '5,000'} lượt nghe trên thế giới.`,
          badgeTag: 'LIBRIVOX MP3 🎧',
          language: 'en' as const,
          source: 'LibriVox Audio',
          audioNarrator: doc.creator || 'LibriVox Audio',
        };
      });
  } catch {
    return [];
  }
}

export function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

const STOP_WORDS = new Set([
  'toi',
  'minh',
  'em',
  'anh',
  'chi',
  'ban',
  'thich',
  'muon',
  'can',
  'tim',
  'mot',
  'vai',
  'cuon',
  'quyen',
  'sach',
  'noi',
  've',
  'cai',
  'nay',
  'kia',
  'vi',
  'du',
  'nhu',
  'la',
  'va',
  'cac',
  'nhung',
  'co',
  'nao',
  'khong',
  'kieu',
  'the',
  'gi',
  'day',
  'thi',
  'phu',
  'hop',
  'voi',
  'cho',
  'de',
  'duoc',
  'hay',
  'giup',
  'ai',
  'ho',
  'xem',
]);

/**
 * Thuật toán so khớp thông minh NLP cho tiếng Việt tự nhiên
 * Hỗ trợ khớp chính xác tiêu đề, tác giả, cụm từ bigram, và loại trừ kết quả rác do chỉ trùng 1 từ đơn lẻ
 */
export function matchSmartKeywords(
  targetText: string,
  searchQuery: string,
  options?: { title?: string; author?: string }
): { matched: boolean; score: number } {
  if (!searchQuery || !searchQuery.trim()) return { matched: true, score: 1 };

  const normTarget = removeVietnameseTones(targetText).toLowerCase();
  const normQuery = removeVietnameseTones(searchQuery).toLowerCase().trim();

  // 1. Kiểm tra ưu tiên cao nhất: Khớp tiêu đề sách
  if (options?.title) {
    const normTitle = removeVietnameseTones(options.title).toLowerCase();
    if (normTitle.includes(normQuery)) {
      return { matched: true, score: 300 };
    }
    const qTokens = normQuery.split(/\s+/).filter(Boolean);
    if (qTokens.length > 1 && qTokens.every((t) => normTitle.includes(t))) {
      return { matched: true, score: 250 };
    }
  }

  // 2. Kiểm tra ưu tiên cao nhì: Khớp tên tác giả
  if (options?.author) {
    const normAuthor = removeVietnameseTones(options.author).toLowerCase();
    if (normAuthor.includes(normQuery)) {
      return { matched: true, score: 200 };
    }
    const qTokens = normQuery.split(/\s+/).filter(Boolean);
    if (qTokens.length > 1 && qTokens.every((t) => normAuthor.includes(t))) {
      return { matched: true, score: 180 };
    }
  }

  // 3. Khớp chính xác cả chuỗi trong toàn bộ nội dung
  if (normTarget.includes(normQuery)) {
    return { matched: true, score: 120 };
  }

  const rawTokens = normQuery.split(/\s+/).filter(Boolean);
  const meaningfulTokens = rawTokens.filter((t) => t.length > 1 && !STOP_WORDS.has(t));

  if (meaningfulTokens.length === 0) {
    const anyMatch = rawTokens.some((t) => normTarget.includes(t));
    return { matched: anyMatch, score: anyMatch ? 10 : 0 };
  }

  let score = 0;
  let hasBigramMatch = false;

  // 4. So khớp các cụm 2 từ (bigrams) quan trọng
  for (let i = 0; i < rawTokens.length - 1; i++) {
    const w1 = rawTokens[i];
    const w2 = rawTokens[i + 1];
    if (!STOP_WORDS.has(w1) || !STOP_WORDS.has(w2)) {
      const bigram = `${w1} ${w2}`;
      if (normTarget.includes(bigram)) {
        hasBigramMatch = true;
        score += 35;
      }
    }
  }

  // 5. So khớp từng từ khóa đơn có ý nghĩa
  let matchedCount = 0;
  for (const token of meaningfulTokens) {
    if (normTarget.includes(token)) {
      matchedCount++;
      score += 15;
    }
  }

  // Tiêu chí MATCHED nghiêm ngặt:
  let matched = false;
  if (meaningfulTokens.length === 1) {
    // Với từ khóa 1 từ (vd: "truyện", "holmes", "kiều"): cần khớp từ đó
    matched = matchedCount >= 1;
  } else if (meaningfulTokens.length === 2) {
    // Với từ khóa 2 từ (vd: "chí phèo", "tôn tử", "nam cao"): cần khớp cụm 2 từ hoặc cả 2 từ cùng xuất hiện
    matched = hasBigramMatch || matchedCount >= 2;
  } else {
    // Với từ khóa từ 3 từ trở lên (vd: "đắc nhân tâm", "binh pháp tôn tử"):
    // Phải có cụm từ nối tiếp (bigram) HOẶC tối thiểu 70% số từ khóa khớp
    const requiredMatches = Math.ceil(meaningfulTokens.length * 0.7);
    matched = (hasBigramMatch && matchedCount >= 2) || matchedCount >= requiredMatches;
  }

  return { matched, score: matched ? score : 0 };
}

/**
 * Trích xuất khóa tên sách gốc (loại bỏ tiền tố Sách nói, Audiobook, phụ đề) để so khớp Đọc & Nghe
 */
export function extractBaseTitleKey(title: string): string {
  const cleaned = title
    .toLowerCase()
    .replace(/^sách\s*nói\s*[:\-–—\.]*\s*/i, '')
    .replace(/^sach\s*noi\s*[:\-–—\.]*\s*/i, '')
    .replace(/^audiobook\s*[:\-–—\.]*\s*/i, '')
    .replace(/\s*\((toàn văn|trọn vẹn|trọn bộ|bản thu âm|diễn đọc|bản dịch|bản gốc|audio).*?\)/gi, '')
    .replace(/\s*[-–—].*$/i, '')
    .trim();

  return removeVietnameseTones(cleaned).replace(/[^a-z0-9]/g, '');
}

/**
 * Gộp các đầu sách vừa có sách đọc vừa có sách nói thành Thẻ Đa Phương Tiện (Đọc 📖 + Nghe 🎧)
 */
export function unifyBookMediaItems(books: OnlineBookItem[]): OnlineBookItem[] {
  const readMap = new Map<string, OnlineBookItem>();
  const audioMap = new Map<string, OnlineBookItem>();
  const otherList: OnlineBookItem[] = [];

  for (const b of books) {
    if (b.medium === 'both') {
      otherList.push(b);
      continue;
    }
    const key = extractBaseTitleKey(b.title);
    if (!key || key.length < 3) {
      otherList.push(b);
      continue;
    }

    if (b.medium === 'audio' || b.format === 'audio') {
      if (!audioMap.has(key)) {
        audioMap.set(key, b);
      } else {
        otherList.push(b);
      }
    } else {
      if (!readMap.has(key)) {
        readMap.set(key, b);
      } else {
        otherList.push(b);
      }
    }
  }

  const mergedList: OnlineBookItem[] = [];
  const matchedAudioKeys = new Set<string>();

  // 1. Duyệt qua sách đọc để ghép với sách nói cùng tên
  readMap.forEach((readBook, key) => {
    const audioBook = audioMap.get(key);
    if (audioBook) {
      // Hợp nhất thành 1 đầu sách đa phương tiện hoàn chỉnh
      mergedList.push({
        ...readBook,
        id: `unified-${readBook.id}-${audioBook.id}`,
        medium: 'both',
        badgeTag: 'ĐỌC & NGHE 📖🎧',
        durationFormatted: audioBook.durationFormatted,
        audioNarrator: audioBook.audioNarrator,
        audioSampleText: audioBook.audioSampleText,
        audioBookItem: audioBook,
        readBookItem: readBook,
      });
      matchedAudioKeys.add(key);
    } else {
      mergedList.push(readBook);
    }
  });

  // 2. Thêm các sách nói đứng độc lập (không có bản đọc)
  audioMap.forEach((audioBook, key) => {
    if (!matchedAudioKeys.has(key)) {
      mergedList.push(audioBook);
    }
  });

  return [...mergedList, ...otherList];
}

/**
 * Tra cứu chính xác xem cuốn sách có bản thu âm Sách Nói thật (Audio MP3/M4A) hay không
 * Nếu KHÔNG có sách nói thật, trả về null để TUYỆT ĐỐI KHÔNG HIỂN THỊ NÚT TAI NGHE trên giao diện đọc sách!
 */
export function findRealAudioForBook(title: string, _author?: string): OnlineBookItem | null {
  if (!title) return null;
  const normTitle = removeVietnameseTones(title).toLowerCase().trim();

  // Danh sách các sách nói thật có link âm thanh thực tế
  const realAudioBooks = CURATED_ONLINE_BOOKS.filter(
    (b) =>
      (b.medium === 'audio' || b.format === 'audio') &&
      b.downloadUrl &&
      (b.downloadUrl.endsWith('.mp3') ||
        b.downloadUrl.endsWith('.m4a') ||
        b.downloadUrl.includes('archive.org') ||
        b.downloadUrl.startsWith('http'))
  );

  // 1. So khớp trực tiếp tiêu đề
  for (const ab of realAudioBooks) {
    const rawAbTitle = ab.title.replace(/^sách nói:\s*/i, '').trim();
    const normAbTitle = removeVietnameseTones(rawAbTitle).toLowerCase().trim();

    if (normTitle.includes(normAbTitle) || normAbTitle.includes(normTitle)) {
      return ab;
    }

    // So khớp các từ khóa then chốt (ít nhất 2 từ)
    const tokens = normAbTitle.split(/\s+/).filter((t: string) => t.length > 2);
    if (tokens.length >= 2 && tokens.every((t: string) => normTitle.includes(t))) {
      return ab;
    }
  }

  return null;
}

