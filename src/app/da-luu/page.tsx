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
} from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import SideBooksReaderModal from '../../components/SideBooksReaderModal';
import { getBookReaderPageUrls } from '../../lib/bookReaderPages';

interface SavedItem {
  id: string;
  title: string;
  category: string;
  badgeType: 'video' | 'book';
  badgeNumber?: string;
  coverUrl: string;
  subtitle: string;
  pages?: string[];
  initialPage: number;
}

const DEFAULT_CURATED_SAVED: SavedItem[] = [
  {
    id: 'curated-1',
    title: '03. Điều trị thoát vị đĩa đệm ít xâm lấn (BV Tâm Anh)',
    category: 'Đĩa đệm và cơ chế giảm xóc',
    badgeType: 'video',
    coverUrl: '/documents/covers/cover_hieu_dung_ve_cot_song.png',
    subtitle: 'Đĩa đệm và cơ chế giảm xóc',
    initialPage: 2,
  },
  {
    id: 'curated-2',
    title: '02. Cơ chế hình thành thoát vị đĩa đệm 3D',
    category: 'Đĩa đệm và cơ chế giảm xóc',
    badgeType: 'video',
    coverUrl: '/documents/covers/cover_cot-song.png',
    subtitle: 'Đĩa đệm và cơ chế giảm xóc',
    initialPage: 1,
  },
  {
    id: 'curated-3',
    title: 'Đĩa đệm và cơ chế giảm xóc',
    category: 'CỘT SỐNG',
    badgeType: 'book',
    badgeNumber: '#2',
    coverUrl: '/documents/covers/cover_giai_ma_cot_song.png',
    subtitle: 'Cột sống',
    initialPage: 1,
  },
  {
    id: 'curated-4',
    title: 'Tổng quan về cột sống',
    category: 'CỘT SỐNG',
    badgeType: 'book',
    badgeNumber: '#1',
    coverUrl: '/documents/covers/cover_cam_nang_dot_song_co.png',
    subtitle: 'Cột sống',
    initialPage: 0,
  },
];

export default function SavedBooksPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'grid' | 'compact' | 'list'>('grid');
  const [userBookmarks, setUserBookmarks] = useState<SavedItem[]>([]);
  const [removedCuratedIds, setRemovedCuratedIds] = useState<string[]>([]);

  // Đang học dở / Đang đọc dở state
  const [continueBook, setContinueBook] = useState<{
    title: string;
    subtitle: string;
    coverUrl: string;
    page: number;
    totalPages: number;
    percent: number;
  }>({
    title: 'Đại tràng & Cơ chế bài tiết',
    subtitle: 'Hệ Tiêu Hóa · 02. Căn nguyên gốc rễ của táo bón...',
    coverUrl: '/documents/covers/cover_tieu-hoa.png',
    page: 4,
    totalPages: 8,
    percent: 50,
  });

  const [activeReaderBook, setActiveReaderBook] = useState<{
    title: string;
    author?: string;
    pages: string[];
    initialPage: number;
  } | null>(null);

  // Load last read & bookmarks
  const loadData = () => {
    try {
      // 1. Load Last Read Book
      const lastTitle = localStorage.getItem('last_read_book_title');
      if (lastTitle) {
        const lastPageStr = localStorage.getItem(`last_read_page_${lastTitle}`);
        const pIdx = lastPageStr ? parseInt(lastPageStr, 10) : 0;
        const bookPages = getBookReaderPageUrls({
          id: lastTitle,
          title: lastTitle,
          description: '',
          cover_url: null,
        } as any);
        const tPages = Math.max(1, bookPages.length);
        const calcPercent = Math.max(10, Math.min(100, Math.round(((pIdx + 1) / tPages) * 100)));

        setContinueBook({
          title: lastTitle,
          subtitle: `Tủ Sách Y Khoa · Trang ${pIdx + 1}/${tPages}`,
          coverUrl: bookPages[0] || '/documents/covers/cover_tieu-hoa.png',
          page: pIdx,
          totalPages: tPages,
          percent: calcPercent,
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
            const bookPages = getBookReaderPageUrls({
              id: title,
              title,
              description: '',
              cover_url: null,
            } as any);
            for (const pIdx of pageIndices) {
              dynamicItems.push({
                id: `dynamic-${title}-${pIdx}`,
                title: `${title} - Trang ${pIdx + 1}`,
                category: 'TỦ SÁCH Y KHOA',
                badgeType: 'book',
                badgeNumber: `#${pIdx + 1}`,
                coverUrl: bookPages[pIdx] || bookPages[0] || '/documents/covers/cover_hieu_dung_ve_cot_song.png',
                subtitle: `Đã đánh dấu tại trang ${pIdx + 1}`,
                pages: bookPages,
                initialPage: pIdx,
              });
            }
          }
        }
      }
      setUserBookmarks(dynamicItems);
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    document.title = 'Đã lưu · Qbiz Books';
    loadData();
  }, []);

  const allSavedItems = useMemo(() => {
    const visibleCurated = DEFAULT_CURATED_SAVED.filter(
      (c) => !removedCuratedIds.includes(c.id)
    );
    return [...userBookmarks, ...visibleCurated];
  }, [userBookmarks, removedCuratedIds]);

  const handleToggleRemove = (item: SavedItem) => {
    if (item.id.startsWith('curated-')) {
      setRemovedCuratedIds((prev) => [...prev, item.id]);
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
    });
  };

  return (
    <main className="flex-1 flex flex-col px-3 sm:px-4 pt-3 pb-24 gap-4 max-w-[640px] w-full mx-auto select-none">
      {/* 1. HEADER CHÍNH: ĐÃ LƯU */}
      <section className="flex flex-col gap-1 pt-1">
        <h1 className="text-2xl sm:text-3xl font-black text-amber-200 tracking-tight">
          Đã lưu
        </h1>
        <p className="text-xs text-amber-100/70">
          Lưu bài học, video, sách và danh sách phát để xem lại.
        </p>
      </section>

      {/* 2. SECTION Ở ĐẦU: ĐANG HỌC DỞ / ĐANG ĐỌC DỞ (NHƯ ẢNH USER GỬI) */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wide">
          <PlayCircle size={15} className="fill-amber-400/20 text-amber-400" />
          <span>ĐANG HỌC DỞ</span>
        </div>

        {/* Card Đang học dở lớn */}
        <div className="p-3.5 rounded-3xl bg-[#22150c] border border-[#553622] shadow-xl flex flex-col gap-3.5 transition-all">
          <div className="flex items-center gap-3">
            {/* Ảnh bìa bên trái có biểu tượng play/book ở góc dưới */}
            <div className="relative w-28 sm:w-36 aspect-[16/10] rounded-2xl overflow-hidden bg-[#160e08] shrink-0 border border-white/10 shadow-md">
              <img
                src={continueBook.coverUrl}
                alt={continueBook.title}
                className="w-full h-full object-cover"
                loading="eager"
              />
              <div className="absolute bottom-1.5 left-1.5 w-6 h-6 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-amber-300 border border-white/20">
                <PlayCircle size={13} className="fill-amber-400 text-black" />
              </div>
            </div>

            {/* Thông tin bài học bên phải */}
            <div className="flex flex-col min-w-0 flex-1 gap-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 tracking-wide uppercase">
                <PlayCircle size={11} />
                <span>ĐANG XEM DỞ</span>
              </div>
              <h2 className="text-sm font-bold text-amber-100 line-clamp-2 leading-snug">
                {continueBook.title}
              </h2>
              <p className="text-[11px] text-[#9e8574] truncate">
                {continueBook.subtitle}
              </p>

              {/* Thanh tiến độ học / đọc dở */}
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-[#160e08] rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-linear-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-300"
                    style={{ width: `${continueBook.percent}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono font-bold text-amber-300 shrink-0">
                  {continueBook.percent}%
                </span>
              </div>
            </div>
          </div>

          {/* Nút to Tiếp tục học / đọc tràn ngang dưới cùng của card */}
          <button
            type="button"
            onClick={handleContinueReading}
            className="w-full py-2.5 px-4 rounded-2xl bg-[#2e1d12] hover:bg-amber-500 hover:text-slate-950 border border-amber-500/40 text-amber-200 font-extrabold text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer group"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 group-hover:bg-slate-950 transition-colors" />
            <span>Tiếp tục học</span>
            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* 3. SECTION: ĐÃ LƯU GẦN ĐÂY */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wide">
            <Bookmark size={15} className="fill-amber-400 text-amber-400" />
            <span>ĐÃ LƯU GẦN ĐÂY</span>
          </div>

          {/* Bộ chọn 3 chế độ xem (List, Compact, Grid) như ảnh user gửi */}
          <div className="p-0.5 rounded-xl bg-[#22150c] border border-[#553622] flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Danh sách lớn"
              aria-label="Chế độ danh sách lớn"
            >
              <List size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('compact')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'compact'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Danh sách thu gọn"
              aria-label="Chế độ danh sách thu gọn"
            >
              <Rows size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Lưới ô vuông"
              aria-label="Chế độ lưới ô vuông"
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>

        {/* NỘI DUNG DANH SÁCH ĐÃ LƯU */}
        {allSavedItems.length === 0 ? (
          <div className="py-12 px-4 rounded-3xl bg-[#22150c] border border-[#553622] flex flex-col items-center justify-center text-center gap-2.5">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-amber-400">
              <Bookmark size={22} />
            </div>
            <h3 className="text-xs font-bold text-amber-100">Chưa có mục nào được lưu</h3>
            <p className="text-[11px] text-amber-200/60 max-w-xs">
              Bấm biểu tượng Dấu trang khi đọc sách để lưu lại các trang quan trọng tại đây.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          /* ================= GIAO DIỆN LƯỚI (GRID) - ẢNH 1 ================= */
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {allSavedItems.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-2xl bg-[#22150c] border border-[#553622] hover:border-amber-500/60 shadow-md flex flex-col justify-between gap-2.5 transition-all group"
              >
                {/* Dòng trên: Badge loại (VIDEO / CỘT SỐNG) + Nút Bookmark */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 tracking-wider uppercase">
                    {item.badgeType === 'video' ? (
                      <>
                        <PlayCircle size={11} />
                        <span>VIDEO</span>
                      </>
                    ) : (
                      <>
                        <BookOpen size={11} />
                        <span className="truncate">{item.category}</span>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleRemove(item);
                    }}
                    className="w-6 h-6 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 hover:text-red-400 transition-colors cursor-pointer"
                    title="Bỏ lưu"
                  >
                    <Bookmark size={12} className="fill-amber-400" />
                  </button>
                </div>

                {/* Khối giữa: Ảnh bìa + Badge số (#1, #2) */}
                <div
                  onClick={() => handleOpenItem(item)}
                  className="relative w-full aspect-[16/11] rounded-xl overflow-hidden bg-[#160e08] border border-white/10 shadow-inner cursor-pointer"
                >
                  <img
                    src={item.coverUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                  {item.badgeNumber && (
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-blue-600/90 text-white font-mono font-black text-[10px] shadow-sm">
                      {item.badgeNumber}
                    </div>
                  )}
                </div>

                {/* Khối dưới: Tiêu đề + Phụ đề */}
                <div
                  onClick={() => handleOpenItem(item)}
                  className="flex flex-col gap-0.5 cursor-pointer min-w-0"
                >
                  <h3 className="text-xs font-bold text-amber-100 group-hover:text-amber-300 line-clamp-2 leading-tight">
                    {item.title}
                  </h3>
                  <span className="text-[10px] text-[#9e8574] truncate">
                    {item.subtitle}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ================= GIAO DIỆN HÀNG NGANG (COMPACT / LIST) - ẢNH 2 ================= */
          <div className="flex flex-col gap-2">
            {allSavedItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleOpenItem(item)}
                className="p-2.5 rounded-2xl bg-[#22150c] border border-[#553622] hover:border-amber-500/60 shadow-md flex items-center justify-between gap-3 cursor-pointer transition-all group"
              >
                {/* Bên trái: Thumbnail với Badge */}
                <div className="relative w-16 sm:w-20 aspect-[16/11] rounded-xl overflow-hidden bg-[#160e08] border border-white/10 shrink-0">
                  <img
                    src={item.coverUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                  {item.badgeType === 'video' ? (
                    <div className="absolute bottom-0.5 left-0.5 flex items-center gap-0.5 text-[8.5px] font-bold text-amber-300 bg-black/70 px-1 rounded-sm">
                      <PlayCircle size={9} />
                      <span>VIDEO</span>
                    </div>
                  ) : item.badgeNumber ? (
                    <div className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-blue-600 text-white font-mono font-bold text-[9px]">
                      {item.badgeNumber}
                    </div>
                  ) : null}
                </div>

                {/* Ở giữa: Tiêu đề + Chuyên mục */}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[9.5px] font-bold text-amber-400/80 uppercase tracking-wider">
                    {item.category}
                  </span>
                  <h3 className="text-xs font-bold text-amber-100 group-hover:text-amber-300 truncate leading-snug">
                    {item.title}
                  </h3>
                  <span className="text-[10px] text-[#9e8574] truncate mt-0.5">
                    {item.subtitle}
                  </span>
                </div>

                {/* Bên phải: Nút Mũi tên & Nút Bookmark */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <ChevronRight
                    size={16}
                    className="text-[#9e8574] group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleRemove(item);
                    }}
                    className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 hover:text-red-400 transition-colors cursor-pointer"
                    title="Bỏ lưu"
                  >
                    <Bookmark size={13} className="fill-amber-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL ĐỌC SÁCH 3D KHI CLICK VÀO MỤC ĐÃ LƯU */}
      {activeReaderBook && (
        <SideBooksReaderModal
          isOpen={Boolean(activeReaderBook)}
          title={activeReaderBook.title}
          author={activeReaderBook.author}
          pages={activeReaderBook.pages}
          initialPage={activeReaderBook.initialPage}
          onClose={() => setActiveReaderBook(null)}
        />
      )}

      {/* THANH ĐIỀU HƯỚNG DƯỚI CÙNG */}
      <BottomNav />
    </main>
  );
}
