import { UserProgressSyncData } from './types';
import {
  getStoredXemTiep,
  getStoredTienDo,
  getSavedPages,
  getCompletedPages,
} from './learningProgress';
import { userShelfStorage } from './userShelfStorage';
import { getAudiobookHistory } from './audiobookHistory';
import { getFavoriteBooks } from './userFavoritesHistory';

export const USER_PHONE_KEY = 'user_phone';
export const LEARNING_PROGRESS_EVENT = 'learning_progress_updated';

/**
 * Lấy số điện thoại người dùng đã lưu
 */
export function getUserPhone(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(USER_PHONE_KEY);
  } catch {
    return null;
  }
}

/**
 * Lưu số điện thoại người dùng vào localStorage
 */
export function setUserPhone(phone: string): void {
  if (typeof window === 'undefined') return;
  try {
    const clean = phone.replace(/[^0-9]/g, '');
    localStorage.setItem(USER_PHONE_KEY, clean);
  } catch {
    // Bỏ qua
  }
}

/**
 * Xóa số điện thoại đã lưu (đổi số khác / đăng xuất đồng bộ)
 */
export function clearUserPhone(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(USER_PHONE_KEY);
  } catch {
    // Bỏ qua
  }
}

/**
 * Gom toàn bộ dữ liệu học tập và đọc sách hiện có trên thiết bị này
 */
export function getLocalLearningData(): {
  xem_tiep: any;
  tien_do: any;
  bai_da_luu: any[];
  da_hoan_thanh: string[];
  reading_streak?: any;
  book_bookmarks?: Record<string, number>;
  last_read_progress?: Record<string, { page: number; total_pages?: number }>;
  last_read_book_title?: string | null;
  reading_notes?: any[];
  user_shelf?: any[];
  audiobook_history?: any[];
  favorite_books?: any[];
} {
  const bookmarks: Record<string, number> = {};
  const lastReadProgress: Record<string, { page: number; total_pages?: number }> = {};
  let lastReadBookTitle: string | null = null;
  let readingStreak: any = null;
  const readingNotes: any[] = [];

  if (typeof window !== 'undefined') {
    try {
      const streakRaw = localStorage.getItem('qbiz_reading_insights_v1');
      if (streakRaw) readingStreak = JSON.parse(streakRaw);

      lastReadBookTitle = localStorage.getItem('last_read_book_title');

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('bookmark_page_')) {
          const bookTitle = key.replace('bookmark_page_', '');
          const pageVal = parseInt(localStorage.getItem(key) || '0', 10);
          if (!isNaN(pageVal)) bookmarks[bookTitle] = pageVal;
        } else if (key && key.startsWith('last_read_page_')) {
          const bookTitle = key.replace('last_read_page_', '');
          const pageVal = parseInt(localStorage.getItem(key) || '0', 10);
          const totalVal = parseInt(localStorage.getItem(`total_pages_${bookTitle}`) || '0', 10);
          if (!isNaN(pageVal)) {
            lastReadProgress[bookTitle] = { page: pageVal, total_pages: totalVal || undefined };
          }
        } else if (key && key.startsWith('qbiz_reading_notes_')) {
          const val = localStorage.getItem(key);
          if (val) {
            try {
              const notes = JSON.parse(val);
              if (Array.isArray(notes)) readingNotes.push(...notes);
            } catch {}
          }
        }
      }
    } catch {}
  }

  return {
    xem_tiep: getStoredXemTiep(),
    tien_do: getStoredTienDo(),
    bai_da_luu: getSavedPages(),
    da_hoan_thanh: getCompletedPages(),
    reading_streak: readingStreak,
    book_bookmarks: bookmarks,
    last_read_progress: lastReadProgress,
    last_read_book_title: lastReadBookTitle,
    reading_notes: readingNotes,
    user_shelf: userShelfStorage.getAll(),
    audiobook_history: getAudiobookHistory(),
    favorite_books: getFavoriteBooks(),
  };
}

/**
 * Áp dụng dữ liệu từ đám mây vào localStorage thiết bị
 */
export function applyRemoteLearningData(data: UserProgressSyncData): void {
  if (typeof window === 'undefined' || !data) return;
  try {
    if (Array.isArray(data.bai_da_luu)) {
      localStorage.setItem('bai_da_luu', JSON.stringify(data.bai_da_luu));
    }
    if (Array.isArray(data.da_hoan_thanh)) {
      localStorage.setItem('da_hoan_thanh', JSON.stringify(data.da_hoan_thanh));
    }
    if (data.tien_do && typeof data.tien_do === 'object') {
      localStorage.setItem('tien_do', JSON.stringify(data.tien_do));
    }
    if (data.xem_tiep && typeof data.xem_tiep === 'object') {
      localStorage.setItem('xem_tiep', JSON.stringify(data.xem_tiep));
    }
    if (data.reading_streak && typeof data.reading_streak === 'object') {
      localStorage.setItem('qbiz_reading_insights_v1', JSON.stringify(data.reading_streak));
    }
    if (data.last_read_book_title && typeof data.last_read_book_title === 'string') {
      localStorage.setItem('last_read_book_title', data.last_read_book_title);
    }
    if (data.book_bookmarks && typeof data.book_bookmarks === 'object') {
      for (const [title, page] of Object.entries(data.book_bookmarks)) {
        localStorage.setItem(`bookmark_page_${title}`, page.toString());
      }
    }
    if (data.last_read_progress && typeof data.last_read_progress === 'object') {
      for (const [title, prog] of Object.entries(data.last_read_progress)) {
        if (typeof prog === 'object' && prog !== null) {
          localStorage.setItem(`last_read_page_${title}`, (prog.page ?? 0).toString());
          if (prog.total_pages) {
            localStorage.setItem(`total_pages_${title}`, prog.total_pages.toString());
          }
        }
      }
    }
    if (Array.isArray(data.reading_notes) && data.reading_notes.length > 0) {
      const byBook: Record<string, any[]> = {};
      for (const note of data.reading_notes) {
        if (note && note.bookTitle) {
          if (!byBook[note.bookTitle]) byBook[note.bookTitle] = [];
          byBook[note.bookTitle].push(note);
        }
      }
      for (const [bTitle, notes] of Object.entries(byBook)) {
        localStorage.setItem(`qbiz_reading_notes_${bTitle}`, JSON.stringify(notes));
      }
    }

    if (Array.isArray(data.user_shelf) && data.user_shelf.length > 0) {
      const currentShelf = userShelfStorage.getAll();
      const shelfMap = new Map(currentShelf.map((s) => [s.id, s]));
      for (const s of data.user_shelf) {
        if (s && s.id && !shelfMap.has(s.id)) {
          shelfMap.set(s.id, s);
        }
      }
      localStorage.setItem('qbiz_user_bookshelf_v1', JSON.stringify(Array.from(shelfMap.values())));
      window.dispatchEvent(new CustomEvent('qbiz_book_added_to_shelf'));
    }

    if (Array.isArray(data.audiobook_history) && data.audiobook_history.length > 0) {
      const currentAudio = getAudiobookHistory();
      const audioMap = new Map(currentAudio.map((a) => [a.id, a]));
      for (const a of data.audiobook_history) {
        if (a && a.id) {
          const exist = audioMap.get(a.id);
          if (!exist || (a.lastListenedAt || 0) > (exist.lastListenedAt || 0)) {
            audioMap.set(a.id, a);
          }
        }
      }
      localStorage.setItem('qbiz_audiobook_history_v1', JSON.stringify(Array.from(audioMap.values())));
      window.dispatchEvent(new CustomEvent('qbiz_audiobook_history_updated'));
    }

    if (Array.isArray(data.favorite_books) && data.favorite_books.length > 0) {
      const currentFavs = getFavoriteBooks();
      const favMap = new Map(currentFavs.map((f) => [f.id, f]));
      for (const f of data.favorite_books) {
        if (f && f.id && !favMap.has(f.id)) {
          favMap.set(f.id, f);
        }
      }
      localStorage.setItem('qbiz_favorite_books_v1', JSON.stringify(Array.from(favMap.values())));
      window.dispatchEvent(new CustomEvent('qbiz_favorite_updated'));
    }

    // Bắn sự kiện để các trang/thành phần đang mở cập nhật tức thì
    window.dispatchEvent(new CustomEvent(LEARNING_PROGRESS_EVENT, { detail: data }));
  } catch {
    // Bỏ qua
  }
}

/**
 * Gửi yêu cầu đồng bộ lên máy chủ
 */
export async function syncUserProgress(
  phone: string,
  action: 'sync' | 'get' | 'save' = 'sync'
): Promise<{ success: boolean; data?: UserProgressSyncData; error?: string }> {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (!cleanPhone || cleanPhone.length < 9 || cleanPhone.length > 11) {
    return {
      success: false,
      error: 'Số điện thoại không hợp lệ (vui lòng nhập 9 đến 11 số)',
    };
  }

  try {
    const localData = getLocalLearningData();
    const res = await fetch('/api/user/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: cleanPhone,
        action,
        localData,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return {
        success: false,
        error: json.error || 'Chưa thể đồng bộ lúc này, vui lòng thử lại sau',
      };
    }

    // Lưu lại số điện thoại và cập nhật dữ liệu gộp vào máy
    setUserPhone(cleanPhone);
    if (json.data) {
      applyRemoteLearningData(json.data);
    }

    return {
      success: true,
      data: json.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Lỗi kết nối khi đồng bộ dữ liệu',
    };
  }
}

// Bộ đệm tránh gọi sync liên tục khi người dùng lướt nhanh
let syncTimeout: any = null;

/**
 * Đồng bộ chạy ngầm khi người dùng thực hiện thao tác (lưu bài, đã hiểu, xem video)
 */
export function triggerBackgroundSync(): void {
  if (typeof window === 'undefined') return;
  const phone = getUserPhone();
  if (!phone) return;

  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(() => {
    syncUserProgress(phone, 'sync').catch(() => {
      // Bỏ qua lỗi ngầm
    });
  }, 2000);
}

// Lắng nghe sự kiện thay đổi tiến độ học tập trên toàn ứng dụng để tự động đồng bộ ngầm
if (typeof window !== 'undefined') {
  window.addEventListener('learning_progress_changed', () => {
    triggerBackgroundSync();
  });
}
