'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  List,
  Type,
  Loader2,
  AlertCircle,
  X,
  BookOpen,
  Headphones,
  Sparkles,
  ArrowUpDown,
  Check,
  Bookmark,
} from 'lucide-react';
import { parseEpub, ParsedEpubBook, EpubChapter } from '../lib/ebookEngine';
import { bookAudioPlayer, extractParagraphsFromHtml } from '../lib/audioSpeech';
import { offlineStorage } from '../lib/offlineStorage';
import { readingNotesStorage } from '../lib/readingNotes';
import {
  TypographySettings,
  DEFAULT_TYPOGRAPHY,
  getStoredTypography,
  applyBionicToHtml,
  getFontFamilyClass,
} from '../lib/typographyEngine';
import BookAudioPlayerBar from './BookAudioPlayerBar';
import ReaderTypographyModal from './ReaderTypographyModal';

export interface EpubReaderViewProps {
  fileUrl: string;
  bookTitle?: string;
  author?: string | null;
  coverUrl?: string | null;
  readingTheme?: 'dark' | 'sepia' | 'ivory';
  readingMode?: 'curl' | 'roll' | 'scroll'; // 'scroll' = cuộn vô hạn, 'curl'/'roll' = lật từng chương
  typographySettings?: TypographySettings;
  showInternalHeader?: boolean;
  targetChapterIdx?: number | null;
  onChaptersLoaded?: (chapters: EpubChapter[]) => void;
  onChapterChange?: (idx: number) => void;
  onOpenTypographyModal?: () => void;
  onCenterClick?: () => void;
  onPageProgress?: (currentChapter: number, totalChapters: number) => void;
  onOpenAiCopilot?: (selectedText?: string) => void;
  onOpenNotesModal?: (selectedText?: string) => void;
}

/** Loại bỏ tiêu đề trùng lặp bên trong nội dung HTML và ngăn tiêu đề quá to */
function cleanChapterHtml(html: string, title?: string): string {
  if (!html) return '';
  let clean = html;
  if (title) {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    clean = clean.replace(new RegExp(`<h1[^>]*>\\s*${escaped}\\s*<\\/h1>`, 'gi'), '');
    clean = clean.replace(/<div class="tag">[^<]*<\/div>/gi, '');
  }
  // Chuyển bất kỳ thẻ h1 nào còn lại trong nội dung thành h3 cỡ vừa vặn
  clean = clean.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '<h3 class="font-bold text-base my-2">$1</h3>');
  return clean;
}

export default function EpubReaderView({
  fileUrl,
  bookTitle,
  author,
  coverUrl,
  readingTheme = 'sepia',
  readingMode = 'scroll',
  typographySettings,
  showInternalHeader = false,
  targetChapterIdx = null,
  onChaptersLoaded,
  onChapterChange,
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

  // State bôi đen văn bản & Floating Tooltip Hỏi AI & Lưu đoạn trích
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [bubbleCoords, setBubbleCoords] = useState<{ x: number; y: number } | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const handleSaveQuote = (text: string) => {
    if (!text || !text.trim()) return;
    try {
      readingNotesStorage.saveNote({
        bookTitle: bookTitle || parsedBook?.title || 'Sách',
        page: currentChapterIdx + 1,
        selectedText: text.trim(),
        color: 'amber',
      });
      setSaveToast('✓ Đã lưu đoạn trích vào Sổ tay!');
      setTimeout(() => setSaveToast(null), 2500);
    } catch (err) {
      console.warn('Lỗi lưu đoạn trích:', err);
    }
    setSelectedText(null);
    setBubbleCoords(null);
    try {
      window.getSelection()?.removeAllRanges();
    } catch {}
  };

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

  // Nhảy tới chương được yêu cầu từ ngoài (Target Chapter Index)
  useEffect(() => {
    if (typeof targetChapterIdx === 'number' && parsedBook) {
      if (targetChapterIdx >= 0 && targetChapterIdx < parsedBook.chapters.length) {
        goToChapter(targetChapterIdx);
      }
    }
  }, [targetChapterIdx, parsedBook]);

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

        // Nếu là URL bên ngoài (không phải blob: hay nội bộ /documents), chuyển qua API proxy để chống chặn CORS
        let fetchUrl = targetUrl;
        if (
          typeof window !== 'undefined' &&
          (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) &&
          !targetUrl.includes(window.location.host)
        ) {
          fetchUrl = `/api/proxy-ebook?url=${encodeURIComponent(targetUrl)}`;
        }

        const res = await fetch(fetchUrl);
        if (!res.ok) {
          let errDetail = `Mã lỗi ${res.status}`;
          try {
            const errJson = await res.json();
            if (errJson?.error) errDetail = errJson.error;
          } catch {}
          throw new Error(`Không thể mở tệp EPUB này: ${errDetail}`);
        }

        const buffer = await res.arrayBuffer();
        if (isCancelled) return;

        const book = await parseEpub(buffer);
        if (isCancelled) return;

        setParsedBook(book);
        setCurrentChapterIdx(0);
        onChaptersLoaded?.(book.chapters);
        onPageProgress?.(1, book.chapters.length);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Lỗi nạp EPUB:', err);
          const rawMsg = err?.message || '';
          if (rawMsg.includes('Failed to fetch')) {
            setError('Máy chủ nguồn giới hạn quyền truy cập từ xa hoặc tệp không sẵn sàng trên kho mở.');
          } else {
            setError(rawMsg || 'Không thể mở tệp EPUB này.');
          }
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
    const cleaned = cleanChapterHtml(currentChapter.htmlContent, currentChapter.title);
    if (activeTypography.bionicReading) {
      return applyBionicToHtml(cleaned, activeTypography.bionicIntensity);
    }
    return cleaned;
  }, [currentChapter?.htmlContent, currentChapter?.title, activeTypography.bionicReading, activeTypography.bionicIntensity]);

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
    const cleaned = cleanChapterHtml(currentChapter.htmlContent, currentChapter.title);
    const paras = extractParagraphsFromHtml(cleaned);
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
    onChapterChange?.(idx);

    if (readingMode === 'scroll') {
      const targetSec = document.getElementById(`epub-chapter-${idx}`);
      if (targetSec) {
        targetSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
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
          const paras = extractParagraphsFromHtml(cleanChapterHtml(nextCh.htmlContent, nextCh.title));
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

  // Vuốt chạm ngang để chuyển chương (chỉ bật khi ở chế độ lật trang)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (readingMode === 'scroll') return;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (readingMode === 'scroll' || touchStartX.current === null) return;
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
        <p className="text-sm font-bold text-amber-200">
          Đang nạp và định dạng cuốn sách EPUB...
        </p>
        <p className="text-xs text-amber-300/70 max-w-sm">
          Hệ thống đang nạp các chương và phông chữ tinh tế.
        </p>
      </div>
    );
  }

  if (error || !parsedBook) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center max-w-sm mx-auto">
        <div className="w-13 h-13 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shadow-xs">
          <BookOpen size={26} />
        </div>
        <h3 className="text-sm font-black text-amber-100">
          Chưa thể mở tệp sách này
        </h3>
        <p className="text-xs text-amber-200/80 leading-relaxed font-medium">
          {error || 'Máy chủ kho lưu trữ nguồn từ xa giới hạn truy cập hoặc tệp sách chưa sẵn sàng.'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
            >
              <span>Mở nguồn gốc</span>
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                window.history.back();
              }
            }}
            className="h-8 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs transition-all cursor-pointer"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full h-full flex flex-col relative select-text transition-colors duration-200 ${themeStyles[localTheme]}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <style jsx global>{`
        .epub-rendered-content,
        .epub-rendered-content * {
          user-select: text !important;
          -webkit-user-select: text !important;
        }
        .epub-rendered-content h1,
        .epub-rendered-content h2,
        .epub-rendered-content h3 {
          font-size: 1.1rem !important;
          line-height: 1.4 !important;
          font-weight: 700 !important;
          margin-top: 0.9rem !important;
          margin-bottom: 0.45rem !important;
        }
        .epub-rendered-content p {
          margin-bottom: 0.85rem !important;
        }
      `}</style>
      {/* THANH ĐIỀU KHIỂN NỘI BỘ (Chỉ hiển thị khi showInternalHeader = true) */}
      {showInternalHeader && (
        <div className="flex items-center justify-between px-3 sm:px-6 py-2 border-b border-black/10 dark:border-white/10 shrink-0 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setShowToc(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 transition-colors font-bold cursor-pointer shrink-0"
            title="Mục lục chương"
          >
            <List size={14} />
            <span className="hidden xs:inline">Mục lục ({totalChapters})</span>
          </button>

          <div className="flex-1 min-w-0 text-center px-2">
            <p className="font-bold truncate text-xs">
              {currentChapter?.title || `Chương ${currentChapterIdx + 1}`}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleAudioBook}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                isAudioOpen
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-black/5 dark:bg-white/10 hover:bg-black/10'
              }`}
              title={isAudioOpen ? 'Tắt Sách Nói' : 'Bật Sách Nói AI'}
            >
              <Headphones size={13} className={isAudioOpen ? 'animate-bounce text-slate-950' : 'text-amber-500'} />
              <span className="text-[11px]">Sách nói</span>
            </button>

            <button
              type="button"
              onClick={() => (onOpenTypographyModal ? onOpenTypographyModal() : setShowTypographyModal(true))}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 font-bold text-xs cursor-pointer"
              title="Cài đặt chữ"
            >
              <Type size={13} />
              <span>Aa</span>
            </button>
          </div>
        </div>
      )}

      {/* KHUNG ĐỌC VĂN BẢN CHÍNH */}
      <div
        ref={contentRef}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.tagName === 'A' || target.tagName === 'BUTTON') return;

          // Nếu đang bật sách nói và click vào 1 đoạn văn, chuyển giọng đọc ngay tới đoạn đó
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
        className="flex-1 overflow-y-auto px-4 sm:px-10 md:px-16 lg:px-24 pt-20 sm:pt-24 pb-24 max-w-3xl mx-auto w-full"
        style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'auto', overscrollBehaviorY: 'contain' }}
      >
        {readingMode === 'scroll' ? (
          /* =========================================================================
             1. CHẾ ĐỘ CUỘN VÔ HẠN XUỐNG DƯỚI (CONTINUOUS INFINITE VERTICAL SCROLL)
             ========================================================================= */
          <div
            className={`prose prose-sm sm:prose-base max-w-none leading-relaxed flex flex-col gap-10 pb-20 ${getFontFamilyClass(
              activeTypography.fontFamily
            )}`}
            style={{
              fontSize: `${activeTypography.fontSize}px`,
              lineHeight: activeTypography.lineHeight,
              textAlign: activeTypography.textAlign,
            }}
          >
            {parsedBook.chapters.map((chap, idx) => {
              const cleanedHtml = cleanChapterHtml(chap.htmlContent, chap.title);
              const processedContent = activeTypography.bionicReading
                ? applyBionicToHtml(cleanedHtml, activeTypography.bionicIntensity)
                : cleanedHtml;

              return (
                <section
                  key={`chapter-sec-${idx}`}
                  id={`epub-chapter-${idx}`}
                  className="chapter-block border-b border-black/10 dark:border-white/10 pb-10 last:border-b-0"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 font-mono text-[10px] font-bold">
                      Chương {idx + 1} / {totalChapters}
                    </span>
                    <span className="text-[11px] opacity-60 truncate">
                      {parsedBook.title}
                    </span>
                  </div>

                  {/* TIÊU ĐỀ CHƯƠNG KÍCH THƯỚC VỪA VẶN, ĐẸP MẮT (KHÔNG BỊ QUÁ TO) */}
                  <h2
                    className={`text-base sm:text-lg font-bold mb-3 pb-1.5 border-b border-black/10 dark:border-white/10 ${headingColors[localTheme]}`}
                  >
                    {chap.title}
                  </h2>

                  {/* NỘI DUNG VĂN BẢN CHƯƠNG */}
                  <div
                    className="epub-rendered-content space-y-3.5"
                    dangerouslySetInnerHTML={{ __html: processedContent }}
                  />
                </section>
              );
            })}

            <div className="text-center py-6 opacity-60 text-xs font-serif italic border-t border-black/10 dark:border-white/10">
              ✦ Hết cuốn sách • Bạn đã đọc trọn vẹn tác phẩm ✦
            </div>
          </div>
        ) : (
          /* =========================================================================
             2. CHẾ ĐỘ LẬT TỪNG CHƯƠNG (PAGE / CHAPTER BY CHAPTER)
             ========================================================================= */
          currentChapter ? (
            <article
              className={`prose prose-sm sm:prose-base max-w-none leading-relaxed ${getFontFamilyClass(
                activeTypography.fontFamily
              )}`}
              style={{
                fontSize: `${activeTypography.fontSize}px`,
                lineHeight: activeTypography.lineHeight,
                textAlign: activeTypography.textAlign,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 font-mono text-[10px] font-bold">
                  Chương {currentChapterIdx + 1} / {totalChapters}
                </span>
                <span className="text-[11px] opacity-60 truncate">
                  {parsedBook.title}
                </span>
              </div>

              {/* TIÊU ĐỀ CHƯƠNG VỪA VẶN ĐƠN DÒNG / 2 DÒNG TINH TẾ */}
              <h2
                className={`text-base sm:text-lg font-bold mb-3 pb-1.5 border-b border-black/10 dark:border-white/10 ${headingColors[localTheme]}`}
              >
                {currentChapter.title}
              </h2>

              {/* Nội dung chương HTML */}
              <div
                className="epub-rendered-content space-y-3.5"
                dangerouslySetInnerHTML={{ __html: renderedContent }}
              />

              {/* NÚT CHUYỂN CHƯƠNG CUỐI BÀI */}
              <div className="flex items-center justify-between gap-3 pt-8 pb-12 mt-6 border-t border-black/10 dark:border-white/10 text-xs font-bold">
                <button
                  type="button"
                  onClick={prevChapter}
                  disabled={currentChapterIdx <= 0}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
                >
                  <ChevronLeft size={15} />
                  <span>Chương trước</span>
                </button>

                <span className="opacity-60 text-xs">
                  {currentChapterIdx + 1} / {totalChapters}
                </span>

                <button
                  type="button"
                  onClick={nextChapter}
                  disabled={currentChapterIdx >= totalChapters - 1}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95 shadow-xs"
                >
                  <span>Chương tiếp</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </article>
          ) : (
            <p className="text-center py-12 text-sm opacity-70">Chưa có nội dung chương này.</p>
          )
        )}
      </div>

      {/* MODAL MỤC LỤC NỘI BỘ (Khi showInternalHeader = true) */}
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
                <h3 className="text-sm font-bold text-ink">
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

            <div className="flex-1 overflow-y-auto py-2 divide-y divide-line/40">
              {parsedBook.chapters.map((chap, idx) => {
                const isActive = idx === currentChapterIdx;
                return (
                  <button
                    key={`toc-${idx}`}
                    type="button"
                    onClick={() => goToChapter(idx)}
                    className={`w-full text-left py-2.5 px-3 rounded-xl flex items-center justify-between text-xs font-semibold cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold'
                        : 'hover:bg-surface-2 text-ink/80'
                    }`}
                  >
                    <span className="truncate pr-2">{chap.title}</span>
                    <span className="text-[10px] opacity-60 font-mono shrink-0">
                      {idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CÀI ĐẶT PHÔNG CHỮ & BIONIC READING (Typography) */}
      <ReaderTypographyModal
        isOpen={showTypographyModal}
        onClose={() => setShowTypographyModal(false)}
        currentSettings={activeTypography}
        onChange={(newSettings) => setLocalTypography(newSettings)}
        readingTheme={localTheme === 'dark' ? 'dark' : localTheme === 'sepia' ? 'sepia' : 'light'}
      />

      {/* TRÌNH PHÁT SÁCH NÓI AI NỔI GIỮA MÀN HÌNH (BookAudioPlayerBar) */}
      {isAudioOpen && (
        <BookAudioPlayerBar
          onClose={() => {
            setIsAudioOpen(false);
            clearParagraphHighlight();
          }}
          chapterTitle={currentChapter?.title || `Chương ${currentChapterIdx + 1}`}
          onAutoNextChapter={nextChapter}
        />
      )}

      {/* FLOATING ACTION TOOLTIP: BÔI ĐEN & LƯU + HỎI TRỢ LÝ AI KHI CHỌN CHỮ */}
      {selectedText && bubbleCoords && (
        <div
          style={{ top: bubbleCoords.y, left: bubbleCoords.x }}
          className="fixed z-50 flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/95 text-white border border-amber-500/50 shadow-2xl animate-in zoom-in-95 pointer-events-auto select-none backdrop-blur-md"
        >
          {/* Nút 1: Bôi đen & Lưu trực tiếp vào Sổ tay */}
          <button
            type="button"
            onClick={() => handleSaveQuote(selectedText)}
            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors active:scale-95 whitespace-nowrap"
            title="Lưu đoạn trích này vào Sổ tay"
          >
            <span>📌</span>
            <span>Lưu đoạn trích</span>
          </button>

          {/* Nút 2: Hỏi AI về đoạn trích */}
          {onOpenAiCopilot && (
            <button
              type="button"
              onClick={() => {
                const text = selectedText;
                setSelectedText(null);
                setBubbleCoords(null);
                onOpenAiCopilot(text);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-amber-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors active:scale-95 whitespace-nowrap"
              title="Hỏi Trợ lý AI giải thích hoặc tóm tắt đoạn này"
            >
              <Sparkles size={12} className="text-amber-400" />
              <span>Hỏi AI</span>
            </button>
          )}

          {/* Nút 3: Ghi chú thêm suy nghĩ */}
          {onOpenNotesModal && (
            <button
              type="button"
              onClick={() => {
                const text = selectedText;
                setSelectedText(null);
                setBubbleCoords(null);
                onOpenNotesModal(text);
              }}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-[11px] flex items-center gap-1 cursor-pointer transition-colors active:scale-95 whitespace-nowrap hidden xs:flex"
              title="Thêm suy nghĩ cá nhân vào Sổ tay"
            >
              <span>Ghi chú</span>
            </button>
          )}
        </div>
      )}

      {/* TOAST THÔNG BÁO LƯU ĐOẠN TRÍCH THÀNH CÔNG */}
      {saveToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2 border border-emerald-400 pointer-events-none">
          <Check size={14} />
          <span>{saveToast}</span>
        </div>
      )}
    </div>
  );
}
