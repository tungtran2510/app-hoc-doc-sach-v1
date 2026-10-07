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
  Maximize,
  Minimize,
  Loader2,
  Layers,
  Headphones,
} from 'lucide-react';
import SideBooksReaderEngine, {
  SideBooksReaderEngineRef,
} from './SideBooksReaderEngine';
import EpubReaderView from './EpubReaderView';
import BookAudioPlayerBar from './BookAudioPlayerBar';
import { bookAudioPlayer, extractParagraphsFromPdfText } from '../lib/audioSpeech';
import {
  detectEbookFormat,
  createPdfPageProvider,
  extractCbzImages,
  PdfPageProvider,
} from '../lib/ebookEngine';

export interface SideBooksReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  author?: string | null;
  pages: string[];
  initialPage?: number;
  pdfUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  coverUrl?: string | null;
}

export default function SideBooksReaderModal({
  isOpen,
  onClose,
  title,
  author,
  pages,
  initialPage = 0,
  pdfUrl,
  fileUrl,
  fileName,
  coverUrl,
}: SideBooksReaderModalProps) {
  const readerRef = useRef<SideBooksReaderEngineRef>(null);

  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [readingTheme, setReadingTheme] = useState<'dark' | 'sepia' | 'ivory'>('sepia');
  const [readingMode, setReadingMode] = useState<'curl' | 'roll' | 'scroll'>('curl');
  const [showHud, setShowHud] = useState<boolean>(true);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [showTocModal, setShowTocModal] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isPdfAudioOpen, setIsPdfAudioOpen] = useState<boolean>(false);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);

  // Nhận diện định dạng Ebook
  const activeFileUrl = fileUrl || pdfUrl;
  const activeFormat = detectEbookFormat(fileName || activeFileUrl);
  const isEpub = activeFormat === 'epub';
  const isPdf = activeFormat === 'pdf' || (Boolean(activeFileUrl) && !isEpub && activeFileUrl?.toLowerCase().includes('.pdf'));
  const isCbz = activeFormat === 'cbz' || activeFormat === 'cbr';

  // State cho bộ đọc PDF động (On-Demand Provider)
  const [pdfProvider, setPdfProvider] = useState<PdfPageProvider | null>(null);
  const [dynamicPdfPages, setDynamicPdfPages] = useState<string[]>([]);
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [cbzPages, setCbzPages] = useState<string[]>([]);

  // 1. Xử lý nạp động PDF khi mở sách
  useEffect(() => {
    if (!isOpen || !isPdf || !activeFileUrl) return;
    let isCancelled = false;
    let currentProvider: PdfPageProvider | null = null;

    async function initPdf() {
      try {
        setPdfLoading(true);
        const provider = await createPdfPageProvider(activeFileUrl!);
        if (isCancelled) {
          provider.destroy();
          return;
        }
        currentProvider = provider;
        setPdfProvider(provider);

        // Khởi tạo danh sách trang rỗng tương ứng với tổng số trang thật
        const arr = Array(provider.numPages).fill('');

        // Tải ngay trang đầu tiên (và trang bìa nếu có)
        const p1 = await provider.getPageUrl(1);
        if (isCancelled) return;
        arr[0] = p1;

        if (provider.numPages > 1) {
          const p2 = await provider.getPageUrl(2);
          if (!isCancelled) arr[1] = p2;
        }

        if (!isCancelled) {
          setDynamicPdfPages([...arr]);
        }
      } catch (err) {
        console.error('Lỗi khởi tạo bộ đọc PDF động:', err);
      } finally {
        if (!isCancelled) setPdfLoading(false);
      }
    }

    initPdf();

    return () => {
      isCancelled = true;
      if (currentProvider) currentProvider.destroy();
      setPdfProvider(null);
      setDynamicPdfPages([]);
    };
  }, [isOpen, isPdf, activeFileUrl]);

  // 2. Tải trang theo nhu cầu khi người dùng lật sách PDF
  useEffect(() => {
    if (!pdfProvider || dynamicPdfPages.length === 0) return;
    const pageNum1 = currentPage + 1;
    const pagesToFetch = [pageNum1, pageNum1 + 1, pageNum1 + 2, pageNum1 - 1].filter(
      (p) => p >= 1 && p <= pdfProvider.numPages && !dynamicPdfPages[p - 1]
    );

    if (pagesToFetch.length > 0) {
      Promise.all(
        pagesToFetch.map(async (p) => {
          const url = await pdfProvider.getPageUrl(p);
          return { idx: p - 1, url };
        })
      ).then((results) => {
        setDynamicPdfPages((prev) => {
          const next = [...prev];
          let changed = false;
          for (const res of results) {
            if (next[res.idx] !== res.url) {
              next[res.idx] = res.url;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      });
    }
  }, [currentPage, pdfProvider, dynamicPdfPages]);

  // 3. Xử lý nạp truyện tranh CBZ
  useEffect(() => {
    if (!isOpen || !isCbz || !activeFileUrl) return;
    let isCancelled = false;

    async function loadCbz() {
      try {
        const res = await fetch(activeFileUrl!);
        const buffer = await res.arrayBuffer();
        if (isCancelled) return;
        const urls = await extractCbzImages(buffer);
        if (!isCancelled) {
          setCbzPages(urls);
        }
      } catch (err) {
        console.error('Lỗi nạp CBZ:', err);
      }
    }

    loadCbz();

    return () => {
      isCancelled = true;
      setCbzPages([]);
    };
  }, [isOpen, isCbz, activeFileUrl]);

  // Danh sách trang thực tế được đưa vào Engine 3D
  const effectivePages = isCbz
    ? cbzPages
    : isPdf && dynamicPdfPages.length > 0
    ? dynamicPdfPages
    : pages;

  const totalPages = Math.max(1, effectivePages.length);

  // Xử lý bật / tắt Toàn màn hình thực thụ (Immersive Native Fullscreen API)
  const toggleFullscreen = async () => {
    try {
      const isCurrentlyFs =
        Boolean(document.fullscreenElement) ||
        Boolean((document as any).webkitFullscreenElement);

      if (!isCurrentlyFs) {
        const el = document.documentElement;
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if ((el as any).webkitRequestFullscreen) {
          await (el as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen request error:', err);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      const isFs =
        Boolean(document.fullscreenElement) ||
        Boolean((document as any).webkitFullscreenElement);
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  // Hỗ trợ phím tắt bàn phím
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        readerRef.current?.flipNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (currentPage <= 0) {
          setShowExitConfirm(true);
        } else {
          readerRef.current?.flipPrev();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowExitConfirm(true);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, currentPage]);

  const lastToggleHudRef = useRef<number>(0);
  const toggleHud = () => {
    const now = Date.now();
    if (now - lastToggleHudRef.current < 260) return;
    lastToggleHudRef.current = now;
    setShowHud((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;
    setShowHud(true);
    try {
      const savedTheme = localStorage.getItem('reader_theme_pref');
      if (savedTheme && ['dark', 'sepia', 'ivory'].includes(savedTheme)) {
        setReadingTheme(savedTheme as any);
      }
      const savedMode = localStorage.getItem('reader_mode_pref');
      if (savedMode && ['curl', 'roll', 'scroll'].includes(savedMode)) {
        setReadingMode(savedMode as any);
      }

      if (typeof initialPage === 'number' && initialPage > 0 && initialPage < totalPages) {
        setCurrentPage(initialPage);
      } else {
        const autoResume = localStorage.getItem('reader_autoresume_pref') !== 'false';
        if (autoResume) {
          const savedPage = localStorage.getItem(`last_read_page_${title}`);
          if (savedPage) {
            const pageNum = parseInt(savedPage, 10);
            if (!isNaN(pageNum) && pageNum >= 0 && pageNum < totalPages) {
              setCurrentPage(pageNum);
            }
          }
        }
      }
    } catch {}
  }, [isOpen, title, initialPage, totalPages]);

  const toggleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    try {
      if (!isBookmarked) {
        localStorage.setItem(`bookmark_page_${title}`, currentPage.toString());
      } else {
        localStorage.removeItem(`bookmark_page_${title}`);
      }
    } catch {}
  };

  // Khi đóng modal hoặc thoát sách thì dừng audio
  useEffect(() => {
    if (!isOpen) {
      bookAudioPlayer.stop();
      setIsPdfAudioOpen(false);
    }
  }, [isOpen]);

  const startPdfPageAudio = async (pageNum1Based: number) => {
    if (!pdfProvider) return;
    try {
      const text = await pdfProvider.getPageText(pageNum1Based);
      if (!text || text.length < 5) {
        setAudioNotice('Trang PDF này không chứa văn bản số hoá hoặc là bản scan ảnh.');
        setTimeout(() => setAudioNotice(null), 3500);
        return;
      }
      const paras = extractParagraphsFromPdfText(text);
      bookAudioPlayer.setQueue(paras, 0);
      bookAudioPlayer.play(0);
    } catch (err) {
      console.warn('Lỗi đọc audio trang PDF:', err);
    }
  };

  const togglePdfAudio = () => {
    if (isPdfAudioOpen) {
      bookAudioPlayer.stop();
      setIsPdfAudioOpen(false);
    } else {
      setIsPdfAudioOpen(true);
      startPdfPageAudio(currentPage + 1);
    }
  };

  // Khi lật trang trong chế độ Sách Nói PDF
  useEffect(() => {
    if (isPdfAudioOpen && isPdf && pdfProvider) {
      startPdfPageAudio(currentPage + 1);
    }
  }, [currentPage, isPdfAudioOpen, isPdf, pdfProvider]);

  const handleExitBook = () => {
    bookAudioPlayer.stop();
    setIsPdfAudioOpen(false);
    try {
      localStorage.setItem(`last_read_page_${title}`, currentPage.toString());
      localStorage.setItem('last_read_book_title', title);
    } catch {}
    setShowExitConfirm(false);
    onClose();
  };

  const playPaperSound = () => {
    try {
      const soundPref = localStorage.getItem('reader_sound_pref');
      if (soundPref === 'false') return;

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Đang đọc sách ${title}`}
      className="fixed inset-0 z-50 flex flex-col bg-slate-950 select-none overflow-hidden animate-in fade-in duration-200"
    >
      {/* ================= 1. THANH ĐIỀU HƯỚNG ĐỈNH (STICKY HUD TRÊN CÙNG) ================= */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-md px-3 sm:px-4 py-2 flex items-center justify-between transition-all duration-300 transform gap-2 ${
          showHud ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        } ${
          readingTheme === 'ivory'
            ? 'bg-[#f4efe4]/95 text-slate-900 border-b border-black/10 shadow-md'
            : readingTheme === 'sepia'
            ? 'bg-[#1c130d]/95 text-[#f4ecd8] border-b border-amber-900/40 shadow-xl'
            : 'bg-black/90 text-slate-100 border-b border-white/10 shadow-xl'
        }`}
      >
        {/* Bên trái: Nút Đóng / Thoát về kệ sách */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowExitConfirm(true)}
            className="h-8 px-2 sm:px-2.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-amber-300 hover:text-white flex items-center gap-1 text-[12px] font-bold cursor-pointer"
            title="Đóng sách & Về kệ"
            aria-label="Thoát về kệ sách"
          >
            <ArrowLeft size={16} strokeWidth={2.4} />
            <span className="hidden xs:inline">Kệ sách</span>
          </button>
        </div>

        {/* Ở giữa: Tiêu đề cuốn sách & Chế độ lật trang (CURL, ROLL, SCROLL) */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 justify-center">
          <div className="text-center min-w-0 hidden md:block max-w-[280px]">
            <h1 className="text-[13px] font-black truncate text-amber-100 leading-tight">
              {title}
            </h1>
            <p className="text-[10px] text-amber-300/70 truncate">
              {author || 'Tài Liệu Chuyên Sâu'} {isEpub ? '· EPUB' : isPdf ? '· PDF' : isCbz ? '· CBZ' : ''}
            </p>
          </div>

          {/* Cụm 3 nút chuyển chế độ đọc (CURL 3D, ROLL 3D, SCROLL) - Chỉ áp dụng cho chế độ lật trang */}
          {!isEpub && (
            <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/10 shrink-0">
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
                title="Lật cong nón 3D (Chuẩn SideBooks Tokyo Interplay)"
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
          )}
        </div>

        {/* Bên phải: Zoom + Bookmark + Toàn màn hình + Tông màu giấy */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {!isEpub && (
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
          )}

          {/* Nút Sách Nói (Audio Book) cho tài liệu PDF */}
          {isPdf && (
            <button
              type="button"
              onClick={togglePdfAudio}
              className={`h-7.5 sm:h-8 px-2 sm:px-2.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 text-xs font-bold ${
                isPdfAudioOpen
                  ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/50'
                  : 'bg-white/10 hover:bg-white/20 text-amber-200 border border-white/10'
              }`}
              title={isPdfAudioOpen ? 'Tắt Sách Nói' : 'Bật Sách Nói AI (Đọc văn bản trang PDF)'}
              aria-label="Sách nói AI"
            >
              <Headphones size={15} className={isPdfAudioOpen ? 'animate-bounce text-slate-950' : 'text-amber-400'} />
              <span className="hidden sm:inline">Sách nói</span>
            </button>
          )}

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

          <button
            type="button"
            onClick={toggleFullscreen}
            className={`w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
              isFullscreen
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'bg-white/10 hover:bg-white/20 text-amber-200 border border-white/10'
            }`}
            title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình (F)'}
            aria-label="Toàn màn hình"
          >
            {isFullscreen ? <Minimize size={16} strokeWidth={2.4} /> : <Maximize size={16} strokeWidth={2.4} />}
          </button>

          {/* 3 Tông màu đọc sách */}
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

      {/* ================= 2. KHUNG ĐỌC SÁCH TRUNG TÂM ================= */}
      <main
        onClick={(e) => {
          if ((e.target as HTMLElement)?.tagName !== 'CANVAS') {
            const w = window.innerWidth;
            const x = e.clientX;
            if (x < w * 0.18) {
              if (currentPage <= 0) {
                setShowExitConfirm(true);
              } else {
                readerRef.current?.flipPrev();
              }
            } else if (x > w * 0.82) {
              readerRef.current?.flipNext();
            } else {
              toggleHud();
            }
          }
        }}
        className="flex-1 flex flex-col items-center justify-center relative w-full h-[calc(100vh-84px)] overflow-hidden cursor-pointer"
      >
        {isEpub && activeFileUrl ? (
          /* TRÌNH ĐỌC EPUB HIỆN ĐẠI */
          <EpubReaderView
            fileUrl={activeFileUrl}
            bookTitle={title}
            author={author}
            readingTheme={readingTheme}
            onCenterClick={toggleHud}
            onPageProgress={(ch, totalCh) => {
              setCurrentPage(ch - 1);
              try {
                localStorage.setItem(`last_read_page_${title}`, (ch - 1).toString());
                localStorage.setItem('last_read_book_title', title);
              } catch {}
            }}
          />
        ) : pdfLoading && dynamicPdfPages.length === 0 ? (
          /* ĐANG TẢI TRANG ĐẦU CỦA FILE PDF */
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center text-amber-200">
            <Loader2 size={38} className="animate-spin text-amber-400" />
            <p className="text-base font-bold text-amber-200">
              Đang giải mã trang sách PDF chất lượng cao...
            </p>
            <p className="text-xs text-amber-300/70 max-w-sm">
              Hệ thống tải trực tiếp tài liệu nguyên bản và tối ưu bộ nhớ on-demand.
            </p>
          </div>
        ) : (
          /* TRÌNH ĐỌC LẬT TRANG 3D SIDEBOOKS ENGINE */
          <SideBooksReaderEngine
            ref={readerRef}
            pageImages={effectivePages}
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
            className="w-full h-full"
          />
        )}
      </main>

      {/* ================= 3. THANH ĐIỀU HƯỚNG ĐÁY (CHỈ HIỆN KHI BẬT HUD HOẶC LÀ DẠNG LẬT TRANG) ================= */}
      {!isEpub && (
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
          {/* HÀNG TRÊN: MŨI TÊN VỀ TRANG / MỞ TRANG */}
          <div className="w-full max-w-md flex items-center justify-between px-1">
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

            <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/10 border border-white/10 text-amber-200 text-xs font-mono font-bold shadow-inner">
              <span>Trang {currentPage + 1}</span>
              <span className="opacity-40">/</span>
              <span>{totalPages}</span>
            </div>

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

          {/* HÀNG DƯỚI: THANH TRƯỢT TUA NHANH */}
          <div className="w-full max-w-md flex items-center gap-2 px-1 pt-0.5">
            <span className="text-[10px] font-mono text-slate-400 w-5 text-right">
              1
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(1, totalPages - 1)}
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
      )}

      {/* ================= 4. MODAL XÁC NHẬN THOÁT SÁCH ================= */}
      {showExitConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowExitConfirm(false)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-gradient-to-b from-[#25170e] to-[#170e08] border border-amber-900/60 p-5 text-amber-100 text-center shadow-2xl flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <BookOpen size={24} />
            </div>
            <h3 className="text-base font-extrabold text-amber-200">
              Bạn muốn quay về Kệ Sách?
            </h3>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              Trang đọc hiện tại ({currentPage + 1}/{totalPages}) sẽ được tự động ghi nhớ cho lần đọc tiếp theo.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Đọc tiếp
              </button>
              <button
                type="button"
                onClick={handleExitBook}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-colors cursor-pointer"
              >
                Về kệ sách
              </button>
            </div>
          </div>
        </div>
      )}

      {/* THANH PHÁT SÁCH NÓI AI NỔI CHO TÀI LIỆU PDF */}
      {isPdfAudioOpen && isPdf && (
        <BookAudioPlayerBar
          chapterTitle={`Trang ${currentPage + 1} / ${totalPages}`}
          onClose={() => {
            setIsPdfAudioOpen(false);
            bookAudioPlayer.stop();
          }}
          onAutoNextChapter={() => {
            if (currentPage < totalPages - 1) {
              readerRef.current?.flipNext();
            } else {
              setIsPdfAudioOpen(false);
              bookAudioPlayer.stop();
            }
          }}
        />
      )}

      {/* TOAST THÔNG BÁO SÁCH NÓI */}
      {audioNotice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-xl border border-amber-300 animate-in fade-in slide-in-from-top-2">
          {audioNotice}
        </div>
      )}
    </div>
  );
}
