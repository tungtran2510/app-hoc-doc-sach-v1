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

export type BookMedium = 'read' | 'audio';

export interface OnlineBookItem {
  id: string;
  title: string;
  author: string;
  medium: BookMedium; // 'read' (Sách đọc) | 'audio' (Sách nói)
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
  // ================= 1. KHO VĂN HỌC & LỊCH SỬ KINH ĐIỂN VIỆT NAM (EPUB CHUẨN) =================
  {
    id: 'online-vn-chi-pheo',
    title: 'Chí Phèo',
    author: 'Nam Cao',
    medium: 'read',
    category: 'viet-nam',
    categoryName: 'Văn học Việt Nam',
    format: 'epub',
    fileSizeFormatted: '4.6 KB',
    coverUrl: 'style:terracotta',
    downloadUrl: '/documents/vietnam_chi_pheo.epub',
    description: 'Kiệt tác hiện thực phê phán đỉnh cao của văn học Việt Nam về bi kịch tha hóa và tiếng kêu xé lòng đòi quyền làm người lương thiện của Chí Phèo làng Vũ Đại.',
    badgeTag: 'VIỆT NAM EPUB 🇻🇳',
    language: 'vi',
    year: '1941',
    source: 'Văn học Việt Nam',
  },
  {
    id: 'online-vn-so-do',
    title: 'Số Đỏ',
    author: 'Vũ Trọng Phụng',
    medium: 'read',
    category: 'viet-nam',
    categoryName: 'Văn học Việt Nam',
    format: 'epub',
    fileSizeFormatted: '4.4 KB',
    coverUrl: 'style:burgundy',
    downloadUrl: '/documents/vietnam_so_do.epub',
    description: 'Tiểu thuyết trào phúng kiệt xuất của Vũ Trọng Phụng đả kích sâu cay thói rởm hợm của xã hội tư sản thành thị qua bước thăng tiến ly kỳ của Xuân Tóc Đỏ.',
    badgeTag: 'VIỆT NAM EPUB 🇻🇳',
    language: 'vi',
    year: '1936',
    source: 'Văn học Việt Nam',
  },
  {
    id: 'online-vn-truyen-kieu',
    title: 'Truyện Kiều (Đoạn Trường Tân Thanh)',
    author: 'Đại thi hào Nguyễn Du',
    medium: 'read',
    category: 'viet-nam',
    categoryName: 'Văn học Việt Nam',
    format: 'epub',
    fileSizeFormatted: '4.5 KB',
    coverUrl: 'style:navy',
    downloadUrl: '/documents/vietnam_truyen_kieu.epub',
    description: 'Đỉnh cao thi ca dân tộc Việt Nam với 3.254 câu thơ lục bát bất hủ về số phận mười lăm năm lưu lạc của Thúy Kiều, chữ Tâm và chữ Tài.',
    badgeTag: 'VIỆT NAM EPUB 🇻🇳',
    language: 'vi',
    year: '1820',
    source: 'Di sản văn hóa Việt Nam',
  },
  {
    id: 'online-vn-tat-den',
    title: 'Tắt Đèn',
    author: 'Ngô Tất Tố',
    medium: 'read',
    category: 'viet-nam',
    categoryName: 'Văn học Việt Nam',
    format: 'epub',
    fileSizeFormatted: '4.2 KB',
    coverUrl: 'style:ivory',
    downloadUrl: '/documents/vietnam_tat_den.epub',
    description: 'Bức tranh ngột ngạt về sưu thuế và nông thôn Việt Nam trước cách mạng với tinh thần quật cường phản kháng của nhân vật Chị Dậu.',
    badgeTag: 'VIỆT NAM EPUB 🇻🇳',
    language: 'vi',
    year: '1939',
    source: 'Văn học Việt Nam',
  },
  {
    id: 'online-vn-gio-dau-mua',
    title: 'Gió Đầu Mùa',
    author: 'Thạch Lam',
    medium: 'read',
    category: 'viet-nam',
    categoryName: 'Văn học Việt Nam',
    format: 'epub',
    fileSizeFormatted: '3.3 KB',
    coverUrl: 'style:white',
    downloadUrl: '/documents/vietnam_gio_dau_mua.epub',
    description: 'Tuyển tập truyện ngắn nhân văn giàu chất thơ của Thạch Lam về tình người ấm áp nơi phố huyện, chiếc áo bông cho bé Hiên và chuyến tàu đêm mang ánh sáng.',
    badgeTag: 'VIỆT NAM EPUB 🇻🇳',
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
    fileSizeFormatted: '3.1 KB',
    coverUrl: 'style:ivory',
    downloadUrl: '/documents/vietnam_ha_noi_36_pho_phuong.epub',
    description: 'Tùy bút tinh tế về ẩm thực phở, bún chả, cốm Làng Vòng và vẻ đẹp kinh kỳ nghìn năm văn hiến của ba mươi sáu phố phường Hà Nội xưa.',
    badgeTag: 'VIỆT NAM EPUB 🇻🇳',
    language: 'vi',
    year: '1943',
    source: 'Văn hóa Hà Nội',
  },
  {
    id: 'online-vn-lao-hac',
    title: 'Lão Hạc',
    author: 'Nam Cao',
    medium: 'read',
    category: 'viet-nam',
    categoryName: 'Văn học Việt Nam',
    format: 'epub',
    fileSizeFormatted: '4.2 KB',
    coverUrl: 'style:terracotta',
    downloadUrl: '/documents/vietnam_lao_hac.epub',
    description: 'Truyện ngắn bất hủ về tình phụ tử thiêng liêng, nỗi đau chia tay cậu Vàng và nhân cách thanh sạch, tự trọng ngời sáng của người nông dân nghèo.',
    badgeTag: 'VIỆT NAM EPUB 🇻🇳',
    language: 'vi',
    year: '1943',
    source: 'Văn học Việt Nam',
  },
  {
    id: 'online-vn-vang-bong',
    title: 'Vang Bóng Một Thời',
    author: 'Nguyễn Tuân',
    medium: 'read',
    category: 'viet-nam',
    categoryName: 'Văn học Việt Nam',
    format: 'epub',
    fileSizeFormatted: '3.2 KB',
    coverUrl: 'style:burgundy',
    downloadUrl: '/documents/vietnam_vang_bong_mot_thoi.epub',
    description: 'Tuyển tập văn xuôi đỉnh cao phục dựng những thú chơi tao nhã cổ truyền của người xưa và khí phách hiên ngang cho chữ của Huấn Cao nơi ngục tối.',
    badgeTag: 'VIỆT NAM EPUB 🇻🇳',
    language: 'vi',
    year: '1940',
    source: 'Văn học Việt Nam',
  },
  {
    id: 'online-vn-su-luoc',
    title: 'Việt Nam Sử Lược',
    author: 'Trần Trọng Kim',
    medium: 'read',
    category: 'viet-nam',
    categoryName: 'Lịch sử Việt Nam',
    format: 'epub',
    fileSizeFormatted: '3.1 KB',
    coverUrl: 'style:navy',
    downloadUrl: '/documents/vietnam_viet_nam_su_luoc.epub',
    description: 'Bộ thông sử quốc ngữ đầu tiên hệ thống hóa trọn vẹn 4.000 năm dựng nước và giữ nước oai hùng từ thời Hồng Bàng, Lý, Trần đến Lê Sơ và Tây Sơn.',
    badgeTag: 'VIỆT NAM EPUB 🇻🇳',
    language: 'vi',
    year: '1920',
    source: 'Sử liệu Việt Nam',
  },

  // ================= 2. SÁCH Y KHOA & SỨC KHỎE VIỆT NAM =================
  {
    id: 'online-read-cotsong-co',
    title: 'Cẩm Nang Đốt Sống Cổ & Vai Gáy',
    author: 'Dr. Tùng · Tủ Sách Y Khoa',
    medium: 'read',
    category: 'y-hoc',
    categoryName: 'Y học & Sức khỏe',
    format: 'epub',
    fileSizeFormatted: '7.6 KB',
    coverUrl: '',
    downloadUrl: '/documents/cam_nang_dot_song_co_vai_gay.epub',
    description: 'Cẩm nang thực hành giải nén 7 đốt sống cổ C1-C7, phòng ngừa hội chứng cổ vai gáy dân văn phòng và thoát vị đĩa đệm.',
    badgeTag: 'Y KHOA EPUB',
    language: 'vi',
    year: '2024',
    source: 'Tủ Sách Y Khoa',
  },
  {
    id: 'online-read-dinhduong',
    title: 'Dinh Dưỡng Nền Tảng & Phục Hồi Khớp',
    author: 'Dr. Tùng · Tủ Sách Y Khoa',
    medium: 'read',
    category: 'y-hoc',
    categoryName: 'Y học & Sức khỏe',
    format: 'epub',
    fileSizeFormatted: '4.9 KB',
    coverUrl: '',
    downloadUrl: '/documents/dinh_duong_phuc_hoi_khop_va_dia_dem.epub',
    description: 'Cơ chế kháng viêm tế bào, dinh dưỡng bơm hút nhân nhầy đĩa đệm và chế độ ăn tái lập mật độ xương khớp tự nhiên.',
    badgeTag: 'Y KHOA EPUB',
    language: 'vi',
    year: '2024',
    source: 'Tủ Sách Y Khoa',
  },
  {
    id: 'online-read-atlas-cotsong',
    title: 'Atlas Giải Phẫu Cột Sống Toàn Diện',
    author: 'Ban Cố Vấn Y Khoa Qbiz',
    medium: 'read',
    category: 'y-hoc',
    categoryName: 'Y học & Sức khỏe',
    format: 'pdf',
    fileSizeFormatted: '393 KB',
    coverUrl: '',
    downloadUrl: '/documents/atlas_giai_phau_cot_song_toan_dien.pdf',
    description: 'Bản đồ vector giải phẫu chi tiết 33 đốt sống, đĩa đệm và mạng lưới rễ thần kinh tủy sống chuẩn xác.',
    badgeTag: 'PDF VECTOR',
    language: 'vi',
    year: '2024',
    source: 'Tủ Sách Y Khoa',
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
    id: 'online-read-archive-cbz-timemachine',
    title: 'Truyện Tranh Cổ Điển: Cỗ Máy Thời Gian (CBZ)',
    author: 'H.G. Wells · Classics Illustrated',
    medium: 'read',
    category: 'truyen-tranh',
    categoryName: 'Truyện tranh',
    format: 'cbz',
    fileSizeFormatted: '12 MB',
    coverUrl: '',
    downloadUrl: 'https://archive.org/download/ClassicsIllustrated0133TheTimeMachine1956/Classics%20Illustrated%200133%20The%20Time%20Machine%20%281956%29.cbz',
    description: 'Bản truyện tranh minh họa đầy đủ Classics Illustrated phát hành năm 1956 chuyển thể kiệt tác du hành thời gian của H.G. Wells.',
    badgeTag: 'CLASSIC CBZ',
    language: 'en',
    year: '1956',
    source: 'Digital Comic Museum',
  },

  // ================= 4. SÁCH NÓI (AUDIOBOOKS - TIẾNG VIỆT & THẾ GIỚI MP3 CHUẨN) =================
  {
    id: 'online-audio-vn-truyen-kieu',
    title: 'Sách Nói: Truyện Kiều - Khúc Đoạn Trường',
    author: 'Đại thi hào Nguyễn Du · Nghệ sĩ diễn đọc',
    medium: 'audio',
    category: 'viet-nam',
    categoryName: 'Sách nói Việt Nam',
    format: 'audio',
    fileSizeFormatted: '470 KB',
    durationFormatted: '30 giây',
    coverUrl: '',
    downloadUrl: '/documents/audio_sample_truyen_kieu.mp3', // Streamable mp3
    description: 'Giọng đọc diễn cảm trọn vẹn những trường đoạn xúc động nhất trong Truyện Kiều, đưa thính giả hòa mình vào áng văn chương trác tuyệt non sông.',
    badgeTag: 'AUDIO TIẾNG VIỆT 🎧',
    language: 'vi',
    year: '2023',
    source: 'Sách nói Việt Nam',
    audioNarrator: 'Nghệ sĩ Ngâm Thơ Dân Tộc',
    audioSampleText: 'Trăm năm trong cõi người ta, chữ tài chữ mệnh khéo là ghét nhau. Trải qua một cuộc bể dâu, những điều trông thấy mà đau đớn lòng...',
  },
  {
    id: 'online-audio-vn-chi-pheo',
    title: 'Sách Nói: Chí Phèo & Bát Cháo Hành',
    author: 'Nam Cao · Kịch truyền thanh',
    medium: 'audio',
    category: 'viet-nam',
    categoryName: 'Sách nói Việt Nam',
    format: 'audio',
    fileSizeFormatted: '470 KB',
    durationFormatted: '30 giây',
    coverUrl: '',
    downloadUrl: '/documents/audio_sample_chi_pheo.mp3',
    description: 'Diễn đọc kịch truyền thanh sống động về tấn bi kịch và tình yêu mộc mạc thức tỉnh lương tri Chí Phèo bên bờ sông làng Vũ Đại.',
    badgeTag: 'AUDIO TIẾNG VIỆT 🎧',
    language: 'vi',
    year: '2023',
    source: 'Sách nói Việt Nam',
    audioNarrator: 'Đoàn kịch nói truyền thanh',
    audioSampleText: 'Hắn vừa đi vừa chửi. Bao giờ cũng thế, cứ rượu xong là hắn chửi...',
  },
  {
    id: 'online-audio-librivox-artofwar',
    title: 'Sách Nói: Binh Pháp Tôn Tử (The Art of War)',
    author: 'Tôn Tử (Sun Tzu) · Đọc: Moira Fogarty',
    medium: 'audio',
    category: 'ky-nang',
    categoryName: 'Kỹ năng & Tư duy',
    format: 'audio',
    fileSizeFormatted: '470 KB',
    durationFormatted: '30 giây',
    coverUrl: '',
    downloadUrl: '/documents/audio_sample_artofwar.mp3',
    description: 'Giọng đọc diễn cảm Moira Fogarty trọn vẹn chương 1 và chương 2 của kiệt tác Binh Pháp Tôn Tử từ kho mở LibriVox thế giới.',
    badgeTag: 'LIBRIVOX MP3 🎧',
    language: 'en',
    year: '2006',
    source: 'LibriVox Audio',
    audioNarrator: 'Moira Fogarty (LibriVox)',
    audioSampleText: 'Sun Tzu said: The art of war is of vital importance to the State. It is a matter of life and death, a road either to safety or to ruin.',
  },
  {
    id: 'online-audio-librivox-sherlock',
    title: 'Sách Nói: Sherlock Holmes - Vụ Tai Tiếng Bohemia',
    author: 'Arthur Conan Doyle · Đọc: Peter Yearsley',
    medium: 'audio',
    category: 'van-hoc',
    categoryName: 'Văn học thế giới',
    format: 'audio',
    fileSizeFormatted: '470 KB',
    durationFormatted: '30 giây',
    coverUrl: '',
    downloadUrl: '/documents/audio_sample_sherlock.mp3',
    description: 'Vụ án mở đầu trứ danh trong Adventures of Sherlock Holmes đưa thám tử chạm trán nữ ca sĩ tài sắc vẹn toàn Irene Adler.',
    badgeTag: 'LIBRIVOX MP3 🎧',
    language: 'en',
    year: '2010',
    source: 'LibriVox Audio',
    audioNarrator: 'Peter Yearsley (LibriVox)',
    audioSampleText: 'To Sherlock Holmes she is always the woman. I have seldom heard him mention her under any other name...',
  },
  {
    id: 'online-audio-librivox-aesop',
    title: 'Sách Nói: Truyện Ngụ Ngôn Aesop (Volume 1)',
    author: 'Aesop · Đọc: Diễn viên LibriVox',
    medium: 'audio',
    category: 'van-hoc',
    categoryName: 'Văn học thế giới',
    format: 'audio',
    fileSizeFormatted: '470 KB',
    durationFormatted: '30 giây',
    coverUrl: '',
    downloadUrl: '/documents/audio_sample_aesop.mp3',
    description: 'Tuyển tập ngụ ngôn bài học làm người và trí tuệ xử thế cổ đại Hy Lạp được thu âm tập thể chất lượng cao từ cộng đồng LibriVox.',
    badgeTag: 'LIBRIVOX MP3 🎧',
    language: 'en',
    year: '2008',
    source: 'LibriVox Audio',
    audioNarrator: 'Nhiều diễn viên LibriVox',
    audioSampleText: 'The Wolf and the Lamb, The Bat and the Weasels, The Ass and the Grasshopper...',
  },
  {
    id: 'online-audio-librivox-frankenstein',
    title: 'Sách Nói: Frankenstein - Quái Vật Hiện Đại',
    author: 'Mary Shelley · Đọc: Cori Samuel',
    medium: 'audio',
    category: 'van-hoc',
    categoryName: 'Văn học thế giới',
    format: 'audio',
    fileSizeFormatted: '470 KB',
    durationFormatted: '30 giây',
    coverUrl: '',
    downloadUrl: '/documents/audio_sample_frankenstein.mp3',
    description: 'Bản đọc truyền cảm của Cori Samuel những lá thư đầu tiên của thuyền trưởng Walton gửi em gái trước khi cứu vớt Victor Frankenstein.',
    badgeTag: 'LIBRIVOX MP3 🎧',
    language: 'en',
    year: '2007',
    source: 'LibriVox Audio',
    audioNarrator: 'Cori Samuel (LibriVox)',
    audioSampleText: 'You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings...',
  },
  {
    id: 'online-audio-librivox-rich',
    title: 'Sách Nói: Khoa Học Làm Giàu (Science of Rich)',
    author: 'Wallace D. Wattles · Đọc: Diana Majlinger',
    medium: 'audio',
    category: 'ky-nang',
    categoryName: 'Kỹ năng & Tư duy',
    format: 'audio',
    fileSizeFormatted: '470 KB',
    durationFormatted: '30 giây',
    coverUrl: '',
    downloadUrl: '/documents/audio_sample_science_rich.mp3',
    description: 'Cuốn sách nền tảng tư duy tài chính định hình luật hấp dẫn và nguyên lý kiến tạo giá trị thịnh vượng cá nhân kinh điển thế giới.',
    badgeTag: 'LIBRIVOX MP3 🎧',
    language: 'en',
    year: '2009',
    source: 'LibriVox Audio',
    audioNarrator: 'Diana Majlinger (LibriVox)',
    audioSampleText: 'There is a Science of getting rich, and it is an exact science, like algebra or arithmetic. There are certain laws which govern the process of acquiring riches...',
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
    const blob = await res.blob();
    onProgress?.(85);

    const activeCover = book.customCoverUrl || book.coverUrl;
    const cleanExt = book.format === 'audio' ? 'mp3' : book.format;
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
      const epubUrl =
        formats['application/epub+zip'] ||
        formats['application/x-mobipocket-ebook'] ||
        formats['text/plain; charset=utf-8'] ||
        `https://www.gutenberg.org/ebooks/${item.id}.epub.noimages`;

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
 * Tìm kiếm sách mở rộng qua Open Library API (Internet Archive)
 */
export async function searchOpenLibraryBooks(query: string): Promise<OnlineBookItem[]> {
  const q = query.trim();
  if (!q) return [];

  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=6`
    );
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.docs || !Array.isArray(data.docs)) return [];

    return data.docs
      .filter((doc: any) => doc.title)
      .slice(0, 6)
      .map((doc: any) => {
        const coverId = doc.cover_i;
        const coverUrl = coverId && coverId > 0
          ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
          : '';
        const author = Array.isArray(doc.author_name)
          ? doc.author_name.join(', ')
          : 'Nhiều tác giả';
        const key = (doc.key || '').replace('/works/', '');

        return {
          id: `openlibrary-${key || Math.random().toString(36).slice(2, 7)}`,
          title: doc.title,
          author,
          medium: 'read' as BookMedium,
          category: 'van-hoc' as const,
          categoryName: 'Kho Mở',
          format: 'epub' as const,
          fileSizeFormatted: '~2.0 MB',
          coverUrl,
          downloadUrl: `https://archive.org/download/${doc.ia?.[0] || 'gutenberg'}/${doc.ia?.[0] || 'book'}.epub`,
          description: `Tài liệu Open Library / Internet Archive. Năm xuất bản: ${doc.first_publish_year || 'kinh điển'}.`,
          badgeTag: 'OPEN LIB',
          language: doc.language?.includes('vie') ? 'vi' : 'en',
          source: 'Open Library',
        };
      });
  } catch {
    return [];
  }
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
 * Khớp cả câu dài như: "Tôi thích một cuốn sách nói về dinh dưỡng và các chế độ ăn phù hợp với người Việt Nam"
 */
export function matchSmartKeywords(
  targetText: string,
  searchQuery: string
): { matched: boolean; score: number } {
  if (!searchQuery || !searchQuery.trim()) return { matched: true, score: 1 };

  const normTarget = removeVietnameseTones(targetText);
  const normQuery = removeVietnameseTones(searchQuery);

  // 1. Khớp chính xác cả chuỗi (điểm tuyệt đối)
  if (normTarget.includes(normQuery)) {
    return { matched: true, score: 100 };
  }

  const rawTokens = normQuery.split(/\s+/).filter(Boolean);
  const meaningfulTokens = rawTokens.filter((t) => t.length > 1 && !STOP_WORDS.has(t));

  if (meaningfulTokens.length === 0) {
    const anyMatch = rawTokens.some((t) => normTarget.includes(t));
    return { matched: anyMatch, score: anyMatch ? 10 : 0 };
  }

  let score = 0;

  // 2. So khớp các cụm 2 từ (bigrams) quan trọng
  for (let i = 0; i < rawTokens.length - 1; i++) {
    const w1 = rawTokens[i];
    const w2 = rawTokens[i + 1];
    if (!STOP_WORDS.has(w1) || !STOP_WORDS.has(w2)) {
      const bigram = `${w1} ${w2}`;
      if (normTarget.includes(bigram)) {
        score += 35;
      }
    }
  }

  // 3. So khớp từng từ khóa đơn có ý nghĩa
  let matchedCount = 0;
  for (const token of meaningfulTokens) {
    if (normTarget.includes(token)) {
      matchedCount++;
      score += 15;
    }
  }

  const matched = score > 0 || matchedCount >= Math.min(2, meaningfulTokens.length);
  return { matched, score };
}
