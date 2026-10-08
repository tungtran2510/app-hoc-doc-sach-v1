'use client';

import React, { useState, useEffect } from 'react';
import {
  Download,
  CheckCircle2,
  BookOpen,
  Headphones,
  Loader2,
  Globe,
  Link as LinkIcon,
  Image as ImageIcon,
  Sparkles,
  Play,
  Upload,
} from 'lucide-react';
import {
  CURATED_ONLINE_BOOKS,
  ONLINE_CATEGORIES,
  OnlineBookItem,
  BookMedium,
  downloadAndSaveOnlineBook,
  searchOnlineGutenbergBooks,
  searchOpenLibraryBooks,
  searchOnlineLibriVoxAudiobooks,
  matchSmartKeywords,
} from '../lib/onlineLibraryData';
import { offlineStorage } from '../lib/offlineStorage';
import { playTapSound, playSuccessChime } from '../lib/audioFeedback';
import CoverCustomizerModal from './CoverCustomizerModal';
import ImportBookModal from './ImportBookModal';
import AudiobookPlayerModal from './AudiobookPlayerModal';
import BookCoverArt from './BookCoverArt';

interface OnlineLibrarySectionProps {
  searchQuery?: string;
  onOpenBook: (book: {
    id: string;
    title: string;
    author: string;
    fileUrl: string;
    coverUrl?: string;
    pages?: string[];
  }) => void;
  onPlayAudio?: (book: {
    id: string;
    title: string;
    author: string;
    coverUrl?: string;
    audioUrl?: string;
    sampleText?: string;
  }) => void;
}

export default function OnlineLibrarySection({
  searchQuery = '',
  onOpenBook,
  onPlayAudio,
}: OnlineLibrarySectionProps) {
  // Lọc theo loại sách: 'all' | 'read' (Sách đọc) | 'audio' (Sách nói)
  const [selectedMedium, setSelectedMedium] = useState<'all' | 'read' | 'audio'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Trạng thái tải của từng cuốn sách: [bookId]: progress (0-100)
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [cachedBookIds, setCachedBookIds] = useState<Set<string>>(new Set());

  // Bìa tùy biến của từng sách: [bookId]: customUrl
  const [customCovers, setCustomCovers] = useState<Record<string, string>>({});
  const [editingCoverBook, setEditingCoverBook] = useState<OnlineBookItem | null>(null);

  // Trạng thái dán link và tải file từ máy
  const [showLinkModal, setShowLinkModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [customUrl, setCustomUrl] = useState<string>('');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [isCustomDownloading, setIsCustomDownloading] = useState<boolean>(false);

  // Sách tìm kiếm mở rộng trực tuyến từ Internet (Gutenberg, Open Library, LibriVox)
  const [externalBooks, setExternalBooks] = useState<OnlineBookItem[]>([]);
  const [isSearchingExternal, setIsSearchingExternal] = useState<boolean>(false);

  // Trạng thái phát Sách Nói trực tuyến / ngoại tuyến
  const [activeAudioBook, setActiveAudioBook] = useState<{
    id: string;
    title: string;
    author: string;
    coverUrl?: string;
    audioUrl: string;
    audioNarrator?: string;
    durationFormatted?: string;
  } | null>(null);
  const [showAudioPlayer, setShowAudioPlayer] = useState<boolean>(false);

  // Quét danh sách các cuốn sách đã có trong IndexedDB và nạp bìa tùy biến từ localStorage
  useEffect(() => {
    let mounted = true;
    async function checkCached() {
      try {
        const cached = await offlineStorage.getAllCachedBooks();
        if (mounted) {
          const idSet = new Set<string>();
          cached.forEach((b) => {
            idSet.add(b.id);
            idSet.add(offlineStorage.normalizeBookId(b.id));
            if (b.fileUrl) idSet.add(offlineStorage.normalizeBookId(b.fileUrl));
          });
          setCachedBookIds(idSet);
        }

        // Đọc custom covers đã lưu
        if (typeof window !== 'undefined') {
          const loadedCovers: Record<string, string> = {};
          CURATED_ONLINE_BOOKS.forEach((b) => {
            const saved = localStorage.getItem(`custom_cover_${b.id}`);
            if (saved) loadedCovers[b.id] = saved;
          });
          setCustomCovers(loadedCovers);
        }
      } catch {}
    }
    checkCached();
    return () => {
      mounted = false;
    };
  }, []);

  // Tải sách trực tuyến về máy
  const handleDownload = async (book: OnlineBookItem) => {
    playTapSound();
    setDownloadProgress((prev) => ({ ...prev, [book.id]: 10 }));

    const activeCover = customCovers[book.id] || book.coverUrl;

    const res = await downloadAndSaveOnlineBook(
      {
        id: book.id,
        title: book.title,
        author: book.author,
        coverUrl: activeCover,
        customCoverUrl: customCovers[book.id] || null,
        downloadUrl: book.downloadUrl,
        format: book.format,
        medium: book.medium,
      },
      (pct) => {
        setDownloadProgress((prev) => ({ ...prev, [book.id]: pct }));
      }
    );

    if (res.success) {
      playSuccessChime();
      setCachedBookIds((prev) => {
        const next = new Set(prev);
        next.add(book.id);
        next.add(offlineStorage.normalizeBookId(book.id));
        return next;
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('qbiz_book_downloaded', {
            detail: {
              book: {
                id: book.id,
                title: book.title,
                author: book.author,
                coverUrl: activeCover,
                fileUrl: book.downloadUrl,
                format: book.format,
              },
            },
          })
        );
      }
    } else {
      alert(`Không thể tải sách: ${res.error || 'Vui lòng thử lại.'}`);
    }

    setDownloadProgress((prev) => {
      const next = { ...prev };
      delete next[book.id];
      return next;
    });
  };

  // Mở sách đã tải
  const handleOpenDownloaded = async (book: OnlineBookItem) => {
    playTapSound();
    const activeCover = customCovers[book.id] || book.coverUrl;

    if (book.medium === 'audio' || book.format === 'audio') {
      const cached = await offlineStorage.getBookFromOffline(book.id);
      const audioUrl = cached?.blobUrl || book.downloadUrl;
      const audioPayload = {
        id: book.id,
        title: book.title,
        author: book.author,
        coverUrl: activeCover,
        audioUrl,
        audioNarrator: book.audioNarrator,
        durationFormatted: book.durationFormatted,
      };
      setActiveAudioBook(audioPayload);
      setShowAudioPlayer(true);
      if (onPlayAudio) {
        onPlayAudio({
          ...audioPayload,
          sampleText: book.audioSampleText,
        });
      }
      return;
    }

    const cached = await offlineStorage.getBookFromOffline(book.id);
    const fileUrl = cached?.blobUrl || book.downloadUrl;
    const cleanExt = book.format;
    const fileName =
      cached?.fileName ||
      book.downloadUrl.split('/').pop()?.split('?')[0] ||
      `${book.title}.${cleanExt}`;

    onOpenBook({
      id: book.id,
      title: book.title,
      author: book.author,
      fileUrl,
      coverUrl: activeCover,
      fileName,
    } as any);
  };

  // Áp dụng bìa mới tùy biến
  const handleApplyCustomCover = async (bookId: string, newCoverUrl: string) => {
    setCustomCovers((prev) => ({ ...prev, [bookId]: newCoverUrl }));
    try {
      localStorage.setItem(`custom_cover_${bookId}`, newCoverUrl);
      await offlineStorage.updateBookCover(bookId, newCoverUrl);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('qbiz_book_metadata_updated', {
            detail: { bookId, coverUrl: newCoverUrl },
          })
        );
      }
    } catch {}
  };

  // Xử lý dán link tải
  const handleDownloadFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim() || isCustomDownloading) return;
    playTapSound();
    setIsCustomDownloading(true);

    try {
      const cleanUrl = customUrl.trim();
      let format: 'epub' | 'pdf' | 'cbz' | 'audio' = 'pdf';
      const lower = cleanUrl.toLowerCase();
      if (lower.includes('.epub')) format = 'epub';
      else if (lower.includes('.cbz') || lower.includes('.zip')) format = 'cbz';
      else if (lower.includes('.mp3') || lower.includes('.m4a') || lower.includes('.audio')) format = 'audio';

      const inferredTitle =
        customTitle.trim() ||
        cleanUrl.split('/').pop()?.split('?')[0].replace(/\.[^/.]+$/, '') ||
        'Sách Tải Trực Tuyến';

      const bookId = `custom-url-${Date.now()}`;

      const res = await downloadAndSaveOnlineBook({
        id: bookId,
        title: inferredTitle,
        author: 'Liên kết trực tiếp',
        downloadUrl: cleanUrl,
        format,
        medium: format === 'audio' ? 'audio' : 'read',
      });

      if (res.success) {
        playSuccessChime();
        setCachedBookIds((prev) => new Set(prev).add(bookId));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('qbiz_book_downloaded', {
              detail: {
                book: {
                  id: bookId,
                  title: inferredTitle,
                  author: 'Liên kết trực tiếp',
                  fileUrl: cleanUrl,
                  format,
                },
              },
            })
          );
        }
        setCustomUrl('');
        setCustomTitle('');
        setShowLinkModal(false);
      } else {
        alert(res.error || 'Lỗi khi tải từ liên kết.');
      }
    } catch (err: any) {
      alert(err?.message || 'Lỗi không xác định.');
    } finally {
      setIsCustomDownloading(false);
    }
  };

  // Tự động tìm kiếm sách mở rộng trên Internet khi người dùng gõ từ khóa (debounce 450ms)
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setExternalBooks([]);
      setIsSearchingExternal(false);
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      setIsSearchingExternal(true);
      try {
        const [gutenberg, openLib, librivox] = await Promise.all([
          searchOnlineGutenbergBooks(q),
          searchOpenLibraryBooks(q),
          searchOnlineLibriVoxAudiobooks(q),
        ]);
        if (isCancelled) return;
        const combined = [...gutenberg, ...openLib, ...librivox];
        const existingIds = new Set(CURATED_ONLINE_BOOKS.map((b) => b.id));
        const newItems = combined.filter((b) => !existingIds.has(b.id));
        setExternalBooks(newItems);
      } catch {
        // ignore
      } finally {
        if (!isCancelled) setIsSearchingExternal(false);
      }
    }, 450);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Tìm kiếm sách mở rộng trên Internet (Open Library, Gutenberg & LibriVox)
  const handleSearchOnlineSources = async () => {
    const q = searchQuery.trim();
    if (!q || isSearchingExternal) return;
    playTapSound();
    setIsSearchingExternal(true);
    try {
      const [gutenberg, openLib, librivox] = await Promise.all([
        searchOnlineGutenbergBooks(q),
        searchOpenLibraryBooks(q),
        searchOnlineLibriVoxAudiobooks(q),
      ]);
      const combined = [...gutenberg, ...openLib, ...librivox];
      const existingIds = new Set(CURATED_ONLINE_BOOKS.map((b) => b.id));
      const newItems = combined.filter((b) => !existingIds.has(b.id));
      setExternalBooks(newItems);
    } catch {}
    setIsSearchingExternal(false);
  };

  // Tổng hợp kho sách nội bộ + sách tìm kiếm từ Internet
  const allAvailableBooks = [...CURATED_ONLINE_BOOKS, ...externalBooks];

  // Lọc theo thuật toán NLP thông minh (khớp cả câu dài tự nhiên)
  const scoredBooks = allAvailableBooks.map((b) => {
    if (!searchQuery.trim()) return { book: b, matched: true, score: 1 };
    // Sách tìm kiếm từ Internet API trả về trực tiếp theo từ khóa này nên luôn hiển thị
    const isFromExternalSearch = externalBooks.some((eb) => eb.id === b.id);
    if (isFromExternalSearch) return { book: b, matched: true, score: 95 };

    const fullText = `${b.title} ${b.author} ${b.description} ${b.badgeTag} ${b.categoryName}`;
    const res = matchSmartKeywords(fullText, searchQuery);
    return { book: b, matched: res.matched, score: res.score };
  });

  const queryMatchedBooks = scoredBooks
    .filter((s) => s.matched)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.book);

  const readCount = queryMatchedBooks.filter((b) => b.medium === 'read').length;
  const audioCount = queryMatchedBooks.filter((b) => b.medium === 'audio').length;

  // Lọc theo loại sách và chuyên mục được chọn
  const filteredBooks = queryMatchedBooks.filter((b) => {
    const matchMedium = selectedMedium === 'all' || b.medium === selectedMedium;
    const matchCategory = selectedCategory === 'all' || b.category === selectedCategory;
    return matchMedium && matchCategory;
  });

  return (
    <div className="flex flex-col gap-2.5 animate-in fade-in duration-150">
      {/* 1. THANH ĐIỀU HƯỚNG TINH GỌN: LỌC SÁCH ĐỌC & SÁCH NÓI (1 DÒNG DUY NHẤT) */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 px-0.5">
        <button
          type="button"
          onClick={() => {
            playTapSound();
            setSelectedMedium('all');
          }}
          className={`h-7 px-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer border ${
            selectedMedium === 'all'
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-2xs'
              : 'bg-white/60 dark:bg-white/5 text-[#553218] dark:text-amber-200/80 border-[#d5c3b1] dark:border-white/10'
          }`}
        >
          Tất cả ({queryMatchedBooks.length})
        </button>

        <button
          type="button"
          onClick={() => {
            playTapSound();
            setSelectedMedium('read');
          }}
          className={`h-7 px-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer border flex items-center gap-1 ${
            selectedMedium === 'read'
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-2xs'
              : 'bg-white/60 dark:bg-white/5 text-[#553218] dark:text-amber-200/80 border-[#d5c3b1] dark:border-white/10'
          }`}
        >
          <BookOpen size={12} />
          <span>Sách đọc ({readCount})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playTapSound();
            setSelectedMedium('audio');
          }}
          className={`h-7 px-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer border flex items-center gap-1 ${
            selectedMedium === 'audio'
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-2xs'
              : 'bg-white/60 dark:bg-white/5 text-[#553218] dark:text-amber-200/80 border-[#d5c3b1] dark:border-white/10'
          }`}
        >
          <Headphones size={12} />
          <span>Sách nói ({audioCount})</span>
        </button>

        {/* Nút Tải tệp từ máy */}
        <button
          type="button"
          onClick={() => {
            playTapSound();
            setShowImportModal(true);
          }}
          className="h-7 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-all ml-auto"
          title="Đưa sách từ máy (.epub, .pdf, .cbz) vào thư viện"
        >
          <Upload size={11} />
          <span>Tải tệp</span>
        </button>

        {/* Nút Dán link trực tiếp */}
        <button
          type="button"
          onClick={() => {
            playTapSound();
            setShowLinkModal(true);
          }}
          className="h-7 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-all"
          title="Tải từ liên kết trực tiếp"
        >
          <LinkIcon size={11} />
          <span>Dán link</span>
        </button>
      </div>

      {/* 2. CHUYÊN MỤC / NGUỒN SÁCH: SÁCH VIỆT NAM, THẾ GIỚI, Y HỌC (1 DÒNG CHIP) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
        {ONLINE_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                playTapSound();
                setSelectedCategory(cat.id);
              }}
              className={`h-6 px-2.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-amber-600 text-white border-amber-600 font-bold shadow-xs'
                  : 'bg-white/40 dark:bg-white/5 text-[#553218] dark:text-stone-300 border-[#d5c3b1] dark:border-white/10 hover:border-amber-500/50'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* 2. DANH SÁCH SÁCH TRỰC TUYẾN (SÁCH ĐỌC & SÁCH NÓI ĐỒNG BỘ) */}
      <div className="flex flex-col gap-2">
        {filteredBooks.map((book) => {
          const isCached =
            cachedBookIds.has(book.id) ||
            cachedBookIds.has(offlineStorage.normalizeBookId(book.id)) ||
            cachedBookIds.has(offlineStorage.normalizeBookId(book.downloadUrl));
          const progress = downloadProgress[book.id];
          const isDownloading = progress !== undefined;
          const displayCover = customCovers[book.id] || book.coverUrl;

          return (
            <div
              key={book.id}
              className="p-2.5 rounded-2xl bg-white dark:bg-[#1f130b] border border-[#e8ded1] dark:border-white/10 hover:border-amber-500/40 shadow-xs flex items-center gap-2.5 transition-all"
            >
              {/* Ảnh bìa + Nút sửa bìa nhỏ ở góc */}
              <div className="relative w-14 aspect-[1/1.42] rounded-md overflow-hidden shrink-0 shadow-xs group">
                <BookCoverArt
                  coverUrl={displayCover}
                  title={book.title}
                  author={book.author}
                  format={book.format}
                  medium={book.medium}
                  className="w-full h-full"
                />

                {/* Nút chỉnh bìa nhỏ tinh gọn */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playTapSound();
                    setEditingCoverBook(book);
                  }}
                  className="absolute bottom-0.5 right-0.5 z-20 w-5 h-5 rounded bg-black/75 hover:bg-amber-500 text-white hover:text-slate-950 flex items-center justify-center cursor-pointer transition-colors shadow-xs"
                  title="Tùy biến ảnh bìa sách"
                >
                  <ImageIcon size={10} />
                </button>
              </div>

              {/* Thông tin sách: Tối ưu chặt chẽ từng dòng */}
              <div className="flex-1 min-w-0 flex flex-col justify-between h-full gap-0.5">
                {/* Hàng 1: Badge loại sách + Tác giả (1 dòng) */}
                <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                  <span
                    className={`px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase font-mono shrink-0 ${
                      book.medium === 'audio'
                        ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300'
                        : 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    {book.badgeTag}
                  </span>
                  <span className="text-[11px] text-[#7A4B27] dark:text-amber-300/80 font-semibold truncate">
                    {book.author}
                  </span>
                </div>

                {/* Hàng 2: Tựa sách (1 dòng truncate chống phình) */}
                <h4 className="text-xs font-black text-[#2A160A] dark:text-[#fdf7ee] truncate">
                  {book.title}
                </h4>

                {/* Hàng 3: Metadata tinh gọn 1 dòng + Nút hành động 1 dòng */}
                <div className="flex items-center justify-between gap-1 pt-1 border-t border-amber-900/10 dark:border-white/5 mt-0.5">
                  {/* Metadata 1 dòng: Qbiz • 1.8 MB hoặc Audio • 28 phút */}
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate whitespace-nowrap">
                    {book.source} • {book.durationFormatted || book.fileSizeFormatted}
                  </span>

                  {isCached ? (
                    <button
                      type="button"
                      onClick={() => handleOpenDownloaded(book)}
                      className="h-6 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-[11px] font-black flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap shrink-0 shadow-2xs"
                    >
                      {book.medium === 'audio' ? <Play size={11} className="fill-current" /> : <BookOpen size={11} />}
                      <span>{book.medium === 'audio' ? 'Nghe ngay' : 'Đọc ngay'}</span>
                    </button>
                  ) : isDownloading ? (
                    <div className="h-6 px-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[10.5px] font-bold flex items-center gap-1 whitespace-nowrap shrink-0">
                      <Loader2 size={11} className="animate-spin" />
                      <span>{progress}%</span>
                    </div>
                  ) : book.medium === 'audio' ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenDownloaded(book)}
                        className="h-6 px-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 active:scale-95 text-slate-950 text-[11px] font-black flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap shrink-0 shadow-2xs"
                      >
                        <Play size={11} className="fill-current" />
                        <span>Nghe ngay</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(book)}
                        className="h-6 w-6 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-center justify-center cursor-pointer transition-all shrink-0"
                        title="Tải nghe ngoại tuyến"
                      >
                        <Download size={11} strokeWidth={2.4} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDownload(book)}
                      className="h-6 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-[11px] font-black flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap shrink-0 shadow-2xs"
                    >
                      <Download size={11} strokeWidth={2.5} />
                      <span>Tải về</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredBooks.length === 0 && (
          <div className="py-7 px-3 rounded-2xl bg-white/40 dark:bg-white/5 border border-dashed border-amber-500/20 text-center flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
            <BookOpen size={24} className="text-amber-500 opacity-60" />
            <span className="text-xs font-bold text-[#2A160A] dark:text-amber-100">
              Không tìm thấy sách trực tuyến phù hợp
            </span>
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={handleSearchOnlineSources}
                disabled={isSearchingExternal}
                className="h-8 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-all disabled:opacity-50"
              >
                {isSearchingExternal ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Globe size={13} />
                )}
                <span>Tìm trên Kho Mở Quốc Tế (Gutenberg, LibriVox & Open Library)</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* MODAL TÙY BIẾN BÌA SÁCH */}
      {editingCoverBook && (
        <CoverCustomizerModal
          isOpen={Boolean(editingCoverBook)}
          bookTitle={editingCoverBook.title}
          defaultCoverUrl={editingCoverBook.coverUrl}
          currentCoverUrl={customCovers[editingCoverBook.id] || editingCoverBook.coverUrl}
          onClose={() => setEditingCoverBook(null)}
          onApplyCover={(newUrl) => handleApplyCustomCover(editingCoverBook.id, newUrl)}
        />
      )}

      {/* MODAL PHÁT SÁCH NÓI MP3 */}
      {activeAudioBook && (
        <AudiobookPlayerModal
          isOpen={showAudioPlayer}
          onClose={() => setShowAudioPlayer(false)}
          book={activeAudioBook}
          isDownloaded={cachedBookIds.has(activeAudioBook.id)}
          onDownload={() => {
            const found = allAvailableBooks.find((b) => b.id === activeAudioBook.id);
            if (found) handleDownload(found);
          }}
        />
      )}

      {/* MODAL DÁN LINK TẢI TRỰC TIẾP (POPOVER TINH GỌN) */}
      {showLinkModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in select-none"
          onClick={() => setShowLinkModal(false)}
        >
          <form
            onSubmit={handleDownloadFromUrl}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[360px] rounded-3xl p-4 bg-[#1c120a] border border-amber-500/30 text-white flex flex-col gap-3 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <LinkIcon size={14} />
                <span>Dán liên kết tải sách trực tiếp</span>
              </span>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <input
              type="url"
              required
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="Dán link .epub, .pdf, .cbz..."
              className="w-full h-9 px-3 rounded-xl border border-white/15 bg-black/40 text-xs focus:outline-none focus:border-amber-500"
            />

            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Tên sách (Tùy chọn)"
              className="w-full h-8 px-3 rounded-xl border border-white/15 bg-black/40 text-xs focus:outline-none focus:border-amber-500"
            />

            <button
              type="submit"
              disabled={isCustomDownloading}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-md"
            >
              {isCustomDownloading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Đang tải vào máy...</span>
                </>
              ) : (
                <>
                  <Download size={13} strokeWidth={2.5} />
                  <span>Kéo về máy & Đọc ngay</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}
      {/* MODAL NHẬP TỆP SÁCH TỪ MÁY */}
      <ImportBookModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={(newBook) => {
          setCachedBookIds((prev) => new Set(prev).add(newBook.id));
        }}
      />
    </div>
  );
}
