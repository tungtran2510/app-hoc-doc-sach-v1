'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  X,
  Sparkles,
  Settings2,
  ChevronUp,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import {
  bookAudioPlayer,
  AudioPlayerState,
  SpeechVoiceOption,
} from '../lib/audioSpeech';

interface BookAudioPlayerBarProps {
  onClose: () => void;
  onAutoNextChapter?: () => void;
  chapterTitle?: string;
}

export default function BookAudioPlayerBar({
  onClose,
  onAutoNextChapter,
  chapterTitle,
}: BookAudioPlayerBarProps) {
  const [playerState, setPlayerState] = useState<AudioPlayerState>(
    bookAudioPlayer.getState()
  );
  const [voices, setVoices] = useState<SpeechVoiceOption[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [autoNext, setAutoNext] = useState(true);

  useEffect(() => {
    // Đăng ký listener cập nhật trạng thái
    bookAudioPlayer.onStateChange((state) => {
      setPlayerState({ ...state });
    });

    bookAudioPlayer.onChapterFinish(() => {
      if (autoNext && onAutoNextChapter) {
        onAutoNextChapter();
      }
    });

    // Tải danh sách voice
    bookAudioPlayer.getAvailableVoices().then((list) => {
      setVoices(list);
    });

    return () => {
      // Khi unmount không nhất thiết phải stop nếu muốn nghe tiếp, nhưng có thể dọn listener
    };
  }, [autoNext, onAutoNextChapter]);

  const togglePlayPause = () => {
    bookAudioPlayer.togglePlayPause();
  };

  const cycleRate = () => {
    const rates = [0.8, 1.0, 1.25, 1.5, 2.0];
    const current = playerState.rate;
    const nextIdx = (rates.findIndex((r) => Math.abs(r - current) < 0.05) + 1) % rates.length;
    bookAudioPlayer.setRate(rates[nextIdx]);
  };

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = voices.find((v) => v.voice.name === e.target.value);
    if (selected) {
      bookAudioPlayer.setVoice(selected.voice);
    }
  };

  const progressPercent =
    playerState.totalItems > 0
      ? Math.round(((playerState.currentIndex + 1) / playerState.totalItems) * 100)
      : 0;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-xl animate-in slide-in-from-bottom-5 duration-300">
      {/* KHUNG NỔI CHÍNH */}
      <div className="rounded-2xl bg-slate-950/95 dark:bg-black/95 text-white backdrop-blur-md border border-amber-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.6)] p-3 sm:p-4 flex flex-col gap-2.5">
        {/* THANH TIẾN TRÌNH SIÊU MỎNG */}
        <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-500 to-amber-300 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* HÀNG THÔNG TIN ĐOẠN ĐỌC */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {/* Hiệu ứng sóng âm Equalizer */}
            <div className="flex items-end gap-1 h-4 w-4 shrink-0 px-0.5">
              <span
                className={`w-1 bg-amber-400 rounded-full transition-all ${
                  playerState.isPlaying && !playerState.isPaused
                    ? 'h-4 animate-[bounce_0.6s_ease-in-out_infinite]'
                    : 'h-1.5'
                }`}
              />
              <span
                className={`w-0.75 bg-amber-400 rounded-full transition-all ${
                  playerState.isPlaying && !playerState.isPaused
                    ? 'h-3 animate-[bounce_0.8s_ease-in-out_infinite_0.2s]'
                    : 'h-2.5'
                }`}
              />
              <span
                className={`w-0.75 bg-amber-400 rounded-full transition-all ${
                  playerState.isPlaying && !playerState.isPaused
                    ? 'h-4.5 animate-[bounce_0.5s_ease-in-out_infinite_0.4s]'
                    : 'h-1'
                }`}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-amber-400 text-[11px] uppercase tracking-wider">
                  SÁCH NÓI AI
                </span>
                {chapterTitle && (
                  <span className="text-[10px] text-white/50 truncate max-w-[140px] sm:max-w-[200px]">
                    · {chapterTitle}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/80 line-clamp-1 italic">
                {playerState.currentText ? `"${playerState.currentText}"` : 'Đang chuẩn bị giọng đọc...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono text-amber-300/80 bg-white/5 px-2 py-0.5 rounded-md">
              {playerState.totalItems > 0
                ? `${playerState.currentIndex + 1} / ${playerState.totalItems}`
                : '0 / 0'}
            </span>
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Cài đặt giọng đọc & Tự động lật trang"
            >
              <Settings2 size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                bookAudioPlayer.stop();
                onClose();
              }}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/30 text-white/80 hover:text-red-300 transition-colors cursor-pointer"
              title="Dừng & Đóng sách nói"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* HÀNG NÚT ĐIỀU KHIỂN CHÍNH */}
        <div className="flex items-center justify-between pt-1">
          {/* Nút tốc độ */}
          <button
            type="button"
            onClick={cycleRate}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-xs font-mono font-bold text-amber-300 cursor-pointer"
            title="Đổi tốc độ đọc (0.8x, 1.0x, 1.25x, 1.5x, 2.0x)"
          >
            {playerState.rate}x
          </button>

          {/* Cụm Tua / Phát / Tạm dừng */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => bookAudioPlayer.prev()}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition-all flex items-center justify-center text-white/90 cursor-pointer"
              title="Đoạn trước"
            >
              <SkipBack size={15} />
            </button>

            <button
              type="button"
              onClick={togglePlayPause}
              className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 hover:from-amber-400 hover:to-amber-200 active:scale-95 transition-all flex items-center justify-center text-slate-950 font-black shadow-lg cursor-pointer"
              title={playerState.isPlaying && !playerState.isPaused ? 'Tạm dừng đọc' : 'Tiếp tục đọc'}
            >
              {playerState.isPlaying && !playerState.isPaused ? (
                <Pause size={18} className="fill-slate-950" />
              ) : (
                <Play size={18} className="fill-slate-950 ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => bookAudioPlayer.next()}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition-all flex items-center justify-center text-white/90 cursor-pointer"
              title="Đoạn tiếp theo"
            >
              <SkipForward size={15} />
            </button>
          </div>

          {/* Nút lùi về đầu chương */}
          <button
            type="button"
            onClick={() => bookAudioPlayer.play(0)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white/70 hover:text-white cursor-pointer"
            title="Đọc lại từ đầu"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* BẢNG CÀI ĐẶT MỞ RỘNG (VOICE & AUTO NEXT) */}
        {showSettings && (
          <div className="pt-2.5 mt-1 border-t border-white/10 flex flex-col gap-2 animate-in fade-in">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-white/70 flex items-center gap-1">
                <Volume2 size={13} className="text-amber-400" />
                Giọng đọc:
              </span>
              <select
                value={playerState.voiceName}
                onChange={handleVoiceChange}
                className="bg-black/60 border border-white/20 rounded-lg px-2 py-1 text-xs text-amber-200 focus:outline-none focus:border-amber-400 max-w-[200px] truncate"
              >
                {voices.map((v, i) => (
                  <option key={i} value={v.voice.name}>
                    {v.isVietnamese ? `🇻🇳 ${v.name}` : v.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-white/70 flex items-center gap-1">
                <Sparkles size={13} className="text-amber-400" />
                Tự động sang chương tiếp:
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoNext}
                  onChange={(e) => setAutoNext(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
