'use client';

import React, { useState, useRef } from 'react';
import { X, Check, Upload, Image as ImageIcon, Sparkles } from 'lucide-react';
import { COVER_PALETTES } from '../lib/onlineLibraryData';
import { playTapSound, playSuccessChime } from '../lib/audioFeedback';

interface CoverCustomizerModalProps {
  isOpen: boolean;
  bookTitle: string;
  defaultCoverUrl: string;
  currentCoverUrl: string;
  onClose: () => void;
  onApplyCover: (newCoverUrl: string) => void;
}

export default function CoverCustomizerModal({
  isOpen,
  bookTitle,
  defaultCoverUrl,
  currentCoverUrl,
  onClose,
  onApplyCover,
}: CoverCustomizerModalProps) {
  const [selectedCover, setSelectedCover] = useState<string>(currentCoverUrl || defaultCoverUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (url: string) => {
    playTapSound();
    setSelectedCover(url || defaultCoverUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playTapSound();
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setSelectedCover(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    playSuccessChime();
    onApplyCover(selectedCover);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tùy biến ảnh bìa sách"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[360px] rounded-3xl p-4 bg-[#1c120a] border border-amber-500/30 text-[#fdf7ee] shadow-2xl flex flex-col gap-3 max-h-[90vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <ImageIcon size={15} />
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="text-xs font-black truncate">Tùy Biến Ảnh Bìa</h3>
              <span className="text-[10px] text-amber-300/70 truncate">{bookTitle}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* XEM TRƯỚC BÌA ĐANG CHỌN */}
        <div className="flex flex-col items-center justify-center py-1">
          <div className="w-24 aspect-[1/1.42] rounded-lg overflow-hidden border-2 border-amber-500 shadow-lg bg-black/50 relative">
            <img
              src={selectedCover || defaultCoverUrl}
              alt="Bìa sách"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* NÚT TẢI ẢNH TỪ MÁY */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
        >
          <Upload size={13} />
          <span className="whitespace-nowrap">Tải ảnh từ điện thoại lên</span>
        </button>

        {/* CÁC MẪU BÌA CÓ SẴN (1 DÒNG CHIP) */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
            <Sparkles size={11} />
            <span>Mẫu bìa tuyển chọn:</span>
          </span>

          <div className="grid grid-cols-2 gap-1.5">
            {COVER_PALETTES.map((pal) => {
              const palUrl = pal.url || defaultCoverUrl;
              const isSelected = selectedCover === palUrl || (!selectedCover && !pal.url);

              return (
                <button
                  key={pal.id}
                  type="button"
                  onClick={() => handleSelectPreset(pal.url)}
                  className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all active:scale-95 text-left ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500 text-amber-200 ring-1 ring-amber-500/50'
                      : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="w-5 h-7 rounded bg-black/40 overflow-hidden shrink-0 border border-white/10">
                    <img src={palUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[11px] font-bold truncate flex-1">{pal.name}</span>
                  {isSelected && <Check size={12} className="text-amber-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* NÚT XÁC NHẬN */}
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md mt-1 active:scale-95"
        >
          <Check size={14} strokeWidth={2.5} />
          <span className="whitespace-nowrap">Áp dụng bìa này</span>
        </button>
      </div>
    </div>
  );
}
