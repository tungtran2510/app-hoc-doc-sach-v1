'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  SlidersHorizontal,
  ChevronRight,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Layers,
  Sparkles,
  BookMarked,
  FolderPlus,
} from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import SideBooksReaderModal from '../../components/SideBooksReaderModal';
import { getBookReaderPageUrls } from '../../lib/bookReaderPages';
import { DEFAULT_RECOMMENDED_BOOKS } from '../../data/sample';
import { RecommendedBook } from '../../lib/types';
import { offlineStorage } from '../../lib/offlineStorage';

export interface BookCategory {
  id: string;
  title: string;
  description: string;
  image: string;
  bookIds: string[]; // Danh sách ID hoặc Tên sách được gán vào danh mục này
  isFeatured?: boolean;
}

const DEFAULT_CATEGORIES: BookCategory[] = [
  {
    id: 'cat-cot-song',
    title: 'Cột Sống & Thoát Vị Đĩa Đệm',
    description: 'Giải phẫu đốt sống, giải phóng chèn ép rễ thần kinh và phục hồi đường cong sinh lý',
    image: '/documents/covers/cover_hieu_dung_ve_cot_song.png',
    bookIds: [
      'book-hieu-dung-cot-song',
      'book-cam-nang-co',
      'book-tu-chua-lanh-lung-co',
      'book-tu-chua-lanh-lung',
      'book-giai-ma-cot-song',
      'Hiểu Đúng Về Cột Sống',
      'Cẩm Nang Đốt Sống Cổ & Vai Gáy',
      'Tự Chữa Lành Lưng & Cổ Tại Nhà',
      'Tự Chữa Lành Đau Lưng & Cổ',
      'Giải Mã Cột Sống & Thoát Vị',
    ],
    isFeatured: true,
  },
  {
    id: 'cat-dinh-duong',
    title: 'Dinh Dưỡng Kháng Viêm Sinh Học',
    description: 'Nuôi dưỡng sụn khớp, cấp nước tế bào và dập tắt phản ứng viêm mạn tính',
    image: '/documents/covers/cover_dinh_duong_khang_viem.png',
    bookIds: [
      'book-dinh-duong-phuc-hoi',
      'book-dinh-duong-khang-viem',
      'Dinh Dưỡng Nền Tảng & Phục Hồi Khớp',
      'Dinh Dưỡng Kháng Viêm Sinh Học',
    ],
    isFeatured: true,
  },
  {
    id: 'cat-giai-phau',
    title: 'Atlas Giải Phẫu Cơ Thể Người 3D',
    description: 'Mô phỏng 3D đa tầng xương khớp, tuần hoàn và các hệ cơ quan',
    image: '/documents/covers/cover_atlas_y_khoa_toan_dien.png',
    bookIds: [
      'book-atlas-cot-song',
      'book-giai-phau-co-the',
      'Atlas Giải Phẫu Cột Sống & Khớp',
      'Giải Phẫu Học Cơ Thể Người',
    ],
  },
  {
    id: 'cat-tieu-hoa',
    title: 'Hệ Tiêu Hóa & Vi Sinh Đường Ruột',
    description: 'Hệ sinh thái đường ruột, men tiêu hóa và trục liên kết Não - Ruột',
    image: '/documents/covers/cover_tieu-hoa.png',
    bookIds: [
      'book-suc-khoe-tieu-hoa',
      'book-loi-khuan-duong-ruot',
      'book-he-tieu-hoa',
      'Sức Khỏe Hệ Tiêu Hóa Toàn Diện',
      'Lợi Khuẩn & Hệ Vi Sinh Đường Ruột',
      'Hệ Tiêu Hóa & Vi Sinh Đường Ruột',
    ],
  },
  {
    id: 'cat-mien-dich',
    title: 'Hệ Miễn Dịch & Tự Chữa Lành',
    description: 'Lá chắn sinh học tự nhiên, đề kháng chủ động và cơ chế làm sạch tế bào',
    image: '/documents/covers/cover_mien-dich.png',
    bookIds: [
      'book-he-mien-dich',
      'Hệ Miễn Dịch Tự Nhiên Cơ Thể',
    ],
  },
  {
    id: 'cat-nuoc',
    title: 'Nước & Khoáng Chất Cho Cơ Thể',
    description: 'Cấp nước tế bào, cân bằng ion kiềm và hydrogen tự nhiên giúp tối ưu chuyển hóa',
    image: '/documents/covers/cover_nuoc.png',
    bookIds: [
      'book-nuoc-va-khoang-chat',
      'Nước & Khoáng Chất Cho Cơ Thể',
    ],
  },
];

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<BookCategory[]>(DEFAULT_CATEGORIES);
  const [allBooks, setAllBooks] = useState<RecommendedBook[]>(DEFAULT_RECOMMENDED_BOOKS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

  // Modal Thêm / Chỉnh sửa danh mục
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BookCategory | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [categoryDescInput, setCategoryDescInput] = useState('');
  const [categoryImageInput, setCategoryImageInput] = useState('');
  const [selectedBookIdsForCategory, setSelectedBookIdsForCategory] = useState<string[]>([]);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Modal Đọc sách 3D
  const [activeReaderBook, setActiveReaderBook] = useState<{
    title: string;
    author?: string;
    coverUrl?: string;
    fileUrl?: string;
    pdfUrl?: string;
    fileName?: string;
    pages: string[];
    initialPage: number;
  } | null>(null);

  // 1. Nạp danh mục và sách từ localStorage & API
  useEffect(() => {
    document.title = 'Danh Mục Sách · Qbiz Books';

    // Nạp danh mục đã lưu
    try {
      const savedCats = localStorage.getItem('qbiz_book_categories_v2');
      if (savedCats) {
        const parsed = JSON.parse(savedCats);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCategories(parsed);
        }
      }
    } catch {}

    // Nạp sách thực tế từ API /api/search hoặc sample
    fetch('/api/search')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.books) && data.books.length > 0) {
          const mapped: RecommendedBook[] = data.books.map((b: any) => ({
            id: b.id || b.title,
            title: b.title,
            author: b.author || 'Tủ Sách Y Khoa',
            description: b.description || '',
            cover_url: b.cover_url,
            badge_tag: b.badge_tag,
            gallery_images: b.pages || [],
            file_url: b.file_url || null,
            pdf_url: b.pdf_url || null,
            file_name: b.file_name || null,
          }));
          setAllBooks((prev) => {
            const existingIds = new Set(mapped.map((m) => m.id));
            const retained = prev.filter((p) => !existingIds.has(p.id) && p.id.startsWith('offline_'));
            return [...mapped, ...retained];
          });
        }
      })
      .catch(() => {});

    // Nạp sách đã tải về từ IndexedDB để hiển thị trong mọi danh mục
    const loadOfflineBooks = () => {
      offlineStorage.getAllCachedBooks().then((cached) => {
        if (cached && cached.length > 0) {
          const offlineMapped: RecommendedBook[] = cached.map((b) => ({
            id: b.id,
            title: b.title,
            author: b.author || 'Tác giả ngoại tuyến',
            description: b.format ? `Sách tải về (${b.format.toUpperCase()})` : 'Sách ngoại tuyến đã lưu trên máy',
            cover_url: b.coverUrl || null,
            badge_tag: b.format?.toUpperCase() || 'OFFLINE',
            gallery_images: [],
            file_url: b.fileUrl || null,
            pdf_url: b.format === 'pdf' ? (b.fileUrl || null) : null,
            file_name: b.fileName || null,
          }));
          setAllBooks((prev) => {
            const existingIds = new Set(prev.map((item) => item.id));
            const newItems = offlineMapped.filter((item) => !existingIds.has(item.id));
            return [...prev, ...newItems];
          });
        }
      }).catch(() => {});
    };

    loadOfflineBooks();
    window.addEventListener('qbiz_books_updated', loadOfflineBooks);
    return () => {
      window.removeEventListener('qbiz_books_updated', loadOfflineBooks);
    };
  }, []);

  // Lưu danh mục vào localStorage
  const saveCategoriesToStorage = (updatedCategories: BookCategory[]) => {
    setCategories(updatedCategories);
    try {
      localStorage.setItem('qbiz_book_categories_v2', JSON.stringify(updatedCategories));
    } catch {}
  };

  // Hàm lấy danh sách sách thuộc 1 danh mục
  const getBooksForCategory = (cat: BookCategory): RecommendedBook[] => {
    if (!cat.bookIds || cat.bookIds.length === 0) return [];
    return allBooks.filter(
      (b) =>
        cat.bookIds.includes(b.id) ||
        cat.bookIds.includes(b.title) ||
        cat.bookIds.some((id) => b.id.includes(id) || id.includes(b.id))
    );
  };

  // Mở modal thêm danh mục mới
  const handleOpenAddCategoryModal = () => {
    setEditingCategory(null);
    setCategoryNameInput('');
    setCategoryDescInput('');
    setCategoryImageInput(allBooks[0]?.cover_url || '/documents/covers/cover_hieu_dung_ve_cot_song.png');
    setSelectedBookIdsForCategory([]);
    setShowCategoryModal(true);
  };

  // Mở modal sửa danh mục đã có
  const handleOpenEditCategoryModal = (cat: BookCategory, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingCategory(cat);
    setCategoryNameInput(cat.title);
    setCategoryDescInput(cat.description);
    setCategoryImageInput(cat.image);
    setSelectedBookIdsForCategory(cat.bookIds || []);
    setShowCategoryModal(true);
  };

  // Toggle chọn sách vào danh mục
  const handleToggleBookForCategory = (bookId: string) => {
    setSelectedBookIdsForCategory((prev) =>
      prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId]
    );
  };

  // Chọn tất cả hoặc bỏ chọn tất cả sách
  const handleToggleSelectAllBooks = () => {
    if (selectedBookIdsForCategory.length === allBooks.length) {
      setSelectedBookIdsForCategory([]);
    } else {
      setSelectedBookIdsForCategory(allBooks.map((b) => b.id));
    }
  };

  // Lưu danh mục (Thêm mới hoặc Cập nhật)
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const name = categoryNameInput.trim();
    if (!name) {
      alert('Vui lòng nhập tên danh mục!');
      return;
    }

    if (editingCategory) {
      // Cập nhật danh mục
      const updated = categories.map((c) =>
        c.id === editingCategory.id
          ? {
              ...c,
              title: name,
              description: categoryDescInput.trim(),
              image: categoryImageInput || c.image,
              bookIds: selectedBookIdsForCategory,
            }
          : c
      );
      saveCategoriesToStorage(updated);
      showNotice(`Đã cập nhật danh mục "${name}" với ${selectedBookIdsForCategory.length} cuốn sách!`);
    } else {
      // Tạo danh mục mới
      const newCat: BookCategory = {
        id: `cat-${Date.now()}`,
        title: name,
        description: categoryDescInput.trim(),
        image: categoryImageInput || allBooks[0]?.cover_url || '/documents/covers/cover_hieu_dung_ve_cot_song.png',
        bookIds: selectedBookIdsForCategory,
      };
      const updated = [newCat, ...categories];
      saveCategoriesToStorage(updated);
      setSelectedCategoryId(newCat.id);
      showNotice(`Đã thêm danh mục mới "${name}" với ${selectedBookIdsForCategory.length} cuốn sách!`);
    }

    setShowCategoryModal(false);
  };

  // Xóa danh mục
  const handleDeleteCategory = (catId: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa danh mục này? (Sách trong thư viện vẫn được giữ nguyên)')) {
      const updated = categories.filter((c) => c.id !== catId);
      saveCategoriesToStorage(updated);
      if (selectedCategoryId === catId) {
        setSelectedCategoryId('all');
      }
      setShowCategoryModal(false);
      showNotice('Đã xóa danh mục.');
    }
  };

  const showNotice = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 3500);
  };

  // Mở sách đọc 3D
  const handleReadBook = (book: RecommendedBook) => {
    const bookPages = getBookReaderPageUrls(book);
    setActiveReaderBook({
      title: book.title,
      author: book.author || 'Tủ Sách Y Khoa',
      pages: bookPages,
      initialPage: 0,
      coverUrl: book.cover_url || undefined,
      fileUrl: book.file_url || undefined,
      pdfUrl: book.pdf_url || undefined,
      fileName: book.file_name || undefined,
    });
  };

  // Lọc danh mục theo tìm kiếm
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase().trim();
    return categories.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }, [categories, searchQuery]);

  // Danh mục đang được chọn
  const activeCategory = useMemo(() => {
    if (selectedCategoryId === 'all') return null;
    return categories.find((c) => c.id === selectedCategoryId) || null;
  }, [categories, selectedCategoryId]);

  // Danh sách sách hiển thị theo bộ lọc danh mục
  const displayedBooks = useMemo(() => {
    if (selectedCategoryId === 'all') {
      if (!searchQuery.trim()) return allBooks;
      const q = searchQuery.toLowerCase().trim();
      return allBooks.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          (b.description && b.description.toLowerCase().includes(q))
      );
    }
    if (!activeCategory) return [];
    const books = getBooksForCategory(activeCategory);
    if (!searchQuery.trim()) return books;
    const q = searchQuery.toLowerCase().trim();
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        (b.description && b.description.toLowerCase().includes(q))
    );
  }, [allBooks, selectedCategoryId, activeCategory, searchQuery]);

  return (
    <main className="flex-1 flex flex-col px-3 sm:px-4 pt-3 pb-24 gap-4 max-w-[640px] w-full mx-auto select-none">
      {/* THÔNG BÁO TOAST KHI LƯU / THÊM DANH MỤC */}
      {statusNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <Sparkles size={15} />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* 1. HEADER CHUYÊN ĐỀ & NÚT THÊM DANH MỤC */}
      <section className="flex items-center justify-between gap-2 pt-1 border-b border-amber-900/10 dark:border-white/10 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-lg sm:text-xl font-black text-[#2A160A] dark:text-amber-200 tracking-tight whitespace-nowrap">
            Danh Mục Sách
          </h1>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-[10.5px] shrink-0 whitespace-nowrap">
            {categories.length} danh mục
          </span>
        </div>

        {/* NÚT THÊM DANH MỤC - GỌN GÀNG ĐƠN DÒNG */}
        <button
          type="button"
          onClick={handleOpenAddCategoryModal}
          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
          title="Thêm danh mục mới"
        >
          <FolderPlus size={14} strokeWidth={2.5} />
          <span>Thêm mục</span>
        </button>
      </section>

      {/* 2. THANH CUỘN TAB NHANH CÁC DANH MỤC (MOBILE-FIRST 1-CHẠM CHUYỂN DANH MỤC) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 -my-1">
        <button
          type="button"
          onClick={() => setSelectedCategoryId('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
            selectedCategoryId === 'all'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white dark:bg-[#22150c] text-[#6E4223] dark:text-amber-200/80 border border-[#e6dcce] dark:border-[#553622] hover:bg-amber-500/10'
          }`}
        >
          <Layers size={13} />
          <span>Tất cả ({allBooks.length})</span>
        </button>

        {categories.map((cat) => {
          const count = getBooksForCategory(cat).length;
          const isSelected = selectedCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                  : 'bg-white dark:bg-[#22150c] text-[#6E4223] dark:text-amber-200/80 border border-[#e6dcce] dark:border-[#553622] hover:bg-amber-500/10'
              }`}
            >
              <span>{cat.title}</span>
              <span
                className={`text-[10.5px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected
                    ? 'bg-slate-950/20 text-slate-950 font-bold'
                    : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. THANH TÌM KIẾM SÁCH HOẶC DANH MỤC */}
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-600 dark:text-amber-400/80"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm sách, danh mục chuyên đề..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#22150c] border border-[#e6dcce] dark:border-[#553622] text-[#2A160A] dark:text-[#fdf7ee] text-xs placeholder:text-[#9e8574] dark:placeholder:text-amber-100/40 focus:outline-hidden focus:border-amber-500 shadow-2xs transition-colors"
          />
        </div>
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="w-9 h-9 rounded-xl bg-white dark:bg-[#22150c] border border-[#e6dcce] dark:border-[#553622] flex items-center justify-center text-xs font-bold text-[#6E4223] dark:text-amber-300 cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* 4. GIAO DIỆN KHI CHỌN "TẤT CẢ" -> HIỂN THỊ CÁC THẺ DANH MỤC ĐỂ NGƯỜI DÙNG BẤM CHỌN */}
      {selectedCategoryId === 'all' && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-[#8B4513] dark:text-amber-400 uppercase tracking-wide whitespace-nowrap shrink-0">
              <Layers size={14} />
              <span>CHỦ ĐỀ SÁCH</span>
            </div>
            <span className="text-[10.5px] text-[#6E4223] dark:text-amber-200/60 font-semibold truncate text-right">
              Chạm vào mục để xem sách
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredCategories.map((cat) => {
              const categoryBooks = getBooksForCategory(cat);
              const count = categoryBooks.length;
              return (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className="p-3 rounded-2xl bg-white dark:bg-[#22150c] border border-[#e6dcce] dark:border-[#553622] hover:border-amber-500/80 shadow-sm dark:shadow-md flex items-center gap-3 cursor-pointer active:scale-98 transition-all group relative overflow-hidden"
                >
                  {/* Ảnh bìa danh mục A4 chuẩn */}
                  <div className="w-14 sm:w-16 aspect-[1/1.42] rounded-lg overflow-hidden bg-[#F5EFE6] dark:bg-[#160e08] border border-amber-900/10 dark:border-white/15 shrink-0 p-0.5 flex items-center justify-center shadow-xs">
                    <img
                      src={cat.image || '/documents/covers/cover_hieu_dung_ve_cot_song.png'}
                      alt={cat.title}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  </div>

                  {/* Thông tin danh mục & Số cuốn sách thực tế */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <h3 className="text-xs sm:text-[13px] font-black text-[#2A160A] dark:text-amber-100 group-hover:text-amber-600 dark:group-hover:text-amber-300 leading-snug line-clamp-2">
                      {cat.title}
                    </h3>
                    <p className="text-[10.5px] text-[#6E4223] dark:text-amber-100/60 line-clamp-1 mt-0.5">
                      {cat.description || 'Chuyên đề sách chuyên khảo'}
                    </p>

                    {/* SỐ LƯỢNG SÁCH THỰC TẾ (KHÔNG CÓ CHỮ BÀI HỌC) */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold text-[10px] flex items-center gap-1">
                        <BookOpen size={10} />
                        <span>{count} cuốn sách</span>
                      </span>

                      {/* Nút sửa danh mục */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditCategoryModal(cat, e)}
                        className="p-1 rounded-md text-[#8B4513]/70 dark:text-amber-300/70 hover:text-amber-700 dark:hover:text-white hover:bg-amber-500/15 transition-colors cursor-pointer"
                        title="Sửa danh mục & gán sách"
                      >
                        <Edit2 size={12} />
                      </button>
                    </div>
                  </div>

                  <ChevronRight
                    size={16}
                    className="text-[#8B4513]/60 dark:text-amber-400/50 group-hover:text-amber-600 dark:group-hover:text-amber-400 shrink-0 group-hover:translate-x-1 transition-all"
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. GIAO DIỆN KHI MỞ 1 DANH MỤC CỤ THỂ HOẶC XEM TẤT CẢ SÁCH */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {activeCategory && (
              <button
                type="button"
                onClick={() => setSelectedCategoryId('all')}
                className="text-[11.5px] font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
              >
                <span>← Tất cả</span>
                <span className="mx-0.5 text-slate-400">/</span>
              </button>
            )}
            <h2 className="text-xs font-black text-[#8B4513] dark:text-amber-400 uppercase tracking-wide truncate">
              {activeCategory ? activeCategory.title : 'TẤT CẢ ĐẦU SÁCH'}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10.5px] font-bold text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full bg-amber-500/15 whitespace-nowrap">
              {displayedBooks.length} cuốn
            </span>

            {activeCategory && (
              <button
                type="button"
                onClick={() => handleOpenEditCategoryModal(activeCategory)}
                className="px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 font-bold text-[10.5px] flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                title="Thêm/Bớt sách trong danh mục này"
              >
                <Edit2 size={11} />
                <span>Sửa</span>
              </button>
            )}
          </div>
        </div>

        {/* DANH SÁCH CÁC CUỐN SÁCH CỦA DANH MỤC (TỐI ƯU DỄ NHÌN TRÊN ĐIỆN THOẠI) */}
        {displayedBooks.length === 0 ? (
          <div className="py-10 px-4 rounded-2xl bg-white dark:bg-[#22150c] border border-[#e6dcce] dark:border-[#553622] text-center flex flex-col items-center justify-center gap-2 shadow-xs">
            <BookOpen size={24} className="text-amber-600/50" />
            <h4 className="text-xs font-bold text-[#2A160A] dark:text-amber-100">
              Danh mục này hiện chưa có sách nào
            </h4>
            <p className="text-[11px] text-[#6E4223] dark:text-amber-100/60 max-w-xs">
              Hãy bấm nút &quot;Sửa mục này&quot; hoặc &quot;Thêm danh mục&quot; ở trên để gán các cuốn sách vào danh mục.
            </p>
            {activeCategory && (
              <button
                type="button"
                onClick={() => handleOpenEditCategoryModal(activeCategory)}
                className="mt-1 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
              >
                <Plus size={13} />
                <span>Gán sách vào danh mục</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {displayedBooks.map((book, idx) => (
              <div
                key={book.id || idx}
                onClick={() => handleReadBook(book)}
                className="p-3 rounded-2xl bg-white dark:bg-[#22150c] border border-[#e6dcce] dark:border-[#553622] hover:border-amber-500/70 shadow-sm dark:shadow-md flex items-center gap-3 cursor-pointer active:scale-98 transition-all group"
              >
                {/* Bìa sách đứng tỷ lệ A4 chuẩn (1:1.42) */}
                <div className="w-14 sm:w-16 aspect-[1/1.42] rounded-lg overflow-hidden bg-[#F5EFE6] dark:bg-[#160e08] border border-amber-900/10 dark:border-white/15 shrink-0 p-0.5 flex items-center justify-center shadow-xs">
                  <img
                    src={book.cover_url || '/documents/covers/cover_hieu_dung_ve_cot_song.png'}
                    alt={book.title}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                </div>

                {/* Nội dung sách */}
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="text-[9.5px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider truncate whitespace-nowrap shrink-0 max-w-[120px]">
                      {book.category || 'TỦ SÁCH Y KHOA'}
                    </span>
                    {book.badge_tag && (
                      <span className="text-[8.5px] font-extrabold px-1.5 py-0.2 rounded bg-amber-600/15 text-amber-800 dark:text-amber-300 whitespace-nowrap shrink-0">
                        {book.badge_tag}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs sm:text-[13.5px] font-black text-[#2A160A] dark:text-amber-100 group-hover:text-amber-600 dark:group-hover:text-amber-300 leading-snug line-clamp-2 mt-0.5">
                    {book.title}
                  </h3>

                  {book.description ? (
                    <p className="text-[10.5px] text-[#6E4223] dark:text-amber-100/60 line-clamp-1 mt-0.5">
                      {book.description}
                    </p>
                  ) : null}

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-500 dark:text-amber-200/60 font-medium truncate">
                      Tác giả: {book.author || 'Tủ Sách Y Khoa'}
                    </span>
                  </div>
                </div>

                {/* Nút Đọc sách */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReadBook(book);
                  }}
                  className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-800 hover:text-slate-950 dark:text-amber-300 dark:hover:text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0 border border-amber-500/30 transition-all cursor-pointer shadow-2xs group-hover:bg-amber-500 group-hover:text-slate-950"
                  title="Mở sách đọc 3D"
                >
                  <BookOpen size={13} />
                  <span>Đọc sách</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* =========================================================================
          MODAL THÊM / CHỈNH SỬA DANH MỤC & CHỌN CÁC CUỐN SÁCH VÀO DANH MỤC ĐÓ
          ========================================================================= */}
      {showCategoryModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
          onClick={() => setShowCategoryModal(false)}
        >
          <div
            className="w-full sm:max-w-lg max-h-[90vh] bg-[#1c1109] border border-[#4a2e1b] text-[#fdf7ee] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-[#24160d]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                  <FolderPlus size={16} />
                </div>
                <h3 className="text-sm font-black text-amber-200 uppercase tracking-wide">
                  {editingCategory ? 'Chỉnh Sửa Danh Mục Sách' : 'Thêm Danh Mục Sách Mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveCategory} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {/* 1. Tên danh mục */}
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Tên danh mục <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={categoryNameInput}
                  onChange={(e) => setCategoryNameInput(e.target.value)}
                  placeholder="Ví dụ: Cột Sống & Cơ Xương Khớp, Dinh Dưỡng Tế Bào..."
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-amber-500/30 text-white text-xs placeholder:text-slate-500 focus:outline-hidden focus:border-amber-400"
                />
              </div>

              {/* 2. Mô tả ngắn */}
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Mô tả ngắn gọn về danh mục
                </label>
                <input
                  type="text"
                  value={categoryDescInput}
                  onChange={(e) => setCategoryDescInput(e.target.value)}
                  placeholder="Ví dụ: Tập hợp tài liệu chuyên sâu giải phóng chèn ép..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-amber-500/30 text-white text-xs placeholder:text-slate-500 focus:outline-hidden focus:border-amber-400"
                />
              </div>

              {/* 3. Chọn ảnh đại diện danh mục */}
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Ảnh bìa danh mục (Chọn một bìa sách mẫu hoặc điền link ảnh)
                </label>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                  {allBooks.slice(0, 8).map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setCategoryImageInput(b.cover_url || '')}
                      className={`relative w-11 aspect-[1/1.42] rounded-md overflow-hidden shrink-0 border-2 transition-all p-0.5 bg-black/50 ${
                        categoryImageInput === b.cover_url
                          ? 'border-amber-400 ring-2 ring-amber-400/50 scale-105'
                          : 'border-white/10 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={b.cover_url || ''}
                        alt={b.title}
                        className="w-full h-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. CHỌN CÁC CUỐN SÁCH CHO VÀO DANH MỤC NÀY */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                    <BookOpen size={13} />
                    <span>Chọn sách đưa vào danh mục này ({selectedBookIdsForCategory.length})</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleToggleSelectAllBooks}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    {selectedBookIdsForCategory.length === allBooks.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                  </button>
                </div>

                <div className="border border-amber-500/25 rounded-2xl p-2 bg-black/30 max-h-56 overflow-y-auto flex flex-col gap-1.5 divide-y divide-white/5">
                  {allBooks.map((b) => {
                    const isChecked = selectedBookIdsForCategory.includes(b.id);
                    return (
                      <div
                        key={b.id}
                        onClick={() => handleToggleBookForCategory(b.id)}
                        className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors pt-2 ${
                          isChecked
                            ? 'bg-amber-500/20 text-white font-bold'
                            : 'hover:bg-white/5 text-amber-100/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 aspect-[1/1.42] rounded overflow-hidden bg-black/40 border border-white/10 shrink-0 p-0.5">
                            <img
                              src={b.cover_url || '/documents/covers/cover_hieu_dung_ve_cot_song.png'}
                              alt={b.title}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs truncate">{b.title}</span>
                            <span className="text-[10px] text-amber-300/60 truncate">
                              {b.author || 'Tùng Dinh Dưỡng'}
                            </span>
                          </div>
                        </div>

                        {/* Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                            isChecked
                              ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold'
                              : 'border-white/30 bg-black/40'
                          }`}
                        >
                          {isChecked && <Check size={13} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10 mt-1">
                {editingCategory ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(editingCategory.id)}
                    className="px-3 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Xóa</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(false)}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    {editingCategory ? 'Lưu thay đổi' : 'Tạo danh mục'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ĐỌC SÁCH 3D KHI BẤM VÀO SÁCH */}
      {activeReaderBook && (
        <SideBooksReaderModal
          isOpen={Boolean(activeReaderBook)}
          title={activeReaderBook.title}
          author={activeReaderBook.author}
          coverUrl={activeReaderBook.coverUrl}
          fileUrl={activeReaderBook.fileUrl}
          pdfUrl={activeReaderBook.pdfUrl}
          fileName={activeReaderBook.fileName}
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
