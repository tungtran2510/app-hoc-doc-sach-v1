'use client';

import { offlineStorage } from './offlineStorage';
import { detectEbookFormat, EbookFormat } from './ebookEngine';
import { RecommendedBook } from './types';

export interface CuratedCoverTemplate {
  id: string;
  name: string;
  url: string;
  color: string;
}

export const CURATED_COVER_TEMPLATES: CuratedCoverTemplate[] = [
  {
    id: 'cover_bordeaux',
    name: 'Đỏ Bordeaux (Dinh dưỡng & Khớp)',
    url: '/documents/covers/cover_hieu_dung_ve_cot_song.png',
    color: '#6b1724',
  },
  {
    id: 'cover_emerald',
    name: 'Xanh Cẩm Thạch (Cột sống & Đĩa đệm)',
    url: '/documents/covers/cover_cam_nang_dot_song_co.png',
    color: '#0d4a3e',
  },
  {
    id: 'cover_navy',
    name: 'Xanh Hoàng Gia (Atlas Giải Phẫu)',
    url: '/documents/covers/cover_atlas_giai_phau.png',
    color: '#122e54',
  },
  {
    id: 'cover_amber',
    name: 'Nâu Cổ Điển (Y học thường thức)',
    url: '/documents/covers/cover_sach_3d_co_the.png',
    color: '#422410',
  },
];

const OVERRIDES_KEY = 'user_book_metadata_overrides';

export interface BookMetadataOverride {
  title?: string;
  author?: string | null;
  coverUrl?: string | null;
  category?: string | null;
  updatedAt?: number;
}

/**
 * Lấy toàn bộ bản ghi đè tiêu đề/tác giả/bìa sách của người dùng
 */
export function getAllBookOverrides(): Record<string, BookMetadataOverride> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Áp dụng bản ghi đè thông tin lên cuốn sách nếu người dùng đã tùy biến
 */
export function applyBookOverride<T extends { id?: string; title: string; author?: string | null; cover_url?: string | null; category?: string | null }>(
  book: T
): T {
  if (!book || typeof window === 'undefined') return book;
  const overrides = getAllBookOverrides();
  const ov = (book.id && overrides[book.id]) || overrides[book.title];
  if (!ov) return book;

  return {
    ...book,
    title: ov.title?.trim() || book.title,
    author: ov.author !== undefined ? ov.author : book.author,
    cover_url: ov.coverUrl !== undefined ? ov.coverUrl : book.cover_url,
    category: ov.category !== undefined ? ov.category : book.category,
  };
}

/**
 * Cập nhật thông tin tiêu đề, tác giả, ảnh bìa cho cuốn sách (tự động lưu Offline + LocalStorage)
 */
export async function saveBookMetadataOverride(
  bookIdOrTitle: string,
  updates: {
    title?: string;
    author?: string | null;
    coverUrl?: string | null;
    category?: string | null;
  }
): Promise<void> {
  if (typeof window === 'undefined') return;

  // 1. Lưu vào LocalStorage để đồng bộ vĩnh viễn trên giao diện
  try {
    const overrides = getAllBookOverrides();
    const existing = overrides[bookIdOrTitle] || {};
    overrides[bookIdOrTitle] = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };
    if (updates.title && updates.title !== bookIdOrTitle) {
      // Ghi nhớ cả key mới
      overrides[updates.title] = overrides[bookIdOrTitle];
    }
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  } catch (err) {
    console.warn('Lỗi lưu bản ghi đè sách vào localStorage:', err);
  }

  // 2. Cập nhật vào IndexedDB nếu là sách ngoại tuyến
  try {
    await offlineStorage.updateBookMetadata(bookIdOrTitle, {
      title: updates.title,
      author: updates.author,
      coverUrl: updates.coverUrl,
    });
  } catch (err) {
    console.warn('Lỗi cập nhật IndexedDB:', err);
  }

  // 3. Phát sự kiện toàn cục để mọi component (Home, Shelf, Da Luu, Tim Kiem) cập nhật ngay lập tức
  window.dispatchEvent(
    new CustomEvent('qbiz_book_metadata_updated', {
      detail: {
        id: bookIdOrTitle,
        updates,
      },
    })
  );
}

/**
 * Đưa tệp sách từ thiết bị người dùng vào bộ nhớ máy và kệ sách (.epub, .pdf, .cbz)
 */
export async function importBookFromFile(
  file: File,
  customInfo?: {
    title?: string;
    author?: string;
    coverUrl?: string;
    coverBlob?: Blob;
    category?: string;
  }
): Promise<RecommendedBook> {
  const fileName = file.name;
  const rawTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  const title = (customInfo?.title && customInfo.title.trim()) || rawTitle;
  const author = (customInfo?.author && customInfo.author.trim()) || 'Sách của bạn';
  const category = (customInfo?.category && customInfo.category.trim()) || 'Sách tự thêm';
  const format: EbookFormat = detectEbookFormat(fileName);

  const bookId = `imported-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const fakeFileUrl = `local-blob://${bookId}/${encodeURIComponent(fileName)}`;
  const coverUrl = customInfo?.coverUrl || CURATED_COVER_TEMPLATES[0].url;

  // Lưu nguyên bản vào IndexedDB
  await offlineStorage.saveBookToOffline({
    id: bookId,
    title,
    author,
    coverUrl,
    coverBlob: customInfo?.coverBlob || null,
    fileUrl: fakeFileUrl,
    fileName,
    fileBlob: file,
    totalPages: format === 'pdf' ? 10 : 3,
  });

  const importedBook: RecommendedBook = {
    id: bookId,
    title,
    author,
    category,
    badge_tag: format.toUpperCase(),
    cover_url: coverUrl,
    description: `Tệp ${format.toUpperCase()} từ máy (${(file.size / (1024 * 1024)).toFixed(1)} MB) • Đọc ngoại tuyến`,
    pages: [],
    file_url: fakeFileUrl,
    pdf_url: fakeFileUrl,
    file_name: fileName,
    is_visible: true,
  };

  // Phát tín hiệu toàn cục cho toàn hệ thống
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('qbiz_book_downloaded', {
        detail: { book: importedBook },
      })
    );
  }

  return importedBook;
}
