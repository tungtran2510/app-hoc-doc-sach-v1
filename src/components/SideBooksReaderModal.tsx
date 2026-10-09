'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Volume2,
  VolumeX,
  Menu,
  ChevronDown,
  Check,
  MoreVertical,
  List,
  Heart,
} from 'lucide-react';
import SideBooksReaderEngine, {
  SideBooksReaderEngineRef,
} from './SideBooksReaderEngine';
import EpubReaderView from './EpubReaderView';
import ReaderAiCopilot from './ReaderAiCopilot';
import ReaderNotesModal from './ReaderNotesModal';
import ReaderSearchModal from './ReaderSearchModal';
import ReaderTypographyModal from './ReaderTypographyModal';
import ReaderSoundModal from './ReaderSoundModal';
import BookAudioPlayerBar from './BookAudioPlayerBar';
import AudiobookPlayerModal from './AudiobookPlayerModal';
import { readingNotesStorage } from '../lib/readingNotes';
import { bookAudioPlayer, extractParagraphsFromPdfText } from '../lib/audioSpeech';
import { offlineStorage, formatBytes } from '../lib/offlineStorage';
import { TypographySettings, getStoredTypography } from '../lib/typographyEngine';
import { readingStreakEngine } from '../lib/readingStreak';
import { pageSoundEngine } from '../lib/pageSoundEngine';
import {
  detectEbookFormat,
  createPdfPageProvider,
  extractCbzImages,
  PdfPageProvider,
  EpubChapter,
} from '../lib/ebookEngine';
import {
  isBookFavorite,
  toggleBookFavorite,
  addReadingHistory,
} from '../lib/userFavoritesHistory';
import { BookTocItem, getBookToc } from '../lib/bookTocData';
import { findRealAudioForBook, OnlineBookItem } from '../lib/onlineLibraryData';
import { playTapSound } from '../lib/audioFeedback';

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
  const [readingTheme, setReadingTheme] = useState<'dark' | 'sepia' | 'ivory'>('dark');
  const [readingMode, setReadingMode] = useState<'curl' | 'roll' | 'scroll'>('curl');
  const [showHud, setShowHud] = useState<boolean>(true);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [showTocModal, setShowTocModal] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isPdfAudioOpen, setIsPdfAudioOpen] = useState<boolean>(false);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);
  const [showSoundModal, setShowSoundModal] = useState<boolean>(false);

  // Phát hiện chính xác cuốn sách có SÁCH NÓI THẬT (Studio MP3/M4A) hay không
  // TUYỆT ĐỐI KHÔNG HIỂN THỊ NÚT TAI NGHE NẾU SÁCH KHÔNG CÓ BẢN AUDIO THẬT
  const realAudioBook = useMemo(() => {
    return findRealAudioForBook(title, author || undefined);
  }, [title, author]);

  const [activeRealAudio, setActiveRealAudio] = useState<{
    id: string;
    title: string;
    author: string;
    coverUrl?: string;
    audioUrl: string;
    audioNarrator?: string;
    durationFormatted?: string;
  } | null>(null);
  const [showRealAudioModal, setShowRealAudioModal] = useState<boolean>(false);

  // Quản lý menu xổ ra Dropdowns (TOC Mục Lục, Reading Mode Chế Độ Đọc, Theme Tông Màu, Tools Tiện Ích)
  const [activeDropdown, setActiveDropdown] = useState<'none' | 'toc' | 'mode' | 'theme' | 'tools'>('none');
  const activeDropdownRef = useRef<'none' | 'toc' | 'mode' | 'theme' | 'tools'>(activeDropdown);
  activeDropdownRef.current = activeDropdown;

  // Dữ liệu chương sách EPUB
  const [epubChapters, setEpubChapters] = useState<Array<{ id: string; title: string; href?: string }>>([]);
  const [epubFullChapters, setEpubFullChapters] = useState<EpubChapter[]>([]);
  const [targetEpubChapterIdx, setTargetEpubChapterIdx] = useState<number | null>(null);
  const [currentEpubChapterIdx, setCurrentEpubChapterIdx] = useState<number>(0);

  // State Yêu thích (Favorite)
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

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
  const activeFormat = detectEbookFormat(fileName, activeFileUrl);
  const isAudio =
    activeFormat === 'audio' ||
    Boolean(
      activeFileUrl &&
        (activeFileUrl.toLowerCase().includes('.mp3') ||
          activeFileUrl.toLowerCase().includes('.m4a') ||
          activeFileUrl.toLowerCase().includes('.audio'))
    ) ||
    Boolean(fileName && (fileName.toLowerCase().endsWith('.mp3') || fileName.toLowerCase().endsWith('.m4a')));
  const isEpub = activeFormat === 'epub' && !isAudio;
  const isPdf =
    (activeFormat === 'pdf' || (Boolean(activeFileUrl) && !isEpub && activeFileUrl?.toLowerCase().includes('.pdf'))) &&
    !isAudio;
  const isCbz = (activeFormat === 'cbz' || activeFormat === 'cbr') && !isAudio;
  const isTxt = activeFormat === 'txt' && !isAudio;

  // State cho bộ đọc PDF động (On-Demand Provider)
  const [pdfProvider, setPdfProvider] = useState<PdfPageProvider | null>(null);
  const [dynamicPdfPages, setDynamicPdfPages] = useState<string[]>([]);
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [cbzPages, setCbzPages] = useState<string[]>([]);
  const [pdfOutline, setPdfOutline] = useState<BookTocItem[]>([]);

  useEffect(() => {
    if (isPdf && pdfProvider?.getOutline) {
      pdfProvider.getOutline().then((items) => {
        if (items && items.length > 0) {
          setPdfOutline(items);
        }
      }).catch(() => {});
    }
  }, [isPdf, pdfProvider]);

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
  const isClosingRef = useRef<boolean>(false);

  // Quản lý Lịch sử Trình duyệt (Browser History & PopState) khi đọc sách
  // Giúp nút Quay lại của điện thoại (Android Back gesture/button, Swipe Back, Browser Back)
  // đóng sách an toàn và quay về Kệ Sách - TUYỆT ĐỐI KHÔNG ĐỂ THOÁT KHỎI ỨNG DỤNG!
  useEffect(() => {
    if (!isOpen) {
      isClosingRef.current = false;
      if (typeof window !== 'undefined' && window.location.hash.includes('doc-sach')) {
        hasPushedHistoryRef.current = false;
        try {
          const cleanUrl = window.location.pathname + window.location.search;
          window.history.replaceState(null, '', cleanUrl);
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

      // A. Nếu đang mở bất kỳ dropdown hoặc modal con nào -> đóng trước và giữ sách!
      if (activeDropdownRef.current !== 'none') {
        setActiveDropdown('none');
        repushHistory();
        return;
      }

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
      if (isClosingRef.current) return;
      isClosingRef.current = true;
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
      if (typeof window !== 'undefined' && window.location.hash.includes('doc-sach')) {
        hasPushedHistoryRef.current = false;
        try {
          const cleanUrl = window.location.pathname + window.location.search;
          window.history.replaceState(null, '', cleanUrl);
        } catch {}
      }
    };
  }, [isOpen, title]);

  // Đóng dropdown khi người dùng chạm hoặc click bên ngoài
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.reader-dropdown-container')) {
        setActiveDropdown('none');
      }
    };
    if (activeDropdown !== 'none') {
      window.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [activeDropdown]);

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

        // Timeout an toàn 12.0 giây để bảo vệ app khi tải thư viện PDF trên mạng di động
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('PDF loading timeout sau 12.0s')), 12000)
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
        let buffer: ArrayBuffer;
        try {
          const cached = await offlineStorage.getBookFromOffline(activeFileUrl!);
          if (cached && cached.fileBlob) {
            buffer = await cached.fileBlob.arrayBuffer();
          } else if (cached && cached.blobUrl) {
            const res = await fetch(cached.blobUrl);
            buffer = await res.arrayBuffer();
          } else {
            const res = await fetch(activeFileUrl!);
            buffer = await res.arrayBuffer();
          }
        } catch {
          const res = await fetch(activeFileUrl!);
          buffer = await res.arrayBuffer();
        }
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

  // Mục lục toàn cuốn sách hợp nhất (ưu tiên EPUB chapters, PDF outline, hoặc mục lục chuẩn tuyển chọn)
  const computedToc = useMemo<BookTocItem[]>(() => {
    if (isEpub && epubFullChapters.length > 0) {
      return epubFullChapters.map((ch, idx) => ({
        id: ch.id || `epub-ch-${idx}`,
        title: ch.title || `Chương ${idx + 1}`,
        pageIndex: idx,
        pageNumber: idx + 1,
      }));
    }
    if (pdfOutline.length > 0) {
      return pdfOutline;
    }
    return getBookToc(title, totalPages);
  }, [isEpub, epubFullChapters, pdfOutline, title, totalPages]);

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
        if (activeDropdownRef.current !== 'none') {
          setActiveDropdown('none');
        } else {
          setShowExitConfirm(true);
        }
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
      } else {
        setReadingTheme('dark');
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

  useEffect(() => {
    if (!isOpen || !title) return;
    try {
      setIsFavorite(isBookFavorite(title));
      const savedBm = localStorage.getItem(`bookmark_page_${title}`);
      if (savedBm !== null && parseInt(savedBm, 10) === currentPage) {
        setIsBookmarked(true);
      } else {
        setIsBookmarked(false);
      }
    } catch {
      setIsBookmarked(false);
    }
  }, [isOpen, title, currentPage]);

  const toggleBookmark = () => {
    const nextState = !isBookmarked;
    setIsBookmarked(nextState);
    try {
      if (nextState) {
        localStorage.setItem(`bookmark_page_${title}`, currentPage.toString());
      } else {
        localStorage.removeItem(`bookmark_page_${title}`);
      }
    } catch {}
  };

  const handleToggleFavorite = () => {
    const nextFav = toggleBookFavorite({
      id: title,
      title,
      author,
      coverUrl,
      fileUrl: activeFileUrl,
      fileName,
      format: isEpub ? 'epub' : isPdf ? 'pdf' : isCbz ? 'cbz' : isTxt ? 'txt' : 'flipbook',
    });
    setIsFavorite(nextFav);
  };

  // Khi đóng modal hoặc thoát sách thì dừng audio
  useEffect(() => {
    if (!isOpen) {
      bookAudioPlayer.stop();
      setIsPdfAudioOpen(false);
    }
  }, [isOpen]);

  // Đồng bộ tổng số trang vào bộ nhớ phục vụ tính % tiến độ chuẩn xác
  useEffect(() => {
    if (isOpen && title && totalPages > 1) {
      try {
        localStorage.setItem(`total_pages_${title}`, totalPages.toString());
      } catch {}
    }
  }, [isOpen, title, totalPages]);

  // Cứ mỗi 60s mở đọc sách, tự động ghi nhận 1 phút đọc vào Reading Streak
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      try {
        readingStreakEngine.recordMinutes(1);
      } catch {}
    }, 60000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const startPdfPageAudio = async (pageNum1Based: number) => {
    try {
      let text = '';
      if (pdfProvider) {
        try {
          text = await pdfProvider.getPageText(pageNum1Based);
        } catch (err) {
          console.warn('Lỗi getPageText từ pdfProvider:', err);
        }
      }

      // Nếu không có text từ PDF.js (ví dụ scan ảnh / infographic), dùng currentPageText hoặc lời dẫn thông minh
      if (!text || text.trim().length < 5) {
        if (currentPageText && currentPageText.trim().length >= 5) {
          text = currentPageText;
        } else {
          text = `Trang ${pageNum1Based}, cuốn sách ${title}. Nội dung trang này ở định dạng hình ảnh đồ họa trực quan. Bạn có thể bấm nút Trợ lý AI ở thanh trên cùng để hỏi đáp và phân tích chi tiết.`;
          setAudioNotice('Trang ở định dạng hình ảnh. Đang phát lời dẫn AI.');
          setTimeout(() => setAudioNotice(null), 3500);
        }
      }

      bookAudioPlayer.setBookContext(
        title,
        author || 'Tác giả',
        coverUrl || undefined,
        `Trang ${pageNum1Based} / ${totalPages}`
      );
      const paras = extractParagraphsFromPdfText(text);
      if (paras.length === 0) {
        paras.push(text);
      }
      bookAudioPlayer.setQueue(paras, 0);
      bookAudioPlayer.play(0);
    } catch (err) {
      console.warn('Lỗi đọc audio trang PDF:', err);
    }
  };

  const handleOpenRealAudio = () => {
    if (!realAudioBook) return;
    playTapSound();
    setActiveRealAudio({
      id: realAudioBook.id,
      title: realAudioBook.title,
      author: realAudioBook.author,
      coverUrl: coverUrl || realAudioBook.coverUrl,
      audioUrl: realAudioBook.downloadUrl,
      audioNarrator: realAudioBook.audioNarrator || 'Diễn đọc MC Y Khoa Truyền Cảm',
      durationFormatted: realAudioBook.durationFormatted,
    });
    setShowRealAudioModal(true);
  };

  const togglePdfAudio = () => {
    if (realAudioBook) {
      handleOpenRealAudio();
      return;
    }
    if (isPdfAudioOpen) {
      bookAudioPlayer.stop();
      setIsPdfAudioOpen(false);
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
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    bookAudioPlayer.stop();
    setIsPdfAudioOpen(false);
    try {
      localStorage.setItem(`last_read_page_${title}`, currentPage.toString());
      localStorage.setItem('last_read_book_title', title);
      addReadingHistory({
        bookTitle: title,
        author,
        coverUrl,
        fileUrl: activeFileUrl,
        fileName,
        format: isEpub ? 'epub' : isPdf ? 'pdf' : isCbz ? 'cbz' : isTxt ? 'txt' : 'flipbook',
        page: currentPage,
        totalPages: Math.max(1, isEpub ? (epubFullChapters.length || totalPages) : totalPages),
      });
    } catch {}
    setShowExitConfirm(false);

    if (typeof window !== 'undefined' && window.location.hash.includes('doc-sach')) {
      try {
        const cleanUrl = window.location.pathname + window.location.search;
        window.history.replaceState(null, '', cleanUrl);
      } catch {}
    }
    hasPushedHistoryRef.current = false;
    onClose();
  };

  const playPaperSound = () => {
    try {
      pageSoundEngine.playFlipSound();
    } catch {}
  };

  if (!isOpen) return null;

  if (isAudio) {
    return (
      <AudiobookPlayerModal
        isOpen={isOpen}
        onClose={onClose}
        book={{
          id: title,
          title,
          author: author || 'Tác giả',
          coverUrl: coverUrl || undefined,
          audioUrl: activeFileUrl || '',
          durationFormatted: 'Sách nói MP3',
        }}
        isDownloaded={isOfflineCached}
        onDownload={handleSaveOffline}
        onDeleteDownload={handleRemoveOffline}
      />
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Đang đọc sách ${title}`}
      className={`fixed inset-0 z-50 flex flex-col overflow-hidden animate-in fade-in duration-200 ${
        readingTheme === 'ivory'
          ? 'bg-[#ede5d8] text-[#2c180c]'
          : readingTheme === 'sepia'
          ? 'bg-[#1c130d] text-[#f4ecd8]'
          : 'bg-[#0a0705] text-slate-100'
      }`}
    >
      {/* ================= 1. THANH ĐIỀU HƯỚNG ĐỈNH (FIXED HUD TRÊN CÙNG - KHÔNG ĐỂ LẠI KHOẢNG TRỐNG KHI ẨN) ================= */}
      <header
        className={`fixed top-0 inset-x-0 z-40 backdrop-blur-md flex flex-col transition-all duration-300 transform select-none ${
          showHud ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        } ${
          readingTheme === 'ivory'
            ? 'bg-[#ede5d8] text-[#2c180c] border-b border-[#cdbdab] shadow-sm'
            : readingTheme === 'sepia'
            ? 'bg-[#1c130d]/95 text-[#f4ecd8] border-b border-amber-900/40 shadow-xl'
            : 'bg-black/90 text-slate-100 border-b border-white/10 shadow-xl'
        }`}
      >
        {/* TẦNG 1: TIÊU ĐỀ CUỐN SÁCH NẰM SÁT MÉP TRÊN CÙNG */}
        <div className={`w-full px-3 py-1 flex items-center justify-center border-b ${
          readingTheme === 'ivory' ? 'border-[#dfcfbd] bg-[#e6dac7]' : 'border-white/5 bg-black/25'
        }`}>
          <span className={`text-[11px] sm:text-[12px] font-bold tracking-wide truncate max-w-[360px] sm:max-w-xl text-center ${
            readingTheme === 'ivory' ? 'text-[#2c180c]' : 'text-amber-200/90'
          }`}>
            {title} {author ? `· ${author}` : ''} {isEpub ? '· EPUB' : isPdf ? '· PDF' : isCbz ? '· CBZ' : ''}
          </span>
        </div>

        {/* TẦNG 2: THANH CÔNG CỤ TINH GỌN (MENU XỔ RA CHO CÁC NHÓM CÀI ĐẶT > 2) */}
        <div className="w-full px-2 sm:px-4 py-1.5 flex items-center justify-between gap-1.5 sm:gap-2 relative reader-dropdown-container">
          {/* Cụm trái: Nút Kệ sách + Nút Ba Thanh (Mục lục xổ ra) + Nút Chế độ đọc (Xổ ra) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* 1. NÚT VỀ KỆ SÁCH */}
            <button
              type="button"
              onClick={handleExitBook}
              className={`h-8 px-2 sm:px-2.5 rounded-lg flex items-center gap-1 text-[11.5px] font-bold cursor-pointer transition-all active:scale-95 shadow-xs shrink-0 ${
                readingTheme === 'ivory'
                  ? 'bg-[#d8c8b2] hover:bg-[#cbb89e] text-[#2c180c] border border-[#bfae97]'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white border border-amber-500/30'
              }`}
              title="Đóng sách & Về kệ"
              aria-label="Thoát về kệ sách"
            >
              <ArrowLeft size={16} strokeWidth={2.4} />
              <span className="hidden xs:inline">Kệ</span>
            </button>

            {/* 2. NÚT BA THANH [≡] (MỤC LỤC XỔ RA) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown((prev) => (prev === 'toc' ? 'none' : 'toc'))}
                className={`h-8 px-2 sm:px-2.5 rounded-lg flex items-center gap-1 text-[11.5px] font-bold cursor-pointer transition-all active:scale-95 shadow-xs shrink-0 ${
                  activeDropdown === 'toc'
                    ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/50'
                    : readingTheme === 'ivory'
                    ? 'bg-[#e2d5c3] hover:bg-[#d8c8b2] text-[#2c180c] border border-[#cdbdab]'
                    : 'bg-white/10 hover:bg-white/20 text-amber-200 border border-white/10'
                }`}
                title="Mục lục chương & điều hướng nhanh (Xổ ra)"
                aria-label="Mục lục"
              >
                <Menu size={16} strokeWidth={2.4} />
                <span className="hidden sm:inline">Mục lục</span>
                <ChevronDown size={11} className={`transition-transform duration-200 ${activeDropdown === 'toc' ? 'rotate-180' : ''}`} />
              </button>

              {/* DROPDOWN MỤC LỤC */}
              {activeDropdown === 'toc' && (
                <div
                  className={`absolute left-0 top-full mt-1.5 w-72 sm:w-80 rounded-2xl shadow-2xl border p-2 z-50 animate-in fade-in zoom-in-95 duration-150 ${
                    readingTheme === 'ivory'
                      ? 'bg-[#ede5d8] border-[#cdbdab] text-[#2c180c]'
                      : readingTheme === 'sepia'
                      ? 'bg-[#231810] border-amber-900/60 text-[#f4ecd8]'
                      : 'bg-[#181310] border-white/15 text-slate-100'
                  }`}
                >
                  <div className="px-2 py-1.5 border-b border-black/10 dark:border-white/10 flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                      <List size={14} />
                      {isEpub
                        ? `Mục Lục Chương (${epubChapters.length})`
                        : `Mục Lục & Trang Sách (${totalPages} trang)`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveDropdown('none')}
                      className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 opacity-70 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  {isEpub ? (
                    /* Danh sách chương EPUB */
                    <div className="max-h-72 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {epubChapters.length > 0 ? (
                        epubChapters.map((chap, idx) => (
                          <button
                            key={chap.id || idx}
                            type="button"
                            onClick={() => {
                              setTargetEpubChapterIdx(idx);
                              setCurrentEpubChapterIdx(idx);
                              setActiveDropdown('none');
                            }}
                            className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                              currentEpubChapterIdx === idx
                                ? readingTheme === 'ivory'
                                  ? 'bg-[#dfcfbd] font-bold text-[#2c180c] ring-1 ring-[#bfae97]'
                                  : 'bg-amber-500/20 text-amber-300 font-bold ring-1 ring-amber-500/40'
                                : readingTheme === 'ivory'
                                ? 'hover:bg-black/5 text-[#4a3220]'
                                : 'hover:bg-white/10 text-slate-300'
                            }`}
                          >
                            <span className="truncate flex-1">
                              <span className="opacity-50 font-mono text-[10.5px] mr-1.5">#{idx + 1}</span>
                              {chap.title}
                            </span>
                            {currentEpubChapterIdx === idx && (
                              <Check size={14} className="text-amber-400 shrink-0" />
                            )}
                          </button>
                        ))
                      ) : computedToc.length > 0 ? (
                        computedToc.map((item, idx) => (
                          <button
                            key={item.id || idx}
                            type="button"
                            onClick={() => {
                              setTargetEpubChapterIdx(item.pageIndex);
                              setCurrentEpubChapterIdx(item.pageIndex);
                              setActiveDropdown('none');
                            }}
                            className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                              currentEpubChapterIdx === item.pageIndex
                                ? readingTheme === 'ivory'
                                  ? 'bg-[#dfcfbd] font-bold text-[#2c180c] ring-1 ring-[#bfae97]'
                                  : 'bg-amber-500/20 text-amber-300 font-bold ring-1 ring-amber-500/40'
                                : readingTheme === 'ivory'
                                ? 'hover:bg-black/5 text-[#4a3220]'
                                : 'hover:bg-white/10 text-slate-300'
                            }`}
                          >
                            <span className="truncate flex-1">
                              <span className="opacity-50 font-mono text-[10.5px] mr-1.5">#{idx + 1}</span>
                              {item.title}
                            </span>
                            {currentEpubChapterIdx === item.pageIndex && (
                              <Check size={14} className="text-amber-400 shrink-0" />
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs opacity-60">
                          Đang tải mục lục chương...
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Điều hướng trang & Mục lục chương cho PDF / CBZ */
                    <div className="p-2 space-y-2.5 text-xs">
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentPage(0);
                            readerRef.current?.goToPage(0);
                            setActiveDropdown('none');
                          }}
                          className="px-2.5 py-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 font-bold text-center transition-colors cursor-pointer"
                        >
                          Trang đầu (1)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const lastP = Math.max(0, totalPages - 1);
                            setCurrentPage(lastP);
                            readerRef.current?.goToPage(lastP);
                            setActiveDropdown('none');
                          }}
                          className="px-2.5 py-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 font-bold text-center transition-colors cursor-pointer"
                        >
                          Trang cuối ({totalPages})
                        </button>
                      </div>

                      <div className="pt-2 border-t border-black/10 dark:border-white/10">
                        <div className="flex items-center justify-between text-[11px] mb-1 opacity-70">
                          <span>Nhảy nhanh đến trang:</span>
                          <span className="font-mono font-bold text-amber-400">Trang {currentPage + 1}/{totalPages}</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={Math.max(1, totalPages - 1)}
                          value={currentPage}
                          onChange={(e) => {
                            const p = parseInt(e.target.value, 10);
                            setCurrentPage(p);
                            readerRef.current?.goToPage(p);
                          }}
                          className="w-full accent-amber-500 h-1.5 bg-black/20 dark:bg-white/20 rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* BẢNG MỤC LỤC CHƯƠNG CHI TIẾT THEO PHÂN ĐOẠN COMPUTED TOC */}
                      {computedToc.length > 0 && (
                        <div className="pt-2 border-t border-black/10 dark:border-white/10 space-y-1">
                          <div className="flex items-center justify-between px-1 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                              Mục lục chương ({computedToc.length})
                            </span>
                            <span className="text-[9.5px] opacity-60 font-mono">Chạm để nhảy</span>
                          </div>
                          <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar">
                            {computedToc.map((item, idx) => {
                              const nextItem = computedToc[idx + 1];
                              const isActive =
                                currentPage >= item.pageIndex &&
                                (!nextItem || currentPage < nextItem.pageIndex);
                              return (
                                <button
                                  key={item.id || idx}
                                  type="button"
                                  onClick={() => {
                                    setCurrentPage(item.pageIndex);
                                    readerRef.current?.goToPage(item.pageIndex);
                                    setActiveDropdown('none');
                                  }}
                                  className={`w-full text-left px-2 py-1.5 rounded-xl text-xs flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                                    isActive
                                      ? readingTheme === 'ivory'
                                        ? 'bg-[#dfcfbd] font-bold text-[#2c180c] ring-1 ring-[#bfae97]'
                                        : 'bg-amber-500/20 text-amber-300 font-bold ring-1 ring-amber-500/40'
                                      : readingTheme === 'ivory'
                                      ? 'hover:bg-black/5 text-[#4a3220]'
                                      : 'hover:bg-white/10 text-slate-300'
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="opacity-70 font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10 shrink-0">
                                        Trang {item.pageNumber}
                                      </span>
                                      <span className="truncate font-semibold text-[11px]">{item.title}</span>
                                    </div>
                                    {item.summary && (
                                      <p className="text-[9.5px] opacity-60 line-clamp-1 mt-0.5 ml-0.5">
                                        {item.summary}
                                      </p>
                                    )}
                                  </div>
                                  {isActive && <Check size={13} className="text-amber-400 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. NÚT CHẾ ĐỘ ĐỌC (XỔ RA: CUỘN VÔ HẠN / LẬT 3D / TRƯỢT 3D) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown((prev) => (prev === 'mode' ? 'none' : 'mode'))}
                className={`h-8 px-2 sm:px-2.5 rounded-lg flex items-center gap-1 text-[11.5px] font-bold cursor-pointer transition-all active:scale-95 shadow-xs shrink-0 ${
                  activeDropdown === 'mode'
                    ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/50'
                    : readingTheme === 'ivory'
                    ? 'bg-[#e2d5c3] hover:bg-[#d8c8b2] text-[#2c180c] border border-[#cdbdab]'
                    : 'bg-white/10 hover:bg-white/20 text-amber-200 border border-white/10'
                }`}
                title="Cài đặt chế độ đọc (Xổ ra)"
                aria-label="Chế độ đọc sách"
              >
                {readingMode === 'scroll' ? (
                  <ArrowUpDown size={15} strokeWidth={2.4} />
                ) : readingMode === 'roll' ? (
                  <ArrowLeftRight size={15} strokeWidth={2.4} />
                ) : (
                  <BookOpen size={15} strokeWidth={2.4} />
                )}
                <span className="text-[11px] hidden xs:inline">
                  {readingMode === 'scroll' ? 'Cuộn vô hạn' : readingMode === 'roll' ? 'Trượt 3D' : 'Lật 3D'}
                </span>
                <ChevronDown size={11} className={`transition-transform duration-200 ${activeDropdown === 'mode' ? 'rotate-180' : ''}`} />
              </button>

              {/* DROPDOWN CHẾ ĐỘ ĐỌC */}
              {activeDropdown === 'mode' && (
                <div
                  className={`absolute left-0 top-full mt-1.5 w-64 sm:w-72 rounded-2xl shadow-2xl border p-2 z-50 animate-in fade-in zoom-in-95 duration-150 ${
                    readingTheme === 'ivory'
                      ? 'bg-[#ede5d8] border-[#cdbdab] text-[#2c180c]'
                      : readingTheme === 'sepia'
                      ? 'bg-[#231810] border-amber-900/60 text-[#f4ecd8]'
                      : 'bg-[#181310] border-white/15 text-slate-100'
                  }`}
                >
                  <div className="px-2 py-1 text-xs font-bold text-amber-500 border-b border-black/10 dark:border-white/10 mb-1.5">
                    Chọn Chế Độ Đọc
                  </div>

                  <div className="space-y-1">
                    {/* Chế độ 1: Cuộn vô hạn xuống dưới */}
                    <button
                      type="button"
                      onClick={() => {
                        setReadingMode('scroll');
                        try {
                          localStorage.setItem('reader_mode_pref', 'scroll');
                        } catch {}
                        setActiveDropdown('none');
                      }}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                        readingMode === 'scroll'
                          ? readingTheme === 'ivory'
                            ? 'bg-[#dfcfbd] font-bold text-[#2c180c] ring-1 ring-[#bfae97]'
                            : 'bg-amber-500/20 text-amber-300 font-bold ring-1 ring-amber-500/40'
                          : readingTheme === 'ivory'
                          ? 'hover:bg-black/5 text-[#4a3220]'
                          : 'hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 text-amber-400">
                        <ArrowUpDown size={15} strokeWidth={2.4} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[11.5px]">Cuộn vô hạn xuống</span>
                          <span className="px-1 py-0.2 rounded text-[8px] bg-amber-500/20 text-amber-400 font-mono font-bold">Tối ưu</span>
                        </div>
                        <p className="text-[9.5px] opacity-70 truncate">Đọc lướt văn bản liên tục mượt mà</p>
                      </div>
                      {readingMode === 'scroll' && <Check size={14} className="text-amber-400 shrink-0" />}
                    </button>

                    {/* Chế độ 2: Lật trang 3D */}
                    <button
                      type="button"
                      onClick={() => {
                        setReadingMode('curl');
                        try {
                          localStorage.setItem('reader_mode_pref', 'curl');
                        } catch {}
                        setActiveDropdown('none');
                      }}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                        readingMode === 'curl'
                          ? readingTheme === 'ivory'
                            ? 'bg-[#dfcfbd] font-bold text-[#2c180c] ring-1 ring-[#bfae97]'
                            : 'bg-amber-500/20 text-amber-300 font-bold ring-1 ring-amber-500/40'
                          : readingTheme === 'ivory'
                          ? 'hover:bg-black/5 text-[#4a3220]'
                          : 'hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 text-amber-400">
                        <BookOpen size={15} strokeWidth={2.4} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-[11.5px] block">Lật trang cong 3D</span>
                        <p className="text-[9.5px] opacity-70 truncate">Lật nón Tokyo SideBooks nghệ thuật</p>
                      </div>
                      {readingMode === 'curl' && <Check size={14} className="text-amber-400 shrink-0" />}
                    </button>

                    {/* Chế độ 3: Trượt ngang 3D */}
                    <button
                      type="button"
                      onClick={() => {
                        setReadingMode('roll');
                        try {
                          localStorage.setItem('reader_mode_pref', 'roll');
                        } catch {}
                        setActiveDropdown('none');
                      }}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                        readingMode === 'roll'
                          ? readingTheme === 'ivory'
                            ? 'bg-[#dfcfbd] font-bold text-[#2c180c] ring-1 ring-[#bfae97]'
                            : 'bg-amber-500/20 text-amber-300 font-bold ring-1 ring-amber-500/40'
                          : readingTheme === 'ivory'
                          ? 'hover:bg-black/5 text-[#4a3220]'
                          : 'hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 text-amber-400">
                        <ArrowLeftRight size={15} strokeWidth={2.4} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-[11.5px] block">Trượt ngang 3D</span>
                        <p className="text-[9.5px] opacity-70 truncate">Vuốt trượt trang ngang mượt mà</p>
                      </div>
                      {readingMode === 'roll' && <Check size={14} className="text-amber-400 shrink-0" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cụm phải: Nút Tông màu (Xổ ra) + Aa phông chữ + Sách nói (nếu có) + Nút Tiện ích (Xổ ra) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* 4. NÚT CHẾ ĐỘ TỐI / SÁNG (XỔ RA 3 TÔNG MÀU) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown((prev) => (prev === 'theme' ? 'none' : 'theme'))}
                className={`h-8 px-2 sm:px-2.5 rounded-lg flex items-center gap-1 text-[11.5px] font-bold cursor-pointer transition-all active:scale-95 shadow-xs shrink-0 ${
                  activeDropdown === 'theme'
                    ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/50'
                    : readingTheme === 'ivory'
                    ? 'bg-[#e2d5c3] hover:bg-[#d8c8b2] text-[#2c180c] border border-[#cdbdab]'
                    : 'bg-white/10 hover:bg-white/20 text-amber-200 border border-white/10'
                }`}
                title="Tông màu đọc sách (Xổ ra)"
                aria-label="Tông màu"
              >
                <span>{readingTheme === 'ivory' ? '☀️' : readingTheme === 'sepia' ? '☕' : '🌙'}</span>
                <span className="text-[11px] hidden xs:inline">
                  {readingTheme === 'ivory' ? 'Sáng' : readingTheme === 'sepia' ? 'Sepia' : 'Tối'}
                </span>
                <ChevronDown size={11} className={`transition-transform duration-200 ${activeDropdown === 'theme' ? 'rotate-180' : ''}`} />
              </button>

              {/* DROPDOWN TÔNG MÀU */}
              {activeDropdown === 'theme' && (
                <div
                  className={`absolute right-0 top-full mt-1.5 w-60 sm:w-64 rounded-2xl shadow-2xl border p-2 z-50 animate-in fade-in zoom-in-95 duration-150 ${
                    readingTheme === 'ivory'
                      ? 'bg-[#ede5d8] border-[#cdbdab] text-[#2c180c]'
                      : readingTheme === 'sepia'
                      ? 'bg-[#231810] border-amber-900/60 text-[#f4ecd8]'
                      : 'bg-[#181310] border-white/15 text-slate-100'
                  }`}
                >
                  <div className="px-2 py-1 text-xs font-bold text-amber-500 border-b border-black/10 dark:border-white/10 mb-1.5">
                    Chọn Tông Màu Giao Diện
                  </div>

                  <div className="space-y-1">
                    {/* Tông 1: Vàng ấm Sepia */}
                    <button
                      type="button"
                      onClick={() => {
                        setReadingTheme('sepia');
                        localStorage.setItem('reader_theme_pref', 'sepia');
                        setActiveDropdown('none');
                      }}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                        readingTheme === 'sepia'
                          ? 'bg-amber-800/30 text-amber-300 font-bold ring-1 ring-amber-500/40'
                          : 'hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <span className="text-base">☕</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-[11.5px] block">Vàng ấm Sepia</span>
                        <p className="text-[9.5px] opacity-70 truncate">Sách giấy cổ điển, dịu mắt</p>
                      </div>
                      {readingTheme === 'sepia' && <Check size={14} className="text-amber-400 shrink-0" />}
                    </button>

                    {/* Tông 2: Đen OLED Ban đêm */}
                    <button
                      type="button"
                      onClick={() => {
                        setReadingTheme('dark');
                        localStorage.setItem('reader_theme_pref', 'dark');
                        setActiveDropdown('none');
                      }}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                        readingTheme === 'dark'
                          ? 'bg-amber-500/20 text-amber-300 font-bold ring-1 ring-amber-500/40'
                          : 'hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <span className="text-base">🌙</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-[11.5px] block">Đen OLED Ban đêm</span>
                        <p className="text-[9.5px] opacity-70 truncate">Tiết kiệm pin, đọc đêm tối ưu</p>
                      </div>
                      {readingTheme === 'dark' && <Check size={14} className="text-amber-400 shrink-0" />}
                    </button>

                    {/* Tông 3: Sáng / Ngà (Ivory) */}
                    <button
                      type="button"
                      onClick={() => {
                        setReadingTheme('ivory');
                        localStorage.setItem('reader_theme_pref', 'ivory');
                        setActiveDropdown('none');
                      }}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                        readingTheme === 'ivory'
                          ? 'bg-[#dfcfbd] font-bold text-[#2c180c] ring-1 ring-[#bfae97]'
                          : 'hover:bg-black/5 text-[#4a3220]'
                      }`}
                    >
                      <span className="text-base">☀️</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-[11.5px] block">Nền Sáng Ngà (Ivory)</span>
                        <p className="text-[9.5px] opacity-70 truncate">Thanh lịch, rõ nét ban ngày</p>
                      </div>
                      {readingTheme === 'ivory' && <Check size={14} className="text-amber-400 shrink-0" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 5. NÚT CÀI ĐẶT CHỮ Aa */}
            <button
              type="button"
              onClick={() => setShowTypographyModal(true)}
              className={`h-8 px-2 sm:px-2.5 rounded-lg border flex items-center gap-1 transition-all cursor-pointer active:scale-95 text-xs font-bold relative shrink-0 ${
                typographySettings.bionicReading
                  ? readingTheme === 'ivory'
                    ? 'bg-[#d8c8b2] text-[#2c180c] border-[#bfae97]'
                    : 'bg-amber-500/25 text-amber-300 border-amber-500/50 shadow-xs'
                  : readingTheme === 'ivory'
                  ? 'bg-[#e2d5c3] hover:bg-[#d8c8b2] text-[#2c180c] border border-[#cdbdab]'
                  : 'bg-white/10 hover:bg-white/20 text-amber-200 border-white/10'
              }`}
              title="Cài đặt phông chữ & Đọc siêu tốc Bionic"
              aria-label="Cài đặt phông chữ"
            >
              <Type size={15} className={readingTheme === 'ivory' ? 'text-[#2c180c]' : 'text-amber-400'} />
              <span className="font-serif font-bold text-[12.5px]">Aa</span>
            </button>

            {/* 6. NÚT SÁCH NÓI: CHỈ HIỂN THỊ KHI CÓ BẢN SÁCH NÓI THẬT (STUDIO AUDIOBOOK) */}
            {realAudioBook && (
              <button
                type="button"
                onClick={handleOpenRealAudio}
                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-95 text-xs font-bold shrink-0 ${
                  showRealAudioModal
                    ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/50'
                    : readingTheme === 'ivory'
                    ? 'bg-[#e2d5c3] hover:bg-[#d8c8b2] text-[#2c180c] border border-[#cdbdab]'
                    : 'bg-white/10 hover:bg-white/20 text-amber-200 border border-white/10'
                }`}
                title={`Nghe Sách Nói chất lượng cao: ${realAudioBook.title}`}
                aria-label="Sách nói thật"
              >
                <Headphones
                  size={15}
                  className={
                    showRealAudioModal
                      ? 'animate-bounce text-slate-950'
                      : readingTheme === 'ivory'
                      ? 'text-[#2c180c]'
                      : 'text-amber-400'
                  }
                />
              </button>
            )}

            {/* 6b. NÚT TRỢ LÝ AI ĐỒNG HÀNH (ĐẶT TRỰC TIẾP TRÊN ĐỈNH HEADER THEO YÊU CẦU) */}
            <button
              type="button"
              onClick={() => (isAiCopilotOpen ? setIsAiCopilotOpen(false) : openAiCopilot())}
              className={`h-8 px-2 sm:px-2.5 rounded-lg border flex items-center gap-1 transition-all cursor-pointer active:scale-95 text-xs font-bold shrink-0 ${
                isAiCopilotOpen
                  ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/50 border-amber-400'
                  : readingTheme === 'ivory'
                  ? 'bg-[#e2d5c3] hover:bg-[#d8c8b2] text-[#2c180c] border border-[#cdbdab]'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/35'
              }`}
              title={isAiCopilotOpen ? 'Đóng Trợ lý AI' : 'Hỏi Trợ lý AI về trang sách (Copilot)'}
              aria-label="Trợ lý AI"
            >
              <Sparkles size={14} className={isAiCopilotOpen ? 'text-slate-950' : 'text-amber-400 animate-pulse'} />
              <span className="text-[11.5px] font-black">AI</span>
            </button>

            {/* 7. NÚT TIỆN ÍCH [⋮] (XỔ RA CÁC CÀI ĐẶT & TÍNH NĂNG PHỤ: TÌM KIẾM, HỎI AI, SỔ TAY, BOOKMARK, ÂM THANH, OFFLINE, TOÀN MÀN HÌNH) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown((prev) => (prev === 'tools' ? 'none' : 'tools'))}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-95 text-xs font-bold shrink-0 ${
                  activeDropdown === 'tools'
                    ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/50'
                    : readingTheme === 'ivory'
                    ? 'bg-[#e2d5c3] hover:bg-[#d8c8b2] text-[#2c180c] border border-[#cdbdab]'
                    : 'bg-white/10 hover:bg-white/20 text-amber-200 border border-white/10'
                }`}
                title="Các tiện ích đọc sách khác (Xổ ra)"
                aria-label="Tiện ích khác"
              >
                <MoreVertical size={16} />
              </button>

              {/* DROPDOWN TIỆN ÍCH */}
              {activeDropdown === 'tools' && (
                <div
                  className={`absolute right-0 top-full mt-1.5 w-64 sm:w-72 rounded-2xl shadow-2xl border p-2 z-50 animate-in fade-in zoom-in-95 duration-150 ${
                    readingTheme === 'ivory'
                      ? 'bg-[#ede5d8] border-[#cdbdab] text-[#2c180c]'
                      : readingTheme === 'sepia'
                      ? 'bg-[#231810] border-amber-900/60 text-[#f4ecd8]'
                      : 'bg-[#181310] border-white/15 text-slate-100'
                  }`}
                >
                  <div className="px-2 py-1 text-xs font-bold text-amber-500 border-b border-black/10 dark:border-white/10 mb-1.5">
                    Tiện Ích & Công Cụ
                  </div>

                  <div className="space-y-1 text-xs">
                    {/* Tìm kiếm */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowSearchModal(true);
                        setActiveDropdown('none');
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-xl flex items-center gap-2.5 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                    >
                      <Search size={15} className="text-amber-400 shrink-0" />
                      <span>Tìm kiếm từ khóa</span>
                    </button>

                    {/* Hỏi AI Copilot */}
                    <button
                      type="button"
                      onClick={() => {
                        openAiCopilot();
                        setActiveDropdown('none');
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-xl flex items-center gap-2.5 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                    >
                      <Sparkles size={15} className="text-amber-400 shrink-0" />
                      <span>Hỏi Trợ lý AI về trang sách</span>
                    </button>

                    {/* Sổ tay ghi chú & Flashcard */}
                    <button
                      type="button"
                      onClick={() => {
                        setNotesModalInitialText(null);
                        setShowNotesModal(true);
                        setActiveDropdown('none');
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <BookMarked size={15} className="text-amber-400 shrink-0" />
                        <span>Sổ tay ghi chú & Flashcard</span>
                      </div>
                      {notesCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-mono text-[9px] font-bold">
                          {notesCount}
                        </span>
                      )}
                    </button>

                    {/* Thêm / Bỏ mục Yêu thích */}
                    <button
                      type="button"
                      onClick={() => {
                        handleToggleFavorite();
                        setActiveDropdown('none');
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Heart size={15} className={`text-rose-500 shrink-0 ${isFavorite ? 'fill-rose-500' : ''}`} />
                        <span>{isFavorite ? 'Bỏ khỏi mục Yêu thích' : 'Thêm vào mục Yêu thích'}</span>
                      </div>
                      {isFavorite && <Check size={14} className="text-amber-400" />}
                    </button>

                    {/* Đánh dấu trang Bookmark */}
                    <button
                      type="button"
                      onClick={() => {
                        toggleBookmark();
                        setActiveDropdown('none');
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Bookmark size={15} className={`text-amber-400 shrink-0 ${isBookmarked ? 'fill-current' : ''}`} />
                        <span>{isBookmarked ? 'Bỏ đánh dấu trang này' : 'Đánh dấu trang hiện tại'}</span>
                      </div>
                      {isBookmarked && <Check size={14} className="text-amber-400" />}
                    </button>

                    {/* Cài đặt âm thanh lật sách */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowSoundModal(true);
                        setActiveDropdown('none');
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-xl flex items-center gap-2.5 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                    >
                      {pageSoundEngine.isMuted() ? (
                        <VolumeX size={15} className="text-slate-400 shrink-0" />
                      ) : (
                        <Volume2 size={15} className="text-amber-400 shrink-0" />
                      )}
                      <span>Âm thanh lật sách</span>
                    </button>

                    {/* Lưu sách ngoại tuyến */}
                    {Boolean(activeFileUrl) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isOfflineCached) {
                            handleRemoveOffline();
                          } else {
                            handleSaveOffline();
                          }
                          setActiveDropdown('none');
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          {isOfflineCached ? (
                            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                          ) : (
                            <Zap size={15} className="text-amber-400 shrink-0" />
                          )}
                          <span>{isOfflineCached ? 'Đã lưu offline ✓ (Bấm để xóa)' : 'Lưu vào máy đọc offline'}</span>
                        </div>
                      </button>
                    )}

                    {/* Phóng to / Thu nhỏ cho PDF */}
                    {!isEpub && (
                      <div className="pt-1.5 border-t border-black/10 dark:border-white/10 flex items-center justify-between px-1">
                        <span className="text-[11px] opacity-70">Thu phóng:</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => readerRef.current?.zoomOut?.()}
                            className="p-1.5 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 cursor-pointer"
                            title="Thu nhỏ"
                          >
                            <ZoomOut size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => readerRef.current?.zoomIn?.()}
                            className="p-1.5 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 cursor-pointer"
                            title="Phóng to"
                          >
                            <ZoomIn size={14} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Toàn màn hình */}
                    <div className="pt-1.5 border-t border-black/10 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          toggleFullscreen();
                          setActiveDropdown('none');
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-xl flex items-center gap-2.5 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                      >
                        {isFullscreen ? <Minimize size={15} className="text-amber-400" /> : <Maximize size={15} className="text-amber-400" />}
                        <span>{isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình (F)'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
                playPaperSound();
                readerRef.current?.flipPrev();
              }
            } else if (x > w * 0.82) {
              if (currentPage < totalPages - 1) {
                playPaperSound();
              }
              readerRef.current?.flipNext();
            } else {
              toggleHud();
            }
          }
        }}
        className={`flex-1 flex flex-col items-center justify-center relative w-full h-full overflow-hidden cursor-pointer transition-colors duration-200 ${
          readingTheme === 'ivory'
            ? 'bg-[#ede5d8]'
            : readingTheme === 'sepia'
            ? 'bg-[#1c130d]'
            : 'bg-[#0a0705]'
        }`}
      >
        {isEpub && activeFileUrl ? (
          /* TRÌNH ĐỌC EPUB HIỆN ĐẠI */
          <EpubReaderView
            fileUrl={activeFileUrl}
            bookTitle={title}
            author={author}
            coverUrl={coverUrl}
            readingTheme={readingTheme}
            readingMode={readingMode}
            typographySettings={typographySettings}
            showInternalHeader={false}
            targetChapterIdx={targetEpubChapterIdx}
            onChaptersLoaded={(chaps) => {
              setEpubFullChapters(chaps);
              setEpubChapters(chaps.map((c, i) => ({ id: c.id || `chap-${i}`, title: c.title || `Chương ${i + 1}`, href: c.href })));
            }}
            onChapterChange={(idx) => {
              setCurrentEpubChapterIdx(idx);
              setCurrentPage(idx);
            }}
            onOpenTypographyModal={() => setShowTypographyModal(true)}
            onCenterClick={toggleHud}
            onOpenAiCopilot={(selText) => openAiCopilot(selText)}
            onOpenNotesModal={(selText) => {
              setNotesModalInitialText(selText || null);
              setShowNotesModal(true);
            }}
            onPageProgress={(ch, totalCh) => {
              const pIdx = ch - 1;
              setCurrentPage(pIdx);
              setCurrentEpubChapterIdx(pIdx);
              try {
                localStorage.setItem(`last_read_page_${title}`, pIdx.toString());
                localStorage.setItem('last_read_book_title', title);
              } catch {}
              addReadingHistory({
                bookTitle: title,
                author,
                coverUrl,
                fileUrl: activeFileUrl,
                fileName,
                format: 'epub',
                page: pIdx,
                totalPages: totalCh || (epubFullChapters.length || 1),
              });
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
                try {
                  readingStreakEngine.recordPageRead(1);
                } catch {}
              }
              setCurrentPage(page);
              try {
                localStorage.setItem(`last_read_page_${title}`, page.toString());
                localStorage.setItem('last_read_book_title', title);
              } catch {}
              addReadingHistory({
                bookTitle: title,
                author,
                coverUrl,
                fileUrl: activeFileUrl,
                fileName,
                format: isPdf ? 'pdf' : isCbz ? 'cbz' : isTxt ? 'txt' : 'flipbook',
                page,
                totalPages: Math.max(1, totalPages),
              });
            }}
            onCenterClick={toggleHud}
            className="w-full h-full"
          />
        )}
      </main>

      {/* ================= 3. THANH ĐIỀU HƯỚNG ĐÁY (FIXED BOTTOM HUD) ================= */}
      {!isEpub && (
        <footer
          className={`fixed bottom-0 inset-x-0 z-40 backdrop-blur-md px-3 py-2 flex flex-col items-center gap-1.5 transition-all duration-300 transform select-none ${
            showHud ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
          } ${
            readingTheme === 'ivory'
              ? 'bg-[#ede5d8] text-[#2c180c] border-t border-[#cdbdab] shadow-sm'
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
                  playPaperSound();
                  readerRef.current?.flipPrev();
                }
              }}
              className={`px-3 py-1 rounded-full ${
                readingTheme === 'ivory'
                  ? 'bg-[#e2d5c3] hover:bg-[#d8c8b2] text-[#2c180c] border-[#cdbdab]'
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
                ? 'bg-[#e2d5c3] border-[#cdbdab] text-[#2c180c]'
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
                  playPaperSound();
                  readerRef.current?.flipNext();
                }
              }}
              className={`px-3 py-1 rounded-full ${
                readingTheme === 'ivory'
                  ? 'bg-[#e2d5c3] hover:bg-[#d8c8b2] text-[#2c180c] border-[#cdbdab]'
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
                readingTheme === 'ivory' ? 'bg-[#cdbdab]' : 'bg-slate-700/80'
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

      {/* MODAL PHÁT SÁCH NÓI THẬT CHẤT LƯỢNG CAO (STUDIO AUDIOBOOK) */}
      {showRealAudioModal && activeRealAudio && (
        <AudiobookPlayerModal
          isOpen={showRealAudioModal}
          onClose={() => setShowRealAudioModal(false)}
          book={activeRealAudio}
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
        toc={computedToc}
        onJumpToPage={(p0) => {
          if (isEpub) {
            setTargetEpubChapterIdx(p0);
            setCurrentEpubChapterIdx(p0);
          } else {
            setCurrentPage(p0);
            readerRef.current?.goToPage(p0);
          }
        }}
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
        totalPages={isEpub ? (epubFullChapters.length || 1) : totalPages}
        pdfProvider={pdfProvider}
        epubChapters={isEpub ? epubFullChapters : undefined}
        onSelectResult={(p1Based, chIdx) => {
          if (isEpub) {
            const targetIdx = typeof chIdx === 'number' ? chIdx : (p1Based - 1);
            setTargetEpubChapterIdx(targetIdx);
            setCurrentEpubChapterIdx(targetIdx);
            setCurrentPage(targetIdx);
          } else {
            const p0 = p1Based - 1;
            setCurrentPage(p0);
            readerRef.current?.goToPage(p0);
          }
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

      {/* 9. MODAL CÀI ĐẶT HIỆU ỨNG ÂM THANH LẬT SÁCH */}
      <ReaderSoundModal
        isOpen={showSoundModal}
        onClose={() => setShowSoundModal(false)}
        readingTheme={readingTheme}
      />
    </div>
  );
}
