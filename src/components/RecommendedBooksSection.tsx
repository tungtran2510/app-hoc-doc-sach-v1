'use client';

import React, { useState, useEffect } from 'react';
import {
  Edit2,
  Plus,
  LayoutGrid,
  List,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Trash2,
  Eye,
  EyeOff,
  BookOpen,
  Sparkles,
  FileText,
  Play,
  Headphones,
} from 'lucide-react';
import { RecommendedBook } from '../lib/types';
import { checkIsAdminClient } from '../lib/adminAuth';
import { saveSettingsApi } from '../lib/apiAdmin';
import EditRecommendedBooksModal from './admin/EditRecommendedBooksModal';
import EditSingleRecommendedBookModal from './admin/EditSingleRecommendedBookModal';
import SectionOrderControls from './admin/SectionOrderControls';
import ModernBookCover from './ModernBookCover';
import BookDetailModal, { UnifiedBookItem } from './BookDetailModal';
import ScrollReveal from './ScrollReveal';
import FlipbookViewer from './FlipbookViewer';
import WoodenBookshelf from './WoodenBookshelf';
import SideBooksReaderModal from './SideBooksReaderModal';
import AudiobookPlayerModal from './AudiobookPlayerModal';
import { getBookReaderPageUrls } from '../lib/bookReaderPages';
import { offlineStorage, formatBytes } from '../lib/offlineStorage';
import { getLastListenedAudiobook, AudiobookHistoryItem } from '../lib/audiobookHistory';
import { userShelfStorage } from '../lib/userShelfStorage';

interface RecommendedBooksSectionProps {
  initialTitle?: string | null;
  initialSubtitle?: string | null;
  initialBooks?: RecommendedBook[];
  initialLayout?: 'bookshelf' | 'grid' | 'lookbook' | null;
  sectionIndex?: number;
  totalSections?: number;
  isHidden?: boolean;
  onToggleVisibility?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onOpenReorderModal?: () => void;
  hotline?: string | null;
  zaloUrl?: string | null;
  appName?: string | null;
  logoUrl?: string | null;
  onOpenWelcome?: () => void;
  onOpenAdminSettings?: () => void;
  onOpenEditApp?: () => void;
  onOpenUserSync?: () => void;
  onOpenPwaInstall?: () => void;
  onLogout?: () => void;
}

export default function RecommendedBooksSection({
  initialTitle,
  initialSubtitle,
  initialBooks = [],
  initialLayout = 'bookshelf',
  sectionIndex,
  totalSections,
  isHidden = false,
  onToggleVisibility,
  onMoveUp,
  onMoveDown,
  onOpenReorderModal,
  hotline,
  zaloUrl,
  appName,
  logoUrl,
  onOpenWelcome,
  onOpenAdminSettings,
  onOpenEditApp,
  onOpenUserSync,
  onOpenPwaInstall,
  onLogout,
}: RecommendedBooksSectionProps) {
  const [title, setTitle] = useState(initialTitle || 'Tài Liệu Y Khoa');
  const [subtitle, setSubtitle] = useState(
    initialSubtitle || 'Tài liệu tham khảo chuyên sâu giúp bạn hiểu và chăm sóc cơ thể mỗi ngày'
  );
  const [books, setBooks] = useState<RecommendedBook[]>(initialBooks);
  const [layoutMode, setLayoutMode] = useState<'bookshelf' | 'grid' | 'lookbook'>(
    initialLayout === 'lookbook'
      ? 'lookbook'
      : initialLayout === 'grid'
      ? 'grid'
      : 'bookshelf'
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<RecommendedBook | null>(null);
  const [sideBooksModalBook, setSideBooksModalBook] = useState<RecommendedBook | null>(null);
  const [sideBooksInitialPage, setSideBooksInitialPage] = useState<number>(0);
  const [flipbookPreviewBook, setFlipbookPreviewBook] = useState<RecommendedBook | null>(null);
  const [editingSingleBook, setEditingSingleBook] = useState<RecommendedBook | null>(null);
  const [audioResume, setAudioResume] = useState<AudiobookHistoryItem | null>(null);
  const [showResumePlayer, setShowResumePlayer] = useState<boolean>(false);

  useEffect(() => {
    setAudioResume(getLastListenedAudiobook());
    const handleHistoryUpdate = () => {
      setAudioResume(getLastListenedAudiobook());
    };
    window.addEventListener('qbiz_audiobook_history_updated', handleHistoryUpdate);
    return () => {
      window.removeEventListener('qbiz_audiobook_history_updated', handleHistoryUpdate);
    };
  }, []);

  const handleOpenAddSingleBook = () => {
    const newBook: RecommendedBook = {
      id: `book-${Date.now()}`,
      title: '',
      category: 'Chăm sóc sức khỏe',
      badge_tag: 'SÁCH MỚI',
      cover_url: null,
      description: '',
      author: 'Tủ Sách Y Khoa',
      gallery_images: [],
      flipbook_pages: [],
      file_url: null,
      pdf_url: null,
      is_visible: true,
    };
    setEditingSingleBook(newBook);
  };

  const handleSaveSingleBook = async (updatedBook: RecommendedBook) => {
    let nextBooks = [...books];
    const existsIndex = nextBooks.findIndex((b) => b.id === updatedBook.id);
    if (existsIndex >= 0) {
      nextBooks[existsIndex] = updatedBook;
    } else {
      nextBooks = [updatedBook, ...nextBooks];
    }
    setBooks(nextBooks);
    setEditingSingleBook(null);
    if (isAdmin) {
      await saveSettingsApi({
        recommended_books: nextBooks,
      });
    }
  };

  useEffect(() => {
    checkIsAdminClient().then(setIsAdmin);
    if (initialTitle) setTitle(initialTitle);
    if (initialSubtitle) setSubtitle(initialSubtitle);
    if (initialLayout) {
      setLayoutMode(
        initialLayout === 'lookbook'
          ? 'lookbook'
          : initialLayout === 'grid'
          ? 'grid'
          : 'bookshelf'
      );
    }
    loadDownloadedBooks();
  }, [initialTitle, initialSubtitle, initialBooks, initialLayout]);

  // Tự động tải và đồng bộ các cuốn sách từ Kệ sách cá nhân và IndexedDB vào Gian trưng bày kệ sách
  const loadDownloadedBooks = async () => {
    try {
      const cached = (await offlineStorage.getAllCachedBooks()) || [];
      const userShelf = userShelfStorage.getAll() || [];

      setBooks((prevBooks) => {
        const baseList = initialBooks && initialBooks.length > 0 ? initialBooks : prevBooks;
        const cachedMap = new Map(cached.map((c) => [c.id, c]));

        const seenIds = new Set<string>();
        const resultBooks: RecommendedBook[] = [];

        // 1. ƯU TIÊN SỐ 1: Các cuốn sách trên Kệ sách cá nhân (do người dùng bấm "+ Kệ" khi tìm kiếm)
        for (const s of userShelf) {
          if (!seenIds.has(s.id)) {
            const orig = baseList.find((b) => b.id === s.id);
            const format = (s.format || (s.fileUrl?.endsWith('.pdf') ? 'pdf' : 'epub')).toUpperCase();
            const fileName = s.fileUrl ? s.fileUrl.split('/').pop() : s.title;

            resultBooks.push({
              id: s.id,
              title: s.title,
              author: s.author || orig?.author || 'Tác giả',
              category: orig?.category || 'Kệ của bạn',
              badge_tag: s.badgeTag || orig?.badge_tag || format,
              cover_url: s.coverUrl || orig?.cover_url || '',
              description: s.description || orig?.description || 'Đã thêm vào Kệ sách cá nhân',
              pages: orig?.pages || [],
              flipbook_pages: orig?.flipbook_pages || [],
              gallery_images: orig?.gallery_images || [],
              file_url: s.fileUrl || orig?.file_url || '',
              pdf_url: s.fileUrl || orig?.pdf_url || '',
              file_name: fileName || orig?.file_name || s.title,
              youtube_url: orig?.youtube_url || null,
              is_visible: true,
            });
            seenIds.add(s.id);
          }
        }

        // 2. ƯU TIÊN SỐ 2: Các cuốn sách đã tải về ngoại tuyến (IndexedDB)
        for (const c of cached) {
          if (!seenIds.has(c.id)) {
            const storedCustomCover =
              typeof window !== 'undefined'
                ? localStorage.getItem(`custom_cover_${c.id}`)
                : null;
            const bookCover = storedCustomCover || c.customCoverUrl || c.coverUrl || '';
            const format = c.format ? c.format.toUpperCase() : 'TẢI VỀ';

            resultBooks.push({
              id: c.id,
              title: c.title,
              author: c.author || 'Tác giả',
              category: 'Đã tải về',
              badge_tag: format,
              cover_url: bookCover,
              description: `Sách ngoại tuyến (${formatBytes(c.fileSize)}) • Sẵn sàng đọc ngay`,
              pages: [],
              file_url: c.fileUrl,
              pdf_url: c.fileUrl,
              file_name: c.fileName || c.title,
              is_visible: true,
            });
            seenIds.add(c.id);
          }
        }

        // 3. DANH SÁCH SÁCH GỐC (initialBooks)
        for (const b of baseList) {
          if (!seenIds.has(b.id)) {
            const c = cachedMap.get(b.id);
            if (c) {
              const storedCustomCover =
                typeof window !== 'undefined'
                  ? localStorage.getItem(`custom_cover_${c.id}`)
                  : null;
              const bookCover = storedCustomCover || c.customCoverUrl || c.coverUrl || b.cover_url || '';
              resultBooks.push({
                ...b,
                title: c.title || b.title,
                author: c.author || b.author,
                cover_url: bookCover,
              });
            } else {
              resultBooks.push(b);
            }
            seenIds.add(b.id);
          }
        }

        return resultBooks;
      });
    } catch (err) {
      console.error('Lỗi nạp sách ngoại tuyến vào kệ sách:', err);
    }
  };

  useEffect(() => {
    loadDownloadedBooks();

    const handleBookDownloaded = () => {
      loadDownloadedBooks();
    };

    window.addEventListener('qbiz_book_downloaded', handleBookDownloaded);
    window.addEventListener('qbiz_book_metadata_updated', handleBookDownloaded);
    window.addEventListener('qbiz_book_removed_offline', handleBookDownloaded);
    window.addEventListener('qbiz_book_added_to_shelf', handleBookDownloaded);
    window.addEventListener('qbiz_book_removed_from_shelf', handleBookDownloaded);
    return () => {
      window.removeEventListener('qbiz_book_downloaded', handleBookDownloaded);
      window.removeEventListener('qbiz_book_metadata_updated', handleBookDownloaded);
      window.removeEventListener('qbiz_book_removed_offline', handleBookDownloaded);
      window.removeEventListener('qbiz_book_added_to_shelf', handleBookDownloaded);
      window.removeEventListener('qbiz_book_removed_from_shelf', handleBookDownloaded);
    };
  }, []);

  // Lắng nghe sự kiện mở sách trực tiếp từ Trợ lý AI
  useEffect(() => {
    const handleOpenBookFromAi = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      const target =
        books.find((b) => b.id === detail.id) ||
        books.find((b) => b.title.toLowerCase().includes((detail.title || '').toLowerCase())) ||
        books[0];

      if (target) {
        const pageIdx = detail.target_index ?? (detail.target_page ? detail.target_page - 1 : 0);
        setSideBooksInitialPage(Math.max(0, pageIdx));
        setSideBooksModalBook(target);
      }
    };

    window.addEventListener('open_book_from_ai', handleOpenBookFromAi);
    return () => {
      window.removeEventListener('open_book_from_ai', handleOpenBookFromAi);
    };
  }, [books]);

  const handleSaved = (data: {
    title: string;
    subtitle: string;
    books: RecommendedBook[];
    layout?: 'bookshelf' | 'grid' | 'lookbook';
  }) => {
    setTitle(data.title);
    setSubtitle(data.subtitle);
    setBooks(data.books);
    if (data.layout) {
      setLayoutMode(data.layout);
    }
  };

  const toggleLayoutMode = async (mode: 'bookshelf' | 'grid' | 'lookbook') => {
    setLayoutMode(mode);
    if (isAdmin) {
      await saveSettingsApi({
        recommended_books_layout: mode,
      });
    }
  };

  const handleMoveBook = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= books.length) return;
    const nextBooks = [...books];
    const temp = nextBooks[index];
    nextBooks[index] = nextBooks[targetIndex];
    nextBooks[targetIndex] = temp;
    setBooks(nextBooks);
    if (isAdmin) {
      await saveSettingsApi({
        recommended_books: nextBooks,
      });
    } else {
      try {
        localStorage.setItem('qbiz_bookshelf_custom_books', JSON.stringify(nextBooks));
      } catch {}
    }
  };

  const handleDeleteBook = async (index: number) => {
    const target = books[index];
    if (!confirm(`Bạn có chắc chắn muốn gỡ cuốn sách "${target?.title || 'này'}" khỏi kệ sách?`)) return;
    const nextBooks = books.filter((_, i) => i !== index);
    setBooks(nextBooks);
    if (target?.id) {
      try {
        await offlineStorage.removeBookFromOffline(target.id);
      } catch {}
    }
    if (isAdmin) {
      await saveSettingsApi({
        recommended_books: nextBooks,
      });
    } else {
      try {
        localStorage.setItem('qbiz_bookshelf_custom_books', JSON.stringify(nextBooks));
      } catch {}
    }
  };

  const handleToggleBookVisibility = async (index: number) => {
    const nextBooks = [...books];
    const b = nextBooks[index];
    nextBooks[index] = {
      ...b,
      is_visible: b.is_visible !== undefined ? !b.is_visible : false,
    };
    setBooks(nextBooks);
    if (isAdmin) {
      await saveSettingsApi({
        recommended_books: nextBooks,
      });
    }
  };

  // Nếu không có sách và không phải admin thì ẩn khối
  if (books.length === 0 && !isAdmin) {
    return null;
  }

  const selectedUnifiedBook: UnifiedBookItem | null = selectedBook
    ? {
        id: selectedBook.id,
        title: selectedBook.title,
        cover_url: selectedBook.cover_url,
        author: selectedBook.author,
        description: selectedBook.description,
        youtube_url: selectedBook.youtube_url,
        gallery_images: selectedBook.gallery_images,
        flipbook_pages: selectedBook.flipbook_pages,
        pages: (selectedBook as any)?.pages,
        file_url: selectedBook.file_url,
        file_name: selectedBook.file_name,
        pdf_url: selectedBook.pdf_url,
        link_url: selectedBook.link_url,
        type: 'recommended',
      }
    : null;

  return (
    <section className="flex flex-col gap-3.5 mt-2">
      {/* KHỐI NÚT ĐIỀU KHIỂN DÀNH CHO ADMIN - ĐẶT TRÊN ĐẦU KHỐI */}
      {isAdmin && onMoveUp && onMoveDown && onOpenReorderModal && typeof sectionIndex === 'number' && typeof totalSections === 'number' && (
        <SectionOrderControls
          sectionTitle="TÀI LIỆU NÊN ĐỌC"
          sectionIndex={sectionIndex}
          totalSections={totalSections}
          isHidden={isHidden}
          onToggleVisibility={onToggleVisibility}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onOpenReorderModal={onOpenReorderModal}
          onEdit={() => setShowEditModal(true)}
          editLabel="Cài đặt khối sách"
        />
      )}

      {/* KHỐI TIẾP TỤC NGHE DỞ SÁCH NÓI (CHUẨN 1 DÒNG TINH GỌN MOBILE) */}
      {audioResume && audioResume.percent < 98 && audioResume.currentTime > 5 && (
        <div
          onClick={() => setShowResumePlayer(true)}
          className="mx-1 sm:mx-0 p-2 sm:p-2.5 rounded-2xl bg-gradient-to-r from-[#24150b] via-[#1a0e07] to-[#120904] border border-amber-500/40 shadow-md flex items-center justify-between gap-2.5 cursor-pointer hover:border-amber-400 transition-all select-none animate-in fade-in"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Headphones size={15} />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                  Đang nghe dở · {audioResume.percent}%
                </span>
              </div>
              <span className="text-xs font-bold text-amber-100 truncate">
                {audioResume.title}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="h-7 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] flex items-center gap-1 shrink-0 cursor-pointer shadow-xs active:scale-95 transition-transform"
          >
            <Play size={11} className="fill-current" />
            <span>Nghe tiếp</span>
          </button>
        </div>
      )}

      {/* TIÊU ĐỀ MỤC & BỘ CHUYỂN CHẾ ĐỘ (CHỈ HIỂN THỊ KHI KHÔNG Ở CHẾ ĐỘ KỆ GỖ 3D ĐỂ TRÁNH LẶP TIÊU ĐỀ) */}
      {layoutMode !== 'bookshelf' && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2.5">
            <h2 className="text-[18px] sm:text-[19px] font-extrabold text-[#fdf7ee] leading-tight break-words line-clamp-2 flex-1 min-w-0">
              {title}
            </h2>

            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <div className="inline-flex items-center bg-[#24170e] border border-[#3d2617] rounded-[10px] p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => toggleLayoutMode('bookshelf')}
                  className="h-7 px-2 rounded-[7px] flex items-center gap-1 transition-all cursor-pointer text-[#9e8574] hover:text-amber-200"
                  title="Kệ sách gỗ 3D sang trọng chuẩn SideBooks"
                  aria-label="Kệ sách gỗ 3D"
                >
                  <BookOpen size={13} strokeWidth={2.5} />
                  <span className="text-[11px] hidden xs:inline font-bold">Kệ 3D</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleLayoutMode('grid')}
                  className={`w-7 h-7 rounded-[7px] flex items-center justify-center transition-all cursor-pointer ${
                    layoutMode === 'grid'
                      ? 'bg-amber-600 text-amber-100 shadow-xs font-bold'
                      : 'text-[#9e8574] hover:text-amber-200'
                  }`}
                  title="Xem dạng lưới 2 cột"
                  aria-label="Xem dạng lưới 2 cột"
                >
                  <LayoutGrid size={13} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() => toggleLayoutMode('lookbook')}
                  className={`w-7 h-7 rounded-[7px] flex items-center justify-center transition-all cursor-pointer ${
                    layoutMode === 'lookbook'
                      ? 'bg-amber-600 text-amber-100 shadow-xs font-bold'
                      : 'text-[#9e8574] hover:text-amber-200'
                  }`}
                  title="Xem dạng danh sách chi tiết"
                  aria-label="Xem dạng danh sách chi tiết"
                >
                  <List size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NỘI DUNG DANH SÁCH SÁCH */}
      {books.length === 0 && isAdmin ? (
        <div
          onClick={() => setShowEditModal(true)}
          className="p-8 rounded-[24px] bg-white border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-2 text-center cursor-pointer hover:bg-primary-soft/20 transition-colors shadow-2xs"
        >
          <div className="w-12 h-12 rounded-full bg-primary-soft text-primary flex items-center justify-center">
            <Plus size={24} />
          </div>
          <h3 className="text-[16px] font-extrabold text-ink">
            Chưa có cuốn sách nào được thêm
          </h3>
          <p className="text-[13px] text-muted max-w-[320px]">
            Nhấn vào đây để thêm các đầu sách khuyên đọc với bìa 3D hiện đại và thông tin chuyên sâu.
          </p>
        </div>
      ) : layoutMode === 'bookshelf' ? (
        /* =================== KIỂU 0: KỆ SÁCH GỖ 3D CHUẨN SIDEBOOKS =================== */
        <WoodenBookshelf
          books={books}
          isAdmin={isAdmin}
          title={title}
          appName={appName}
          logoUrl={logoUrl}
          onOpenWelcome={onOpenWelcome}
          onOpenAdminSettings={onOpenAdminSettings}
          onOpenEditApp={onOpenEditApp}
          onOpenAddBookModal={handleOpenAddSingleBook}
          onOpenUserSync={onOpenUserSync}
          onOpenPwaInstall={onOpenPwaInstall}
          onLogout={onLogout}
          badgeText="SideBooks 3D"
          layoutMode={layoutMode}
          onToggleLayoutMode={toggleLayoutMode}
          onSelectBook={(book) => setSelectedBook(book)}
          onReadBook3D={(book) => setSideBooksModalBook(book)}
          onEditSingleBook={(book) => setEditingSingleBook(book)}
          onToggleBookVisibility={handleToggleBookVisibility}
          onMoveBook={handleMoveBook}
          onDeleteBook={handleDeleteBook}
        />
      ) : layoutMode === 'lookbook' ? (
        /* =================== KIỂU 1: LOOKBOOK CHUYÊN NGHIỆP (CÂN ĐỐI, KHÔNG RỚT CHỮ) =================== */
        <div className="flex flex-col gap-3">
          {books.map((book, idx) => {
            const isBookHidden = book.is_visible === false;
            if (isBookHidden && !isAdmin) return null;

            return (
              <ScrollReveal
                key={book.id || idx}
                animation="book-cascade"
                delay={idx * 120}
              >
                <div
                  className={`p-3.5 sm:p-4 rounded-[14px] bg-[#22150c] text-[#fdf7ee] border border-[#3d2617] shadow-sm hover:border-amber-500/60 hover:shadow-[0_12px_28px_rgba(0,0,0,0.6)] hover:-translate-y-1.5 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 flex flex-row gap-3 sm:gap-4.5 group relative ${
                    isBookHidden ? 'opacity-70 border-dashed border-amber-300' : ''
                  }`}
                >
                  {/* BÊN TRÁI: Bìa sách 3D to rõ chuẩn tỷ lệ 3:4 với ModernBookCover */}
                  <div
                    onClick={() => setSelectedBook(book)}
                    className="w-[116px] sm:w-[138px] shrink-0 pt-0.5 relative cursor-pointer"
                  >
                    <ModernBookCover
                      title={book.title}
                      coverUrl={book.cover_url}
                      author={book.author}
                      index={idx}
                      badgeText={book.badge_tag || book.tag || 'NÊN ĐỌC'}
                    />
                    {isBookHidden && isAdmin && (
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 text-amber-300 text-[9.5px] font-black z-10">
                        Ẩn tạm
                      </div>
                    )}
                  </div>

                  {/* BÊN PHẢI: Tiêu đề xanh navy như ảnh, Mô tả 1 dòng, Khung Xem thử 3D vàng sáng cân xứng, Chi tiết sách ở DƯỚI */}
                  <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                    <div className="flex flex-col gap-1">
                      <h3
                        onClick={() => setSelectedBook(book)}
                        className="text-[15px] sm:text-[16.5px] font-bold text-[#1D3985] dark:text-[#93C5FD] leading-snug line-clamp-2 break-normal group-hover:text-blue-700 dark:group-hover:text-amber-300 transition-colors cursor-pointer"
                      >
                        {book.title}
                      </h3>
                      {book.description && (
                        <p className="text-[12px] sm:text-[12.5px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-normal font-normal">
                          {book.description}
                        </p>
                      )}
                    </div>

                    {/* CỤM HÀNH ĐỘNG: Xem thử 3D màu vàng sáng full bề ngang, Chi tiết sách ở DƯỚI */}
                    <div className="pt-2 flex flex-col gap-1.5 mt-auto">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSideBooksModalBook(book);
                        }}
                        className="animate-bubble-float relative w-full h-[36px] sm:h-[38px] rounded-xl bg-gradient-to-r from-[#FEF08A] via-[#FACC15] to-[#EAB308] hover:from-[#FFF59D] hover:to-[#F59E0B] text-[#1E293B] font-bold text-[12px] sm:text-[12.5px] shadow-[0_2px_12px_rgba(250,204,21,0.32)] flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer border border-[#FDE047]"
                        title="Xem thử 3D"
                      >
                        <BookOpen size={14} strokeWidth={2.2} className="shrink-0 text-[#1E293B]" />
                        <span className="tracking-wide">Xem thử 3D</span>
                      </button>

                      <div className="flex items-center justify-center">
                        <span
                          onClick={() => setSelectedBook(book)}
                          className="text-[11.5px] sm:text-[12px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white inline-flex items-center gap-0.5 cursor-pointer transition-colors"
                        >
                          <span>Chi tiết sách</span>
                          <ChevronRight size={12} strokeWidth={2} />
                        </span>
                      </div>
                    </div>

                    {isAdmin && (
                      <div
                        className="mt-2 pt-1.5 border-t border-dashed border-[#2D5B94]/25 dark:border-slate-800 flex items-center justify-between gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted">
                          Quản trị:
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveBook(idx, 'up')}
                            className="w-6.5 h-6.5 rounded-[7px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                            title="Chuyển sách lên trên"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === books.length - 1}
                            onClick={() => handleMoveBook(idx, 'down')}
                            className="w-6.5 h-6.5 rounded-[7px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                            title="Chuyển sách xuống dưới"
                          >
                            <ArrowDown size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleBookVisibility(idx)}
                            className={`w-6.5 h-6.5 rounded-[7px] flex items-center justify-center cursor-pointer transition-colors shadow-2xs ${
                              isBookHidden
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-200'
                            }`}
                            title={isBookHidden ? 'Cuốn sách này đang ẨN với khách – Bấm để HIỆN' : 'Cuốn sách này đang HIỆN – Bấm để ẨN TẠM'}
                          >
                            {isBookHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSingleBook(book)}
                            className="flex items-center gap-1 h-6.5 px-2 rounded-[7px] bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 dark:bg-slate-800 dark:text-amber-200 dark:border-amber-700/40 text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                            title="Sửa cuốn sách này"
                          >
                            <Edit2 size={11} />
                            <span>Sửa</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBook(idx)}
                            className="w-6.5 h-6.5 rounded-[7px] bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                            title="Xóa cuốn sách này"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      ) : (
        /* =================== KIỂU 2: LƯỚI 2 CỘT HIỆN ĐẠI (MODERN LUXURY GRID) =================== */
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {books.map((book, idx) => {
            const isBookHidden = book.is_visible === false;
            if (isBookHidden && !isAdmin) return null;

            return (
              <ScrollReveal
                key={book.id || idx}
                animation="book-cascade"
                delay={idx * 120}
              >
                <div
                  onClick={() => setSelectedBook(book)}
                  className={`group p-3 sm:p-3.5 rounded-[14px] bg-white text-slate-900 border border-slate-200/80 shadow-xs hover:shadow-lg hover:shadow-blue-950/10 hover:border-[#1E3A8A]/50 dark:hover:border-[#F8DF7B]/60 dark:hover:shadow-[0_12px_28px_rgba(248,223,123,0.15)] hover:-translate-y-1.5 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 flex flex-col cursor-pointer relative h-full ${
                    isBookHidden ? 'opacity-70 border-dashed border-amber-300' : ''
                  }`}
                >
                  {/* BÌA SÁCH 3D HIỆN ĐẠI */}
                  <div className="w-full px-1 pt-1 pb-1.5 flex justify-center relative">
                    <ModernBookCover
                      title={book.title}
                      coverUrl={book.cover_url}
                      author={book.author}
                      index={idx}
                      badgeText={book.badge_tag || book.tag || 'NÊN ĐỌC'}
                    />
                    {isBookHidden && isAdmin && (
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 text-amber-300 text-[9.5px] font-black z-10">
                        Ẩn tạm
                      </div>
                    )}
                  </div>

                  {/* NỘI DUNG CHÂN THẺ */}
                  <div className="flex-1 flex flex-col pt-1 gap-1.5 min-w-0">
                    <h3 className="text-[13.5px] sm:text-[14.5px] font-bold text-[#1D3985] dark:text-[#93C5FD] leading-snug line-clamp-2 min-h-[34px] group-hover:text-blue-700 dark:group-hover:text-amber-300 transition-colors">
                      {book.title}
                    </h3>

                    {/* KHUNG HÀNH ĐỘNG DẠNG LƯỚI: Nút 3D vàng sáng full bề ngang, Chi tiết ở DƯỚI */}
                    <div className="mt-auto pt-2 flex flex-col gap-1.5 border-t border-slate-100 dark:border-white/10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSideBooksModalBook(book);
                        }}
                        className="animate-bubble-float relative w-full h-[34px] sm:h-[36px] rounded-xl bg-gradient-to-r from-[#FEF08A] via-[#FACC15] to-[#EAB308] hover:from-[#FFF59D] hover:to-[#F59E0B] text-[#1E293B] font-bold text-[11.5px] sm:text-[12px] shadow-[0_2px_10px_rgba(250,204,21,0.28)] flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer border border-[#FDE047]"
                        title="Xem thử 3D"
                      >
                        <BookOpen size={13} strokeWidth={2.2} className="shrink-0 text-[#1E293B]" />
                        <span className="tracking-wide">Xem thử 3D</span>
                      </button>

                      <div className="flex items-center justify-center">
                        <span
                          onClick={() => setSelectedBook(book)}
                          className="text-[11px] sm:text-[11.5px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white inline-flex items-center gap-0.5 cursor-pointer transition-colors"
                        >
                          <span>Chi tiết sách</span>
                          <ChevronRight size={11} strokeWidth={2} />
                        </span>
                      </div>
                    </div>

                    {isAdmin && (
                      <div
                        className="mt-1.5 pt-1 border-t border-dashed border-[#2D5B94]/25 dark:border-slate-800 flex items-center justify-between gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[9.5px] font-extrabold uppercase text-muted">Quản trị</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveBook(idx, 'up')}
                            className="w-5.5 h-5.5 rounded-[5px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer transition-colors"
                            title="Chuyển sách lên trên"
                          >
                            <ArrowUp size={11} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === books.length - 1}
                            onClick={() => handleMoveBook(idx, 'down')}
                            className="w-5.5 h-5.5 rounded-[5px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer transition-colors"
                            title="Chuyển sách xuống dưới"
                          >
                            <ArrowDown size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleBookVisibility(idx)}
                            className={`w-5.5 h-5.5 rounded-[5px] flex items-center justify-center cursor-pointer transition-colors ${
                              isBookHidden
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-200'
                            }`}
                            title={isBookHidden ? 'Hiện' : 'Ẩn'}
                          >
                            {isBookHidden ? <EyeOff size={11} /> : <Eye size={11} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSingleBook(book)}
                            className="w-5.5 h-5.5 rounded-[5px] bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 dark:bg-slate-800 dark:text-amber-200 dark:border-amber-700/40 flex items-center justify-center cursor-pointer transition-colors"
                            title="Sửa cuốn sách này"
                          >
                            <Edit2 size={10} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBook(idx)}
                            className="w-5.5 h-5.5 rounded-[5px] bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300 flex items-center justify-center cursor-pointer transition-colors"
                            title="Xóa sách"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      )}

      {/* MODAL CHI TIẾT SÁCH TOÀN DIỆN (VIDEO YOUTUBE + BỘ SƯU TẬP ẢNH BÊN TRONG CÓ PHÓNG TO) */}
      <BookDetailModal
        book={selectedUnifiedBook}
        isAdmin={isAdmin}
        hotline={hotline}
        zaloUrl={zaloUrl}
        onClose={() => setSelectedBook(null)}
        onReadBook3D={(bookItem) => {
          const target = books.find((b) => b.id === bookItem?.id) || selectedBook || bookItem;
          setSelectedBook(null);
          if (target) setSideBooksModalBook(target as RecommendedBook);
        }}
        onEdit={() => {
          const b = selectedBook;
          setSelectedBook(null);
          setEditingSingleBook(b);
        }}
      />

      {/* MODAL QUẢN TRỊ VIÊN SỬA SÁCH */}
      <EditRecommendedBooksModal
        isOpen={showEditModal}
        initialTitle={title}
        initialSubtitle={subtitle}
        initialBooks={books}
        initialLayout={layoutMode}
        onClose={() => setShowEditModal(false)}
        onSaved={handleSaved}
      />

      {/* CUỐN SÁCH LẬT TRANG 3D ĐỌC THỬ (CHÂN THỰC TOÀN MÀN HÌNH THEO YÊU CẦU NGƯỜI DÙNG) */}
      <FlipbookViewer
        mode="modal-only"
        isOpen={Boolean(flipbookPreviewBook)}
        book={flipbookPreviewBook}
        title={flipbookPreviewBook?.title ? `Đọc thử tài liệu 3D: ${flipbookPreviewBook.title}` : 'Đọc thử tài liệu 3D'}
        onClose={() => setFlipbookPreviewBook(null)}
      />

      {/* MODAL SỬA ĐÚNG 1 CUỐN SÁCH NÊN ĐỌC */}
      <EditSingleRecommendedBookModal
        isOpen={Boolean(editingSingleBook)}
        book={editingSingleBook}
        onClose={() => setEditingSingleBook(null)}
        onSaved={handleSaveSingleBook}
      />

      {/* TRÌNH ĐỌC SÁCH 3D CHUẨN SIDEBOOKS TOKYO INTERPLAY */}
      <SideBooksReaderModal
        isOpen={Boolean(sideBooksModalBook)}
        title={sideBooksModalBook?.title || 'Tài Liệu Y Khoa'}
        author={sideBooksModalBook?.author}
        pages={sideBooksModalBook ? getBookReaderPageUrls(sideBooksModalBook) : []}
        initialPage={sideBooksInitialPage}
        pdfUrl={sideBooksModalBook?.pdf_url || sideBooksModalBook?.file_url}
        fileUrl={sideBooksModalBook?.file_url || sideBooksModalBook?.pdf_url}
        fileName={sideBooksModalBook?.file_name}
        coverUrl={sideBooksModalBook?.cover_url}
        onClose={() => {
          setSideBooksModalBook(null);
          setSideBooksInitialPage(0);
        }}
      />

      {/* TRÌNH PHÁT SÁCH NÓI MP3 CHUYÊN NGHIỆP */}
      {audioResume && (
        <AudiobookPlayerModal
          isOpen={showResumePlayer}
          onClose={() => {
            setShowResumePlayer(false);
            setAudioResume(getLastListenedAudiobook());
          }}
          book={audioResume}
        />
      )}
    </section>
  );
}
