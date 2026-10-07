/**
 * Helper trích xuất danh sách URL ảnh trang (string[]) cho SideBooksReaderEngine
 * Hỗ trợ cả sách nạp ảnh trang tùy biến (PDF/Word/Gallery) lẫn sách y khoa chuyên sâu
 */
import { RecommendedBook, AuthorBook } from './types';

// Danh sách các trang giải phẫu atlas y khoa sắc nét làm trang nội dung chuẩn
const DEFAULT_ATLAS_PAGES = [
  '/documents/covers/cover_atlas_y_khoa_toan_dien.png',
  '/documents/covers/cover_cot-song.png',
  '/documents/bang_tra_cuu_re_than_kinh_cot_song.png',
  '/documents/covers/cover_dinh-duong.png',
  '/documents/covers/cover_tieu-hoa.png',
  '/documents/covers/cover_nuoc.png',
  '/documents/covers/cover_tu_chua_lanh_lung_co.png',
  '/documents/covers/cover_cam_nang_dot_song_co.png',
  '/documents/covers/back_cover_hieu_dung_ve_cot_song.png',
];

function deduplicatePages(pages: string[]): string[] {
  const result: string[] = [];
  for (const p of pages) {
    if (typeof p === 'string' && p.trim().length > 0 && !result.includes(p)) {
      result.push(p);
    }
  }
  return result.length > 0 ? result : DEFAULT_ATLAS_PAGES;
}

export function getBookReaderPageUrls(book?: RecommendedBook | AuthorBook | null): string[] {
  if (!book) return DEFAULT_ATLAS_PAGES;

  // 0. Nếu sách có thuộc tính pages (danh sách trang ảnh từ cơ sở dữ liệu Supabase)
  const bookPages = (book as any)?.pages;
  if (Array.isArray(bookPages) && bookPages.length > 0) {
    const valid = bookPages.filter((u: any) => typeof u === 'string' && u.trim().length > 0);
    if (valid.length > 0) {
      return deduplicatePages([book.cover_url || '', ...valid]);
    }
  }

  // 1. Nếu admin đã tải lên danh sách ảnh trang flipbook_pages
  if (Array.isArray(book.flipbook_pages) && book.flipbook_pages.length > 0) {
    const valid = book.flipbook_pages.filter((u) => typeof u === 'string' && u.trim().length > 0);
    if (valid.length > 0) {
      return deduplicatePages([book.cover_url || '', ...valid]);
    }
  }

  // 2. Nếu có bộ sưu tập ảnh bên trong gallery_images
  if (Array.isArray(book.gallery_images) && book.gallery_images.length > 0) {
    const valid = book.gallery_images.filter((u) => typeof u === 'string' && u.trim().length > 0);
    if (valid.length > 0) {
      return deduplicatePages([book.cover_url || '', ...valid]);
    }
  }

  const title = (book.title || '').toLowerCase();
  const cover = book.cover_url || '/documents/covers/cover_hieu_dung_ve_cot_song.png';

  // 3. Sách chuyên đề: Hiểu đúng về cột sống
  if (title.includes('cột sống') && (title.includes('hiểu đúng') || title.includes('thoát vị'))) {
    return deduplicatePages([
      cover,
      '/documents/covers/cover_atlas_y_khoa_toan_dien.png',
      '/documents/covers/cover_tu_chua_lanh_lung_co.png',
      '/documents/bang_tra_cuu_re_than_kinh_cot_song.png',
      '/documents/covers/cover_cam_nang_dot_song_co.png',
      '/documents/covers/cover_giai_ma_cot_song.png',
      '/documents/covers/back_cover_hieu_dung_ve_cot_song.png',
    ]);
  }

  // 4. Sách chuyên đề: Tự chữa lành lưng & cổ
  if (title.includes('tự chữa lành') || title.includes('đau lưng')) {
    return deduplicatePages([
      cover,
      '/documents/covers/cover_cot-song.png',
      '/documents/covers/cover_cam_nang_dot_song_co.png',
      '/documents/bang_tra_cuu_re_than_kinh_cot_song.png',
      '/documents/covers/cover_nuoc.png',
      '/documents/covers/back_cover_tu_chua_lanh_lung_co.png',
    ]);
  }

  // 5. Sách chuyên đề: Dinh dưỡng kháng viêm
  if (title.includes('dinh dưỡng') || title.includes('kháng viêm')) {
    return deduplicatePages([
      cover,
      '/documents/covers/cover_dinh-duong.png',
      '/documents/covers/cover_tieu-hoa.png',
      '/documents/covers/cover_nuoc.png',
      '/documents/covers/cover_gan-mat-tuy.png',
      '/documents/covers/back_cover_dinh_duong_khang_viem.png',
    ]);
  }

  // 6. Sách chuyên đề: Cẩm nang đốt sống cổ & vai gáy
  if (title.includes('đốt sống cổ') || title.includes('vai gáy')) {
    return deduplicatePages([
      cover,
      '/documents/covers/cover_cam_nang_dot_song_co.png',
      '/documents/bang_tra_cuu_re_than_kinh_cot_song.png',
      '/documents/covers/cover_cot-song.png',
      '/documents/covers/back_cover_cam_nang_dot_song_co.png',
    ]);
  }

  // 7. Sách chuyên đề: Giải mã cột sống
  if (title.includes('giải mã')) {
    return deduplicatePages([
      cover,
      '/documents/covers/cover_giai_ma_cot_song.png',
      '/documents/covers/cover_cot-song.png',
      '/documents/bang_tra_cuu_re_than_kinh_cot_song.png',
      '/documents/covers/back_cover_giai_ma_cot_song.png',
    ]);
  }

  // 8. Sách chuyên đề: Tiêu hóa & đường ruột
  if (title.includes('tiêu hóa') || title.includes('đường ruột')) {
    return deduplicatePages([
      cover,
      '/documents/covers/cover_tieu-hoa.png',
      '/documents/bang_tra_cuu_re_than_kinh_cot_song.png',
      '/documents/covers/cover_dinh-duong.png',
      '/documents/covers/cover_gan-mat-tuy.png',
      '/documents/covers/back_cover_dinh_duong_khang_viem.png',
    ]);
  }

  // 9. Sách chuyên đề: Nước & khoáng chất tế bào
  if (title.includes('nước') || title.includes('khoáng chất') || title.includes('hydro')) {
    return deduplicatePages([
      cover,
      '/documents/covers/cover_nuoc.png',
      '/documents/covers/cover_co-the-nguoi.png',
      '/documents/bang_tra_cuu_re_than_kinh_cot_song.png',
      '/documents/covers/cover_dinh-duong.png',
      '/documents/covers/back_cover_lang_nghe_co_the.png',
    ]);
  }

  // 10. Sách chuyên đề: Lợi khuẩn & vi sinh vật
  if (title.includes('lợi khuẩn') || title.includes('vi sinh')) {
    return deduplicatePages([
      cover,
      '/documents/covers/cover_loi_khuan_duong_ruot.png',
      '/documents/covers/cover_tieu-hoa.png',
      '/documents/bang_tra_cuu_re_than_kinh_cot_song.png',
      '/documents/covers/cover_mien-dich.png',
      '/documents/covers/back_cover_dinh_duong_khang_viem.png',
    ]);
  }

  // 11. Sách chuyên đề: Hệ miễn dịch tự nhiên
  if (title.includes('miễn dịch') || title.includes('đề kháng')) {
    return deduplicatePages([
      cover,
      '/documents/covers/cover_mien-dich.png',
      '/documents/covers/cover_co-the-nguoi.png',
      '/documents/bang_tra_cuu_re_than_kinh_cot_song.png',
      '/documents/covers/cover_loi_khuan_duong_ruot.png',
      '/documents/covers/back_cover_lang_nghe_co_the.png',
    ]);
  }

  // 12. Sách chung: Đưa bìa sách lên đầu, tiếp đến các trang atlas và trang bìa sau
  return deduplicatePages([
    cover,
    '/documents/covers/cover_atlas_y_khoa_toan_dien.png',
    '/documents/covers/cover_co-the-nguoi.png',
    '/documents/bang_tra_cuu_re_than_kinh_cot_song.png',
    '/documents/covers/cover_cot-song.png',
    '/documents/covers/back_cover_hieu_dung_ve_cot_song.png',
  ]);
}
