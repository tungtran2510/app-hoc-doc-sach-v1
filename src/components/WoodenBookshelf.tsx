'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Info,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Search,
  Sun,
  Moon,
  Settings,
  Plus,
  LogOut,
  AlertTriangle,
  Sparkles,
  Bell,
  Smartphone,
  X,
  Volume2,
  VolumeX,
  BookmarkCheck,
  Bookmark,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Type,
  Maximize,
  Minimize,
  ArrowUpDown,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { RecommendedBook } from '../lib/types';

interface WoodenBookshelfProps {
  books: RecommendedBook[];
  isAdmin?: boolean;
  onSelectBook: (book: RecommendedBook) => void;
  onReadBook3D: (book: RecommendedBook) => void;
  onEditSingleBook?: (book: RecommendedBook) => void;
  onToggleBookVisibility?: (index: number) => void;
  onMoveBook?: (index: number, direction: 'up' | 'down') => void;
  onDeleteBook?: (index: number) => void;
  title?: string;
  badgeText?: string;
  layoutMode?: 'bookshelf' | 'grid' | 'lookbook';
  onToggleLayoutMode?: (mode: 'bookshelf' | 'grid' | 'lookbook') => void;
  appName?: string | null;
  logoUrl?: string | null;
  onOpenWelcome?: () => void;
  onOpenAdminSettings?: () => void;
  onOpenEditApp?: () => void;
  onOpenAddBookModal?: () => void;
  onOpenUserSync?: () => void;
  onOpenPwaInstall?: () => void;
  onLogout?: () => void;
}

const getBookFormatBadge = (book: RecommendedBook) => {
  const lowerTag = (book.badge_tag || book.tag || '').toLowerCase();
  const lowerName = (book.file_name || book.file_url || book.pdf_url || '').toLowerCase();
  if (lowerTag.includes('epub') || lowerName.endsWith('.epub')) {
    return { label: 'EPUB', color: 'bg-emerald-600/90 text-white border-emerald-400/40' };
  }
  if (lowerTag.includes('cbz') || lowerName.endsWith('.cbz')) {
    return { label: 'CBZ', color: 'bg-purple-600/90 text-white border-purple-400/40' };
  }
  if (lowerTag.includes('txt') || lowerName.endsWith('.txt')) {
    return { label: 'TXT', color: 'bg-stone-700/90 text-white border-stone-400/40' };
  }
  if (lowerTag.includes('pdf') || lowerName.endsWith('.pdf')) {
    return { label: 'PDF', color: 'bg-rose-600/90 text-white border-rose-400/40' };
  }
  return { label: '3D', color: 'bg-amber-600/90 text-white border-amber-400/40' };
};

export default function WoodenBookshelf({
  books,
  isAdmin = false,
  onSelectBook,
  onReadBook3D,
  onEditSingleBook,
  onToggleBookVisibility,
  onMoveBook,
  onDeleteBook,
  title = 'GIAN TRƯNG BÀY SÁCH Y KHOA',
  appName = 'Qbiz-ebook',
  logoUrl,
  onOpenWelcome,
  onOpenAdminSettings,
  onOpenEditApp,
  onOpenAddBookModal,
  onOpenUserSync,
  onOpenPwaInstall,
  onLogout,
}: WoodenBookshelfProps) {
  // Lời chào và tên người dùng
  const [userName, setUserName] = useState<string>('bạn');
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // Chế độ Sáng / Tối
  const [isDark, setIsDark] = useState(false);

  // Menu Cài đặt & Tài khoản
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Tùy chọn chuyên sâu đọc sách (Đồng bộ với Reader 3D)
  const [readerPaperTheme, setReaderPaperTheme] = useState<'sepia' | 'dark' | 'ivory'>('dark');
  const [readerDefaultMode, setReaderDefaultMode] = useState<'curl' | 'roll' | 'scroll'>('curl');
  const [readerSoundEnabled, setReaderSoundEnabled] = useState<boolean>(true);
  const [readerAutoResume, setReaderAutoResume] = useState<boolean>(true);

  // Kích thước đầu sách trên kệ gỗ: 2 (Lớn), 3 (Chuẩn), 4 (Gọn)
  const [bookCols, setBookCols] = useState<2 | 3 | 4>(3);
  const [zoomToast, setZoomToast] = useState<string | null>(null);
  const [lastReadBookTitle, setLastReadBookTitle] = useState<string | null>(null);
  const [lastReadPage, setLastReadPage] = useState<number>(1);
  const [showBookTitles, setShowBookTitles] = useState<boolean>(true);
  const [showProgress, setShowProgress] = useState<boolean>(true);
  const [bookProgressMap, setBookProgressMap] = useState<
    Record<string, { page: number; total: number; percent: number }>
  >({});
  const [sortBy, setSortBy] = useState<'default' | 'recent' | 'az' | 'category'>('default');
  const [quickPeekBook, setQuickPeekBook] = useState<RecommendedBook | null>(null);
  const [isBookshelfFullscreen, setIsBookshelfFullscreen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isResumeDismissed, setIsResumeDismissed] = useState<boolean>(false);
  const touchStartDistRef = React.useRef<number | null>(null);

  const lastReadBook = React.useMemo(() => {
    if (!lastReadBookTitle) return null;
    return (
      books.find(
        (b) => b.title.trim().toLowerCase() === lastReadBookTitle.trim().toLowerCase()
      ) || null
    );
  }, [books, lastReadBookTitle]);

  // Trạng thái hiển thị Cảnh báo khi người dùng muốn thoát ra khỏi hẳn phần mềm
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const isExitingRef = useRef<boolean>(false);

  const handleConfirmExit = () => {
    isExitingRef.current = true;
    setShowExitConfirm(false);
    try {
      window.close();
    } catch {}
    setTimeout(() => {
      try {
        if (window.opener) {
          window.close();
        } else if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = 'about:blank';
        }
      } catch {}
    }, 120);
  };

  const handleToggleShowTitles = () => {
    setShowBookTitles((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('bookshelf_show_book_titles', String(next));
      } catch {}
      showToast(next ? 'Đã bật: Hiện tên sách dưới chân kệ' : 'Đã tắt: Chỉ hiện bìa nghệ thuật');
      return next;
    });
  };

  const handleToggleShowProgress = () => {
    setShowProgress((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('bookshelf_show_progress', String(next));
      } catch {}
      showToast(next ? 'Đã bật: Hiện tiến độ đọc trên bìa' : 'Đã tắt: Ẩn tiến độ đọc trên bìa');
      return next;
    });
  };

  const cycleSortOrder = () => {
    setSortBy((prev) => {
      const next =
        prev === 'default'
          ? 'recent'
          : prev === 'recent'
          ? 'az'
          : prev === 'az'
          ? 'category'
          : 'default';
      try {
        localStorage.setItem('bookshelf_sort_by', next);
      } catch {}
      const labels: Record<string, string> = {
        default: 'Sắp xếp: Mặc định',
        recent: 'Sắp xếp: Đọc gần đây nhất',
        az: 'Sắp xếp: Theo bảng chữ cái A-Z',
        category: 'Sắp xếp: Theo chuyên mục',
      };
      showToast(labels[next] || next);
      return next;
    });
  };

  const toggleBookshelfFullscreen = async () => {
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
        setIsBookshelfFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setIsBookshelfFullscreen(false);
      }
    } catch (err) {
      console.warn('Bookshelf fullscreen error:', err);
    }
  };

  const showToast = (msg: string) => {
    setZoomToast(msg);
    setTimeout(() => {
      setZoomToast((prev) => (prev === msg ? null : prev));
    }, 1800);
  };

  const zoomInBooks = () => {
    setBookCols((prev) => {
      const next = prev === 4 ? 3 : prev === 3 ? 2 : 2;
      if (next !== prev) {
        try { localStorage.setItem('bookshelf_book_cols', String(next)); } catch {}
        showToast(next === 2 ? 'Cỡ sách: Lớn (2 cuốn/tầng)' : 'Cỡ sách: Chuẩn (3 cuốn/tầng)');
      }
      return next;
    });
  };

  const zoomOutBooks = () => {
    setBookCols((prev) => {
      const next = prev === 2 ? 3 : prev === 3 ? 4 : 4;
      if (next !== prev) {
        try { localStorage.setItem('bookshelf_book_cols', String(next)); } catch {}
        showToast(next === 4 ? 'Cỡ sách: Gọn (4 cuốn/tầng)' : 'Cỡ sách: Chuẩn (3 cuốn/tầng)');
      }
      return next;
    });
  };

  const setColsExplicit = (cols: 2 | 3 | 4) => {
    setBookCols(cols);
    try { localStorage.setItem('bookshelf_book_cols', String(cols)); } catch {}
    showToast(cols === 2 ? 'Cỡ sách: Lớn (2 cuốn/tầng)' : cols === 3 ? 'Cỡ sách: Chuẩn (3 cuốn/tầng)' : 'Cỡ sách: Gọn (4 cuốn/tầng)');
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDistRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartDistRef.current !== null && e.touches.length < 2) {
      touchStartDistRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const diff = currentDist - touchStartDistRef.current;

      if (diff > 45) {
        touchStartDistRef.current = currentDist;
        zoomInBooks();
      } else if (diff < -45) {
        touchStartDistRef.current = currentDist;
        zoomOutBooks();
      }
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('user_display_name');
      if (saved && saved.trim()) {
        setUserName(saved.trim());
      }
    } catch {}

    try {
      const storedTheme = localStorage.getItem('giao_dien');
      const darkActive = storedTheme !== 'light';
      setIsDark(darkActive);
      if (darkActive) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }

    try {
      const savedPaper = localStorage.getItem('reader_theme_pref');
      if (savedPaper && ['sepia', 'dark', 'ivory'].includes(savedPaper)) {
        setReaderPaperTheme(savedPaper as any);
      } else {
        setReaderPaperTheme('dark');
      }
      const savedMode = localStorage.getItem('reader_mode_pref');
      if (savedMode && ['curl', 'roll', 'scroll'].includes(savedMode)) {
        setReaderDefaultMode(savedMode as any);
      }
      const savedSound = localStorage.getItem('reader_sound_pref');
      if (savedSound !== null) {
        setReaderSoundEnabled(savedSound !== 'false');
      }
      const savedResume = localStorage.getItem('reader_autoresume_pref');
      if (savedResume !== null) {
        setReaderAutoResume(savedResume !== 'false');
      }
      const savedCols = localStorage.getItem('bookshelf_book_cols');
      if (savedCols && ['2', '3', '4'].includes(savedCols)) {
        setBookCols(Number(savedCols) as 2 | 3 | 4);
      }
      const savedShowTitles = localStorage.getItem('bookshelf_show_book_titles');
      if (savedShowTitles !== null) {
        setShowBookTitles(savedShowTitles !== 'false');
      }
      const savedShowProgress = localStorage.getItem('bookshelf_show_progress');
      if (savedShowProgress !== null) {
        setShowProgress(savedShowProgress !== 'false');
      }
      const savedSort = localStorage.getItem('bookshelf_sort_by');
      if (savedSort && ['default', 'recent', 'az', 'category'].includes(savedSort)) {
        setSortBy(savedSort as any);
      }

      // Nạp tiến độ đọc của từng cuốn sách từ bộ nhớ (hỗ trợ cả PDF, EPUB, CBZ, Flipbook)
      const pMap: Record<string, { page: number; total: number; percent: number }> = {};
      books.forEach((b) => {
        const saved =
          localStorage.getItem(`last_read_page_${b.title}`) ||
          localStorage.getItem(`bookmark_page_${b.title}`);
        const storedTotal = localStorage.getItem(`total_pages_${b.title}`);
        const total = storedTotal
          ? Math.max(1, parseInt(storedTotal, 10) || 7)
          : (b.gallery_images && b.gallery_images.length > 0)
          ? b.gallery_images.length
          : (b as any).pages_count || ((b as any).pages && (b as any).pages.length > 0)
          ? (b as any).pages_count || (b as any).pages.length
          : 7;
        if (saved !== null) {
          const p = parseInt(saved, 10);
          if (!isNaN(p) && p >= 0) {
            const percent = Math.min(100, Math.round(((p + 1) / total) * 100));
            pMap[b.title] = { page: p + 1, total, percent };
          }
        }
      });
      setBookProgressMap(pMap);

      const lastTitle = localStorage.getItem('last_read_book_title');
      if (lastTitle) {
        setLastReadBookTitle(lastTitle);
        const p = localStorage.getItem(`last_read_page_${lastTitle}`) || localStorage.getItem(`bookmark_page_${lastTitle}`);
        if (p) setLastReadPage(parseInt(p, 10) || 1);
      }
    } catch {}
  }, [books]);

  // Đồng bộ trạng thái toàn màn hình khi người dùng bấm ESC hoặc phím điều hướng hệ thống
  useEffect(() => {
    const handleFsChange = () => {
      const isFs =
        Boolean(document.fullscreenElement) ||
        Boolean((document as any).webkitFullscreenElement);
      setIsBookshelfFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  // Lắng nghe phím Back của điện thoại khi ở Kệ Sách: Cảnh báo khi người dùng muốn thoát hẳn phần mềm
  useEffect(() => {
    try {
      window.history.pushState({ screen: 'bookshelf_home' }, '');
    } catch {}

    const handlePopState = () => {
      // Nếu người dùng đã xác nhận thoát, không bao giờ mở lại modal
      if (isExitingRef.current) return;

      // Nếu có bất kỳ modal đọc sách, xem chi tiết, cài đặt nào đang mở thì nhường modal đó xử lý
      const hasOtherModal = Boolean(
        document.querySelector('[role="dialog"]') ||
        window.location.hash.includes('doc-sach') ||
        window.location.hash.includes('chi-tiet')
      );
      if (hasOtherModal) return;

      // Đang ở Kệ Sách chính mà bấm Back -> Kích hoạt Hộp thoại Cảnh báo thoát hẳn phần mềm
      setShowExitConfirm(true);

      // Đẩy lại state để người dùng không bị văng ngay ra khỏi app
      try {
        window.history.pushState({ screen: 'bookshelf_home' }, '');
      } catch {}
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleSaveName = (newName: string) => {
    const val = newName.trim() || 'bạn';
    setUserName(val);
    try {
      localStorage.setItem('user_display_name', val);
    } catch {}
    setShowNameModal(false);
  };

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    try {
      if (nextDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('giao_dien', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('giao_dien', 'light');
      }
    } catch {}
  };

  const handleChangePaperTheme = (theme: 'sepia' | 'dark' | 'ivory') => {
    setReaderPaperTheme(theme);
    try {
      localStorage.setItem('reader_theme_pref', theme);
    } catch {}
  };

  const handleChangeDefaultMode = (mode: 'curl' | 'roll' | 'scroll') => {
    setReaderDefaultMode(mode);
    try {
      localStorage.setItem('reader_mode_pref', mode);
    } catch {}
  };

  const handleToggleSound = () => {
    const next = !readerSoundEnabled;
    setReaderSoundEnabled(next);
    try {
      localStorage.setItem('reader_sound_pref', next ? 'true' : 'false');
    } catch {}
  };

  const handleToggleAutoResume = () => {
    const next = !readerAutoResume;
    setReaderAutoResume(next);
    try {
      localStorage.setItem('reader_autoresume_pref', next ? 'true' : 'false');
    } catch {}
  };

  // Lọc sách theo chuyên đề nếu người dùng bấm chọn trên thanh thẻ
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => {
      const cat = b.category || b.tag;
      if (cat && cat.trim()) set.add(cat.trim());
    });
    return Array.from(set);
  }, [books]);

  const activeBooks = React.useMemo(() => {
    let list =
      selectedCategory === 'all'
        ? [...books]
        : books.filter((b) => (b.category || b.tag) === selectedCategory);

    if (sortBy === 'recent') {
      list.sort((a, b) => {
        const progA = bookProgressMap[a.title]?.page || (lastReadBookTitle === a.title ? 999 : 0);
        const progB = bookProgressMap[b.title]?.page || (lastReadBookTitle === b.title ? 999 : 0);
        return progB - progA;
      });
    } else if (sortBy === 'az') {
      list.sort((a, b) => a.title.localeCompare(b.title, 'vi'));
    } else if (sortBy === 'category') {
      list.sort((a, b) =>
        (a.category || a.tag || '').localeCompare(b.category || b.tag || '', 'vi')
      );
    }
    return list;
  }, [books, selectedCategory, sortBy, bookProgressMap, lastReadBookTitle]);

  const visibleBooks = activeBooks.filter((b) => isAdmin || b.is_visible !== false);

  if (visibleBooks.length === 0 && !isAdmin) {
    return null;
  }

  // Chia danh sách sách thành các tầng kệ linh hoạt theo bookCols (2, 3, hoặc 4 cuốn / tầng)
  const chunkSize = bookCols;
  const tiers: RecommendedBook[][] = [];
  for (let i = 0; i < activeBooks.length; i += chunkSize) {
    const chunk = activeBooks.slice(i, i + chunkSize);
    const hasVisibleInChunk = chunk.some((b) => isAdmin || b.is_visible !== false);
    if (hasVisibleInChunk) {
      tiers.push(chunk);
    }
  }

  // Luôn đảm bảo tối thiểu 3 tầng kệ gỗ để tủ sách luôn đầy đặn, không bị khoảng trắng cắt ngang
  const minShelves = 3;
  const emptyShelvesCount = Math.max(0, minShelves - tiers.length);

  const currentAppTitle = appName || 'Qbiz-ebook';
  const [firstWord, restWords] = currentAppTitle.includes('-')
    ? [currentAppTitle.split('-')[0], `-${currentAppTitle.split('-').slice(1).join('-')}`]
    : currentAppTitle.includes(' ')
    ? [currentAppTitle.split(' ')[0], currentAppTitle.split(' ').slice(1).join(' ')]
    : [currentAppTitle, ''];

  return (
    <div
      className="relative w-full min-h-[calc(100dvh-5.5rem)] flex flex-col justify-start rounded-none sm:rounded-2xl overflow-hidden bg-gradient-to-b from-[#FAF5EE] via-[#F3EADB] to-[#E8DBCA] dark:from-[#24170d] dark:via-[#1c1109] dark:to-[#110803] px-2 sm:px-5 pt-[max(0.5rem,env(safe-area-inset-top))] pb-8 sm:py-6 border-x-0 border-t-0 sm:border border-[#d8c5aa] dark:border-[#3d2817] shadow-[0_10px_30px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] text-[#29180c] dark:text-[#fdf7ee] select-none transition-colors duration-200"
    >
      {/* Toast thông báo thay đổi kích cỡ sách khi vuốt / bấm */}
      {zoomToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs shadow-2xl border border-amber-200 pointer-events-none animate-bounce">
          {zoomToast}
        </div>
      )}

      {/* Đèn rọi kệ sách ấm cúng trên đỉnh (Overhead Ambient Spotlight) */}
      <div
        className="absolute top-0 left-[10%] right-[10%] h-[180px] pointer-events-none z-0"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at 50% 0%, rgba(251, 191, 36, 0.16) 0%, transparent 75%)'
            : 'radial-gradient(ellipse at 50% 0%, rgba(217, 119, 6, 0.10) 0%, transparent 75%)',
        }}
      />

      {/* 1. KHUNG THƯƠNG HIỆU & LỜI CHÀO & CÀI ĐẶT TÍCH HỢP TRÊN ĐỈNH KỆ SÁCH */}
      <div className="relative z-20 mb-4 sm:mb-5">
        <div className="w-full rounded-[14px] bg-gradient-to-r from-[#F0E5D4] via-[#F8F1E5] to-[#EFE2CE] dark:from-[#2c1a10] dark:via-[#3a2316] dark:to-[#25170e] text-[#29180c] dark:text-[#fdf7ee] border border-[#cfbeaa] dark:border-[#5a3a24] shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_20px_rgba(0,0,0,0.6)] animate-bio-breathing hover:border-amber-500/80 hover:shadow-[0_8px_24px_rgba(217,119,6,0.2)] transition-all duration-300 p-2.5 sm:p-3 flex items-center justify-between gap-2.5">
          {/* BÊN TRÁI: Logo app 3D */}
          <div
            onClick={onOpenWelcome}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-[12px] overflow-hidden border border-amber-500/50 shadow-md shrink-0 bg-[#0C152B] p-0.5 cursor-pointer hover:scale-105 transition-transform"
            title="Xem lời ngỏ & video giới thiệu"
          >
            <img
              src={logoUrl || '/logo.png'}
              alt="Logo Qbiz-ebook"
              className="w-full h-full object-cover rounded-[9px]"
            />
          </div>

          {/* Ở GIỮA: Tên thương hiệu + Lời chào "Hi, [tên người dùng]!" */}
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] sm:text-[16px] font-black tracking-tight text-[#24150b] dark:text-[#fdf7ee] uppercase drop-shadow-xs">
                {firstWord}
              </span>
              <span className="text-[15px] sm:text-[16px] font-black tracking-tight text-amber-700 dark:text-amber-400 uppercase drop-shadow-xs">
                {restWords}
              </span>
            </div>
            {/* Lời chào người dùng */}
            <button
              type="button"
              onClick={() => {
                setNameInput(userName === 'bạn' ? '' : userName);
                setShowNameModal(true);
              }}
              className="text-[11.5px] sm:text-[12px] font-bold text-[#78350f] dark:text-amber-200/90 hover:text-[#451a03] dark:hover:text-amber-100 mt-0.5 flex items-center gap-1 cursor-pointer transition-colors text-left group/greet truncate"
              title="Bấm để đổi tên của bạn"
            >
              <span className="truncate">Hi, {userName || 'bạn'}! 👋</span>
              <Edit2 size={10} className="text-amber-600 dark:text-amber-400/60 group-hover/greet:text-amber-700 dark:group-hover/greet:text-amber-300 shrink-0" />
            </button>
          </div>

          {/* BÊN PHẢI: CỤM CÀI ĐẶT & TIỆN ÍCH */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Chuyển chế độ Sáng / Tối */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full bg-white/70 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 border border-[#d8c5aa] dark:border-white/10 flex items-center justify-center text-amber-900 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-200 transition-all cursor-pointer shadow-xs"
              title={isDark ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'}
              aria-label="Sáng / Tối"
            >
              {isDark ? <Sun size={15} strokeWidth={2.4} /> : <Moon size={15} strokeWidth={2.4} />}
            </button>

            {/* Toàn màn hình kệ sách (Immersive Native Fullscreen) */}
            <button
              type="button"
              onClick={toggleBookshelfFullscreen}
              className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                isBookshelfFullscreen
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : 'bg-white/70 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-amber-900 dark:text-amber-200 hover:text-amber-950 dark:hover:text-white border-[#d8c5aa] dark:border-white/10'
              }`}
              title={isBookshelfFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình'}
              aria-label="Toàn màn hình"
            >
              {isBookshelfFullscreen ? (
                <Minimize size={14} strokeWidth={2.4} />
              ) : (
                <Maximize size={14} strokeWidth={2.4} />
              )}
            </button>

            {/* Nút Cài đặt / Quản trị */}
            <button
              type="button"
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 flex items-center justify-center transition-all cursor-pointer shadow-sm relative active:scale-95"
              title="Cài đặt & Tài khoản"
              aria-label="Cài đặt"
            >
              <Settings size={15} strokeWidth={2.4} />
              {isAdmin && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 ring-1 ring-black" />
              )}
            </button>

            {/* Nút Cảnh Báo Thoát Khỏi Hẳn Phần Mềm */}
            <button
              type="button"
              onClick={() => setShowExitConfirm(true)}
              className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full bg-red-500/15 dark:bg-red-500/20 hover:bg-red-500/30 border border-red-300 dark:border-red-500/40 text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              title="Thoát khỏi phần mềm (Cảnh báo xác nhận)"
              aria-label="Thoát phần mềm"
            >
              <LogOut size={14} strokeWidth={2.4} />
            </button>
          </div>
        </div>

        {/* THANH ĐIỀU KHIỂN QUẢN TRỊ VIÊN NHANH (KHI ĐĂNG NHẬP ADMIN) */}
        {isAdmin && (
          <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-2 text-[11px] text-amber-200">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span>QUẢN TRỊ VIÊN</span>
            </div>
            <div className="flex items-center gap-1.5">
              {onOpenAddBookModal && (
                <button
                  type="button"
                  onClick={onOpenAddBookModal}
                  className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus size={12} strokeWidth={2.5} />
                  <span>Thêm sách</span>
                </button>
              )}
              {onOpenAdminSettings && (
                <button
                  type="button"
                  onClick={onOpenAdminSettings}
                  className="px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 text-white font-semibold transition-colors cursor-pointer"
                >
                  Cài đặt
                </button>
              )}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-2.5 py-1 rounded-md bg-red-600/80 hover:bg-red-600 text-white font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs"
                  title="Đăng xuất khỏi quyền Quản trị viên"
                >
                  <LogOut size={12} strokeWidth={2.5} />
                  <span>Đăng xuất</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 1-TOUCH BANNER TIẾP TỤC ĐỌC DỞ (MOBILE-FIRST SEAMLESS RESUME) */}
      {lastReadBook && !isResumeDismissed && (
        <div className="relative z-10 mb-3 p-2 sm:p-2.5 rounded-2xl bg-white/90 dark:bg-[#1f130b]/90 border border-amber-500/35 backdrop-blur-md flex items-center justify-between gap-2 shadow-xs transition-all animate-in fade-in slide-in-from-top-2 duration-200">
          <div
            onClick={() => onReadBook3D(lastReadBook)}
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
          >
            <div className="relative w-8 h-11 sm:w-9 sm:h-12 rounded-md overflow-hidden shrink-0 border border-amber-900/20 shadow-xs">
              <img
                src={lastReadBook.cover_url || '/documents/covers/cover_hieu_dung_ve_cot_song.png'}
                alt={lastReadBook.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <Sparkles size={11} className="text-amber-500 animate-pulse" />
                  Đang đọc dở
                </span>
                <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-200">
                  Trang {lastReadPage}
                </span>
              </div>
              <h3 className="text-xs font-bold text-[#2A160A] dark:text-amber-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                {lastReadBook.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onReadBook3D(lastReadBook)}
              className="h-7 px-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-[11px] flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs transition-all"
              title={`Đọc tiếp cuốn ${lastReadBook.title} tại trang ${lastReadPage}`}
            >
              <BookOpen size={12} strokeWidth={2.4} />
              <span>Đọc tiếp</span>
            </button>
            <button
              type="button"
              onClick={() => setIsResumeDismissed(true)}
              className="w-6 h-6 rounded-lg text-[#6E4223] dark:text-amber-200/60 hover:text-red-500 dark:hover:text-red-400 flex items-center justify-center cursor-pointer transition-colors"
              title="Ẩn thông báo này"
              aria-label="Ẩn banner tiếp tục đọc"
            >
              <X size={13} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      )}

      {/* TIÊU ĐỀ GIAN TRƯNG BÀY SÁCH & BỘ ĐIỀU KHIỂN KÍNH LÚP THU PHÓNG */}
      <div className="relative z-10 flex items-center justify-between mb-3 px-1 sm:px-2 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <h2 className="text-[13px] sm:text-[14px] font-black tracking-wide text-[#4a250e] dark:text-amber-200/90 uppercase drop-shadow-xs truncate">
            GIAN TRƯNG BÀY
          </h2>
        </div>

        {/* CỤM NÚT SẮP XẾP VÀ KÍNH LÚP THU NHỎ / PHÓNG TO SÁCH */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Nút Đổi Sắp Xếp Sách */}
          <button
            type="button"
            onClick={cycleSortOrder}
            className="h-7 px-2.5 rounded-xl bg-white/80 dark:bg-[#1a0f08]/90 hover:bg-white dark:hover:bg-black border border-[#d8c5aa] dark:border-amber-900/60 text-[#4a250e] dark:text-amber-300 flex items-center gap-1.5 text-[11px] font-bold transition-all cursor-pointer shadow-xs active:scale-95"
            title={`Sắp xếp: ${
              sortBy === 'default'
                ? 'Mặc định'
                : sortBy === 'recent'
                ? 'Đọc gần đây'
                : sortBy === 'az'
                ? 'Tên A-Z'
                : 'Chuyên mục'
            } (Bấm để đổi)`}
            aria-label="Đổi thứ tự sắp xếp sách"
          >
            <ArrowUpDown size={11} strokeWidth={2.4} />
            <span className="text-[10.5px]">
              {sortBy === 'default'
                ? 'Mặc định'
                : sortBy === 'recent'
                ? 'Gần đây'
                : sortBy === 'az'
                ? 'A-Z'
                : 'Chuyên mục'}
            </span>
          </button>

          {/* Cụm Kính lúp: Chỉ thu nhỏ (-) và phóng to (+) đầu sách */}
          <div className="flex items-center gap-0.5 bg-white/80 dark:bg-[#1a0f08]/90 border border-[#d8c5aa] dark:border-amber-900/60 rounded-xl p-0.5 shadow-xs">
            <button
              type="button"
              onClick={zoomOutBooks}
              disabled={bookCols === 4}
              className="w-6.5 h-6.5 rounded-lg flex items-center justify-center text-[#4a250e] dark:text-amber-300 hover:text-amber-950 dark:hover:text-white hover:bg-amber-900/10 dark:hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              title="Thu nhỏ đầu sách"
              aria-label="Thu nhỏ sách"
            >
              <ZoomOut size={13} strokeWidth={2.4} />
            </button>
            <button
              type="button"
              onClick={zoomInBooks}
              disabled={bookCols === 2}
              className="w-6.5 h-6.5 rounded-lg flex items-center justify-center text-[#4a250e] dark:text-amber-300 hover:text-amber-950 dark:hover:text-white hover:bg-amber-900/10 dark:hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              title="Phóng to đầu sách"
              aria-label="Phóng to sách"
            >
              <ZoomIn size={13} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </div>

      {/* CÁC TẦNG KỆ SÁCH (SÁCH ĐỨNG TRỰC TIẾP TRÊN MẶT GỖ - ZERO FLOATING) */}
      <div className="relative z-10 flex flex-col gap-7 sm:gap-9">
        {tiers.map((tierBooks, tierIdx) => {
          const cardMaxWidthClass =
            bookCols === 2
              ? 'max-w-[170px] sm:max-w-[210px]'
              : bookCols === 4
              ? 'max-w-[86px] sm:max-w-[110px]'
              : 'max-w-[122px] sm:max-w-[150px]';

          const isPartialTier = tierBooks.length < bookCols;

          return (
            <div key={`tier-${tierIdx}`} className="relative">
              {/* Dãy sách đứng vững trên mặt gỗ */}
              <div
                className={`flex items-end ${
                  isPartialTier
                    ? 'justify-start gap-3.5 sm:gap-6 px-3 sm:px-4'
                    : 'justify-around gap-2 sm:gap-4 px-1 sm:px-3'
                } relative z-10`}
              >
                {tierBooks.map((book) => {
                  const originalIndex = books.findIndex((b) => b.id === book.id);
                  const isHidden = book.is_visible === false;
                  if (isHidden && !isAdmin) return null;
                  const prog = bookProgressMap[book.title];

                  return (
                    <div
                      key={book.id || originalIndex}
                      className={`${
                        isPartialTier ? cardMaxWidthClass + ' w-full' : 'flex-1 ' + cardMaxWidthClass
                      } flex flex-col items-center group relative cursor-pointer ${
                        isHidden ? 'opacity-65' : ''
                      }`}
                      onClick={() => onReadBook3D(book)}
                      title={book.title}
                    >
                      {/* HUY HIỆU ĐÃ ĐỌC XONG - CHỈ DẤU TÍCH V VÀNG TINH TẾ (KHÔNG DÙNG THẺ TAB THÔ MÀU XANH) */}
                      {showProgress && prog && prog.percent === 100 && (
                        <div
                          className="absolute top-1.5 right-1.5 z-20 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md border border-amber-200 pointer-events-none"
                          title="Đã đọc xong"
                        >
                          <Check size={11} strokeWidth={3} />
                        </div>
                      )}

                      {/* KHỐI BÌA SÁCH 3D NỔI NÉT ĐỨNG TRỰC TIẾP TRÊN KỆ GỖ */}
                      <div className="w-full relative aspect-[1/1.42] rounded-l-xs rounded-r-md overflow-hidden border-l-2 border-white/20 shadow-[-4px_2px_8px_rgba(0,0,0,0.5),4px_4px_12px_rgba(0,0,0,0.7),0_8px_14px_rgba(0,0,0,0.85)] group-hover:-translate-y-2 group-hover:scale-[1.03] active:scale-[0.98] transition-all duration-200">
                        {/* NÚT XEM NHANH TÓM TẮT SÁCH (QUICK PEEK MODAL) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickPeekBook(book);
                          }}
                          className="absolute top-1.5 left-1.5 z-30 w-5.5 h-5.5 rounded-full bg-black/75 hover:bg-black/95 text-amber-200 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-lg border border-white/20 active:scale-90"
                          title="Xem tóm tắt sách"
                          aria-label={`Xem tóm tắt sách ${book.title}`}
                        >
                          <Info size={11} strokeWidth={2.4} />
                        </button>
                        {/* BADGE ĐỊNH DẠNG SÁCH (PDF, EPUB, CBZ, 3D, TXT) */}
                        {(() => {
                          const fmt = getBookFormatBadge(book);
                          return (
                            <span
                              className={`absolute bottom-2 right-1.5 z-20 px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase tracking-wider shadow-md border pointer-events-none backdrop-blur-xs ${fmt.color}`}
                            >
                              {fmt.label}
                            </span>
                          );
                        })()}
                        {/* VẠCH TIẾN ĐỘ ĐỌC Ở CHÂN BÌA */}
                        {showProgress && prog && prog.percent > 0 && (
                          <div className="absolute bottom-0 inset-x-0 h-1 bg-black/75 z-15 pointer-events-none">
                            <div
                              className={`h-full ${
                                prog.percent === 100
                                  ? 'bg-gradient-to-r from-emerald-400 to-green-500'
                                  : 'bg-gradient-to-r from-amber-500 to-amber-300'
                              }`}
                              style={{ width: `${prog.percent}%` }}
                            />
                          </div>
                        )}
                        {/* Ảnh bìa sách */}
                        {book.cover_url ? (
                          <img
                            src={book.cover_url}
                            alt={book.title}
                            className="w-full h-full object-cover block"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-900 to-stone-900 flex flex-col justify-between p-2 text-center">
                            <span className="text-[9px] font-bold text-amber-300">Qbiz Books</span>
                            <span className="text-[11px] font-bold text-white line-clamp-3">
                              {book.title}
                            </span>
                            <span className="text-[9px] text-amber-200/80">{book.author || 'Y học'}</span>
                          </div>
                        )}

                        {/* Lớp bóng uốn cong gáy sách 3D và phản chiếu kính */}
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background:
                              'linear-gradient(90deg, rgba(0,0,0,0.5) 0%, rgba(255,255,255,0.25) 3.5%, rgba(0,0,0,0.15) 7%, transparent 14%, transparent 85%, rgba(255,255,255,0.1) 96%, rgba(0,0,0,0.3) 100%)',
                          }}
                        />

                        {/* Cảnh báo ẩn tạm cho Admin */}
                        {isHidden && isAdmin && (
                          <span className="absolute top-1.5 left-1.5 text-[8px] font-black px-1.5 py-0.5 rounded-xs bg-black/80 text-amber-400 border border-amber-500/50">
                            Ẩn
                          </span>
                        )}

                        {/* Nút hành động nổi lên khi hover chuột trên Desktop: Đọc 3D & Chi tiết (ẨN TRÊN DI ĐỘNG ĐỂ TRÁNH DÍNH MÀN HÌNH CẢM ỨNG) */}
                        <div
                          className="hidden md:flex absolute inset-0 bg-black/55 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-200 flex-col items-center justify-center gap-1.5 p-2"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onReadBook3D(book);
                            }}
                            className="pointer-events-auto w-full py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] shadow-lg flex items-center justify-center gap-1 transition-transform active:scale-95 cursor-pointer"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-slate-950" />
                            <span>Đọc sách</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectBook(book);
                            }}
                            className="pointer-events-auto w-full py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-[10px] flex items-center justify-center gap-0.5 transition-transform active:scale-95 cursor-pointer"
                          >
                            <Info className="w-3 h-3" />
                            <span>Chi tiết</span>
                          </button>

                          {/* Bộ điều khiển Admin ẩn bên trong hover overlay để không làm vỡ kệ sách */}
                          {isAdmin && (
                            <div
                              className="mt-1 flex items-center justify-center gap-1 bg-black/80 p-0.5 rounded-md border border-white/10"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {onMoveBook && (
                                <>
                                  <button
                                    type="button"
                                    disabled={originalIndex === 0}
                                    onClick={() => onMoveBook(originalIndex, 'up')}
                                    className="w-4.5 h-4.5 rounded flex items-center justify-center text-slate-300 hover:text-white disabled:opacity-20 cursor-pointer"
                                    title="Chuyển lên trước"
                                  >
                                    <ArrowUp className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={originalIndex === books.length - 1}
                                    onClick={() => onMoveBook(originalIndex, 'down')}
                                    className="w-4.5 h-4.5 rounded flex items-center justify-center text-slate-300 hover:text-white disabled:opacity-20 cursor-pointer"
                                    title="Chuyển xuống sau"
                                  >
                                    <ArrowDown className="w-2.5 h-2.5" />
                                  </button>
                                </>
                              )}
                              {onToggleBookVisibility && (
                                <button
                                  type="button"
                                  onClick={() => onToggleBookVisibility(originalIndex)}
                                  className="w-4.5 h-4.5 rounded flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                                  title={book.is_visible === false ? 'Hiện sách' : 'Ẩn sách'}
                                >
                                  {book.is_visible === false ? (
                                    <EyeOff className="w-2.5 h-2.5 text-amber-400" />
                                  ) : (
                                    <Eye className="w-2.5 h-2.5" />
                                  )}
                                </button>
                              )}
                              {onEditSingleBook && (
                                <button
                                  type="button"
                                  onClick={() => onEditSingleBook(book)}
                                  className="w-4.5 h-4.5 rounded flex items-center justify-center text-amber-300 hover:text-amber-200 cursor-pointer"
                                  title="Sửa sách"
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                </button>
                              )}
                              {onDeleteBook && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteBook(originalIndex)}
                                  className="w-4.5 h-4.5 rounded flex items-center justify-center text-red-400 hover:text-red-300 cursor-pointer"
                                  title="Xóa sách"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Vệt bóng đổ tiếp xúc giữa chân bìa sách và mặt gỗ (Book-Shelf Contact Shadow) */}
                      <div className="w-[88%] h-[5px] -mt-[2px] bg-black/85 rounded-full blur-[1.5px] pointer-events-none" />
                    </div>
                  );
                })}
              </div>

              {/* MẶT GỖ KỆ SÁCH (WOOD PLANK) - CHÂN DÃY SÁCH TỰA TRỰC TIẾP LÊN MẶT GỖ NÀY */}
              <div className="relative -mt-[1px] -mx-1 sm:-mx-2 z-5 pointer-events-none">
                {/* Bề mặt trên của thanh gỗ - nơi chân sách tiếp xúc trực tiếp */}
                <div
                  className="h-[8px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.32)]"
                  style={{
                    background: isDark
                      ? 'linear-gradient(180deg, #6c4222 0%, #4f2f16 70%, #341e0d 100%)'
                      : 'linear-gradient(180deg, #c29562 0%, #a47643 70%, #83592a 100%)',
                  }}
                />
                {/* Gờ mép trước thanh gỗ dày nổi 3D cao cấp - nơi chứa nhãn tiêu đề sách */}
                <div
                  className={`rounded-b-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_22px_rgba(0,0,0,0.95)] flex items-center justify-center transition-all ${
                    showBookTitles ? 'min-h-[20px] py-0.5' : 'h-[14px]'
                  }`}
                  style={{
                    background: isDark
                      ? 'linear-gradient(180deg, #8f582b 0%, #683d1c 50%, #3c230e 100%)'
                      : 'linear-gradient(180deg, #d4a773 0%, #b88a56 50%, #946937 100%)',
                  }}
                >
                  {/* TIÊU ĐỀ SÁCH TRÊN GỜ KỆ GỖ (TỰA CHÂN SÁCH, CHỈ 1 DÒNG DUY NHẤT, KHÔNG LÀM ĐẨY SÁCH) */}
                  {showBookTitles && (
                    <div
                      className={`w-full flex items-center ${
                        isPartialTier
                          ? 'justify-start gap-3.5 sm:gap-6 px-3 sm:px-4'
                          : 'justify-around gap-2 sm:gap-4 px-1 sm:px-3'
                      }`}
                    >
                      {tierBooks.map((b) => (
                        <div
                          key={`shelf-title-${b.id}`}
                          className={`${
                            isPartialTier ? cardMaxWidthClass + ' w-full' : 'flex-1 ' + cardMaxWidthClass
                          } text-center px-1 overflow-hidden`}
                        >
                          <p className="text-[9.5px] sm:text-[10.5px] font-bold text-amber-50 dark:text-amber-100/95 truncate leading-none drop-shadow-md tracking-tight">
                            {b.title}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Bóng đổ của thanh gỗ xuống không gian bên dưới */}
                <div
                  className="h-[18px] -mt-[1px]"
                  style={{
                    background: isDark
                      ? 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%)'
                      : 'linear-gradient(180deg, rgba(80,45,15,0.22) 0%, transparent 100%)',
                  }}
                />
              </div>
            </div>
          );
        })}

        {/* CÁC TẦNG KỆ GỖ TRỐNG TIẾP NỐI ĐỂ TỦ SÁCH PHỦ KÍN MÀN HÌNH - KHÔNG BAO GIỜ BỊ KHOẢNG TRẮNG CẮT NGANG */}
        {emptyShelvesCount > 0 &&
          Array.from({ length: emptyShelvesCount }).map((_, emptyIdx) => (
            <div key={`empty-tier-${emptyIdx}`} className="relative pt-6 sm:pt-8">
              <div className="h-16 sm:h-24 flex items-center justify-center opacity-35 select-none pointer-events-none">
                <span className="text-[10.5px] text-amber-700 dark:text-amber-400/40 font-serif italic tracking-widest">
                  ✦ TỦ SÁCH Y KHOA QBIZ ✦
                </span>
              </div>
              {/* Mặt gỗ kệ sách 3D */}
              <div className="relative -mt-[1px] -mx-1 sm:-mx-2 z-5 pointer-events-none">
                <div
                  className="h-[8px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.32)]"
                  style={{
                    background: isDark
                      ? 'linear-gradient(180deg, #6c4222 0%, #4f2f16 70%, #341e0d 100%)'
                      : 'linear-gradient(180deg, #c29562 0%, #a47643 70%, #83592a 100%)',
                  }}
                />
                <div
                  className="h-[14px] rounded-b-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_22px_rgba(0,0,0,0.95)]"
                  style={{
                    background: isDark
                      ? 'linear-gradient(180deg, #8f582b 0%, #683d1c 50%, #3c230e 100%)'
                      : 'linear-gradient(180deg, #d4a773 0%, #b88a56 50%, #946937 100%)',
                  }}
                />
                <div
                  className="h-[18px] -mt-[1px]"
                  style={{
                    background: isDark
                      ? 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%)'
                      : 'linear-gradient(180deg, rgba(80,45,15,0.22) 0%, transparent 100%)',
                  }}
                />
              </div>
            </div>
          ))}
      </div>

      {/* POPUP / MODAL ĐỔI TÊN HIỂN THỊ ("Hi, [tên người dùng]!") */}
      {showNameModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowNameModal(false)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-[#22150c] border border-[#553622] text-[#fdf7ee] p-4 shadow-2xl flex flex-col gap-3 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1 border-b border-white/10">
              <h3 className="text-sm font-bold text-amber-200">
                Đổi tên hiển thị
              </h3>
              <button
                type="button"
                onClick={() => setShowNameModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-[12px] text-amber-100/70">
              Nhập tên hoặc danh xưng của bạn để hiển thị lời chào trên đầu kệ sách.
            </p>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Ví dụ: Tùng, Dr. Tùng, Lan..."
              maxLength={30}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-amber-500/40 text-white text-[13px] placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName(nameInput);
              }}
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowNameModal(false)}
                className="px-3 py-1.5 rounded-lg text-[12px] text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleSaveName(nameInput)}
                className="px-3.5 py-1.5 rounded-lg text-[12px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer"
              >
                Lưu tên
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CÀI ĐẶT & TÙY CHỌN ĐỌC SÁCH CHUYÊN SÂU - TINH GỌN CHUẨN 1 DÒNG */}
      {showSettingsMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
          onClick={() => setShowSettingsMenu(false)}
        >
          <div
            className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl bg-[#FAF6EF] dark:bg-[#20130a] border border-[#d8c5aa] dark:border-[#553622] text-[#2c180c] dark:text-[#fdf7ee] p-3.5 sm:p-4 shadow-2xl flex flex-col gap-2.5 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tiêu đề Modal 1 dòng */}
            <div className="flex items-center justify-between pb-2 border-b border-[#e2d5c3] dark:border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <Settings size={17} className="text-amber-700 dark:text-amber-400" />
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#2c180c] dark:text-amber-200">
                  Cài đặt & Tùy chọn đọc
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsMenu(false)}
                className="w-7 h-7 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
                title="Đóng"
                aria-label="Đóng"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5 text-xs py-0.5">
              {/* 1. TÔNG MÀU GIẤY ĐỌC SÁCH (1 dòng tinh gọn) */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/80 dark:bg-black/35 border border-[#e8dccb] dark:border-white/5 whitespace-nowrap">
                <span className="text-[#4a250e] dark:text-amber-100/90 font-medium">Giấy đọc:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleChangePaperTheme('sepia')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      readerPaperTheme === 'sepia'
                        ? 'bg-[#3d3327] text-amber-300 ring-1 ring-amber-400'
                        : 'bg-[#efe5d6] dark:bg-black/40 text-amber-900 dark:text-slate-400 hover:text-[#2c180c] dark:hover:text-slate-200'
                    }`}
                    title="Vàng Sepia"
                  >
                    ☕ Sepia
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangePaperTheme('dark')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      readerPaperTheme === 'dark'
                        ? 'bg-slate-900 text-amber-300 ring-1 ring-amber-400'
                        : 'bg-[#efe5d6] dark:bg-black/40 text-amber-900 dark:text-slate-400 hover:text-[#2c180c] dark:hover:text-slate-200'
                    }`}
                    title="Đen OLED"
                  >
                    🌑 Đêm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangePaperTheme('ivory')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      readerPaperTheme === 'ivory'
                        ? 'bg-amber-100 text-slate-900 ring-1 ring-amber-500'
                        : 'bg-[#efe5d6] dark:bg-black/40 text-amber-900 dark:text-slate-400 hover:text-[#2c180c] dark:hover:text-slate-200'
                    }`}
                    title="Trắng ngà"
                  >
                    📜 Ngà
                  </button>
                </div>
              </div>

              {/* 2. CHẾ ĐỘ LẬT TRANG MẶC ĐỊNH (1 dòng tinh gọn) */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/80 dark:bg-black/35 border border-[#e8dccb] dark:border-white/5 whitespace-nowrap">
                <span className="text-[#4a250e] dark:text-amber-100/90 font-medium">Lật trang:</span>
                <div className="flex items-center gap-1 bg-[#efe5d6] dark:bg-black/40 p-0.5 rounded-lg border border-[#e2d5c3] dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => handleChangeDefaultMode('curl')}
                    className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-all cursor-pointer ${
                      readerDefaultMode === 'curl'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-amber-900 dark:text-slate-400 hover:text-[#2c180c] dark:hover:text-white'
                    }`}
                  >
                    Lật 3D
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeDefaultMode('roll')}
                    className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-all cursor-pointer ${
                      readerDefaultMode === 'roll'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-amber-900 dark:text-slate-400 hover:text-[#2c180c] dark:hover:text-white'
                    }`}
                  >
                    Trượt 3D
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeDefaultMode('scroll')}
                    className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-all cursor-pointer ${
                      readerDefaultMode === 'scroll'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-amber-900 dark:text-slate-400 hover:text-[#2c180c] dark:hover:text-white'
                    }`}
                  >
                    Cuộn dọc
                  </button>
                </div>
              </div>

              {/* 3. ÂM THANH LẬT SÁCH (1 dòng tinh gọn có công tắc) */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/80 dark:bg-black/35 border border-[#e8dccb] dark:border-white/5 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  {readerSoundEnabled ? (
                    <Volume2 size={16} className="text-amber-700 dark:text-amber-400" />
                  ) : (
                    <VolumeX size={16} className="text-slate-400 dark:text-slate-500" />
                  )}
                  <span className="text-[#4a250e] dark:text-amber-100/90 font-medium">Âm thanh lật sách</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleSound}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                    readerSoundEnabled ? 'bg-amber-500 justify-end' : 'bg-slate-400 dark:bg-slate-700 justify-start'
                  }`}
                  aria-label="Bật tắt âm thanh"
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* 4. TỰ ĐỘNG NHỚ TRANG ĐỌC DỞ (1 dòng tinh gọn có công tắc) */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/80 dark:bg-black/35 border border-[#e8dccb] dark:border-white/5 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <BookmarkCheck size={16} className="text-amber-700 dark:text-amber-400" />
                  <span className="text-[#4a250e] dark:text-amber-100/90 font-medium">Tự nhớ trang đọc dở</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAutoResume}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                    readerAutoResume ? 'bg-amber-500 justify-end' : 'bg-slate-400 dark:bg-slate-700 justify-start'
                  }`}
                  aria-label="Bật tắt tự nhớ trang"
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* 5. HIỆN TÊN SÁCH DƯỚI CHÂN KỆ (1 dòng tinh gọn có công tắc) */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/80 dark:bg-black/35 border border-[#e8dccb] dark:border-white/5 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <Type size={16} className="text-amber-700 dark:text-amber-400" />
                  <span className="text-[#4a250e] dark:text-amber-100/90 font-medium">Hiện tên sách dưới chân kệ</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleShowTitles}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                    showBookTitles ? 'bg-amber-500 justify-end' : 'bg-slate-400 dark:bg-slate-700 justify-start'
                  }`}
                  aria-label="Bật tắt hiện tên sách dưới chân kệ"
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* 6. HIỆN TIẾN ĐỘ ĐỌC TRÊN BÌA (1 dòng tinh gọn có công tắc) */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/80 dark:bg-black/35 border border-[#e8dccb] dark:border-white/5 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <BookmarkCheck size={16} className="text-amber-700 dark:text-amber-400" />
                  <span className="text-[#4a250e] dark:text-amber-100/90 font-medium">Hiện tiến độ đọc trên bìa</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleShowProgress}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                    showProgress ? 'bg-amber-500 justify-end' : 'bg-slate-400 dark:bg-slate-700 justify-start'
                  }`}
                  aria-label="Bật tắt hiện tiến độ đọc trên bìa"
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* 5. DẤU TRANG & SÁCH ĐÃ LƯU (1 dòng) */}
              <Link
                href="/da-luu"
                onClick={() => setShowSettingsMenu(false)}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-amber-900/10 dark:hover:bg-white/10 transition-colors text-[#3d2010] dark:text-amber-100 whitespace-nowrap"
              >
                <div className="flex items-center gap-2">
                  <Bookmark size={16} className="text-amber-700 dark:text-amber-400" />
                  <span>Dấu trang & Sách đã lưu</span>
                </div>
                <span className="text-[11px] text-amber-700 dark:text-amber-300 font-bold">Mở →</span>
              </Link>

              {/* 6. ĐỔI TÊN HIỂN THỊ (1 dòng) */}
              <button
                type="button"
                onClick={() => {
                  setShowSettingsMenu(false);
                  setNameInput(userName === 'bạn' ? '' : userName);
                  setShowNameModal(true);
                }}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-amber-900/10 dark:hover:bg-white/10 transition-colors text-[#3d2010] dark:text-amber-100 cursor-pointer whitespace-nowrap"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Edit2 size={16} className="text-amber-700 dark:text-amber-400 shrink-0" />
                  <span className="truncate">Tên bạn: {userName}</span>
                </div>
                <span className="text-[11px] text-amber-700 dark:text-amber-300 font-bold shrink-0 ml-2">Đổi</span>
              </button>

              {/* 7. CÀI APP RA MÀN HÌNH CHÍNH (PWA) (1 dòng) */}
              {onOpenPwaInstall && (
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsMenu(false);
                    onOpenPwaInstall();
                  }}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-amber-900/10 dark:hover:bg-white/10 transition-colors text-[#3d2010] dark:text-amber-100 cursor-pointer whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    <Smartphone size={16} className="text-amber-700 dark:text-amber-400" />
                    <span>Cài ứng dụng ra màn hình</span>
                  </div>
                  <span className="text-[11px] text-stone-500 dark:text-slate-300">PWA</span>
                </button>
              )}

              {/* 8. LỜI NGỎ & VIDEO (1 dòng) */}
              {onOpenWelcome && (
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsMenu(false);
                    onOpenWelcome();
                  }}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-amber-900/10 dark:hover:bg-white/10 transition-colors text-[#3d2010] dark:text-amber-100 cursor-pointer whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-amber-700 dark:text-amber-400" />
                    <span>Lời ngỏ giới thiệu</span>
                  </div>
                  <span className="text-[11px] text-stone-500 dark:text-slate-300">Xem</span>
                </button>
              )}

              {/* 9. KHỐI QUẢN TRỊ VIÊN (1 dòng) */}
              <div className="h-px bg-[#e8dccb] dark:bg-white/10 my-0.5" />
              {isAdmin ? (
                <>
                  {onOpenAdminSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettingsMenu(false);
                        onOpenAdminSettings();
                      }}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-amber-900/10 dark:hover:bg-white/10 transition-colors text-[#3d2010] dark:text-amber-200 cursor-pointer whitespace-nowrap"
                    >
                      <div className="flex items-center gap-2">
                        <Settings size={16} className="text-amber-700 dark:text-amber-400" />
                        <span>Cài đặt hệ thống</span>
                      </div>
                      <span className="text-[11px] text-amber-700 dark:text-amber-300 font-bold">Admin</span>
                    </button>
                  )}
                  {onOpenAddBookModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettingsMenu(false);
                        onOpenAddBookModal();
                      }}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-amber-900/10 dark:hover:bg-white/10 transition-colors text-[#3d2010] dark:text-amber-200 cursor-pointer whitespace-nowrap"
                    >
                      <div className="flex items-center gap-2">
                        <Plus size={16} className="text-amber-700 dark:text-amber-400" />
                        <span>Thêm sách mới</span>
                      </div>
                      <span className="text-[11px] text-amber-700 dark:text-amber-300 font-bold">+Sách</span>
                    </button>
                  )}
                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettingsMenu(false);
                        onLogout();
                      }}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-red-500/20 text-red-600 dark:text-red-300 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <div className="flex items-center gap-2">
                        <LogOut size={16} className="text-red-500 dark:text-red-400" />
                        <span>Đăng xuất Quản trị</span>
                      </div>
                      <span className="text-[11px] text-red-600 dark:text-red-400 font-bold">Thoát</span>
                    </button>
                  )}
                </>
              ) : (
                <Link
                  href="/dang-nhap"
                  onClick={() => setShowSettingsMenu(false)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-amber-900/10 dark:hover:bg-white/10 transition-colors text-[#3d2010] dark:text-amber-200 cursor-pointer whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    <Settings size={16} className="text-amber-700 dark:text-amber-400" />
                    <span>Đăng nhập Quản trị viên</span>
                  </div>
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">Khóa</span>
                </Link>
              )}

              {/* NÚT THOÁT PHẦN MỀM CÓ CẢNH BÁO (TRONG MENU CÀI ĐẶT) */}
              <div className="h-px bg-[#e8dccb] dark:bg-white/10 my-0.5" />
              <button
                type="button"
                onClick={() => {
                  setShowSettingsMenu(false);
                  setShowExitConfirm(true);
                }}
                className="flex items-center justify-between p-2 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-200 transition-all cursor-pointer whitespace-nowrap active:scale-98"
              >
                <div className="flex items-center gap-2">
                  <LogOut size={16} className="text-red-500 dark:text-red-400" />
                  <span className="font-bold text-red-700 dark:text-red-200">Thoát phần mềm</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30 font-bold">
                  Cảnh báo
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CẢNH BÁO KHI NGƯỜI DÙNG THOÁT RA KHỎI HẲN PHẦN MỀM */}
      {showExitConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => {
            isExitingRef.current = false;
            setShowExitConfirm(false);
          }}
        >
          <div
            className="w-full max-w-[330px] rounded-2xl bg-gradient-to-b from-[#FAF6EF] via-[#F4ECE0] to-[#EAE0D0] dark:from-[#25170e] dark:via-[#1f130b] dark:to-[#140b06] border border-amber-800/20 dark:border-amber-600/40 p-5 text-[#2c180c] dark:text-[#fdf7ee] text-center shadow-[0_20px_60px_rgba(0,0,0,0.4)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex flex-col items-center gap-3 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon cảnh báo hình tam giác phát sáng */}
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-amber-500/15 to-red-500/15 dark:from-amber-500/25 dark:to-red-500/20 border border-amber-500/30 dark:border-amber-500/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-lg shadow-amber-900/10 dark:shadow-amber-900/30">
              <AlertTriangle size={26} strokeWidth={2.4} className="text-amber-600 dark:text-amber-400 animate-pulse" />
            </div>

            {/* Tiêu đề Cảnh báo */}
            <div className="flex flex-col gap-1">
              <h3 className="text-[15px] font-black tracking-wide text-[#2c180c] dark:text-amber-100 uppercase">
                Xác nhận thoát phần mềm
              </h3>
              <p className="text-[12px] text-[#6a4224] dark:text-amber-200/85 leading-relaxed px-1">
                Bạn có chắc chắn muốn thoát khỏi ứng dụng đọc sách không?
              </p>
            </div>

            {/* Khối thông báo an toàn dữ liệu */}
            <div className="w-full p-2 rounded-xl bg-emerald-50 dark:bg-black/40 border border-emerald-200/80 dark:border-white/5 flex items-center justify-center gap-1.5 text-[11px] text-emerald-800 dark:text-emerald-300/90 font-medium">
              <CheckCircle2 size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Tiến độ đọc đã được lưu an toàn</span>
            </div>

            {/* 2 nút hành động chuẩn Mobile */}
            <div className="w-full flex flex-col gap-2 pt-1">
              {/* Nút 1: Ở lại đọc sách */}
              <button
                type="button"
                onClick={() => {
                  isExitingRef.current = false;
                  setShowExitConfirm(false);
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer active:scale-95"
              >
                Ở lại đọc sách
              </button>

              {/* Nút 2: Thoát hẳn phần mềm */}
              <button
                type="button"
                onClick={handleConfirmExit}
                className="w-full py-2.5 rounded-xl bg-red-100/80 hover:bg-red-200/80 dark:bg-red-950/40 dark:hover:bg-red-900/50 border border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-300 font-bold text-xs transition-all cursor-pointer active:scale-95"
              >
                Thoát phần mềm
              </button>
            </div>
          </div>
        </div>
      )}



      {/* MODAL XEM NHANH THÔNG TIN SÁCH (QUICK PEEK MODAL) */}
      {quickPeekBook && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
          onClick={() => setQuickPeekBook(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-[#FAF5ED] to-[#EFE5D6] dark:from-[#25170e] dark:to-[#170e08] border border-amber-900/20 dark:border-amber-900/60 p-4 sm:p-5 text-[#2c180c] dark:text-amber-100 shadow-2xl relative flex flex-col gap-3 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nút Đóng */}
            <button
              type="button"
              onClick={() => setQuickPeekBook(null)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-[#6a4224] dark:text-slate-300 hover:text-[#2c180c] dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Đóng tóm tắt sách"
            >
              <X size={15} />
            </button>

            {/* Thông tin đầu sách */}
            <div className="flex gap-3.5 items-start">
              <div className="w-20 shrink-0 aspect-[1/1.42] rounded-md overflow-hidden shadow-lg border border-amber-500/30">
                <img
                  src={quickPeekBook.cover_url || '/logo.png'}
                  alt={quickPeekBook.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 mb-1">
                  {quickPeekBook.category || quickPeekBook.tag || 'Tài liệu y khoa'}
                </span>
                <h4 className="text-sm sm:text-base font-black text-[#2c180c] dark:text-amber-100 leading-snug line-clamp-2">
                  {quickPeekBook.title}
                </h4>
                <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80 mt-0.5">
                  Tác giả: {quickPeekBook.author || 'Dr. Tùng'}
                </p>
                {bookProgressMap[quickPeekBook.title] && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                    <CheckCircle2 size={11} />
                    <span>
                      Tiến độ: Trang {bookProgressMap[quickPeekBook.title].page}/
                      {bookProgressMap[quickPeekBook.title].total} (
                      {bookProgressMap[quickPeekBook.title].percent}%)
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Mô tả tóm tắt nội dung */}
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-black/40 border border-[#e8dccb] dark:border-white/5 text-xs text-[#4a2810] dark:text-amber-200/90 leading-relaxed max-h-36 overflow-y-auto">
              <p className="font-semibold text-amber-900 dark:text-amber-300 mb-1">✦ Giới thiệu chuyên sâu:</p>
              <p>
                {quickPeekBook.description ||
                  'Tài liệu y khoa chuyên sâu được biên soạn công phu dành cho việc học tập và tự chăm sóc cơ thể chủ động.'}
              </p>
            </div>

            {/* Nút hành động */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const b = quickPeekBook;
                  setQuickPeekBook(null);
                  onReadBook3D(b);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                <BookOpen size={14} strokeWidth={2.5} />
                <span>Mở đọc ngay (3D)</span>
              </button>
              <button
                type="button"
                onClick={() => setQuickPeekBook(null)}
                className="px-3.5 py-2.5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-[#4a2810] dark:text-slate-200 font-bold text-xs active:scale-95 transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
