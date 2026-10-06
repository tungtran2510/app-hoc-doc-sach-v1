const fs = require('fs');

// 1. UPDATE HomeSectionsClient.tsx: Remove redundant appSubtitle (the red underline)
const hscPath = 'src/components/HomeSectionsClient.tsx';
let hscContent = fs.readFileSync(hscPath, 'utf8');

const oldSubBlock = `{appSubtitle && appSubtitle.trim() ? (
                    <span className="text-[10.5px] sm:text-[11px] text-[#d5c3b3] font-medium line-clamp-1">
                      {appSubtitle.trim()}
                    </span>
                  ) : null}`;

if (hscContent.includes(oldSubBlock)) {
  hscContent = hscContent.replace(oldSubBlock, '');
  console.log('[OK] Removed redundant appSubtitle from Brand Card in HomeSectionsClient.tsx');
} else {
  // Regex match
  hscContent = hscContent.replace(
    /{\s*appSubtitle\s*&&\s*appSubtitle\.trim\(\)\s*\?[\s\S]*?:\s*null\s*}/,
    ''
  );
  console.log('[OK] Regex removed redundant appSubtitle from Brand Card');
}
fs.writeFileSync(hscPath, hscContent, 'utf8');

// 2. UPDATE FlatMinimalistBooksSection.tsx: Remove sales badge tags
const flatPath = 'src/components/FlatMinimalistBooksSection.tsx';
let flatContent = fs.readFileSync(flatPath, 'utf8');

// Remove {book.badge_tag && ...} from both grid and list views
flatContent = flatContent.replace(
  /{\s*book\.badge_tag\s*&&\s*\([\s\S]*?<\/span>\s*\)\s*}/g,
  ''
);
fs.writeFileSync(flatPath, flatContent, 'utf8');
console.log('[OK] Removed badge tags from FlatMinimalistBooksSection.tsx');

// 3. REWRITE WoodenBookshelf.tsx for true physical bookshelf realism:
// - No sales tags (BÁN CHẠY, etc.)
// - No badge (SIDEBOOKS 3D) or tab switcher buttons in header
// - No redundant text under books (books stand DIRECTLY on the wooden shelf!)
// - Wood plank positioned directly under books with contact shadow
const shelfPath = 'src/components/WoodenBookshelf.tsx';

const newShelfCode = `'use client';

import React from 'react';
import {
  BookOpen,
  Info,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { RecommendedBook } from '../lib/types';

interface WoodenBookshelfProps {
  books: RecommendedBook[];
  isAdmin?: boolean;
  onSelectBook: (book: RecommendedBook) => void;
  onReadBook3D: (book: RecommendedBook) => void;
  onEditSingleBook?: (book: RecommendedBook) => void;
  onToggleBookVisibility?: (index: number) => void;
  onMoveBook?: (index: number, direction: 'up' | 'down') => void;
  onDeleteBook?: (index: number) => void;
  title?: string;
  badgeText?: string;
  layoutMode?: 'bookshelf' | 'grid' | 'lookbook';
  onToggleLayoutMode?: (mode: 'bookshelf' | 'grid' | 'lookbook') => void;
}

export default function WoodenBookshelf({
  books,
  isAdmin = false,
  onSelectBook,
  onReadBook3D,
  onEditSingleBook,
  onToggleBookVisibility,
  onMoveBook,
  onDeleteBook,
  title = 'GIAN TRƯNG BÀY SÁCH Y KHOA',
}: WoodenBookshelfProps) {
  // Lọc sách hiển thị (nếu không phải admin thì ẩn sách có is_visible = false)
  const visibleBooks = books.filter((b) => isAdmin || b.is_visible !== false);

  if (visibleBooks.length === 0) {
    return null;
  }

  // Chia danh sách sách thành các tầng kệ (mỗi tầng 3 cuốn sách chuẩn vật lý)
  const chunkSize = 3;
  const tiers: RecommendedBook[][] = [];
  for (let i = 0; i < books.length; i += chunkSize) {
    const chunk = books.slice(i, i + chunkSize);
    const hasVisibleInChunk = chunk.some((b) => isAdmin || b.is_visible !== false);
    if (hasVisibleInChunk) {
      tiers.push(chunk);
    }
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-b from-[#24170d] via-[#1c1109] to-[#130a04] p-3 sm:p-5 border border-[#3d2817] shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] select-none">
      {/* Đèn rọi kệ sách ấm cúng trên đỉnh (Overhead Ambient Spotlight) */}
      <div
        className="absolute top-0 left-[10%] right-[10%] h-[180px] pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(251, 191, 36, 0.16) 0%, transparent 75%)',
        }}
      />

      {/* TIÊU ĐỀ GIAN TRƯNG BÀY SÁCH (TỐI GIẢN - KHÔNG THẺ TAB / KHÔNG TỪ THỪA) */}
      <div className="relative z-10 flex items-center justify-between mb-5 px-1 sm:px-2">
        <div className="flex items-center gap-2">
          <span className="text-lg select-none">📚</span>
          <h2 className="text-[14.5px] sm:text-[16px] font-black tracking-wide text-amber-200 uppercase drop-shadow-sm">
            {title}
          </h2>
        </div>
      </div>

      {/* CÁC TẦNG KỆ SÁCH (SÁCH ĐỨNG TRỰC TIẾP TRÊN MẶT GỖ - ZERO FLOATING) */}
      <div className="relative z-10 flex flex-col gap-7 sm:gap-9">
        {tiers.map((tierBooks, tierIdx) => {
          return (
            <div key={\`tier-\${tierIdx}\`} className="relative">
              {/* Dãy sách đứng vững trên mặt gỗ */}
              <div className="flex items-end justify-around gap-2.5 sm:gap-4 px-1.5 sm:px-3 relative z-10">
                {tierBooks.map((book) => {
                  const originalIndex = books.findIndex((b) => b.id === book.id);
                  const isHidden = book.is_visible === false;
                  if (isHidden && !isAdmin) return null;

                  return (
                    <div
                      key={book.id || originalIndex}
                      className={\`flex-1 max-w-[122px] sm:max-w-[150px] flex flex-col items-center group relative cursor-pointer \${
                        isHidden ? 'opacity-65' : ''
                      }\`}
                      onClick={() => onReadBook3D(book)}
                      title={book.title}
                    >
                      {/* KHỐI BÌA SÁCH 3D NỔI NÉT ĐỨNG TRỰC TIẾP TRÊN KỆ GỖ */}
                      <div className="w-full relative aspect-[1/1.42] rounded-l-xs rounded-r-md overflow-hidden border-l-2 border-white/20 shadow-[-4px_2px_8px_rgba(0,0,0,0.5),4px_4px_12px_rgba(0,0,0,0.7),0_8px_14px_rgba(0,0,0,0.85)] group-hover:-translate-y-2 group-hover:scale-[1.03] active:scale-[0.98] transition-all duration-200">
                        {/* Ảnh bìa sách */}
                        {book.cover_url ? (
                          <img
                            src={book.cover_url}
                            alt={book.title}
                            className="w-full h-full object-cover block"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-900 to-stone-900 flex flex-col justify-between p-2 text-center">
                            <span className="text-[9px] font-bold text-amber-300">Qbiz Books</span>
                            <span className="text-[11px] font-bold text-white line-clamp-3">
                              {book.title}
                            </span>
                            <span className="text-[9px] text-amber-200/80">{book.author || 'Y học'}</span>
                          </div>
                        )}

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

                        {/* Nút hành động nổi lên khi hover / chạm: Đọc 3D & Chi tiết */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onReadBook3D(book);
                          }}
                          className="absolute inset-0 bg-black/45 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-200 flex flex-col items-center justify-center gap-1.5 p-2"
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
                                    disabled={originalIndex === books.length - 1}
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
                      </div>

                      {/* Vệt bóng đổ tiếp xúc giữa chân bìa sách và mặt gỗ (Book-Shelf Contact Shadow) */}
                      <div className="w-[88%] h-[5px] -mt-[2px] bg-black/85 rounded-full blur-[1.5px] pointer-events-none" />
                    </div>
                  );
                })}
              </div>

              {/* MẶT GỖ KỆ SÁCH (WOOD PLANK) - CHÂN DÃY SÁCH TỰA TRỰC TIẾP LÊN MẶT GỖ NÀY */}
              <div className="relative -mt-[1px] -mx-1 sm:-mx-2 z-5 pointer-events-none">
                {/* Bề mặt trên của thanh gỗ - nơi chân sách tiếp xúc */}
                <div
                  className="h-[8px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.32)]"
                  style={{
                    background: 'linear-gradient(180deg, #6c4222 0%, #4f2f16 70%, #341e0d 100%)',
                  }}
                />
                {/* Gờ mép trước thanh gỗ dày nổi 3D cao cấp */}
                <div
                  className="h-[14px] rounded-b-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_22px_rgba(0,0,0,0.95)]"
                  style={{
                    background: 'linear-gradient(180deg, #8f582b 0%, #683d1c 50%, #3c230e 100%)',
                  }}
                />
                {/* Bóng đổ của thanh gỗ xuống không gian bên dưới */}
                <div
                  className="h-[18px] -mt-[1px]"
                  style={{
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
`;

fs.writeFileSync(shelfPath, newShelfCode, 'utf8');
console.log('[OK] Rewrote WoodenBookshelf.tsx with authentic physical shelf resting');
`;

fs.writeFileSync('scripts/apply_minimalist_display.js', scriptContent, 'utf8');
console.log('[OK] Created scripts/apply_minimalist_display.js');
