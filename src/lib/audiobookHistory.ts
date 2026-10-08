'use client';

export interface AudiobookHistoryItem {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  audioUrl: string;
  fallbackUrl?: string;
  audioNarrator?: string;
  durationFormatted?: string;
  currentTime: number; // Điểm dừng nghe tính theo giây
  duration: number; // Tổng thời lượng tính theo giây
  percent: number; // % đã nghe (0 - 100)
  lastListenedAt: number; // Timestamp lần nghe gần nhất
}

const AUDIOBOOK_HISTORY_KEY = 'qbiz_audiobook_history_v1';

/**
 * Ghi nhận tiến độ nghe sách nói vào lịch sử nghe chuyên nghiệp
 */
export function recordAudiobookListening(item: {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  audioUrl: string;
  fallbackUrl?: string;
  audioNarrator?: string;
  durationFormatted?: string;
  currentTime: number;
  duration: number;
}): void {
  if (typeof window === 'undefined' || !item.id || !item.title) return;

  try {
    const cur = Math.max(0, item.currentTime || 0);
    const dur = Math.max(0, item.duration || 0);
    const pct = dur > 0 ? Math.min(100, Math.round((cur / dur) * 100)) : 0;

    // Lưu riêng lẻ theo ID để khôi phục nhanh
    localStorage.setItem(`audiobook_progress_${item.id}`, cur.toString());

    // Nạp danh sách lịch sử
    const raw = localStorage.getItem(AUDIOBOOK_HISTORY_KEY);
    let list: AudiobookHistoryItem[] = raw ? JSON.parse(raw) : [];

    // Tìm và cập nhật hoặc thêm mới vào đầu danh sách
    const existingIndex = list.findIndex((h) => h.id === item.id || h.title === item.title);

    const historyEntry: AudiobookHistoryItem = {
      id: item.id,
      title: item.title,
      author: item.author,
      coverUrl: item.coverUrl,
      audioUrl: item.audioUrl,
      fallbackUrl: item.fallbackUrl,
      audioNarrator: item.audioNarrator,
      durationFormatted: item.durationFormatted,
      currentTime: cur,
      duration: dur,
      percent: pct,
      lastListenedAt: Date.now(),
    };

    if (existingIndex >= 0) {
      list.splice(existingIndex, 1);
    }

    list.unshift(historyEntry);

    // Giữ tối đa 30 mục gần nhất
    list = list.slice(0, 30);

    localStorage.setItem(AUDIOBOOK_HISTORY_KEY, JSON.stringify(list));

    // Phát sự kiện cập nhật lịch sử nghe cho toàn bộ giao diện
    window.dispatchEvent(
      new CustomEvent('qbiz_audiobook_history_updated', {
        detail: { item: historyEntry, history: list },
      })
    );
  } catch (e) {
    console.warn('Lỗi lưu lịch sử nghe sách nói:', e);
  }
}

/**
 * Lấy danh sách lịch sử nghe sách nói
 */
export function getAudiobookHistory(): AudiobookHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(AUDIOBOOK_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Lấy tác phẩm sách nói đang nghe dở gần nhất
 */
export function getLastListenedAudiobook(): AudiobookHistoryItem | null {
  const history = getAudiobookHistory();
  if (history.length === 0) return null;
  // Lấy cuốn nghe gần nhất chưa hoàn thành (>0 giây và <99%)
  return history.find((h) => h.currentTime > 5 && h.percent < 98) || history[0];
}

/**
 * Xóa 1 cuốn khỏi lịch sử nghe
 */
export function removeAudiobookFromHistory(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(AUDIOBOOK_HISTORY_KEY);
    if (!raw) return;
    let list: AudiobookHistoryItem[] = JSON.parse(raw);
    list = list.filter((h) => h.id !== id);
    localStorage.setItem(AUDIOBOOK_HISTORY_KEY, JSON.stringify(list));
    localStorage.removeItem(`audiobook_progress_${id}`);
    window.dispatchEvent(new CustomEvent('qbiz_audiobook_history_updated', { detail: { removedId: id } }));
  } catch {}
}

/**
 * Xóa toàn bộ lịch sử nghe sách nói
 */
export function clearAllAudiobookHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUDIOBOOK_HISTORY_KEY);
    window.dispatchEvent(new CustomEvent('qbiz_audiobook_history_updated', { detail: { cleared: true } }));
  } catch {}
}

/**
 * Định dạng số giây sang định dạng "hh:mm:ss" hoặc "mm:ss"
 */
export function formatAudioSeconds(sec: number): string {
  if (isNaN(sec) || sec < 0) return '00:00';
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
