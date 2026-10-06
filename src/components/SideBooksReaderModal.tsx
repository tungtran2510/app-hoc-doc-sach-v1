'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  BookOpen,
  ArrowLeftRight,
  ArrowUpDown,
  ListOrdered,
  ZoomIn,
  ZoomOut,
  X,
} from 'lucide-react';
import SideBooksReaderEngine, {
  SideBooksReaderEngineRef,
} from './SideBooksReaderEngine';

export interface SideBooksReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  author?: string | null;
  pages: string[];
  initialPage?: number;
}

export default function SideBooksReaderModal({
  isOpen,
  onClose,
  title,
  author,
  pages,
  initialPage = 0,
}: SideBooksReaderModalProps) {
  const readerRef = useRef<SideBooksReaderEngineRef>(null);

  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [readingTheme, setReadingTheme] = useState<'dark' | 'sepia' | 'ivory'>('sepia');
  const [readingMode, setReadingMode] = useState<'curl' | 'roll' | 'scroll'>('curl');
  const [showHud, setShowHud] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [showTocModal, setShowTocModal] = useState<boolean>(false);

  const totalPages = pages.length;

  // Chống nháy lặp khi sự kiện click chạm từ canvas lan ra vùng bao quanh
  const lastToggleHudRef = useRef<number>(0);
  const toggleHud = () => {
    const now = Date.now();
    if (now - lastToggleHudRef.current < 260) return;
    lastToggleHudRef.current = now;
    setShowHud((prev) => !prev);
  };

  // Tự động ẩn thanh công cụ khi mở sách và đồng bộ cài đặt đọc sách từ localStorage
  useEffect(() => {
    if (!isOpen) return;
    setShowHud(false);
    try {
      const savedTheme = localStorage.getItem('reader_theme_pref');
      if (savedTheme && ['dark', 'sepia', 'ivory'].includes(savedTheme)) {
        setReadingTheme(savedTheme as any);
      }
      const savedMode = localStorage.getItem('reader_mode_pref');
      if (savedMode && ['curl', 'roll', 'scroll'].includes(savedMode)) {
        setReadingMode(savedMode as any);
      }

      // Tự động ghi nhớ trang đọc dở (nếu bật)
      const autoResume = localStorage.getItem('reader_autoresume_pref') !== 'false';
      if (autoResume && title) {
        const savedPage =
          localStorage.getItem(`last_read_page_${title}`) ||
          localStorage.getItem(`bookmark_page_${title}`);
        if (savedPage !== null) {
          const p = parseInt(savedPage, 10);
          if (!isNaN(p) && p >= 0 && p < pages.length) {
            setCurrentPage(p);
          }
        } else if (initialPage > 0) {
          setCurrentPage(initialPage);
        }
      } else if (initialPage > 0) {
        setCurrentPage(initialPage);
      }
    } catch {}
  }, [isOpen, title, pages.length, initialPage]);

  // Ngăn chặn nút Back của trình duyệt / cử chỉ vuốt back làm mất trang đột ngột
  useEffect(() => {
    if (!isOpen) return;

    try {
      window.history.pushState({ qbiz_reader_active: true }, '');
    } catch {}

    const handlePopState = () => {
      // Khi người dùng bấm nút back của điện thoại hoặc vuốt back mép màn hình:
      setShowExitConfirm(true);
      try {
        window.history.pushState({ qbiz_reader_active: true }, '');
      } catch {}
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Ghi nhớ cuốn sách vừa đọc và trang hiện tại
      try {
        localStorage.setItem(`last_read_page_${title}`, currentPage.toString());
        localStorage.setItem(`bookmark_page_${title}`, currentPage.toString());
        localStorage.setItem('last_read_book_title', title);
      } catch {}
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, currentPage, title]);

  // Kiểm tra trang hiện tại có đang được đánh dấu Bookmark không
  useEffect(() => {
    try {
      const marksRaw = localStorage.getItem(`bookmarks_list_${title}`);
      if (marksRaw) {
        const marks: number[] = JSON.parse(marksRaw);
        setIsBookmarked(marks.includes(currentPage));
      } else {
        setIsBookmarked(false);
      }
    } catch {
      setIsBookmarked(false);
    }
  }, [currentPage, title]);

  const toggleBookmark = () => {
    try {
      const marksRaw = localStorage.getItem(`bookmarks_list_${title}`);
      let marks: number[] = marksRaw ? JSON.parse(marksRaw) : [];
      if (marks.includes(currentPage)) {
        marks = marks.filter((p) => p !== currentPage);
        setIsBookmarked(false);
      } else {
        marks.push(currentPage);
        setIsBookmarked(true);
      }
      localStorage.setItem(`bookmarks_list_${title}`, JSON.stringify(marks));
    } catch {}
  };

  const playPaperSound = () => {
    try {
      const isSound = localStorage.getItem('reader_sound_pref') !== 'false';
      if (!isSound) return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const bufferSize = Math.floor(ctx.sampleRate * 0.08);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1400;
      filter.Q.value = 1.1;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } catch {}
  };

  if (!isOpen || pages.length === 0) return null;

  const themeClasses = {
    gray: 'bg-[#5c6168] text-white',
    dark: 'bg-[#0a0d14] text-slate-100',
    sepia: 'bg-[#22170e] text-[#f4ecd8]',
    ivory: 'bg-[#f4efe4] text-slate-900',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-[100] flex flex-col justify-between select-none animate-in fade-in duration-200 ${themeClasses[readingTheme]}`}
    >
      {/* ================= 1. HEADER (3 CHẾ ĐỘ XEM ĐƯA LÊN ĐỈNH ĐẦU GỌN GÀNG + MỤC LỤC + ZOOM + THEME) ================= */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-md px-2.5 sm:px-4 py-2 flex items-center justify-between transition-all duration-300 transform ${
          showHud ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        } ${
          readingTheme === 'ivory'
            ? 'bg-[#f4efe4]/95 text-slate-900 border-b border-black/10 shadow-md'
            : readingTheme === 'sepia'
            ? 'bg-[#1c130d]/95 text-[#f4ecd8] border-b border-amber-900/40 shadow-xl'
            : 'bg-black/90 text-slate-100 border-b border-white/10 shadow-xl'
        }`}
      >
        {/* Bên trái: Nút Back + Nút Mục lục (TOC) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowExitConfirm(true)}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-200 active:scale-95 transition-all cursor-pointer border border-white/10"
            title="Đóng sách về Kệ"
            aria-label="Đóng"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
          </button>
          <button
            type="button"
            onClick={() => setShowTocModal(true)}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-amber-300 active:scale-95 transition-all cursor-pointer border border-white/10"
            title="Mục lục chương sách"
            aria-label="Mục lục"
          >
            <ListOrdered size={16} />
          </button>
        </div>

        {/* Ở giữa: 3 BIỂU TƯỢNG CHẾ ĐỘ XEM TRÊN ĐỈNH ĐẦU GỌN GÀNG (Lật 3D ⇄ Trượt 3D ⇄ Cuộn dọc) */}
        <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-lg border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => {
              setReadingMode('curl');
              try {
                localStorage.setItem('reader_mode_pref', 'curl');
              } catch {}
            }}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
              readingMode === 'curl'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Lật sách góc 3D như thật"
            aria-label="Lật 3D"
          >
            <BookOpen size={16} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={() => {
              setReadingMode('roll');
              try {
                localStorage.setItem('reader_mode_pref', 'roll');
              } catch {}
            }}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
              readingMode === 'roll'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Vuốt trượt trang ngang 3D"
            aria-label="Trượt 3D"
          >
            <ArrowLeftRight size={16} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={() => {
              setReadingMode('scroll');
              try {
                localStorage.setItem('reader_mode_pref', 'scroll');
              } catch {}
            }}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
              readingMode === 'scroll'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Cuộn trang dọc liên tục"
            aria-label="Cuộn dọc"
          >
            <ArrowUpDown size={16} strokeWidth={2.2} />
          </button>
        </div>

        {/* Bên phải (KHU VỰC KHOANH ĐỎ): Thu Phóng (Zoom) + Bookmark + Tông màu giấy - TO RÕ ĐỒNG BỘ */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Cụm Zoom Out (-) / Zoom In (+) to rõ */}
          <div className="flex items-center bg-white/10 p-0.5 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => readerRef.current?.zoomOut?.()}
              className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-md hover:bg-white/20 flex items-center justify-center text-amber-200 active:scale-95 transition-all cursor-pointer"
              title="Thu nhỏ trang sách"
              aria-label="Thu nhỏ"
            >
              <ZoomOut size={16} strokeWidth={2.4} />
            </button>
            <button
              type="button"
              onClick={() => readerRef.current?.zoomIn?.()}
              className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-md hover:bg-white/20 flex items-center justify-center text-amber-300 active:scale-95 transition-all cursor-pointer"
              title="Phóng to trang sách"
              aria-label="Phóng to"
            >
              <ZoomIn size={16} strokeWidth={2.4} />
            </button>
          </div>

          {/* Bookmark to bằng các icon khác */}
          <button
            type="button"
            onClick={toggleBookmark}
            className={`w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
              isBookmarked
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'bg-white/10 hover:bg-white/20 text-slate-300 border border-white/10'
            }`}
            title={isBookmarked ? 'Bỏ đánh dấu trang này' : 'Đánh dấu trang này'}
            aria-label="Lưu trang"
          >
            <Bookmark size={16} strokeWidth={2.4} className={isBookmarked ? 'fill-current' : ''} />
          </button>

          {/* 3 Tông màu đọc sách (Sepia, Đêm, Sáng) - TO RÕ ĐỒNG BỘ */}
          <div className="flex items-center gap-1 bg-black/45 p-1 rounded-lg border border-white/15">
            <button
              type="button"
              onClick={() => {
                setReadingTheme('sepia');
                localStorage.setItem('reader_theme_pref', 'sepia');
              }}
              className={`w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-md flex items-center justify-center text-[13px] transition-all cursor-pointer active:scale-95 ${
                readingTheme === 'sepia'
                  ? 'bg-[#3d3327] text-amber-300 ring-1.5 ring-amber-400 shadow-sm'
                  : 'text-slate-400 hover:text-white opacity-60 hover:opacity-100'
              }`}
              title="Vàng ấm Sepia"
              aria-label="Màu Sepia"
            >
              ☕
            </button>
            <button
              type="button"
              onClick={() => {
                setReadingTheme('dark');
                localStorage.setItem('reader_theme_pref', 'dark');
              }}
              className={`w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-md flex items-center justify-center text-[13px] transition-all cursor-pointer active:scale-95 ${
                readingTheme === 'dark'
                  ? 'bg-slate-900 text-amber-300 ring-1.5 ring-amber-400 shadow-sm'
                  : 'text-slate-400 hover:text-white opacity-60 hover:opacity-100'
              }`}
              title="Đen OLED ban đêm"
              aria-label="Màu Tối Đêm"
            >
              🌑
            </button>
            <button
              type="button"
              onClick={() => {
                setReadingTheme('ivory');
                localStorage.setItem('reader_theme_pref', 'ivory');
              }}
              className={`w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-md flex items-center justify-center text-[13px] transition-all cursor-pointer active:scale-95 ${
                readingTheme === 'ivory'
                  ? 'bg-amber-100 text-slate-900 ring-1.5 ring-amber-500 shadow-sm'
                  : 'text-slate-400 hover:text-white opacity-60 hover:opacity-100'
              }`}
              title="Trắng sáng / Ngà"
              aria-label="Màu Sáng Ngà"
            >
              📜
            </button>
          </div>
        </div>
      </header>

      {/* ================= 2. KHUNG ĐỌC SÁCH TRUNG TÂM (MAX TẦNG CAO CANVAS) ================= */}
      <main
        onClick={toggleHud}
        className="flex-1 flex flex-col items-center justify-center relative w-full h-[calc(100vh-84px)] overflow-hidden cursor-pointer"
      >
        <SideBooksReaderEngine
          ref={readerRef}
          pageImages={pages}
          initialPage={currentPage}
          readingMode={readingMode}
          readingTheme={readingTheme}
          onPageChange={(page) => {
            if (page !== currentPage) {
              playPaperSound();
            }
            setCurrentPage(page);
            try {
              localStorage.setItem(`last_read_page_${title}`, page.toString());
              localStorage.setItem(`bookmark_page_${title}`, page.toString());
              localStorage.setItem('last_read_book_title', title);
            } catch {}
          }}
          onCenterClick={toggleHud}
        />
      </main>

      {/* ================= 3. THANH ĐIỀU HƯỚNG ĐÁY (TRƯỢT MƯỢT MÀ THEO SHOWHUD) ================= */}
      <footer
        className={`sticky bottom-0 z-40 backdrop-blur-md px-3 py-2 flex flex-col items-center gap-1.5 transition-all duration-300 transform ${
          showHud ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        } ${
          readingTheme === 'ivory'
            ? 'bg-[#f4efe4]/95 text-slate-900 border-t border-black/10 shadow-md'
            : readingTheme === 'sepia'
            ? 'bg-[#1c130d]/95 text-[#f4ecd8] border-t border-amber-900/40 shadow-xl'
            : 'bg-black/90 text-slate-100 border-t border-white/10 shadow-xl'
        }`}
      >
        {/* HÀNG TRÊN: MŨI TÊN MỞ TRANG, VỀ TRANG HƠI TRONG SUỐT NẰM TRÊN CÁI XEM NHANH TRANG */}
        <div className="w-full max-w-md flex items-center justify-between px-1">
          {/* Mũi tên Về trang (Trang trước) - Hơi trong suốt */}
          <button
            type="button"
            onClick={() => {
              if (currentPage <= 0) {
                setShowExitConfirm(true);
              } else {
                readerRef.current?.flipPrev();
              }
            }}
            className="px-3 py-1 rounded-full bg-black/45 hover:bg-black/75 backdrop-blur-md border border-white/15 text-amber-300/90 hover:text-amber-200 active:scale-95 transition-all flex items-center gap-1 text-[11.5px] font-bold shadow-md cursor-pointer select-none"
            title={currentPage <= 0 ? 'Thoát về kệ sách' : 'Về trang trước'}
            aria-label="Về trang"
          >
            <ChevronLeft size={16} />
            <span>Về trang</span>
          </button>

          {/* Nhãn trang sách ở giữa thanh điều khiển */}
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/10 border border-white/10 text-amber-200 text-xs font-mono font-bold shadow-inner">
            <span>Trang {currentPage + 1}</span>
            <span className="opacity-40">/</span>
            <span>{totalPages}</span>
          </div>

          {/* Mũi tên Mở trang (Trang sau) - Hơi trong suốt */}
          <button
            type="button"
            onClick={() => {
              if (currentPage >= totalPages - 1) {
                setShowExitConfirm(true);
              } else {
                readerRef.current?.flipNext();
              }
            }}
            className="px-3 py-1 rounded-full bg-black/45 hover:bg-black/75 backdrop-blur-md border border-white/15 text-amber-300/90 hover:text-amber-200 active:scale-95 transition-all flex items-center gap-1 text-[11.5px] font-bold shadow-md cursor-pointer select-none"
            title={currentPage >= totalPages - 1 ? 'Hoàn thành & Thoát sách' : 'Mở trang sau'}
            aria-label="Mở trang"
          >
            <span>Mở trang</span>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* HÀNG DƯỚI: CÁI XEM NHANH TRANG (SEEKBAR TRƯỢT SIÊU MƯỢT) */}
        <div className="w-full max-w-md flex items-center gap-2 px-1 pt-0.5">
          <span className="text-[10px] font-mono text-slate-400 w-5 text-right">
            1
          </span>
          <input
            type="range"
            min={0}
            max={totalPages - 1}
            value={currentPage}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setCurrentPage(val);
              readerRef.current?.goToPage(val);
            }}
            className="flex-1 accent-amber-500 h-1.5 bg-slate-700/80 rounded-lg cursor-pointer"
            aria-label="Xem nhanh trang"
          />
          <span className="text-[10px] font-mono text-slate-400 w-5">
            {totalPages}
          </span>
        </div>
      </footer>

      {/* ================= 4. MODAL MỤC LỤC CHƯƠNG SÁCH (TABLE OF CONTENTS) ================= */}
      {showTocModal && (
        <div
          className="fixed inset-0 z-[115] bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setShowTocModal(false)}
        >
          <div
            className="w-full sm:max-w-md max-h-[75vh] rounded-t-2xl sm:rounded-2xl bg-[#1c1109] border border-[#553622] text-[#fdf7ee] p-4 shadow-2xl flex flex-col gap-3 animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-amber-300">
                <ListOrdered size={16} />
                <h3 className="text-sm font-bold uppercase tracking-wide">
                  Mục Lục Cuốn Sách
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTocModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[55vh] flex flex-col gap-1.5 pr-1">
              {pages.map((imgUrl, pIdx) => {
                const chapterTitles = [
                  'Trang bìa & Tựa sách',
                  'Lời nói đầu & Giới thiệu',
                  'Giải phẫu học nền tảng',
                  'Cơ chế tổn thương & Dấu hiệu',
                  'Hướng dẫn chăm sóc & Điều trị',
                  'Dinh dưỡng tái tạo & Kháng viêm',
                  'Cẩm nang thực hành & Lời khuyên',
                  'Tài liệu tham khảo & Kết luận',
                ];
                const chTitle = chapterTitles[pIdx] || `Phần chuyên khảo ${pIdx + 1}`;
                const isCurrent = currentPage === pIdx;

                return (
                  <div
                    key={pIdx}
                    onClick={() => {
                      setCurrentPage(pIdx);
                      readerRef.current?.goToPage(pIdx);
                      setShowTocModal(false);
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      isCurrent
                        ? 'bg-amber-500/20 border-amber-500 text-amber-200 font-bold shadow-xs'
                        : 'bg-[#24160d] border-white/5 hover:border-amber-500/40 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-[10.5px] font-mono text-amber-300 shrink-0 font-bold">
                        {pIdx + 1}
                      </span>
                      <span className="text-xs truncate">{chTitle}</span>
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 shrink-0">
                        Đang đọc
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= 5. MODAL XÁC NHẬN THOÁT ĐỌC SÁCH - BẢO LƯU TRANG 100% ================= */}
      {showExitConfirm && (
        <div
          className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowExitConfirm(false)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-[#1c1109] border border-[#553622] text-[#fdf7ee] p-5 shadow-2xl flex flex-col items-center text-center gap-3 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <BookOpen size={22} />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-black text-amber-200 uppercase tracking-wide">
                Thoát đọc sách?
              </h3>
              <p className="text-xs text-amber-100/80 leading-relaxed">
                Tiến độ của bạn đã được tự động lưu an toàn tại{' '}
                <span className="font-bold text-amber-400">
                  Trang {currentPage + 1}/{totalPages}
                </span>.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full mt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Tiếp tục đọc
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem(`last_read_page_${title}`, currentPage.toString());
                    localStorage.setItem(`bookmark_page_${title}`, currentPage.toString());
                    localStorage.setItem('last_read_book_title', title);
                  } catch {}
                  setShowExitConfirm(false);
                  onClose();
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors cursor-pointer shadow-md"
              >
                Thoát ra
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

