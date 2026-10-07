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
  category: 'y-hoc' | 'van-hoc' | 'ky-nang' | 'truyen-tranh';
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
  { id: 'default', name: 'Bìa gốc', url: '' },
  { id: 'burgundy', name: 'Đỏ Burgundy', url: '/documents/covers/clean_cover_burgundy.png' },
  { id: 'navy', name: 'Xanh Navy', url: '/documents/covers/clean_cover_navy.png' },
  { id: 'emerald', name: 'Xanh Emerald', url: '/documents/covers/clean_cover_emerald.png' },
  { id: 'slate', name: 'Xám Tối giản', url: '/documents/covers/clean_cover_slate.png' },
];

export const ONLINE_CATEGORIES = [
  { id: 'all', name: 'Tất cả' },
  { id: 'y-hoc', name: 'Y học' },
  { id: 'van-hoc', name: 'Văn học' },
  { id: 'ky-nang', name: 'Kỹ năng' },
  { id: 'truyen-tranh', name: 'Truyện tranh' },
] as const;

export const CURATED_ONLINE_BOOKS: OnlineBookItem[] = [
  // ================= 1. SÁCH ĐỌC (EBOOKS) =================
  {
    id: 'online-read-1',
    title: 'Cẩm Nang Đốt Sống Cổ & Cổ Vai Gáy',
    author: 'TS.BS Nguyễn Văn Thông',
    medium: 'read',
    category: 'y-hoc',
    categoryName: 'Y học',
    format: 'epub',
    fileSizeFormatted: '1.8 MB',
    coverUrl: '/documents/covers/cover_cam_nang_dot_song_co.png',
    downloadUrl: '/documents/cam_nang_dot_song_co_vai_gay.epub',
    description: 'Bảo vệ 7 đốt sống cổ C1-C7, giải phẫu đĩa đệm và bài tập kéo giãn cơ thang, cơ ức đòn chũm giảm tê bì cổ vai gáy.',
    badgeTag: 'SÁCH ĐỌC',
    language: 'vi',
    year: '2024',
    source: 'Kho Qbiz',
  },
  {
    id: 'online-read-2',
    title: 'Dinh Dưỡng Nền Tảng & Phục Hồi Khớp',
    author: 'Tùng Dinh Dưỡng',
    medium: 'read',
    category: 'y-hoc',
    categoryName: 'Y học',
    format: 'epub',
    fileSizeFormatted: '2.1 MB',
    coverUrl: '/documents/covers/cover_dinh_duong_khang_viem.png',
    downloadUrl: '/documents/dinh_duong_phuc_hoi_khop_va_dia_dem.epub',
    description: 'Cơ chế kháng viêm tự nhiên tế bào qua Omega-3 EPA/DHA sinh học, Curcumin và tái lập mật độ sụn khớp đĩa đệm.',
    badgeTag: 'SÁCH ĐỌC',
    language: 'vi',
    year: '2024',
    source: 'Kho Qbiz',
  },
  {
    id: 'online-read-3',
    title: 'Cẩm Nang Tư Thế Vàng & Bài Tập Lưng',
    author: 'Tùng Cột Sống',
    medium: 'read',
    category: 'y-hoc',
    categoryName: 'Y học',
    format: 'pdf',
    fileSizeFormatted: '3.9 MB',
    coverUrl: '/documents/covers/cover_hieu_dung_ve_cot_song.png',
    downloadUrl: '/documents/cam_nang_tu_the_vang_bai_tap_lung.pdf',
    description: 'Khám phá cơ chế sinh học 33 đốt sống, vai trò ngậm nước của nhân nhầy và các bài tập giải nén cột sống an toàn tại nhà.',
    badgeTag: 'SÁCH ĐỌC',
    language: 'vi',
    year: '2024',
    source: 'Kho Qbiz',
  },
  {
    id: 'online-read-4',
    title: 'Atlas Giải Phẫu Cột Sống & Cơ Thể 3D',
    author: 'Hội Giải Phẫu Lâm Sàng',
    medium: 'read',
    category: 'y-hoc',
    categoryName: 'Y học',
    format: 'pdf',
    fileSizeFormatted: '6.5 MB',
    coverUrl: '/documents/covers/cover_atlas_y_khoa_toan_dien.png',
    downloadUrl: '/documents/atlas_giai_phau_cot_song_toan_dien.pdf',
    description: 'Bộ hình ảnh bóc tách giải phẫu đa tầng cơ dựng sống, dây chằng vàng, rễ thần kinh tủy sống và khoang ngoài màng cứng.',
    badgeTag: 'ATLAS 3D',
    language: 'vi',
    year: '2023',
    source: 'Kho Y Khoa',
  },
  {
    id: 'online-read-5',
    title: 'Atlas Minh Họa Giải Phẫu 3D (CBZ)',
    author: 'Studio Giải Phẫu Y Học',
    medium: 'read',
    category: 'truyen-tranh',
    categoryName: 'Truyện tranh',
    format: 'cbz',
    fileSizeFormatted: '3.4 MB',
    coverUrl: '/documents/covers/cover_atlas_y_khoa_toan_dien.png',
    downloadUrl: '/documents/atlas_giai_phau_hinh_anh_3d.cbz',
    description: 'Bộ tranh truyện minh họa trực quan bóc tách 3D từng lát cắt cơ thể, cấu trúc đĩa đệm và huyệt đạo tủy sống đóng gói CBZ.',
    badgeTag: 'TRUYỆN CBZ',
    language: 'vi',
    year: '2024',
    source: 'Open Comic',
  },
  {
    id: 'online-read-6',
    title: 'Những Vụ Án Của Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    medium: 'read',
    category: 'van-hoc',
    categoryName: 'Văn học',
    format: 'epub',
    fileSizeFormatted: '1.2 MB',
    coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80',
    downloadUrl: 'https://www.gutenberg.org/ebooks/1661.epub.noimages',
    description: 'Tuyển tập trinh thám kinh điển đưa tên tuổi thám tử Sherlock Holmes và bác sĩ Watson trở thành huyền thoại văn học.',
    badgeTag: 'KINH ĐIỂN',
    language: 'en',
    year: '1892',
    source: 'Gutenberg',
  },
  {
    id: 'online-read-7',
    title: 'Giáo Trình Y Khoa & Sức Khỏe Tổng Quan',
    author: 'Bộ Môn Y Học Lâm Sàng',
    medium: 'read',
    category: 'y-hoc',
    categoryName: 'Y học',
    format: 'pdf',
    fileSizeFormatted: '5.3 MB',
    coverUrl: '/documents/covers/cover_co-the-nguoi.png',
    downloadUrl: '/documents/giao_trinh_y_khoa_tong_quan.pdf',
    description: 'Giáo trình chuẩn hóa kiến thức chăm sóc sức khỏe chủ động, phòng ngừa thoái hóa xương khớp và phục hồi chức năng.',
    badgeTag: 'GIÁO TRÌNH',
    language: 'vi',
    year: '2024',
    source: 'Kho Y Khoa',
  },
  {
    id: 'online-read-8',
    title: 'Tiêu Chuẩn Chẩn Đoán Dấu Hiệu Cờ Đỏ',
    author: 'Hội Thần Kinh Cột Sống',
    medium: 'read',
    category: 'y-hoc',
    categoryName: 'Y học',
    format: 'pdf',
    fileSizeFormatted: '2.5 MB',
    coverUrl: '/documents/covers/cover_cot-song.png',
    downloadUrl: '/documents/tieu_chuan_chan_doan_dau_hieu_co_do.pdf',
    description: 'Cẩm nang sàng lọc các dấu hiệu cờ đỏ nguy hiểm khi đau lưng, chèn ép tủy sống và hội chứng chùm đuôi ngựa.',
    badgeTag: 'CẨM NANG',
    language: 'vi',
    year: '2024',
    source: 'Kho Y Khoa',
  },
  {
    id: 'online-read-9',
    title: 'Bảng Tra Cứu Rễ Thần Kinh Cột Sống',
    author: 'TS.BS Nguyễn Văn Thông',
    medium: 'read',
    category: 'y-hoc',
    categoryName: 'Y học',
    format: 'pdf',
    fileSizeFormatted: '1.8 MB',
    coverUrl: '/documents/covers/cover_atlas_y_khoa_toan_dien.png',
    downloadUrl: '/documents/bang_tra_cuu_re_than_kinh_cot_song.pdf',
    description: 'Sơ đồ định vị phân bổ rễ thần kinh tủy sống từ C1-C8 đến L1-S5 chi phối cảm giác và vận động tứ chi.',
    badgeTag: 'TRA CỨU',
    language: 'vi',
    year: '2024',
    source: 'Kho Y Khoa',
  },

  // ================= 2. SÁCH NÓI (AUDIOBOOKS) =================
  {
    id: 'online-audio-1',
    title: 'Sách Nói: Giải Mã Đĩa Đệm & Cột Sống',
    author: 'Dr. Tùng Chuyên Gia Cột Sống',
    medium: 'audio',
    category: 'y-hoc',
    categoryName: 'Y học',
    format: 'audio',
    fileSizeFormatted: '18 MB',
    durationFormatted: '28 phút',
    coverUrl: '/documents/covers/cover_giai_ma_cot_song.png',
    downloadUrl: '/documents/cam_nang_tu_the_vang_bai_tap_lung.pdf', // Nguồn text/audio kết hợp
    description: 'Giọng đọc truyền cảm phân tích cơ chế bơm hút dịch nhân nhầy đĩa đệm, giải tỏa âu lo thoát vị đốt sống L4-L5 và S1.',
    badgeTag: 'SÁCH NÓI 🎧',
    language: 'vi',
    year: '2024',
    source: 'Kho Qbiz Audio',
    audioNarrator: 'Giọng đọc truyền cảm',
    audioSampleText: 'Chào mừng bạn đến với sách nói Giải Mã Đĩa Đệm & Cột Sống. Đĩa đệm không phải là một khối xương chết, mà là một thực thể sinh học ngậm nước sống động...',
  },
  {
    id: 'online-audio-2',
    title: 'Sách Nói: Dinh Dưỡng Kháng Viêm Tự Nhiên',
    author: 'Tùng Dinh Dưỡng',
    medium: 'audio',
    category: 'y-hoc',
    categoryName: 'Y học',
    format: 'audio',
    fileSizeFormatted: '22 MB',
    durationFormatted: '35 phút',
    coverUrl: '/documents/covers/cover_dinh_duong_khang_viem.png',
    downloadUrl: '/documents/dinh_duong_phuc_hoi_khop_va_dia_dem.epub',
    description: 'Chuyên đề âm thanh hướng dẫn thực đơn thực vật toàn phần, tỷ lệ vàng Omega-3 và nghệ Curcumin dập tắt ổ viêm sụn khớp.',
    badgeTag: 'SÁCH NÓI 🎧',
    language: 'vi',
    year: '2024',
    source: 'Kho Qbiz Audio',
    audioNarrator: 'Giọng chuyên gia',
    audioSampleText: 'Viêm mạn tính tại ổ khớp là kẻ thù thầm lặng tàn phá sụn khớp mỗi ngày. Khi thay đổi chế độ dinh dưỡng giàu chất chống oxy hóa tự nhiên...',
  },
  {
    id: 'online-audio-3',
    title: 'Sách Nói: Lắng Nghe Cơ Thể & Chữa Lành',
    author: 'TS.BS Nguyễn Văn Thông',
    medium: 'audio',
    category: 'y-hoc',
    categoryName: 'Y học',
    format: 'audio',
    fileSizeFormatted: '16 MB',
    durationFormatted: '24 phút',
    coverUrl: '/documents/covers/cover_lang_nghe_co_the.png',
    downloadUrl: '/documents/cam_nang_dot_song_co_vai_gay.epub',
    description: 'Phương pháp nhận diện sớm các tín hiệu cơ thể: nhói buốt rễ thần kinh, mỏi cơ thang, căng thẳng cổ vai gáy để tự phục hồi.',
    badgeTag: 'SÁCH NÓI 🎧',
    language: 'vi',
    year: '2024',
    source: 'Kho Qbiz Audio',
    audioNarrator: 'Giọng đọc ấm áp',
    audioSampleText: 'Cơn đau lưng hay mỏi cổ không phải là kẻ thù, mà là tiếng chuông cảnh báo chân thành nhất của cơ thể nhắc nhở bạn cần nghỉ ngơi...',
  },
  {
    id: 'online-audio-4',
    title: 'Sách Nói: Nghệ Thuật Đọc Nhanh & Tập Trung',
    author: 'Tủ Sách Khai Phóng Mở',
    medium: 'audio',
    category: 'ky-nang',
    categoryName: 'Kỹ năng',
    format: 'audio',
    fileSizeFormatted: '25 MB',
    durationFormatted: '40 phút',
    coverUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=500&auto=format&fit=crop&q=80',
    downloadUrl: '/documents/cam_nang_tu_the_vang_bai_tap_lung.pdf',
    description: 'Chuyên khảo kỹ thuật Bionic Reading, mở rộng tầm nhìn mắt và cách rèn luyện khả năng ghi nhớ dài hạn khi tiếp thu sách.',
    badgeTag: 'SÁCH NÓI 🎧',
    language: 'vi',
    year: '2024',
    source: 'Kỹ Năng Audio',
    audioNarrator: 'Giọng diễn cảm',
    audioSampleText: 'Tốc độ đọc của bạn hoàn toàn có thể tăng gấp ba lần nếu bạn giải phóng ánh mắt khỏi thói quen đọc thầm từng từ một...',
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
    const cleanExt = book.format === 'audio' ? 'pdf' : book.format;
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

      const coverUrl =
        formats['image/jpeg'] ||
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80';

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
        const coverUrl = coverId
          ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
          : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80';
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
