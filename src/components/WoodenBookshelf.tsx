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
  ArrowLeftRight,
  CheckCircle2,
  Check,
  HardDrive,
  Upload,
  UploadCloud,
  ShieldCheck,
  Headphones,
  Play,
} from 'lucide-react';
import { RecommendedBook } from '../lib/types';
import { AudiobookHistoryItem } from '../lib/audiobookHistory';
import ImportBookModal from './ImportBookModal';
import QuickEditBookModal from './QuickEditBookModal';
import { applyBookOverride } from '../lib/userBooksManager';

export type BookshelfThemeStyle = 'classic_wood' | 'dark_walnut' | 'minimal_white' | 'luxury_modern';
export type BookshelfCols = 2 | 3 | 4 | 5;

import SyncBackupModal from './SyncBackupModal';
import BookCoverArt from './BookCoverArt';
import AudiobookPlayerModal from './AudiobookPlayerModal';
import { CURATED_ONLINE_BOOKS } from '../lib/onlineLibraryData';
import { logoutAdmin } from '../lib/adminAuth';
import { clearUserPhone, getUserPhone } from '../lib/userSync';

interface WoodenBookshelfProps {
  books: RecommendedBook[];
  isAdmin?: boolean;
  onSelectBook: (book: RecommendedBook) => void;
  onReadBook3D: (book: RecommendedBook) => void;
  onEditSingleBook?: (book: RecommendedBook) => void;
  onToggleBookVisibility?: (index: number) => void;
  onMoveBook?: (index: number, direction: 'up' | 'down') => void;
  onReorderBooks?: (newBooks: RecommendedBook[]) => void;
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
  audioResume?: AudiobookHistoryItem | null;
  onOpenAudioResume?: () => void;
}

const getBookFormatBadge = (book: RecommendedBook) => {
  const lowerTag = (book.badge_tag || book.tag || '').toLowerCase();
  const lowerName = (book.file_name || book.file_url || book.pdf_url || '').toLowerCase();
  let label = '3D';
  if (lowerTag.includes('epub') || lowerName.endsWith('.epub')) {
    label = 'EPUB';
  } else if (lowerTag.includes('cbz') || lowerName.endsWith('.cbz')) {
    label = 'CBZ';
  } else if (lowerTag.includes('txt') || lowerName.endsWith('.txt')) {
    label = 'TXT';
  } else if (lowerTag.includes('pdf') || lowerName.endsWith('.pdf')) {
    label = 'PDF';
  } else if (lowerTag.includes('audio') || lowerTag.includes('mp3') || lowerName.endsWith('.mp3')) {
    label = 'AUDIO';
  }
  // Yêu cầu: "Đầu sách epub 3d... Đều không được cho màu. Chỉ ghi chữ mờ ẩn nhỏ ko nổi."
  return {
    label,
    color: 'bg-black/40 text-white/50 border border-white/10 dark:bg-black/55 dark:text-white/40 dark:border-white/5',
  };
};

export default function WoodenBookshelf({
  books,
  isAdmin = false,
  onSelectBook,
  onReadBook3D,
  onEditSingleBook,
  onToggleBookVisibility,
  onMoveBook,
  onReorderBooks,
  onDeleteBook,
  title = 'GIAN TRƯNG BÀY SÁCH Y KHOA',
  appName = 'Qbiz-ebook',
  logoUrl,
  audioResume,
  onOpenAudioResume,
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
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Tùy chọn chuyên sâu đọc sách (Đồng bộ với Reader 3D)
  const [readerPaperTheme, setReaderPaperTheme] = useState<'sepia' | 'dark' | 'ivory'>('dark');
  const [readerDefaultMode, setReaderDefaultMode] = useState<'curl' | 'roll' | 'scroll'>('curl');
  const [readerSoundEnabled, setReaderSoundEnabled] = useState<boolean>(true);
  const [readerAutoResume, setReaderAutoResume] = useState<boolean>(true);

  // Kiểu giá sách: Cổ điển nâu ấm | Nâu đậm trầm | Trắng sứ tối giản | Mun đen hiện đại
  const [bookshelfThemeStyle, setBookshelfThemeStyle] = useState<BookshelfThemeStyle>('classic_wood');

  // Kích thước đầu sách trên kệ gỗ: 2 (Lớn), 3 (Chuẩn), 4 (Gọn), 5 (Mini)
  const [bookCols, setBookCols] = useState<BookshelfCols>(3);
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
  const [showAudioModal, setShowAudioModal] = useState<boolean>(false);
  const [showAudioSearch, setShowAudioSearch] = useState<boolean>(false);
  const [audioSearchQuery, setAudioSearchQuery] = useState<string>('');
  const [activeAudioItem, setActiveAudioItem] = useState<{
    id: string;
    title: string;
    author: string;
    coverUrl?: string;
    audioUrl: string;
    fallbackUrl?: string;
    audioNarrator?: string;
    durationFormatted?: string;
  } | null>(null);
  const [showAudioPlayer, setShowAudioPlayer] = useState<boolean>(false);

  const curatedAudiobooksList = React.useMemo(() => {
    const list = CURATED_ONLINE_BOOKS.filter(
      (b) => b.medium === 'audio' || b.medium === 'both' || b.format === 'audio'
    );
    if (!audioSearchQuery.trim()) return list;
    const q = audioSearchQuery.toLowerCase().trim();
    return list.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        (b.author && b.author.toLowerCase().includes(q)) ||
        (b.description && b.description.toLowerCase().includes(q))
    );
  }, [audioSearchQuery]);
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
  const [hasExitedApp, setHasExitedApp] = useState<boolean>(false);
  const [showImportBookModal, setShowImportBookModal] = useState<boolean>(false);
  const [editingCustomBook, setEditingCustomBook] = useState<RecommendedBook | null>(null);
  const [overrideVersion, setOverrideVersion] = useState<number>(0);
  const [isReorderMode, setIsReorderMode] = useState<boolean>(false);

  // Quản lý thứ tự danh sách sách nội bộ để phản hồi displacement tức thì (Drag & Drop Displacement)
  const [internalBooks, setInternalBooks] = useState<RecommendedBook[]>(books);

  useEffect(() => {
    setInternalBooks(books);
  }, [books]);

  // Trạng thái Kéo thả di chuyển sách chuẩn màn hình điện thoại (iOS / Android Home Screen)
  const [draggedBookId, setDraggedBookId] = useState<string | null>(null);
  const [dragGhostData, setDragGhostData] = useState<{
    book: RecommendedBook;
    width: number;
    height: number;
  } | null>(null);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pointerOffset, setPointerOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastSwapTimeRef = useRef<number>(0);
  const isExitingRef = useRef<boolean>(false);

  // Lắng nghe Pointer Move và Pointer Up toàn màn hình khi đang kéo sách (Drag & Drop Reorder)
  useEffect(() => {
    const handleWindowPointerMove = (e: PointerEvent) => {
      // 1. Nếu đang chờ Long-press (chưa bắt đầu kéo): Kiểm tra di chuyển ngón tay
      if (touchStartPosRef.current && !isDragging) {
        const dx = e.clientX - touchStartPosRef.current.x;
        const dy = e.clientY - touchStartPosRef.current.y;
        if (Math.hypot(dx, dy) > 8) {
          // Ngón tay dịch chuyển quá 8px -> Coi là vuốt trang, hủy timer long-press
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }
      }

      // 2. Nếu đang kéo sách (isDragging = true)
      if (isDragging && draggedBookId) {
        setPointerPos({ x: e.clientX, y: e.clientY });

        // HIT-TESTING ĐẨY SÁCH (DISPLACEMENT NHƯ MÀN HÌNH ĐIỆN THOẠI)
        const underEl = document.elementFromPoint(e.clientX, e.clientY);
        const targetCard = underEl?.closest('[data-book-item-id]');
        const targetBookId = targetCard?.getAttribute('data-book-item-id');

        if (targetBookId && targetBookId !== draggedBookId) {
          const now = Date.now();
          if (now - lastSwapTimeRef.current > 140) {
            setInternalBooks((prevBooks) => {
              const fromIdx = prevBooks.findIndex((b) => b.id === draggedBookId);
              const toIdx = prevBooks.findIndex((b) => b.id === targetBookId);
              if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
                const next = [...prevBooks];
                const [moved] = next.splice(fromIdx, 1);
                next.splice(toIdx, 0, moved);
                lastSwapTimeRef.current = now;
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                  try { navigator.vibrate(25); } catch {}
                }
                return next;
              }
              return prevBooks;
            });
          }
        }
      }
    };

    const handleWindowPointerUp = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      touchStartPosRef.current = null;

      if (isDragging) {
        setIsDragging(false);
        setDraggedBookId(null);
        setDragGhostData(null);

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate([40, 25, 40]); } catch {}
        }

        // Lưu thứ tự mới bền vững
        if (onReorderBooks) {
          onReorderBooks(internalBooks);
        }
        try {
          localStorage.setItem('qbiz_bookshelf_custom_books', JSON.stringify(internalBooks));
        } catch {}

        showToast('✓ Đã xếp sách vào vị trí mới');

        setTimeout(() => {
          isLongPressTriggeredRef.current = false;
        }, 350);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        isDragging ||
        isReorderMode ||
        touchStartPosRef.current !== null ||
        target?.closest?.('[data-book-item-id], .book-cover-container, img')
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('pointermove', handleWindowPointerMove, { passive: true });
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
    window.addEventListener('contextmenu', handleContextMenu, { capture: true });

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
    };
  }, [isDragging, draggedBookId, internalBooks, onReorderBooks, isReorderMode]);

  // Lắng nghe sự kiện cập nhật thông tin sách để cập nhật tức thì
  useEffect(() => {
    const onUpdate = () => setOverrideVersion((v) => v + 1);
    window.addEventListener('qbiz_book_metadata_updated', onUpdate);
    window.addEventListener('qbiz_book_downloaded', onUpdate);
    window.addEventListener('qbiz_book_removed_offline', onUpdate);
    return () => {
      window.removeEventListener('qbiz_book_metadata_updated', onUpdate);
      window.removeEventListener('qbiz_book_downloaded', onUpdate);
      window.removeEventListener('qbiz_book_removed_offline', onUpdate);
    };
  }, []);

  const handleLogoutAccount = async () => {
    isExitingRef.current = true;
    setShowExitConfirm(false);
    setShowSettingsMenu(false);
    try {
      if (isAdmin || onLogout) {
        await logoutAdmin();
        if (onLogout) onLogout();
      }
      clearUserPhone();
      showToast('✓ Đã đăng xuất tài khoản thành công!');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error('Logout error:', err);
      showToast('✓ Đã đăng xuất tài khoản.');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  const handleExitApp = () => {
    isExitingRef.current = true;
    setShowExitConfirm(false);
    setShowSettingsMenu(false);
    try {
      window.close();
    } catch {}
    showToast('💡 Bạn có thể vuốt tắt tab trình duyệt để thoát hẳn ứng dụng');
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
      const next = (prev === 5 ? 4 : prev === 4 ? 3 : prev === 3 ? 2 : 2) as BookshelfCols;
      if (next !== prev) {
        try { localStorage.setItem('bookshelf_book_cols', String(next)); } catch {}
        const labels: Record<BookshelfCols, string> = {
          2: 'Cỡ sách: Lớn (2 cuốn/tầng)',
          3: 'Cỡ sách: Chuẩn (3 cuốn/tầng)',
          4: 'Cỡ sách: Gọn (4 cuốn/tầng)',
          5: 'Cỡ sách: Mini (5 cuốn/tầng)',
        };
        showToast(labels[next]);
      }
      return next;
    });
  };

  const zoomOutBooks = () => {
    setBookCols((prev) => {
      const next = (prev === 2 ? 3 : prev === 3 ? 4 : prev === 4 ? 5 : 5) as BookshelfCols;
      if (next !== prev) {
        try { localStorage.setItem('bookshelf_book_cols', String(next)); } catch {}
        const labels: Record<BookshelfCols, string> = {
          2: 'Cỡ sách: Lớn (2 cuốn/tầng)',
          3: 'Cỡ sách: Chuẩn (3 cuốn/tầng)',
          4: 'Cỡ sách: Gọn (4 cuốn/tầng)',
          5: 'Cỡ sách: Mini (5 cuốn/tầng)',
        };
        showToast(labels[next]);
      }
      return next;
    });
  };

  const setColsExplicit = (cols: BookshelfCols) => {
    setBookCols(cols);
    try { localStorage.setItem('bookshelf_book_cols', String(cols)); } catch {}
    const labels: Record<BookshelfCols, string> = {
      2: 'Cỡ sách: Lớn (2 cuốn/tầng)',
      3: 'Cỡ sách: Chuẩn (3 cuốn/tầng)',
      4: 'Cỡ sách: Gọn (4 cuốn/tầng)',
      5: 'Cỡ sách: Mini (5 cuốn/tầng)',
    };
    showToast(labels[cols]);
  };

  const handleChangeBookshelfTheme = (style: BookshelfThemeStyle) => {
    setBookshelfThemeStyle(style);
    try {
      localStorage.setItem('bookshelf_theme_style', style);
    } catch {}
    const labels: Record<BookshelfThemeStyle, string> = {
      classic_wood: 'Kệ sách: Gỗ cổ điển',
      dark_walnut: 'Kệ sách: Nâu đậm trầm',
      minimal_white: 'Kệ sách: Trắng sứ tối giản',
      luxury_modern: 'Kệ sách: Mun đen sang trọng',
    };
    showToast(labels[style]);
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
      if (savedCols && ['2', '3', '4', '5'].includes(savedCols)) {
        setBookCols(Number(savedCols) as BookshelfCols);
      }
      const savedThemeStyle = localStorage.getItem('bookshelf_theme_style');
      if (
        savedThemeStyle &&
        ['classic_wood', 'dark_walnut', 'minimal_white', 'luxury_modern'].includes(savedThemeStyle)
      ) {
        setBookshelfThemeStyle(savedThemeStyle as BookshelfThemeStyle);
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
    internalBooks.forEach((b) => {
      const cat = b.category || b.tag;
      if (cat && cat.trim()) set.add(cat.trim());
    });
    return Array.from(set);
  }, [internalBooks]);

  const activeBooks = React.useMemo(() => {
    let list = (
      selectedCategory === 'all'
        ? [...internalBooks]
        : internalBooks.filter((b) => (b.category || b.tag) === selectedCategory)
    ).map((b) => applyBookOverride(b));

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
  }, [internalBooks, selectedCategory, sortBy, bookProgressMap, lastReadBookTitle, overrideVersion]);

  const visibleBooks = activeBooks.filter((b) => isAdmin || b.is_visible !== false);

  if (visibleBooks.length === 0 && !isAdmin) {
    return null;
  }

  // Chia danh sách sách thành các tầng kệ linh hoạt theo bookCols (2, 3, 4, hoặc 5 cuốn / tầng)
  const chunkSize = bookCols;
  const tiers: RecommendedBook[][] = [];
  for (let i = 0; i < activeBooks.length; i += chunkSize) {
    const chunk = activeBooks.slice(i, i + chunkSize);
    const hasVisibleInChunk = chunk.some((b) => isAdmin || b.is_visible !== false);
    if (hasVisibleInChunk) {
      tiers.push(chunk);
    }
  }

  // Cấu hình linh hoạt giao diện kệ sách (Bookshelf Themes: Cổ điển, Nâu đậm, Trắng sứ, Mun đen)
  const getBookshelfContainerClass = () => {
    switch (bookshelfThemeStyle) {
      case 'minimal_white':
        return 'bg-gradient-to-b from-[#FFFFFF] via-[#F8FAFC] to-[#F1F5F9] dark:from-[#0F172A] dark:via-[#090D16] dark:to-[#020617] border-[#CBD5E1] dark:border-[#1E293B] text-slate-800 dark:text-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.04)]';
      case 'dark_walnut':
        return 'bg-gradient-to-b from-[#E2D5C3] via-[#C5B097] to-[#B0977B] dark:from-[#150D07] dark:via-[#0D0703] dark:to-[#050201] border-[#7D4925] dark:border-[#2E180B] text-[#241307] dark:text-[#FBE8D3] shadow-[0_10px_30px_rgba(0,0,0,0.1)]';
      case 'luxury_modern':
        return 'bg-gradient-to-b from-[#252B36] via-[#1B202A] to-[#101319] dark:from-[#0D0F14] dark:via-[#07080B] dark:to-[#020304] border-[#3B4455] dark:border-[#1E2430] text-slate-100 dark:text-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.2)]';
      case 'classic_wood':
      default:
        return 'bg-gradient-to-b from-[#FAF5EE] via-[#F3EADB] to-[#E8DBCA] dark:from-[#24170d] dark:via-[#1c1109] dark:to-[#110803] border-[#d8c5aa] dark:border-[#3d2817] text-[#29180c] dark:text-[#fdf7ee] shadow-[0_10px_30px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)]';
    }
  };

  const getSpotlightGradient = () => {
    switch (bookshelfThemeStyle) {
      case 'minimal_white':
        return isDark
          ? 'radial-gradient(ellipse at 50% 0%, rgba(148, 163, 184, 0.16) 0%, transparent 75%)'
          : 'radial-gradient(ellipse at 50% 0%, rgba(100, 116, 139, 0.10) 0%, transparent 75%)';
      case 'dark_walnut':
        return isDark
          ? 'radial-gradient(ellipse at 50% 0%, rgba(217, 119, 6, 0.14) 0%, transparent 75%)'
          : 'radial-gradient(ellipse at 50% 0%, rgba(180, 83, 9, 0.12) 0%, transparent 75%)';
      case 'luxury_modern':
        return 'radial-gradient(ellipse at 50% 0%, rgba(245, 158, 11, 0.16) 0%, transparent 75%)';
      case 'classic_wood':
      default:
        return isDark
          ? 'radial-gradient(ellipse at 50% 0%, rgba(251, 191, 36, 0.16) 0%, transparent 75%)'
          : 'radial-gradient(ellipse at 50% 0%, rgba(217, 119, 6, 0.10) 0%, transparent 75%)';
    }
  };

  const getPlankTopBg = () => {
    switch (bookshelfThemeStyle) {
      case 'minimal_white':
        return isDark
          ? 'linear-gradient(180deg, #475569 0%, #334155 70%, #1E293B 100%)'
          : 'linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 70%, #E2E8F0 100%)';
      case 'dark_walnut':
        return isDark
          ? 'linear-gradient(180deg, #482611 0%, #321808 70%, #1f0d04 100%)'
          : 'linear-gradient(180deg, #7c4822 0%, #5f3415 70%, #43230c 100%)';
      case 'luxury_modern':
        return isDark
          ? 'linear-gradient(180deg, #333d4d 0%, #202732 70%, #141920 100%)'
          : 'linear-gradient(180deg, #434e62 0%, #2d3544 70%, #1c222c 100%)';
      case 'classic_wood':
      default:
        return isDark
          ? 'linear-gradient(180deg, #6c4222 0%, #4f2f16 70%, #341e0d 100%)'
          : 'linear-gradient(180deg, #c29562 0%, #a47643 70%, #83592a 100%)';
    }
  };

  const getPlankFaceBg = () => {
    switch (bookshelfThemeStyle) {
      case 'minimal_white':
        return isDark
          ? 'linear-gradient(180deg, #334155 0%, #1E293B 50%, #0F172A 100%)'
          : 'linear-gradient(180deg, #F8FAFC 0%, #E2E8F0 50%, #CBD5E1 100%)';
      case 'dark_walnut':
        return isDark
          ? 'linear-gradient(180deg, #5c3014 0%, #3d1c08 50%, #240e03 100%)'
          : 'linear-gradient(180deg, #91552a 0%, #703f1b 50%, #4f290e 100%)';
      case 'luxury_modern':
        return isDark
          ? 'linear-gradient(180deg, #242c38 0%, #171d25 50%, #0c0f14 100%)'
          : 'linear-gradient(180deg, #343e4f 0%, #212833 50%, #14181f 100%)';
      case 'classic_wood':
      default:
        return isDark
          ? 'linear-gradient(180deg, #8f582b 0%, #683d1c 50%, #3c230e 100%)'
          : 'linear-gradient(180deg, #d4a773 0%, #b88a56 50%, #946937 100%)';
    }
  };

  const getPlankTitleColor = () => {
    switch (bookshelfThemeStyle) {
      case 'minimal_white':
        return isDark ? 'text-slate-100 drop-shadow-sm' : 'text-slate-800 drop-shadow-sm';
      case 'dark_walnut':
        return 'text-amber-100 drop-shadow-md';
      case 'luxury_modern':
        return 'text-amber-300 drop-shadow-md';
      case 'classic_wood':
      default:
        return 'text-amber-50 dark:text-amber-100/95 drop-shadow-md';
    }
  };

  const getShelfTitleHeaderColor = () => {
    switch (bookshelfThemeStyle) {
      case 'minimal_white':
        return 'text-slate-800 dark:text-slate-100';
      case 'dark_walnut':
        return 'text-[#42220d] dark:text-amber-200';
      case 'luxury_modern':
        return 'text-amber-300 dark:text-amber-300';
      case 'classic_wood':
      default:
        return 'text-[#4a250e] dark:text-amber-200/90';
    }
  };

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
      className={`relative w-full min-h-[calc(100dvh-5.5rem)] flex flex-col justify-start rounded-none sm:rounded-2xl overflow-hidden px-2 sm:px-5 pt-[max(0.5rem,env(safe-area-inset-top))] pb-8 sm:py-6 border-x-0 border-t-0 sm:border select-none transition-colors duration-200 ${getBookshelfContainerClass()}`}
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
          background: getSpotlightGradient(),
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

          {/* Ở GIỮA: Tên thương hiệu + Lời chào với hiệu ứng Sống Động */}
          <div className="flex flex-col flex-1 min-w-0 relative">
            {/* Dòng chữ sống động bồng bềnh 3D */}
            <div className="flex items-center gap-1.5 animate-living-float relative z-10">
              <span className="text-[15px] sm:text-[16px] font-black tracking-tight text-[#24150b] dark:text-[#fdf7ee] uppercase drop-shadow-xs">
                {firstWord}
              </span>
              <span className="text-[15px] sm:text-[16px] font-black tracking-tight golden-shimmer-text uppercase">
                {restWords}
              </span>
              <span className="text-[11px] animate-pulse select-none">✨</span>
            </div>

            {/* Lời chào người dùng */}
            <button
              type="button"
              onClick={() => {
                setNameInput(userName === 'bạn' ? '' : userName);
                setShowNameModal(true);
              }}
              className="text-[11.5px] sm:text-[12px] font-bold text-[#78350f] dark:text-amber-200/90 hover:text-[#451a03] dark:hover:text-amber-100 mt-0.5 flex items-center gap-1 cursor-pointer transition-colors text-left group/greet truncate relative z-10"
              title="Bấm để đổi tên của bạn"
            >
              <span className="truncate">Hi, {userName || 'bạn'}! 👋</span>
              <Edit2 size={10} className="text-amber-600 dark:text-amber-400/60 group-hover/greet:text-amber-700 dark:group-hover/greet:text-amber-300 shrink-0" />
            </button>
          </div>

          {/* BÊN PHẢI: CỤM CÀI ĐẶT & TIỆN ÍCH DẠNG ICON THU GỌN (ẤN VÀO SỔ RA) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Chuyển chế độ Sáng / Tối */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full bg-white/70 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 border border-[#d8c5aa] dark:border-white/10 flex items-center justify-center text-amber-900 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-200 transition-all cursor-pointer shadow-xs active:scale-95"
              title={isDark ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'}
              aria-label="Sáng / Tối"
            >
              {isDark ? <Sun size={15} strokeWidth={2.4} /> : <Moon size={15} strokeWidth={2.4} />}
            </button>

            {/* Nút Cài đặt / Menu Tổng (Ấn vào sổ ra toàn bộ menu điều khiển) */}
            <button
              type="button"
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 flex items-center justify-center transition-all cursor-pointer shadow-sm relative active:scale-95"
              title="Cài đặt & Tiện ích (Ấn để mở menu)"
              aria-label="Cài đặt"
            >
              <Settings size={15} strokeWidth={2.4} className={showSettingsMenu ? 'rotate-90 transition-transform duration-300' : 'transition-transform duration-300'} />
              {isAdmin && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 ring-1 ring-black" />
              )}
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

      {/* KHỐI TIẾP TỤC ĐỌC & NGHE THÔNG MINH (1 HÀNG CHIA ĐÔI HOẶC 1 DÒNG TINH GỌN) */}
      {(() => {
        const hasRead = Boolean(lastReadBook && !isResumeDismissed);
        const hasAudio = Boolean(
          audioResume &&
          audioResume.percent < 98 &&
          audioResume.currentTime > 5 &&
          !isResumeDismissed
        );

        if (!hasRead && !hasAudio) return null;

        // TRƯỜNG HỢP 1: CẢ 2 ĐỀU CÓ -> GỘP 1 KHUNG CHIA ĐÔI (GRID 2 CỘT CÂN XỨNG)
        if (hasRead && hasAudio && lastReadBook && audioResume) {
          return (
            <div className="relative z-10 mb-3 p-1.5 sm:p-2 rounded-2xl bg-gradient-to-r from-[#2c180d]/95 via-[#382012]/95 to-[#24130a]/95 border border-amber-500/40 backdrop-blur-md shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-2 divide-x divide-amber-500/25">
                {/* NỬA TRÁI: ĐỌC TIẾP */}
                <div
                  onClick={() => onReadBook3D(lastReadBook)}
                  className="pr-2 pl-1 flex items-center gap-2 min-w-0 cursor-pointer group select-none hover:opacity-95 transition-opacity"
                  title={`Đọc tiếp: ${lastReadBook.title} (Trang ${lastReadPage})`}
                >
                  <div className="relative w-6 h-8 sm:w-7 sm:h-9 rounded overflow-hidden shrink-0 border border-amber-500/30 shadow-xs">
                    <BookCoverArt
                      coverUrl={lastReadBook.cover_url}
                      title={lastReadBook.title}
                      author={lastReadBook.author}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-[9.5px] font-black uppercase text-amber-300 tracking-wider truncate">
                        Đọc dở · Tr.{lastReadPage}
                      </span>
                    </div>
                    <h4 className="text-[11px] font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                      {lastReadBook.title}
                    </h4>
                  </div>
                </div>

                {/* NỬA PHẢI: NGHE TIẾP */}
                <div
                  onClick={() => onOpenAudioResume?.()}
                  className="pl-2 pr-5 flex items-center gap-2 min-w-0 cursor-pointer group select-none relative hover:opacity-95 transition-opacity"
                  title={`Nghe tiếp: ${audioResume.title} (${audioResume.percent}%)`}
                >
                  <div className="w-6 h-8 sm:w-7 sm:h-9 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                    <Headphones size={13} className="text-amber-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                      <span className="text-[9.5px] font-black uppercase text-amber-300 tracking-wider truncate">
                        Nghe dở · {audioResume.percent}%
                      </span>
                    </div>
                    <h4 className="text-[11px] font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                      {audioResume.title}
                    </h4>
                  </div>
                </div>
              </div>

              {/* Nút đóng/ẩn widget */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsResumeDismissed(true);
                }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full text-amber-400/60 hover:text-red-400 flex items-center justify-center cursor-pointer transition-colors"
                title="Ẩn thông báo này"
                aria-label="Ẩn khung tiếp tục học"
              >
                <X size={11} strokeWidth={2.4} />
              </button>
            </div>
          );
        }

        // TRƯỜNG HỢP 2: CHỈ CÓ ĐỌC DỞ
        if (hasRead && lastReadBook) {
          return (
            <div className="relative z-10 mb-3 p-2 sm:p-2.5 rounded-2xl bg-gradient-to-r from-[#2c180d]/95 via-[#382012]/95 to-[#24130a]/95 border border-amber-500/40 backdrop-blur-md flex items-center justify-between gap-2 shadow-md transition-all animate-in fade-in slide-in-from-top-2 duration-200">
              <div
                onClick={() => onReadBook3D(lastReadBook)}
                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
              >
                <div className="relative w-7 h-9 sm:w-8 sm:h-10 rounded overflow-hidden shrink-0 border border-amber-500/30 shadow-xs">
                  <BookCoverArt
                    coverUrl={lastReadBook.cover_url}
                    title={lastReadBook.title}
                    author={lastReadBook.author}
                    className="w-full h-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                      Đang đọc dở · Trang {lastReadPage}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                    {lastReadBook.title}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onReadBook3D(lastReadBook)}
                  className="h-7 px-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-[11px] flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs transition-all"
                  title={`Đọc tiếp cuốn ${lastReadBook.title}`}
                >
                  <BookOpen size={12} strokeWidth={2.4} />
                  <span>Đọc tiếp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsResumeDismissed(true)}
                  className="w-6 h-6 rounded-lg text-amber-400/60 hover:text-red-400 flex items-center justify-center cursor-pointer transition-colors"
                  title="Ẩn thông báo này"
                  aria-label="Ẩn banner tiếp tục đọc"
                >
                  <X size={12} strokeWidth={2.4} />
                </button>
              </div>
            </div>
          );
        }

        // TRƯỜNG HỢP 3: CHỈ CÓ NGHE DỞ
        if (hasAudio && audioResume) {
          return (
            <div className="relative z-10 mb-3 p-2 sm:p-2.5 rounded-2xl bg-gradient-to-r from-[#2c180d]/95 via-[#382012]/95 to-[#24130a]/95 border border-amber-500/40 backdrop-blur-md flex items-center justify-between gap-2 shadow-md transition-all animate-in fade-in slide-in-from-top-2 duration-200">
              <div
                onClick={() => onOpenAudioResume?.()}
                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                  <Headphones size={15} className="text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                    <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider">
                      Đang nghe dở · {audioResume.percent}%
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                    {audioResume.title}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenAudioResume?.()}
                  className="h-7 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] flex items-center gap-1 shrink-0 cursor-pointer shadow-xs active:scale-95 transition-transform"
                >
                  <Play size={11} className="fill-current" />
                  <span>Nghe tiếp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsResumeDismissed(true)}
                  className="w-6 h-6 rounded-lg text-amber-400/60 hover:text-red-400 flex items-center justify-center cursor-pointer transition-colors"
                  title="Ẩn thông báo này"
                  aria-label="Ẩn banner tiếp tục nghe"
                >
                  <X size={12} strokeWidth={2.4} />
                </button>
              </div>
            </div>
          );
        }

        return null;
      })()}

      {/* TIÊU ĐỀ GIAN TRƯNG BÀY SÁCH & BỘ ĐIỀU KHIỂN DẠNG ICON TINH GỌN */}
      <div className={`relative flex items-center justify-between mb-3 px-1 sm:px-2 gap-2 ${showSortMenu ? 'z-40' : 'z-20'}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-1 h-3.5 rounded-full bg-amber-500 shrink-0" />
          <h2 className={`text-[13px] sm:text-[14px] font-black tracking-wider uppercase drop-shadow-xs whitespace-nowrap ${getShelfTitleHeaderColor()}`}>
            GIAN TRƯNG BÀY
          </h2>
          {/* Nút Audio / Sách nói tinh tế ngay cạnh Gian Trưng Bày theo yêu cầu người dùng */}
          <button
            type="button"
            onClick={() => setShowAudioModal(true)}
            className="ml-0.5 px-2 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 border border-amber-500/35 text-amber-800 dark:text-amber-200 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs whitespace-nowrap shrink-0"
            title="Kho Sách Nói Audio"
            aria-label="Kho sách nói Audio"
          >
            <Headphones size={11} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-extrabold tracking-tight">Audio</span>
          </button>
        </div>

        {/* CỤM NÚT SẮP XẾP VÀ KÍNH LÚP THU NHỎ / PHÓNG TO SÁCH (ĐÃ BỎ NÚT CHẾ ĐỘ DI CHUYỂN) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Nút Đưa sách từ máy vào kệ (Icon Upload) */}
          <button
            type="button"
            onClick={() => setShowImportBookModal(true)}
            className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90"
            title="Đưa sách từ máy (.epub, .pdf, .cbz) vào kệ sách"
            aria-label="Đưa sách vào kệ"
          >
            <Upload size={13} strokeWidth={2.4} />
          </button>

          {/* Nút Đổi Sắp Xếp Sách: DẠNG ICON THU GỌN - ĐÃ BỎ CHẤM ĐỎ */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSortMenu(!showSortMenu)}
              className={`w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90 relative ${
                sortBy !== 'default'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                  : 'bg-white/80 dark:bg-[#25150c]/90 hover:bg-white dark:hover:bg-[#351e11] border-[#d8c5aa] dark:border-amber-900/60 text-[#4a250e] dark:text-amber-200'
              }`}
              title="Sắp xếp sách: Mặc định, Gần đây, A-Z, Chuyên mục (Ấn để chọn)"
              aria-label="Đổi thứ tự sắp xếp sách"
            >
              <ArrowUpDown size={13} strokeWidth={2.4} className={sortBy !== 'default' ? 'text-slate-950' : 'text-amber-500'} />
            </button>

            {/* Menu Sổ Ra Chọn Kiểu Sắp Xếp */}
            {showSortMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowSortMenu(false)}
                />
                <div className="absolute right-0 top-9 z-40 w-44 rounded-xl bg-[#25150c] border border-amber-500/50 shadow-2xl p-1.5 flex flex-col gap-1 backdrop-blur-md animate-in fade-in slide-in-from-top-1">
                  <div className="px-2 py-1 text-[10px] font-black uppercase text-amber-400/80 border-b border-white/10 tracking-wider">
                    Kiểu sắp xếp sách
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy('default');
                      setShowSortMenu(false);
                      showToast('✦ Sắp xếp: Kéo thả mặc định');
                    }}
                    className={`px-2 py-1.5 rounded-lg flex items-center justify-between text-[11px] font-bold transition-colors cursor-pointer ${
                      sortBy === 'default'
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'text-amber-100 hover:bg-white/10'
                    }`}
                  >
                    <span>✦ Mặc định (kéo thả)</span>
                    {sortBy === 'default' && <Check size={12} strokeWidth={3} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy('recent');
                      setShowSortMenu(false);
                      showToast('🕒 Sắp xếp: Đọc gần đây nhất');
                    }}
                    className={`px-2 py-1.5 rounded-lg flex items-center justify-between text-[11px] font-bold transition-colors cursor-pointer ${
                      sortBy === 'recent'
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'text-amber-100 hover:bg-white/10'
                    }`}
                  >
                    <span>🕒 Đọc gần đây nhất</span>
                    {sortBy === 'recent' && <Check size={12} strokeWidth={3} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy('az');
                      setShowSortMenu(false);
                      showToast('🔤 Sắp xếp: Theo tên A - Z');
                    }}
                    className={`px-2 py-1.5 rounded-lg flex items-center justify-between text-[11px] font-bold transition-colors cursor-pointer ${
                      sortBy === 'az'
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'text-amber-100 hover:bg-white/10'
                    }`}
                  >
                    <span>🔤 Tên sách (A – Z)</span>
                    {sortBy === 'az' && <Check size={12} strokeWidth={3} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy('category');
                      setShowSortMenu(false);
                      showToast('📂 Sắp xếp: Theo chuyên mục');
                    }}
                    className={`px-2 py-1.5 rounded-lg flex items-center justify-between text-[11px] font-bold transition-colors cursor-pointer ${
                      sortBy === 'category'
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'text-amber-100 hover:bg-white/10'
                    }`}
                  >
                    <span>📂 Theo chuyên mục</span>
                    {sortBy === 'category' && <Check size={12} strokeWidth={3} />}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Cụm Kính lúp: Chỉ thu nhỏ (-) và phóng to (+) đầu sách */}
          <div className="flex items-center gap-0.5 bg-white/80 dark:bg-[#25150c]/90 border border-[#d8c5aa] dark:border-amber-900/60 rounded-xl p-0.5 shadow-xs">
            <button
              type="button"
              onClick={zoomOutBooks}
              disabled={bookCols === 5}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[#4a250e] dark:text-amber-200 hover:text-amber-950 dark:hover:text-white hover:bg-amber-900/10 dark:hover:bg-white/10 active:scale-90 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              title="Thu nhỏ đầu sách"
              aria-label="Thu nhỏ sách"
            >
              <ZoomOut size={12} strokeWidth={2.4} />
            </button>
            <button
              type="button"
              onClick={zoomInBooks}
              disabled={bookCols === 2}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[#4a250e] dark:text-amber-200 hover:text-amber-950 dark:hover:text-white hover:bg-amber-900/10 dark:hover:bg-white/10 active:scale-90 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              title="Phóng to đầu sách"
              aria-label="Phóng to sách"
            >
              <ZoomIn size={12} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </div>

      {/* BANNER THÔNG BÁO CHẾ ĐỘ SẮP XẾP / DI CHUYỂN */}
      {isReorderMode && (
        <div className="relative z-20 mb-3 px-3 py-2 rounded-xl bg-amber-500/20 dark:bg-amber-950/60 border border-amber-500/40 flex items-center justify-between gap-2 text-[#4a250e] dark:text-amber-200 animate-in fade-in select-none">
          <div className="flex items-center gap-1.5 text-[11px] font-bold min-w-0">
            <span className="text-sm">🔀</span>
            <span className="truncate">Giữ & kéo sách để đẩy vị trí · Chạm ra ngoài để lưu</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsReorderMode(false);
              showToast('✓ Đã lưu vị trí kệ sách');
            }}
            className="h-6 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] shrink-0 active:scale-95 cursor-pointer shadow-xs flex items-center gap-1"
          >
            <Check size={11} strokeWidth={3} />
            <span>Xong</span>
          </button>
        </div>
      )}

      {/* CÁC TẦNG KỆ SÁCH (SÁCH ĐỨNG TRỰC TIẾP TRÊN MẶT GỖ - ZERO FLOATING) */}
      <div className="relative z-10 flex flex-col gap-7 sm:gap-9">
        {tiers.map((tierBooks, tierIdx) => {
          const cardMaxWidthClass =
            bookCols === 2
              ? 'max-w-[170px] sm:max-w-[210px]'
              : bookCols === 3
              ? 'max-w-[122px] sm:max-w-[150px]'
              : bookCols === 4
              ? 'max-w-[86px] sm:max-w-[110px]'
              : 'max-w-[66px] sm:max-w-[88px]';

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
                  const originalIndex = internalBooks.findIndex((b) => b.id === book.id);
                  const isHidden = book.is_visible === false;
                  if (isHidden && !isAdmin) return null;
                  const prog = bookProgressMap[book.title];
                  const isThisBookBeingDragged = isDragging && draggedBookId === book.id;

                  return (
                    <div
                      key={book.id || originalIndex}
                      data-book-item-id={book.id}
                      className={`${
                        isPartialTier ? cardMaxWidthClass + ' w-full' : 'flex-1 ' + cardMaxWidthClass
                      } flex flex-col items-center group relative select-none ${
                        isHidden ? 'opacity-65' : ''
                      } ${
                        isReorderMode && !isThisBookBeingDragged
                          ? originalIndex % 2 === 0
                            ? 'animate-ios-jiggle'
                            : 'animate-ios-jiggle-alt'
                          : ''
                      }`}
                      style={{
                        touchAction: isReorderMode ? 'none' : 'auto',
                        WebkitTouchCallout: 'none',
                        WebkitUserSelect: 'none',
                        userSelect: 'none',
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                      }}
                      onDragStart={(e) => {
                        e.preventDefault();
                      }}
                      onPointerDown={(e) => {
                        // Bỏ qua nếu bấm vào nút con (xóa, xem tóm tắt, điều hướng)
                        if ((e.target as HTMLElement).closest('button, a')) return;
                        touchStartPosRef.current = { x: e.clientX, y: e.clientY };
                        isLongPressTriggeredRef.current = false;

                        const targetElement = e.currentTarget;
                        const cardCover = (targetElement.querySelector('.book-cover-container') as HTMLElement) || targetElement;
                        const rect = cardCover.getBoundingClientRect();

                        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                        longPressTimerRef.current = setTimeout(() => {
                          isLongPressTriggeredRef.current = true;
                          if (typeof navigator !== 'undefined' && navigator.vibrate) {
                            try { navigator.vibrate([40, 25, 40]); } catch {}
                          }
                          if (sortBy !== 'default') setSortBy('default');
                          setIsReorderMode(true);
                          setIsDragging(true);
                          setDraggedBookId(book.id);
                          setDragGhostData({
                            book,
                            width: rect.width,
                            height: rect.height,
                          });
                          setPointerOffset({
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                          });
                          setPointerPos({ x: e.clientX, y: e.clientY });
                          showToast(`🔀 Đã nhấc "${book.title}": Di chuyển đè lên sách khác để đổi vị trí`);
                        }, 340);
                      }}
                      onClick={() => {
                        if (isLongPressTriggeredRef.current || isDragging) {
                          isLongPressTriggeredRef.current = false;
                          return;
                        }
                        if (isReorderMode) {
                          return;
                        }
                        onReadBook3D(book);
                      }}
                      title={isReorderMode ? `Giữ và kéo để đổi vị trí "${book.title}"` : book.title}
                    >
                      {/* NẾU ĐANG LÀ SÁCH ĐƯỢC NHẤC LÊN: HIỂN THỊ Ô TRỐNG PLACEHOLDER CHUẨN BỊ THẢ VÀO */}
                      {isThisBookBeingDragged ? (
                        <div className="w-full relative aspect-[1/1.42] rounded-l-xs rounded-r-md border-2 border-dashed border-amber-400/90 bg-amber-500/20 backdrop-blur-xs flex flex-col items-center justify-center p-2 text-center animate-pulse shadow-inner pointer-events-none select-none">
                          <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center shadow-md mb-1 text-xs">
                            📥
                          </div>
                          <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider">
                            Vị trí mới
                          </span>
                          <span className="text-[8.5px] text-amber-200/90 font-bold truncate max-w-full px-1 mt-0.5">
                            {book.title}
                          </span>
                        </div>
                      ) : (
                        <>
                          {/* NÚT GỠ BỎ SÁCH NHANH TRÊN GÓC (CHẾ ĐỘ SẮP XẾP CHUẨN IOS) */}
                          {isReorderMode && onDeleteBook && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteBook(originalIndex);
                              }}
                              className="absolute -top-1.5 -right-1.5 z-40 w-5.5 h-5.5 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg border border-white/80 active:scale-90 cursor-pointer transition-transform"
                              title="Gỡ cuốn sách này khỏi kệ"
                            >
                              <X size={11} strokeWidth={3} />
                            </button>
                          )}

                          {/* HUY HIỆU ĐÃ ĐỌC XONG - CHỈ DẤU TÍCH V VÀNG TINH TẾ */}
                          {!isReorderMode && showProgress && prog && prog.percent === 100 && (
                            <div
                              className="absolute top-1.5 right-1.5 z-20 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md border border-amber-200 pointer-events-none"
                              title="Đã đọc xong"
                            >
                              <Check size={11} strokeWidth={3} />
                            </div>
                          )}

                          {/* KHỐI BÌA SÁCH 3D NỔI NÉT ĐỨNG TRỰC TIẾP TRÊN KỆ GỖ */}
                          <div 
                            className="book-cover-container w-full relative aspect-[1/1.42] rounded-l-xs rounded-r-md overflow-hidden border-l-2 border-white/20 shadow-[-4px_2px_8px_rgba(0,0,0,0.5),4px_4px_12px_rgba(0,0,0,0.7),0_8px_14px_rgba(0,0,0,0.85)] group-hover:-translate-y-2 group-hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 select-none"
                            onContextMenu={(e) => {
                              e.preventDefault();
                            }}
                            onDragStart={(e) => {
                              e.preventDefault();
                            }}
                            style={{
                              WebkitTouchCallout: 'none',
                              WebkitUserSelect: 'none',
                              userSelect: 'none',
                            }}
                          >
                            {/* NÚT XEM NHANH TÓM TẮT SÁCH (QUICK PEEK MODAL) - ẨN KHI Ở CHẾ ĐỘ SẮP XẾP */}
                            {!isReorderMode && (
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
                            )}

                            {/* BADGE ĐỊNH DẠNG SÁCH (PDF, EPUB, CBZ, 3D, TXT) - CHỮ MỜ ẨN NHỎ KO NỔI */}
                            {!isReorderMode && (() => {
                              const fmt = getBookFormatBadge(book);
                              return (
                                <span
                                  className={`absolute bottom-2 right-1.5 z-20 px-1 py-0.2 rounded text-[7px] font-mono font-medium tracking-tight pointer-events-none backdrop-blur-2xs ${fmt.color}`}
                                >
                                  {fmt.label}
                                </span>
                              );
                            })()}

                            {/* VẠCH TIẾN ĐỘ ĐỌC Ở CHÂN BÌA */}
                            {!isReorderMode && showProgress && prog && prog.percent > 0 && (
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

                            {/* Ảnh bìa sách nghệ thuật chuẩn xuất bản */}
                            <BookCoverArt
                              coverUrl={book.cover_url}
                              title={book.title}
                              author={book.author}
                              format="epub"
                              className="w-full h-full"
                            />

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

                            {/* HUY HIỆU VỊ TRÍ VÀ ĐIỀU HƯỚNG NHẸ KHI BẬT CHẾ ĐỘ SẮP XẾP */}
                            {isReorderMode && (
                              <div
                                className="absolute inset-x-0 bottom-0 z-30 p-1 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-between select-none"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  disabled={originalIndex <= 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onMoveBook?.(originalIndex, 'up');
                                  }}
                                  className="w-5.5 h-5.5 rounded-md bg-amber-500/90 hover:bg-amber-400 active:scale-90 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-md disabled:opacity-20 disabled:pointer-events-none cursor-pointer transition-all border border-amber-300"
                                  title="Di chuyển sang trái"
                                >
                                  ◀
                                </button>
                                <span className="text-[9px] font-black uppercase text-amber-300 bg-amber-950/80 px-1 py-0.5 rounded border border-amber-500/40 shadow-xs">
                                  #{originalIndex + 1}
                                </span>
                                <button
                                  type="button"
                                  disabled={originalIndex >= internalBooks.length - 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onMoveBook?.(originalIndex, 'down');
                                  }}
                                  className="w-5.5 h-5.5 rounded-md bg-amber-500/90 hover:bg-amber-400 active:scale-90 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-md disabled:opacity-20 disabled:pointer-events-none cursor-pointer transition-all border border-amber-300"
                                  title="Di chuyển sang phải"
                                >
                                  ▶
                                </button>
                              </div>
                            )}

                            {/* Nút hành động nổi lên khi hover chuột trên Desktop (ẨN KHI Ở REORDER MODE) */}
                            {!isReorderMode && (
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
                                          disabled={originalIndex === internalBooks.length - 1}
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
                            )}
                          </div>
                        </>
                      )}

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
                    background: getPlankTopBg(),
                  }}
                />
                {/* Gờ mép trước thanh gỗ dày nổi 3D cao cấp - nơi chứa nhãn tiêu đề sách */}
                <div
                  className={`rounded-b-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_22px_rgba(0,0,0,0.95)] flex items-center justify-center transition-all ${
                    showBookTitles ? 'min-h-[20px] py-0.5' : 'h-[14px]'
                  }`}
                  style={{
                    background: getPlankFaceBg(),
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
                          } text-center px-0.5 overflow-hidden`}
                        >
                          <p className={`text-[9px] sm:text-[10px] font-bold truncate leading-none tracking-tight ${getPlankTitleColor()}`}>
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
                <span className={`text-[10.5px] font-serif italic tracking-widest ${
                  bookshelfThemeStyle === 'minimal_white'
                    ? 'text-slate-400 dark:text-slate-500'
                    : 'text-amber-700 dark:text-amber-400/40'
                }`}>
                  ✦ TỦ SÁCH Y KHOA QBIZ ✦
                </span>
              </div>
              {/* Mặt gỗ kệ sách 3D */}
              <div className="relative -mt-[1px] -mx-1 sm:-mx-2 z-5 pointer-events-none">
                <div
                  className="h-[8px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.32)]"
                  style={{
                    background: getPlankTopBg(),
                  }}
                />
                <div
                  className="h-[14px] rounded-b-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_22px_rgba(0,0,0,0.95)]"
                  style={{
                    background: getPlankFaceBg(),
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
              {/* 0. KIỂU KỆ SÁCH (1 dòng tinh gọn 4 tùy chọn) */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/80 dark:bg-black/35 border border-[#e8dccb] dark:border-white/5 whitespace-nowrap">
                <span className="text-[#4a250e] dark:text-amber-100/90 font-medium">Kiểu kệ:</span>
                <div className="flex items-center gap-1 bg-[#efe5d6] dark:bg-black/40 p-0.5 rounded-lg border border-[#e2d5c3] dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => handleChangeBookshelfTheme('classic_wood')}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      bookshelfThemeStyle === 'classic_wood'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-amber-900 dark:text-slate-400 hover:text-[#2c180c] dark:hover:text-white'
                    }`}
                    title="Gỗ cổ điển nâu ấm"
                  >
                    Cổ điển
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeBookshelfTheme('dark_walnut')}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      bookshelfThemeStyle === 'dark_walnut'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-amber-900 dark:text-slate-400 hover:text-[#2c180c] dark:hover:text-white'
                    }`}
                    title="Gỗ nâu đậm trầm"
                  >
                    Nâu đậm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeBookshelfTheme('minimal_white')}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      bookshelfThemeStyle === 'minimal_white'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-amber-900 dark:text-slate-400 hover:text-[#2c180c] dark:hover:text-white'
                    }`}
                    title="Kệ trắng sứ tối giản"
                  >
                    Trắng sứ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeBookshelfTheme('luxury_modern')}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      bookshelfThemeStyle === 'luxury_modern'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-amber-900 dark:text-slate-400 hover:text-[#2c180c] dark:hover:text-white'
                    }`}
                    title="Kệ mun đen hiện đại"
                  >
                    Mun đen
                  </button>
                </div>
              </div>

              {/* 0.1 CỠ SÁCH TRÊN KỆ (1 dòng tinh gọn 4 nấc) */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/80 dark:bg-black/35 border border-[#e8dccb] dark:border-white/5 whitespace-nowrap">
                <span className="text-[#4a250e] dark:text-amber-100/90 font-medium">Cỡ sách:</span>
                <div className="flex items-center gap-1 bg-[#efe5d6] dark:bg-black/40 p-0.5 rounded-lg border border-[#e2d5c3] dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setColsExplicit(2)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      bookCols === 2
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-amber-900 dark:text-slate-400 hover:text-[#2c180c] dark:hover:text-white'
                    }`}
                    title="2 cuốn / tầng (Lớn)"
                  >
                    Lớn (2)
                  </button>
                  <button
                    type="button"
                    onClick={() => setColsExplicit(3)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      bookCols === 3
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-amber-900 dark:text-slate-400 hover:text-[#2c180c] dark:hover:text-white'
                    }`}
                    title="3 cuốn / tầng (Chuẩn)"
                  >
                    Chuẩn (3)
                  </button>
                  <button
                    type="button"
                    onClick={() => setColsExplicit(4)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      bookCols === 4
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-amber-900 dark:text-slate-400 hover:text-[#2c180c] dark:hover:text-white'
                    }`}
                    title="4 cuốn / tầng (Gọn)"
                  >
                    Gọn (4)
                  </button>
                  <button
                    type="button"
                    onClick={() => setColsExplicit(5)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      bookCols === 5
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-amber-900 dark:text-slate-400 hover:text-[#2c180c] dark:hover:text-white'
                    }`}
                    title="5 cuốn / tầng (Mini)"
                  >
                    Mini (5)
                  </button>
                </div>
              </div>
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

              {/* 8b. TOÀN MÀN HÌNH KỆ SÁCH (1 dòng) */}
              <button
                type="button"
                onClick={() => {
                  setShowSettingsMenu(false);
                  toggleBookshelfFullscreen();
                }}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-amber-900/10 dark:hover:bg-white/10 transition-colors text-[#3d2010] dark:text-amber-100 cursor-pointer whitespace-nowrap"
              >
                <div className="flex items-center gap-2">
                  {isBookshelfFullscreen ? (
                    <Minimize size={16} className="text-amber-700 dark:text-amber-400" />
                  ) : (
                    <Maximize size={16} className="text-amber-700 dark:text-amber-400" />
                  )}
                  <span>{isBookshelfFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình kệ sách'}</span>
                </div>
                <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">
                  {isBookshelfFullscreen ? 'Thu nhỏ' : 'Phóng to'}
                </span>
              </button>
 
              {/* 9. BỘ NHỚ & ĐỒNG BỘ GOOGLE DRIVE (CHỈ BỔ SUNG XUỐNG DƯỚI - APPEND ONLY) */}
              <button
                type="button"
                onClick={() => {
                  setShowSettingsMenu(false);
                  setShowSyncModal(true);
                }}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-amber-900/10 dark:hover:bg-white/10 transition-colors text-[#3d2010] dark:text-amber-100 cursor-pointer whitespace-nowrap"
              >
                <div className="flex items-center gap-2">
                  <HardDrive size={16} className="text-amber-700 dark:text-amber-400" />
                  <span>Bộ nhớ & Đồng bộ Google Drive</span>
                </div>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold">Drive</span>
              </button>

              {/* 10. KHỐI QUẢN TRỊ VIÊN (1 dòng) */}
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

              {/* ĐƯA SÁCH TỪ MÁY VÀO KỆ (DÀNH CHO TẤT CẢ NGƯỜI DÙNG) */}
              <button
                type="button"
                onClick={() => {
                  setShowSettingsMenu(false);
                  setShowImportBookModal(true);
                }}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-amber-900/10 dark:hover:bg-white/10 transition-colors text-[#3d2010] dark:text-amber-200 cursor-pointer whitespace-nowrap"
              >
                <div className="flex items-center gap-2">
                  <Upload size={16} className="text-amber-700 dark:text-amber-400" />
                  <span>Đưa sách từ máy vào kệ</span>
                </div>
                <span className="text-[11px] text-amber-700 dark:text-amber-300 font-bold">+Sách</span>
              </button>

              {/* NÚT THOÁT PHẦN MỀM CÓ CẢNH BÁO (TRONG MENU CÀI ĐẶT) */}
              <div className="h-px bg-[#e8dccb] dark:bg-white/10 my-0.5" />
              <button
                type="button"
                onClick={() => {
                  setShowSettingsMenu(false);
                  setShowExitConfirm(true);
                }}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-red-500/10 dark:hover:bg-red-950/30 transition-colors text-red-600 dark:text-red-400 cursor-pointer whitespace-nowrap active:scale-98"
              >
                <div className="flex items-center gap-2">
                  <LogOut size={16} className="text-red-500 dark:text-red-400" />
                  <span className="font-semibold text-xs text-red-700 dark:text-red-300">Thoát ứng dụng</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 font-bold">
                  Thoát
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN THOÁT ỨNG DỤNG (SIÊU TỐI GIẢN & CHUYÊN NGHIỆP) */}
      {showExitConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[150] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
          onClick={() => {
            isExitingRef.current = false;
            setShowExitConfirm(false);
          }}
        >
          <div
            className="w-full max-w-[280px] rounded-2xl bg-[#1c120a] border border-amber-500/25 p-4.5 text-amber-100 text-center shadow-2xl flex flex-col gap-3 relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nút đóng góc trên */}
            <button
              type="button"
              onClick={() => {
                isExitingRef.current = false;
                setShowExitConfirm(false);
              }}
              className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-amber-200/40 hover:text-amber-200 hover:bg-white/5 transition-colors cursor-pointer"
              title="Đóng"
              aria-label="Đóng"
            >
              <X size={14} />
            </button>

            {/* Icon Tối giản */}
            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mt-0.5">
              <LogOut size={17} strokeWidth={2.4} />
            </div>

            {/* Nội dung thông báo siêu gọn */}
            <div className="flex flex-col gap-1 px-1">
              <h3 className="text-[14px] font-bold text-amber-100 tracking-tight">
                Thoát ứng dụng?
              </h3>
              <p className="text-[11.5px] text-amber-200/70 font-medium leading-relaxed">
                Tiến độ đọc và dữ liệu của bạn đã được bảo lưu tự động.
              </p>
            </div>

            {/* 2 nút hành động tối giản ngang hàng */}
            <div className="flex items-center gap-2 pt-1 w-full">
              <button
                type="button"
                onClick={() => {
                  isExitingRef.current = false;
                  setShowExitConfirm(false);
                }}
                className="flex-1 h-8.5 rounded-xl bg-white/5 hover:bg-white/10 text-amber-200/90 font-medium text-xs transition-colors cursor-pointer active:scale-95"
              >
                Ở lại
              </button>

              <button
                type="button"
                onClick={handleExitApp}
                className="flex-1 h-8.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-transform active:scale-95 cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <LogOut size={13} strokeWidth={2.4} />
                <span>Thoát</span>
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
                <BookCoverArt
                  coverUrl={quickPeekBook.cover_url}
                  title={quickPeekBook.title}
                  author={quickPeekBook.author}
                  className="w-full h-full"
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
                  setEditingCustomBook(b);
                }}
                className="px-3 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-900 dark:text-amber-300 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer shrink-0"
                title="Sửa tiêu đề, tác giả & ảnh bìa sách"
              >
                <Edit2 size={13} strokeWidth={2.4} />
                <span>Sửa tiêu đề</span>
              </button>
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
                className="px-3 py-2.5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-[#4a2810] dark:text-slate-200 font-bold text-xs active:scale-95 transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BỘ NHỚ & ĐỒNG BỘ GOOGLE DRIVE */}
      <SyncBackupModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
      />

      {/* MODAL NHẬP SÁCH TỪ THIẾT BỊ CỦA BẠN (.EPUB, .PDF, .CBZ) */}
      <ImportBookModal
        isOpen={showImportBookModal}
        onClose={() => setShowImportBookModal(false)}
        onImportSuccess={(newBook) => {
          setZoomToast(`✓ Đã đưa cuốn sách "${newBook.title}" vào kệ!`);
          setTimeout(() => setZoomToast(null), 3000);
        }}
      />

      {/* MODAL SỬA TIÊU ĐỀ & BÌA SÁCH */}
      <QuickEditBookModal
        isOpen={Boolean(editingCustomBook)}
        book={editingCustomBook}
        onClose={() => setEditingCustomBook(null)}
        onSaved={(updatedBook) => {
          setZoomToast(`✓ Đã lưu thay đổi: "${updatedBook.title}"`);
          setTimeout(() => setZoomToast(null), 3000);
        }}
        onDeleted={(id) => {
          setZoomToast('✓ Đã xóa sách khỏi bộ nhớ máy.');
          setTimeout(() => setZoomToast(null), 3000);
        }}
      />

      {/* MÀN HÌNH ĐÃ THOÁT ỨNG DỤNG AN TOÀN (SAFE EXIT SCREEN) */}
      {hasExitedApp && (
        <div className="fixed inset-0 z-[200] bg-[#0c0805] text-[#f7eee1] flex flex-col items-center justify-center p-5 text-center select-none animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4 shadow-xl shadow-amber-900/20">
            <ShieldCheck size={36} strokeWidth={2.2} className="text-amber-400" />
          </div>
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-amber-200 mb-2">
            ĐÃ THOÁT ỨNG DỤNG AN TOÀN
          </h2>
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 max-w-xs mb-6 text-xs text-amber-100/80 leading-relaxed space-y-1.5">
            <p className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 size={14} />
              <span>Tiến độ đọc đã được bảo lưu trọn vẹn</span>
            </p>
            <p className="text-[11.5px] opacity-75">
              Bạn có thể an tâm đóng tab trình duyệt này hoặc vuốt tắt ứng dụng để rời đi.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 w-full max-w-xs">
            <button
              type="button"
              onClick={() => setHasExitedApp(false)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <BookOpen size={15} strokeWidth={2.5} />
              <span>Mở lại ứng dụng đọc sách</span>
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  window.close();
                } catch {}
              }}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Đóng cửa sổ này
            </button>
          </div>
        </div>
      )}

      {/* FLOATING GHOST CARD BAY THEO NGÓN TAY KHI ĐANG KÉO (CHUẨN IOS/ANDROID DRAG & DROP) */}
      {isDragging && dragGhostData && (
        <div
          className="fixed z-[999999] pointer-events-none select-none transition-transform duration-75"
          style={{
            left: `${pointerPos.x - pointerOffset.x}px`,
            top: `${pointerPos.y - pointerOffset.y}px`,
            width: `${dragGhostData.width}px`,
            height: `${dragGhostData.height}px`,
            transform: 'scale(1.08) rotate(3deg)',
            filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.85)) drop-shadow(0 0 15px rgba(245,158,11,0.6))',
          }}
        >
          <div className="w-full h-full relative aspect-[1/1.42] rounded-l-xs rounded-r-md overflow-hidden border-2 border-amber-400 ring-4 ring-amber-400/40 shadow-2xl">
            <BookCoverArt
              coverUrl={dragGhostData.book.cover_url}
              title={dragGhostData.book.title}
              author={dragGhostData.book.author}
              format="epub"
              className="w-full h-full"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/20 pointer-events-none" />
            <div className="absolute bottom-1 inset-x-1 px-1 py-0.5 rounded bg-black/85 text-amber-300 text-[9px] font-black text-center truncate border border-amber-400/40">
              {dragGhostData.book.title}
            </div>
          </div>
        </div>
      )}

      {/* MODAL KHO SÁCH NÓI & AUDIOBOOK (1 DÒNG TINH GỌN, CHỌN VÀ NGHE NGAY) */}
      {showAudioModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
          onClick={() => setShowAudioModal(false)}
        >
          <div
            className="w-full max-w-sm max-h-[85vh] overflow-hidden rounded-2xl bg-[#FAF6EF] dark:bg-[#1f130b] border border-[#d8c5aa] dark:border-[#553622] text-[#2c180c] dark:text-[#fdf7ee] p-3.5 sm:p-4 shadow-2xl flex flex-col gap-2.5 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal 1 dòng */}
            <div className="flex items-center justify-between pb-2 border-b border-[#e2d5c3] dark:border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <Headphones size={18} className="text-purple-600 dark:text-purple-400" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#2c180c] dark:text-amber-200">
                  Tủ Sách Nói & Audio
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowAudioSearch((prev) => !prev)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                    showAudioSearch
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                  title="Tìm kiếm sách nói"
                  aria-label="Tìm kiếm sách nói"
                >
                  <Search size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAudioModal(false);
                    setShowAudioSearch(false);
                    setAudioSearchQuery('');
                  }}
                  className="w-7 h-7 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
                  title="Đóng"
                  aria-label="Đóng"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Thanh tìm kiếm nhanh sách nói (khi ấn icon kính lúp) */}
            {showAudioSearch && (
              <div className="relative shrink-0 animate-in fade-in slide-in-from-top-1 duration-150">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={audioSearchQuery}
                  onChange={(e) => setAudioSearchQuery(e.target.value)}
                  placeholder="Tìm tên sách nói, tác giả..."
                  autoFocus
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white dark:bg-black/40 border border-purple-500/40 text-xs text-[#2c180c] dark:text-amber-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                />
                {audioSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setAudioSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            {/* Banner nghe tiếp nếu có audioResume */}
            {audioResume && (
              <div
                onClick={() => {
                  setShowAudioModal(false);
                  if (onOpenAudioResume) {
                    onOpenAudioResume();
                  } else {
                    setActiveAudioItem({
                      id: audioResume.id,
                      title: audioResume.title,
                      author: audioResume.author || 'Tủ Sách Y Khoa',
                      coverUrl: audioResume.coverUrl,
                      audioUrl: audioResume.audioUrl,
                      durationFormatted: audioResume.durationFormatted,
                    });
                    setShowAudioPlayer(true);
                  }
                }}
                className="p-2.5 rounded-xl bg-gradient-to-r from-purple-500/15 to-amber-500/15 border border-purple-500/30 hover:border-purple-500/50 cursor-pointer flex items-center gap-2.5 transition-all shadow-2xs active:scale-98 shrink-0"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Play size={13} className="fill-current ml-0.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 text-[10px] text-purple-700 dark:text-purple-300 font-bold">
                    <span>ĐANG NGHE DỞ</span>
                    <span>{audioResume.percent}%</span>
                  </div>
                  <p className="text-[11.5px] font-bold text-[#2A160A] dark:text-amber-100 truncate">
                    {audioResume.title}
                  </p>
                </div>
                <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 shrink-0">
                  Nghe tiếp →
                </span>
              </div>
            )}

            {/* Danh sách các đầu sách nói chất lượng cao */}
            <div className="flex-1 overflow-y-auto max-h-[50vh] flex flex-col gap-2 pr-0.5">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-amber-800/80 dark:text-amber-300/70 px-1 pt-1">
                Danh mục sách nói tuyển chọn ({curatedAudiobooksList.length})
              </div>
              {curatedAudiobooksList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setShowAudioModal(false);
                    setActiveAudioItem({
                      id: item.id,
                      title: item.title,
                      author: item.author,
                      coverUrl: item.coverUrl,
                      audioUrl: item.downloadUrl,
                      audioNarrator: item.audioNarrator,
                      durationFormatted: item.durationFormatted,
                    });
                    setShowAudioPlayer(true);
                  }}
                  className="p-2 rounded-xl bg-white dark:bg-black/35 border border-[#e8dccb] dark:border-white/5 hover:border-purple-500/50 flex items-center gap-2.5 cursor-pointer transition-all hover:bg-white/90 dark:hover:bg-white/5 active:scale-98"
                >
                  <div className="w-10 aspect-[1/1.42] rounded overflow-hidden shrink-0 shadow-2xs border border-white/10">
                    <BookCoverArt
                      coverUrl={item.coverUrl}
                      title={item.title}
                      author={item.author}
                      format="audio"
                      medium="audio"
                      className="w-full h-full"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <h4 className="text-[11.5px] font-bold text-[#2A160A] dark:text-amber-100 line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-[10px] text-stone-500 dark:text-amber-300/70 truncate">
                      {item.author}
                    </p>
                    <div className="flex items-center gap-2 text-[9.5px] text-purple-700 dark:text-purple-300 font-semibold">
                      <span>🎧 {item.durationFormatted || 'Bản đầy đủ'}</span>
                      {item.fileSizeFormatted && <span>• {item.fileSizeFormatted}</span>}
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <Play size={11} className="fill-current ml-0.5" />
                  </div>
                </div>
              ))}
              {curatedAudiobooksList.length === 0 && (
                <div className="py-8 text-center text-xs text-stone-500 dark:text-stone-400 flex flex-col items-center gap-2">
                  <p>Không tìm thấy sách nói nào khớp với &quot;{audioSearchQuery}&quot;.</p>
                  <Link
                    href={`/tim-kiem?q=${encodeURIComponent(audioSearchQuery)}&filter=audio`}
                    onClick={() => setShowAudioModal(false)}
                    className="text-purple-600 dark:text-purple-400 font-bold hover:underline"
                  >
                    Tìm thêm trên toàn thư viện trực tuyến →
                  </Link>
                </div>
              )}
            </div>

            {/* Chân modal: Nút tra cứu thêm sách nói */}
            <div className="pt-2 border-t border-[#e2d5c3] dark:border-white/10 flex items-center justify-between shrink-0">
              <Link
                href="/tim-kiem?filter=audio"
                onClick={() => setShowAudioModal(false)}
                className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1"
              >
                <span>Tìm thêm sách nói trực tuyến</span>
                <ChevronRight size={12} />
              </Link>
              <button
                type="button"
                onClick={() => setShowAudioModal(false)}
                className="px-2.5 py-1 rounded-lg bg-amber-900/10 dark:bg-white/10 text-[11px] font-bold text-[#4a250e] dark:text-amber-100 hover:bg-amber-900/20 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRÌNH PHÁT SÁCH NÓI MP3 CHUYÊN NGHIỆP */}
      {activeAudioItem && (
        <AudiobookPlayerModal
          isOpen={showAudioPlayer}
          onClose={() => {
            setShowAudioPlayer(false);
          }}
          book={activeAudioItem}
        />
      )}
    </div>
  );
}
