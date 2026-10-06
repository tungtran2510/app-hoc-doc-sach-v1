'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Plus,
  Trash2,
  Save,
  Loader2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  LayoutGrid,
  List,
  Edit2,
  FileText,
  Layers,
} from 'lucide-react';
import { RecommendedBook } from '../../lib/types';
import { saveSettingsApi } from '../../lib/apiAdmin';
import EditSingleRecommendedBookModal from './EditSingleRecommendedBookModal';

interface EditRecommendedBooksModalProps {
  isOpen: boolean;
  initialTitle?: string | null;
  initialSubtitle?: string | null;
  initialBooks?: RecommendedBook[];
  initialLayout?: 'bookshelf' | 'grid' | 'lookbook' | null;
  onClose: () => void;
  onSaved: (data: {
    title: string;
    subtitle: string;
    books: RecommendedBook[];
    layout?: 'bookshelf' | 'grid' | 'lookbook';
  }) => void;
}

export default function EditRecommendedBooksModal({
  isOpen,
  initialTitle,
  initialSubtitle,
  initialBooks = [],
  initialLayout = 'bookshelf',
  onClose,
  onSaved,
}: EditRecommendedBooksModalProps) {
  const [title, setTitle] = useState(initialTitle || 'GIAN TRƯNG BÀY');
  const [subtitle, setSubtitle] = useState(
    initialSubtitle || 'Tủ sách y khoa chuyên sâu chuẩn SideBooks 3D'
  );
  const [layout, setLayout] = useState<'bookshelf' | 'grid' | 'lookbook'>(
    initialLayout === 'lookbook' ? 'lookbook' : initialLayout === 'grid' ? 'grid' : 'bookshelf'
  );
  const [books, setBooks] = useState<RecommendedBook[]>([]);
  const [editingSingleBook, setEditingSingleBook] = useState<RecommendedBook | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle || 'GIAN TRƯNG BÀY');
      setSubtitle(
        initialSubtitle || 'Tủ sách y khoa chuyên sâu chuẩn SideBooks 3D'
      );
      setLayout(
        initialLayout === 'lookbook'
          ? 'lookbook'
          : initialLayout === 'grid'
          ? 'grid'
          : 'bookshelf'
      );
      setBooks(
        Array.isArray(initialBooks) && initialBooks.length > 0
          ? initialBooks.map((b) => ({
              ...b,
              gallery_images: Array.isArray(b.gallery_images) ? [...b.gallery_images] : [],
              flipbook_pages: Array.isArray(b.flipbook_pages) ? [...b.flipbook_pages] : [],
            }))
          : []
      );
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, initialTitle, initialSubtitle, initialBooks, initialLayout]);

  if (!isOpen) return null;

  // Mở form thêm cuốn sách mới riêng biệt
  const handleAddNewBook = () => {
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

  // Lưu một cuốn sách sau khi thêm mới hoặc sửa
  const handleSaveSingleBook = async (savedBook: RecommendedBook) => {
    let nextBooks = [...books];
    const existsIndex = nextBooks.findIndex((b) => b.id === savedBook.id);
    if (existsIndex >= 0) {
      nextBooks[existsIndex] = savedBook;
    } else {
      // Đưa sách mới lên đầu giá sách để người dùng thấy ngay
      nextBooks = [savedBook, ...nextBooks];
    }
    setBooks(nextBooks);
    setEditingSingleBook(null);

    // Lưu ngay lập tức vào CSDL
    try {
      await saveSettingsApi({
        recommended_books: nextBooks,
      });
      onSaved({
        title,
        subtitle,
        books: nextBooks,
        layout,
      });
      setSuccessMsg('✓ Đã cập nhật sách vào giá sách thành công!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu sách.');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= books.length) return;
    const next = [...books];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setBooks(next);
  };

  const handleDeleteBook = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa cuốn sách này khỏi giá sách?')) return;
    const next = books.filter((b) => b.id !== id);
    setBooks(next);
    try {
      await saveSettingsApi({
        recommended_books: next,
      });
      onSaved({
        title,
        subtitle,
        books: next,
        layout,
      });
      setSuccessMsg('✓ Đã xóa sách khỏi giá sách thành công!');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi xóa sách.');
    }
  };

  // Lưu cài đặt chung (tiêu đề, bố cục)
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setErrorMsg('');

      await saveSettingsApi({
        recommended_books_title: title.trim(),
        recommended_books_subtitle: subtitle.trim(),
        recommended_books_layout: layout,
        recommended_books: books,
      });

      onSaved({
        title: title.trim(),
        subtitle: subtitle.trim(),
        books,
        layout,
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu cài đặt.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1c120c] rounded-[24px] border border-amber-900/30 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header tinh gọn */}
        <div className="flex items-center justify-between p-3.5 px-4 sm:px-5 border-b border-amber-900/20 bg-gradient-to-r from-amber-950/20 to-amber-900/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-[9px] bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <BookOpen size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="text-[16px] font-black text-slate-900 dark:text-amber-100 truncate leading-tight">
                Cài Đặt Sách & Giá Sách
              </h3>
              <p className="text-[11.5px] text-slate-500 dark:text-amber-200/60 truncate">
                Quản lý các đầu sách trên kệ gỗ 3D và thêm sách từng cuốn một
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/10 transition-colors cursor-pointer shrink-0 ml-2"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body form */}
        <form onSubmit={handleSaveGeneral} className="flex-1 overflow-y-auto p-3.5 sm:p-4 flex flex-col gap-3">
          {errorMsg && (
            <div className="p-2.5 rounded-[10px] bg-red-500/15 border border-red-500/30 text-red-700 dark:text-red-300 text-[12px] font-semibold leading-relaxed">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-2.5 rounded-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-[12px] font-semibold leading-relaxed">
              {successMsg}
            </div>
          )}

          {/* Cài đặt chung mục sách (tinh gọn, 1 hàng) */}
          <div className="p-3 rounded-[14px] bg-amber-500/5 border border-amber-900/20 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 text-[11.5px] font-black uppercase tracking-wider">
                <Sparkles size={13} />
                <span>Cài đặt chung</span>
              </div>

              {/* Segmented layout switch */}
              <div className="flex items-center gap-1 bg-white/40 dark:bg-black/40 p-0.5 rounded-[8px] border border-amber-900/20">
                <button
                  type="button"
                  onClick={() => setLayout('bookshelf')}
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded-[6px] text-[11px] font-bold transition-all cursor-pointer ${
                    layout === 'bookshelf'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-amber-200/70 hover:text-amber-300'
                  }`}
                  title="Kệ sách gỗ 3D sang trọng"
                >
                  <BookOpen size={12} />
                  <span>Kệ gỗ 3D</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayout('grid')}
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded-[6px] text-[11px] font-bold transition-all cursor-pointer ${
                    layout === 'grid'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-amber-200/70 hover:text-amber-300'
                  }`}
                  title="Lưới 2 cột hiện đại"
                >
                  <LayoutGrid size={12} />
                  <span>Lưới 2 cột</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayout('lookbook')}
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded-[6px] text-[11px] font-bold transition-all cursor-pointer ${
                    layout === 'lookbook'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-amber-200/70 hover:text-amber-300'
                  }`}
                  title="Danh sách xếp dọc"
                >
                  <List size={12} />
                  <span>Danh sách</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-800 dark:text-amber-200 mb-0.5">
                  Tiêu đề mục hiển thị
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: GIAN TRƯNG BÀY"
                  className="w-full h-8 px-2.5 rounded-[8px] bg-white dark:bg-[#120a06] border border-amber-900/30 text-[12px] text-slate-900 dark:text-amber-100 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-800 dark:text-amber-200 mb-0.5">
                  Mô tả phụ
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Ví dụ: Tủ sách y khoa chuyên sâu..."
                  className="w-full h-8 px-2.5 rounded-[8px] bg-white dark:bg-[#120a06] border border-amber-900/30 text-[12px] text-slate-900 dark:text-amber-100 focus:border-amber-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Danh sách các cuốn sách & Nút thêm từng cuốn */}
          <div className="flex flex-col gap-2.5 mt-1">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-extrabold text-slate-900 dark:text-amber-100">
                Danh sách sách trên kệ ({books.length} cuốn)
              </span>

              {/* NÚT THÊM TỪNG CUỐN SÁCH MỚI */}
              <button
                type="button"
                onClick={handleAddNewBook}
                className="flex items-center gap-1.5 h-8 px-3 rounded-[10px] bg-amber-500 hover:bg-amber-400 text-slate-950 text-[12px] font-black transition-all cursor-pointer shadow-md active:scale-95"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>+ Thêm cuốn sách mới</span>
              </button>
            </div>

            {books.length === 0 ? (
              <div className="p-8 rounded-[16px] border border-dashed border-amber-900/30 text-center flex flex-col items-center justify-center gap-2">
                <BookOpen size={28} className="text-amber-500/60" />
                <p className="text-[13px] text-slate-600 dark:text-amber-200/70 font-medium">
                  Chưa có cuốn sách nào trên kệ.
                </p>
                <button
                  type="button"
                  onClick={handleAddNewBook}
                  className="text-[12.5px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  + Nhấn vào đây để thêm cuốn đầu tiên
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {books.map((book, idx) => (
                  <div
                    key={book.id || idx}
                    className="p-2.5 sm:p-3 rounded-[14px] bg-white dark:bg-[#140d08] border border-amber-900/25 hover:border-amber-500/40 shadow-xs flex items-center justify-between gap-2.5 transition-all group"
                  >
                    {/* Bìa sách nhỏ + Thông tin tóm tắt */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="text-[10px] font-mono font-bold text-amber-500 w-5 text-center shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="w-9 h-12 rounded-sm overflow-hidden bg-stone-900 border border-white/10 shrink-0 shadow-inner">
                        {book.cover_url ? (
                          <img
                            src={book.cover_url}
                            alt={book.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-amber-400/40">
                            <BookOpen size={14} />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col min-w-0 flex-1">
                        <h4 className="text-[12.5px] font-extrabold text-slate-900 dark:text-amber-100 truncate">
                          {book.title || 'Chưa đặt tên sách'}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 dark:text-amber-200/60 truncate mt-0.5">
                          <span className="truncate">{book.category || book.tag || 'Tài liệu'}</span>
                          <span>•</span>
                          <span className="truncate">{book.author || 'Tác giả'}</span>
                        </div>
                        {/* Huy hiệu: Có PDF / Số trang 3D */}
                        <div className="flex items-center gap-1 mt-1">
                          {book.pdf_url && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center gap-0.5">
                              <FileText size={9} />
                              <span>PDF</span>
                            </span>
                          )}
                          {book.flipbook_pages && book.flipbook_pages.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-0.5">
                              <Layers size={9} />
                              <span>{book.flipbook_pages.length} trang 3D</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Các nút hành động: Sửa, Di chuyển, Xóa */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingSingleBook(book)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-amber-500/20"
                        title="Chỉnh sửa chi tiết cuốn sách này & Tải tệp PDF/ảnh"
                      >
                        <Edit2 size={12} />
                        <span>Sửa</span>
                      </button>

                      <div className="flex items-center bg-black/10 dark:bg-white/5 rounded-lg p-0.5 border border-white/5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMove(idx, 'up')}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-500 dark:text-amber-200/60 hover:text-slate-900 dark:hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Lên trên"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === books.length - 1}
                          onClick={() => handleMove(idx, 'down')}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-500 dark:text-amber-200/60 hover:text-slate-900 dark:hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Xuống dưới"
                        >
                          <ArrowDown size={12} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteBook(book.id)}
                        className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                        title="Xóa cuốn này khỏi kệ"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer nút Lưu */}
          <div className="pt-2 border-t border-amber-900/20 flex items-center justify-end gap-2 mt-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-[9px] text-[12px] font-bold text-slate-600 dark:text-amber-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 rounded-[9px] bg-amber-600 hover:bg-amber-500 text-white text-[12px] font-extrabold flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>Lưu thay đổi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* MODAL SỬA RIÊNG TỪNG CUỐN SÁCH (HỖ TRỢ TẢI FILE PDF THẬT, TRÍCH XUẤT TRANG VÀ BÌA 3D) */}
      <EditSingleRecommendedBookModal
        isOpen={Boolean(editingSingleBook)}
        book={editingSingleBook}
        onClose={() => setEditingSingleBook(null)}
        onSaved={handleSaveSingleBook}
      />
    </div>
  );
}
