'use client';

import React, { useState, useRef } from 'react';
import SideBooksReaderEngine, {
  SideBooksReaderEngineRef,
} from '../../components/SideBooksReaderEngine';
import {
  BookOpen,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Sliders,
  Maximize2,
  Bookmark,
  List,
} from 'lucide-react';
import Link from 'next/link';

// Bộ trang sách thật độ phân giải cao
const SAMPLE_BOOK_PAGES = [
  '/documents/covers/cover_hieu_dung_ve_cot_song.png',
  '/documents/covers/cover_atlas_y_khoa_toan_dien.png',
  '/documents/covers/cover_cot-song.png',
  '/documents/covers/cover_dinh-duong.png',
  '/documents/covers/cover_tieu-hoa.png',
  '/documents/covers/cover_nuoc.png',
  '/documents/covers/cover_tu_chua_lanh_lung_co.png',
  '/documents/covers/back_cover_hieu_dung_ve_cot_song.png',
];

export default function ThuNghiemLatSachPage() {
  const readerRef = useRef<SideBooksReaderEngineRef>(null);

  const [currentPage, setCurrentPage] = useState<number>(0);
  const [readingTheme, setReadingTheme] = useState<'dark' | 'sepia' | 'ivory' | 'gray'>('gray');
  const [readingMode, setReadingMode] = useState<'curl' | 'roll' | 'scroll'>('curl');
  const [showHud, setShowHud] = useState<boolean>(true);

  const totalPages = SAMPLE_BOOK_PAGES.length;

  const themeClasses = {
    gray: 'bg-[#5c6168] text-white',
    dark: 'bg-[#12161f] text-slate-100',
    sepia: 'bg-[#2b241c] text-[#f4ecd8]',
    ivory: 'bg-[#f7f5ee] text-slate-900',
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-between transition-colors duration-300 ${themeClasses[readingTheme]}`}
    >
      {/* ================= HEADER TỐI GIẢN (HUD TOP) ================= */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-xl bg-black/50 border-b border-white/10 px-4 py-3 flex items-center justify-between transition-opacity duration-200 ${
          showHud ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-amber-400" />
          <span>Thư viện</span>
        </Link>

        {/* Tiêu đề sách thanh lịch */}
        <div className="flex flex-col items-center max-w-[200px] sm:max-w-xs text-center truncate">
          <span className="text-xs font-semibold tracking-wide truncate text-slate-100">
            Hiểu Đúng Về Cột Sống & Đĩa Đệm
          </span>
          <span className="text-[10px] text-amber-400/90 font-medium">
            Tài liệu y khoa · Trang {currentPage + 1} / {totalPages}
          </span>
        </div>

        {/* Tùy chọn nền đọc sách */}
        <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-full border border-white/10">
          <button
            type="button"
            onClick={() => setReadingTheme('gray')}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all ${
              readingTheme === 'gray'
                ? 'bg-slate-600 text-amber-300 ring-1 ring-amber-400'
                : 'text-slate-400'
            }`}
            title="Xám SideBooks"
          >
            🔘
          </button>
          <button
            type="button"
            onClick={() => setReadingTheme('dark')}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all ${
              readingTheme === 'dark'
                ? 'bg-slate-800 text-amber-400 ring-1 ring-amber-400'
                : 'text-slate-400'
            }`}
            title="Đen tuyền OLED"
          >
            🌑
          </button>
          <button
            type="button"
            onClick={() => setReadingTheme('sepia')}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all ${
              readingTheme === 'sepia'
                ? 'bg-[#3d3327] text-amber-300 ring-1 ring-amber-300'
                : 'text-slate-400'
            }`}
            title="Vàng nâu Sepia"
          >
            ☕
          </button>
          <button
            type="button"
            onClick={() => setReadingTheme('ivory')}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all ${
              readingTheme === 'ivory'
                ? 'bg-amber-100 text-slate-900 ring-1 ring-amber-500'
                : 'text-slate-400'
            }`}
            title="Giấy ngà Ivory"
          >
            📜
          </button>
        </div>
      </header>

      {/* ================= KHUNG ĐỌC SÁCH TRUNG TÂM ================= */}
      <main className="flex-1 flex flex-col items-center justify-center relative w-full h-[calc(100vh-140px)] overflow-hidden">
        <SideBooksReaderEngine
          ref={readerRef}
          pageImages={SAMPLE_BOOK_PAGES}
          initialPage={currentPage}
          readingMode={readingMode}
          readingTheme={readingTheme}
          onPageChange={(page) => setCurrentPage(page)}
          onCenterClick={() => setShowHud(!showHud)}
        />
      </main>

      {/* ================= THANH ĐIỀU HƯỚNG ĐÁY (HUD BOTTOM CHUẨN SIDEBOOKS) ================= */}
      <footer
        className={`sticky bottom-0 z-40 backdrop-blur-xl bg-black/60 border-t border-white/10 px-4 py-2.5 flex flex-col items-center gap-2 transition-opacity duration-200 ${
          showHud ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Thanh trượt Seekbar (1..N) */}
        <div className="w-full max-w-md flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-400 w-10 text-right">
            {currentPage + 1}
          </span>
          <input
            type="range"
            min={0}
            max={totalPages - 1}
            value={currentPage}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setCurrentPage(val);
              readerRef.current?.goToPage(val);
            }}
            className="flex-1 accent-amber-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
          />
          <span className="text-[11px] font-mono text-slate-400 w-10">
            {totalPages}
          </span>
        </div>

        {/* Thanh phím chức năng chuẩn SideBooks: L-R, WIDE, PAGESCROLL, CURL */}
        <div className="w-full max-w-md flex items-center justify-between text-xs pt-1">
          {/* Cụm nút lật lùi / lật tới */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => readerRef.current?.flipPrev()}
              disabled={currentPage <= 0}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border font-medium transition-all ${
                currentPage <= 0
                  ? 'border-white/5 text-slate-600 cursor-not-allowed'
                  : 'border-white/20 hover:border-amber-400/60 bg-white/5 text-slate-200 active:scale-95'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>Lật lùi</span>
            </button>

            <button
              type="button"
              onClick={() => readerRef.current?.flipNext()}
              disabled={currentPage >= totalPages - 1}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border font-medium transition-all ${
                currentPage >= totalPages - 1
                  ? 'border-white/5 text-slate-600 cursor-not-allowed'
                  : 'border-amber-500/80 bg-amber-500 text-slate-950 font-semibold active:scale-95'
              }`}
            >
              <span>Lật tiếp</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Chuyển đổi 3 chế độ đọc: CURL 3D ⇄ ROLL 3D ⇄ CUỘN DỌC */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => setReadingMode('curl')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wider transition-all ${
                readingMode === 'curl'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Lật sách góc 3D như thật (SideBooks authentic)"
            >
              CURL 3D
            </button>
            <button
              type="button"
              onClick={() => setReadingMode('roll')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wider transition-all ${
                readingMode === 'roll'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Vuốt cuộn 3D mượt mà (Chế độ vuốt riêng biệt)"
            >
              ROLL 3D
            </button>
            <button
              type="button"
              onClick={() => setReadingMode('scroll')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wider transition-all ${
                readingMode === 'scroll'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Cuộn trang dọc truyền thống"
            >
              CUỘN DỌC
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
