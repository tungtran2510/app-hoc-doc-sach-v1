'use client';

export interface UserShelfBookItem {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  fileUrl?: string;
  format?: string;
  badgeTag?: string;
  description?: string;
  addedAt: number;
}

const SHELF_STORAGE_KEY = 'qbiz_user_custom_shelf';

export const userShelfStorage = {
  /** Lấy danh sách tất cả các cuốn sách người dùng đã thêm vào Kệ */
  getAll(): UserShelfBookItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(SHELF_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  /** Kiểm tra một cuốn sách đã có trên Kệ hay chưa */
  isOnShelf(bookId: string): boolean {
    if (!bookId || typeof window === 'undefined') return false;
    const list = this.getAll();
    return list.some((b) => b.id === bookId);
  },

  /** Thêm một cuốn sách vào Kệ sách */
  add(book: {
    id: string;
    title: string;
    author: string;
    coverUrl?: string;
    fileUrl?: string;
    format?: string;
    badgeTag?: string;
    description?: string;
  }): boolean {
    if (typeof window === 'undefined' || !book?.id) return false;
    try {
      const list = this.getAll();
      if (list.some((b) => b.id === book.id)) {
        return true; // Đã có sẵn trên kệ
      }

      const item: UserShelfBookItem = {
        id: book.id,
        title: book.title,
        author: book.author || 'Tác giả',
        coverUrl: book.coverUrl || '',
        fileUrl: book.fileUrl || '',
        format: book.format || 'epub',
        badgeTag: book.badgeTag || 'KỆ SÁCH',
        description: book.description || '',
        addedAt: Date.now(),
      };

      const updated = [item, ...list];
      localStorage.setItem(SHELF_STORAGE_KEY, JSON.stringify(updated));

      // Bắn sự kiện toàn cục để trang chủ Kệ sách & trang Đã lưu cập nhật ngay lập tức
      window.dispatchEvent(
        new CustomEvent('qbiz_book_added_to_shelf', {
          detail: { book: item },
        })
      );

      return true;
    } catch (err) {
      console.error('Lỗi khi thêm sách vào kệ:', err);
      return false;
    }
  },

  /** Xóa một cuốn sách khỏi Kệ sách */
  remove(bookId: string): boolean {
    if (typeof window === 'undefined' || !bookId) return false;
    try {
      const list = this.getAll();
      const updated = list.filter((b) => b.id !== bookId);
      localStorage.setItem(SHELF_STORAGE_KEY, JSON.stringify(updated));

      window.dispatchEvent(
        new CustomEvent('qbiz_book_removed_from_shelf', {
          detail: { bookId },
        })
      );

      return true;
    } catch {
      return false;
    }
  },
};
