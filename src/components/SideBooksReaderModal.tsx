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
  Zap,
  CheckCircle2,
  Sparkles,
  Search,
  BookMarked,
  Type,
} from 'lucide-react';
import SideBooksReaderEngine, {
  SideBooksReaderEngineRef,
} from './SideBooksReaderEngine';
import EpubReaderView from './EpubReaderView';
import ReaderAiCopilot from './ReaderAiCopilot';
import ReaderNotesModal from './ReaderNotesModal';
import ReaderSearchModal from './ReaderSearchModal';
import ReaderTypographyModal from './ReaderTypographyModal';
import BookAudioPlayerBar from './BookAudioPlayerBar';
import { readingNotesStorage } from '../lib/readingNotes';
import { bookAudioPlayer, extractParagraphsFromPdfText } from '../lib/audioSpeech';
import { offlineStorage, formatBytes } from '../lib/offlineStorage';
import { TypographySettings, getStoredTypography } from '../lib/typographyEngine';
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

  // State lưu ngoại tuyến (Offline IndexedDB)
  const [isOfflineCached, setIsOfflineCached] = useState<boolean>(false);
  const [isSavingOffline, setIsSavingOffline] = useState<boolean>(false);
  const [offlineSaveProgress, setOfflineSaveProgress] = useState<number>(0);

  // State Trợ lý AI Đồng hành Đọc Sách (Reading Copilot)
  const [isAiCopilotOpen, setIsAiCopilotOpen] = useState<boolean>(false);
  const [currentPageText, setCurrentPageText] = useState<string | null>(null);
  const [copilotSelectedText, setCopilotSelectedText] = useState<string | null>(null);

  // State Sổ tay ghi chú & Thẻ Flashcard 3D
  const [showNotesModal, setShowNotesModal] = useState<boolean>(false);
  const [notesModalInitialText, setNotesModalInitialText] = useState<string | null>(null);
  const [notesCount, setNotesCount] = useState<number>(0);

  // State Tìm kiếm toàn văn trong sách
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);

  // State Cài đặt Phông chữ & Bionic Reading
  const [typographySettings, setTypographySettings] = useState<TypographySettings>(() => getStoredTypography());
  const [showTypographyModal, setShowTypographyModal] = useState<boolean>(false);

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

  // Refs theo dõi trạng thái đồng bộ cho Browser History & PopState
  const hasPushedHistoryRef = useRef<boolean>(false);
  const showExitConfirmRef = useRef<boolean>(showExitConfirm);
  showExitConfirmRef.current = showExitConfirm;
  const isAiCopilotOpenRef = useRef<boolean>(isAiCopilotOpen);
  isAiCopilotOpenRef.current = isAiCopilotOpen;
  const showNotesModalRef = useRef<boolean>(showNotesModal);
  showNotesModalRef.current = showNotesModal;
  const showSearchModalRef = useRef<boolean>(showSearchModal);
  showSearchModalRef.current = showSearchModal;
  const showTypographyModalRef = useRef<boolean>(showTypographyModal);
  showTypographyModalRef.current = showTypographyModal;
  const showTocModalRef = useRef<boolean>(showTocModal);
  showTocModalRef.current = showTocModal;
  const currentPageRef = useRef<number>(currentPage);
  currentPageRef.current = currentPage;
  const titleRef = useRef<string>(title);
  titleRef.current = title;
  const onCloseRef = useRef<() => void>(onClose);
  onCloseRef.current = onClose;

  // Quản lý Lịch sử Trình duyệt (Browser History & PopState) khi đọc sách
  // Giúp nút Quay lại của điện thoại (Android Back gesture/button, Swipe Back, Browser Back)
  // đóng sách an toàn và quay về Kệ Sách - TUYỆT ĐỐI KHÔNG ĐỂ THOÁT KHỎI ỨNG DỤNG!
  useEffect(() => {
    if (!isOpen) {
      if (hasPushedHistoryRef.current && typeof window !== 'undefined' && window.location.hash.includes('doc-sach')) {
        hasPushedHistoryRef.current = false;
        try {
          window.history.back();
        } catch {}
      }
      return;
    }

    // Đẩy hash vào history khi mở sách để chặn nút Back của điện thoại
    if (!hasPushedHistoryRef.current && typeof window !== 'undefined') {
      hasPushedHistoryRef.current = true;
      try {
        const nextState = {
          ...(window.history.state || {}),
          qbiz_sidebooks_reader: true,
          book_title: title,
        };
        const currentPath = window.location.pathname + window.location.search;
        window.history.pushState(nextState, '', currentPath + '#doc-sach');
      } catch {}
    }

    const repushHistory = () => {
      try {
        const nextState = {
          ...(window.history.state || {}),
          qbiz_sidebooks_reader: true,
          book_title: titleRef.current,
        };
        const currentPath = window.location.pathname + window.location.search;
        window.history.pushState(nextState, '', currentPath + '#doc-sach');
        hasPushedHistoryRef.current = true;
      } catch {}
    };

    const handlePopState = () => {
      // Khi người dùng bấm nút Back của điện thoại hoặc vuốt mép màn hình:

      // A. Nếu đang mở bất kỳ modal con nào -> đóng modal đó trước và giữ sách!
      if (showExitConfirmRef.current) {
        setShowExitConfirm(false);
        repushHistory();
        return;
      }

      if (showTypographyModalRef.current) {
        setShowTypographyModal(false);
        repushHistory();
        return;
      }

      if (showSearchModalRef.current) {
        setShowSearchModal(false);
        repushHistory();
        return;
      }

      if (showNotesModalRef.current) {
        setShowNotesModal(false);
        repushHistory();
        return;
      }

      if (isAiCopilotOpenRef.current) {
        setIsAiCopilotOpen(false);
        repushHistory();
        return;
      }

      if (showTocModalRef.current) {
        setShowTocModal(false);
        repushHistory();
        return;
      }

      // B. Không còn modal con nào -> Đóng sách an toàn và quay về Kệ Sách (KHÔNG THOÁT APP)
      hasPushedHistoryRef.current = false;
      bookAudioPlayer.stop();
      setIsPdfAudioOpen(false);
      try {
        localStorage.setItem(`last_read_page_${titleRef.current}`, currentPageRef.current.toString());
        localStorage.setItem('last_read_book_title', titleRef.current);
      } catch {}
      onCloseRef.current();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (hasPushedHistoryRef.current && typeof window !== 'undefined' && window.location.hash.includes('doc-sach')) {
        hasPushedHistoryRef.current = false;
        try {
          window.history.back();
        } catch {}
      }
    };
  }, [isOpen, title]);

  // Kiểm tra trạng thái đã lưu ngoại tuyến của cuốn sách
  useEffect(() => {
    if (!isOpen || !activeFileUrl) return;
    offlineStorage.isBookCached(activeFileUrl).then((cached) => {
      setIsOfflineCached(cached);
    });
  }, [isOpen, activeFileUrl]);

  const openAiCopilot = async (overrideSelectedText?: string) => {
    if (typeof overrideSelectedText === 'string') {
      setCopilotSelectedText(overrideSelectedText);
    }
    if (isPdf && pdfProvider) {
      try {
        const text = await pdfProvider.getPageText(currentPage + 1);
        if (text) {
          setCurrentPageText(text);
        }
      } catch (err) {
        console.warn('Lỗi lấy văn bản trang PDF cho AI Copilot:', err);
      }
    }
    setIsAiCopilotOpen(true);
  };

  // Tự động đồng bộ văn bản trang sách mới cho AI Copilot khi lật trang
  useEffect(() => {
    if (isAiCopilotOpen && isPdf && pdfProvider) {
      pdfProvider.getPageText(currentPage + 1).then((txt) => {
        if (txt) setCurrentPageText(txt);
      });
    }
  }, [currentPage, isAiCopilotOpen, isPdf, pdfProvider]);

  // Đồng bộ số lượng ghi chú của cuốn sách
  useEffect(() => {
    if (isOpen && title) {
      const list = readingNotesStorage.getNotes(title);
      setNotesCount(list.length);
    }
  }, [isOpen, title, showNotesModal]);

  // 1. Xử lý nạp động PDF khi mở sách
  useEffect(() => {
    if (!isOpen || !isPdf || !activeFileUrl) return;
    let isCancelled = false;
    let currentProvider: PdfPageProvider | null = null;

    async function initPdf() {
      try {
        setPdfLoading(true);

        // Nạp từ bộ nhớ Offline IndexedDB nếu sách đã được lưu ngoại tuyến
        let effectivePdfUrl = activeFileUrl!;
        try {
          const cached = await offlineStorage.getBookFromOffline(activeFileUrl!);
          if (cached && cached.blobUrl) {
            effectivePdfUrl = cached.blobUrl;
          }
        } catch {}

        // Timeout an toàn 4.0 giây để bảo vệ app không bao giờ bị kẹt spinner
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('PDF loading timeout sau 4.0s')), 4000)
        );

        const provider = await Promise.race([
          createPdfPageProvider(effectivePdfUrl),
          timeoutPromise,
        ]);
        if (isCancelled) {
          provider.destroy();
          return;
        }
        currentProvider = provider;
        setPdfProvider(provider);

        // Khởi tạo danh sách trang rỗng tương ứng với tổng số trang thật
        const arr = Array(provider.numPages).fill('');

        // Tải ngay trang đầu tiên (và trang bìa nếu có) với timeout
        const p1 = await Promise.race([
          provider.getPageUrl(1),
          timeoutPromise,
        ]);
        if (isCancelled) return;
        arr[0] = p1;

        if (provider.numPages > 1) {
          try {
            const p2 = await Promise.race([
              provider.getPageUrl(2),
              new Promise<string>((res) => setTimeout(() => res(''), 2000)),
            ]);
            if (!isCancelled && p2) arr[1] = p2;
          } catch {}
        }

        if (!isCancelled) {
          setDynamicPdfPages([...arr]);
        }
      } catch (err) {
        console.warn('Không giải mã được PDF động, tự động chuyển sang trang ảnh dự phòng:', err);
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
    : dynamicPdfPages.length > 0
    ? dynamicPdfPages
    : pages && pages.length > 0
    ? pages
    : coverUrl
    ? [coverUrl]
    : ['/documents/covers/cover_hieu_dung_ve_cot_song.png'];

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

  const handleSaveOffline = async () => {
    if (!activeFileUrl || isSavingOffline) return;
    try {
      setIsSavingOffline(true);
      setOfflineSaveProgress(15);
      const res = await offlineStorage.saveBookToOffline(
        {
          title,
          author,
          coverUrl,
          fileUrl: activeFileUrl,
          fileName,
          lastReadPage: currentPage,
          totalPages,
        },
        (percent) => setOfflineSaveProgress(percent)
      );
      setIsOfflineCached(true);
      setAudioNotice(`Đã lưu sách về máy (${formatBytes(res.size)})! Bạn có thể đọc ngoại tuyến mọi lúc không cần mạng.`);
      setTimeout(() => setAudioNotice(null), 4000);
    } catch (err: any) {
      console.error('Lỗi lưu sách ngoại tuyến:', err);
      setAudioNotice('Không thể lưu sách: ' + (err.message || 'Lỗi mạng'));
      setTimeout(() => setAudioNotice(null), 4000);
    } finally {
      setIsSavingOffline(false);
      setOfflineSaveProgress(0);
    }
  };

  const handleRemoveOffline = async () => {
    if (!activeFileUrl) return;
    try {
      await offlineStorage.removeBookFromOffline(activeFileUrl);
      setIsOfflineCached(false);
      setAudioNotice('Đã xóa sách khỏi bộ nhớ máy.');
      setTimeout(() => setAudioNotice(null), 3000);
    } catch {}
  };

  const handleExitBook = () => {
    bookAudioPlayer.stop();
    setIsPdfAudioOpen(false);
    try {
      localStorage.setItem(`last_read_page_${title}`, currentPage.toString());
      localStorage.setItem('last_read_book_title', title);
    } catch {}
    setShowExitConfirm(false);

    if (hasPushedHistoryRef.current && typeof window !== 'undefined' && window.location.hash.includes('doc-sach')) {
      hasPushedHistoryRef.current = false;
      try {
        window.history.back();
      } catch {
        onClose();
      }
    } else {
      onClose();
    }
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
        className={`sticky top-0 z-40 backdrop-blur-md flex flex-col transition-all duration-300 transform ${
          showHud ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        } ${
          readingTheme === 'ivory'
            ? 'bg-[#f4efe4]/95 text-slate-900 border-b border-black/10 shadow-md'
            : readingTheme === 'sepia'
            ? 'bg-[#1c130d]/95 text-[#f4ecd8] border-b border-amber-900/40 shadow-xl'
            : 'bg-black/90 text-slate-100 border-b border-white/10 shadow-xl'
        }`}
      >
        {/* TẦNG 1: TIÊU ĐỀ CUỐN SÁCH NẰM SÁT MÉP TRÊN CÙNG */}
        <div className={`w-full px-3 py-1 flex items-center justify-center border-b ${
          readingTheme === 'ivory' ? 'border-black/5 bg-[#ece5d8]' : 'border-white/5 bg-black/25'
        }`}>
          <span className={`text-[11px] sm:text-[12px] font-bold tracking-wide truncate max-w-[360px] sm:max-w-xl text-center ${
            readingTheme === 'ivory' ? 'text-[#3d2210]' : 'text-amber-200/90'
          }`}>
            {title} {author ? `· ${author}` : ''} {isEpub ? '· EPUB' : isPdf ? '· PDF' : isCbz ? '· CBZ' : ''}
          </span>
        </div>

        {/* TẦNG 2: TOÀN BỘ CÀI ĐẶT CŨ ĐẦY ĐỦ 100% (CÀI ĐẶT CHẾ ĐỘ VUỐT SÁCH + TẤT CẢ THANH CÔNG CỤ) */}
        <div className="w-full px-2 sm:px-4 py-1.5 flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Cụm trái: Nút Kệ sách + Cài đặt các chế độ vuốt lật sách (CURL 3D, ROLL 3D, SCROLL) */}
          <div className="flex items-center gap-1.5 shrink-0 z-20">
            <button
              type="button"
              onClick={handleExitBook}
              className="h-8 px-2 sm:px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white flex items-center gap-1 text-[11.5px] font-bold cursor-pointer transition-all border border-amber-500/30 active:scale-95 shadow-xs shrink-0"
              title="Đóng sách & Về kệ"
              aria-label="Thoát về kệ sách"
            >
              <ArrowLeft size={16} strokeWidth={2.4} />
              <span className="hidden xs:inline">Kệ sách</span>
            </button>

            {/* CỤM CÀI ĐẶT 3 CHẾ ĐỘ VUỐT SÁCH: LẬT 3D · TRƯỢT 3D · CUỘN DỌC */}
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
                  className={`w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-md flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                    readingMode === 'curl'
                      ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Lật cong nón 3D (Chuẩn SideBooks Tokyo Interplay)"
                  aria-label="Lật 3D"
                >
                  <BookOpen size={15} strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReadingMode('roll');
                    try {
                      localStorage.setItem('reader_mode_pref', 'roll');
                    } catch {}
                  }}
                  className={`w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-md flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                    readingMode === 'roll'
                      ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Vuốt trượt trang ngang 3D"
                  aria-label="Trượt 3D"
                >
                  <ArrowLeftRight size={15} strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReadingMode('scroll');
                    try {
                      localStorage.setItem('reader_mode_pref', 'scroll');
                    } catch {}
                  }}
                  className={`w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-md flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                    readingMode === 'scroll'
                      ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Cuộn trang dọc liên tục"
                  aria-label="Cuộn dọc"
                >
                  <ArrowUpDown size={15} strokeWidth={2.2} />
                </button>
              </div>
            )}
          </div>

          {/* Cụm phải: TOÀN BỘ CÁC CÁCH CÀI ĐẶT CŨ ĐẦY ĐỦ 100% (Cuộn ngang mượt mà, không bị mất bất kỳ nút nào) */}
          <div className="flex-1 flex items-center justify-end gap-1.5 overflow-x-auto no-scrollbar pl-1.5">
            {/* Cụm Thu phóng Zoom */}
            {!isEpub && (
              <div className="flex items-center bg-white/10 p-0.5 rounded-lg border border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => readerRef.current?.zoomOut?.()}
                  className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-md hover:bg-white/20 flex items-center justify-center text-amber-200 active:scale-95 transition-all cursor-pointer"
                  title="Thu nhỏ trang sách"
                  aria-label="Thu nhỏ"
                >
                  <ZoomOut size={15} strokeWidth={2.4} />
                </button>
                <button
                  type="button"
                  onClick={() => readerRef.current?.zoomIn?.()}
                  className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-md hover:bg-white/20 flex items-center justify-center text-amber-300 active:scale-95 transition-all cursor-pointer"
                  title="Phóng to trang sách"
                  aria-label="Phóng to"
                >
                  <ZoomIn size={15} strokeWidth={2.4} />
                </button>
              </div>
            )}

            {/* Nút Sách Nói (Audio Book) cho tài liệu PDF */}
            {isPdf && (
              <button
                type="button"
                onClick={togglePdfAudio}
                className={`h-7.5 sm:h-8 px-2 sm:px-2.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 text-xs font-bold shrink-0 ${
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

            {/* Nút Trợ lý AI Đồng hành Đọc Sách (Reading Copilot) */}
            <button
              type="button"
              onClick={() => (isAiCopilotOpen ? setIsAiCopilotOpen(false) : openAiCopilot())}
              className={`h-7.5 sm:h-8 px-2 sm:px-2.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 text-xs font-bold shrink-0 ${
                isAiCopilotOpen
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md ring-2 ring-amber-400/50'
                  : 'bg-white/10 hover:bg-white/20 text-amber-200 border border-white/10'
              }`}
              title={isAiCopilotOpen ? 'Đóng Trợ lý AI' : 'Hỏi Trợ lý AI về trang sách này (Tóm tắt, giải thích thuật ngữ, hỏi đáp)'}
              aria-label="Hỏi AI"
            >
              <Sparkles size={14} className={isAiCopilotOpen ? 'animate-spin text-slate-950' : 'text-amber-400'} />
              <span className="hidden sm:inline">Hỏi AI</span>
            </button>

            {/* Nút Tìm kiếm toàn văn trong sách */}
            <button
              type="button"
              onClick={() => setShowSearchModal(true)}
              className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg bg-white/10 hover:bg-white/20 text-amber-200 border border-white/10 flex items-center justify-center transition-all cursor-pointer active:scale-95 text-xs font-bold shrink-0"
              title="Tìm kiếm từ khóa trong cuốn sách"
              aria-label="Tìm kiếm trong sách"
            >
              <Search size={15} />
            </button>

            {/* Nút Sổ tay Ghi chú & Thẻ Flashcard 3D */}
            <button
              type="button"
              onClick={() => {
                setNotesModalInitialText(null);
                setShowNotesModal(true);
              }}
              className="h-7.5 sm:h-8 px-2 sm:px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-amber-200 border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 text-xs font-bold relative shrink-0"
              title="Sổ tay ghi chú & Thẻ ghi nhớ Flashcard 3D"
              aria-label="Sổ tay và Flashcard"
            >
              <BookMarked size={14} className="text-amber-400" />
              <span className="hidden md:inline">Sổ tay</span>
              {notesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-mono font-bold text-[9px] leading-none">
                  {notesCount}
                </span>
              )}
            </button>

            {/* Nút Cài đặt Phông chữ & Bionic Reading Aa */}
            <button
              type="button"
              onClick={() => setShowTypographyModal(true)}
              className={`h-7.5 sm:h-8 px-2 sm:px-2.5 rounded-lg border flex items-center gap-1 transition-all cursor-pointer active:scale-95 text-xs font-bold relative shrink-0 ${
                typographySettings.bionicReading
                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/50 shadow-xs'
                  : 'bg-white/10 hover:bg-white/20 text-amber-200 border-white/10'
              }`}
              title="Cài đặt phông chữ & Đọc siêu tốc Bionic"
              aria-label="Cài đặt phông chữ và Bionic reading"
            >
              <Type size={14} className="text-amber-400" />
              <span className="font-serif">Aa</span>
              {typographySettings.bionicReading && (
                <Sparkles size={11} className="text-amber-400 animate-pulse" />
              )}
            </button>

            {/* Nút Lưu Ngoại Tuyến (Offline Reading) */}
            {Boolean(activeFileUrl) && (
              <button
                type="button"
                onClick={isOfflineCached ? handleRemoveOffline : handleSaveOffline}
                disabled={isSavingOffline}
                className={`h-7.5 sm:h-8 px-2 sm:px-2.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 text-xs font-bold shrink-0 ${
                  isOfflineCached
                    ? 'bg-emerald-600/90 text-white shadow-md border border-emerald-400/40'
                    : isSavingOffline
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-wait'
                    : 'bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10'
                }`}
                title={
                  isOfflineCached
                    ? 'Đã lưu ngoại tuyến vào máy (Nhấn để xóa cache)'
                    : 'Lưu sách về bộ nhớ máy để đọc ngoại tuyến không cần mạng'
                }
                aria-label="Lưu ngoại tuyến"
              >
                {isSavingOffline ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-amber-400" />
                    <span className="hidden sm:inline font-mono">{offlineSaveProgress}%</span>
                  </>
                ) : isOfflineCached ? (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-300" />
                    <span className="hidden sm:inline">Offline ✓</span>
                  </>
                ) : (
                  <>
                    <Zap size={14} className="text-amber-400" />
                    <span className="hidden sm:inline">Lưu máy</span>
                  </>
                )}
              </button>
            )}

            {/* Nút Đánh dấu trang (Bookmark) */}
            <button
              type="button"
              onClick={toggleBookmark}
              className={`w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 ${
                isBookmarked
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'bg-white/10 hover:bg-white/20 text-slate-300 border border-white/10'
              }`}
              title={isBookmarked ? 'Bỏ đánh dấu trang này' : 'Đánh dấu trang này'}
              aria-label="Lưu trang"
            >
              <Bookmark size={16} strokeWidth={2.4} className={isBookmarked ? 'fill-current' : ''} />
            </button>

            {/* Nút Toàn màn hình (Fullscreen) */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 ${
                isFullscreen
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'bg-white/10 hover:bg-white/20 text-amber-200 border border-white/10'
              }`}
              title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình (F)'}
              aria-label="Toàn màn hình"
            >
              {isFullscreen ? <Minimize size={16} strokeWidth={2.4} /> : <Maximize size={16} strokeWidth={2.4} />}
            </button>

            {/* 3 Tông màu đọc sách (Sepia ☕ / Dark 🌑 / Ivory 📜) */}
            <div className="flex items-center gap-1 bg-black/45 p-1 rounded-lg border border-white/15 shrink-0">
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
            typographySettings={typographySettings}
            onOpenTypographyModal={() => setShowTypographyModal(true)}
            onCenterClick={toggleHud}
            onOpenAiCopilot={(selText) => openAiCopilot(selText)}
            onOpenNotesModal={(selText) => {
              setNotesModalInitialText(selText || null);
              setShowNotesModal(true);
            }}
            onPageProgress={(ch, totalCh) => {
              setCurrentPage(ch - 1);
              try {
                localStorage.setItem(`last_read_page_${title}`, (ch - 1).toString());
                localStorage.setItem('last_read_book_title', title);
              } catch {}
            }}
          />
        ) : pdfLoading && dynamicPdfPages.length === 0 && (!pages || pages.length === 0) ? (
          /* ĐANG TẢI TRANG ĐẦU CỦA FILE PDF KHI KHÔNG CÓ TRANG ẢNH SẴN */
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center text-amber-200">
            <Loader2 size={38} className="animate-spin text-amber-400" />
            <p className="text-base font-bold text-amber-200">
              Đang giải mã trang sách PDF chất lượng cao...
            </p>
            <p className="text-xs text-amber-300/70 max-w-sm">
              Hệ thống tải trực tiếp tài liệu nguyên bản và tối ưu bộ nhớ on-demand.
            </p>
            <button
              type="button"
              onClick={() => setPdfLoading(false)}
              className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold cursor-pointer transition-colors border border-amber-500/30"
            >
              Mở trang ngay lập tức
            </button>
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
              className={`px-3 py-1 rounded-full ${
                readingTheme === 'ivory'
                  ? 'bg-[#ece4d6] hover:bg-[#e2d8c7] text-[#3d2210] border-[#d8ccba]'
                  : 'bg-black/45 hover:bg-black/75 text-amber-300/90 hover:text-amber-200 border-white/15'
              } backdrop-blur-md border active:scale-95 transition-all flex items-center gap-1 text-[11.5px] font-bold shadow-md cursor-pointer select-none`}
              title={currentPage <= 0 ? 'Thoát về kệ sách' : 'Về trang trước'}
              aria-label="Về trang"
            >
              <ChevronLeft size={16} />
              <span>Về trang</span>
            </button>

            <div className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full ${
              readingTheme === 'ivory'
                ? 'bg-[#ece4d6] border-[#d8ccba] text-[#3d2210]'
                : 'bg-white/10 border-white/10 text-amber-200'
            } border text-xs font-mono font-bold shadow-inner`}>
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
              className={`px-3 py-1 rounded-full ${
                readingTheme === 'ivory'
                  ? 'bg-[#ece4d6] hover:bg-[#e2d8c7] text-[#3d2210] border-[#d8ccba]'
                  : 'bg-black/45 hover:bg-black/75 text-amber-300/90 hover:text-amber-200 border-white/15'
              } backdrop-blur-md border active:scale-95 transition-all flex items-center gap-1 text-[11.5px] font-bold shadow-md cursor-pointer select-none`}
              title={currentPage >= totalPages - 1 ? 'Hoàn thành & Thoát sách' : 'Mở trang sau'}
              aria-label="Mở trang"
            >
              <span>Mở trang</span>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* HÀNG DƯỚI: THANH TRƯỢT TUA NHANH */}
          <div className="w-full max-w-md flex items-center gap-2 px-1 pt-0.5">
            <span className={`text-[10px] font-mono w-5 text-right ${
              readingTheme === 'ivory' ? 'text-[#6a4224]' : 'text-slate-400'
            }`}>
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
              className={`flex-1 accent-amber-600 h-1.5 ${
                readingTheme === 'ivory' ? 'bg-[#d8ccba]' : 'bg-slate-700/80'
              } rounded-lg cursor-pointer`}
              aria-label="Xem nhanh trang"
            />
            <span className={`text-[10px] font-mono w-5 ${
              readingTheme === 'ivory' ? 'text-[#6a4224]' : 'text-slate-400'
            }`}>
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

      {/* 5. TRỢ LÝ AI ĐỒNG HÀNH ĐỌC SÁCH (READING COPILOT) */}
      <ReaderAiCopilot
        isOpen={isAiCopilotOpen}
        onClose={() => setIsAiCopilotOpen(false)}
        bookTitle={title}
        author={author}
        currentPage={currentPage}
        totalPages={totalPages}
        selectedText={copilotSelectedText}
        pageContent={currentPageText}
        onClearSelection={() => setCopilotSelectedText(null)}
        readingTheme={readingTheme}
      />

      {/* 6. MODAL SỔ TAY GHI CHÚ & THẺ FLASHCARD 3D */}
      <ReaderNotesModal
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        bookTitle={title}
        currentPage={currentPage}
        initialSelectedText={notesModalInitialText}
        onJumpToPage={(p1Based) => {
          const p0 = p1Based - 1;
          setCurrentPage(p0);
          readerRef.current?.goToPage(p0);
        }}
        readingTheme={readingTheme}
      />

      {/* 7. MODAL TÌM KIẾM TOÀN VĂN TRONG SÁCH */}
      <ReaderSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        bookTitle={title}
        totalPages={totalPages}
        pdfProvider={pdfProvider}
        onSelectResult={(p1Based) => {
          const p0 = p1Based - 1;
          setCurrentPage(p0);
          readerRef.current?.goToPage(p0);
        }}
      />

      {/* 8. MODAL CÀI ĐẶT PHÔNG CHỮ & BIONIC READING */}
      <ReaderTypographyModal
        isOpen={showTypographyModal}
        onClose={() => setShowTypographyModal(false)}
        currentSettings={typographySettings}
        onChange={(newSettings) => setTypographySettings(newSettings)}
        readingTheme={readingTheme === 'dark' ? 'dark' : readingTheme === 'sepia' ? 'sepia' : 'light'}
      />
    </div>
  );
}
