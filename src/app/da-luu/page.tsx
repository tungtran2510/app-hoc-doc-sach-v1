'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  PlayCircle,
  LayoutGrid,
  List,
  Rows,
  Trash2,
  ChevronRight,
  Sparkles,
  BookMarked,
  Check,
  HardDrive,
  CheckCircle2,
  Download,
  FileText,
  Layers,
  Flame,
  Clock,
  Share2,
  Headphones,
} from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import SideBooksReaderModal from '../../components/SideBooksReaderModal';
import FlashcardStudyModal from '../../components/FlashcardStudyModal';
import QuoteCardModal from '../../components/QuoteCardModal';
import AudiobookPlayerModal from '../../components/AudiobookPlayerModal';
import BookCoverArt from '../../components/BookCoverArt';
import { getBookReaderPageUrls } from '../../lib/bookReaderPages';
import { offlineStorage, CachedBookMetadata, formatBytes } from '../../lib/offlineStorage';
import { readingNotesStorage, ReadingNoteItem } from '../../lib/readingNotes';
import { readingStreakEngine, ReadingStats } from '../../lib/readingStreak';
import { CURATED_ONLINE_BOOKS } from '../../lib/onlineLibraryData';
import {
  getFavoriteBooks,
  toggleBookFavorite,
  FavoriteBookItem,
  getReadingHistory,
  ReadingHistoryItem,
} from '../../lib/userFavoritesHistory';
import {
  AudiobookHistoryItem,
  getAudiobookHistory,
  removeAudiobookFromHistory,
  clearAllAudiobookHistory,
  formatAudioSeconds,
} from '../../lib/audiobookHistory';

interface SavedItem {
  id: string;
  title: string;
  category: string;
  badgeType: 'book';
  badgeNumber?: string;
  coverUrl: string;
  subtitle: string;
  pages?: string[];
  initialPage: number;
  fileUrl?: string | null;
  pdfUrl?: string | null;
  fileName?: string | null;
  format?: 'pdf' | 'epub' | 'cbz' | 'txt' | 'flipbook';
}

const DEFAULT_CURATED_SAVED: SavedItem[] = [
  {
    id: 'curated-1',
    title: 'Atlas Giải Phẫu Cột Sống & Khớp 3D',
    category: 'PDF Y KHOA',
    badgeType: 'book',
    badgeNumber: 'PDF',
    coverUrl: '/documents/covers/cover_atlas_y_khoa_toan_dien.png',
    subtitle: 'Định dạng PDF vector độ nét cao 33 đốt sống & khớp',
    initialPage: 0,
    fileUrl: '/documents/atlas_giai_phau_cot_song_toan_dien.pdf',
    pdfUrl: '/documents/atlas_giai_phau_cot_song_toan_dien.pdf',
    fileName: 'atlas_giai_phau_cot_song_toan_dien.pdf',
    format: 'pdf',
  },
  {
    id: 'curated-2',
    title: 'Cẩm Nang Đốt Sống Cổ & Vai Gáy',
    category: 'EPUB EBOOK',
    badgeType: 'book',
    badgeNumber: 'EPUB',
    coverUrl: '/documents/covers/cover_cam_nang_dot_song_co.png',
    subtitle: 'Định dạng EPUB chuẩn thế giới · Đọc Audio AI & Bionic Reading',
    initialPage: 0,
    fileUrl: '/documents/cam_nang_dot_song_co_vai_gay.epub',
    fileName: 'cam_nang_dot_song_co_vai_gay.epub',
    format: 'epub',
  },
  {
    id: 'curated-3',
    title: 'Hiểu Đúng Về Cột Sống',
    category: '3D FLIPBOOK',
    badgeType: 'book',
    badgeNumber: '3D',
    coverUrl: '/documents/covers/cover_hieu_dung_ve_cot_song.png',
    subtitle: 'Đĩa đệm và cơ chế giảm xóc sinh học lật trang 3D',
    initialPage: 0,
    format: 'flipbook',
  },
  {
    id: 'curated-4',
    title: 'Atlas Hình Ảnh Cơ Thể 3D',
    category: 'CBZ ATLAS',
    badgeType: 'book',
    badgeNumber: 'CBZ',
    coverUrl: '/documents/covers/cover_co-the-nguoi.png',
    subtitle: 'Định dạng CBZ Graphic Atlas đa tầng cơ quan sinh học',
    initialPage: 0,
    fileUrl: '/documents/atlas_giai_phau_hinh_anh_3d.cbz',
    fileName: 'atlas_giai_phau_hinh_anh_3d.cbz',
    format: 'cbz',
  },
  {
    id: 'curated-5',
    title: 'Dinh Dưỡng Phục Hồi Khớp & Đĩa Đệm',
    category: 'EPUB EBOOK',
    badgeType: 'book',
    badgeNumber: 'EPUB',
    coverUrl: '/documents/covers/cover_dinh_duong_khang_viem.png',
    subtitle: 'Định dạng EPUB sinh hóa sụn khớp và thực đơn kháng viêm',
    initialPage: 0,
    fileUrl: '/documents/dinh_duong_phuc_hoi_khop_va_dia_dem.epub',
    fileName: 'dinh_duong_phuc_hoi_khop_va_dia_dem.epub',
    format: 'epub',
  },
  {
    id: 'curated-6',
    title: 'Bảng Tra Cứu Rễ Thần Kinh Cột Sống',
    category: 'PDF TRA CỨU',
    badgeType: 'book',
    badgeNumber: 'PDF',
    coverUrl: '/documents/bang_tra_cuu_re_than_kinh_cot_song.png',
    subtitle: 'Tài liệu tra cứu đối chiếu chi phối cảm giác rễ C1-C8 & L1-S5',
    initialPage: 0,
    fileUrl: '/documents/bang_tra_cuu_re_than_kinh_cot_song.pdf',
    pdfUrl: '/documents/bang_tra_cuu_re_than_kinh_cot_song.pdf',
    fileName: 'bang_tra_cuu_re_than_kinh_cot_song.pdf',
    format: 'pdf',
  },
  {
    id: 'curated-7',
    title: 'Tóm Tắt Giải Phẫu Cột Sống',
    category: 'VĂN BẢN TXT',
    badgeType: 'book',
    badgeNumber: 'TXT',
    coverUrl: '/documents/covers/clean_cover_slate.png',
    subtitle: 'Bản thảo văn bản thuần túy tóm tắt cấu trúc xương và đĩa đệm',
    initialPage: 0,
    fileUrl: '/documents/tom_tat_giai_phau_cot_song.txt',
    fileName: 'tom_tat_giai_phau_cot_song.txt',
    format: 'txt',
  },
];

const DEFAULT_SAMPLE_NOTES: ReadingNoteItem[] = [
  {
    id: 'sample-note-1',
    bookTitle: 'Hiểu Đúng Về Cột Sống',
    page: 2,
    selectedText: 'Đĩa đệm đóng vai trò như bộ phận giảm xóc sinh học với nhân nhầy ngậm nước và các vòng sợi collagen bao quanh.',
    userNote: 'Cần bổ sung đủ nước phân bổ đều trong ngày để nhân nhầy duy trì áp lực thẩm thấu tốt nhất.',
    color: 'amber',
    createdAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'sample-note-2',
    bookTitle: 'Cẩm Nang Đốt Sống Cổ & Vai Gáy',
    page: 3,
    selectedText: 'Khi cúi đầu 60 độ bấm điện thoại, áp lực đè nặng lên các đĩa đệm đốt sống cổ tăng vọt lên tới 27 kg!',
    userNote: 'Nhắc nhở đưa điện thoại ngang tầm mắt, áp dụng quy tắc 20-20-20 khi làm việc trước màn hình.',
    color: 'rose',
    createdAt: Date.now() - 3600000 * 5,
  },
  {
    id: 'sample-note-3',
    bookTitle: 'Dinh Dưỡng Phục Hồi Khớp & Đĩa Đệm',
    page: 2,
    selectedText: 'Curcumin từ nghệ vàng ức chế phân tử NF-kB, dập tắt ngọn lửa viêm âm ỉ trong sụn khớp.',
    userNote: 'Nên kết hợp curcumin với một chút hạt tiêu đen (piperine) để tăng sinh khả dụng.',
    color: 'emerald',
    createdAt: Date.now() - 3600000 * 24,
  },
];

function resolveBookMetadata(
  title: string,
  cachedOfflineList: CachedBookMetadata[] = []
): {
  title: string;
  category: string;
  coverUrl: string;
  fileUrl?: string | null;
  pdfUrl?: string | null;
  fileName?: string | null;
  format?: 'pdf' | 'epub' | 'cbz' | 'txt' | 'flipbook';
} | null {
  const norm = title.toLowerCase().trim();
  // 1. Curated list
  const curated = DEFAULT_CURATED_SAVED.find(
    (b) => b.title.toLowerCase().trim() === norm
  );
  if (curated) return curated;

  // 2. Offline list
  const offline = cachedOfflineList.find(
    (b) => b.title.toLowerCase().trim() === norm
  );
  if (offline) {
    return {
      title: offline.title,
      category: offline.format ? offline.format.toUpperCase() : 'NGOẠI TUYẾN',
      coverUrl: offline.coverUrl || '/documents/covers/cover_atlas_y_khoa_toan_dien.png',
      fileUrl: offline.fileUrl,
      pdfUrl: offline.format === 'pdf' ? offline.fileUrl : null,
      fileName: offline.fileName,
      format: (offline.format as any) || 'epub',
    };
  }

  // 3. Online Curated list
  const online = CURATED_ONLINE_BOOKS.find(
    (b) => b.title.toLowerCase().trim() === norm
  );
  if (online) {
    return {
      title: online.title,
      category: online.format ? online.format.toUpperCase() : 'TRỰC TUYẾN',
      coverUrl: online.coverUrl || '/documents/covers/cover_atlas_y_khoa_toan_dien.png',
      fileUrl: online.downloadUrl,
      pdfUrl: online.format === 'pdf' ? online.downloadUrl : null,
      fileName: online.downloadUrl.split('/').pop() || null,
      format: (online.format as any) || 'epub',
    };
  }

  // 4. Favorites
  const favs = getFavoriteBooks();
  const fav = favs.find((b) => b.title.toLowerCase().trim() === norm);
  if (fav) {
    return {
      title: fav.title,
      category: fav.category || (fav.format ? fav.format.toUpperCase() : 'YÊU THÍCH'),
      coverUrl: fav.coverUrl || '/documents/covers/cover_atlas_y_khoa_toan_dien.png',
      fileUrl: fav.fileUrl,
      pdfUrl: fav.format === 'pdf' ? fav.fileUrl : null,
      fileName: fav.fileName,
      format: (fav.format as any) || 'epub',
    };
  }

  return null;
}

export default function SavedBooksPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'books' | 'bookmarks' | 'notes' | 'offline' | 'audio'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'compact' | 'list'>('compact');
  const [userBookmarks, setUserBookmarks] = useState<SavedItem[]>([]);
  const [favoriteBooks, setFavoriteBooks] = useState<FavoriteBookItem[]>([]);
  const [audiobookHistory, setAudiobookHistory] = useState<AudiobookHistoryItem[]>([]);
  const [activeAudioBook, setActiveAudioBook] = useState<{
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
  const [removedCuratedIds, setRemovedCuratedIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('qbiz_removed_curated_books_v1');
        return saved ? JSON.parse(saved) : [];
      } catch {}
    }
    return [];
  });
  const [allNotes, setAllNotes] = useState<ReadingNoteItem[]>([]);
  const [readingStats, setReadingStats] = useState<ReadingStats>({
    streakDays: 3,
    pagesToday: 18,
    minutesToday: 25,
    totalBooksCompleted: 2,
    lastActiveDate: '',
  });
  const [showFlashcardModal, setShowFlashcardModal] = useState<boolean>(false);
  const [activeQuoteNote, setActiveQuoteNote] = useState<ReadingNoteItem | null>(null);

  // Đang học dở / Đang đọc dở state
  const [continueBook, setContinueBook] = useState<{
    title: string;
    subtitle: string;
    coverUrl: string;
    page: number;
    totalPages: number;
    percent: number;
    fileUrl?: string | null;
    pdfUrl?: string | null;
    fileName?: string | null;
  }>({
    title: 'Atlas Giải Phẫu Cột Sống & Khớp 3D',
    subtitle: 'Định dạng PDF · Trang 1/5',
    coverUrl: '/documents/covers/cover_atlas_y_khoa_toan_dien.png',
    page: 0,
    totalPages: 5,
    percent: 20,
    fileUrl: '/documents/atlas_giai_phau_cot_song_toan_dien.pdf',
    pdfUrl: '/documents/atlas_giai_phau_cot_song_toan_dien.pdf',
    fileName: 'atlas_giai_phau_cot_song_toan_dien.pdf',
  });

  const [activeReaderBook, setActiveReaderBook] = useState<{
    title: string;
    author?: string;
    coverUrl?: string | null;
    pages?: string[];
    initialPage: number;
    fileUrl?: string | null;
    pdfUrl?: string | null;
    fileName?: string | null;
  } | null>(null);

  // Danh sách sách lưu ngoại tuyến (IndexedDB)
  const [offlineBooks, setOfflineBooks] = useState<CachedBookMetadata[]>([]);
  const [offlineUsage, setOfflineUsage] = useState<{ count: number; totalBytes: number }>({ count: 0, totalBytes: 0 });

  const loadOfflineList = async () => {
    try {
      const list = await offlineStorage.getAllCachedBooks();
      setOfflineBooks(list);
      const usage = await offlineStorage.getStorageUsage();
      setOfflineUsage(usage);
      return list;
    } catch (err) {
      console.error('Lỗi tải danh sách ngoại tuyến:', err);
      return [];
    }
  };

  // Load last read, bookmarks & reading notes
  const loadData = (cachedList: CachedBookMetadata[] = offlineBooks) => {
    try {
      // 0. Load Favorite Books
      const favList = getFavoriteBooks();
      setFavoriteBooks(favList);

      // 1. Load Last Read Book
      const lastTitle = localStorage.getItem('last_read_book_title');
      if (lastTitle) {
        const lastPageStr = localStorage.getItem(`last_read_page_${lastTitle}`);
        const pIdx = lastPageStr ? parseInt(lastPageStr, 10) : 0;
        const matched = resolveBookMetadata(lastTitle, cachedList);
        const bookPages = getBookReaderPageUrls({
          id: lastTitle,
          title: lastTitle,
          description: '',
          cover_url: matched?.coverUrl || null,
        } as any);
        const tPages = Math.max(1, bookPages.length);
        const calcPercent = Math.max(10, Math.min(100, Math.round(((pIdx + 1) / tPages) * 100)));

        setContinueBook({
          title: lastTitle,
          subtitle: matched ? `${matched.category} · Trang ${pIdx + 1}/${tPages}` : `Tủ Sách Y Khoa · Trang ${pIdx + 1}/${tPages}`,
          coverUrl: matched?.coverUrl || bookPages[0] || '/documents/covers/cover_tieu-hoa.png',
          page: pIdx,
          totalPages: tPages,
          percent: calcPercent,
          fileUrl: matched?.fileUrl,
          pdfUrl: matched?.pdfUrl,
          fileName: matched?.fileName,
        });
      }

      // 2. Load Bookmarks
      const dynamicItems: SavedItem[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('bookmarks_list_')) {
          const title = key.replace('bookmarks_list_', '');
          const val = localStorage.getItem(key);
          if (val) {
            const pageIndices: number[] = JSON.parse(val);
            const matched = resolveBookMetadata(title, cachedList);
            const bookPages = getBookReaderPageUrls({
              id: title,
              title,
              description: '',
              cover_url: matched?.coverUrl || null,
            } as any);
            for (const pIdx of pageIndices) {
              dynamicItems.push({
                id: `dynamic-${title}-${pIdx}`,
                title: `${title} - Trang ${pIdx + 1}`,
                category: matched?.category || 'DẤU TRANG',
                badgeType: 'book',
                badgeNumber: `#${pIdx + 1}`,
                coverUrl: bookPages[pIdx] || matched?.coverUrl || bookPages[0] || '/documents/covers/cover_hieu_dung_ve_cot_song.png',
                subtitle: `Đã đánh dấu tại trang ${pIdx + 1}`,
                pages: bookPages,
                initialPage: pIdx,
                fileUrl: matched?.fileUrl,
                pdfUrl: matched?.pdfUrl,
                fileName: matched?.fileName,
              });
            }
          }
        }
        if (key && key.startsWith('bookmark_page_')) {
          const title = key.replace('bookmark_page_', '');
          const val = localStorage.getItem(key);
          if (val) {
            const pIdx = parseInt(val, 10);
            if (!isNaN(pIdx)) {
              const matched = resolveBookMetadata(title, cachedList);
              const exists = dynamicItems.some((d) => d.id === `dynamic-${title}-${pIdx}`);
              if (!exists) {
                const bookPages = getBookReaderPageUrls({
                  id: title,
                  title,
                  description: '',
                  cover_url: matched?.coverUrl || null,
                } as any);
                dynamicItems.push({
                  id: `dynamic-${title}-${pIdx}`,
                  title: `${title} - Trang ${pIdx + 1}`,
                  category: matched?.category || 'DẤU TRANG',
                  badgeType: 'book',
                  badgeNumber: `#${pIdx + 1}`,
                  coverUrl: bookPages[pIdx] || matched?.coverUrl || bookPages[0] || '/documents/covers/cover_hieu_dung_ve_cot_song.png',
                  subtitle: `Đã đánh dấu tại trang ${pIdx + 1}`,
                  pages: bookPages,
                  initialPage: pIdx,
                  fileUrl: matched?.fileUrl,
                  pdfUrl: matched?.pdfUrl,
                  fileName: matched?.fileName,
                });
              }
            }
          }
        }
      }
      const savedMode = localStorage.getItem('saved_books_view_mode');
      if (savedMode && ['grid', 'compact', 'list'].includes(savedMode)) {
        setViewMode(savedMode as any);
      }
      setUserBookmarks(dynamicItems);

      // 3. Load Reading Notes
      const notes = readingNotesStorage.getAllNotes();
      if (notes && notes.length > 0) {
        setAllNotes(notes);
      } else {
        setAllNotes(DEFAULT_SAMPLE_NOTES);
      }

      // 4. Load Reading Stats & Streak
      setReadingStats(readingStreakEngine.getStats());

      // 5. Load Audiobook History
      setAudiobookHistory(getAudiobookHistory());
    } catch {
      // fallback
    }
  };

  const handleViewModeChange = (mode: 'grid' | 'compact' | 'list') => {
    setViewMode(mode);
    try {
      localStorage.setItem('saved_books_view_mode', mode);
    } catch {}
  };

  useEffect(() => {
    document.title = 'Đã lưu · Qbiz Books';
    loadOfflineList().then((cached) => {
      loadData(cached);
    });

    const handleDownloadEvent = () => {
      loadOfflineList().then((cached) => {
        loadData(cached);
      });
    };
    const handleFavoritesOrHistoryUpdated = () => {
      loadData();
    };
    const handleAudiobookHistoryUpdated = () => {
      setAudiobookHistory(getAudiobookHistory());
    };

    window.addEventListener('qbiz_book_downloaded', handleDownloadEvent);
    window.addEventListener('qbiz_book_metadata_updated', handleDownloadEvent);
    window.addEventListener('qbiz_book_removed_offline', handleDownloadEvent);
    window.addEventListener('qbiz_favorite_updated', handleFavoritesOrHistoryUpdated);
    window.addEventListener('qbiz_history_updated', handleFavoritesOrHistoryUpdated);
    window.addEventListener('qbiz_audiobook_history_updated', handleAudiobookHistoryUpdated);
    window.addEventListener('qbiz_book_added_to_shelf', handleFavoritesOrHistoryUpdated);
    window.addEventListener('qbiz_book_removed_from_shelf', handleFavoritesOrHistoryUpdated);
    return () => {
      window.removeEventListener('qbiz_book_downloaded', handleDownloadEvent);
      window.removeEventListener('qbiz_book_metadata_updated', handleDownloadEvent);
      window.removeEventListener('qbiz_book_removed_offline', handleDownloadEvent);
      window.removeEventListener('qbiz_favorite_updated', handleFavoritesOrHistoryUpdated);
      window.removeEventListener('qbiz_history_updated', handleFavoritesOrHistoryUpdated);
      window.removeEventListener('qbiz_audiobook_history_updated', handleAudiobookHistoryUpdated);
      window.removeEventListener('qbiz_book_added_to_shelf', handleFavoritesOrHistoryUpdated);
      window.removeEventListener('qbiz_book_removed_from_shelf', handleFavoritesOrHistoryUpdated);
    };
  }, []);

  const handleOpenOfflineBook = (book: CachedBookMetadata) => {
    setActiveReaderBook({
      title: book.title,
      author: book.author || 'Tủ Sách Ngoại Tuyến',
      coverUrl: book.coverUrl,
      pages: [],
      initialPage: book.lastReadPage || 0,
      fileUrl: book.fileUrl,
      fileName: book.fileName || book.fileUrl?.split('/').pop() || null,
    });
  };

  const handleRemoveOfflineBook = async (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    if (confirm('Xóa tệp sách này khỏi bộ nhớ ngoại tuyến của máy để giải phóng dung lượng?')) {
      await offlineStorage.removeBookFromOffline(bookId);
      await loadOfflineList();
    }
  };

  const favoriteSavedItems: SavedItem[] = useMemo(() => {
    return favoriteBooks.map((f) => ({
      id: f.id,
      title: f.title,
      category: f.category || (f.format ? f.format.toUpperCase() : 'YÊU THÍCH'),
      badgeType: 'book' as const,
      badgeNumber: f.format ? f.format.toUpperCase() : 'FAV',
      coverUrl: f.coverUrl || '/documents/covers/cover_atlas_y_khoa_toan_dien.png',
      subtitle: f.author ? `Tác giả: ${f.author}` : 'Sách trong danh sách Yêu thích của bạn',
      initialPage: 0,
      fileUrl: f.fileUrl,
      pdfUrl: f.format === 'pdf' ? f.fileUrl : null,
      fileName: f.fileName,
      format: (f.format as any) || 'epub',
    }));
  }, [favoriteBooks]);

  const visibleCuratedBooks = useMemo(() => {
    return DEFAULT_CURATED_SAVED.filter((c) => !removedCuratedIds.includes(c.id));
  }, [removedCuratedIds]);

  const combinedBooks = useMemo(() => {
    const existingTitles = new Set(visibleCuratedBooks.map((c) => c.title.toLowerCase().trim()));
    const extraFavs = favoriteSavedItems.filter(
      (f) => !existingTitles.has(f.title.toLowerCase().trim())
    );
    return [...extraFavs, ...visibleCuratedBooks];
  }, [visibleCuratedBooks, favoriteSavedItems]);

  const allSavedItems = useMemo(() => {
    return [...userBookmarks, ...combinedBooks];
  }, [userBookmarks, combinedBooks]);

  const displayedSavedItems = useMemo(() => {
    if (activeTab === 'books') {
      return combinedBooks;
    }
    if (activeTab === 'bookmarks') {
      return userBookmarks;
    }
    if (activeTab === 'notes' || activeTab === 'offline') {
      return [];
    }
    return allSavedItems;
  }, [activeTab, combinedBooks, userBookmarks, allSavedItems]);

  const handleToggleRemove = (item: SavedItem) => {
    if (item.id.startsWith('curated-')) {
      setRemovedCuratedIds((prev) => {
        const next = [...prev, item.id];
        try {
          localStorage.setItem('qbiz_removed_curated_books_v1', JSON.stringify(next));
        } catch {}
        return next;
      });
    } else if (item.id.startsWith('fav-') || favoriteBooks.some((f) => f.title.toLowerCase() === item.title.toLowerCase())) {
      toggleBookFavorite({ id: item.id, title: item.title });
      loadData();
    } else {
      // Remove from user bookmark
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('bookmarks_list_')) {
            const val = localStorage.getItem(key);
            if (val) {
              let pageIndices: number[] = JSON.parse(val);
              pageIndices = pageIndices.filter((p) => p !== item.initialPage);
              if (pageIndices.length === 0) {
                localStorage.removeItem(key);
              } else {
                localStorage.setItem(key, JSON.stringify(pageIndices));
              }
            }
          }
        }
        loadData();
      } catch {}
    }
  };

  const handleOpenItem = (item: SavedItem) => {
    const bookPages =
      item.pages && item.pages.length > 0
        ? item.pages
        : getBookReaderPageUrls({
            id: item.title,
            title: item.title,
            description: item.subtitle,
            cover_url: item.coverUrl,
          } as any);

    setActiveReaderBook({
      title: item.title,
      author: 'Tủ Sách Y Khoa',
      pages: bookPages,
      initialPage: item.initialPage || 0,
      coverUrl: item.coverUrl,
      fileUrl: item.fileUrl,
      pdfUrl: item.pdfUrl || item.fileUrl,
      fileName: item.fileName,
    });
  };

  const handleContinueReading = () => {
    const bookPages = getBookReaderPageUrls({
      id: continueBook.title,
      title: continueBook.title,
      description: continueBook.subtitle,
      cover_url: continueBook.coverUrl,
    } as any);

    setActiveReaderBook({
      title: continueBook.title,
      author: 'Tủ Sách Y Khoa',
      pages: bookPages,
      initialPage: continueBook.page || 0,
      coverUrl: continueBook.coverUrl,
      fileUrl: continueBook.fileUrl || '/documents/atlas_giai_phau_cot_song_toan_dien.pdf',
      pdfUrl: continueBook.pdfUrl || '/documents/atlas_giai_phau_cot_song_toan_dien.pdf',
      fileName: continueBook.fileName || 'atlas_giai_phau_cot_song_toan_dien.pdf',
    });
  };

  const handleOpenNote = (note: ReadingNoteItem) => {
    const matched = DEFAULT_CURATED_SAVED.find(
      (b) =>
        b.title.toLowerCase().includes(note.bookTitle.toLowerCase()) ||
        note.bookTitle.toLowerCase().includes(b.title.toLowerCase())
    );
    const bookPages = getBookReaderPageUrls({
      id: note.bookTitle,
      title: note.bookTitle,
      description: '',
      cover_url: matched?.coverUrl || null,
    } as any);

    setActiveReaderBook({
      title: note.bookTitle,
      author: 'Tủ Sách Y Khoa',
      pages: bookPages,
      initialPage: Math.max(0, note.page),
      coverUrl: matched?.coverUrl,
      fileUrl: matched?.fileUrl,
      pdfUrl: matched?.pdfUrl,
      fileName: matched?.fileName,
    });
  };

  const handleDeleteNote = (note: ReadingNoteItem) => {
    readingNotesStorage.deleteNote(note.bookTitle, note.id);
    setAllNotes((prev) => prev.filter((n) => n.id !== note.id));
  };

  return (
    <main className="flex-1 flex flex-col px-3 sm:px-4 pt-3 pb-24 gap-4 max-w-[640px] w-full mx-auto select-none">
      {/* 1. HEADER CHÍNH: ĐÃ LƯU */}
      <section className="flex items-center justify-between gap-2 pt-1 border-b border-amber-900/10 dark:border-white/10 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-lg sm:text-xl font-black text-[#2A160A] dark:text-amber-200 tracking-tight whitespace-nowrap">
            Đã lưu
          </h1>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-[10.5px] shrink-0 whitespace-nowrap">
            {combinedBooks.length} sách
          </span>
        </div>
        <p className="text-[11px] text-[#6E4223] dark:text-amber-100/70 font-medium truncate whitespace-nowrap text-right">
          Tủ sách cá nhân & dấu trang
        </p>
      </section>

      {/* 2. THỐNG KÊ THÓI QUEN ĐỌC SÁCH TINH GỌN (STREAK & INSIGHTS) */}
      <section className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
        <div className="px-2.5 py-1 rounded-xl bg-amber-500/10 dark:bg-[#22150c] border border-amber-500/25 dark:border-amber-500/30 flex items-center gap-1.5 shrink-0 shadow-2xs whitespace-nowrap">
          <Flame size={13} className="text-amber-500 fill-amber-500 animate-pulse shrink-0" />
          <span className="text-[10.5px] font-extrabold text-[#78350F] dark:text-amber-300">
            {readingStats.streakDays} ngày liên tiếp
          </span>
        </div>
        <div className="px-2.5 py-1 rounded-xl bg-white/80 dark:bg-[#22150c] border border-[#e6dcce] dark:border-[#553622] flex items-center gap-1.5 shrink-0 shadow-2xs whitespace-nowrap">
          <BookOpen size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-[10.5px] font-bold text-[#2A160A] dark:text-amber-100">
            {readingStats.pagesToday} trang hôm nay
          </span>
        </div>
        <div className="px-2.5 py-1 rounded-xl bg-white/80 dark:bg-[#22150c] border border-[#e6dcce] dark:border-[#553622] flex items-center gap-1.5 shrink-0 shadow-2xs whitespace-nowrap">
          <Clock size={12} className="text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="text-[10.5px] font-bold text-[#2A160A] dark:text-amber-100">
            {readingStats.minutesToday} phút đọc
          </span>
        </div>
      </section>

      {/* 3. THANH CHUYỂN TABS: TẤT CẢ / SÁCH / DẤU TRANG / GHI CHÚ / NGOẠI TUYẾN */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-0.5">
        {[
          { id: 'all', label: 'Tất cả', count: allSavedItems.length + allNotes.length + offlineBooks.length + audiobookHistory.length },
          { id: 'books', label: 'Sách đã lưu', count: combinedBooks.length },
          { id: 'audio', label: 'Sách nói', count: audiobookHistory.length },
          { id: 'bookmarks', label: 'Dấu trang', count: userBookmarks.length },
          { id: 'notes', label: 'Sổ tay ghi chú', count: allNotes.length },
          { id: 'offline', label: 'Ngoại tuyến', count: offlineBooks.length },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'bg-white/80 dark:bg-[#22150c] text-[#6E4223] dark:text-amber-200/80 hover:bg-amber-500/15 border border-[#e6dcce] dark:border-[#553622]'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === tab.id
                  ? 'bg-slate-950/20 text-slate-950 font-black'
                  : 'bg-amber-900/10 dark:bg-white/10 text-amber-900 dark:text-amber-300 font-bold'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 3. SECTION Ở ĐẦU: ĐANG ĐỌC DỞ (HIỂN THỊ KHI Ở TAB TẤT CẢ HOẶC SÁCH) */}
      {(activeTab === 'all' || activeTab === 'books') && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs font-black text-[#8B4513] dark:text-amber-400 uppercase tracking-wide">
            <BookOpen size={15} className="text-[#8B4513] dark:text-amber-400" />
            <span>ĐANG ĐỌC DỞ</span>
          </div>

          {/* Card Đang đọc dở lớn */}
          <div className="p-3.5 rounded-3xl bg-white dark:bg-[#22150c] border border-[#e6dcce] dark:border-[#553622] shadow-sm dark:shadow-xl flex flex-col gap-3.5 transition-all">
            <div className="flex items-center gap-3">
              {/* Ảnh bìa bên trái chuẩn A4 đứng */}
              <div className="relative w-20 sm:w-24 aspect-[1/1.42] rounded-xl overflow-hidden shrink-0 border border-amber-900/10 dark:border-white/10 shadow-sm">
                <BookCoverArt
                  coverUrl={continueBook.coverUrl}
                  title={continueBook.title}
                  author={continueBook.subtitle}
                  className="w-full h-full"
                />
                <div className="absolute bottom-1.5 left-1.5 w-6 h-6 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-amber-300 border border-white/20">
                  <BookOpen size={13} className="text-amber-400" />
                </div>
              </div>

              {/* Thông tin sách bên phải */}
              <div className="flex flex-col min-w-0 flex-1 gap-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 tracking-wide uppercase">
                  <BookOpen size={11} />
                  <span>ĐANG ĐỌC DỞ</span>
                </div>
                <h2 className="text-sm font-bold text-[#2A160A] dark:text-amber-100 line-clamp-2 leading-snug">
                  {continueBook.title}
                </h2>
                <p className="text-[11px] text-[#6E4223] dark:text-[#9e8574] truncate">
                  {continueBook.subtitle}
                </p>

                {/* Thanh tiến độ đọc dở */}
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-[#ECE5D8] dark:bg-[#160e08] rounded-full overflow-hidden border border-amber-900/5 dark:border-white/5">
                    <div
                      className="h-full bg-linear-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-300"
                      style={{ width: `${continueBook.percent}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-800 dark:text-amber-300 shrink-0">
                    {continueBook.percent}%
                  </span>
                </div>
              </div>
            </div>

            {/* Nút Tiếp tục đọc */}
            <button
              type="button"
              onClick={handleContinueReading}
              className="w-full py-2.5 px-4 rounded-2xl bg-[#F5EFE6] dark:bg-[#2e1d12] hover:bg-amber-500 hover:text-slate-950 border border-amber-900/15 dark:border-amber-500/40 text-[#4A2612] dark:text-amber-200 font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs dark:shadow-md active:scale-98 transition-all cursor-pointer group"
            >
              <span className="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-400 group-hover:bg-slate-950 transition-colors" />
              <span>Tiếp tục đọc</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>
      )}

      {/* 4. SECTION: DANH SÁCH SÁCH & DẤU TRANG */}
      {(activeTab === 'all' || activeTab === 'books' || activeTab === 'bookmarks') && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black text-[#8B4513] dark:text-amber-400 uppercase tracking-wide">
              <Bookmark size={15} className="fill-[#8B4513] text-[#8B4513] dark:fill-amber-400 dark:text-amber-400" />
              <span>
                {activeTab === 'books'
                  ? 'SÁCH ĐÃ LƯU'
                  : activeTab === 'bookmarks'
                  ? 'DẤU TRANG ĐÃ LƯU'
                  : 'ĐÃ LƯU GẦN ĐÂY'}
              </span>
            </div>

            {/* Bộ chọn 3 chế độ xem (List, Compact, Grid) */}
            <div className="p-0.5 rounded-xl bg-white dark:bg-[#22150c] border border-[#e6dcce] dark:border-[#553622] flex items-center gap-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => handleViewModeChange('list')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/50'
                    : 'text-[#7A583E] dark:text-slate-400 hover:text-[#2A160A] dark:hover:text-white'
                }`}
                title="Danh sách lớn"
                aria-label="Chế độ danh sách lớn"
              >
                <List size={15} />
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange('compact')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'compact'
                    ? 'bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/50'
                    : 'text-[#7A583E] dark:text-slate-400 hover:text-[#2A160A] dark:hover:text-white'
                }`}
                title="Danh sách thu gọn"
                aria-label="Chế độ danh sách thu gọn"
              >
                <Rows size={15} />
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/50'
                    : 'text-[#7A583E] dark:text-slate-400 hover:text-[#2A160A] dark:hover:text-white'
                }`}
                title="Lưới ô vuông"
                aria-label="Chế độ lưới ô vuông"
              >
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>

          {/* NỘI DUNG DANH SÁCH */}
          {displayedSavedItems.length === 0 ? (
            <div className="py-10 px-4 rounded-3xl bg-white dark:bg-[#22150c] border border-[#e6dcce] dark:border-[#553622] flex flex-col items-center justify-center text-center gap-2.5 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 dark:bg-white/5 border border-amber-500/20 dark:border-white/10 flex items-center justify-center text-amber-700 dark:text-amber-400">
                <Bookmark size={22} />
              </div>
              <h3 className="text-xs font-bold text-[#2A160A] dark:text-amber-100">
                {activeTab === 'bookmarks'
                  ? 'Chưa có dấu trang nào được lưu'
                  : 'Chưa có mục nào được lưu'}
              </h3>
              <p className="text-[11px] text-[#6E4223] dark:text-amber-200/60 max-w-xs">
                Bấm biểu tượng Dấu trang khi đọc sách để lưu lại các trang quan trọng tại đây.
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* ================= GIAO DIỆN LƯỚI (GRID) ================= */
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {displayedSavedItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-white dark:bg-[#22150c] border border-[#e6dcce] dark:border-[#553622] hover:border-amber-500/60 shadow-sm dark:shadow-md flex flex-col justify-between gap-2.5 transition-all group"
                >
                  {/* Dòng trên: Badge loại sách + Nút Bookmark */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 tracking-wider uppercase">
                      <BookOpen size={11} />
                      <span className="truncate">{item.category}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleRemove(item);
                      }}
                      className="w-6 h-6 rounded-md bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 dark:border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Bỏ lưu"
                    >
                      <Bookmark size={12} className="fill-amber-700 dark:fill-amber-400" />
                    </button>
                  </div>

                  {/* Khối giữa: Ảnh bìa + Badge định dạng */}
                  <div
                    onClick={() => handleOpenItem(item)}
                    className="relative w-full aspect-[1/1.42] rounded-md overflow-hidden shrink-0 shadow-xs cursor-pointer group"
                  >
                    <BookCoverArt
                      coverUrl={item.coverUrl}
                      title={item.title}
                      author={item.subtitle}
                      format={item.badgeNumber}
                      className="w-full h-full"
                    />
                    {item.badgeNumber && (
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-amber-600 text-white font-mono font-black text-[10px] shadow-sm uppercase z-10">
                        {item.badgeNumber}
                      </div>
                    )}
                  </div>

                  {/* Khối dưới: Tiêu đề + Phụ đề */}
                  <div
                    onClick={() => handleOpenItem(item)}
                    className="flex flex-col gap-0.5 cursor-pointer min-w-0"
                  >
                    <h3 className="text-xs font-bold text-[#2A160A] dark:text-amber-100 group-hover:text-amber-700 dark:group-hover:text-amber-300 line-clamp-2 leading-tight">
                      {item.title}
                    </h3>
                    <span className="text-[10px] text-[#6E4223] dark:text-[#9e8574] truncate">
                      {item.subtitle}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ================= GIAO DIỆN HÀNG NGANG (COMPACT / LIST) ================= */
            <div className="flex flex-col gap-2">
              {displayedSavedItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenItem(item)}
                  className="p-2.5 rounded-2xl bg-white dark:bg-[#22150c] border border-[#e6dcce] dark:border-[#553622] hover:border-amber-500/60 shadow-sm dark:shadow-md flex items-center justify-between gap-3 cursor-pointer transition-all group"
                >
                  {/* Bên trái: Thumbnail tỷ lệ A4 với Badge */}
                  <div className="relative w-12 sm:w-14 aspect-[1/1.42] rounded-md overflow-hidden shrink-0 shadow-xs">
                    <BookCoverArt
                      coverUrl={item.coverUrl}
                      title={item.title}
                      author={item.subtitle}
                      format={item.badgeNumber}
                      className="w-full h-full"
                    />
                    {item.badgeNumber && (
                      <div className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-amber-600 text-white font-mono font-bold text-[9px] uppercase shadow-xs z-10">
                        {item.badgeNumber}
                      </div>
                    )}
                  </div>

                  {/* Ở giữa: Tiêu đề + Chuyên mục */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[9.5px] font-bold text-amber-700 dark:text-amber-400/80 uppercase tracking-wider">
                      {item.category}
                    </span>
                    <h3 className="text-xs font-bold text-[#2A160A] dark:text-amber-100 group-hover:text-amber-700 dark:group-hover:text-amber-300 truncate leading-snug">
                      {item.title}
                    </h3>
                    <span className="text-[10px] text-[#6E4223] dark:text-[#9e8574] truncate mt-0.5">
                      {item.subtitle}
                    </span>
                  </div>

                  {/* Bên phải: Nút Mũi tên & Nút Bookmark */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <ChevronRight
                      size={16}
                      className="text-[#7A583E] dark:text-[#9e8574] group-hover:text-amber-700 dark:group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleRemove(item);
                      }}
                      className="w-7 h-7 rounded-lg bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 dark:border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Bỏ lưu"
                    >
                      <Bookmark size={13} className="fill-amber-700 dark:fill-amber-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* SECTION: LỊCH SỬ NGHE SÁCH NÓI CHUYÊN NGHIỆP */}
      {(activeTab === 'all' || activeTab === 'audio') && (
        <section className="flex flex-col gap-3 pt-2 border-t border-[#e6dcce] dark:border-[#553622]/60">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Headphones size={15} className="text-[#8B4513] dark:text-amber-400 shrink-0" />
              <h2 className="text-xs font-black text-[#8B4513] dark:text-amber-400 uppercase tracking-wider truncate">
                LỊCH SỬ NGHE SÁCH NÓI
              </h2>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/20 shrink-0">
                {audiobookHistory.length}
              </span>
            </div>

            {audiobookHistory.length > 0 && activeTab === 'audio' && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử nghe sách nói?')) {
                    clearAllAudiobookHistory();
                  }
                }}
                className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={12} />
                <span>Xóa tất cả</span>
              </button>
            )}
          </div>

          {audiobookHistory.length === 0 ? (
            activeTab === 'audio' && (
              <div className="p-8 rounded-3xl bg-white dark:bg-[#22150c] border border-dashed border-[#e6dcce] dark:border-[#553622] text-center flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Headphones size={28} />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-sm font-bold text-[#2A160A] dark:text-amber-100">
                    Chưa có lịch sử nghe sách nói
                  </h4>
                  <p className="text-xs text-[#7A583E] dark:text-amber-200/70 max-w-xs">
                    Mọi tác phẩm sách nói MP3 bạn đã nghe sẽ tự động được lưu tiến độ từng giây tại đây.
                  </p>
                </div>
                <Link
                  href="/danh-muc"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-xs cursor-pointer"
                >
                  Khám phá kho sách nói ngay
                </Link>
              </div>
            )
          ) : (
            <div className="flex flex-col gap-2.5">
              {audiobookHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-white dark:bg-[#22150c] border border-[#e6dcce] dark:border-[#553622] shadow-2xs hover:shadow-md transition-all flex items-center gap-3 group"
                >
                  {/* Bìa sách nói */}
                  <div
                    className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-amber-900/10 dark:border-white/10 cursor-pointer"
                    onClick={() => {
                      setActiveAudioBook(item);
                      setShowAudioPlayer(true);
                    }}
                  >
                    {item.coverUrl && !item.coverUrl.startsWith('style:') ? (
                      <img
                        src={item.coverUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-[#2d180c] to-[#452514] flex items-center justify-center">
                        <Headphones size={22} className="text-amber-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <PlayCircle size={24} className="text-white fill-amber-500" />
                    </div>
                  </div>

                  {/* Thông tin & Tiến trình */}
                  <div className="flex flex-col min-w-0 flex-1 gap-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <h4
                        className="text-xs font-black text-[#2A160A] dark:text-amber-100 line-clamp-1 cursor-pointer hover:text-amber-600 dark:hover:text-amber-300 transition-colors"
                        onClick={() => {
                          setActiveAudioBook(item);
                          setShowAudioPlayer(true);
                        }}
                      >
                        {item.title}
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeAudiobookFromHistory(item.id)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                        title="Xóa khỏi lịch sử nghe"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <p className="text-[11px] text-[#7A583E] dark:text-amber-200/70 truncate">
                      {item.author} {item.audioNarrator ? `• ${item.audioNarrator}` : ''}
                    </p>

                    {/* Thanh tiến trình & % */}
                    <div className="flex flex-col gap-1 mt-0.5">
                      <div className="w-full bg-amber-900/10 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(2, item.percent))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#8B4513] dark:text-amber-300/80">
                        <span>Đã nghe {item.percent}% ({formatAudioSeconds(item.currentTime)})</span>
                        <span>{item.duration > 0 ? formatAudioSeconds(item.duration) : item.durationFormatted || '--:--'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Nút bấm nghe tiếp nhanh */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveAudioBook(item);
                      setShowAudioPlayer(true);
                    }}
                    className="h-8 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] flex items-center gap-1 shrink-0 cursor-pointer shadow-xs active:scale-95 transition-all"
                    title="Nghe tiếp từ điểm dừng"
                  >
                    <PlayCircle size={13} className="fill-slate-950 text-amber-500" />
                    <span>Nghe tiếp</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 5. SECTION: SỔ TAY GHI CHÚ & TRÍCH DẪN Y KHOA */}
      {(activeTab === 'all' || activeTab === 'notes') && (
        <section className="flex flex-col gap-3 pt-2 border-t border-[#e6dcce] dark:border-[#553622]/60">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <BookMarked size={14} className="text-[#8B4513] dark:text-amber-400 shrink-0" />
              <h2 className="text-xs font-black text-[#8B4513] dark:text-amber-400 uppercase tracking-wider truncate">
                SỔ TAY GHI CHÚ
              </h2>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/20 shrink-0">
                {allNotes.length}
              </span>
            </div>
            {allNotes.length > 0 && (
              <button
                type="button"
                onClick={() => setShowFlashcardModal(true)}
                className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10.5px] flex items-center gap-1 shadow-2xs transition-all active:scale-95 shrink-0 whitespace-nowrap cursor-pointer"
                title="Bắt đầu ôn tập Flashcard 3D"
              >
                <Sparkles size={11} />
                <span>Ôn Flashcard</span>
              </button>
            )}
          </div>

          {allNotes.length === 0 ? (
            <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#22150c]/70 border border-dashed border-[#d9ccb9] dark:border-[#553622] flex flex-col items-center justify-center text-center gap-2 py-6">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400">
                <BookMarked size={20} />
              </div>
              <p className="text-xs font-bold text-[#2A160A] dark:text-amber-100">
                Chưa có ghi chú hoặc trích dẫn nào
              </p>
              <p className="text-[11px] text-[#6E4223] dark:text-[#9e8574] max-w-xs leading-relaxed">
                Khi đọc sách, mở biểu tượng Sổ tay trên thanh công cụ để lưu lại các câu trích dẫn đắt giá và suy ngẫm cá nhân.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {allNotes.map((note) => {
                const colorConfig = {
                  amber: {
                    border: 'border-l-amber-500',
                    badge: 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30',
                    dot: 'bg-amber-500',
                  },
                  rose: {
                    border: 'border-l-rose-500',
                    badge: 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/30',
                    dot: 'bg-rose-500',
                  },
                  emerald: {
                    border: 'border-l-emerald-500',
                    badge: 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
                    dot: 'bg-emerald-500',
                  },
                  blue: {
                    border: 'border-l-blue-500',
                    badge: 'bg-blue-500/20 text-blue-800 dark:text-blue-300 border-blue-500/30',
                    dot: 'bg-blue-500',
                  },
                  purple: {
                    border: 'border-l-purple-500',
                    badge: 'bg-purple-500/20 text-purple-800 dark:text-purple-300 border-purple-500/30',
                    dot: 'bg-purple-500',
                  },
                }[note.color || 'amber'];

                return (
                  <div
                    key={note.id}
                    className={`p-3.5 rounded-2xl bg-white dark:bg-[#22150c] border border-[#e6dcce] dark:border-[#553622] border-l-4 ${colorConfig.border} shadow-sm dark:shadow-md flex flex-col gap-2.5 transition-all`}
                  >
                    {/* Header ghi chú: Tên sách + Trang */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${colorConfig.dot}`} />
                        <span className="text-xs font-bold text-[#2A160A] dark:text-amber-100 truncate">
                          {note.bookTitle}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 border ${colorConfig.badge}`}>
                        Trang {note.page + 1}
                      </span>
                    </div>

                    {/* Đoạn trích dẫn */}
                    <blockquote className="text-xs italic text-[#3B1F0E] dark:text-amber-100/90 bg-[#FBF8F3] dark:bg-[#1a0f08] p-2.5 rounded-xl border border-amber-900/10 dark:border-white/5 leading-relaxed">
                      “{note.selectedText}”
                    </blockquote>

                    {/* Lời nhắn / Ghi chú cá nhân */}
                    {note.userNote && (
                      <div className="flex items-start gap-1.5 text-[11px] text-[#6E4223] dark:text-amber-200/90 bg-amber-500/10 dark:bg-amber-500/5 px-2.5 py-2 rounded-xl border border-amber-500/20">
                        <Sparkles size={12} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{note.userNote}</span>
                      </div>
                    )}

                    {/* Chân card: Nút mở đọc trang này & nút xóa */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-900/5 dark:border-white/5">
                      <span className="text-[10px] text-[#8B4513]/60 dark:text-amber-200/50">
                        {new Date(note.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveQuoteNote(note)}
                          className="px-2 py-1 rounded-lg bg-white/70 dark:bg-white/10 hover:bg-amber-500/20 text-[#6E4223] dark:text-amber-300 font-bold text-[10.5px] border border-amber-900/15 dark:border-white/10 flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                          title="Tạo ảnh trích dẫn nghệ thuật để chia sẻ"
                        >
                          <Share2 size={11} />
                          <span>Ảnh</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenNote(note)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-[#4A2612] dark:text-amber-200 hover:text-slate-950 font-bold text-[11px] border border-amber-500/30 flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                        >
                          <BookOpen size={11} />
                          <span>Đọc lại</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note)}
                          className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-600 dark:text-red-400 hover:text-white border border-red-500/20 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                          title="Xóa ghi chú này"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 6. SECTION: SÁCH NGOẠI TUYẾN ĐÃ LƯU */}
      {(activeTab === 'all' || activeTab === 'offline') && (
        <section className="flex flex-col gap-3 pt-2 border-t border-[#e6dcce] dark:border-[#553622]/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black text-[#8B4513] dark:text-amber-400 uppercase tracking-wide">
              <HardDrive size={15} className="text-[#8B4513] dark:text-amber-400" />
              <span>SÁCH NGOẠI TUYẾN ĐÃ LƯU</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
              {offlineBooks.length} cuốn · {formatBytes(offlineUsage.totalBytes)}
            </span>
          </div>

          {offlineBooks.length === 0 ? (
            <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#22150c]/70 border border-dashed border-[#d9ccb9] dark:border-[#553622] flex flex-col items-center justify-center text-center gap-2 py-6">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400">
                <Download size={20} />
              </div>
              <p className="text-xs font-bold text-[#2A160A] dark:text-amber-100">
                Chưa có sách nào được lưu về máy
              </p>
              <p className="text-[11px] text-[#6E4223] dark:text-[#9e8574] max-w-xs leading-relaxed">
                Khi mở bất kỳ cuốn sách nào, nhấn nút <span className="font-bold text-amber-700 dark:text-amber-300">Lưu máy ⚡</span> trên thanh công cụ để đọc mượt mà không cần mạng Internet!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {offlineBooks.map((book) => (
                <div
                  key={book.id}
                  onClick={() => handleOpenOfflineBook(book)}
                  className="p-3 rounded-2xl bg-white dark:bg-[#22150c] border border-[#e6dcce] dark:border-[#553622] hover:border-amber-500/60 shadow-sm dark:shadow-md flex items-center justify-between gap-3 cursor-pointer transition-all group"
                >
                  {/* Thumbnail bìa hoặc icon */}
                  <div className="relative w-12 sm:w-14 aspect-[1/1.42] rounded-md overflow-hidden shrink-0 shadow-xs">
                    <BookCoverArt
                      coverUrl={book.coverUrl}
                      title={book.title}
                      author={book.author}
                      format={book.format}
                      className="w-full h-full"
                    />
                    <div className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-emerald-600 text-white font-mono font-bold text-[8.5px] uppercase shadow-xs z-10">
                      {book.format}
                    </div>
                  </div>

                  {/* Thông tin sách */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                        <CheckCircle2 size={10} />
                        Sẵn sàng ngoại tuyến
                      </span>
                      <span className="text-[9px] text-[#7A583E] dark:text-[#9e8574]">·</span>
                      <span className="text-[9px] font-mono text-[#7A583E] dark:text-[#9e8574]">
                        {formatBytes(book.fileSize)}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-[#2A160A] dark:text-amber-100 group-hover:text-amber-700 dark:group-hover:text-amber-300 truncate leading-snug">
                      {book.title}
                    </h3>
                    <span className="text-[10px] text-[#6E4223] dark:text-[#9e8574] truncate mt-0.5">
                      {book.author ? `Tác giả: ${book.author}` : 'Đã lưu trong máy'} · Trang {(book.lastReadPage ?? 0) + 1}
                    </span>
                  </div>

                  {/* Nút hành động: Đọc ngay & Xóa */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenOfflineBook(book);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-900 dark:text-amber-200 hover:text-slate-950 font-bold text-[11px] border border-amber-500/30 flex items-center gap-1 transition-all cursor-pointer"
                      title="Mở đọc ngay"
                    >
                      <BookOpen size={12} />
                      <span className="hidden sm:inline">Đọc</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveOfflineBook(e, book.id)}
                      className="w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-600 dark:text-red-400 hover:text-white border border-red-500/20 flex items-center justify-center transition-colors cursor-pointer"
                      title="Xóa khỏi bộ nhớ máy"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* MODAL ĐỌC SÁCH 3D KHI CLICK VÀO MỤC ĐÃ LƯU */}
      {activeReaderBook && (
        <SideBooksReaderModal
          isOpen={Boolean(activeReaderBook)}
          title={activeReaderBook.title}
          author={activeReaderBook.author}
          coverUrl={activeReaderBook.coverUrl || undefined}
          fileUrl={activeReaderBook.fileUrl}
          pdfUrl={activeReaderBook.pdfUrl}
          fileName={activeReaderBook.fileName}
          pages={activeReaderBook.pages || []}
          initialPage={activeReaderBook.initialPage}
          onClose={() => {
            setActiveReaderBook(null);
            loadOfflineList();
            loadData();
          }}
        />
      )}

      {/* MODAL ÔN TẬP FLASHCARD 3D */}
      {showFlashcardModal && (
        <FlashcardStudyModal
          isOpen={showFlashcardModal}
          onClose={() => setShowFlashcardModal(false)}
          notes={allNotes}
          onNotesUpdated={() => {
            setAllNotes(readingNotesStorage.getAllNotes());
          }}
        />
      )}

      {/* MODAL XUẤT ẢNH TRÍCH DẪN Y KHOA NGHỆ THUẬT */}
      {activeQuoteNote && (
        <QuoteCardModal
          isOpen={Boolean(activeQuoteNote)}
          onClose={() => setActiveQuoteNote(null)}
          note={activeQuoteNote}
        />
      )}

      {/* TRÌNH PHÁT SÁCH NÓI MP3 CHUYÊN NGHIỆP */}
      {activeAudioBook && (
        <AudiobookPlayerModal
          isOpen={showAudioPlayer}
          onClose={() => {
            setShowAudioPlayer(false);
            setActiveAudioBook(null);
            setAudiobookHistory(getAudiobookHistory());
          }}
          book={activeAudioBook}
        />
      )}

      {/* THANH ĐIỀU HƯỚNG DƯỚI CÙNG */}
      <BottomNav />
    </main>
  );
}
