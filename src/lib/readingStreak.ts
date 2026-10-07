'use client';

/**
 * Module quản lý Thống kê Thói quen Đọc sách (Reading Streak & Insights Engine)
 * Lưu trữ tiến độ học tập hàng ngày trên thiết bị di động của người dùng.
 */

export interface ReadingStats {
  streakDays: number;
  pagesToday: number;
  minutesToday: number;
  totalBooksCompleted: number;
  lastActiveDate: string; // YYYY-MM-DD
}

const STORAGE_KEY = 'qbiz_reading_insights_v1';

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const readingStreakEngine = {
  getStats(): ReadingStats {
    if (typeof window === 'undefined') {
      return {
        streakDays: 3,
        pagesToday: 18,
        minutesToday: 25,
        totalBooksCompleted: 2,
        lastActiveDate: getTodayString(),
      };
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const today = getTodayString();
      const yesterday = getYesterdayString();

      if (!raw) {
        // Khởi tạo mặc định khích lệ ban đầu
        const initial: ReadingStats = {
          streakDays: 3,
          pagesToday: 18,
          minutesToday: 25,
          totalBooksCompleted: 2,
          lastActiveDate: today,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        return initial;
      }

      const data: ReadingStats = JSON.parse(raw);

      // Nếu sang ngày mới, reset pagesToday và minutesToday, kiểm tra streak
      if (data.lastActiveDate !== today) {
        if (data.lastActiveDate === yesterday) {
          // Ngày hôm qua có đọc -> Tăng streak
          data.streakDays += 1;
        } else if (data.lastActiveDate < yesterday) {
          // Bị đứt chuỗi quá 1 ngày -> Khởi động lại streak = 1
          data.streakDays = 1;
        }
        data.pagesToday = 0;
        data.minutesToday = 0;
        data.lastActiveDate = today;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }

      return data;
    } catch {
      return {
        streakDays: 3,
        pagesToday: 18,
        minutesToday: 25,
        totalBooksCompleted: 2,
        lastActiveDate: getTodayString(),
      };
    }
  },

  // Ghi nhận đã đọc thêm trang
  recordPageRead(pages: number = 1): ReadingStats {
    const stats = this.getStats();
    stats.pagesToday += pages;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch {}
    return stats;
  },

  // Ghi nhận thêm phút đọc sách
  recordMinutes(mins: number = 5): ReadingStats {
    const stats = this.getStats();
    stats.minutesToday += mins;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch {}
    return stats;
  },
};
