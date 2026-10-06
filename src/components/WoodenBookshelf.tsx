'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Info,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Search,
  Sun,
  Moon,
  Settings,
  Plus,
  LogOut,
  Sparkles,
  Bell,
  Smartphone,
  X,
  Volume2,
  VolumeX,
  BookmarkCheck,
  Bookmark,
  ChevronRight,
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
  appName?: string | null;
  logoUrl?: string | null;
  onOpenWelcome?: () => void;
  onOpenAdminSettings?: () => void;
  onOpenEditApp?: () => void;
  onOpenAddBookModal?: () => void;
  onOpenUserSync?: () => void;
  onOpenPwaInstall?: () => void;
  onLogout?: () => void;
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
  appName = 'Qbiz-ebook',
  logoUrl,
  onOpenWelcome,
  onOpenAdminSettings,
  onOpenEditApp,
  onOpenAddBookModal,
  onOpenUserSync,
  onOpenPwaInstall,
  onLogout,
}: WoodenBookshelfProps) {
  // Lời chào và tên người dùng
  const [userName, setUserName] = useState<string>('bạn');
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // Chế độ Sáng / Tối
  const [isDark, setIsDark] = useState(false);

  // Menu Cài đặt & Tài khoản
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Tùy chọn chuyên sâu đọc sách (Đồng bộ với Reader 3D)
  const [readerPaperTheme, setReaderPaperTheme] = useState<'sepia' | 'dark' | 'ivory'>('sepia');
  const [readerDefaultMode, setReaderDefaultMode] = useState<'curl' | 'roll' | 'scroll'>('curl');
  const [readerSoundEnabled, setReaderSoundEnabled] = useState<boolean>(true);
  const [readerAutoResume, setReaderAutoResume] = useState<boolean>(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('user_display_name');
      if (saved && saved.trim()) {
        setUserName(saved.trim());
      }
    } catch {}

    try {
      const storedTheme = localStorage.getItem('giao_dien');
      const darkActive =
        storedTheme === 'dark' ||
        (!storedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDark(darkActive);
      if (darkActive) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch {
      setIsDark(false);
    }

    try {
      const savedPaper = localStorage.getItem('reader_theme_pref');
      if (savedPaper && ['sepia', 'dark', 'ivory'].includes(savedPaper)) {
        setReaderPaperTheme(savedPaper as any);
      }
      const savedMode = localStorage.getItem('reader_mode_pref');
      if (savedMode && ['curl', 'roll', 'scroll'].includes(savedMode)) {
        setReaderDefaultMode(savedMode as any);
      }
      const savedSound = localStorage.getItem('reader_sound_pref');
      if (savedSound !== null) {
        setReaderSoundEnabled(savedSound !== 'false');
      }
      const savedResume = localStorage.getItem('reader_autoresume_pref');
      if (savedResume !== null) {
        setReaderAutoResume(savedResume !== 'false');
      }
    } catch {}
  }, []);

  const handleSaveName = (newName: string) => {
    const val = newName.trim() || 'bạn';
    setUserName(val);
    try {
      localStorage.setItem('user_display_name', val);
    } catch {}
    setShowNameModal(false);
  };

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    try {
      if (nextDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('giao_dien', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('giao_dien', 'light');
      }
    } catch {}
  };

  const handleChangePaperTheme = (theme: 'sepia' | 'dark' | 'ivory') => {
    setReaderPaperTheme(theme);
    try {
      localStorage.setItem('reader_theme_pref', theme);
    } catch {}
  };

  const handleChangeDefaultMode = (mode: 'curl' | 'roll' | 'scroll') => {
    setReaderDefaultMode(mode);
    try {
      localStorage.setItem('reader_mode_pref', mode);
    } catch {}
  };

  const handleToggleSound = () => {
    const next = !readerSoundEnabled;
    setReaderSoundEnabled(next);
    try {
      localStorage.setItem('reader_sound_pref', next ? 'true' : 'false');
    } catch {}
  };

  const handleToggleAutoResume = () => {
    const next = !readerAutoResume;
    setReaderAutoResume(next);
    try {
      localStorage.setItem('reader_autoresume_pref', next ? 'true' : 'false');
    } catch {}
  };

  // Lọc sách hiển thị (nếu không phải admin thì ẩn sách có is_visible = false)
  const visibleBooks = books.filter((b) => isAdmin || b.is_visible !== false);

  if (visibleBooks.length === 0 && !isAdmin) {
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

  const currentAppTitle = appName || 'Qbiz-ebook';
  const [firstWord, restWords] = currentAppTitle.includes('-')
    ? [currentAppTitle.split('-')[0], `-${currentAppTitle.split('-').slice(1).join('-')}`]
    : currentAppTitle.includes(' ')
    ? [currentAppTitle.split(' ')[0], currentAppTitle.split(' ').slice(1).join(' ')]
    : [currentAppTitle, ''];

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-b from-[#24170d] via-[#1c1109] to-[#130a04] p-3 sm:p-5 border border-[#3d2817] shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] select-none">
      {/* Đèn rọi kệ sách ấm cúng trên đỉnh (Overhead Ambient Spotlight) */}
      <div
        className="absolute top-0 left-[10%] right-[10%] h-[180px] pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(251, 191, 36, 0.16) 0%, transparent 75%)',
        }}
      />

      {/* 1. KHUNG THƯƠNG HIỆU & LỜI CHÀO & CÀI ĐẶT TÍCH HỢP TRÊN ĐỈNH KỆ SÁCH */}
      <div className="relative z-20 mb-4 sm:mb-5">
        <div className="w-full rounded-[14px] bg-gradient-to-r from-[#2c1a10] via-[#3a2316] to-[#25170e] text-[#fdf7ee] border border-[#5a3a24] shadow-[0_8px_20px_rgba(0,0,0,0.6)] animate-bio-breathing hover:border-amber-500/80 hover:shadow-[0_10px_28px_rgba(217,119,6,0.25)] transition-all duration-300 p-2.5 sm:p-3 flex items-center justify-between gap-2.5">
          {/* BÊN TRÁI: Logo app 3D */}
          <div
            onClick={onOpenWelcome}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-[12px] overflow-hidden border border-amber-400/60 shadow-md shrink-0 bg-[#0C152B] p-0.5 cursor-pointer hover:scale-105 transition-transform"
            title="Xem lời ngỏ & video giới thiệu"
          >
            <img
              src={logoUrl || '/logo.png'}
              alt="Logo Qbiz-ebook"
              className="w-full h-full object-cover rounded-[9px]"
            />
          </div>

          {/* Ở GIỮA: Tên thương hiệu + Lời chào "Hi, [tên người dùng]!" (THAY THẾ CHỮ TIẾNG ANH NỔI NỔI) */}
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] sm:text-[16px] font-black tracking-tight text-[#fdf7ee] uppercase drop-shadow-sm">
                {firstWord}
              </span>
              <span className="text-[15px] sm:text-[16px] font-black tracking-tight text-amber-400 uppercase drop-shadow-sm">
                {restWords}
              </span>
            </div>
            {/* Thay chữ tiếng Anh bằng chữ "Hi, [tên người dùng]!" */}
            <button
              type="button"
              onClick={() => {
                setNameInput(userName === 'bạn' ? '' : userName);
                setShowNameModal(true);
              }}
              className="text-[11.5px] sm:text-[12px] font-bold text-amber-200/90 hover:text-amber-100 mt-0.5 flex items-center gap-1 cursor-pointer transition-colors text-left group/greet truncate"
              title="Bấm để đổi tên của bạn"
            >
              <span className="truncate">Hi, {userName || 'bạn'}! 👋</span>
              <Edit2 size={10} className="text-amber-400/60 group-hover/greet:text-amber-300 shrink-0" />
            </button>
          </div>

          {/* BÊN PHẢI: CỤM CÀI ĐẶT & TIỆN ÍCH DỒN HẾT VÀO KHUNG NÀY */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Kính lúp tìm kiếm */}
            <Link
              href="/tim-kiem"
              prefetch={true}
              className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-amber-200 hover:text-white transition-all cursor-pointer shadow-xs"
              title="Tìm kiếm sách y khoa"
              aria-label="Tìm kiếm"
            >
              <Search size={15} strokeWidth={2.4} />
            </Link>

            {/* Chuyển chế độ Sáng / Tối */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-amber-300 hover:text-amber-200 transition-all cursor-pointer shadow-xs"
              title={isDark ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'}
              aria-label="Sáng / Tối"
            >
              {isDark ? <Sun size={15} strokeWidth={2.4} /> : <Moon size={15} strokeWidth={2.4} />}
            </button>

            {/* Nút Cài đặt / Quản trị */}
            <button
              type="button"
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 flex items-center justify-center transition-all cursor-pointer shadow-sm relative active:scale-95"
              title="Cài đặt & Tài khoản"
              aria-label="Cài đặt"
            >
              <Settings size={15} strokeWidth={2.4} />
              {isAdmin && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 ring-1 ring-black" />
              )}
            </button>
          </div>
        </div>

        {/* THANH ĐIỀU KHIỂN QUẢN TRỊ VIÊN NHANH (KHI ĐĂNG NHẬP ADMIN) */}
        {isAdmin && (
          <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-2 text-[11px] text-amber-200">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span>QUẢN TRỊ VIÊN</span>
            </div>
            <div className="flex items-center gap-1.5">
              {onOpenAddBookModal && (
                <button
                  type="button"
                  onClick={onOpenAddBookModal}
                  className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus size={12} strokeWidth={2.5} />
                  <span>Thêm sách</span>
                </button>
              )}
              {onOpenAdminSettings && (
                <button
                  type="button"
                  onClick={onOpenAdminSettings}
                  className="px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 text-white font-semibold transition-colors cursor-pointer"
                >
                  Cài đặt
                </button>
              )}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-2 py-0.5 rounded bg-red-500/30 hover:bg-red-500/50 text-red-200 font-semibold transition-colors cursor-pointer"
                >
                  Thoát
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* TIÊU ĐỀ GIAN TRƯNG BÀY SÁCH (TỐI GIẢN - KHÔNG TỪ THỪA) */}
      <div className="relative z-10 flex items-center justify-between mb-5 px-1 sm:px-2">
        <div className="flex items-center gap-2">
          <span className="text-base select-none">📚</span>
          <h2 className="text-[13.5px] sm:text-[15px] font-black tracking-wide text-amber-200 uppercase drop-shadow-sm">
            {title}
          </h2>
        </div>
      </div>

      {/* CÁC TẦNG KỆ SÁCH (SÁCH ĐỨNG TRỰC TIẾP TRÊN MẶT GỖ - ZERO FLOATING) */}
      <div className="relative z-10 flex flex-col gap-7 sm:gap-9">
        {tiers.map((tierBooks, tierIdx) => {
          return (
            <div key={`tier-${tierIdx}`} className="relative">
              {/* Dãy sách đứng vững trên mặt gỗ */}
              <div className="flex items-end justify-around gap-2.5 sm:gap-4 px-1.5 sm:px-3 relative z-10">
                {tierBooks.map((book) => {
                  const originalIndex = books.findIndex((b) => b.id === book.id);
                  const isHidden = book.is_visible === false;
                  if (isHidden && !isAdmin) return null;

                  return (
                    <div
                      key={book.id || originalIndex}
                      className={`flex-1 max-w-[122px] sm:max-w-[150px] flex flex-col items-center group relative cursor-pointer ${
                        isHidden ? 'opacity-65' : ''
                      }`}
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

      {/* POPUP / MODAL ĐỔI TÊN HIỂN THỊ ("Hi, [tên người dùng]!") */}
      {showNameModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowNameModal(false)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-[#22150c] border border-[#553622] text-[#fdf7ee] p-4 shadow-2xl flex flex-col gap-3 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1 border-b border-white/10">
              <h3 className="text-sm font-bold text-amber-200">
                Đổi tên hiển thị
              </h3>
              <button
                type="button"
                onClick={() => setShowNameModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-[12px] text-amber-100/70">
              Nhập tên hoặc danh xưng của bạn để hiển thị lời chào trên đầu kệ sách.
            </p>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Ví dụ: Tùng, Dr. Tùng, Lan..."
              maxLength={30}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-amber-500/40 text-white text-[13px] placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName(nameInput);
              }}
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowNameModal(false)}
                className="px-3 py-1.5 rounded-lg text-[12px] text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleSaveName(nameInput)}
                className="px-3.5 py-1.5 rounded-lg text-[12px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer"
              >
                Lưu tên
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CÀI ĐẶT & TÙY CHỌN ĐỌC SÁCH CHUYÊN SÂU - TINH GỌN CHUẨN 1 DÒNG */}
      {showSettingsMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
          onClick={() => setShowSettingsMenu(false)}
        >
          <div
            className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl bg-[#20130a] border border-[#553622] text-[#fdf7ee] p-3.5 sm:p-4 shadow-2xl flex flex-col gap-2.5 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tiêu đề Modal 1 dòng */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <Settings size={17} className="text-amber-400" />
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-200">
                  Cài đặt & Tùy chọn đọc
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsMenu(false)}
                className="w-7 h-7 rounded-full text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
                title="Đóng"
                aria-label="Đóng"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5 text-xs py-0.5">
              {/* 1. TÔNG MÀU GIẤY ĐỌC SÁCH (1 dòng tinh gọn) */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-black/35 border border-white/5 whitespace-nowrap">
                <span className="text-amber-100/90 font-medium">Giấy đọc:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleChangePaperTheme('sepia')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      readerPaperTheme === 'sepia'
                        ? 'bg-[#3d3327] text-amber-300 ring-1 ring-amber-400'
                        : 'bg-black/40 text-slate-400 hover:text-slate-200'
                    }`}
                    title="Vàng Sepia"
                  >
                    ☕ Sepia
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangePaperTheme('dark')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      readerPaperTheme === 'dark'
                        ? 'bg-slate-900 text-amber-300 ring-1 ring-amber-400'
                        : 'bg-black/40 text-slate-400 hover:text-slate-200'
                    }`}
                    title="Đen OLED"
                  >
                    🌑 Đêm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangePaperTheme('ivory')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      readerPaperTheme === 'ivory'
                        ? 'bg-amber-100 text-slate-900 ring-1 ring-amber-500'
                        : 'bg-black/40 text-slate-400 hover:text-slate-200'
                    }`}
                    title="Trắng ngà"
                  >
                    📜 Ngà
                  </button>
                </div>
              </div>

              {/* 2. CHẾ ĐỘ LẬT TRANG MẶC ĐỊNH (1 dòng tinh gọn) */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-black/35 border border-white/5 whitespace-nowrap">
                <span className="text-amber-100/90 font-medium">Lật trang:</span>
                <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => handleChangeDefaultMode('curl')}
                    className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-all cursor-pointer ${
                      readerDefaultMode === 'curl'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Lật 3D
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeDefaultMode('roll')}
                    className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-all cursor-pointer ${
                      readerDefaultMode === 'roll'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Trượt 3D
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeDefaultMode('scroll')}
                    className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-all cursor-pointer ${
                      readerDefaultMode === 'scroll'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Cuộn dọc
                  </button>
                </div>
              </div>

              {/* 3. ÂM THANH LẬT SÁCH (1 dòng tinh gọn có công tắc) */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-black/35 border border-white/5 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  {readerSoundEnabled ? (
                    <Volume2 size={16} className="text-amber-400" />
                  ) : (
                    <VolumeX size={16} className="text-slate-500" />
                  )}
                  <span className="text-amber-100/90 font-medium">Âm thanh lật sách</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleSound}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                    readerSoundEnabled ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                  aria-label="Bật tắt âm thanh"
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* 4. TỰ ĐỘNG NHỚ TRANG ĐỌC DỞ (1 dòng tinh gọn có công tắc) */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-black/35 border border-white/5 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <BookmarkCheck size={16} className="text-amber-400" />
                  <span className="text-amber-100/90 font-medium">Tự nhớ trang đọc dở</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAutoResume}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                    readerAutoResume ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                  aria-label="Bật tắt tự nhớ trang"
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* 5. DẤU TRANG & SÁCH ĐÃ LƯU (1 dòng) */}
              <Link
                href="/da-luu"
                onClick={() => setShowSettingsMenu(false)}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-white/10 transition-colors text-amber-100 whitespace-nowrap"
              >
                <div className="flex items-center gap-2">
                  <Bookmark size={16} className="text-amber-400" />
                  <span>Dấu trang & Sách đã lưu</span>
                </div>
                <span className="text-[11px] text-amber-300 font-bold">Mở →</span>
              </Link>

              {/* 6. ĐỔI TÊN HIỂN THỊ (1 dòng) */}
              <button
                type="button"
                onClick={() => {
                  setShowSettingsMenu(false);
                  setNameInput(userName === 'bạn' ? '' : userName);
                  setShowNameModal(true);
                }}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-white/10 transition-colors text-amber-100 cursor-pointer whitespace-nowrap"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Edit2 size={16} className="text-amber-400 shrink-0" />
                  <span className="truncate">Tên bạn: {userName}</span>
                </div>
                <span className="text-[11px] text-amber-300 font-bold shrink-0 ml-2">Đổi</span>
              </button>

              {/* 7. CÀI APP RA MÀN HÌNH CHÍNH (PWA) (1 dòng) */}
              {onOpenPwaInstall && (
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsMenu(false);
                    onOpenPwaInstall();
                  }}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-white/10 transition-colors text-amber-100 cursor-pointer whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    <Smartphone size={16} className="text-amber-400" />
                    <span>Cài ứng dụng ra màn hình</span>
                  </div>
                  <span className="text-[11px] text-slate-300">PWA</span>
                </button>
              )}

              {/* 8. LỜI NGỎ & VIDEO (1 dòng) */}
              {onOpenWelcome && (
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsMenu(false);
                    onOpenWelcome();
                  }}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-white/10 transition-colors text-amber-100 cursor-pointer whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-amber-400" />
                    <span>Lời ngỏ giới thiệu</span>
                  </div>
                  <span className="text-[11px] text-slate-300">Xem</span>
                </button>
              )}

              {/* 9. KHỐI QUẢN TRỊ VIÊN (1 dòng) */}
              <div className="h-px bg-white/10 my-0.5" />
              {isAdmin ? (
                <>
                  {onOpenAdminSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettingsMenu(false);
                        onOpenAdminSettings();
                      }}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-white/10 transition-colors text-amber-200 cursor-pointer whitespace-nowrap"
                    >
                      <div className="flex items-center gap-2">
                        <Settings size={16} className="text-amber-400" />
                        <span>Cài đặt hệ thống</span>
                      </div>
                      <span className="text-[11px] text-amber-300 font-bold">Admin</span>
                    </button>
                  )}
                  {onOpenAddBookModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettingsMenu(false);
                        onOpenAddBookModal();
                      }}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-white/10 transition-colors text-amber-200 cursor-pointer whitespace-nowrap"
                    >
                      <div className="flex items-center gap-2">
                        <Plus size={16} className="text-amber-400" />
                        <span>Thêm sách mới</span>
                      </div>
                      <span className="text-[11px] text-amber-300 font-bold">+Sách</span>
                    </button>
                  )}
                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettingsMenu(false);
                        onLogout();
                      }}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-red-500/20 text-red-300 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <div className="flex items-center gap-2">
                        <LogOut size={16} className="text-red-400" />
                        <span>Đăng xuất Quản trị</span>
                      </div>
                      <span className="text-[11px] text-red-400 font-bold">Thoát</span>
                    </button>
                  )}
                </>
              ) : (
                <Link
                  href="/dang-nhap"
                  onClick={() => setShowSettingsMenu(false)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-white/10 transition-colors text-amber-200 cursor-pointer whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    <Settings size={16} className="text-amber-400" />
                    <span>Đăng nhập Quản trị viên</span>
                  </div>
                  <span className="text-[11px] text-amber-400 font-bold">Khóa</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
