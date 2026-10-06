'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  SlidersHorizontal,
  Flame,
  LayoutGrid,
  ChevronRight,
  HelpCircle,
  ChevronDown,
  BookOpen,
  BookMarked,
  Sparkles,
} from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import SideBooksReaderModal from '../../components/SideBooksReaderModal';
import { getBookReaderPageUrls } from '../../lib/bookReaderPages';

interface CategoryItem {
  id: string;
  title: string;
  countText: string;
  image: string;
  description: string;
  sampleBookTitle: string;
}

const FEATURED_CATEGORIES: CategoryItem[] = [
  {
    id: 'cot-song',
    title: 'Cột sống',
    countText: '7 tài liệu & bài học',
    image: '/documents/covers/cover_cot-song.png',
    description: 'Giải phẫu đĩa đệm, giải phóng chèn ép và khôi phục đường cong sinh lý',
    sampleBookTitle: 'Hiểu Đúng Về Cột Sống',
  },
  {
    id: 'dinh-duong',
    title: 'Dinh Dưỡng Nền Tảng',
    countText: '7 tài liệu & bài học',
    image: '/documents/covers/cover_dinh-duong.png',
    description: 'Dinh dưỡng tế bào, kháng viêm sinh học và cân bằng chuyển hóa',
    sampleBookTitle: 'Dinh Dưỡng Kháng Viêm Sinh Học',
  },
];

const ALL_CATEGORIES: CategoryItem[] = [
  {
    id: 'co-the-nguoi',
    title: 'Cơ Thể Người 3D',
    countText: '6 sách & bài học',
    image: '/documents/covers/cover_co-the-nguoi.png',
    description: 'Mô phỏng giải phẫu đa tầng và chuỗi động học chuyển động',
    sampleBookTitle: 'Atlas Y Khoa Toàn Diện',
  },
  {
    id: 'tieu-hoa',
    title: 'Hệ Tiêu Hóa',
    countText: '6 sách & bài học',
    image: '/documents/covers/cover_tieu-hoa.png',
    description: 'Đại tràng, vi sinh vật đường ruột và cơ chế hấp thu dinh dưỡng',
    sampleBookTitle: 'Lợi Khuẩn & Hệ Tiêu Hóa Khỏe Mạnh',
  },
  {
    id: 'nuoc',
    title: 'Nước & Điện Giải',
    countText: '6 sách & bài học',
    image: '/documents/covers/cover_nuoc.png',
    description: 'Quản trị nguồn nước tế bào, kiềm tính và hydrogen sinh học',
    sampleBookTitle: 'Nước Hydro Gems & Quản Trị Tế Bào',
  },
  {
    id: 'noi-tiet',
    title: 'Nội Tiết – Chuyển Hóa',
    countText: '6 sách & bài học',
    image: '/documents/covers/cover_noi-tiet.png',
    description: 'Tuyến giáp, hormone và năng lượng sinh học nội sinh',
    sampleBookTitle: 'Giải Mã Cột Sống & Cân Bằng Cơ Thể',
  },
  {
    id: 'gan-mat-tuy',
    title: 'Gan – Mật – Tụy',
    countText: '6 sách & bài học',
    image: '/documents/covers/cover_gan-mat-tuy.png',
    description: 'Thanh lọc độc tố tế bào, chuyển hóa lipid và men tiêu hóa',
    sampleBookTitle: 'Lắng Nghe Cơ Thể Để Tự Chữa Lành',
  },
  {
    id: 'mien-dich',
    title: 'Hệ Miễn Dịch',
    countText: '6 sách & bài học',
    image: '/documents/covers/cover_mien-dich.png',
    description: 'Hàng rào bảo vệ tự nhiên, đại thực bào và kháng thể',
    sampleBookTitle: 'Tự Chữa Lành Lưng & Cổ',
  },
];

const FAQS = [
  {
    id: 'faq-1',
    category: 'Cột sống',
    question: 'Tư thế sinh hoạt đúng cần chú ý gì?',
    answer:
      'Giữ lưng thẳng, vai thả lỏng, màn hình ngang tầm mắt; khi nhấc vật nặng luôn gập gối hạ hông thay vì gập lưng. Cứ sau 45–60 phút nên đứng dậy vận động nhẹ 1–2 phút để đĩa đệm được bơm hút dinh dưỡng.',
  },
  {
    id: 'faq-2',
    category: 'Cột sống',
    question: 'Cách phân biệt đau mỏi thông thường và thoát vị đĩa đệm?',
    answer:
      'Đau mỏi cơ thường âm ỉ khu trú tại chỗ, giảm khi nghỉ ngơi. Còn tổn thương đĩa đệm chèn ép rễ thần kinh sẽ đau buốt lan dọc tay hoặc chân, kèm tê bì châm chích.',
  },
  {
    id: 'faq-3',
    category: 'Dinh dưỡng',
    question: 'Người hay đau mỏi xương khớp thì dinh dưỡng cần bổ sung gì?',
    answer:
      'Cần ưu tiên đạm chất lượng cao, omega-3 kháng viêm, canxi, magie, vitamin D3, K2 và chăm sóc hệ vi sinh đường ruột để tăng hấp thu dưỡng chất.',
  },
  {
    id: 'faq-4',
    category: 'Nước & Tế bào',
    question: 'Nước uống chất lượng có vai trò thế nào với tế bào?',
    answer:
      'Nước chiếm 60–70% cơ thể. Nước sạch giàu ion kiềm tự nhiên và hydrogen hòa tan giúp trung hòa gốc tự do, hỗ trợ đào thải cặn bã và tăng tốc độ trao đổi chất.',
  },
];

export default function CategoriesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFaqCat, setSelectedFaqCat] = useState<string>('Tất cả');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  const [activeReaderBook, setActiveReaderBook] = useState<{
    title: string;
    author?: string;
    pages: string[];
    initialPage: number;
  } | null>(null);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return ALL_CATEGORIES;
    const q = searchQuery.toLowerCase().trim();
    return ALL_CATEGORIES.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.sampleBookTitle.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const openBookFromCategory = (cat: CategoryItem) => {
    const bookPages = getBookReaderPageUrls({
      id: cat.sampleBookTitle,
      title: cat.sampleBookTitle,
      description: cat.description,
      cover_url: cat.image,
    } as any);

    setActiveReaderBook({
      title: cat.sampleBookTitle,
      author: 'Tủ Sách Y Khoa',
      pages: bookPages,
      initialPage: 0,
    });
  };

  const faqCategories = ['Tất cả', 'Cột sống', 'Dinh dưỡng', 'Nước & Tế bào'];
  const filteredFaqs = useMemo(() => {
    if (selectedFaqCat === 'Tất cả') return FAQS;
    return FAQS.filter((f) => f.category === selectedFaqCat);
  }, [selectedFaqCat]);

  return (
    <main className="flex-1 flex flex-col px-3 sm:px-4 pt-3 pb-24 gap-4 max-w-[640px] w-full mx-auto select-none">
      {/* 1. HEADER CHUYÊN ĐỀ / DANH MỤC SÁCH */}
      <section className="flex items-center justify-between gap-2 pt-1">
        <div className="flex flex-col">
          <h1 className="text-xl sm:text-2xl font-black text-amber-200 tracking-tight">
            Danh Mục Sách
          </h1>
          <p className="text-xs text-amber-100/70 mt-0.5">
            Hệ thống chuyên đề & bài học giải phẫu cơ thể
          </p>
        </div>

        <Link
          href="/"
          className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs shrink-0"
        >
          <BookOpen size={14} />
          <span>Kệ sách</span>
        </Link>
      </section>

      {/* 2. THANH TÌM KIẾM DANH MỤC */}
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400/70"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm danh mục, chuyên đề..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#22150c] border border-[#553622] text-[#fdf7ee] text-xs placeholder:text-amber-100/40 focus:outline-hidden focus:border-amber-500/70 shadow-xs"
          />
        </div>
        <button
          type="button"
          onClick={() => setSearchQuery('')}
          className="w-10 h-10 rounded-2xl bg-[#22150c] border border-[#553622] flex items-center justify-center text-amber-300 hover:text-white transition-colors cursor-pointer shrink-0"
          title="Bộ lọc"
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {/* 3. CHUYÊN ĐỀ NỔI BẬT */}
      {!searchQuery && (
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wide">
            <Flame size={15} className="fill-amber-400 text-amber-400" />
            <span>Chuyên đề nổi bật</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {FEATURED_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                onClick={() => openBookFromCategory(cat)}
                className="p-2.5 rounded-2xl bg-[#22150c] border border-[#553622] hover:border-amber-500/60 shadow-md flex items-center gap-2.5 cursor-pointer active:scale-98 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#160e08] shrink-0 border border-white/10 shadow-inner">
                  <img
                    src={cat.image}
                    alt={cat.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <h3 className="text-xs font-bold text-amber-100 group-hover:text-amber-300 truncate">
                    {cat.title}
                  </h3>
                  <div className="flex items-center gap-1 text-[10.5px] text-amber-300/80 mt-0.5">
                    <BookOpen size={11} />
                    <span className="truncate">{cat.countText}</span>
                  </div>
                </div>
                <ChevronRight
                  size={15}
                  className="text-amber-400/50 group-hover:text-amber-400 shrink-0 group-hover:translate-x-0.5 transition-all"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. THEO NHÓM CHỦ ĐỀ (GRID) */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wide">
            <LayoutGrid size={15} />
            <span>Theo nhóm chủ đề</span>
          </div>
          <span className="text-[11px] text-amber-200/60">
            {filteredCategories.length} chủ đề
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => openBookFromCategory(cat)}
              className="p-2.5 rounded-2xl bg-[#22150c] border border-[#553622] hover:border-amber-500/70 shadow-md flex flex-col items-center text-center gap-2 cursor-pointer active:scale-95 transition-all group"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-[#160e08] border border-white/10 shadow-sm">
                <img
                  src={cat.image}
                  alt={cat.title}
                  className="w-full h-full object-cover group-hover:scale-108 transition-transform"
                  loading="lazy"
                />
              </div>
              <div className="flex flex-col items-center w-full min-w-0">
                <h3 className="text-xs font-bold text-amber-100 group-hover:text-amber-300 truncate w-full">
                  {cat.title}
                </h3>
                <span className="text-[10px] text-amber-300/70 truncate mt-0.5 font-medium">
                  {cat.countText}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. VẤN ĐỀ THƯỜNG GẶP (FAQ ACCORDIONS) */}
      <section className="mt-1 p-3.5 rounded-2xl bg-[#22150c] border border-[#553622] shadow-md flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <HelpCircle size={15} />
            </div>
            <div>
              <h2 className="text-xs font-bold text-amber-200 uppercase tracking-wide">
                Vấn đề thường gặp
              </h2>
              <p className="text-[10px] text-amber-100/60">
                Chọn chủ đề để xem câu hỏi và hướng học phù hợp
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-amber-300">
            {filteredFaqs.length} câu hỏi
          </span>
        </div>

        {/* Tab lọc danh mục FAQ */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {faqCategories.map((catName) => (
            <button
              key={catName}
              type="button"
              onClick={() => setSelectedFaqCat(catName)}
              className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                selectedFaqCat === catName
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-white/5 hover:bg-white/10 text-amber-100/80 border border-white/5'
              }`}
            >
              {catName}
            </button>
          ))}
        </div>

        {/* Danh sách câu hỏi có accordion */}
        <div className="flex flex-col gap-2 pt-1">
          {filteredFaqs.map((faq) => {
            const isExpanded = expandedFaqId === faq.id;
            return (
              <div
                key={faq.id}
                className="rounded-xl bg-[#1c1109] border border-white/5 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                  className="w-full p-2.5 text-left flex items-center justify-between gap-2 cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9.5px] uppercase font-bold text-amber-400/80 tracking-wider">
                      {faq.category}
                    </span>
                    <span className="text-xs font-bold text-amber-100 leading-snug mt-0.5">
                      {faq.question}
                    </span>
                  </div>
                  <ChevronDown
                    size={15}
                    className={`text-amber-400 shrink-0 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 text-xs text-amber-100/80 leading-relaxed border-t border-white/5">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* MODAL ĐỌC SÁCH 3D KHI CLICK VÀO CHUYÊN ĐỀ */}
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
