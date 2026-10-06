'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Bookmark, Search } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const isHome = pathname === '/';
  const isCategories = pathname.startsWith('/danh-muc');
  const isSaved = pathname === '/da-luu';
  const isSearch = pathname === '/tim-kiem';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex justify-center bg-[#FAF6F0]/95 dark:bg-[#160e08]/95 backdrop-blur-md border-t border-[#e2d5c3] dark:border-[#3a2314] shadow-[0_-4px_15px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_20px_rgba(0,0,0,0.6)] select-none transition-colors duration-200"
      style={{ transform: 'translateZ(0)' }}
      aria-label="Điều hướng chính"
    >
      <div className="w-full max-w-[480px] md:max-w-[768px] lg:max-w-[880px] h-[56px] grid grid-cols-4 select-none">
        {/* 1. Kệ sách (Trang chủ) */}
        <Link
          href="/"
          prefetch={true}
          className={`flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 cursor-pointer ${
            isHome
              ? 'text-amber-700 dark:text-amber-400 font-extrabold'
              : 'text-[#7A583E] dark:text-[#9e8574] font-semibold hover:text-[#4A2612] dark:hover:text-amber-200'
          }`}
          aria-label="Kệ sách"
        >
          <Home size={19} strokeWidth={isHome ? 2.5 : 2} />
          <span className="text-[10px] leading-tight truncate">Kệ sách</span>
        </Link>

        {/* 2. Danh mục sách */}
        <Link
          href="/danh-muc"
          prefetch={true}
          className={`flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 cursor-pointer ${
            isCategories
              ? 'text-amber-700 dark:text-amber-400 font-extrabold'
              : 'text-[#7A583E] dark:text-[#9e8574] font-semibold hover:text-[#4A2612] dark:hover:text-amber-200'
          }`}
          aria-label="Danh mục sách"
        >
          <LayoutGrid size={19} strokeWidth={isCategories ? 2.5 : 2} />
          <span className="text-[10px] leading-tight truncate">Danh mục</span>
        </Link>

        {/* 3. Đã lưu (Dấu trang Bookmarks) */}
        <Link
          href="/da-luu"
          prefetch={true}
          className={`flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 cursor-pointer ${
            isSaved
              ? 'text-amber-700 dark:text-amber-400 font-extrabold'
              : 'text-[#7A583E] dark:text-[#9e8574] font-semibold hover:text-[#4A2612] dark:hover:text-amber-200'
          }`}
          aria-label="Sách & Dấu trang đã lưu"
        >
          <Bookmark
            size={19}
            strokeWidth={isSaved ? 2.5 : 2}
            className={isSaved ? 'fill-amber-700 dark:fill-amber-400' : ''}
          />
          <span className="text-[10px] leading-tight truncate">Đã lưu</span>
        </Link>

        {/* 4. Tìm kiếm sách */}
        <Link
          href="/tim-kiem"
          prefetch={true}
          className={`flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 cursor-pointer ${
            isSearch
              ? 'text-amber-700 dark:text-amber-400 font-extrabold'
              : 'text-[#7A583E] dark:text-[#9e8574] font-semibold hover:text-[#4A2612] dark:hover:text-amber-200'
          }`}
          aria-label="Tìm kiếm sách"
        >
          <Search size={19} strokeWidth={isSearch ? 2.5 : 2} />
          <span className="text-[10px] leading-tight truncate">Tìm kiếm</span>
        </Link>
      </div>
    </nav>
  );
}
