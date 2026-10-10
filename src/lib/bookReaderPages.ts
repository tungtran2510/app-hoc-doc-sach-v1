/**
 * Trích xuất nguồn nội dung đọc sách thật (BookContent) và URL ảnh trang thật cho đầu đọc SideBooks
 * TUYỆT ĐỐI KHÔNG DỰNG NỘI DUNG GIẢ, KHÔNG LẤY BÌA SÁCH NÀY LÀM TRANG SÁCH KIA
 */
import { RecommendedBook, AuthorBook } from './types';

export type BookContent =
  | { kind: 'pages'; urls: string[] }
  | { kind: 'file'; url: string; format: 'epub' | 'pdf' | 'cbz' | 'txt' | 'docx' }
  | { kind: 'empty'; reason: 'no-content' };

function deduplicatePages(pages: string[]): string[] {
  const result: string[] = [];
  for (const p of pages) {
    if (typeof p === 'string' && p.trim().length > 0 && !result.includes(p)) {
      result.push(p);
    }
  }
  return result;
}

/**
 * Trả về danh sách URL ảnh trang THẬT của sách (pages, flipbook_pages, gallery_images).
 * Nếu không có trang ảnh thật, trả về mảng rỗng [] - TUYỆT ĐỐI KHÔNG BỊA NỘI DUNG GIẢ!
 */
export function getBookReaderPageUrls(book?: RecommendedBook | AuthorBook | null): string[] {
  if (!book) return [];

  // 1. Nếu sách có thuộc tính pages (danh sách trang ảnh từ cơ sở dữ liệu Supabase)
  const bookPages = (book as any)?.pages;
  if (Array.isArray(bookPages) && bookPages.length > 0) {
    const valid = bookPages.filter((u: any) => typeof u === 'string' && u.trim().length > 0);
    if (valid.length > 0) {
      return deduplicatePages(valid);
    }
  }

  // 2. Nếu admin đã tải lên danh sách ảnh trang flipbook_pages
  if (Array.isArray(book.flipbook_pages) && book.flipbook_pages.length > 0) {
    const valid = book.flipbook_pages.filter((u) => typeof u === 'string' && u.trim().length > 0);
    if (valid.length > 0) {
      return deduplicatePages(valid);
    }
  }

  // 3. Nếu có bộ sưu tập ảnh bên trong gallery_images
  if (Array.isArray(book.gallery_images) && book.gallery_images.length > 0) {
    const valid = book.gallery_images.filter((u) => typeof u === 'string' && u.trim().length > 0);
    if (valid.length > 0) {
      return deduplicatePages(valid);
    }
  }

  // Không có ảnh trang thật -> trả về mảng rỗng []
  return [];
}

/**
 * Phân loại chính xác nguồn nội dung THẬT của sách:
 * 1. Có ảnh trang thật (pages, flipbook_pages, gallery_images) -> kind: 'pages'
 * 2. Có tệp sách thật (file_url / pdf_url: epub, pdf, cbz, txt, docx) -> kind: 'file'
 * 3. Không có nội dung số hóa -> kind: 'empty'
 */
export function getBookContent(book?: RecommendedBook | AuthorBook | null): BookContent {
  if (!book) return { kind: 'empty', reason: 'no-content' };

  // Ưu tiên 1: Trang ảnh thật
  const pages = getBookReaderPageUrls(book);
  if (pages.length > 0) {
    return { kind: 'pages', urls: pages };
  }

  // Ưu tiên 2: Tệp sách thật
  const rawFileUrl =
    (book as any).file_url ||
    (book as any).fileUrl ||
    (book as any).pdf_url ||
    (book as any).pdfUrl;
  const fileName = (book as any).file_name || (book as any).fileName || '';

  if (rawFileUrl && typeof rawFileUrl === 'string' && rawFileUrl.trim().length > 0) {
    const url = rawFileUrl.trim();
    const lower = `${url} ${fileName}`.toLowerCase();
    let format: 'epub' | 'pdf' | 'cbz' | 'txt' | 'docx' = 'pdf';
    if (lower.includes('.epub')) format = 'epub';
    else if (lower.includes('.cbz') || lower.includes('.cbr')) format = 'cbz';
    else if (lower.includes('.txt')) format = 'txt';
    else if (lower.includes('.docx')) format = 'docx';
    else if (lower.includes('.pdf')) format = 'pdf';

    return { kind: 'file', url, format };
  }

  // Không có nội dung thật
  return { kind: 'empty', reason: 'no-content' };
}
