'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  BookMarked,
  Layers,
  Trash2,
  CheckCircle2,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit3,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { readingNotesStorage, ReadingNoteItem } from '../lib/readingNotes';

export interface ReaderNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle: string;
  currentPage: number; // 0-based
  initialSelectedText?: string | null;
  onJumpToPage?: (page1Based: number) => void;
  readingTheme?: 'dark' | 'sepia' | 'ivory';
}

const COLOR_CLASSES: Record<string, { border: string; bg: string; dot: string }> = {
  amber: { border: 'border-amber-500', bg: 'bg-amber-500/10', dot: 'bg-amber-500' },
  emerald: { border: 'border-emerald-500', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
  blue: { border: 'border-blue-500', bg: 'bg-blue-500/10', dot: 'bg-blue-500' },
  purple: { border: 'border-purple-500', bg: 'bg-purple-500/10', dot: 'bg-purple-500' },
  rose: { border: 'border-rose-500', bg: 'bg-rose-500/10', dot: 'bg-rose-500' },
};

export default function ReaderNotesModal({
  isOpen,
  onClose,
  bookTitle,
  currentPage,
  initialSelectedText,
  onJumpToPage,
  readingTheme = 'sepia',
}: ReaderNotesModalProps) {
  const [activeTab, setActiveTab] = useState<'notes' | 'flashcards'>('notes');
  const [notes, setNotes] = useState<ReadingNoteItem[]>([]);

  // Form thêm ghi chú
  const [newQuote, setNewQuote] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newColor, setNewColor] = useState<'amber' | 'emerald' | 'blue' | 'purple' | 'rose'>('amber');
  const [showAddForm, setShowAddForm] = useState(false);

  // State Flashcard 3D
  const [cardIdx, setCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Load danh sách ghi chú
  const loadNotes = () => {
    const list = readingNotesStorage.getNotes(bookTitle);
    setNotes(list);
  };

  useEffect(() => {
    if (isOpen) {
      loadNotes();
      if (initialSelectedText) {
        setNewQuote(initialSelectedText);
        setShowAddForm(true);
      }
    }
  }, [isOpen, bookTitle, initialSelectedText]);

  // Thêm ghi chú mới
  const handleSaveNewNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuote.trim() && !newNote.trim()) return;

    readingNotesStorage.saveNote({
      bookTitle,
      page: currentPage + 1,
      selectedText: newQuote.trim() || 'Ghi chú tự do tại trang ' + (currentPage + 1),
      userNote: newNote.trim() || undefined,
      color: newColor,
    });

    setNewQuote('');
    setNewNote('');
    setShowAddForm(false);
    loadNotes();
  };

  // Xóa ghi chú
  const handleDeleteNote = (noteId: string) => {
    if (confirm('Xóa ghi chú này khỏi sổ tay?')) {
      readingNotesStorage.deleteNote(bookTitle, noteId);
      loadNotes();
      if (cardIdx >= notes.length - 1) {
        setCardIdx(Math.max(0, notes.length - 2));
      }
    }
  };

  // Toggle đã thuộc thẻ Flashcard
  const handleToggleMastered = (noteId: string) => {
    readingNotesStorage.toggleMastered(bookTitle, noteId);
    loadNotes();
  };

  if (!isOpen) return null;

  const currentCard = notes[cardIdx];
  const masteredCount = notes.filter((n) => n.flashcard?.mastered).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[90vh] rounded-3xl bg-[#FAF6F0] dark:bg-[#1C120C] border border-amber-900/30 dark:border-amber-500/30 shadow-2xl flex flex-col overflow-hidden text-[#2A160A] dark:text-[#F5EFE6]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. HEADER MODAL */}
        <header className="p-4 border-b border-amber-900/15 dark:border-amber-500/20 bg-white/70 dark:bg-[#251810]/80 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <BookMarked size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-[#2A160A] dark:text-amber-200 uppercase tracking-wide truncate">
                Sổ Tay & Thẻ Flashcard
              </h2>
              <p className="text-[11px] text-[#6E4223] dark:text-amber-300/70 truncate">
                {bookTitle} · Trang hiện tại: {currentPage + 1}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Đóng"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </header>

        {/* 2. CHUYỂN TAB: GHI CHÚ VS FLASHCARD 3D */}
        <div className="px-4 pt-3 flex items-center justify-between gap-2 shrink-0 border-b border-amber-900/10 dark:border-amber-500/15 pb-2">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'notes'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookMarked size={13} />
              <span>Ghi chú ({notes.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('flashcards');
                setIsFlipped(false);
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'flashcards'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers size={13} />
              <span>Thẻ Flashcard ({notes.length})</span>
            </button>
          </div>

          {activeTab === 'notes' && !showAddForm && (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Tạo ghi chú</span>
            </button>
          )}
        </div>

        {/* 3. NỘI DUNG CHÍNH THEO TAB */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
          {activeTab === 'notes' ? (
            /* ================= TAB 1: GHI CHÚ ĐÃ LƯU ================= */
            <div className="flex flex-col gap-3">
              {/* Form thêm ghi chú mới */}
              {showAddForm && (
                <form
                  onSubmit={handleSaveNewNote}
                  className="p-3.5 rounded-2xl bg-white dark:bg-[#251810] border border-amber-500/40 shadow-md flex flex-col gap-2.5 animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wide flex items-center gap-1">
                      <Edit3 size={12} />
                      Ghi chú tại Trang {currentPage + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs"
                    >
                      Hủy
                    </button>
                  </div>

                  <textarea
                    rows={2}
                    value={newQuote}
                    onChange={(e) => setNewQuote(e.target.value)}
                    placeholder="Trích dẫn đoạn văn bản quan trọng..."
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] dark:bg-[#1C120C] border border-amber-900/15 dark:border-amber-500/25 text-xs text-[#2A160A] dark:text-amber-100 placeholder:text-slate-500 focus:outline-none focus:ring-1.5 focus:ring-amber-500 resize-none"
                  />

                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Cảm nghĩ, đúc kết bài học hoặc lưu ý cá nhân (tùy chọn)..."
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] dark:bg-[#1C120C] border border-amber-900/15 dark:border-amber-500/25 text-xs text-[#2A160A] dark:text-amber-100 placeholder:text-slate-500 focus:outline-none focus:ring-1.5 focus:ring-amber-500"
                  />

                  {/* Chọn màu Highlight */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Màu thẻ:</span>
                      {(['amber', 'emerald', 'blue', 'purple', 'rose'] as const).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewColor(c)}
                          className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                            COLOR_CLASSES[c].dot
                          } ${newColor === c ? 'scale-125 ring-2 ring-black dark:ring-white' : 'opacity-70 hover:opacity-100'}`}
                          title={`Màu ${c}`}
                        />
                      ))}
                    </div>

                    <button
                      type="submit"
                      disabled={!newQuote.trim() && !newNote.trim()}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-40"
                    >
                      Lưu ghi chú
                    </button>
                  </div>
                </form>
              )}

              {/* Danh sách ghi chú */}
              {notes.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white/50 dark:bg-[#251810]/50 border border-dashed border-amber-900/20 dark:border-amber-500/20 flex flex-col items-center justify-center text-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <BookMarked size={22} />
                  </div>
                  <p className="text-xs font-bold text-[#2A160A] dark:text-amber-200">
                    Chưa có ghi chú nào cho cuốn sách này
                  </p>
                  <p className="text-[11px] text-[#6E4223] dark:text-amber-300/70 max-w-xs leading-relaxed">
                    Bấm nút <span className="font-bold text-amber-700 dark:text-amber-300">"Tạo ghi chú"</span> ở trên hoặc bôi đen văn bản khi đang đọc sách để lưu các đúc kết quan trọng!
                  </p>
                </div>
              ) : (
                notes.map((note) => {
                  const colorConfig = COLOR_CLASSES[note.color] || COLOR_CLASSES.amber;
                  return (
                    <div
                      key={note.id}
                      className={`p-3.5 rounded-2xl bg-white dark:bg-[#251810] border-l-4 ${colorConfig.border} border border-amber-900/10 dark:border-amber-500/20 shadow-xs flex flex-col gap-2 group transition-all`}
                    >
                      <div className="flex items-center justify-between text-[10.5px]">
                        <button
                          type="button"
                          onClick={() => {
                            onJumpToPage?.(note.page);
                            onClose();
                          }}
                          className="font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <BookOpen size={11} />
                          <span>Trang {note.page} (Nhấn để đến)</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 dark:text-slate-400">
                            {new Date(note.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            title="Xóa ghi chú"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Trích dẫn */}
                      <p className="text-xs italic text-[#4A2612] dark:text-amber-100 leading-relaxed bg-[#FAF6F0] dark:bg-[#1C120C] p-2.5 rounded-xl border border-black/5 dark:border-white/5">
                        "{note.selectedText}"
                      </p>

                      {/* Ghi chú cá nhân */}
                      {note.userNote && (
                        <p className="text-xs text-[#2A160A] dark:text-amber-200/90 font-medium leading-relaxed pl-1">
                          ✍️ <span className="font-bold">Ghi chú:</span> {note.userNote}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* ================= TAB 2: THẺ GHI NHỚ FLASHCARD 3D ================= */
            <div className="flex flex-col items-center justify-center gap-4 py-2">
              {notes.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Layers size={22} />
                  </div>
                  <p className="text-xs font-bold text-[#2A160A] dark:text-amber-200">
                    Chưa có thẻ Flashcard nào
                  </p>
                  <p className="text-[11px] text-[#6E4223] dark:text-amber-300/70 max-w-xs">
                    Mỗi ghi chú bạn tạo ở Tab 1 sẽ tự động trở thành một thẻ Flashcard 3D giúp bạn ôn tập ghi nhớ kiến thức cốt lõi.
                  </p>
                </div>
              ) : currentCard ? (
                <div className="w-full flex flex-col items-center gap-3">
                  {/* Thanh tiến độ ôn tập */}
                  <div className="w-full flex items-center justify-between text-xs font-bold px-1">
                    <span className="text-slate-500 dark:text-slate-400">
                      Thẻ {cardIdx + 1} / {notes.length}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono">
                      <CheckCircle2 size={13} />
                      Đã thuộc: {masteredCount}/{notes.length}
                    </span>
                  </div>

                  {/* THẺ FLASHCARD 3D FLIP */}
                  <div
                    onClick={() => setIsFlipped((f) => !f)}
                    className="w-full aspect-[4/3] sm:aspect-[16/10] rounded-3xl bg-white dark:bg-[#251810] border-2 border-amber-500/40 shadow-xl p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:border-amber-500 active:scale-98 select-none relative overflow-hidden group"
                  >
                    {/* Badge góc trên */}
                    <div className="flex items-center justify-between w-full">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-800 dark:text-amber-300">
                        {isFlipped ? 'Mặt sau: Lời giải & Đúc kết' : 'Mặt trước: Khái niệm cốt lõi'}
                      </span>
                      <span className="text-[11px] font-bold text-[#6E4223] dark:text-amber-300/70">
                        Trang {currentCard.page}
                      </span>
                    </div>

                    {/* Nội dung trung tâm thẻ */}
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-4">
                      {isFlipped ? (
                        <div className="flex flex-col gap-2 animate-in fade-in">
                          <p className="text-sm sm:text-base font-bold text-emerald-800 dark:text-emerald-300 leading-relaxed">
                            {currentCard.userNote || currentCard.flashcard?.back || currentCard.selectedText}
                          </p>
                          <p className="text-[11px] text-[#6E4223] dark:text-amber-300/70 italic line-clamp-2">
                            "{currentCard.selectedText}"
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 animate-in fade-in">
                          <p className="text-base sm:text-lg font-black text-[#2A160A] dark:text-amber-100 leading-snug">
                            {currentCard.flashcard?.front || currentCard.selectedText}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Hướng dẫn góc dưới */}
                    <div className="flex items-center justify-between w-full text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 group-hover:text-amber-600 transition-colors">
                        <RotateCw size={12} className="animate-spin-once" />
                        Chạm để lật thẻ
                      </span>
                      {currentCard.flashcard?.mastered && (
                        <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                          <CheckCircle2 size={12} />
                          Đã thuộc
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Nút điều hướng & Đánh dấu thuộc */}
                  <div className="flex items-center justify-between w-full pt-1 px-1 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsFlipped(false);
                        setCardIdx((i) => Math.max(0, i - 1));
                      }}
                      disabled={cardIdx === 0}
                      className="px-3 py-2 rounded-xl bg-white dark:bg-[#251810] border border-amber-900/15 dark:border-amber-500/25 text-xs font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft size={15} />
                      <span className="hidden xs:inline">Trước</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleMastered(currentCard.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 ${
                        currentCard.flashcard?.mastered
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      }`}
                    >
                      <CheckCircle2 size={14} />
                      <span>{currentCard.flashcard?.mastered ? 'Đã thuộc ✓' : 'Đánh dấu đã thuộc'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsFlipped(false);
                        setCardIdx((i) => Math.min(notes.length - 1, i + 1));
                      }}
                      disabled={cardIdx === notes.length - 1}
                      className="px-3 py-2 rounded-xl bg-white dark:bg-[#251810] border border-amber-900/15 dark:border-amber-500/25 text-xs font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                    >
                      <span className="hidden xs:inline">Tiếp</span>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
