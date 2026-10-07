'use client';

/**
 * Module quản lý Sổ Tay Ghi Chú & Thẻ Ghi Nhớ Flashcard (Reading Notes & Flashcards Engine)
 * Lưu trữ an toàn trong localStorage và IndexedDB của thiết bị.
 * Cho phép tạo ghi chú, phân loại màu highlight, và tự động tạo thẻ Flashcard lật 3D để ôn tập.
 */

export interface ReadingNoteItem {
  id: string;
  bookTitle: string;
  page: number; // 1-based page
  selectedText: string;
  userNote?: string;
  color: 'amber' | 'emerald' | 'blue' | 'purple' | 'rose';
  createdAt: number;
  flashcard?: {
    front: string; // Câu hỏi hoặc Khái niệm
    back: string;  // Câu trả lời hoặc Diễn giải cốt lõi
    mastered?: boolean; // Đã thuộc chưa
  };
}

const STORAGE_PREFIX = 'qbiz_reading_notes_';

export const readingNotesStorage = {
  // Lấy danh sách ghi chú của một cuốn sách
  getNotes(bookTitle: string): ReadingNoteItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + bookTitle);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  // Lưu một ghi chú mới hoặc cập nhật ghi chú
  saveNote(note: Omit<ReadingNoteItem, 'id' | 'createdAt'> & { id?: string }): ReadingNoteItem {
    const list = this.getNotes(note.bookTitle);
    const id = note.id || 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const fullNote: ReadingNoteItem = {
      ...note,
      id,
      createdAt: Date.now(),
      flashcard: note.flashcard || {
        front: note.selectedText.length > 80 ? note.selectedText.slice(0, 80) + '...' : note.selectedText,
        back: note.userNote || 'Trích đoạn cốt lõi tại trang ' + note.page,
        mastered: false,
      },
    };

    const existingIdx = list.findIndex((n) => n.id === id);
    if (existingIdx >= 0) {
      list[existingIdx] = fullNote;
    } else {
      list.unshift(fullNote);
    }

    try {
      localStorage.setItem(STORAGE_PREFIX + note.bookTitle, JSON.stringify(list));
    } catch (e) {
      console.warn('Lỗi ghi localStorage notes:', e);
    }

    return fullNote;
  },

  // Xóa một ghi chú
  deleteNote(bookTitle: string, noteId: string): void {
    const list = this.getNotes(bookTitle).filter((n) => n.id !== noteId);
    try {
      localStorage.setItem(STORAGE_PREFIX + bookTitle, JSON.stringify(list));
    } catch {}
  },

  // Cập nhật trạng thái thuộc bài của thẻ flashcard
  toggleMastered(bookTitle: string, noteId: string): boolean {
    const list = this.getNotes(bookTitle);
    const target = list.find((n) => n.id === noteId);
    if (target && target.flashcard) {
      target.flashcard.mastered = !target.flashcard.mastered;
      try {
        localStorage.setItem(STORAGE_PREFIX + bookTitle, JSON.stringify(list));
      } catch {}
      return target.flashcard.mastered;
    }
    return false;
  },

  // Lấy tất cả ghi chú trên toàn hệ thống
  getAllNotes(): ReadingNoteItem[] {
    if (typeof window === 'undefined') return [];
    const all: ReadingNoteItem[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          const val = localStorage.getItem(key);
          if (val) {
            all.push(...JSON.parse(val));
          }
        }
      }
    } catch {}
    return all.sort((a, b) => b.createdAt - a.createdAt);
  },
};
