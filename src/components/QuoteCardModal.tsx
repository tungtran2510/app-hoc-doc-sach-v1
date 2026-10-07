'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Palette,
  Sparkles,
  BookOpen,
  Share2,
} from 'lucide-react';
import { ReadingNoteItem } from '../lib/readingNotes';

interface QuoteCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: ReadingNoteItem | null;
}

export default function QuoteCardModal({
  isOpen,
  onClose,
  note,
}: QuoteCardModalProps) {
  const [theme, setTheme] = useState<'dark' | 'ivory'>('dark');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !note) return null;

  const handleCopyText = async () => {
    const textToCopy = `“${note.selectedText}”\n\n— Trích từ sách: ${note.bookTitle} (Trang ${note.page + 1})\n${
      note.userNote ? `Ghi chú: ${note.userNote}\n` : ''
    }Tủ Sách Y Khoa · Qbiz Books`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // Render card lên HTML5 Canvas để tải ảnh PNG chất lượng cao
  const handleDownloadImage = async () => {
    setIsExporting(true);
    try {
      const canvas = document.createElement('canvas');
      const scale = 2; // Retina 2x
      canvas.width = 400 * scale;
      canvas.height = 500 * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(scale, scale);

      // 1. Vẽ nền
      if (theme === 'dark') {
        const grad = ctx.createLinearGradient(0, 0, 0, 500);
        grad.addColorStop(0, '#1C1109');
        grad.addColorStop(0.5, '#2B160A');
        grad.addColorStop(1, '#150C06');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 400, 500);

        // Khung viền vàng đồng
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(16, 16, 368, 468);
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, 500);
        grad.addColorStop(0, '#FAF7F0');
        grad.addColorStop(1, '#F3EDE2');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 400, 500);

        // Khung viền ngà
        ctx.strokeStyle = 'rgba(120, 53, 15, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(16, 16, 368, 468);
      }

      // 2. Header
      ctx.fillStyle = theme === 'dark' ? '#F59E0B' : '#B45309';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('✦ TRÍCH DẪN Y KHOA CHUẨN MỰC ✦', 30, 46);

      // Dấu ngoặc kép trang trí to
      ctx.fillStyle = theme === 'dark' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(180, 83, 9, 0.15)';
      ctx.font = 'bold 64px serif';
      ctx.fillText('“', 30, 95);

      // 3. Đoạn trích dẫn (Tự bẻ dòng thông minh)
      ctx.fillStyle = theme === 'dark' ? '#FEF3C7' : '#2A160A';
      ctx.font = 'italic 15px serif';
      const words = note.selectedText.split(' ');
      let line = '';
      let y = 110;
      const maxWidth = 340;
      const lineHeight = 24;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, 30, y);
          line = words[n] + ' ';
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 30, y);

      // 4. Ghi chú cá nhân (nếu có)
      if (note.userNote) {
        y += 28;
        ctx.fillStyle = theme === 'dark' ? '#D97706' : '#92400E';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('❖ LỜI KHUYÊN & SUY NGẪM:', 30, y);
        y += 18;

        ctx.fillStyle = theme === 'dark' ? 'rgba(254, 243, 199, 0.85)' : '#451A03';
        ctx.font = '12px sans-serif';
        const noteWords = note.userNote.split(' ');
        let noteLine = '';
        for (let i = 0; i < noteWords.length; i++) {
          const testNoteLine = noteLine + noteWords[i] + ' ';
          if (ctx.measureText(testNoteLine).width > maxWidth && i > 0) {
            ctx.fillText(noteLine, 30, y);
            noteLine = noteWords[i] + ' ';
            y += 18;
          } else {
            noteLine = testNoteLine;
          }
        }
        ctx.fillText(noteLine, 30, y);
      }

      // 5. Chân card: Tên sách + Bản quyền Qbiz
      const footerY = 445;
      ctx.strokeStyle = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
      ctx.beginPath();
      ctx.moveTo(30, footerY - 15);
      ctx.lineTo(370, footerY - 15);
      ctx.stroke();

      ctx.fillStyle = theme === 'dark' ? '#FBBF24' : '#78350F';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`📖 ${note.bookTitle} · Trang ${note.page + 1}`, 30, footerY);

      ctx.fillStyle = theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
      ctx.font = '10px sans-serif';
      ctx.fillText('Tác giả: Tùng Dinh Dưỡng · Qbiz Books', 30, footerY + 16);

      // Tạo link tải ảnh
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `trich_dan_${note.bookTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_trang_${note.page + 1}.png`;
      a.click();
    } catch (e) {
      console.error('Lỗi xuất ảnh trích dẫn:', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] bg-[#1A0F08] border border-amber-900/40 rounded-3xl p-4 sm:p-5 flex flex-col gap-4 text-white shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER: TIÊU ĐỀ + NÚT ĐỔI MÀU NỀN + ĐÓNG */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Share2 size={15} className="text-amber-400" />
            <h3 className="text-sm font-extrabold text-amber-200 tracking-wide uppercase">
              ẢNH TRÍCH DẪN Y KHOA
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Nút đổi Theme: Gỗ tối / Giấy ngà */}
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'ivory' : 'dark')}
              className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-bold text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
              title="Đổi màu nền thiệp"
            >
              <Palette size={12} />
              <span>{theme === 'dark' ? 'Nền gỗ tối' : 'Nền giấy ngà'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* XEM TRƯỚC TẤM THIỆP TRÍCH DẪN (PREVIEW CARD) */}
        <div
          ref={cardRef}
          className={`w-full aspect-[4/5] rounded-2xl p-5 flex flex-col justify-between border shadow-xl transition-all ${
            theme === 'dark'
              ? 'bg-gradient-to-b from-[#1C1109] via-[#2B160A] to-[#150C06] border-amber-500/40 text-amber-100'
              : 'bg-gradient-to-b from-[#FAF7F0] to-[#F3EDE2] border-amber-900/25 text-[#2A160A]'
          }`}
        >
          {/* Header thiệp */}
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-black uppercase tracking-wider ${
                theme === 'dark' ? 'text-amber-400' : 'text-amber-800'
              }`}
            >
              ✦ TRÍCH DẪN Y KHOA CHUẨN MỰC ✦
            </span>
            <span
              className={`text-[10px] font-bold ${
                theme === 'dark' ? 'text-amber-200/50' : 'text-amber-900/50'
              }`}
            >
              Qbiz Books
            </span>
          </div>

          {/* Trích dẫn */}
          <div className="my-auto py-2 flex flex-col gap-2">
            <span
              className={`text-3xl font-serif font-black leading-none ${
                theme === 'dark' ? 'text-amber-500/40' : 'text-amber-700/30'
              }`}
            >
              “
            </span>
            <p
              className={`text-sm sm:text-base font-serif italic leading-relaxed text-center px-1 ${
                theme === 'dark' ? 'text-amber-100' : 'text-[#2A160A]'
              }`}
            >
              {note.selectedText}
            </p>

            {note.userNote && (
              <div
                className={`mt-2 p-2.5 rounded-xl border text-[11px] leading-relaxed ${
                  theme === 'dark'
                    ? 'bg-black/30 border-amber-500/20 text-amber-200/90'
                    : 'bg-white/80 border-amber-900/15 text-[#6E4223]'
                }`}
              >
                <span className="font-bold block mb-0.5 text-amber-700 dark:text-amber-400">
                  ❖ Lời khuyên & Suy ngẫm:
                </span>
                {note.userNote}
              </div>
            )}
          </div>

          {/* Footer thiệp */}
          <div
            className={`pt-2 border-t flex flex-col gap-0.5 ${
              theme === 'dark' ? 'border-white/10' : 'border-amber-900/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-bold truncate max-w-[240px] ${
                  theme === 'dark' ? 'text-amber-300' : 'text-amber-900'
                }`}
              >
                📖 {note.bookTitle}
              </span>
              <span
                className={`text-[10px] font-mono font-bold ${
                  theme === 'dark' ? 'text-amber-400' : 'text-amber-700'
                }`}
              >
                Trang {note.page + 1}
              </span>
            </div>
            <span
              className={`text-[10px] ${
                theme === 'dark' ? 'text-amber-200/50' : 'text-[#7A583E]'
              }`}
            >
              Tác giả: Tùng Dinh Dưỡng · Qbiz Books
            </span>
          </div>
        </div>

        {/* NÚT THAO TÁC: TẢI ẢNH VỀ MÁY & SAO CHÉP CHỮ */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={isExporting}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
          >
            <Download size={14} />
            <span>{isExporting ? 'Đang tạo ảnh...' : 'Tải ảnh PNG'}</span>
          </button>
          <button
            type="button"
            onClick={handleCopyText}
            className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Sao chép văn bản trích dẫn"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
