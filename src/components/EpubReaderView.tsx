'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  List,
  Type,
  Sun,
  Moon,
  Coffee,
  Loader2,
  AlertCircle,
  X,
  BookOpen,
} from 'lucide-react';
import { parseEpub, ParsedEpubBook, EpubChapter } from '../lib/ebookEngine';

interface EpubReaderViewProps {
  fileUrl: string;
  bookTitle?: string;
  author?: string | null;
  readingTheme?: 'dark' | 'sepia' | 'ivory';
  onCenterClick?: () => void;
  onPageProgress?: (currentChapter: number, totalChapters: number) => void;
}

export default function EpubReaderView({
  fileUrl,
  bookTitle,
  author,
  readingTheme = 'sepia',
  onCenterClick,
  onPageProgress,
}: EpubReaderViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parsedBook, setParsedBook] = useState<ParsedEpubBook | null>(null);
  const [currentChapterIdx, setCurrentChapterIdx] = useState(0);
  const [fontSize, setFontSize] = useState(18); // px
  const [lineHeight, setLineHeight] = useState(1.8);
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('serif');
  const [showToc, setShowToc] = useState(false);
  const [localTheme, setLocalTheme] = useState<'dark' | 'sepia' | 'ivory'>(readingTheme);

  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setLocalTheme(readingTheme);
  }, [readingTheme]);

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(fileUrl);
        if (!res.ok) {
          throw new Error(`Không thể tải tệp EPUB (Mã lỗi ${res.status}).`);
        }

        const buffer = await res.arrayBuffer();
        if (isCancelled) return;

        const book = await parseEpub(buffer);
        if (isCancelled) return;

        setParsedBook(book);
        setCurrentChapterIdx(0);
        onPageProgress?.(1, book.chapters.length);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Lỗi nạp EPUB:', err);
          setError(err.message || 'Không thể mở tệp EPUB này.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    if (fileUrl) {
      load();
    }

    return () => {
      isCancelled = true;
    };
  }, [fileUrl]);

  const currentChapter: EpubChapter | undefined = parsedBook?.chapters[currentChapterIdx];
  const totalChapters = parsedBook?.chapters.length || 1;

  const goToChapter = (idx: number) => {
    if (!parsedBook || idx < 0 || idx >= parsedBook.chapters.length) return;
    setCurrentChapterIdx(idx);
    setShowToc(false);
    onPageProgress?.(idx + 1, parsedBook.chapters.length);
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  };

  const nextChapter = () => {
    if (currentChapterIdx < totalChapters - 1) {
      goToChapter(currentChapterIdx + 1);
    }
  };

  const prevChapter = () => {
    if (currentChapterIdx > 0) {
      goToChapter(currentChapterIdx - 1);
    }
  };

  // Vuốt chạm ngang để chuyển chương
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (diff < -70) {
      nextChapter();
    } else if (diff > 70) {
      prevChapter();
    }
  };

  // Theme Styles
  const themeStyles = {
    dark: 'bg-[#121212] text-[#d4d4d4]',
    sepia: 'bg-[#f6f1e7] text-[#2c2419]',
    ivory: 'bg-[#ffffff] text-[#1a1a1a]',
  };

  const headingColors = {
    dark: 'text-amber-400',
    sepia: 'text-[#5a3e1b]',
    ivory: 'text-slate-900',
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
        <Loader2 size={36} className="animate-spin text-amber-500" />
        <p className="text-base font-bold text-amber-200">
          Đang nạp và định dạng cuốn sách EPUB...
        </p>
        <p className="text-xs text-amber-300/70 max-w-sm">
          Hệ thống đang trích xuất mục lục, cấu trúc chương và hình ảnh chất lượng cao.
        </p>
      </div>
    );
  }

  if (error || !parsedBook) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center">
          <AlertCircle size={28} />
        </div>
        <p className="text-base font-bold text-red-200">
          {error || 'Không tìm thấy nội dung cuốn sách.'}
        </p>
        <a
          href={fileUrl}
          download
          className="mt-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors"
        >
          Tải tệp EPUB gốc về máy
        </a>
      </div>
    );
  }

  return (
    <div
      className={`w-full h-full flex flex-col relative select-text transition-colors duration-200 ${themeStyles[localTheme]}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* THANH ĐIỀU KHIỂN ĐỌC SÁCH TRÊN CÙNG */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 border-b border-black/10 dark:border-white/10 shrink-0 gap-2 text-xs">
        {/* Nút Mục Lục (TOC) */}
        <button
          type="button"
          onClick={() => setShowToc(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 transition-colors font-bold cursor-pointer shrink-0"
          title="Mục lục chương"
        >
          <List size={14} />
          <span className="hidden xs:inline">Mục lục ({totalChapters})</span>
        </button>

        {/* Tên chương hiện tại */}
        <div className="flex-1 min-w-0 text-center px-2">
          <p className="font-extrabold truncate text-[13px]">
            {currentChapter?.title || `Chương ${currentChapterIdx + 1}`}
          </p>
          <p className="text-[10px] opacity-65 truncate">
            {parsedBook.title} {author ? `· ${author}` : ''}
          </p>
        </div>

        {/* Cụm chỉnh Cỡ chữ & Theme */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Cỡ chữ */}
          <div className="flex items-center bg-black/5 dark:bg-white/10 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.max(14, s - 2))}
              className="w-7 h-7 flex items-center justify-center font-bold hover:bg-black/10 dark:hover:bg-white/10 rounded cursor-pointer"
              title="Giảm cỡ chữ"
            >
              A-
            </button>
            <span className="px-1 text-[11px] font-mono font-bold">{fontSize}</span>
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.min(28, s + 2))}
              className="w-7 h-7 flex items-center justify-center font-bold hover:bg-black/10 dark:hover:bg-white/10 rounded cursor-pointer"
              title="Tăng cỡ chữ"
            >
              A+
            </button>
          </div>

          {/* Phông chữ Serif / Sans */}
          <button
            type="button"
            onClick={() => setFontFamily((f) => (f === 'serif' ? 'sans' : 'serif'))}
            className="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center font-bold text-[11px] cursor-pointer"
            title={fontFamily === 'serif' ? 'Đổi sang phông Sans' : 'Đổi sang phông Serif'}
          >
            {fontFamily === 'serif' ? 'Serif' : 'Sans'}
          </button>
        </div>
      </div>

      {/* VÙNG NỘI DUNG CHƯƠNG SÁCH CUỘN MƯỢT MÀ */}
      <div
        ref={contentRef}
        onClick={(e) => {
          // Bấm trung tâm để toggle HUD
          const target = e.target as HTMLElement;
          if (target.tagName !== 'A' && target.tagName !== 'BUTTON') {
            const w = window.innerWidth;
            const x = e.clientX;
            if (x > w * 0.35 && x < w * 0.65) {
              onCenterClick?.();
            }
          }
        }}
        className="flex-1 overflow-y-auto px-4 sm:px-12 md:px-20 lg:px-32 py-6 sm:py-10 max-w-4xl mx-auto w-full scroll-smooth"
      >
        {currentChapter ? (
          <article
            className={`prose prose-base sm:prose-lg max-w-none leading-relaxed transition-all ${
              fontFamily === 'serif' ? 'font-serif' : 'font-sans'
            }`}
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight,
            }}
          >
            <h1
              className={`text-2xl sm:text-3xl font-extrabold mb-6 pb-3 border-b border-black/10 dark:border-white/10 ${headingColors[localTheme]}`}
            >
              {currentChapter.title}
            </h1>

            {/* Nội dung chương HTML đã làm sạch */}
            <div
              className="epub-rendered-content space-y-4"
              dangerouslySetInnerHTML={{ __html: currentChapter.htmlContent }}
            />
          </article>
        ) : (
          <p className="text-center py-12 text-sm opacity-70">Chưa có nội dung chương này.</p>
        )}

        {/* NÚT CHUYỂN CHƯƠNG CUỐI BÀI */}
        <div className="flex items-center justify-between gap-3 pt-10 pb-16 mt-8 border-t border-black/10 dark:border-white/10 text-xs sm:text-sm font-bold">
          <button
            type="button"
            onClick={prevChapter}
            disabled={currentChapterIdx <= 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
          >
            <ChevronLeft size={16} />
            <span>Chương trước</span>
          </button>

          <span className="opacity-60 text-xs">
            {currentChapterIdx + 1} / {totalChapters}
          </span>

          <button
            type="button"
            onClick={nextChapter}
            disabled={currentChapterIdx >= totalChapters - 1}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95 shadow-xs"
          >
            <span>Chương tiếp</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* MODAL MỤC LỤC CHƯƠNG (TOC MODAL) */}
      {showToc && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowToc(false)}
        >
          <div
            className="w-full max-w-md max-h-[80vh] rounded-2xl bg-white dark:bg-[#1a1228] text-ink p-4 sm:p-5 flex flex-col shadow-2xl border border-line"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-line shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-primary" />
                <h3 className="text-base font-extrabold text-ink">
                  Mục Lục Cuốn Sách ({totalChapters} chương)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowToc(false)}
                className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center text-muted hover:text-ink cursor-pointer"
                aria-label="Đóng mục lục"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2 divide-y divide-line/60">
              {parsedBook.chapters.map((ch, idx) => (
                <button
                  key={ch.id || idx}
                  type="button"
                  onClick={() => goToChapter(idx)}
                  className={`w-full text-left p-3 rounded-xl flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    idx === currentChapterIdx
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'hover:bg-surface-2 text-ink/90'
                  }`}
                >
                  <span className="text-xs sm:text-[13px] line-clamp-1">
                    {idx + 1}. {ch.title}
                  </span>
                  {idx === currentChapterIdx && (
                    <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-primary text-white">
                      Đang đọc
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
