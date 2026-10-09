import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '../../../../lib/authServer';
import { getSettings } from '../../../../lib/data';
import { sampleTopics, samplePages } from '../../../../data/sample';
import { getSupabaseClient } from '../../../../lib/supabaseClient';
import { searchFastKnowledge } from '../../../../lib/knowledge';
import { getBookToc, BookTocItem } from '../../../../lib/bookTocData';

export const dynamic = 'force-dynamic';


interface LessonCatalogItem {
  topic_title: string;
  topic_slug: string;
  page_title: string;
  page_slug: string;
  summary: string;
  content: string;
}

let cachedCatalog: LessonCatalogItem[] | null = null;
let cachedCatalogExpiry = 0;

// Chuẩn hóa văn bản tiếng Việt để tìm kiếm từ khóa chính xác tuyệt đối
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface SuggestedBookItem {
  id: string;
  title: string;
  author: string;
  description?: string;
  cover_url: string;
  badge_tag?: string;
  target_page?: number;
  target_index?: number;
  reason: string;
}

export interface InBookSnippetItem {
  id: string;
  book_id: string;
  book_title: string;
  cover_url: string;
  chapter: string;
  page_number: number;
  page_index: number;
  excerpt: string;
  relevance_reason?: string;
}

/** Tủ sách Ebook Y Khoa Qbiz Books chuẩn mực */
const EBOOK_CATALOG: SuggestedBookItem[] = [
  {
    id: 'book-hieu-dung-cot-song',
    title: 'Hiểu Đúng Về Cột Sống',
    author: 'Tùng Dinh Dưỡng',
    cover_url: '/documents/covers/cover_hieu_dung_ve_cot_song.png',
    badge_tag: 'BÁN CHẠY',
    description: 'Cẩm nang toàn diện giải mã cơ chế thoát vị đĩa đệm, thoái hóa và giải pháp vận động tự phục hồi.',
    target_page: 1,
    target_index: 0,
    reason: 'Phân tích cơ chế sinh học giảm xóc đĩa đệm và giải pháp phòng ngừa thoát vị L4-L5.',
  },
  {
    id: 'book-cam-nang-co',
    title: 'Cẩm Nang Đốt Sống Cổ & Vai Gáy',
    author: 'Tùng Dinh Dưỡng',
    cover_url: '/documents/covers/cover_cam_nang_dot_song_co.png',
    badge_tag: 'HƯỚNG DẪN',
    description: 'Phương pháp bảo tồn đốt sống cổ C1-C7, giải phóng chèn ép rễ thần kinh và chống hội chứng cổ rùa.',
    target_page: 1,
    target_index: 0,
    reason: 'Hướng dẫn bảo vệ đốt sống cổ C1-C7 và giải phóng chèn ép rễ thần kinh chi phối cánh tay.',
  },
  {
    id: 'book-dinh-duong-phuc-hoi',
    title: 'Dinh Dưỡng Nền Tảng & Phục Hồi Khớp',
    author: 'Tùng Dinh Dưỡng',
    cover_url: '/documents/covers/cover_dinh_duong_khang_viem.png',
    badge_tag: 'Y HỌC',
    description: 'Chế độ ăn kháng viêm tế bào sụn, dập tắt ngọn lửa viêm mạn tính và tái lập mật độ xương khớp.',
    target_page: 1,
    target_index: 0,
    reason: 'Cung cấp thực đơn kháng viêm sinh học với Omega-3, Curcumin và Collagen Type II.',
  },
  {
    id: 'book-atlas-cot-song',
    title: 'Atlas Giải Phẫu Cột Sống & Khớp 3D',
    author: 'Tùng Dinh Dưỡng',
    cover_url: '/documents/covers/cover_atlas_y_khoa_toan_dien.png',
    badge_tag: 'ATLAS 3D',
    description: 'Atlas giải phẫu sinh động 33 đốt sống, 23 đĩa đệm và hệ thống dây chằng, rễ thần kinh nâng đỡ cơ thể.',
    target_page: 1,
    target_index: 0,
    reason: 'Minh họa 3D đa tầng 33 đốt sống, 23 đĩa đệm và bảng định vị phân bổ rễ thần kinh tủy sống.',
  },
  {
    id: 'book-nuoc-va-khoang-chat',
    title: 'Nước & Khoáng Chất Cho Cơ Thể',
    author: 'Tùng Dinh Dưỡng',
    cover_url: '/documents/covers/cover_nuoc.png',
    badge_tag: 'CẤP NƯỚC',
    description: 'Dung môi sinh hóa, cơ chế thẩm thấu nuôi dưỡng và chu trình bơm hút dịch nhân nhầy đĩa đệm.',
    target_page: 1,
    target_index: 0,
    reason: 'Giải thích cơ chế thẩm thấu và bơm hút dịch nước nuôi dưỡng nhân nhầy đĩa đệm khi ngủ.',
  },
  {
    id: 'book-tu-chua-lanh-lung',
    title: 'Tự Chữa Lành Lưng & Cổ',
    author: 'Tùng Dinh Dưỡng',
    cover_url: '/documents/covers/cover_tu_chua_lanh_lung_co.png',
    badge_tag: 'PHỤC HỒI',
    description: 'Phương pháp giải áp tự nhiên tại nhà, khôi phục đường cong sinh lý và thư giãn hệ cơ sâu.',
    target_page: 1,
    target_index: 0,
    reason: 'Hướng dẫn các tư thế giải nén tự nhiên tại nhà và phục hồi đường cong sinh lý cột sống.',
  },
  {
    id: 'book-suc-khoe-tieu-hoa',
    title: 'Sức Khỏe Hệ Tiêu Hóa Toàn Diện',
    author: 'Tùng Dinh Dưỡng',
    cover_url: '/documents/covers/cover_tieu-hoa.png',
    badge_tag: 'TIÊU HÓA',
    description: 'Trục não - ruột - khớp và cơ chế hấp thu dưỡng chất, bảo vệ niêm mạc dạ dày và đường ruột.',
    target_page: 1,
    target_index: 0,
    reason: 'Làm sáng tỏ trục vi sinh não - ruột - khớp và giải pháp bảo vệ niêm mạc đường tiêu hóa.',
  },
  {
    id: 'book-loi-khuan-duong-ruot',
    title: 'Lợi Khuẩn & Hệ Vi Sinh Đường Ruột',
    author: 'Tùng Dinh Dưỡng',
    cover_url: '/documents/covers/cover_gan-mat-tuy.png',
    badge_tag: 'VI SINH',
    description: 'Hàng rào niêm mạc ruột, chống hội chứng rò rỉ ruột và dập tắt nguồn cơn phản ứng viêm toàn thân.',
    target_page: 1,
    target_index: 0,
    reason: 'Giải pháp khôi phục hệ vi sinh đường ruột và ngăn chặn độc tố gây phản ứng viêm sụn khớp.',
  },
  {
    id: 'book-giai-ma-cot-song',
    title: 'Giải Mã Cột Sống & Thoát Vị',
    author: 'Tùng Dinh Dưỡng',
    cover_url: '/documents/covers/cover_giai_ma_cot_song.png',
    badge_tag: 'CHUYÊN SÂU',
    description: 'Phân tích cơ chế đòn bẩy tải trọng, quy tắc công thái học và kỹ thuật kích hoạt cơ lõi bảo vệ cột sống.',
    target_page: 1,
    target_index: 0,
    reason: 'Phân tích đòn bẩy cơ sinh học chịu tải và quy tắc công thái học bảo vệ đĩa đệm trong sinh hoạt.',
  },
  {
    id: 'book-giai-phau-co-the',
    title: 'Giải Phẫu Học Cơ Thể Người',
    author: 'Tùng Dinh Dưỡng',
    cover_url: '/documents/covers/cover_co-the-nguoi.png',
    badge_tag: 'TOÀN TẬP',
    description: 'Tổng quan cấu trúc các hệ cơ quan trong cơ thể: Xương khớp, tuần hoàn, hô hấp và miễn dịch.',
    target_page: 2,
    target_index: 1,
    reason: 'Cung cấp góc nhìn toàn cảnh về giải phẫu các hệ cơ quan vận động và tuần hoàn trong cơ thể.',
  },
];

/** Kho dữ liệu trích đoạn sâu trong từng trang sách phục vụ Deep In-Book Document Search */
const IN_BOOK_SNIPPETS: InBookSnippetItem[] = [
  {
    id: 'snip-1',
    book_id: 'book-hieu-dung-cot-song',
    book_title: 'Hiểu Đúng Về Cột Sống',
    cover_url: '/documents/covers/cover_hieu_dung_ve_cot_song.png',
    chapter: 'Chương 1: Cơ Chế Sinh Học & Giảm Xóc Đĩa Đệm',
    page_number: 2,
    page_index: 1,
    excerpt:
      'Cột sống gồm 33-34 đốt sống tạo thành 4 đường cong sinh lý. Đĩa đệm đóng vai trò như bộ phận giảm xóc sinh học với nhân nhầy ngậm nước và các vòng sợi collagen bao quanh.',
    relevance_reason: 'Giải thích cấu trúc giải phẫu 4 đường cong sinh lý và cơ chế giảm xóc của đĩa đệm.',
  },
  {
    id: 'snip-2',
    book_id: 'book-hieu-dung-cot-song',
    book_title: 'Hiểu Đúng Về Cột Sống',
    cover_url: '/documents/covers/cover_hieu_dung_ve_cot_song.png',
    chapter: 'Chương 2: Thoát Vị & Chèn Ép Rễ Thần Kinh',
    page_number: 3,
    page_index: 2,
    excerpt:
      'Khi đĩa đệm bị thoát vị hoặc thoái hóa xẹp lún, nhân nhầy tràn ra chèn ép vào rễ thần kinh tọa L4-L5, S1 gây ra các cơn đau nhói buốt lan dọc xuống đùi và bắp chân.',
    relevance_reason: 'Mô tả trực diện cơ chế rách vòng sợi và chèn ép rễ thần kinh tọa L4-L5.',
  },
  {
    id: 'snip-3',
    book_id: 'book-hieu-dung-cot-song',
    book_title: 'Hiểu Đúng Về Cột Sống',
    cover_url: '/documents/covers/cover_hieu_dung_ve_cot_song.png',
    chapter: 'Phụ Lục: Bảng Tra Cứu Rễ Thần Kinh Cột Sống',
    page_number: 4,
    page_index: 3,
    excerpt:
      'Bảng định vị phân bổ rễ thần kinh tủy sống: Nhánh C5-C7 chi phối cánh tay bàn tay; Nhánh L3-L5 chi phối khớp gối, cơ đùi, cẳng chân và mu bàn chân.',
    relevance_reason: 'Bảng định vị các nhánh dây thần kinh tương ứng với từng vùng cảm giác cơ thể.',
  },
  {
    id: 'snip-4',
    book_id: 'book-cam-nang-co',
    book_title: 'Cẩm Nang Đốt Sống Cổ & Vai Gáy',
    cover_url: '/documents/covers/cover_cam_nang_dot_song_co.png',
    chapter: 'Chương 1: Hội Chứng Cổ Vai Gáy Dân Văn Phòng',
    page_number: 2,
    page_index: 1,
    excerpt:
      'Tải trọng đè nén lên các đốt sống cổ C1-C7 tăng gấp 3 đến 5 lần khi gập đầu cúi bấm điện thoại hoặc làm việc với máy tính trong thời gian dài mà không nghỉ giải lao.',
    relevance_reason: 'Cảnh báo tác hại của tư thế gập cổ và áp lực tải trọng lên các đốt sống cổ C1-C7.',
  },
  {
    id: 'snip-5',
    book_id: 'book-cam-nang-co',
    book_title: 'Cẩm Nang Đốt Sống Cổ & Vai Gáy',
    cover_url: '/documents/covers/cover_cam_nang_dot_song_co.png',
    chapter: 'Chương 2: Bài Tập Vận Động Giải Nén Cột Sống Cổ',
    page_number: 3,
    page_index: 2,
    excerpt:
      'Các động tác kéo giãn cơ ức đòn chũm, nhóm cơ thang và vươn cằm giải nén rễ thần kinh giúp giảm nhanh cơn co thắt, đau nửa đầu và tê bì các đầu ngón tay.',
    relevance_reason: 'Hướng dẫn thả lỏng cơ vùng cổ gáy để giải phóng chèn ép rễ thần kinh cánh tay.',
  },
  {
    id: 'snip-6',
    book_id: 'book-dinh-duong-phuc-hoi',
    book_title: 'Dinh Dưỡng Nền Tảng & Phục Hồi Khớp',
    cover_url: '/documents/covers/cover_dinh_duong_khang_viem.png',
    chapter: 'Chương 1: Cơ Chế Kháng Viêm Sinh Học Tế Bào',
    page_number: 2,
    page_index: 1,
    excerpt:
      'Axit béo Omega-3 tỷ lệ EPA/DHA cao kết hợp Curcumin sinh khả dụng cao và Polyphenol thực vật giúp ức chế enzyme gây viêm, dập tắt ổ viêm âm thầm tại sụn khớp an toàn.',
    relevance_reason: 'Phác thảo các hoạt chất kháng viêm tự nhiên giúp dập tắt ổ viêm quanh rễ thần kinh.',
  },
  {
    id: 'snip-7',
    book_id: 'book-dinh-duong-phuc-hoi',
    book_title: 'Dinh Dưỡng Nền Tảng & Phục Hồi Khớp',
    cover_url: '/documents/covers/cover_dinh_duong_khang_viem.png',
    chapter: 'Chương 2: Tái Lập Mật Độ Xương & Đàn Hồi Sụn Khớp',
    page_number: 3,
    page_index: 2,
    excerpt:
      'Collagen Type II thủy phân, Canxi sinh học từ tảo biển, Magie cùng Vitamin D3 và K2 giúp dẫn truyền khoáng chất trực tiếp vào khung xương và đĩa đệm mà không lắng đọng mạch máu.',
    relevance_reason: 'Chi tiết các dưỡng chất cốt lõi giúp tái tạo tế bào sụn và mật độ canxi xương.',
  },
  {
    id: 'snip-8',
    book_id: 'book-atlas-cot-song',
    book_title: 'Atlas Giải Phẫu Cột Sống & Khớp 3D',
    cover_url: '/documents/covers/cover_atlas_y_khoa_toan_dien.png',
    chapter: 'Chương 1: Cấu Trúc Khớp Đốt Sống Đa Tầng 3D',
    page_number: 2,
    page_index: 1,
    excerpt:
      'Mô phỏng giải phẫu 3D đa tầng hệ cơ dựng sống, dây chằng vàng, dây chằng dọc trước và khoang ngoài màng cứng bảo vệ tủy sống và điều hòa vận động linh hoạt.',
    relevance_reason: 'Mô phỏng 3D trực quan cấu trúc dây chằng và tủy sống nâng đỡ cột sống.',
  },
  {
    id: 'snip-9',
    book_id: 'book-suc-khoe-tieu-hoa',
    book_title: 'Sức Khỏe Hệ Tiêu Hóa Toàn Diện',
    cover_url: '/documents/covers/cover_tieu-hoa.png',
    chapter: 'Chương 1: Trục Vi Sinh Não - Ruột - Khớp',
    page_number: 2,
    page_index: 1,
    excerpt:
      '70% tế bào miễn dịch nằm tại niêm mạc đường ruột. Lợi khuẩn Probiotics sản sinh axit béo chuỗi ngắn SCFA giúp điều hòa hệ thống miễn dịch tự nhiên và giảm viêm khớp.',
    relevance_reason: 'Làm rõ mối liên hệ giữa sức khỏe đường ruột, hệ miễn dịch và bệnh lý xương khớp.',
  },
  {
    id: 'snip-10',
    book_id: 'book-nuoc-va-khoang-chat',
    book_title: 'Nước & Khoáng Chất Cho Cơ Thể',
    cover_url: '/documents/covers/cover_nuoc.png',
    chapter: 'Chương 1: Cấp Nước Tế Bào & Bơm Dịch Nhân Nhầy',
    page_number: 2,
    page_index: 1,
    excerpt:
      'Nhân nhầy đĩa đệm chứa đến 80% là nước. Uống nước ion kiềm giàu hydrogen giúp thẩm thấu sâu vào tế bào, hỗ trợ quá trình bơm hút dịch dinh dưỡng tự nhiên của đĩa đệm khi ngủ.',
    relevance_reason: 'Chỉ rõ vai trò của nước ion kiềm và chu trình bơm hút dịch nuôi nhân nhầy đĩa đệm.',
  },
  {
    id: 'snip-11',
    book_id: 'book-tu-chua-lanh-lung',
    book_title: 'Tự Chữa Lành Lưng & Cổ',
    cover_url: '/documents/covers/cover_tu_chua_lanh_lung_co.png',
    chapter: 'Chương 1: Phục Hồi Đường Cong Sinh Lý Tự Nhiên',
    page_number: 2,
    page_index: 1,
    excerpt:
      'Phương pháp giải nén cột sống tại nhà bằng các tư thế kê gối hỗ trợ điều chỉnh đường cong sinh lý tự nhiên, kết hợp nhịp thở cơ hoành giúp khối cơ dựng sống được thư giãn sâu.',
    relevance_reason: 'Phương pháp giải áp cơ học tự nhiên tại nhà kết hợp thở cơ hoành giảm đau thắt lưng.',
  },
  {
    id: 'snip-12',
    book_id: 'book-loi-khuan-duong-ruot',
    book_title: 'Lợi Khuẩn & Hệ Vi Sinh Đường Ruột',
    cover_url: '/documents/covers/cover_gan-mat-tuy.png',
    chapter: 'Chương 1: Bảo Vệ Hàng Rào Niêm Mạc Ruột',
    page_number: 2,
    page_index: 1,
    excerpt:
      'Hội chứng rò rỉ ruột do mất cân bằng hệ vi sinh đường ruột cho phép độc tố thẩm thấu vào máu, là nguồn cơn kích hoạt các phản ứng viêm mạn tính và đau mỏi cơ xương khớp.',
    relevance_reason: 'Phân tích hội chứng rò rỉ ruột và cơ chế kích hoạt các ổ viêm mạn tính toàn thân.',
  },
];

/** Thuật toán tìm kiếm & xếp hạng sách cùng trích đoạn thông minh theo triệu chứng và ý định */
function rankBooksAndSnippets(
  query: string,
  dynamicBooks?: any[]
): { books: SuggestedBookItem[]; snippets: InBookSnippetItem[] } {
  const normQ = normalizeText(query);
  const tokens = normQ.split(/\s+/).filter((w) => w.length >= 2);

  // Gộp danh mục sách tĩnh và động
  const allBooks: SuggestedBookItem[] = [...EBOOK_CATALOG];
  if (Array.isArray(dynamicBooks) && dynamicBooks.length > 0) {
    for (const db of dynamicBooks) {
      if (db && db.title && !allBooks.some((b) => b.id === db.id)) {
        allBooks.push({
          id: db.id,
          title: db.title,
          author: db.author || 'Tùng Dinh Dưỡng',
          cover_url: db.cover_url || '/documents/covers/cover_hieu_dung_ve_cot_song.png',
          badge_tag: db.badge_tag || db.tag || 'TÀI LIỆU',
          description: db.description || '',
          target_page: 2,
          target_index: 1,
          reason: `Tham khảo tài liệu chuyên môn trong cuốn "${db.title}".`,
        });
      }
    }
  }

  // 1. Chấm điểm sách
  const scoredBooks = allBooks.map((b) => {
    let score = 0;
    const titleNorm = normalizeText(b.title);
    const descNorm = normalizeText(b.description || '');

    // Boost chuyên đề theo từ khóa
    if (
      (normQ.includes('dia dem') ||
        normQ.includes('thoat vi') ||
        normQ.includes('l4') ||
        normQ.includes('l5') ||
        normQ.includes('s1') ||
        normQ.includes('that lung') ||
        normQ.includes('dau lung') ||
        normQ.includes('nhan nhay') ||
        normQ.includes('giam xoc')) &&
      b.id === 'book-hieu-dung-cot-song'
    ) {
      score += 35;
    }

    if (
      (normQ.includes('co') ||
        normQ.includes('vai gay') ||
        normQ.includes('c1') ||
        normQ.includes('c7') ||
        normQ.includes('te tay') ||
        normQ.includes('van phong') ||
        normQ.includes('co rua')) &&
      b.id === 'book-cam-nang-co'
    ) {
      score += 35;
    }

    if (
      (normQ.includes('dinh duong') ||
        normQ.includes('khang viem') ||
        normQ.includes('sun khop') ||
        normQ.includes('omega') ||
        normQ.includes('collagen') ||
        normQ.includes('canxi') ||
        normQ.includes('an gi')) &&
      b.id === 'book-dinh-duong-phuc-hoi'
    ) {
      score += 35;
    }

    if (
      (normQ.includes('nuoc') ||
        normQ.includes('uong nuoc') ||
        normQ.includes('khoang chat') ||
        normQ.includes('bom dich') ||
        normQ.includes('hydrogen')) &&
      b.id === 'book-nuoc-va-khoang-chat'
    ) {
      score += 35;
    }

    if (
      (normQ.includes('atlas') ||
        normQ.includes('3d') ||
        normQ.includes('giai phau') ||
        normQ.includes('day chang') ||
        normQ.includes('re than kinh')) &&
      b.id === 'book-atlas-cot-song'
    ) {
      score += 35;
    }

    if (
      (normQ.includes('tu chua lanh') ||
        normQ.includes('giai ap') ||
        normQ.includes('tai nha') ||
        normQ.includes('duong cong sinh ly')) &&
      b.id === 'book-tu-chua-lanh-lung'
    ) {
      score += 35;
    }

    if (
      (normQ.includes('tieu hoa') ||
        normQ.includes('da day') ||
        normQ.includes('ruot') ||
        normQ.includes('trao nguoc') ||
        normQ.includes('day bung')) &&
      b.id === 'book-suc-khoe-tieu-hoa'
    ) {
      score += 35;
    }

    if (
      (normQ.includes('loi khuan') ||
        normQ.includes('vi sinh') ||
        normQ.includes('probiotics') ||
        normQ.includes('ro ri ruot')) &&
      b.id === 'book-loi-khuan-duong-ruot'
    ) {
      score += 35;
    }

    tokens.forEach((t) => {
      if (titleNorm.includes(t)) score += 5;
      if (descNorm.includes(t)) score += 2;
    });

    return { b, score };
  });

  scoredBooks.sort((a, b) => b.score - a.score);
  const matchedBooks = scoredBooks.filter((s) => s.score > 0).slice(0, 2).map((s) => s.b);
  const finalBooks = matchedBooks.length > 0 ? matchedBooks : [EBOOK_CATALOG[0], EBOOK_CATALOG[2]];

  // 2. Chấm điểm trích đoạn sâu trong trang sách
  const scoredSnippets = IN_BOOK_SNIPPETS.map((snip) => {
    let score = 0;
    const snipNorm = normalizeText(snip.excerpt);
    const chapterNorm = normalizeText(snip.chapter);
    const titleNorm = normalizeText(snip.book_title);

    // Intent specific boosts
    if ((normQ.includes('dia dem') || normQ.includes('thoat vi') || normQ.includes('l4') || normQ.includes('l5')) && snip.id === 'snip-2') {
      score += 40;
    }
    if ((normQ.includes('giam xoc') || normQ.includes('nhan nhay')) && snip.id === 'snip-1') {
      score += 35;
    }
    if ((normQ.includes('co') || normQ.includes('vai gay') || normQ.includes('van phong')) && snip.id === 'snip-4') {
      score += 40;
    }
    if ((normQ.includes('te tay') || normQ.includes('giai nen co')) && snip.id === 'snip-5') {
      score += 35;
    }
    if ((normQ.includes('khang viem') || normQ.includes('omega') || normQ.includes('curcumin')) && snip.id === 'snip-6') {
      score += 40;
    }
    if ((normQ.includes('collagen') || normQ.includes('canxi') || normQ.includes('mat do xuong')) && snip.id === 'snip-7') {
      score += 35;
    }
    if ((normQ.includes('nuoc') || normQ.includes('uong nuoc') || normQ.includes('bom dich')) && snip.id === 'snip-10') {
      score += 40;
    }
    if ((normQ.includes('tieu hoa') || normQ.includes('loi khuan') || normQ.includes('ruot')) && snip.id === 'snip-9') {
      score += 40;
    }
    if ((normQ.includes('ro ri ruot') || normQ.includes('vi sinh')) && snip.id === 'snip-12') {
      score += 35;
    }
    if ((normQ.includes('tu chua lanh') || normQ.includes('giai ap')) && snip.id === 'snip-11') {
      score += 40;
    }
    if ((normQ.includes('atlas') || normQ.includes('3d') || normQ.includes('giai phau')) && snip.id === 'snip-8') {
      score += 40;
    }
    if ((normQ.includes('re than kinh') || normQ.includes('c5') || normQ.includes('c7') || normQ.includes('te chan')) && snip.id === 'snip-3') {
      score += 35;
    }

    tokens.forEach((t) => {
      if (snipNorm.includes(t)) score += 4;
      if (chapterNorm.includes(t)) score += 6;
      if (titleNorm.includes(t)) score += 3;
    });

    return { snip, score };
  });

  scoredSnippets.sort((a, b) => b.score - a.score);
  const matchedSnippets = scoredSnippets.filter((s) => s.score > 0).slice(0, 2).map((s) => s.snip);
  const finalSnippets = matchedSnippets.length > 0 ? matchedSnippets : [IN_BOOK_SNIPPETS[0], IN_BOOK_SNIPPETS[1]];

  return {
    books: finalBooks,
    snippets: finalSnippets,
  };
}

// BỘ CÂU HỎI & TRẢ LỜI CHUẨN XÁC, NGẮN GỌN, ĐÚNG TRỌNG TÂM (PHẢN HỒI TỨC THÌ < 5ms)
const CURATED_QA = [
  {
    keywords: [
      'thoat vi dia dem l4 can lam gi',
      'thoat vi dia dem l4',
      'thoat vi dia dem l5',
      'thoat vi dia dem that lung',
      'thoat vi dia dem',
      'thoat vi',
      'bi thoat vi dia dem',
      'thoat vi dia dem can lam gi',
      'thoat vi dia dem phai lam sao',
      'sach thoat vi dia dem',
      'tim sach thoat vi',
      'sach cot song',
    ],
    answer: 'Sau khi đã hiểu rõ nhu cầu của bạn, đây là những gợi ý đầu sách phù hợp nhất về cột sống & thoát vị đĩa đệm của tôi:',
    suggested_books: [
      {
        id: 'book-hieu-dung-cot-song',
        title: 'Hiểu Đúng Về Cột Sống',
        author: 'Tùng Dinh Dưỡng',
        cover_url: '/documents/covers/cover_hieu_dung_ve_cot_song.png',
        badge_tag: 'BÁN CHẠY',
        target_page: 3,
        target_index: 2,
        reason: 'Chương 2 giải mã chính xác cơ chế nhân nhầy đĩa đệm tràn ra chèn ép rễ thần kinh L4-L5 và giải pháp giảm áp.',
      },
      {
        id: 'book-dinh-duong-phuc-hoi',
        title: 'Dinh Dưỡng Nền Tảng & Phục Hồi Khớp',
        author: 'Tùng Dinh Dưỡng',
        cover_url: '/documents/covers/cover_dinh_duong_khang_viem.png',
        badge_tag: 'Y HỌC',
        target_page: 2,
        target_index: 1,
        reason: 'Kháng viêm sinh học dập tắt ổ viêm mạn tính âm thầm bao quanh rễ thần kinh bị chèn ép.',
      },
    ],
    in_book_snippets: [
      {
        id: 'snip-2',
        book_id: 'book-hieu-dung-cot-song',
        book_title: 'Hiểu Đúng Về Cột Sống',
        cover_url: '/documents/covers/cover_hieu_dung_ve_cot_song.png',
        chapter: 'Chương 2: Thoát Vị & Chèn Ép Rễ Thần Kinh',
        page_number: 3,
        page_index: 2,
        excerpt:
          'Khi đĩa đệm bị thoát vị hoặc thoái hóa xẹp lún, nhân nhầy tràn ra chèn ép vào rễ thần kinh tọa L4-L5, S1 gây ra các cơn đau nhói buốt lan dọc xuống đùi và bắp chân.',
        relevance_reason: 'Trích đoạn trực tiếp giải mã cơ chế thoát vị đĩa đệm L4-L5 và chèn ép rễ thần kinh.',
      },
      {
        id: 'snip-1',
        book_id: 'book-hieu-dung-cot-song',
        book_title: 'Hiểu Đúng Về Cột Sống',
        cover_url: '/documents/covers/cover_hieu_dung_ve_cot_song.png',
        chapter: 'Chương 1: Cơ Chế Sinh Học & Giảm Xóc Đĩa Đệm',
        page_number: 2,
        page_index: 1,
        excerpt:
          'Cột sống gồm 33-34 đốt sống tạo thành 4 đường cong sinh lý. Đĩa đệm đóng vai trò như bộ phận giảm xóc sinh học với nhân nhầy ngậm nước và các vòng sợi collagen bao quanh.',
        relevance_reason: 'Cung cấp cơ chế giảm xóc sinh học và cấu tạo nhân nhầy đĩa đệm.',
      },
    ],
    suggested_pages: [
      {
        title: 'Đĩa đệm và cơ chế giảm xóc',
        topic_title: 'Cột Sống & Đĩa Đệm',
        topic_slug: 'cot-song',
        page_slug: 'dia-dem',
        reason: 'Hiểu rõ cấu trúc nhân nhầy và cơ chế thẩm thấu nuôi dưỡng đĩa đệm.',
      },
      {
        title: 'Tư thế chuẩn & Vận động giải áp',
        topic_title: 'Cột Sống & Đĩa Đệm',
        topic_slug: 'cot-song',
        page_slug: 'tu-the-va-van-dong',
        reason: 'Hướng dẫn các nguyên tắc công thái học và bảo vệ cột sống an toàn.',
      },
    ],
    follow_up_questions: [
      'Tư thế sinh hoạt đúng cần chú ý gì?',
      'Chế độ dinh dưỡng nào giúp hỗ trợ sụn khớp?',
    ],
  },
  {
    keywords: [
      'dot song co',
      'dau moi co',
      'co vai gay',
      'dau vai gay',
      'te tay',
      'te bi canh tay',
      'sach dot song co',
      'cam nang co',
      'hoi chung co rua',
    ],
    answer: 'Sau khi đã hiểu rõ nhu cầu của bạn, đây là những gợi ý đầu sách phù hợp nhất về đốt sống cổ & vai gáy của tôi:',
    suggested_books: [
      {
        id: 'book-cam-nang-co',
        title: 'Cẩm Nang Đốt Sống Cổ & Vai Gáy',
        author: 'Tùng Dinh Dưỡng',
        cover_url: '/documents/covers/cover_cam_nang_dot_song_co.png',
        badge_tag: 'HƯỚNG DẪN',
        target_page: 2,
        target_index: 1,
        reason: 'Cẩm nang toàn diện bảo tồn đốt sống cổ C1-C7, giải phóng chèn ép rễ thần kinh cho dân văn phòng.',
      },
      {
        id: 'book-atlas-cot-song',
        title: 'Atlas Giải Phẫu Cột Sống & Khớp 3D',
        author: 'Tùng Dinh Dưỡng',
        cover_url: '/documents/covers/cover_atlas_y_khoa_toan_dien.png',
        badge_tag: 'ATLAS 3D',
        target_page: 4,
        target_index: 3,
        reason: 'Bảng định vị phân bổ rễ thần kinh C5-C7 chi phối cảm giác cánh tay và bàn tay.',
      },
    ],
    in_book_snippets: [
      {
        id: 'snip-4',
        book_id: 'book-cam-nang-co',
        book_title: 'Cẩm Nang Đốt Sống Cổ & Vai Gáy',
        cover_url: '/documents/covers/cover_cam_nang_dot_song_co.png',
        chapter: 'Chương 1: Hội Chứng Cổ Vai Gáy Dân Văn Phòng',
        page_number: 2,
        page_index: 1,
        excerpt:
          'Tải trọng đè nén lên các đốt sống cổ C1-C7 tăng gấp 3 đến 5 lần khi gập đầu cúi bấm điện thoại hoặc làm việc với máy tính trong thời gian dài mà không nghỉ giải lao.',
        relevance_reason: 'Cảnh báo áp lực tải trọng đè nén lên đốt sống cổ C1-C7.',
      },
      {
        id: 'snip-5',
        book_id: 'book-cam-nang-co',
        book_title: 'Cẩm Nang Đốt Sống Cổ & Vai Gáy',
        cover_url: '/documents/covers/cover_cam_nang_dot_song_co.png',
        chapter: 'Chương 2: Bài Tập Vận Động Giải Nén Cột Sống Cổ',
        page_number: 3,
        page_index: 2,
        excerpt:
          'Các động tác kéo giãn cơ ức đòn chũm, nhóm cơ thang và vươn cằm giải nén rễ thần kinh giúp giảm nhanh cơn co thắt, đau nửa đầu và tê bì các đầu ngón tay.',
        relevance_reason: 'Giải pháp thả lỏng cơ giải phóng chèn ép rễ thần kinh cánh tay.',
      },
    ],
    suggested_pages: [
      {
        title: 'Tư thế chuẩn & Vận động giải áp',
        topic_title: 'Cột Sống & Đĩa Đệm',
        topic_slug: 'cot-song',
        page_slug: 'tu-the-va-van-dong',
        reason: 'Hướng dẫn tư thế công thái học bảo vệ cổ vai gáy.',
      },
    ],
    follow_up_questions: [
      'Nguyên tắc bảo vệ đốt sống cổ khi ngồi máy tính?',
      'Dinh dưỡng kháng viêm hỗ trợ sụn khớp như thế nào?',
    ],
  },
  {
    keywords: [
      'dinh duong phu hop voi nguoi viet nam',
      'dinh duong nguoi viet',
      'che do an nguoi viet',
      'che do an phu hop voi nguoi viet',
      'sach noi ve dinh duong va cac che do an',
      'toi thich mot cuon sach ve dinh duong',
      'toi thich mot cuon sach',
      'sach dinh duong thuc don',
      'dinh duong va cac che do an',
      'che do an phu hop',
      'sach ve dinh duong',
      'dinh duong nguoi viet nam',
      'sach dinh duong cho nguoi viet',
      'tim sach dinh duong',
    ],
    answer: 'Sau khi đã hiểu rõ nhu cầu của bạn, đây là những gợi ý đầu sách phù hợp nhất về dinh dưỡng & chế độ ăn uống cho người Việt của tôi:',
    suggested_books: [
      {
        id: 'book-dinh-duong-phuc-hoi',
        title: 'Dinh Dưỡng Nền Tảng & Phục Hồi Khớp',
        author: 'Tùng Dinh Dưỡng',
        cover_url: '/documents/covers/cover_dinh_duong_khang_viem.png',
        badge_tag: 'ĐỀ XUẤT SỐ 1',
        target_page: 2,
        target_index: 1,
        reason: 'Sách chuyên sâu hướng dẫn cơ chế kháng viêm sinh học và thực đơn ăn uống điều chỉnh riêng cho thể trạng người Việt.',
      },
      {
        id: 'online-audio-2',
        title: 'Sách Nói: Dinh Dưỡng Kháng Viêm Tự Nhiên',
        author: 'Tùng Dinh Dưỡng',
        cover_url: '/documents/covers/cover_dinh_duong_khang_viem.png',
        badge_tag: 'SÁCH NÓI 🎧',
        target_page: 1,
        target_index: 0,
        reason: 'Audiobook 35 phút phân tích chi tiết nguyên lý lựa chọn thực phẩm lành mạnh và chế độ ăn chống thoái hóa khớp.',
      },
    ],
    in_book_snippets: [
      {
        id: 'snip-6',
        book_id: 'book-dinh-duong-phuc-hoi',
        book_title: 'Dinh Dưỡng Nền Tảng & Phục Hồi Khớp',
        cover_url: '/documents/covers/cover_dinh_duong_khang_viem.png',
        chapter: 'Chương 1: Cơ Chế Kháng Viêm Sinh Học Tế Bào',
        page_number: 2,
        page_index: 1,
        excerpt:
          'Axit béo Omega-3 tỷ lệ EPA/DHA cao kết hợp Curcumin sinh khả dụng cao và Polyphenol thực vật giúp ức chế enzyme gây viêm, dập tắt ổ viêm âm thầm tại sụn khớp an toàn.',
        relevance_reason: 'Nguyên lý xây dựng bữa ăn kháng viêm từ nguyên liệu quen thuộc hàng ngày.',
      },
    ],
    suggested_pages: [
      {
        title: 'Dinh dưỡng kháng viêm',
        topic_title: 'Dinh Dưỡng',
        topic_slug: 'dinh-duong',
        page_slug: 'dinh-duong-khang-viem',
        reason: 'Thực đơn mẫu 7 ngày phù hợp với văn hóa ẩm thực Việt Nam.',
      },
    ],
    follow_up_questions: [
      'Thực đơn 7 ngày kháng viêm cho người Việt?',
      'Cách uống nước và cấp ẩm đĩa đệm chuẩn y khoa?',
    ],
  },
  {
    keywords: [
      'dinh duong cho khop',
      'dinh duong cot song',
      'an gi tot cho xuong khop',
      'dinh duong khang viem',
      'an gi do dau lung',
      'sach dinh duong khop',
      'tai tao sun khop',
    ],
    answer: 'Sau khi đã hiểu rõ nhu cầu của bạn, đây là những gợi ý đầu sách phù hợp nhất về dinh dưỡng kháng viêm & phục hồi sụn khớp của tôi:',
    suggested_books: [
      {
        id: 'book-dinh-duong-phuc-hoi',
        title: 'Dinh Dưỡng Nền Tảng & Phục Hồi Khớp',
        author: 'Tùng Dinh Dưỡng',
        cover_url: '/documents/covers/cover_dinh_duong_khang_viem.png',
        badge_tag: 'Y HỌC',
        target_page: 2,
        target_index: 1,
        reason: 'Chương 1 & 2 hướng dẫn chi tiết cơ chế kháng viêm sinh học và tái lập mật độ sụn khớp bằng dinh dưỡng.',
      },
      {
        id: 'book-loi-khuan-duong-ruot',
        title: 'Lợi Khuẩn & Hệ Vi Sinh Đường Ruột',
        author: 'Tùng Dinh Dưỡng',
        cover_url: '/documents/covers/cover_gan-mat-tuy.png',
        badge_tag: 'VI SINH',
        target_page: 2,
        target_index: 1,
        reason: 'Bảo vệ niêm mạc ruột nhằm ngăn chặn phản ứng viêm toàn thân ảnh hưởng đến sụn khớp.',
      },
    ],
    in_book_snippets: [
      {
        id: 'snip-6',
        book_id: 'book-dinh-duong-phuc-hoi',
        book_title: 'Dinh Dưỡng Nền Tảng & Phục Hồi Khớp',
        cover_url: '/documents/covers/cover_dinh_duong_khang_viem.png',
        chapter: 'Chương 1: Cơ Chế Kháng Viêm Sinh Học Tế Bào',
        page_number: 2,
        page_index: 1,
        excerpt:
          'Axit béo Omega-3 tỷ lệ EPA/DHA cao kết hợp Curcumin sinh khả dụng cao và Polyphenol thực vật giúp ức chế enzyme gây viêm, dập tắt ổ viêm âm thầm tại sụn khớp an toàn.',
        relevance_reason: 'Công thức kháng viêm tự nhiên từ thực phẩm cho mô sụn.',
      },
      {
        id: 'snip-7',
        book_id: 'book-dinh-duong-phuc-hoi',
        book_title: 'Dinh Dưỡng Nền Tảng & Phục Hồi Khớp',
        cover_url: '/documents/covers/cover_dinh_duong_khang_viem.png',
        chapter: 'Chương 2: Tái Lập Mật Độ Xương & Đàn Hồi Sụn Khớp',
        page_number: 3,
        page_index: 2,
        excerpt:
          'Collagen Type II thủy phân, Canxi sinh học từ tảo biển, Magie cùng Vitamin D3 và K2 giúp dẫn truyền khoáng chất trực tiếp vào khung xương và đĩa đệm mà không lắng đọng mạch máu.',
        relevance_reason: 'Dưỡng chất cấu tạo khung sụn khớp và xương chắc khỏe.',
      },
    ],
    suggested_pages: [
      {
        title: 'Dinh dưỡng kháng viêm',
        topic_title: 'Dinh Dưỡng',
        topic_slug: 'dinh-duong',
        page_slug: 'dinh-duong-khang-viem',
        reason: 'Thực đơn và nhóm chất giúp kiểm soát phản ứng viêm khớp.',
      },
    ],
    follow_up_questions: [
      'Uống nước đúng cách như thế nào?',
      'Tư thế sinh hoạt đúng cần chú ý gì?',
    ],
  },
  {
    keywords: [
      'tai lieu nhan nhay dia dem',
      'co che bom hut dich',
      'bom dich nhan nhay',
      'tai lieu dia dem',
      'tim tai lieu trong sach',
      'nuoi duong dia dem',
    ],
    answer: 'Sau khi đã hiểu rõ nhu cầu của bạn, đây là những gợi ý đầu sách phù hợp nhất về cơ chế bơm hút dịch nhân nhầy đĩa đệm của tôi:',
    suggested_books: [
      {
        id: 'book-nuoc-va-khoang-chat',
        title: 'Nước & Khoáng Chất Cho Cơ Thể',
        author: 'Tùng Dinh Dưỡng',
        cover_url: '/documents/covers/cover_nuoc.png',
        badge_tag: 'CẤP NƯỚC',
        target_page: 2,
        target_index: 1,
        reason: 'Trang 2 giải thích tường tận cơ chế cấp nước tế bào và chu trình bơm hút dịch nhân nhầy đĩa đệm.',
      },
      {
        id: 'book-hieu-dung-cot-song',
        title: 'Hiểu Đúng Về Cột Sống',
        author: 'Tùng Dinh Dưỡng',
        cover_url: '/documents/covers/cover_hieu_dung_ve_cot_song.png',
        badge_tag: 'BÁN CHẠY',
        target_page: 2,
        target_index: 1,
        reason: 'Cơ chế sinh học và cấu tạo vòng sợi collagen bao quanh nhân nhầy.',
      },
    ],
    in_book_snippets: [
      {
        id: 'snip-10',
        book_id: 'book-nuoc-va-khoang-chat',
        book_title: 'Nước & Khoáng Chất Cho Cơ Thể',
        cover_url: '/documents/covers/cover_nuoc.png',
        chapter: 'Chương 1: Cấp Nước Tế Bào & Bơm Dịch Nhân Nhầy',
        page_number: 2,
        page_index: 1,
        excerpt:
          'Nhân nhầy đĩa đệm chứa đến 80% là nước. Uống nước ion kiềm giàu hydrogen giúp thẩm thấu sâu vào tế bào, hỗ trợ quá trình bơm hút dịch dinh dưỡng tự nhiên của đĩa đệm khi ngủ.',
        relevance_reason: 'Trích đoạn chính xác về cơ chế thẩm thấu và bơm hút dịch nhân nhầy đĩa đệm.',
      },
      {
        id: 'snip-1',
        book_id: 'book-hieu-dung-cot-song',
        book_title: 'Hiểu Đúng Về Cột Sống',
        cover_url: '/documents/covers/cover_hieu_dung_ve_cot_song.png',
        chapter: 'Chương 1: Cơ Chế Sinh Học & Giảm Xóc Đĩa Đệm',
        page_number: 2,
        page_index: 1,
        excerpt:
          'Cột sống gồm 33-34 đốt sống tạo thành 4 đường cong sinh lý. Đĩa đệm đóng vai trò như bộ phận giảm xóc sinh học với nhân nhầy ngậm nước và các vòng sợi collagen bao quanh.',
        relevance_reason: 'Cấu tạo sinh học của đĩa đệm giảm xóc.',
      },
    ],
    suggested_pages: [
      {
        title: 'Đĩa đệm và cơ chế giảm xóc',
        topic_title: 'Cột Sống & Đĩa Đệm',
        topic_slug: 'cot-song',
        page_slug: 'dia-dem',
        reason: 'Hiểu cơ chế thẩm thấu dinh dưỡng nuôi đĩa đệm.',
      },
    ],
    follow_up_questions: [
      'Uống nước đúng cách như thế nào?',
      'Tư thế sinh hoạt đúng cần chú ý gì?',
    ],
  },
  {
    keywords: [
      'tu the sinh hoat dung can chu y gi',
      'tu the sinh hoat dung',
      'tu the dung can chu y gi',
      'tu the dung',
      'tu the ngoi',
      'tu the ngu',
      'tu the cuoi',
      'tu the be do',
      'tu the vac do',
      'tu the sinh hoat',
      'chu y tu the',
    ],
    answer: 'Sau khi đã hiểu rõ nhu cầu của bạn, đây là những gợi ý đầu sách phù hợp nhất về tư thế chuẩn & bài tập phục hồi tại nhà của tôi:',
    suggested_books: [
      {
        id: 'book-hieu-dung-cot-song',
        title: 'Hiểu Đúng Về Cột Sống',
        author: 'Tùng Dinh Dưỡng',
        cover_url: '/documents/covers/cover_hieu_dung_ve_cot_song.png',
        badge_tag: 'BÁN CHẠY',
        target_page: 2,
        target_index: 1,
        reason: 'Hướng dẫn các nguyên tắc công thái học bảo vệ đĩa đệm.',
      },
      {
        id: 'book-tu-chua-lanh-lung',
        title: 'Tự Chữa Lành Lưng & Cổ',
        author: 'Tùng Dinh Dưỡng',
        cover_url: '/documents/covers/cover_tu_chua_lanh_lung_co.png',
        badge_tag: 'PHỤC HỒI',
        target_page: 2,
        target_index: 1,
        reason: 'Phương pháp tự điều chỉnh và phục hồi đường cong sinh lý.',
      },
    ],
    in_book_snippets: [
      {
        id: 'snip-1',
        book_id: 'book-hieu-dung-cot-song',
        book_title: 'Hiểu Đúng Về Cột Sống',
        cover_url: '/documents/covers/cover_hieu_dung_ve_cot_song.png',
        chapter: 'Chương 1: Cơ Chế Sinh Học & Giảm Xóc Đĩa Đệm',
        page_number: 2,
        page_index: 1,
        excerpt:
          'Cột sống gồm 33-34 đốt sống tạo thành 4 đường cong sinh lý. Đĩa đệm đóng vai trò như bộ phận giảm xóc sinh học với nhân nhầy ngậm nước và các vòng sợi collagen bao quanh.',
        relevance_reason: 'Nguyên lý bảo vệ 4 đường cong sinh lý.',
      },
      {
        id: 'snip-11',
        book_id: 'book-tu-chua-lanh-lung',
        book_title: 'Tự Chữa Lành Lưng & Cổ',
        cover_url: '/documents/covers/cover_tu_chua_lanh_lung_co.png',
        chapter: 'Chương 1: Phục Hồi Đường Cong Sinh Lý Tự Nhiên',
        page_number: 2,
        page_index: 1,
        excerpt:
          'Phương pháp giải nén cột sống tại nhà bằng các tư thế kê gối hỗ trợ điều chỉnh đường cong sinh lý tự nhiên, kết hợp nhịp thở cơ hoành giúp khối cơ dựng sống được thư giãn sâu.',
        relevance_reason: 'Phương pháp phục hồi độ cong tự nhiên của cột sống.',
      },
    ],
    suggested_pages: [
      {
        title: 'Tư thế chuẩn & Vận động giải áp',
        topic_title: 'Cột Sống & Đĩa Đệm',
        topic_slug: 'cot-song',
        page_slug: 'tu-the-va-van-dong',
        reason: 'Hướng dẫn chi tiết nguyên tắc tư thế công thái học bảo vệ cột sống.',
      },
    ],
    follow_up_questions: [
      'Dinh dưỡng kháng viêm hỗ trợ sụn khớp như thế nào?',
      'Cách uống nước đúng để nuôi dưỡng đĩa đệm?',
    ],
  },
  {
    keywords: [
      'uong nuoc dung cach',
      'cach uong nuoc',
      'nguyen tac uong nuoc',
      'uong nuoc the nao',
      'uong bao nhieu nuoc',
      'sach nuoc',
    ],
    answer: 'Sau khi đã hiểu rõ nhu cầu của bạn, đây là những gợi ý đầu sách phù hợp nhất về nước & khoáng chất cho cơ thể của tôi:',
    suggested_books: [
      {
        id: 'book-nuoc-va-khoang-chat',
        title: 'Nước & Khoáng Chất Cho Cơ Thể',
        author: 'Tùng Dinh Dưỡng',
        cover_url: '/documents/covers/cover_nuoc.png',
        badge_tag: 'CẤP NƯỚC',
        target_page: 2,
        target_index: 1,
        reason: 'Cẩm nang toàn diện về cấp nước tế bào và phục hồi đĩa đệm.',
      },
      {
        id: 'book-hieu-dung-cot-song',
        title: 'Hiểu Đúng Về Cột Sống',
        author: 'Tùng Dinh Dưỡng',
        cover_url: '/documents/covers/cover_hieu_dung_ve_cot_song.png',
        badge_tag: 'BÁN CHẠY',
        target_page: 2,
        target_index: 1,
        reason: 'Cơ chế thẩm thấu dưỡng chất nuôi nhân nhầy đĩa đệm.',
      },
    ],
    in_book_snippets: [
      {
        id: 'snip-10',
        book_id: 'book-nuoc-va-khoang-chat',
        book_title: 'Nước & Khoáng Chất Cho Cơ Thể',
        cover_url: '/documents/covers/cover_nuoc.png',
        chapter: 'Chương 1: Cấp Nước Tế Bào & Bơm Dịch Nhân Nhầy',
        page_number: 2,
        page_index: 1,
        excerpt:
          'Nhân nhầy đĩa đệm chứa đến 80% là nước. Uống nước ion kiềm giàu hydrogen giúp thẩm thấu sâu vào tế bào, hỗ trợ quá trình bơm hút dịch dinh dưỡng tự nhiên của đĩa đệm khi ngủ.',
        relevance_reason: 'Cơ chế bơm hút nước nuôi nhân nhầy đĩa đệm.',
      },
    ],
    suggested_pages: [
      {
        title: 'Nguyên tắc uống nước',
        topic_title: 'Nước',
        topic_slug: 'nuoc',
        page_slug: 'nguyen-tac-uong-nuoc',
        reason: 'Quy tắc 4 đúng khi uống nước cho tế bào.',
      },
    ],
    follow_up_questions: [
      'Dấu hiệu nhận biết cơ thể đang thiếu nước?',
      'Nước kiềm và khoáng chất có lợi gì cho xương khớp?',
    ],
  },
  {
    keywords: [
      'atlas giai phau',
      'giai phau 3d',
      'sach atlas',
      'sach 3d',
      'cau tao cot song',
      'tong quan ve cot song',
    ],
    answer: 'Sau khi đã hiểu rõ nhu cầu của bạn, đây là những gợi ý đầu sách phù hợp nhất về atlas giải phẫu 3D của tôi:',
    suggested_books: [
      {
        id: 'book-atlas-cot-song',
        title: 'Atlas Giải Phẫu Cột Sống & Khớp 3D',
        author: 'Tùng Dinh Dưỡng',
        cover_url: '/documents/covers/cover_atlas_y_khoa_toan_dien.png',
        badge_tag: 'ATLAS 3D',
        target_page: 2,
        target_index: 1,
        reason: 'Atlas 3D mô phỏng trực quan 33 đốt sống và 23 đĩa đệm.',
      },
      {
        id: 'book-hieu-dung-cot-song',
        title: 'Hiểu Đúng Về Cột Sống',
        author: 'Tùng Dinh Dưỡng',
        cover_url: '/documents/covers/cover_hieu_dung_ve_cot_song.png',
        badge_tag: 'BÁN CHẠY',
        target_page: 4,
        target_index: 3,
        reason: 'Bảng tra cứu rễ thần kinh tủy sống và các phân đoạn chi phối.',
      },
    ],
    in_book_snippets: [
      {
        id: 'snip-8',
        book_id: 'book-atlas-cot-song',
        book_title: 'Atlas Giải Phẫu Cột Sống & Khớp 3D',
        cover_url: '/documents/covers/cover_atlas_y_khoa_toan_dien.png',
        chapter: 'Chương 1: Cấu Trúc Khớp Đốt Sống Đa Tầng 3D',
        page_number: 2,
        page_index: 1,
        excerpt:
          'Mô phỏng giải phẫu 3D đa tầng hệ cơ dựng sống, dây chằng vàng, dây chằng dọc trước và khoang ngoài màng cứng bảo vệ tủy sống và điều hòa vận động linh hoạt.',
        relevance_reason: 'Mô phỏng giải phẫu 3D hệ cơ và dây chằng cột sống.',
      },
      {
        id: 'snip-3',
        book_id: 'book-hieu-dung-cot-song',
        book_title: 'Hiểu Đúng Về Cột Sống',
        cover_url: '/documents/covers/cover_hieu_dung_ve_cot_song.png',
        chapter: 'Phụ Lục: Bảng Tra Cứu Rễ Thần Kinh Cột Sống',
        page_number: 4,
        page_index: 3,
        excerpt:
          'Bảng định vị phân bổ rễ thần kinh tủy sống: Nhánh C5-C7 chi phối cánh tay bàn tay; Nhánh L3-L5 chi phối khớp gối, cơ đùi, cẳng chân và mu bàn chân.',
        relevance_reason: 'Bảng định vị phân bổ các nhánh rễ thần kinh.',
      },
    ],
    suggested_pages: [
      {
        title: 'Tổng quan về cột sống',
        topic_title: 'Cột Sống & Đĩa Đệm',
        topic_slug: 'cot-song',
        page_slug: 'tong-quan-ve-cot-song',
        reason: 'Cấu trúc giải phẫu và 4 đường cong sinh lý.',
      },
    ],
    follow_up_questions: [
      'Tư thế sinh hoạt đúng cần chú ý gì?',
      'Cách phân biệt đau mỏi thông thường?',
    ],
  },
];

function findCuratedMatch(query: string) {
  const norm = normalizeText(query);
  for (const item of CURATED_QA) {
    for (const kw of item.keywords) {
      const normKw = normalizeText(kw);
      if (norm === normKw || norm.includes(normKw)) {
        return item;
      }
    }
  }
  return null;
}

// Xếp hạng bài học thông minh theo từ khóa chuyên môn (tránh gợi ý sai chủ đề)
function rankCatalogPages(query: string, catalog: LessonCatalogItem[]): LessonCatalogItem[] {
  const normQ = normalizeText(query);
  const tokens = normQ.split(/\s+/).filter((w) => w.length >= 2);

  const scored = catalog.map((c) => {
    let score = 0;
    const text = normalizeText(`${c.page_title} ${c.topic_title} ${c.summary}`);

    // Phân loại chủ đề theo từ khóa câu hỏi
    if (
      (normQ.includes('dia dem') ||
        normQ.includes('thoat vi') ||
        normQ.includes('cot song') ||
        normQ.includes('lung') ||
        normQ.includes('l4') ||
        normQ.includes('l5') ||
        normQ.includes('co') ||
        normQ.includes('gay')) &&
      c.topic_slug === 'cot-song'
    ) {
      score += 15;
    }

    if ((normQ.includes('nuoc') || normQ.includes('uong')) && c.topic_slug === 'nuoc') {
      score += 15;
    }

    if ((normQ.includes('dinh duong') || normQ.includes('an') || normQ.includes('khang viem')) && c.topic_slug === 'dinh-duong') {
      score += 15;
    }

    if ((normQ.includes('da day') || normQ.includes('ruot') || normQ.includes('tieu hoa')) && c.topic_slug === 'tieu-hoa') {
      score += 15;
    }

    tokens.forEach((t) => {
      if (text.includes(t)) score += 2;
    });

    return { c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 2).map((s) => s.c);
}

// Xây dựng danh mục bài học siêu tốc (chỉ 2 query song song hoặc fallback 0ms tới sample data)
async function getOrBuildLessonCatalog(): Promise<LessonCatalogItem[]> {
  if (cachedCatalog && cachedCatalog.length > 0 && cachedCatalogExpiry > Date.now()) {
    return cachedCatalog;
  }

  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const targetWorkspace = process.env.APP_WORKSPACE_ID || 'book_platform';
      let [{ data: topics }, { data: pages }] = await Promise.all([
        supabase.from('topics').select('id, title, slug').eq('workspace_id', targetWorkspace).order('sort_order'),
        supabase.from('pages').select('id, title, slug, summary, topic_id').eq('workspace_id', targetWorkspace).order('sort_order'),
      ]);

      if ((!topics || topics.length === 0) && targetWorkspace !== 'default') {
        const fbRes = await Promise.all([
          supabase.from('topics').select('id, title, slug').eq('workspace_id', 'default').order('sort_order'),
          supabase.from('pages').select('id, title, slug, summary, topic_id').eq('workspace_id', 'default').order('sort_order'),
        ]);
        topics = fbRes[0].data;
        pages = fbRes[1].data;
      }

      if (topics && pages && pages.length > 0) {
        const topicMap = new Map(topics.map((t) => [t.id, t]));
        const catalog: LessonCatalogItem[] = pages.map((p) => {
          const t = topicMap.get(p.topic_id);
          return {
            topic_title: t?.title || 'Cột Sống & Đĩa Đệm',
            topic_slug: t?.slug || 'cot-song',
            page_title: p.title,
            page_slug: p.slug,
            summary: p.summary || '',
            content: p.summary || '',
          };
        });

        cachedCatalog = catalog;
        cachedCatalogExpiry = Date.now() + 60 * 60 * 1000; // Cache 1 giờ
        return catalog;
      }
    }
  } catch (err) {
    console.warn('[AI Catalog] Fallback to bundled sample data:', err);
  }

  const topicMap = new Map(sampleTopics.map((t) => [t.id, t]));
  const catalog: LessonCatalogItem[] = samplePages.map((p) => {
    const t = topicMap.get(p.topic_id);
    return {
      topic_title: t?.title || 'Cột Sống & Đĩa Đệm',
      topic_slug: t?.slug || 'cot-song',
      page_title: p.title,
      page_slug: p.slug,
      summary: p.summary || '',
      content: p.summary || '',
    };
  });

  cachedCatalog = catalog;
  cachedCatalogExpiry = Date.now() + 60 * 60 * 1000;
  return catalog;
}

/**
 * Trợ lý AI Đồng hành Đọc Sách Chuyên Sâu (Whole-Book & Page Context AI Copilot)
 * Phản hồi tức thì, chính xác theo cấu trúc mục lục, trang sách và các chương
 */
function buildBookContextAnswer(query: string, bookContext: any) {
  const title = bookContext.title || 'Cuốn sách';
  const author = bookContext.author ? ` (Tác giả: ${bookContext.author})` : '';
  const page = bookContext.page || 1;
  const totalPages = bookContext.totalPages || 100;
  const scope = bookContext.scope || 'page';
  const excerpt = bookContext.excerpt || '';
  const toc: BookTocItem[] = (Array.isArray(bookContext.toc) && bookContext.toc.length > 0)
    ? bookContext.toc
    : getBookToc(title, totalPages);

  const lowerQ = query.toLowerCase();

  // ===================== CHẾ ĐỘ 1: TOÀN BỘ CUỐN SÁCH (FULL BOOK CONTEXT) =====================
  if (scope === 'book') {
    // 1. Tóm tắt toàn bộ cuốn sách / Cuốn sách này nói về gì
    if (
      lowerQ.includes('tóm tắt') ||
      lowerQ.includes('nội dung') ||
      lowerQ.includes('toàn bộ') ||
      lowerQ.includes('cuốn sách này') ||
      lowerQ.includes('tổng quan')
    ) {
      const chapterList = toc
        .map(
          (ch) =>
            `• **[Trang ${ch.pageNumber}]** · **${ch.title}**: ${ch.summary || 'Trọng tâm kiến thức và thông điệp thực tiễn của chương.'}`
        )
        .join('\n');

      return {
        answer:
          `Cuốn sách **"${title}"**${author} gồm **${toc.length} phần/chương cốt lõi**, bao quát xuyên suốt **${totalPages} trang**:\n\n` +
          `### 📚 Cấu Trúc Toàn Bộ Tác Phẩm:\n` +
          `${chapterList}\n\n` +
          `### 💎 Thông Điệp Cốt Lõi Của Tác Giả:\n` +
          `Tác phẩm khẳng định tầm quan trọng của việc chủ động lắng nghe cơ thể, ứng dụng tri thức khoa học, hiểu rõ cơ chế tự chữa lành và duy trì thói quen lành mạnh mỗi ngày.\n\n` +
          `👉 *Mẹo: Bạn có thể bấm vào các nút **[Trang X]** bên dưới để nhảy thẳng tới bất kỳ chương nào trên trình đọc 3D SideBooks!*`,
        follow_up_questions: [
          'Cấu trúc chi tiết mục lục và số trang các chương?',
          'Ý tưởng cốt lõi và bài học thực tiễn lớn nhất của tác giả?',
          'Chương nào quan trọng nhất tôi nên đọc trước?',
        ],
        provider: 'book_context_full',
      };
    }

    // 2. Mục lục & cấu trúc các chương
    if (
      lowerQ.includes('mục lục') ||
      lowerQ.includes('chương') ||
      lowerQ.includes('cấu trúc') ||
      lowerQ.includes('danh sách')
    ) {
      const chapterItems = toc
        .map(
          (ch) =>
            `• **[Trang ${ch.pageNumber}]** — **${ch.title}**\n  *Tóm lược: ${ch.summary || 'Nội dung cốt lõi và phương pháp ứng dụng thực tế.'}*`
        )
        .join('\n\n');

      return {
        answer:
          `Dưới đây là **Mục Lục Toàn Bộ Cuốn Sách** **"${title}"** (${toc.length} chương/phần, ${totalPages} trang):\n\n` +
          `${chapterItems}\n\n` +
          `👉 *Mẹo đọc nhanh: Bấm trực tiếp vào các nút [Trang X] bên dưới để lật ngay đến chương đó trên trình đọc 3D SideBooks.*`,
        follow_up_questions: [
          'Tóm tắt ngắn gọn toàn bộ cuốn sách?',
          'Chương nào nói về cơ chế tự phục hồi và dinh dưỡng?',
          'Lộ trình đọc gợi ý cho người mới bắt đầu?',
        ],
        provider: 'book_context_toc',
      };
    }

    // 3. Ý tưởng cốt lõi / bài học thực tế
    if (
      lowerQ.includes('cốt lõi') ||
      lowerQ.includes('ý tưởng') ||
      lowerQ.includes('thông điệp') ||
      lowerQ.includes('bài học') ||
      lowerQ.includes('luận điểm')
    ) {
      return {
        answer:
          `Những **ý tưởng cốt lõi** xuyên suốt cuốn sách **"${title}"**${author}:\n\n` +
          `1. **Cơ thể là một cỗ máy sinh học tinh vi**: Khả năng tự phục hồi và tái tạo tế bào là vô hạn nếu được cung cấp đầy đủ dưỡng chất và môi trường thuận lợi (xem tại **[Trang ${toc[1]?.pageNumber || 18}]**).\n\n` +
          `2. **Gốc rễ của vấn đề mạn tính**: Phần lớn tổn thương bắt nguồn từ sự mất cân bằng vi chất kéo dài và thói quen sinh hoạt sai lệch (tham khảo **[Trang ${toc[2]?.pageNumber || 35}]**).\n\n` +
          `3. **Cơ quan then chốt điều phối**: Sức khỏe toàn diện phụ thuộc vào các trạm trung chuyển lớn như gan, hệ tiêu hóa và hệ mạch máu (chi tiết tại **[Trang ${toc[3]?.pageNumber || 52}]**).\n\n` +
          `4. **Ứng dụng thực tiễn bền vững**: Sức khỏe không đến từ các giải pháp chắp vá tức thời mà từ việc điều chỉnh lối sống khoa học và kiên trì mỗi ngày.`,
        follow_up_questions: [
          'Chương nào phân tích sâu về cơ chế phục hồi tế bào?',
          'Tóm tắt mục lục toàn cuốn sách?',
          'Những điều cần áp dụng ngay trong sinh hoạt?',
        ],
        provider: 'book_context_core',
      };
    }

    // 4. Lộ trình đọc gợi ý
    if (
      lowerQ.includes('lộ trình') ||
      lowerQ.includes('nên đọc') ||
      lowerQ.includes('bắt đầu từ đâu') ||
      lowerQ.includes('đọc trước')
    ) {
      return {
        answer:
          `Lộ trình đọc gợi ý để nắm bắt trọn vẹn cuốn sách **"${title}"**:\n\n` +
          `• **Bước 1 (Nhập môn - Khai mở tư duy)**: Đọc **${toc[0]?.title || 'Chương 1'}** tại **[Trang ${toc[0]?.pageNumber || 1}]** để hiểu đúng tư duy nền tảng.\n` +
          `• **Bước 2 (Hiểu cơ chế vận hành)**: Đọc tiếp tại **[Trang ${toc[1]?.pageNumber || 18}]** để nắm vững khả năng tự tái tạo của cơ thể.\n` +
          `• **Bước 3 (Thực hành & Ứng dụng)**: Tập trung vào các chương giải pháp chuyên sâu tại **[Trang ${toc[3]?.pageNumber || 52}]** và **[Trang ${toc[4]?.pageNumber || 74}]**.\n\n` +
          `*Bạn có thể bấm vào các nút trang bên dưới để nhảy thẳng tới bước bạn quan tâm.*`,
        follow_up_questions: [
          'Tóm tắt nội dung chương 1?',
          'Xem mục lục đầy đủ của cuốn sách?',
        ],
        provider: 'book_context_roadmap',
      };
    }

    // 5. Tra cứu chủ đề cụ thể trong sách
    const matchedCh = toc.find((ch) => {
      const chTitle = ch.title.toLowerCase();
      const words = lowerQ.split(/\s+/).filter((w) => w.length >= 3);
      return words.some((w) => chTitle.includes(w) || (ch.summary && ch.summary.toLowerCase().includes(w)));
    });

    if (matchedCh) {
      return {
        answer:
          `Về câu hỏi **"${query}"**, trong cuốn sách **"${title}"**, tác giả đề cập trực tiếp tại **${matchedCh.title}** (bắt đầu từ **[Trang ${matchedCh.pageNumber}]**):\n\n` +
          `• **Nội dung trọng tâm**: ${matchedCh.summary || 'Chương này phân tích cơ chế chuyên sâu và cung cấp các chỉ dẫn cụ thể.'}\n` +
          `• **Khuyến nghị**: Mời bạn bấm vào nút **[Trang ${matchedCh.pageNumber}]** bên dưới để chuyển trực tiếp tới trang sách này trên trình đọc SideBooks và nghiên cứu chi tiết!`,
        follow_up_questions: [
          `Đọc tiếp nội dung tại Trang ${matchedCh.pageNumber}?`,
          'Xem mục lục các chương còn lại?',
          'Tóm tắt toàn bộ cuốn sách?',
        ],
        provider: 'book_context_topic_match',
      };
    }

    // Phản hồi tổng quan toàn sách nếu chưa khớp chủ đề cụ thể
    return {
      answer:
        `Trong toàn bộ cuốn sách **"${title}"** (${toc.length} chương, ${totalPages} trang), tác giả trình bày hệ thống kiến thức toàn diện từ lý thuyết nền tảng đến ứng dụng thực tiễn.\n\n` +
        `Bạn có thể khám phá các mốc quan trọng:\n` +
        `• Bắt đầu sách tại **[Trang 1]**: ${toc[0]?.title || 'Lời mở đầu'}\n` +
        (toc.length > 2 ? `• Điểm nhấn giữa sách tại **[Trang ${toc[Math.floor(toc.length / 2)].pageNumber}]**: ${toc[Math.floor(toc.length / 2)].title}\n` : '') +
        (toc.length > 1 ? `• Phần kết luận & đúc kết tại **[Trang ${toc[toc.length - 1].pageNumber}]**: ${toc[toc.length - 1].title}\n` : '') +
        `\nBạn muốn tìm hiểu kỹ hơn về chương nào hay muốn tóm tắt toàn bộ tác phẩm?`,
      follow_up_questions: [
        'Tóm tắt toàn bộ cuốn sách?',
        'Xem mục lục chi tiết kèm số trang?',
        'Ý tưởng cốt lõi của tác giả là gì?',
      ],
      provider: 'book_context_default',
    };
  }

  // ===================== CHẾ ĐỘ 2: TRANG HIỆN TẠI (PAGE CONTEXT) =====================
  if (excerpt && excerpt.trim().length > 10) {
    if (lowerQ.includes('tóm tắt') || lowerQ.includes('3 ý')) {
      return {
        answer:
          `Dưới đây là **3 ý cốt lõi** của trang sách **[Trang ${page}]**:\n\n` +
          `1. **Trọng tâm nội dung**: Trang này giải thích nguyên lý vận hành sinh học và mối liên hệ giữa các cấu trúc trong cơ thể.\n` +
          `2. **Điểm cần lưu ý**: Cần phân biệt rõ giữa triệu chứng bên ngoài và nguyên nhân gốc rễ gây ra tổn thương.\n` +
          `3. **Bài học thực tiễn**: Nhấn mạnh tầm quan trọng của việc phòng ngừa chủ động và cung cấp đủ điều kiện phục hồi tự nhiên.`,
        follow_up_questions: [
          'Giải thích các thuật ngữ chuyên môn trang này?',
          'Có câu hỏi ôn tập nào để kiểm tra mức độ hiểu?',
          'Chuyển sang tóm tắt toàn bộ cuốn sách?',
        ],
        provider: 'page_context_summary',
      };
    }

    if (lowerQ.includes('thuật ngữ') || lowerQ.includes('giải thích')) {
      return {
        answer:
          `Tại trang **[Trang ${page}]**, các thuật ngữ và khái niệm quan trọng bao gồm:\n\n` +
          `• **Cơ chế tự cân bằng nội môi**: Khả năng cơ thể tự động điều hòa các chỉ số sinh hóa khi có đầy đủ nguyên liệu.\n` +
          `• **Vi chất dinh dưỡng**: Các vitamin, khoáng chất thiết yếu đóng vai trò xúc tác cho hàng triệu phản ứng sinh hóa mỗi giây.\n` +
          `• **Bảo tồn cấu trúc**: Nguyên tắc giữ gìn và tái lập lại sự toàn vẹn của mô và tế bào.`,
        follow_up_questions: [
          'Tóm tắt 3 ý cốt lõi trang này?',
          'Câu hỏi ôn tập kiến thức trang này?',
        ],
        provider: 'page_context_terms',
      };
    }

    if (lowerQ.includes('câu hỏi ôn tập') || lowerQ.includes('kiểm tra')) {
      return {
        answer:
          `Dưới đây là **2 câu hỏi ôn tập** để kiểm tra mức độ nắm bắt kiến thức trang **[Trang ${page}]**:\n\n` +
          `1. *Yếu tố nào quyết định trực tiếp đến khả năng tự phục hồi của mô theo phân tích tại trang này?*\n` +
          `2. *Tác giả đã đưa ra ví dụ hoặc luận điểm gì để chứng minh cho tầm quan trọng của việc bảo vệ sức khỏe chủ động?*\n\n` +
          `💡 *Gợi ý: Đọc kỹ các đoạn mở đầu và liên hệ với các chương trước đó trong sách!*`,
        follow_up_questions: [
          'Giải thích đáp án cho câu hỏi 1?',
          'Tóm tắt lại 3 ý chính trang này?',
        ],
        provider: 'page_context_quiz',
      };
    }
  }

  // Mặc định cho trang hiện tại
  return {
    answer: `Tại **[Trang ${page}]** của cuốn **"${title}"**, tác giả đang làm sáng tỏ các luận điểm quan trọng. Bạn có thể nhấn chọn đoạn văn bản bất kỳ trên trang để yêu cầu giải thích chi tiết, hoặc chuyển sang chế độ **"Toàn cuốn sách"** để nắm bắt bức tranh toàn cảnh!`,
    follow_up_questions: [
      'Tóm tắt 3 ý cốt lõi của trang này?',
      'Giải thích các thuật ngữ chuyên sâu?',
      'Tóm tắt toàn bộ cuốn sách?',
    ],
    provider: 'page_context_default',
  };
}

// Fallback an toàn khi mạng chập chờn (gọn gàng, đúng trọng tâm, kèm sách & trích đoạn trang sách)
function fastFallbackSearch(query: string, catalog: LessonCatalogItem[], dynamicBooks?: any[]) {
  const selectedPages = rankCatalogPages(query, catalog);
  const { books: matchedBooks, snippets: matchedSnippets } = rankBooksAndSnippets(query, dynamicBooks);

  let answerText = '';
  const lowerQ = query.toLowerCase();

  if (lowerQ.includes('cổ') || lowerQ.includes('vai') || lowerQ.includes('gáy') || lowerQ.includes('tay')) {
    answerText = 'Sau khi đã hiểu rõ nhu cầu của bạn, đây là những gợi ý đầu sách phù hợp nhất về đốt sống cổ & vai gáy của tôi:';
  } else if (lowerQ.includes('lưng') || lowerQ.includes('đĩa đệm') || lowerQ.includes('thoát vị') || lowerQ.includes('tọa') || lowerQ.includes('l4') || lowerQ.includes('l5')) {
    answerText = 'Sau khi đã hiểu rõ nhu cầu của bạn, đây là những gợi ý đầu sách phù hợp nhất về cột sống & thoát vị đĩa đệm của tôi:';
  } else if (lowerQ.includes('nước') || lowerQ.includes('uống') || lowerQ.includes('bơm dịch')) {
    answerText = 'Sau khi đã hiểu rõ nhu cầu của bạn, đây là những gợi ý đầu sách phù hợp nhất về nước & khoáng chất cho cơ thể của tôi:';
  } else if (lowerQ.includes('dinh dưỡng') || lowerQ.includes('kháng viêm') || lowerQ.includes('ăn') || lowerQ.includes('việt')) {
    answerText = 'Sau khi đã hiểu rõ nhu cầu của bạn, đây là những gợi ý đầu sách phù hợp nhất về dinh dưỡng & chế độ ăn cho người Việt của tôi:';
  } else if (lowerQ.includes('tiêu hóa') || lowerQ.includes('dạ dày') || lowerQ.includes('ruột')) {
    answerText = 'Sau khi đã hiểu rõ nhu cầu của bạn, đây là những gợi ý đầu sách phù hợp nhất về tiêu hóa & vi sinh đường ruột của tôi:';
  } else {
    answerText = 'Sau khi đã hiểu rõ nhu cầu của bạn, đây là những gợi ý đầu sách phù hợp nhất của tôi:';
  }

  return {
    answer: answerText,
    suggested_books: matchedBooks,
    in_book_snippets: matchedSnippets,
    suggested_pages: selectedPages.map((s) => ({
      title: s.page_title,
      topic_title: s.topic_title,
      topic_slug: s.topic_slug,
      page_slug: s.page_slug,
      reason: `Tham khảo kiến thức chuẩn trong bài "${s.page_title}".`,
    })),
    follow_up_questions: [
      'Tư thế sinh hoạt đúng cần chú ý gì?',
      'Cách phân biệt đau mỏi thông thường?',
    ],
    provider: 'fallback_clean',
  };
}

export async function POST(req: NextRequest) {
  if (!rateLimit('ai:' + getClientIp(req), 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Bạn hỏi quá nhanh, vui lòng thử lại sau ít phút.' }, { status: 429 });
  }

  let question = '';
  let bookContext: any = null;

  try {
    const body = await req.json();
    question = (body.question || '').trim();
    const history = Array.isArray(body.history) ? body.history : [];
    bookContext = body.bookContext; // { title?: string; author?: string; page?: number; excerpt?: string }

    if (!question) {
      return NextResponse.json({ error: 'Vui lòng nhập câu hỏi.' }, { status: 400 });
    }

    const isAskingDoctorLoan = /doctor\s*loan/i.test(question);

    // 1. KIỂM TRA PHẢN HỒI TỨC THÌ TỪ DANH SÁCH CÂU HỎI MẪU CHUẨN XÁC (< 5ms) - Chỉ áp dụng khi người dùng hỏi chung, không có ngữ cảnh sách
    if (!bookContext) {
      const curated = findCuratedMatch(question);
      if (curated) {
        const { books: rankedBooks, snippets: rankedSnippets } = rankBooksAndSnippets(question);
        return NextResponse.json({
          answer: curated.answer,
          suggested_books: (curated as any).suggested_books && (curated as any).suggested_books.length > 0
            ? (curated as any).suggested_books
            : rankedBooks,
          in_book_snippets: (curated as any).in_book_snippets && (curated as any).in_book_snippets.length > 0
            ? (curated as any).in_book_snippets
            : rankedSnippets,
          suggested_pages: curated.suggested_pages,
          follow_up_questions: curated.follow_up_questions,
          provider: 'curated_instant',
        });
      }
    }

    // Lấy catalog bài học và danh mục sách
    const [catalog, settings] = await Promise.all([
      getOrBuildLessonCatalog(),
      getSettings(),
    ]);

    const { books: rankedBooks, snippets: rankedSnippets } = rankBooksAndSnippets(question, settings?.recommended_books);

    const aiTraining = settings?.ai_training;
    const lowerQ = question.toLowerCase();

    // 2. KIỂM TRA FAQ DO TÁC GIẢ TỰ CẤU HÌNH TRONG ADMIN (< 5ms)
    if (Array.isArray(aiTraining?.faqs) && aiTraining.faqs.length > 0) {
      const matchedFaq = aiTraining.faqs.find((f) => {
        const fq = f.question.toLowerCase();
        return fq === lowerQ || lowerQ.includes(fq) || fq.includes(lowerQ);
      });

      if (matchedFaq && matchedFaq.answer) {
        if (isAskingDoctorLoan || !/doctor\s*loan/i.test(matchedFaq.answer)) {
          const selectedPages = rankCatalogPages(question, catalog);

          return NextResponse.json({
            answer: matchedFaq.answer,
            suggested_books: rankedBooks,
            in_book_snippets: rankedSnippets,
            suggested_pages: selectedPages.map((s) => ({
              title: s.page_title,
              topic_title: s.topic_title,
              topic_slug: s.topic_slug,
              page_slug: s.page_slug,
              reason: 'Tài liệu hướng dẫn trực tiếp từ chuyên gia.',
            })),
            follow_up_questions: [
              'Tư thế sinh hoạt đúng cần chú ý gì?',
              'Có lưu ý gì trong sinh hoạt hàng ngày không?',
            ],
            provider: 'admin_faq',
          });
        }
      }
    }

    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!deepseekKey && !geminiKey) {
      if (bookContext) {
        return NextResponse.json(buildBookContextAnswer(question, bookContext));
      }
      return NextResponse.json(fastFallbackSearch(question, catalog, settings?.recommended_books));
    }

    // 3. LỌC BÀI HỌC VÀ SÁCH LIÊN QUAN
    const topCatalog = rankCatalogPages(question, catalog);

    const catalogText = topCatalog
      .map((c, idx) => `[Bài ${idx + 1}] "${c.page_title}" (Chủ đề: ${c.topic_title}, slug: ${c.topic_slug}/${c.page_slug}): ${c.summary}`)
      .join('\n');

    const booksText = EBOOK_CATALOG
      .slice(0, 8)
      .map((b, idx) => `[Sách ${idx + 1}] ID: "${b.id}" | Tựa: "${b.title}" (Tác giả: ${b.author}, Tag: ${b.badge_tag || 'NÊN ĐỌC'}, Trang gợi ý: ${b.target_page || 2}): ${b.description}`)
      .join('\n');

    const snippetsText = IN_BOOK_SNIPPETS
      .slice(0, 8)
      .map((s, idx) => `[Trích đoạn ${idx + 1}] ID: "${s.id}" | Sách: "${s.book_title}" (ID: ${s.book_id}) | Chương: "${s.chapter}" | Trang ${s.page_number} (Index ${s.page_index}): "${s.excerpt}"`)
      .join('\n');

    // 4. HỆ THỐNG PROMPT TỐI ƯU CHO TỪNG TÌNH HUỐNG (ĐỌC SÁCH VS TÌM KIẾM)
    let systemPrompt = '';
    if (bookContext) {
      const isBookScope = bookContext.scope === 'book';
      const resolvedToc: BookTocItem[] = (Array.isArray(bookContext.toc) && bookContext.toc.length > 0)
        ? bookContext.toc
        : getBookToc(bookContext.title || '', bookContext.totalPages || 100);

      const tocList = resolvedToc
        .map((t) => `  - [Trang ${t.pageNumber}]: ${t.title}${t.summary ? ` (${t.summary})` : ''}`)
        .join('\n');

      systemPrompt = `Bạn là Trợ lý AI Đồng Hành Đọc Sách Chuyên Sâu (Interactive Reading Copilot) cho tác phẩm: "${bookContext.title || 'Sách'}".
Tác giả: ${bookContext.author || 'Tác giả'}.
Tổng số trang: ${bookContext.totalPages || 100} trang.
Trang độc giả đang mở: Trang ${bookContext.page || 1}.
Chế độ phân tích: ${isBookScope ? 'TOÀN BỘ CUỐN SÁCH (Full Book Context)' : 'TRANG HIỆN TẠI (Page Context)'}.

${tocList ? `DANH MỤC MỤC LỤC & CÁC CHƯƠNG TRONG SÁCH:\n${tocList}\n` : ''}
${bookContext.excerpt ? `NỘI DUNG / TRÍCH ĐOẠN TRANG SÁCH HIỆN TẠI:\n"""\n${bookContext.excerpt.slice(0, 2500)}\n"""\n` : ''}

NGUYÊN TẮC BẮT BUỘC:
1. Bạn là Trợ lý Đồng hành Đọc Sách, hãy trả lời thẳng thắn, mạch lạc, khúc chiết, chuẩn y khoa và đúng với nội dung sách.
2. CỰC KỲ QUAN TRỌNG: MỖI KHI NHẮC ĐẾN MỘT CHƯƠNG, PHẦN HOẶC LUẬN ĐIỂM, HÃY KÈM THEO SỐ TRANG DẠNG [Trang X] (ví dụ: "[Trang 18]", "[Trang 52]", "[Trang 108]") để hệ thống tự động tạo nút bấm nhảy trực tiếp tới trang đó cho độc giả.
3. KHÔNG bắt đầu bằng "Sau khi đã hiểu rõ nhu cầu của bạn..." hay gợi ý mua sách khác, vì độc giả đang ở trực tiếp bên trong cuốn sách này.

TRẢ VỀ DUY NHẤT 1 ĐỐI TƯỢNG JSON:
{
  "answer": "Nội dung phản hồi hoàn chỉnh bằng Markdown...",
  "follow_up_questions": [
    "Câu hỏi gợi ý 1?",
    "Câu hỏi gợi ý 2?"
  ]
}`;
    } else {
      const contextPrefix = '';
      systemPrompt = `${contextPrefix}Bạn là Trợ lý Tìm Kiếm & Thủ Thư Gợi Ý Sách Thông Minh (Book Recommendation Copilot) trong Tủ Sách Qbiz Books (Tác giả: Tùng Dinh Dưỡng).

NGUYÊN TẮC CỐT LÕI (BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT):
1. GỢI Ý ĐÚNG ĐẦU SÁCH (P0):
   - Khi người đọc hỏi tìm sách, mô tả nhu cầu hoặc chủ đề quan tâm: TUYỆT ĐỐI KHÔNG viết các bài luận dài dòng chẩn đoán bệnh hay giải thích y khoa lê thê.
   - Trường "answer" PHẢI BẮT ĐẦU BẰNG: "Sau khi đã hiểu rõ nhu cầu của bạn, đây là những gợi ý đầu sách phù hợp nhất của tôi:" (kèm 1 câu ngắn gọn nêu rõ vì sao các sách này giải quyết đúng nhu cầu).
   - Chọn đúng các đầu sách phù hợp nhất đưa vào "suggested_books".

2. NGUYÊN TẮC VỀ TƯ THẾ & VẬN ĐỘNG:
   - CẤM TIỂU TƯ VẤN NẰM/NGỒI CHI TIẾT, CẤM TƯ VẤN GỐI & GHẾ, CẤM KÊ TOA BÀI TẬP.

3. TUYỆT ĐỐI CẤM:
   - CẤM TUYỆT ĐỐI nhắc đến DoctorLoan trừ khi được hỏi đích danh.
   - CẤM các từ: "chữa bệnh", "khám chữa bệnh", "điều trị dứt điểm", "bác sĩ".

4. NHIỆM VỤ TRA CỨU SÁCH & TRÍCH ĐOẠN:
   - TÌM SÁCH CHÍNH XÁC (suggested_books): Chọn 1-2 cuốn sách phù hợp nhất từ danh mục Tủ Sách Ebook dưới đây:
${booksText}
   - TRÍCH XUẤT TÀI LIỆU TRANG SÁCH (in_book_snippets): Chọn 1-2 đoạn trích sâu trong trang sách phù hợp nhất:
${snippetsText}
   - ĐỊNH HƯỚNG BÀI HỌC (suggested_pages):
${catalogText}

BẮT BUỘC TRẢ VỀ DUY NHẤT 1 ĐỐI TƯỢNG JSON:
{
  "answer": "Sau khi đã hiểu rõ nhu cầu của bạn, đây là những gợi ý đầu sách phù hợp nhất của tôi:",
  "suggested_books": [
    {
      "id": "book-id-chinh-xac",
      "title": "Tên sách",
      "author": "Tác giả",
      "cover_url": "url ảnh bìa",
      "badge_tag": "tag",
      "target_page": 2,
      "reason": "Lý do ngắn gọn 1 câu vì sao cuốn sách này giải quyết thắc mắc"
    }
  ],
  "in_book_snippets": [
    {
      "id": "snip-id",
      "book_id": "book-id",
      "book_title": "Tên sách",
      "cover_url": "url ảnh bìa",
      "chapter": "Tên chương",
      "page_number": 2,
      "page_index": 1,
      "excerpt": "Đoạn văn bản trích dẫn chính xác trong trang sách",
      "relevance_reason": "Lý do vì sao đoạn trích này làm sáng tỏ câu hỏi"
    }
  ],
  "suggested_pages": [
    {
      "title": "Tên bài học",
      "topic_title": "Tên chủ đề",
      "topic_slug": "slug_chu_de",
      "page_slug": "slug_bai_hoc",
      "reason": "Lý do ngắn gọn 1 câu"
    }
  ],
  "follow_up_questions": [
    "Câu hỏi gợi ý 1?",
    "Câu hỏi gợi ý 2?"
  ]
}`;
    }

    let rawText = '';
    let usedProvider = '';

    // 5. GỌI PRIMARY: DEEPSEEK V3 VỚI TIMEOUT 8000ms
    if (deepseekKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const deepseekRes = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepseekKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemPrompt },
              ...history.slice(-2).map((h: any) => ({
                role: h.role === 'user' ? 'user' : 'assistant',
                content: h.text,
              })),
              { role: 'user', content: question },
            ],
            max_tokens: 1000,
            temperature: 0.3,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (deepseekRes.ok) {
          const dsData = await deepseekRes.json();
          const text = dsData.choices?.[0]?.message?.content;
          if (text) {
            rawText = text;
            usedProvider = 'deepseek';
          }
        }
      } catch (err: any) {
        console.warn('[AI] DeepSeek timed out or failed, falling back to Gemini Flash...', err?.message);
      }
    }

    // 6. GỌI SECONDARY (FALLBACK): GOOGLE GEMINI VỚI TIMEOUT 4500ms
    if (!rawText && geminiKey) {
      const candidateModels = [
        'gemini-1.5-flash',
        'gemini-2.0-flash',
      ];

      const geminiPrompt = `${systemPrompt}\n\nCÂU HỎI CỦA NGƯỜI HỌC: "${question}"\n\nLỊCH SỬ:\n${history.slice(-2).map((h: any) => `${h.role === 'user' ? 'Người học' : 'Trợ lý'}: ${h.text}`).join('\n')}`;

      for (const model of candidateModels) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4500);

          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
          const geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: geminiPrompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.3,
                maxOutputTokens: 1000,
              },
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              rawText = text;
              usedProvider = model;
              break;
            }
          }
        } catch {
          // Thử model tiếp theo
        }
      }
    }

    if (!rawText) {
      if (bookContext) {
        return NextResponse.json(buildBookContextAnswer(question, bookContext));
      }
      return NextResponse.json(fastFallbackSearch(question, catalog, settings?.recommended_books));
    }

    // 7. BÓC TÁCH JSON VÀ LÀM SẠCH KẾT QUẢ
    let parsedJson: any = null;
    try {
      const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      parsedJson = JSON.parse(cleaned);
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedJson = JSON.parse(jsonMatch[0]);
        } catch {
          parsedJson = null;
        }
      }
    }

    // Phục hồi dữ liệu nếu JSON bị ngắt quãng giữa chừng
    if (!parsedJson) {
      try {
        const answerMatch = rawText.match(/"answer"\s*:\s*"((?:[^"\\]|\\.)*)/);
        if (answerMatch && answerMatch[1]) {
          parsedJson = {
            answer: answerMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, ' '),
            suggested_pages: topCatalog.slice(0, 2),
          };
        }
      } catch {
        parsedJson = null;
      }
    }

    if (parsedJson && parsedJson.answer) {
      let cleanAnswer = String(parsedJson.answer)
        .replace(/(?:tác giả\s+)?(?:tùng\s+)?(?:dinh dưỡng\s+)?(?:không phải|chưa phải)(?:\s+là)?\s+bác sĩ[.,;:\-—–]?\s*/gi, '')
        .replace(/tôi không phải(?:\s+là)?\s+bác sĩ[.,;:\-—–]?\s*/gi, '')
        .replace(/\bkhông phải bác sĩ\b/gi, '')
        .replace(/y\s+khoa\s+chữa\s+bệnh/gi, 'y khoa chuyên sâu')
        .replace(/khám\s+chữa\s+bệnh/gi, 'thăm khám y tế')
        .replace(/chữa\s+dứt\s+điểm/gi, 'phục hồi tự nhiên')
        .replace(/chữa\s+bệnh/gi, 'chăm sóc sức khỏe')
        .replace(/chữa\s+trị/gi, 'chăm sóc')
        .replace(/điều\s+trị/gi, 'phục hồi')
        .replace(/nắn\s+chỉnh\s+cột\s+sống/gi, 'hỗ trợ điều chỉnh độ cong sinh lý cột sống')
        .replace(/nắn\s+chỉnh/gi, 'hỗ trợ điều chỉnh tư thế')
        .replace(/uốn\s+nắn/gi, 'hỗ trợ điều chỉnh')
        .trim();

      // BẢO VỆ TUYỆT ĐỐI: NẾU NGƯỜI DÙNG KHÔNG HỎI DOCTORLOAN, LOẠI BỎ TRIỆT ĐỂ
      if (!isAskingDoctorLoan) {
        cleanAnswer = cleanAnswer
          .replace(/.*(?:doctor\s*loan|ghế\s+nhựa\s+doctorloan|gối\s+doctorloan).*\n?/gi, '')
          .replace(/\bdoctor\s*loan\b/gi, '')
          .trim();
      }

      // LOẠI BỎ TRIỆT ĐỂ VIỆC TIỂU TƯ VẤN: NẰM CỤ THỂ, NGỒI CỤ THỂ, GỐI, GHẾ, BÀI TẬP CỤ THỂ
      const isAskingPillows = /gối/i.test(question);
      cleanAnswer = cleanAnswer
        .split('\n')
        .map((line) => {
          let l = line;

          // 1. Khử gối khi người dùng không hỏi về gối (bảo tồn giải phẫu: đầu gối, khớp gối, gập gối, chùng gối)
          if (!isAskingPillows && /gối/i.test(l) && !/(?:đầu\s*gối|khớp\s*gối|gập\s*gối|chùng\s*gối)/i.test(l)) {
            l = l.replace(/kê\s+(?:một\s+)?gối\s+(?:mỏng|mềm|nhẹ)?\s+(?:dưới|ở)\s+cổ/gi, 'giữ cổ thẳng trục tự nhiên');
            l = l.replace(/(?:kê\s+)?đệm\s+phẳng\s+mỏng\s+dưới\s+khoeo\s+chân/gi, 'thả lỏng tự nhiên');
            l = l.replace(/(?:kẹp\s+)?gối\s+giữa\s+hai\s+(?:đầu\s+)?gối/gi, 'thả lỏng hai chân');
            l = l.replace(/(?:bằng|dùng)\s+gối\s+mềm/gi, '');
            l = l.replace(/không\s+dùng\s+gối\s+cao/gi, 'không nằm gập đầu cổ');
            l = l.replace(/(?:hoặc\s+)?(?:gối|đệm\s+phẳng)\s+(?:kê\s+)?quá\s+cao(?:\s*[\/\-]\s*thấp)?/gi, 'tư thế gập cong cổ');
            l = l.replace(/tránh\s+gối\s+quá\s+cao/gi, 'tránh nằm gập cổ');
            l = l.replace(/gối\s+cao\s+vừa\s+phải/gi, 'độ dốc vừa phải');
            l = l.replace(/ngủ\s+sai\s+gối/gi, 'nằm sai tư thế');
            l = l.replace(/(?<!(?:đầu|khớp|gập|chùng)\s*)gối/gi, '');
          }

          // 2. Khử tiểu tư vấn nằm kiểu gì (nằm nghiêng trái, nằm ngửa co chân, kê đầu giường 15-20cm...)
          l = l.replace(/nằm\s+nghiêng\s+(?:bên\s+)?trái/gi, 'duy trì tư thế nằm chuẩn');
          l = l.replace(/nằm\s+nghiêng\s+sang\s+một\s+bên/gi, 'duy trì tư thế nằm chuẩn');
          l = l.replace(/nằm\s+ngửa\s+trên\s+đệm\s+phẳng/gi, 'duy trì tư thế nằm chuẩn');
          l = l.replace(/nằm\s+ngửa/gi, 'duy trì tư thế nằm chuẩn');
          l = l.replace(/kê\s+cao\s+(?:phần\s+)?đầu\s+(?:giường|đệm)(?:\s*\([^)]*\))?/gi, 'nghỉ ngơi ở tư thế thoải mái');
          l = l.replace(/kê\s+cao\s+chân\s+hơn\s+(?:mức\s+)?tim(?:\s*\([^)]*\))?/gi, 'thả lỏng chân thoải mái');
          l = l.replace(/(?:hai\s+)?chân\s+co\s+nhẹ(?:\s+tự\s+nhiên|\s+song\s+song)?/gi, 'thả lỏng cơ thể');
          l = l.replace(/co\s+nhẹ\s+(?:hai\s+)?chân(?:\s+tự\s+nhiên|\s+song\s+song)?/gi, 'thả lỏng cơ thể');

          // 3. Khử tiểu tư vấn ngồi kiểu gì & ghế
          l = l.replace(/mắt\s+(?:cách\s+vở|ngang\s+tầm\s+sách|ngang\s+tầm)[^,;.\n]*/gi, 'ngồi thẳng lưng tự nhiên');
          l = l.replace(/khuỷu\s+tay\s+vuông\s+góc/gi, 'thả lỏng vai và tay');
          l = l.replace(/(?:hai\s+)?chân\s+(?:đặt\s+phẳng\s+trên\s+sàn|chạm\s+đất)/gi, 'tư thế ngồi thoải mái');
          l = l.replace(/lưng\s+thẳng\s+dựa\s+vào\s+thành\s+ghế/gi, 'ngồi giữ thẳng lưng tự nhiên');
          l = l.replace(/điều\s+chỉnh\s+bàn\s+ghế\s+phù\s+hợp(?:\s+chiều\s+cao)?/gi, 'giữ tư thế ngồi học và làm việc chuẩn');
          l = l.replace(/bàn\s+ghế\s+phù\s+hợp/gi, 'tư thế ngồi chuẩn');
          l = l.replace(/\bghế\s+công\s+thái\s+học\b/gi, 'chỗ ngồi phù hợp');

          // 4. Khử bài tập cụ thể (đu xà, bơi lội, bài tập kéo giãn, squat, plank...)
          l = l.replace(/(?:tập\s+)?bơi\s*(?:lội)?,\s*(?:đu\s+xà|treo\s+xà(?:\s+đơn)?)\s*(?:nhẹ)?/gi, 'vận động nhẹ nhàng phù hợp thể trạng');
          l = l.replace(/(?:đu\s+xà|treo\s+xà(?:\s+đơn)?|bơi\s+lội)/gi, 'vận động nhẹ nhàng vừa sức');
          l = l.replace(/bài\s+tập\s+(?:kéo\s+giãn|giải\s+nén|vai\s+sau|lưng|cơ\s+lưng)/gi, 'vận động nhẹ nhàng');

          // 5. Dọn dẹp dấu ngoặc rỗng, dấu phẩy thừa
          l = l.replace(/(?:,\s*)?(?:không\s+dùng|tránh)\s*(?=\))/gi, '');
          l = l.replace(/\s*\(\s*(?:không\s+dùng|tránh)?\s*\)/gi, '');
          l = l.replace(/\s*\(\s*\)/g, '');
          l = l.replace(/,\s*,/g, ',');
          l = l.replace(/:\s*,\s*/g, ': ');
          l = l.replace(/\s{2,}/g, ' ').trim();

          return l;
        })
        .filter((l) => l.trim().length > 0)
        .join('\n');

      if (cleanAnswer.length > 0) {
        cleanAnswer = cleanAnswer.charAt(0).toUpperCase() + cleanAnswer.slice(1);
      }

      // Xử lý danh sách Sách gợi ý (suggested_books)
      const validSuggestedBooks: SuggestedBookItem[] = Array.isArray(parsedJson.suggested_books) && parsedJson.suggested_books.length > 0
        ? parsedJson.suggested_books.map((b: any) => {
            const foundCatalog = EBOOK_CATALOG.find((cat) => cat.id === b.id || cat.title.toLowerCase().includes((b.title || '').toLowerCase()));
            const targetPage = b.target_page || foundCatalog?.target_page || 2;
            return {
              id: b.id || foundCatalog?.id || 'book-hieu-dung-cot-song',
              title: b.title || foundCatalog?.title || 'Hiểu Đúng Về Cột Sống',
              author: b.author || foundCatalog?.author || 'Tùng Dinh Dưỡng',
              description: b.description || foundCatalog?.description || '',
              cover_url: b.cover_url || foundCatalog?.cover_url || '/documents/covers/cover_hieu_dung_ve_cot_song.png',
              badge_tag: b.badge_tag || foundCatalog?.badge_tag || 'NÊN ĐỌC',
              target_page: targetPage,
              target_index: Math.max(0, targetPage - 1),
              reason: b.reason || foundCatalog?.reason || 'Tham khảo kiến thức chuẩn y khoa trong cuốn sách này.',
            };
          })
        : rankedBooks;

      // Xử lý danh sách trích đoạn sâu trong trang sách (in_book_snippets)
      const validSnippets: InBookSnippetItem[] = Array.isArray(parsedJson.in_book_snippets) && parsedJson.in_book_snippets.length > 0
        ? parsedJson.in_book_snippets.map((snip: any) => {
            const foundSnip = IN_BOOK_SNIPPETS.find((s) => s.id === snip.id || s.chapter.toLowerCase().includes((snip.chapter || '').toLowerCase()));
            const pageNum = snip.page_number || foundSnip?.page_number || 2;
            return {
              id: snip.id || foundSnip?.id || 'snip-1',
              book_id: snip.book_id || foundSnip?.book_id || 'book-hieu-dung-cot-song',
              book_title: snip.book_title || foundSnip?.book_title || 'Hiểu Đúng Về Cột Sống',
              cover_url: snip.cover_url || foundSnip?.cover_url || '/documents/covers/cover_hieu_dung_ve_cot_song.png',
              chapter: snip.chapter || foundSnip?.chapter || 'Chương 1: Cơ Chế Sinh Học',
              page_number: pageNum,
              page_index: Math.max(0, pageNum - 1),
              excerpt: snip.excerpt || foundSnip?.excerpt || '',
              relevance_reason: snip.relevance_reason || foundSnip?.relevance_reason || 'Trích đoạn trực tiếp từ trang sách.',
            };
          })
        : rankedSnippets;

      const normalizedSuggested = Array.isArray(parsedJson.suggested_pages)
        ? parsedJson.suggested_pages.map((p: any) => {
            const topicSlug = (p.topic_slug || '').trim();
            let pageSlug = (p.page_slug || '').trim();
            if (topicSlug && pageSlug.startsWith(`${topicSlug}/`)) {
              pageSlug = pageSlug.slice(topicSlug.length + 1);
            }
            return {
              title: p.title || '',
              topic_title: p.topic_title || '',
              topic_slug: topicSlug,
              page_slug: pageSlug,
              reason: p.reason || '',
            };
          })
        : [];

      const filteredFollowUps = Array.isArray(parsedJson.follow_up_questions)
        ? parsedJson.follow_up_questions.filter((q: string) => {
            const lq = q.toLowerCase();
            if (
              lq.includes('gối') ||
              lq.includes('ghế') ||
              lq.includes('bài tập') ||
              lq.includes('tập gì') ||
              lq.includes('tập luyện') ||
              lq.includes('nằm ngủ') ||
              lq.includes('tư thế ngủ') ||
              lq.includes('nằm thế nào') ||
              lq.includes('nằm kiểu') ||
              lq.includes('ngồi kiểu')
            ) {
              return false;
            }
            return true;
          })
        : [];

      if (filteredFollowUps.length < 2) {
        filteredFollowUps.push('Nguyên tắc duy trì tư thế chuẩn để bảo vệ cột sống?');
        filteredFollowUps.push('Chế độ dinh dưỡng khoa học hỗ trợ phục hồi khớp?');
      }

      return NextResponse.json({
        answer: cleanAnswer || parsedJson.answer,
        suggested_books: validSuggestedBooks,
        in_book_snippets: validSnippets,
        suggested_pages: normalizedSuggested,
        follow_up_questions: filteredFollowUps,
        provider: usedProvider || 'ai',
      });
    }

    if (bookContext) {
      return NextResponse.json(buildBookContextAnswer(question, bookContext));
    }
    return NextResponse.json(fastFallbackSearch(question, catalog, settings?.recommended_books));
  } catch (error: any) {
    if (bookContext) {
      return NextResponse.json(buildBookContextAnswer(question, bookContext));
    }
    const { books: fallbackBooks, snippets: fallbackSnippets } = rankBooksAndSnippets('');
    return NextResponse.json(
      {
        answer: 'Xin lỗi bạn, kết nối tới Trợ lý AI đang gián đoạn một chút. Mời bạn tham khảo trực tiếp các cuốn sách y khoa và bài học hướng dẫn dưới đây:',
        suggested_books: fallbackBooks,
        in_book_snippets: fallbackSnippets,
        suggested_pages: [],
        follow_up_questions: [],
      },
      { status: 200 }
    );
  }
}
