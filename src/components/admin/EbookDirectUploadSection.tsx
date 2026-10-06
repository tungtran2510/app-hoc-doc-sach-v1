'use client';

import React, { useState, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Link2,
  Loader2,
  BookOpen,
  Sparkles,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { uploadDocumentFile } from '../../lib/storageUpload';
import {
  detectEbookFormat,
  getEbookFormatMeta,
  extractCoverFromEbookFile,
  EbookFormat,
} from '../../lib/ebookEngine';

interface EbookDirectUploadSectionProps {
  bookTitle?: string;
  fileUrl?: string | null;
  fileName?: string | null;
  coverUrl?: string | null;
  onChangeFile: (fileUrl: string | null, fileName: string | null) => void;
  onSetCoverUrlIfNotSet?: (coverUrl: string) => void;
}

export default function EbookDirectUploadSection({
  bookTitle,
  fileUrl,
  fileName,
  coverUrl,
  onChangeFile,
  onSetCoverUrlIfNotSet,
}: EbookDirectUploadSectionProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [errorNotice, setErrorNotice] = useState<string>('');
  const [successNotice, setSuccessNotice] = useState<string>('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const format: EbookFormat = detectEbookFormat(fileName || fileUrl);
  const formatMeta = getEbookFormatMeta(format);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setErrorNotice('');
      setSuccessNotice('');
      const mbSize = (file.size / (1024 * 1024)).toFixed(1);
      setUploadProgress(`Đang tải tệp Ebook (${mbSize} MB) lên máy chủ...`);

      // 1. Tự động gợi ý ảnh bìa nếu sách chưa có bìa
      if (!coverUrl && onSetCoverUrlIfNotSet) {
        try {
          const autoCover = await extractCoverFromEbookFile(file);
          if (autoCover) {
            onSetCoverUrlIfNotSet(autoCover);
            setSuccessNotice('✓ Đã tự động tạo ảnh bìa từ tệp sách!');
          }
        } catch {}
      }

      // 2. Tải trực tiếp file nguyên bản (KHÔNG tách ảnh)
      const res = await uploadDocumentFile(file);

      if (res && res.url) {
        onChangeFile(res.url, res.fileName || file.name);
        setSuccessNotice(`✓ Đã nạp tệp Ebook nguyên bản "${res.fileName || file.name}" (${res.sizeText})`);
      } else {
        throw new Error('Chưa nhận được đường dẫn tệp sau khi tải lên.');
      }
    } catch (err: any) {
      console.error('Lỗi tải tệp ebook:', err);
      setErrorNotice(err.message || 'Lỗi khi tải tệp Ebook lên hệ thống.');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
      e.target.value = '';
    }
  };

  const handleApplyUrl = () => {
    const trimmed = customUrlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/')) {
      setErrorNotice('Đường dẫn tệp phải bắt đầu bằng https:// hoặc /');
      return;
    }

    const guessedName = trimmed.split('/').pop()?.split('?')[0] || 'ebook-document.pdf';
    onChangeFile(trimmed, guessedName);
    setCustomUrlInput('');
    setShowUrlInput(false);
    setSuccessNotice(`✓ Đã gắn link tệp Ebook: ${guessedName}`);
  };

  const handleRemoveFile = () => {
    onChangeFile(null, null);
    setSuccessNotice('');
    setErrorNotice('');
  };

  return (
    <div className="p-3.5 rounded-[18px] bg-surface-2/80 border border-line space-y-3">
      {/* Tiêu đề & Thông tin định dạng */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[8px] bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <BookOpen size={15} strokeWidth={2.4} />
          </div>
          <div>
            <h4 className="text-[12.5px] font-black text-ink uppercase tracking-wide">
              Tệp Sách Ebook Nguyên Bản
            </h4>
            <p className="text-[11px] text-muted leading-tight">
              Tải trực tiếp file gốc (Không chuyển thành ảnh)
            </p>
          </div>
        </div>

        {fileUrl && (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${formatMeta.badgeBg} ${formatMeta.badgeText} ${formatMeta.badgeBorder}`}
          >
            {formatMeta.label}
          </span>
        )}
      </div>

      {/* Dải định dạng được hỗ trợ */}
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
        <span className="font-bold text-ink">Định dạng hỗ trợ:</span>
        <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 font-bold border border-red-500/20">PDF</span>
        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">EPUB</span>
        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">MOBI</span>
        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">AZW3</span>
        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">FB2</span>
        <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/20">CBZ / CBR</span>
        <span className="px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-700 dark:text-slate-300 font-bold border border-slate-500/20">TXT</span>
        <span className="px-1.5 py-0.5 rounded bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-600/20">DOCX</span>
      </div>

      {/* Thông báo lỗi / tiến trình */}
      {errorNotice && (
        <div className="p-2.5 rounded-[10px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-[11.5px] font-semibold flex items-center justify-between">
          <span>{errorNotice}</span>
          <button type="button" onClick={() => setErrorNotice('')} className="text-red-500 font-bold ml-2">×</button>
        </div>
      )}

      {successNotice && (
        <div className="p-2.5 rounded-[10px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-[11.5px] font-semibold flex items-center gap-1.5">
          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Input File ẩn */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.epub,.mobi,.azw,.azw3,.fb2,.cbz,.cbr,.txt,.md,.doc,.docx"
        className="hidden"
      />

      {/* TRẠNG THÁI 1: ĐÃ CÓ TỆP EBOOK ĐÍNH KÈM */}
      {fileUrl ? (
        <div className="p-3 rounded-[14px] bg-surface border border-line shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-10 h-10 rounded-[12px] flex items-center justify-center font-black text-[11px] shrink-0 border ${formatMeta.badgeBg} ${formatMeta.badgeText} ${formatMeta.badgeBorder}`}
              >
                {formatMeta.label}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-extrabold text-ink truncate leading-tight">
                  {fileName || 'Tài liệu Ebook'}
                </p>
                <p className="text-[11px] text-muted truncate mt-0.5">
                  {formatMeta.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="h-8 px-2.5 rounded-[9px] bg-surface-2 hover:bg-line border border-line text-ink font-bold text-[11.5px] flex items-center gap-1 cursor-pointer transition-colors"
                title="Thay thế bằng file Ebook khác"
              >
                <RefreshCw size={12} />
                <span className="hidden xs:inline">Đổi tệp</span>
              </button>

              <button
                type="button"
                onClick={handleRemoveFile}
                disabled={isUploading}
                className="h-8 px-2 rounded-[9px] bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-400 font-bold text-[11.5px] flex items-center gap-1 cursor-pointer transition-colors"
                title="Xóa tệp sách này"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted pt-1 border-t border-line/60">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle2 size={12} />
              <span>Sẵn sàng đọc nguyên bản trên mọi thiết bị</span>
            </span>

            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-bold"
            >
              Mở liên kết gốc &rarr;
            </a>
          </div>
        </div>
      ) : (
        /* TRẠNG THÁI 2: CHƯA CÓ TỆP -> HIỂN THỊ NÚT CHỌN TỆP EBOOK */
        <div className="space-y-2">
          <div
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`p-4 rounded-[14px] border-2 border-dashed transition-all flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer ${
              isUploading
                ? 'border-primary bg-primary-soft/30 cursor-wait'
                : 'border-primary/40 hover:border-primary bg-surface hover:bg-primary-soft/10 shadow-2xs'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 size={26} className="animate-spin text-primary" />
                <p className="text-[12.5px] font-extrabold text-primary mt-1">
                  {uploadProgress || 'Đang tải tệp lên...'}
                </p>
                <p className="text-[11px] text-muted">
                  Vui lòng giữ kết nối mạng trong giây lát...
                </p>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <UploadCloud size={20} strokeWidth={2.4} />
                </div>
                <div>
                  <p className="text-[13px] font-black text-ink">
                    Bấm vào đây để chọn tệp Ebook từ máy
                  </p>
                  <p className="text-[11px] text-muted mt-0.5">
                    Hỗ trợ tệp dung lượng lên đến 50MB · Giữ nguyên định dạng gốc
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Nút dán liên kết URL trực tiếp */}
          <div className="flex items-center justify-between pt-0.5">
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-[11px] text-muted hover:text-primary font-bold flex items-center gap-1 cursor-pointer"
            >
              <Link2 size={12} />
              <span>{showUrlInput ? 'Ẩn ô dán link' : 'Hoặc dán link trực tiếp đến file Ebook'}</span>
            </button>
          </div>

          {showUrlInput && (
            <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
              <input
                type="url"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                placeholder="https://domain.com/sach-dien-tu.epub hoặc .pdf"
                className="flex-1 h-8 px-2.5 rounded-[8px] border border-line text-[11.5px] text-ink focus:border-primary bg-surface font-mono"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="h-8 px-3 rounded-[8px] bg-primary text-white font-bold text-[11.5px] hover:bg-primary-dark cursor-pointer transition-colors"
              >
                Gắn link
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
