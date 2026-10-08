'use client';

export interface FavoriteBookItem {
  id: string;
  title: string;
  author?: string | null;
  coverUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  format?: string | null;
  category?: string | null;
  favoritedAt: number;
}

export interface ReadingHistoryItem {
  id: string;
  bookTitle: string;
  author?: string | null;
  coverUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  format?: string | null;
  page: number; // 0-based
  totalPages: number;
  percent: number; // 0-100
  lastReadAt: number; // timestamp
}

const FAVORITES_KEY = 'qbiz_favorite_books_list_v1';
const HISTORY_KEY = 'qbiz_reading_history_list_v1';

/**
 * Kiểm tra xem cuốn sách đã được lưu vào Yêu thích chưa
 */
export function isBookFavorite(idOrTitle: string): boolean {
  if (typeof window === 'undefined' || !idOrTitle) return false;
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return false;
    const list: FavoriteBookItem[] = JSON.parse(raw);
    const target = idOrTitle.toLowerCase().trim();
    return list.some(
      (b) => b.id.toLowerCase() === target || b.title.toLowerCase() === target
    );
  } catch {
    return false;
  }
}

/**
 * Thêm hoặc Bỏ yêu thích cuốn sách
 */
export function toggleBookFavorite(book: {
  id: string;
  title: string;
  author?: string | null;
  coverUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  format?: string | null;
  category?: string | null;
}): boolean {
  if (typeof window === 'undefined' || !book?.title) return false;
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    let list: FavoriteBookItem[] = raw ? JSON.parse(raw) : [];
    const target = book.title.toLowerCase().trim();
    const existingIndex = list.findIndex(
      (b) => b.id === book.id || b.title.toLowerCase() === target
    );

    let isNowFavorite = false;
    if (existingIndex >= 0) {
      list.splice(existingIndex, 1);
      isNowFavorite = false;
    } else {
      list.unshift({
        id: book.id || `fav-${Date.now()}`,
        title: book.title,
        author: book.author || 'Tác giả',
        coverUrl: book.coverUrl || null,
        fileUrl: book.fileUrl || null,
        fileName: book.fileName || null,
        format: book.format || null,
        category: book.category || 'Yêu thích',
        favoritedAt: Date.now(),
      });
      isNowFavorite = true;
    }

    localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('qbiz_favorite_updated', { detail: { book, isFavorite: isNowFavorite } }));
    return isNowFavorite;
  } catch {
    return false;
  }
}

/**
 * Lấy toàn bộ danh sách sách Yêu thích
 */
export function getFavoriteBooks(): FavoriteBookItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Ghi nhận một phiên đọc sách vào Lịch sử Đọc (tự động cập nhật % tiến độ và thời gian)
 */
export function addReadingHistory(entry: {
  bookTitle: string;
  author?: string | null;
  coverUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  format?: string | null;
  page: number; // 0-based
  totalPages: number;
  percent?: number;
}): void {
  if (typeof window === 'undefined' || !entry?.bookTitle) return;
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    let list: ReadingHistoryItem[] = raw ? JSON.parse(raw) : [];

    const normTitle = entry.bookTitle.toLowerCase().trim();
    const totalP = Math.max(1, entry.totalPages || 1);
    const currP = Math.max(0, entry.page || 0);
    const calculatedPercent =
      entry.percent !== undefined
        ? entry.percent
        : Math.min(100, Math.max(1, Math.round(((currP + 1) / totalP) * 100)));

    // Xóa bản ghi cũ nếu đã có để đẩy bản ghi mới nhất lên đầu
    list = list.filter((item) => item.bookTitle.toLowerCase().trim() !== normTitle);

    list.unshift({
      id: `history-${Date.now()}`,
      bookTitle: entry.bookTitle,
      author: entry.author || 'Tác giả',
      coverUrl: entry.coverUrl || null,
      fileUrl: entry.fileUrl || null,
      fileName: entry.fileName || null,
      format: entry.format || null,
      page: currP,
      totalPages: totalP,
      percent: calculatedPercent,
      lastReadAt: Date.now(),
    });

    // Giới hạn 25 cuốn đọc gần nhất
    if (list.length > 25) {
      list = list.slice(0, 25);
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('qbiz_history_updated'));
  } catch {
    // ignore
  }
}

/**
 * Lấy danh sách lịch sử đọc sách
 */
export function getReadingHistory(): ReadingHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Xóa sạch lịch sử đọc sách
 */
export function clearReadingHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(HISTORY_KEY);
    window.dispatchEvent(new CustomEvent('qbiz_history_updated'));
  } catch {}
}
