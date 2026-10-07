'use client';

import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Volume1,
  X,
  Check,
  Play,
  Sparkles,
} from 'lucide-react';
import {
  pageSoundEngine,
  PageSoundPreset,
  SOUND_PRESETS,
} from '../lib/pageSoundEngine';

interface ReaderSoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  readingTheme?: 'dark' | 'sepia' | 'ivory' | 'gray';
}

export default function ReaderSoundModal({
  isOpen,
  onClose,
  readingTheme = 'sepia',
}: ReaderSoundModalProps) {
  const [currentPreset, setCurrentPreset] = useState<PageSoundPreset>(() =>
    pageSoundEngine.getPreset()
  );
  const [volume, setVolume] = useState<number>(() =>
    pageSoundEngine.getVolume()
  );
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: PageSoundPreset) => {
    setCurrentPreset(preset);
    pageSoundEngine.setPreset(preset);
    if (preset !== 'silent') {
      pageSoundEngine.playFlipSound(preset);
    }
  };

  const handlePreview = (e: React.MouseEvent, preset: PageSoundPreset) => {
    e.stopPropagation();
    setPreviewingId(preset);
    pageSoundEngine.playFlipSound(preset);
    setTimeout(() => {
      setPreviewingId(null);
    }, 400);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    pageSoundEngine.setVolume(newVol);
  };

  const handleToggleMute = () => {
    const newPreset = pageSoundEngine.toggleMute();
    setCurrentPreset(newPreset);
    if (newPreset !== 'silent') {
      pageSoundEngine.playFlipSound(newPreset);
    }
  };

  const isMuted = currentPreset === 'silent' || volume <= 0.01;

  // Theme styling
  const isIvory = readingTheme === 'ivory';
  const isSepia = readingTheme === 'sepia';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cài đặt âm thanh lật sách"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-[420px] rounded-3xl p-5 shadow-2xl flex flex-col gap-4 border transition-all duration-300 max-h-[92vh] overflow-y-auto no-scrollbar ${
          isIvory
            ? 'bg-[#fbf7f0] text-[#2c180c] border-[#cdbdab] shadow-amber-950/20'
            : isSepia
            ? 'bg-[#241710] text-[#f7eedf] border-amber-900/50 shadow-black/80'
            : 'bg-[#151518] text-slate-100 border-white/10 shadow-black/90'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER: TIÊU ĐỀ & NÚT ĐÓNG */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </div>
            <div>
              <h3 className="text-[15px] font-black tracking-tight leading-tight">
                Âm Thanh Lật Sách
              </h3>
              <p className="text-[11px] opacity-70 font-medium">
                Chọn hiệu ứng lật trang sống động chân thực
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isIvory
                ? 'hover:bg-black/10 text-[#2c180c]'
                : 'hover:bg-white/10 text-slate-300'
            }`}
            aria-label="Đóng cài đặt âm thanh"
          >
            <X size={18} />
          </button>
        </div>

        {/* THANH ĐIỀU CHỈNH ÂM LƯỢNG & NÚT TẮT TIẾNG */}
        <div
          className={`p-3.5 rounded-2xl flex flex-col gap-2.5 border ${
            isIvory
              ? 'bg-[#f0e6d6] border-[#d8c8b2]'
              : isSepia
              ? 'bg-[#1a110a] border-amber-900/40'
              : 'bg-white/5 border-white/5'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-1.5 opacity-90">
              {volume <= 0.01 || isMuted ? (
                <VolumeX size={15} className="text-red-400" />
              ) : volume < 0.5 ? (
                <Volume1 size={15} className="text-amber-400" />
              ) : (
                <Volume2 size={15} className="text-amber-400" />
              )}
              <span>Âm lượng phát: {Math.round(volume * 100)}%</span>
            </div>

            <button
              type="button"
              onClick={handleToggleMute}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                isMuted
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
              }`}
            >
              {isMuted ? 'Đang tắt âm (Bật lại)' : 'Tắt tiếng'}
            </button>
          </div>

          {/* Slider âm lượng */}
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full h-2 rounded-lg accent-amber-500 cursor-pointer bg-black/20 dark:bg-white/10"
            aria-label="Thanh trượt âm lượng"
          />
        </div>

        {/* DANH SÁCH CÁC CẤU HÌNH ÂM THANH ĐỂ LỰA CHỌN */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Sparkles size={12} />
            <span>Chọn loại âm thanh yêu thích:</span>
          </span>

          <div className="flex flex-col gap-2">
            {SOUND_PRESETS.map((preset) => {
              const isSelected = currentPreset === preset.id;
              const isPreviewing = previewingId === preset.id;

              return (
                <div
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`p-3 rounded-2xl flex items-center justify-between gap-3 border transition-all cursor-pointer active:scale-[0.99] ${
                    isSelected
                      ? isIvory
                        ? 'bg-[#ebdcc7] border-amber-600 ring-2 ring-amber-600/30 shadow-sm'
                        : 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-amber-500 ring-2 ring-amber-500/30 shadow-md'
                      : isIvory
                      ? 'bg-white/60 hover:bg-white border-[#e0d3c0]'
                      : isSepia
                      ? 'bg-[#1e130c] hover:bg-[#2c1c12] border-amber-900/30'
                      : 'bg-white/5 hover:bg-white/10 border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-2xl shrink-0">{preset.icon}</span>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black">
                          {preset.name}
                        </span>
                        {isSelected && (
                          <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-extrabold bg-amber-500 text-slate-950 shrink-0">
                            ĐANG CHỌN
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] opacity-75 font-medium line-clamp-1">
                        {preset.subname} • {preset.description}
                      </span>
                    </div>
                  </div>

                  {/* NÚT THỬ NGHE HOẶC CHECKMARK */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {preset.id !== 'silent' && (
                      <button
                        type="button"
                        onClick={(e) => handlePreview(e, preset.id)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                          isPreviewing
                            ? 'bg-amber-500 text-slate-950 scale-105 shadow-sm'
                            : isIvory
                            ? 'bg-[#dfceb7] hover:bg-amber-500 hover:text-slate-950 text-[#2c180c]'
                            : 'bg-white/10 hover:bg-amber-500 hover:text-slate-950 text-amber-200'
                        }`}
                        title="Bấm để nghe thử âm thanh này"
                      >
                        <Play size={11} className={isPreviewing ? 'fill-current animate-pulse' : 'fill-current'} />
                        <span>Thử nghe</span>
                      </button>
                    )}

                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'opacity-20'
                      }`}
                    >
                      <Check size={14} strokeWidth={3} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* NÚT HOÀN TẤT */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 mt-1 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span>Xong & Tiếp tục đọc sách</span>
        </button>
      </div>
    </div>
  );
}
