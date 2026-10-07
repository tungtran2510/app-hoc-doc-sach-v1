'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Award,
} from 'lucide-react';
import { ReadingNoteItem, readingNotesStorage } from '../lib/readingNotes';

interface FlashcardStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: ReadingNoteItem[];
  onNotesUpdated?: () => void;
}

export default function FlashcardStudyModal({
  isOpen,
  onClose,
  notes,
  onNotesUpdated,
}: FlashcardStudyModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Lọc danh sách thẻ học hợp lệ
  const activeNotes = notes.length > 0 ? notes : [];
  const currentCard = activeNotes[currentIndex];

  useEffect(() => {
    setIsFlipped(false);
  }, [currentIndex]);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setIsFlipped(false);
      setCompleted(false);
    }
  }, [isOpen]);

  if (!isOpen || activeNotes.length === 0) return null;

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (currentIndex < activeNotes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCompleted(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleMarkMastered = (mastered: boolean) => {
    if (!currentCard) return;
    readingNotesStorage.toggleMastered(currentCard.bookTitle, currentCard.id);
    if (currentCard.flashcard) {
      currentCard.flashcard.mastered = mastered;
    }
    if (onNotesUpdated) onNotesUpdated();
    handleNext();
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setCompleted(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] bg-[#1A0F08] border border-amber-900/40 rounded-3xl p-4 sm:p-5 flex flex-col gap-4 text-white shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. HEADER: TIÊU ĐỀ + TIẾN ĐỘ + NÚT ĐÓNG */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <h3 className="text-sm font-extrabold text-amber-200 tracking-wide uppercase">
              ÔN TẬP FLASHCARD 3D
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {currentIndex + 1} / {activeNotes.length}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Đóng modal"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* VẠCH TIẾN ĐỘ */}
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / activeNotes.length) * 100}%` }}
          />
        </div>

        {/* 2. MÀN HÌNH HOÀN THÀNH KHI ĐÃ HẾT BỘ THẺ */}
        {completed ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-lg">
              <Award size={32} />
            </div>
            <h4 className="text-base font-black text-amber-100">
              Xuất sắc! Đã hoàn thành ôn tập
            </h4>
            <p className="text-xs text-amber-200/70 max-w-xs leading-relaxed">
              Bạn đã ôn luyện qua toàn bộ {activeNotes.length} trích đoạn và khái niệm y khoa cốt lõi. Hãy duy trì thói quen mỗi ngày!
            </p>
            <div className="flex items-center gap-2 mt-3 w-full">
              <button
                type="button"
                onClick={handleRestart}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <RotateCw size={14} />
                <span>Ôn lại từ đầu</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        ) : (
          /* 3. KHỐI THẺ FLASHCARD 3D LẬT TRANG */
          <>
            <div
              className="relative w-full aspect-[1/1.22] cursor-pointer"
              style={{ perspective: '1000px' }}
              onClick={handleFlip}
            >
              <div
                className="w-full h-full relative rounded-2xl transition-transform duration-500 shadow-xl"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* MẶT TRƯỚC (FRONT): CÂU HỎI / KHÁI NIỆM TRÍCH ĐOẠN */}
                <div
                  className="absolute inset-0 w-full h-full rounded-2xl p-4 sm:p-5 flex flex-col justify-between bg-gradient-to-br from-[#2E190E] to-[#1E0F07] border border-amber-500/30 text-white"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Mặt 1: Khái niệm cốt lõi
                    </span>
                    <span className="text-[10px] text-amber-200/60 truncate max-w-[150px]">
                      {currentCard?.bookTitle}
                    </span>
                  </div>

                  <div className="my-auto py-2">
                    <p className="text-sm sm:text-base font-serif italic text-amber-100 leading-relaxed text-center">
                      “{currentCard?.selectedText}”
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10.5px] text-amber-200/50 pt-2 border-t border-white/10">
                    <span>Trang {currentCard ? currentCard.page + 1 : 1}</span>
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <RotateCw size={11} className="animate-spin-slow" />
                      Chạm để xem giải nghĩa
                    </span>
                  </div>
                </div>

                {/* MẶT SAU (BACK): LỜI GIẢI / GHI NHỚ CÁ NHÂN */}
                <div
                  className="absolute inset-0 w-full h-full rounded-2xl p-4 sm:p-5 flex flex-col justify-between bg-gradient-to-br from-[#1E2E1A] to-[#101A0E] border border-emerald-500/40 text-white"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <Sparkles size={10} />
                      Mặt 2: Ứng dụng & Lời khuyên
                    </span>
                    {currentCard?.flashcard?.mastered && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                        <CheckCircle2 size={11} />
                        Đã thuộc
                      </span>
                    )}
                  </div>

                  <div className="my-auto py-2 flex flex-col gap-2">
                    <div className="text-xs sm:text-sm text-emerald-100 font-medium leading-relaxed bg-black/30 p-3 rounded-xl border border-emerald-500/20">
                      {currentCard?.userNote ||
                        'Trích đoạn y khoa cần khắc ghi để bảo vệ cột sống và điều chỉnh tư thế sinh hoạt hàng ngày.'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10.5px] text-emerald-200/60 pt-2 border-t border-white/10">
                    <span>{currentCard?.bookTitle}</span>
                    <span className="text-emerald-400 font-bold">Chạm để lật lại</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. CỤM NÚT HÀNH ĐỘNG DƯỚI THẺ */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleMarkMastered(false)}
                className="flex-1 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
              >
                <AlertCircle size={13} />
                <span>Cần ôn lại</span>
              </button>
              <button
                type="button"
                onClick={handleFlip}
                className="px-3.5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 text-xs font-bold flex items-center justify-center transition-all cursor-pointer active:scale-95"
                title="Lật thẻ"
              >
                <RotateCw size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleMarkMastered(true)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
              >
                <CheckCircle2 size={13} />
                <span>Đã thuộc ✨</span>
              </button>
            </div>

            {/* ĐIỀU HƯỚNG TRƯỚC / SAU */}
            <div className="flex items-center justify-between text-xs text-amber-200/70 pt-1">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={handlePrev}
                className="flex items-center gap-1 disabled:opacity-30 disabled:pointer-events-none hover:text-white cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span>Thẻ trước</span>
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1 hover:text-white cursor-pointer font-bold text-amber-300"
              >
                <span>{currentIndex === activeNotes.length - 1 ? 'Hoàn tất' : 'Thẻ tiếp'}</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
