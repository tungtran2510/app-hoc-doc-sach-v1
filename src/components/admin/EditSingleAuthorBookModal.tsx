'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  BookOpen,
  Image as ImageIcon,
  Save,
  Loader2,
  Check,
  Crop,
  Link2,
} from 'lucide-react';
import { AuthorBook } from '../../lib/types';
import { uploadImageFile } from '../../lib/storageUpload';
import EbookDirectUploadSection from './EbookDirectUploadSection';
import ImageCropModal from './ImageCropModal';
import { useImageAspectRatio } from '../../lib/imageAspectRatio';

interface EditSingleAuthorBookModalProps {
  isOpen: boolean;
  book: AuthorBook | null;
  onClose: () => void;
  onSaved: (updatedBook: AuthorBook) => Promise<void> | void;
}

export default function EditSingleAuthorBookModal({
  isOpen,
  book,
  onClose,
  onSaved,
}: EditSingleAuthorBookModalProps) {
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [flipbookPages, setFlipbookPages] = useState<string[]>([]);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [showCoverUrlInput, setShowCoverUrlInput] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const { dimensions: coverDimensions } = useImageAspectRatio(coverUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  useEffect(() => {
    if (isOpen && book) {
      setTitle(book.title || '');
      setYear(book.year || '');
      setDescription(book.description || '');
      setCoverUrl(book.cover_url || null);
      setFlipbookPages(Array.isArray(book.flipbook_pages) ? [...book.flipbook_pages] : []);
      setFileUrl(book.file_url || null);
      setFileName(book.file_name || null);
      setPdfUrl(book.pdf_url || null);
      setErrorMsg('');
      setSuccessNotice('');
    }
  }, [isOpen, book]);

  if (!isOpen || !book) return null;

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingCover(true);
      setErrorMsg('');
      const res = await uploadImageFile(file);
      if (res && res.url) {
        setCoverUrl(res.url);
        setSuccessNotice('✓ Đã cập nhật ảnh bìa sách!');
      } else {
        setErrorMsg('Chưa tải được ảnh bìa.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi tải ảnh bìa.');
    } finally {
      setIsUploadingCover(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setErrorMsg('Vui lòng nhập tên tài liệu / cuốn sách.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg('');

      const updatedBook: AuthorBook = {
        ...book,
        title: cleanTitle,
        year: year.trim() || undefined,
        description: description.trim(),
        cover_url: coverUrl ? coverUrl.trim() : null,
        youtube_url: null, // Đã loại bỏ video
        gallery_images: [], // Chỉ dùng 1 ảnh bìa duy nhất
        flipbook_pages: flipbookPages.filter(Boolean),
        file_url: fileUrl ? fileUrl.trim() : null,
        file_name: fileName ? fileName.trim() : null,
        pdf_url: pdfUrl ? pdfUrl.trim() : (fileUrl?.toLowerCase().endsWith('.pdf') ? fileUrl.trim() : null),
      };

      await onSaved(updatedBook);
      setSuccessNotice('✓ Đã lưu thay đổi thành công!');
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu sách.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[94vh] bg-white dark:bg-[#160E2E] rounded-[24px] flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10 my-auto">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 border-b border-line bg-surface shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-[10px] bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <BookOpen size={18} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-[16px] font-extrabold text-ink leading-tight truncate">
                  {book.title ? `Sửa Sách Tác Giả: ${title || book.title}` : 'Thêm Sách Tác Giả Mới'}
                </h3>
                <span className="px-2 py-0.5 rounded-[6px] bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 text-[10px] font-black uppercase shrink-0">
                  {book.title ? 'Chỉnh sửa' : 'Tạo mới'}
                </span>
              </div>
              <p className="text-[11.5px] text-muted truncate">
                Cập nhật thông tin, ảnh bìa 3:4 và tệp Ebook nguyên bản
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer shrink-0 ml-2"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* THÔNG BÁO LỖI / THÀNH CÔNG */}
        {errorMsg && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-[12.5px] font-bold flex items-center justify-between">
            <span>{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg('')} className="text-red-500 font-bold ml-2">×</button>
          </div>
        )}
        {successNotice && (
          <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-[12.5px] font-bold flex items-center gap-2">
            <Check size={15} className="text-emerald-600" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Form Body cuộn */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-ink text-[13px]">
          {/* KHỐI 1: THÔNG TIN CƠ BẢN TINH GỌN */}
          <div className="space-y-2.5 p-3 rounded-[16px] bg-surface-2/60 border border-line">
            <div className="space-y-1">
              <label className="block text-[12px] font-extrabold text-ink uppercase tracking-wide">
                Tên sách / Tài liệu xuất bản <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Hiểu Đúng Về Cột Sống"
                className="w-full h-9.5 px-3 rounded-[10px] border border-line text-[13.5px] text-ink font-bold focus:border-primary bg-surface"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11.5px] font-bold text-ink uppercase tracking-wide">
                Năm xuất bản / Phiên bản
              </label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="VD: 2026 (Tái bản lần 3)"
                className="w-full h-9 px-2.5 rounded-[9px] border border-line text-[12.5px] text-ink focus:border-primary bg-surface"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11.5px] font-bold text-ink uppercase tracking-wide">
                Mô tả ngắn cuốn sách
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tóm tắt ngắn gọn nội dung tài liệu..."
                className="w-full p-2.5 rounded-[9px] border border-line text-[12.5px] text-ink focus:border-primary leading-relaxed bg-surface"
              />
            </div>
          </div>

          {/* KHỐI 2: ẢNH BÌA SÁCH DUY NHẤT (CHUẨN TỶ LỆ 3:4) */}
          <div className="p-3.5 rounded-[16px] bg-surface-2/60 border border-line space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-extrabold text-ink uppercase tracking-wide flex items-center gap-1.5">
                <ImageIcon size={14} className="text-primary" />
                <span>Ảnh bìa sách (Tỷ lệ 3:4)</span>
              </label>
              {coverUrl && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCropModalOpen(true)}
                    className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    title="Cắt chỉnh khung ảnh bìa 3:4"
                  >
                    <Crop size={12} strokeWidth={2.5} />
                    <span>Cắt ảnh</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverUrl(null)}
                    className="text-[11px] text-red-600 font-bold hover:underline cursor-pointer"
                  >
                    Xóa bìa
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Vùng xem trước ảnh bìa */}
              <div
                onClick={() => {
                  if (coverUrl) {
                    setCropModalOpen(true);
                  } else {
                    coverInputRef.current?.click();
                  }
                }}
                className={`w-[74px] sm:w-[82px] aspect-[3/4] rounded-[10px] overflow-hidden border border-line bg-surface shrink-0 shadow-xs relative flex items-center justify-center group cursor-pointer ${
                  coverUrl ? 'hover:border-amber-400' : ''
                }`}
                title={coverUrl ? 'Nhấn để cắt và chỉnh khung ảnh bìa 3:4' : 'Nhấn để chọn ảnh từ máy'}
              >
                {coverUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverUrl}
                      alt="Bìa sách"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 text-white">
                      <Crop size={16} strokeWidth={2.5} className="text-amber-300" />
                      <span className="text-[8.5px] font-black uppercase text-amber-300">Cắt ảnh</span>
                    </div>
                    {coverDimensions && (
                      <div className="absolute bottom-0.5 left-0.5 px-1 py-0.2 rounded bg-black/75 text-amber-300 font-black text-[7.5px] uppercase">
                        {coverDimensions.label.split(' ')[0]}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center bg-primary-soft/30 text-muted">
                    <BookOpen size={20} className="text-primary/70 mb-0.5" />
                    <span className="text-[9px] font-bold">Chưa có bìa</span>
                  </div>
                )}
              </div>

              {/* Cột nút chọn ảnh / dán URL */}
              <div className="flex-1 min-w-0 space-y-2">
                <input
                  type="file"
                  ref={coverInputRef}
                  onChange={handleCoverFileChange}
                  accept="image/*"
                  className="hidden"
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={isUploadingCover}
                    className="flex-1 h-9 px-3 rounded-[10px] bg-white dark:bg-white/10 border border-line text-ink font-bold text-[12px] hover:border-primary cursor-pointer shadow-2xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    {isUploadingCover ? (
                      <>
                        <Loader2 size={13} className="animate-spin text-primary" />
                        <span>Đang tải...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon size={14} className="text-primary" />
                        <span>Chọn ảnh bìa từ máy</span>
                      </>
                    )}
                  </button>

                  {coverUrl && (
                    <button
                      type="button"
                      onClick={() => setCropModalOpen(true)}
                      className="h-9 px-3 rounded-[10px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[12px] flex items-center gap-1 cursor-pointer transition-colors shrink-0 shadow-xs"
                      title="Kéo trượt cắt khung 3:4 vừa ý"
                    >
                      <Crop size={13} strokeWidth={2.5} />
                      <span>Cắt</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowCoverUrlInput(!showCoverUrlInput)}
                    className="text-[11px] text-muted hover:text-primary font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Link2 size={12} />
                    <span>{showCoverUrlInput ? 'Ẩn ô dán link' : 'Hoặc dán URL ảnh bìa'}</span>
                  </button>
                </div>

                {showCoverUrlInput && (
                  <input
                    type="url"
                    value={coverUrl || ''}
                    onChange={(e) => setCoverUrl(e.target.value.trim() || null)}
                    placeholder="Dán link ảnh bìa https://..."
                    className="w-full h-8 px-2.5 rounded-[8px] border border-line text-[11.5px] text-ink focus:border-primary bg-surface animate-in fade-in duration-150"
                  />
                )}
              </div>
            </div>
          </div>

          {/* KHỐI 3: TỆP SÁCH EBOOK NGUYÊN BẢN (DÙNG TRỰC TIẾP FILE - KHÔNG CHUYỂN THÀNH ẢNH) */}
          <EbookDirectUploadSection
            bookTitle={title || book.title}
            fileUrl={fileUrl}
            fileName={fileName}
            coverUrl={coverUrl}
            onChangeFile={(newUrl, newName) => {
              setFileUrl(newUrl);
              setFileName(newName);
              if (newUrl?.toLowerCase().endsWith('.pdf')) {
                setPdfUrl(newUrl);
              }
            }}
            onSetCoverUrlIfNotSet={(autoCoverUrl) => {
              if (!coverUrl) {
                setCoverUrl(autoCoverUrl);
              }
            }}
          />
        </form>

        {/* Footer Modal */}
        <div className="flex items-center justify-end gap-2.5 px-4 py-3 sm:px-5 sm:py-3.5 border-t border-line bg-surface shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-9.5 px-4 rounded-[10px] border border-line text-ink font-bold text-[13px] hover:bg-surface-2 transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-9.5 px-5 rounded-[10px] bg-primary hover:bg-primary-dark text-white font-extrabold text-[13.5px] flex items-center gap-1.5 shadow-md shadow-primary/25 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{book.title ? 'Lưu cuốn sách này' : 'Lưu sách & Đưa vào kệ'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* MODAL CẮT VÀ CĂN KHUNG ẢNH BÌA 3:4 */}
      {cropModalOpen && coverUrl && (
        <ImageCropModal
          isOpen={cropModalOpen}
          imageUrl={coverUrl}
          title="Cắt Khung Ảnh Bìa Sách (3:4)"
          defaultAspect="3:4"
          onClose={() => setCropModalOpen(false)}
          onCropSaved={async (newUrl) => {
            setCoverUrl(newUrl);
            setSuccessNotice('✓ Đã cắt và cập nhật ảnh bìa sách 3:4 thành công!');
            setCropModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
