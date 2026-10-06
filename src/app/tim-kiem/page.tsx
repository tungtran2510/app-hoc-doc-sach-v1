'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search as SearchIcon,
  X,
  ArrowLeft,
  BookOpen,
  Sparkles,
  Info,
  ChevronRight,
  Bookmark,
} from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import SideBooksReaderModal from '../../components/SideBooksReaderModal';
import BookDetailModal, { UnifiedBookItem } from '../../components/BookDetailModal';

export const dynamic = 'force-dynamic';

function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

interface SearchBookItem {
  id: string;
  title: string;
  author: string;
  description: string;
  cover_url: string;
  badge_tag: string;
  pages_count: number;
  pages: string[];
}

const POPULAR_SEARCHES = [
  'Đĩa đệm',
  'Cột sống',
  'Thoát vị',
  'Kháng viêm',
  'Atlas giải phẫu',
  'Đốt sống cổ',
  'Tự chữa lành',
  'Lợi khuẩn',
  'Dinh dưỡng',
];

export default function SearchPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [books, setBooks] = useState<SearchBookItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal đọc sách 3D và chi tiết sách
  const [readerBook, setReaderBook] = useState<SearchBookItem | null>(null);
  const [detailBook, setDetailBook] = useState<UnifiedBookItem | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    document.title = 'Tìm kiếm sách · Qbiz Books';
  }, []);

  // Tải danh mục sách từ API
  useEffect(() => {
    fetch('/api/search')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.books)) {
          setBooks(data.books);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Debounce tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const cleanQuery = removeVietnameseTones(debouncedQuery);

  // Lọc kết quả tìm kiếm theo sách
  const matchedBooks = books.filter((b) => {
    if (!cleanQuery) return true; // Khi chưa gõ thì hiển thị toàn bộ sách nổi bật
    const matchTitle = removeVietnameseTones(b.title).includes(cleanQuery);
    const matchAuthor = removeVietnameseTones(b.author).includes(cleanQuery);
    const matchDesc = removeVietnameseTones(b.description).includes(cleanQuery);
    const matchBadge = removeVietnameseTones(b.badge_tag).includes(cleanQuery);
    return matchTitle || matchAuthor || matchDesc || matchBadge;
  });

  const isSearching = debouncedQuery.length > 0;

  return (
    <main className="flex-1 flex flex-col px-3 sm:px-4 pt-2.5 pb-24 gap-3.5 max-w-[640px] w-full mx-auto select-none">
      {/* 1. THANH TÌM KIẾM ĐẦU TRANG */}
      <section className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && window.history.length > 1) {
              router.back();
            } else {
              router.push('/');
            }
          }}
          className="w-10 h-10 rounded-full bg-[#e8ded1] dark:bg-white/10 hover:bg-[#ded1c0] dark:hover:bg-white/20 border border-[#d5c3b1] dark:border-white/10 flex items-center justify-center text-[#2A160A] dark:text-amber-200 hover:text-amber-600 dark:hover:text-white transition-colors cursor-pointer shrink-0"
          aria-label="Quay lại"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-amber-400">
            <SearchIcon size={17} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tựa sách, đĩa đệm, cột sống..."
            className="w-full h-[44px] pl-9 pr-9 rounded-2xl bg-white dark:bg-[#22150c] border border-[#e6dcce] dark:border-[#553622] text-[#2A160A] dark:text-[#fdf7ee] text-[13.5px] placeholder:text-[#9e8574] focus:outline-none focus:border-amber-500 shadow-2xs dark:shadow-inner-sm transition-colors"
            aria-label="Nhập từ khóa tìm kiếm sách"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              aria-label="Xóa từ khóa"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </section>

      {/* 2. GỢI Ý TỪ KHÓA TÌM KIẾM PHỔ BIẾN (CHIPS) */}
      <section className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <span className="text-[11px] font-bold text-[#8B4513] dark:text-amber-400/80 shrink-0 mr-1 flex items-center gap-1">
          <Sparkles size={12} />
          <span>Gợi ý:</span>
        </span>
        {POPULAR_SEARCHES.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setQuery(chip);
              inputRef.current?.focus();
            }}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer border ${
              query.toLowerCase() === chip.toLowerCase()
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                : 'bg-[#e8ded1] dark:bg-white/5 hover:bg-[#ded1c0] dark:hover:bg-white/10 text-[#4A2612] dark:text-amber-100/80 border-[#d5c3b1] dark:border-white/10'
            }`}
          >
            {chip}
          </button>
        ))}
      </section>

      {/* 3. TIÊU ĐỀ KẾT QUẢ TÌM KIẾM */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-amber-500 dark:text-amber-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-[#8B4513] dark:text-amber-200">
            {isSearching ? `Kết quả tìm kiếm (${matchedBooks.length})` : `Tất cả đầu sách (${books.length})`}
          </h2>
        </div>
        {isSearching && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-[11px] text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 cursor-pointer font-semibold"
          >
            Xem tất cả
          </button>
        )}
      </div>

      {/* 4. DANH SÁCH SÁCH TÌM THẤY (HOÀN TOÀN LÀ SÁCH - KHÔNG VIDEO, KHÔNG BÀI HỌC) */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#8B4513] dark:text-amber-200/70">
          <div className="w-7 h-7 border-2 border-amber-500 dark:border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Đang tìm kiếm trong kho sách...</span>
        </div>
      ) : matchedBooks.length === 0 ? (
        <div className="py-12 px-4 rounded-2xl bg-white dark:bg-[#22150c] border border-[#e6dcce] dark:border-[#553622] flex flex-col items-center justify-center text-center gap-3 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 dark:bg-white/5 border border-amber-500/20 dark:border-white/10 flex items-center justify-center text-amber-700 dark:text-amber-400">
            <SearchIcon size={22} />
          </div>
          <div className="flex flex-col gap-1 max-w-xs">
            <h3 className="text-sm font-bold text-[#2A160A] dark:text-amber-100">Không tìm thấy sách phù hợp</h3>
            <p className="text-xs text-[#6E4223] dark:text-amber-200/60 leading-relaxed">
              Không có đầu sách nào khớp với từ khóa "{query}". Thử tìm với "cột sống", "đĩa đệm", "kháng viêm"...
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {matchedBooks.map((book) => (
            <div
              key={book.id}
              className="p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-[#22150c] border border-[#e6dcce] dark:border-[#553622] hover:border-amber-500/60 text-[#2A160A] dark:text-[#fdf7ee] shadow-sm dark:shadow-md flex items-center gap-3 transition-all group"
            >
              {/* Bìa sách 3D thu nhỏ */}
              <div
                onClick={() => setReaderBook(book)}
                className="w-[72px] sm:w-[84px] aspect-[1/1.42] rounded-r-md rounded-l-xs overflow-hidden shadow-md border-l-2 border-amber-900/10 dark:border-white/20 shrink-0 cursor-pointer group-hover:scale-105 transition-transform relative bg-[#F5EFE6] dark:bg-[#1c1109] p-0.5 flex items-center justify-center"
                title="Bấm để đọc sách 3D"
              >
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="w-full h-full object-contain block"
                  loading="lazy"
                />
              </div>

              {/* Thông tin sách */}
              <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-800 border border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                      {book.badge_tag}
                    </span>
                    <span className="text-[10px] text-[#6E4223] dark:text-amber-200/60 truncate font-mono">
                      {book.pages_count} trang
                    </span>
                  </div>
                  <h3
                    onClick={() => setReaderBook(book)}
                    className="text-[13.5px] sm:text-sm font-bold text-[#2A160A] dark:text-amber-100 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors line-clamp-1 cursor-pointer leading-snug"
                  >
                    {book.title}
                  </h3>
                  {book.description && (
                    <p className="text-[11px] text-[#6E4223] dark:text-[#9e8574] line-clamp-1 leading-normal mt-0.5">
                      {book.description}
                    </p>
                  )}
                  <span className="text-[10.5px] text-[#8B4513] dark:text-amber-200/70 truncate block mt-0.5">
                    Tác giả: {book.author}
                  </span>
                </div>

                {/* Nút hành động */}
                <div className="flex items-center gap-2 mt-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setReaderBook(book)}
                    className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs"
                  >
                    <BookOpen size={12} strokeWidth={2.5} />
                    <span>Đọc 3D</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDetailBook({
                        id: book.id,
                        title: book.title,
                        author: book.author,
                        description: book.description,
                        cover_url: book.cover_url,
                        type: 'recommended',
                      })
                    }
                    className="px-2.5 py-1 rounded-lg bg-[#F5EFE6] hover:bg-[#ebe3d7] text-[#4A2612] border border-amber-900/15 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white dark:border-transparent font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                  >
                    <Info size={12} />
                    <span>Chi tiết</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL ĐỌC SÁCH 3D KHI CHỌN SÁCH TỪ KẾT QUẢ TÌM KIẾM */}
      <SideBooksReaderModal
        isOpen={Boolean(readerBook)}
        title={readerBook?.title || 'Tủ Sách Y Khoa'}
        author={readerBook?.author}
        pages={readerBook?.pages || []}
        onClose={() => setReaderBook(null)}
      />

      {/* MODAL CHI TIẾT SÁCH */}
      <BookDetailModal
        book={detailBook}
        onClose={() => setDetailBook(null)}
      />

      {/* THANH ĐIỀU HƯỚNG DƯỚI CÙNG */}
      <BottomNav />
    </main>
  );
}
