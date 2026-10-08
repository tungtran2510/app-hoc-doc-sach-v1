'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  BookOpen,
  Check,
  Loader2,
  FileText,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import {
  importBookFromFile,
  CURATED_COVER_TEMPLATES,
  CuratedCoverTemplate,
} from '../lib/userBooksManager';
import { RecommendedBook } from '../lib/types';

interface ImportBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: (book: RecommendedBook) => void;
}

export default function ImportBookModal({
  isOpen,
  onClose,
  onImportSuccess,
}: ImportBookModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [selectedCover, setSelectedCover] = useState<string>(CURATED_COVER_TEMPLATES[0].url);
  const [customCoverBlob, setCustomCoverBlob] = useState<Blob | null>(null);
  const [customCoverPreview, setCustomCoverPreview] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const rawName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    setTitle(rawName);
    setAuthor('Sách của bạn');
    setErrorMsg('');
  };

  const handleCustomCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCustomCoverBlob(file);
    const previewUrl = URL.createObjectURL(file);
    setCustomCoverPreview(previewUrl);
    setSelectedCover(previewUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Vui lòng chọn một tệp sách (.epub, .pdf, .cbz) từ máy.');
      return;
    }

    try {
      setIsImporting(true);
      setErrorMsg('');

      const imported = await importBookFromFile(selectedFile, {
        title: title.trim() || selectedFile.name,
        author: author.trim() || 'Sách của bạn',
        coverUrl: customCoverPreview || selectedCover,
        coverBlob: customCoverBlob || undefined,
      });

      onImportSuccess?.(imported);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Lỗi khi nhập sách vào bộ nhớ.');
    } finally {
      setIsImporting(false);
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
              <Upload size={16} strokeWidth={2.4} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wide text-[#2c180c] dark:text-amber-100">
              Đưa Sách Từ Máy Vào Kệ
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* NÚT CHỌN TỆP TỪ THIẾT BỊ */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".epub,.pdf,.cbz"
            onChange={handleFileChange}
            className="hidden"
          />

          {!selectedFile ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-5 px-3 rounded-xl border-2 border-dashed border-amber-600/40 hover:border-amber-500 bg-amber-500/5 hover:bg-amber-500/10 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group active:scale-98"
            >
              <div className="w-10 h-10 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload size={20} />
              </div>
              <p className="text-xs font-black text-amber-900 dark:text-amber-200">
                Bấm để chọn tệp sách từ máy
              </p>
              <p className="text-[10px] text-amber-800/70 dark:text-amber-300/60">
                Hỗ trợ định dạng: .EPUB · .PDF · .CBZ (Mọi dung lượng)
              </p>
            </button>
          ) : (
            <div className="w-full p-2.5 rounded-xl bg-black/5 dark:bg-black/40 border border-amber-500/30 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={18} className="text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold truncate text-[12px]">{selectedFile.name}</p>
                  <p className="text-[10px] opacity-60">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Sẵn sàng nạp
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] font-bold shrink-0 cursor-pointer"
              >
                Đổi tệp
              </button>
            </div>
          )}

          {/* Ô NHẬP TIÊU ĐỀ SÁCH */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-amber-900/80 dark:text-amber-200/80">
              Tiêu đề sách hiển thị:
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tên sách..."
              className="w-full h-8.5 px-3 rounded-xl border border-black/15 dark:border-white/15 bg-white/70 dark:bg-black/40 text-xs focus:outline-none focus:border-amber-500 font-bold"
            />
          </div>

          {/* Ô NHẬP TÁC GIẢ */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-amber-900/80 dark:text-amber-200/80">
              Tác giả / Nguồn tài liệu:
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
                Tùy biến bìa sách:
              </label>
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ImageIcon size={11} />
                <span>Tải ảnh bìa riêng</span>
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
                <span className="truncate">Đã chọn ảnh bìa riêng từ thiết bị</span>
              </div>
            )}
          </div>

          {/* NÚT SUBMIT */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-xs font-bold transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!selectedFile || isImporting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-98"
            >
              {isImporting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Đang đưa sách vào kệ...</span>
                </>
              ) : (
                <>
                  <BookOpen size={14} strokeWidth={2.4} />
                  <span>Đưa Vào Kệ Sách Ngay</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
