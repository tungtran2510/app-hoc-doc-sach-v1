'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Edit2,
  Check,
  Save,
  Loader2,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import {
  saveBookMetadataOverride,
  CURATED_COVER_TEMPLATES,
} from '../lib/userBooksManager';
import { RecommendedBook } from '../lib/types';
import { offlineStorage } from '../lib/offlineStorage';

interface QuickEditBookModalProps {
  isOpen: boolean;
  book: RecommendedBook | null;
  onClose: () => void;
  onSaved?: (updatedBook: RecommendedBook) => void;
  onDeleted?: (deletedBookId: string) => void;
}

export default function QuickEditBookModal({
  isOpen,
  book,
  onClose,
  onSaved,
  onDeleted,
}: QuickEditBookModalProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [selectedCover, setSelectedCover] = useState<string>('');
  const [customCoverBlob, setCustomCoverBlob] = useState<Blob | null>(null);
  const [customCoverPreview, setCustomCoverPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isOfflineBook, setIsOfflineBook] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && book) {
      setTitle(book.title || '');
      setAuthor(book.author || '');
      setSelectedCover(book.cover_url || CURATED_COVER_TEMPLATES[0].url);
      setCustomCoverBlob(null);
      setCustomCoverPreview(null);
      setErrorMsg('');

      // Kiểm tra xem sách có phải sách ngoại tuyến / đã lưu trong IndexedDB không
      offlineStorage.isBookCached(book.file_url || book.id).then((cached) => {
        setIsOfflineBook(cached || book.id.startsWith('imported-') || book.id.startsWith('custom-url-'));
      });
    }
  }, [isOpen, book]);

  if (!isOpen || !book) return null;

  const handleCustomCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCustomCoverBlob(file);
    const previewUrl = URL.createObjectURL(file);
    setCustomCoverPreview(previewUrl);
    setSelectedCover(previewUrl);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setErrorMsg('Vui lòng nhập tên cuốn sách.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg('');

      const effectiveCover = customCoverPreview || selectedCover;

      await saveBookMetadataOverride(book.id || book.title, {
        title: cleanTitle,
        author: author.trim() || 'Tác giả',
        coverUrl: effectiveCover,
      });

      const updated: RecommendedBook = {
        ...book,
        title: cleanTitle,
        author: author.trim() || book.author,
        cover_url: effectiveCover,
      };

      onSaved?.(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Lỗi khi lưu thông tin.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Bạn có chắc chắn muốn xóa cuốn sách "${book.title}" khỏi bộ nhớ máy?`)) return;

    try {
      setIsDeleting(true);
      await offlineStorage.removeBookFromOffline(book.file_url || book.id);
      onDeleted?.(book.id);
      onClose();
    } catch (err: any) {
      setErrorMsg('Lỗi khi xóa sách: ' + err?.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-[#FAF5ED] to-[#EFE5D6] dark:from-[#25170e] dark:to-[#170e08] border border-amber-900/20 dark:border-amber-900/60 p-4 sm:p-5 text-[#2c180c] dark:text-amber-100 shadow-2xl relative flex flex-col gap-3.5 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <Edit2 size={15} strokeWidth={2.4} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wide text-[#2c180c] dark:text-amber-100">
              Sửa Tiêu Đề & Bìa Sách
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-700 dark:text-red-300 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="flex flex-col gap-3">
          {/* Ô SỬA TIÊU ĐỀ SÁCH */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-amber-900/80 dark:text-amber-200/80">
              Tiêu đề cuốn sách:
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề sách..."
              className="w-full h-8.5 px-3 rounded-xl border border-black/15 dark:border-white/15 bg-white/70 dark:bg-black/40 text-xs focus:outline-none focus:border-amber-500 font-bold"
            />
          </div>

          {/* Ô SỬA TÁC GIẢ */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-amber-900/80 dark:text-amber-200/80">
              Tác giả:
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Tên tác giả..."
              className="w-full h-8.5 px-3 rounded-xl border border-black/15 dark:border-white/15 bg-white/70 dark:bg-black/40 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* CHỌN BÌA SÁCH: 4 BÌA NGHỆ THUẬT MẪU HOẶC TẢI BÌA RIÊNG */}
          <div className="flex flex-col gap-1.5 pt-0.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-amber-900/80 dark:text-amber-200/80">
                Ảnh bìa hiển thị:
              </label>
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ImageIcon size={11} />
                <span>Tải ảnh bìa mới</span>
              </button>
            </div>

            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCustomCoverChange}
              className="hidden"
            />

            {/* 4 Bìa mẫu có sẵn */}
            <div className="grid grid-cols-4 gap-1.5">
              {CURATED_COVER_TEMPLATES.map((tmpl) => {
                const isSelected = selectedCover === tmpl.url && !customCoverPreview;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => {
                      setSelectedCover(tmpl.url);
                      setCustomCoverPreview(null);
                    }}
                    className={`relative aspect-[1/1.4] rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-400/50 scale-102'
                        : 'border-transparent opacity-75 hover:opacity-100'
                    }`}
                    title={tmpl.name}
                  >
                    <img
                      src={tmpl.url}
                      alt={tmpl.name}
                      className="w-full h-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {customCoverPreview && (
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                <Check size={12} className="text-amber-500 shrink-0" />
                <span className="truncate">Đã chọn ảnh bìa riêng mới</span>
              </div>
            )}
          </div>

          {/* CÁC NÚT THAO TÁC */}
          <div className="flex items-center gap-2 pt-2">
            {isOfflineBook && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-2.5 py-2 rounded-xl bg-red-100 dark:bg-red-950/40 hover:bg-red-200 text-red-700 dark:text-red-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                title="Xóa cuốn sách này khỏi bộ nhớ máy"
              >
                <Trash2 size={13} />
                <span className="hidden xs:inline">Xóa sách</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-xs font-bold transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-98"
            >
              {isSaving ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save size={14} strokeWidth={2.4} />
                  <span>Lưu Thay Đổi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
