'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Headphones,
  Sparkles,
  Volume2,
  Edit3,
} from 'lucide-react';
import { parseEpub, ParsedEpubBook, EpubChapter } from '../lib/ebookEngine';
import { bookAudioPlayer, extractParagraphsFromHtml } from '../lib/audioSpeech';
import { offlineStorage } from '../lib/offlineStorage';
import {
  TypographySettings,
  DEFAULT_TYPOGRAPHY,
  getStoredTypography,
  applyBionicToHtml,
  getFontFamilyClass,
} from '../lib/typographyEngine';
import BookAudioPlayerBar from './BookAudioPlayerBar';
import ReaderTypographyModal from './ReaderTypographyModal';

interface EpubReaderViewProps {
  fileUrl: string;
  bookTitle?: string;
  author?: string | null;
  coverUrl?: string | null;
  readingTheme?: 'dark' | 'sepia' | 'ivory';
  typographySettings?: TypographySettings;
  onOpenTypographyModal?: () => void;
  onCenterClick?: () => void;
  onPageProgress?: (currentChapter: number, totalChapters: number) => void;
  onOpenAiCopilot?: (selectedText?: string) => void;
  onOpenNotesModal?: (selectedText?: string) => void;
}

export default function EpubReaderView({
  fileUrl,
  bookTitle,
  author,
  coverUrl,
  readingTheme = 'sepia',
  typographySettings,
  onOpenTypographyModal,
  onCenterClick,
  onPageProgress,
  onOpenAiCopilot,
  onOpenNotesModal,
}: EpubReaderViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parsedBook, setParsedBook] = useState<ParsedEpubBook | null>(null);
  const [currentChapterIdx, setCurrentChapterIdx] = useState(0);
  const [localTypography, setLocalTypography] = useState<TypographySettings>(() => getStoredTypography());
  const [showTypographyModal, setShowTypographyModal] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [localTheme, setLocalTheme] = useState<'dark' | 'sepia' | 'ivory'>(readingTheme);
  const [isAudioOpen, setIsAudioOpen] = useState(false);
  const [activeParagraphIdx, setActiveParagraphIdx] = useState<number | null>(null);

  const activeTypography = typographySettings || localTypography;

  // State bôi đen văn bản & Floating Tooltip Hỏi AI
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [bubbleCoords, setBubbleCoords] = useState<{ x: number; y: number } | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  // Theo dõi vùng chọn văn bản người dùng trong sách EPUB
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !contentRef.current) {
        setBubbleCoords(null);
        setSelectedText(null);
        return;
      }

      const text = sel.toString().trim();
      if (text.length >= 2 && contentRef.current.contains(sel.anchorNode)) {
        try {
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setSelectedText(text);
          setBubbleCoords({
            x: Math.max(10, Math.min(window.innerWidth - 180, rect.left + rect.width / 2 - 80)),
            y: Math.max(10, rect.top - 46),
          });
        } catch {
          // ignore
        }
      } else {
        setBubbleCoords(null);
        setSelectedText(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  useEffect(() => {
    setLocalTheme(readingTheme);
  }, [readingTheme]);

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        let targetUrl = fileUrl;
        try {
          const cached = await offlineStorage.getBookFromOffline(fileUrl);
          if (cached && cached.blobUrl) {
            targetUrl = cached.blobUrl;
          }
        } catch {
          // fallback to fileUrl
        }

        const res = await fetch(targetUrl);
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

  // Xử lý nội dung chương với Bionic Reading nếu được kích hoạt
  const renderedContent = useMemo(() => {
    if (!currentChapter?.htmlContent) return '';
    if (activeTypography.bionicReading) {
      return applyBionicToHtml(currentChapter.htmlContent, activeTypography.bionicIntensity);
    }
    return currentChapter.htmlContent;
  }, [currentChapter?.htmlContent, activeTypography.bionicReading, activeTypography.bionicIntensity]);

  // Dọn dẹp âm thanh khi đóng giao diện
  useEffect(() => {
    return () => {
      bookAudioPlayer.stop();
    };
  }, []);

  // Xử lý highlight và auto-scroll đoạn văn bản đang được đọc
  const highlightParagraphInDom = (idx: number) => {
    if (!contentRef.current) return;
    const elements = contentRef.current.querySelectorAll(
      'article .epub-rendered-content p, article .epub-rendered-content h1, article .epub-rendered-content h2, article .epub-rendered-content h3, article .epub-rendered-content h4, article .epub-rendered-content h5, article .epub-rendered-content h6, article .epub-rendered-content li, article .epub-rendered-content blockquote'
    );
    elements.forEach((el, i) => {
      if (i === idx) {
        el.classList.add('audio-active-reading');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        el.classList.remove('audio-active-reading');
      }
    });
  };

  const clearParagraphHighlight = () => {
    if (!contentRef.current) return;
    const elements = contentRef.current.querySelectorAll('.audio-active-reading');
    elements.forEach((el) => el.classList.remove('audio-active-reading'));
    setActiveParagraphIdx(null);
  };

  const startChapterAudio = (startIdx: number = 0) => {
    if (!currentChapter) return;
    const effectiveTitle = bookTitle || parsedBook?.title || 'Sách Nói';
    const effectiveAuthor = author || parsedBook?.author || 'Giọng đọc AI';
    const effectiveCover = coverUrl || parsedBook?.coverUrl || undefined;
    bookAudioPlayer.setBookContext(
      effectiveTitle,
      effectiveAuthor,
      effectiveCover,
      currentChapter.title || `Chương ${currentChapterIdx + 1}`
    );
    const paras = extractParagraphsFromHtml(currentChapter.htmlContent);
    if (paras.length === 0) {
      const raw = contentRef.current?.textContent?.trim() || '';
      if (raw) {
        bookAudioPlayer.setQueue([raw], 0);
        bookAudioPlayer.play(0);
      }
      return;
    }
    bookAudioPlayer.setQueue(paras, startIdx);
    bookAudioPlayer.play(startIdx);
  };

  const toggleAudioBook = () => {
    if (isAudioOpen) {
      bookAudioPlayer.stop();
      setIsAudioOpen(false);
      clearParagraphHighlight();
    } else {
      setIsAudioOpen(true);
      startChapterAudio(0);
    }
  };

  // Lắng nghe sự kiện chuyển câu/đoạn từ player
  useEffect(() => {
    if (!isAudioOpen) return;

    bookAudioPlayer.onParagraphChange((idx) => {
      setActiveParagraphIdx(idx);
      highlightParagraphInDom(idx);
    });

    return () => {
      clearParagraphHighlight();
    };
  }, [isAudioOpen, currentChapterIdx]);

  const goToChapter = (idx: number) => {
    if (!parsedBook || idx < 0 || idx >= parsedBook.chapters.length) return;
    setCurrentChapterIdx(idx);
    setShowToc(false);
    clearParagraphHighlight();
    onPageProgress?.(idx + 1, parsedBook.chapters.length);
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
    if (isAudioOpen) {
      setTimeout(() => {
        const nextCh = parsedBook.chapters[idx];
        if (nextCh) {
          const effectiveTitle = bookTitle || parsedBook?.title || 'Sách Nói';
          const effectiveAuthor = author || parsedBook?.author || 'Giọng đọc AI';
          const effectiveCover = coverUrl || parsedBook?.coverUrl || undefined;
          bookAudioPlayer.setBookContext(
            effectiveTitle,
            effectiveAuthor,
            effectiveCover,
            nextCh.title || `Chương ${idx + 1}`
          );
          const paras = extractParagraphsFromHtml(nextCh.htmlContent);
          bookAudioPlayer.setQueue(paras, 0);
          bookAudioPlayer.play(0);
        }
      }, 150);
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

        {/* Cụm chỉnh Cỡ chữ & Theme & Sách Nói */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Nút Sách Nói AI 🎧 */}
          <button
            type="button"
            onClick={toggleAudioBook}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
              isAudioOpen
                ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/50'
                : 'bg-black/5 dark:bg-white/10 hover:bg-black/10'
            }`}
            title={isAudioOpen ? 'Tắt Sách Nói' : 'Bật Sách Nói AI (Đọc tiếng Việt tự động)'}
          >
            <Headphones size={14} className={isAudioOpen ? 'animate-bounce text-slate-950' : 'text-amber-500'} />
            <span className="hidden xs:inline">Sách nói</span>
          </button>

          {/* Nút Hỏi AI ✨ */}
          {onOpenAiCopilot && (
            <button
              type="button"
              onClick={() => onOpenAiCopilot(selectedText || undefined)}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-800 dark:text-amber-300 hover:text-slate-950 border border-amber-500/30 transition-all cursor-pointer font-bold active:scale-95"
              title="Hỏi Trợ lý AI về chương này"
            >
              <Sparkles size={14} className="text-amber-500" />
              <span className="hidden xs:inline">Hỏi AI</span>
            </button>
          )}

          {/* Nút Cài đặt Phông chữ & Bionic Reading Aa */}
          <button
            type="button"
            onClick={() => {
              if (onOpenTypographyModal) {
                onOpenTypographyModal();
              } else {
                setShowTypographyModal(true);
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all font-bold text-xs cursor-pointer active:scale-95 ${
              activeTypography.bionicReading
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 shadow-xs'
                : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 border-transparent'
            }`}
            title="Cài đặt phông chữ & Đọc siêu tốc Bionic"
            aria-label="Cài đặt phông chữ và Bionic reading"
          >
            <Type size={13} />
            <span>Aa</span>
            {activeTypography.bionicReading && (
              <Sparkles size={12} className="text-amber-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* VÙNG NỘI DUNG CHƯƠNG SÁCH CUỘN MƯỢT MÀ */}
      <div
        ref={contentRef}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.tagName === 'A' || target.tagName === 'BUTTON') return;

          // Nếu đang bật sách nói và click vào 1 thẻ đoạn văn, chuyển giọng đọc ngay tới đoạn đó
          if (isAudioOpen && contentRef.current) {
            const elements = Array.from(
              contentRef.current.querySelectorAll(
                'article .epub-rendered-content p, article .epub-rendered-content h1, article .epub-rendered-content h2, article .epub-rendered-content h3, article .epub-rendered-content h4, article .epub-rendered-content h5, article .epub-rendered-content h6, article .epub-rendered-content li, article .epub-rendered-content blockquote'
              )
            );
            const clickedEl = target.closest('p, h1, h2, h3, h4, h5, h6, li, blockquote');
            if (clickedEl) {
              const idx = elements.indexOf(clickedEl as Element);
              if (idx !== -1) {
                bookAudioPlayer.play(idx);
                return;
              }
            }
          }

          // Bấm trung tâm để toggle HUD
          const w = window.innerWidth;
          const x = e.clientX;
          if (x > w * 0.35 && x < w * 0.65) {
            onCenterClick?.();
          }
        }}
        className="flex-1 overflow-y-auto px-4 sm:px-12 md:px-20 lg:px-32 py-6 sm:py-10 max-w-4xl mx-auto w-full"
        style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'auto', overscrollBehaviorY: 'contain' }}
      >
        {currentChapter ? (
          <article
            className={`prose prose-base sm:prose-lg max-w-none leading-relaxed ${getFontFamilyClass(
              activeTypography.fontFamily
            )}`}
            style={{
              fontSize: `${activeTypography.fontSize}px`,
              lineHeight: activeTypography.lineHeight,
              textAlign: activeTypography.textAlign,
            }}
          >
            <h1
              className={`text-2xl sm:text-3xl font-extrabold mb-6 pb-3 border-b border-black/10 dark:border-white/10 ${headingColors[localTheme]}`}
            >
              {currentChapter.title}
            </h1>

            {/* Nội dung chương HTML đã xử lý Bionic Reading */}
            <div
              className="epub-rendered-content space-y-4"
              dangerouslySetInnerHTML={{ __html: renderedContent }}
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

      {/* KHỐI MINI TOOLTIP KHI BÔI ĐEN VĂN BẢN TRONG EPUB */}
      {bubbleCoords && selectedText && (
        <div
          style={{ top: bubbleCoords.y, left: bubbleCoords.x }}
          className="fixed z-50 flex items-center gap-1 p-1 rounded-xl bg-[#2A160A]/95 text-amber-200 border border-amber-500/40 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 select-none"
        >
          <button
            type="button"
            onClick={() => {
              onOpenAiCopilot?.(selectedText);
              setBubbleCoords(null);
            }}
            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles size={11} className="text-slate-950" />
            <span>Hỏi AI ✨</span>
          </button>
          {onOpenNotesModal && (
            <button
              type="button"
              onClick={() => {
                onOpenNotesModal(selectedText);
                setBubbleCoords(null);
              }}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-amber-200 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
            >
              <Edit3 size={11} />
              <span>Ghi chú</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              bookAudioPlayer.setQueue([selectedText], 0);
              bookAudioPlayer.play(0);
              setBubbleCoords(null);
            }}
            className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-amber-200 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
          >
            <Volume2 size={11} />
            <span>Đọc</span>
          </button>
        </div>
      )}

      {/* THANH PHÁT SÁCH NÓI AI NỔI */}
      {isAudioOpen && (
        <BookAudioPlayerBar
          chapterTitle={currentChapter?.title || `Chương ${currentChapterIdx + 1}`}
          onClose={() => {
            setIsAudioOpen(false);
            clearParagraphHighlight();
          }}
          onAutoNextChapter={() => {
            if (currentChapterIdx < totalChapters - 1) {
              goToChapter(currentChapterIdx + 1);
            } else {
              setIsAudioOpen(false);
              clearParagraphHighlight();
            }
          }}
        />
      )}

      {/* MODAL CÀI ĐẶT PHÔNG CHỮ & BIONIC READING */}
      <ReaderTypographyModal
        isOpen={showTypographyModal}
        onClose={() => setShowTypographyModal(false)}
        currentSettings={activeTypography}
        onChange={(newSettings) => setLocalTypography(newSettings)}
        readingTheme={localTheme === 'dark' ? 'dark' : localTheme === 'sepia' ? 'sepia' : 'light'}
      />

      {/* Hiệu ứng Highlight cho đoạn văn bản đang đọc */}
      <style jsx global>{`
        .audio-active-reading {
          background-color: rgba(245, 158, 11, 0.16) !important;
          border-left: 4px solid #f59e0b !important;
          padding-left: 12px !important;
          border-radius: 8px !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
      `}</style>
    </div>
  );
}
