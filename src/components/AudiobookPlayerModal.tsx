'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  X,
  Volume2,
  VolumeX,
  Headphones,
  Sparkles,
  Download,
  CheckCircle2,
  Loader2,
  ChevronDown,
  Moon,
} from 'lucide-react';
import { playTapSound, playSuccessChime } from '../lib/audioFeedback';
import { backgroundAudioManager } from '../lib/backgroundAudioManager';
import BookCoverArt from './BookCoverArt';

interface AudiobookPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: {
    id: string;
    title: string;
    author: string;
    coverUrl?: string;
    audioUrl: string;
    fallbackUrl?: string;
    audioNarrator?: string;
    durationFormatted?: string;
  } | null;
  onDownload?: () => void;
  isDownloaded?: boolean;
}

export default function AudiobookPlayerModal({
  isOpen,
  onClose,
  book,
  onDownload,
  isDownloaded = false,
}: AudiobookPlayerModalProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Khởi tạo audio khi mở modal
  useEffect(() => {
    if (!isOpen || !book) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    const savedProgress = typeof window !== 'undefined' ? localStorage.getItem(`audiobook_progress_${book.id}`) : null;
    const initialTime = savedProgress ? parseFloat(savedProgress) : 0;
    const safeInitialTime = isNaN(initialTime) || initialTime < 0 ? 0 : initialTime;
    setCurrentTime(safeInitialTime);
    setDuration(0);

    const audio = audioRef.current;
    if (audio) {
      let resolvedSrc = book.audioUrl;
      audio.src = resolvedSrc;
      audio.load();
      if (safeInitialTime > 0) {
        audio.currentTime = safeInitialTime;
      }
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          backgroundAudioManager.updatePlaybackState('playing');
        })
        .catch(() => {
          // Trình duyệt chặn autoplay thì đợi người dùng bấm Play
          setIsPlaying(false);
          backgroundAudioManager.updatePlaybackState('paused');
        });
    }

    // Đăng ký Media Session API để điều khiển trên màn hình khóa & phát liên tục khi tắt màn hình
    backgroundAudioManager.setupMediaSession({
      title: book.title,
      artist: book.audioNarrator || book.author,
      album: 'Qbiz Books · Sách Nói',
      artworkUrl: book.coverUrl || '/icon.png',
      onPlay: () => {
        audioRef.current?.play();
      },
      onPause: () => {
        audioRef.current?.pause();
      },
      onSeekBackward: () => {
        skipSeconds(-15);
      },
      onSeekForward: () => {
        skipSeconds(15);
      },
    });

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      backgroundAudioManager.clearMediaSession();
    };
  }, [isOpen, book]);

  if (!isOpen || !book) return null;

  const togglePlayPause = () => {
    playTapSound();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      backgroundAudioManager.updatePlaybackState('paused');
    } else {
      setLoadError(null);
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          backgroundAudioManager.updatePlaybackState('playing');
        })
        .catch((e) => {
          // Thử fallback trực tiếp nếu blob ngoại tuyến gặp sự cố
          if (book.fallbackUrl && audio.src !== book.fallbackUrl) {
            audio.src = book.fallbackUrl;
            audio.load();
            audio
              .play()
              .then(() => {
                setIsPlaying(true);
                backgroundAudioManager.updatePlaybackState('playing');
              })
              .catch(() => {
                setLoadError('Không thể phát âm thanh. Vui lòng thử lại.');
              });
            return;
          }
          // Thử proxy nếu lỗi CORS
          if (
            book.audioUrl.startsWith('http://') ||
            book.audioUrl.startsWith('https://')
          ) {
            audio.src = `/api/download-proxy?url=${encodeURIComponent(book.audioUrl)}`;
            audio.load();
            audio
              .play()
              .then(() => {
                setIsPlaying(true);
                backgroundAudioManager.updatePlaybackState('playing');
              })
              .catch(() => {
                setLoadError('Không thể phát âm thanh. Vui lòng tải về máy trước.');
              });
          }
        });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const skipSeconds = (seconds: number) => {
    playTapSound();
    if (audioRef.current) {
      const next = Math.max(0, Math.min(duration || 9999, audioRef.current.currentTime + seconds));
      audioRef.current.currentTime = next;
      setCurrentTime(next);
    }
  };

  const cycleRate = () => {
    playTapSound();
    const rates = [0.75, 1.0, 1.25, 1.5, 2.0];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const next = rates[nextIdx];
    setPlaybackRate(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
    }
  };

  const toggleMute = () => {
    playTapSound();
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatSeconds = (sec: number): string => {
    if (!sec || isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const displayCover =
    book.coverUrl ||
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Trình phát sách nói ${book.title}`}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-center items-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* ẨN AUDIO TAG ĐIỀU KHIỂN CHÍNH */}
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={() => {
          if (audioRef.current) {
            const cur = audioRef.current.currentTime;
            setCurrentTime(cur);
            if (duration > 0) {
              backgroundAudioManager.updatePositionState(cur, duration, playbackRate);
            }
            // Throttled lưu vị trí nghe mỗi 2 giây
            if (typeof window !== 'undefined' && book?.id) {
              const now = Date.now();
              if (now - lastSaveTimeRef.current > 2000) {
                lastSaveTimeRef.current = now;
                localStorage.setItem(`audiobook_progress_${book.id}`, cur.toString());
              }
            }
          }
        }}
        onLoadedMetadata={() => {
          setIsLoading(false);
          if (audioRef.current) {
            const dur = audioRef.current.duration;
            setDuration(dur);
            backgroundAudioManager.updatePositionState(0, dur, playbackRate);
          }
        }}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
          backgroundAudioManager.updatePlaybackState('playing');
        }}
        onPause={() => {
          setIsPlaying(false);
          backgroundAudioManager.updatePlaybackState('paused');
          if (typeof window !== 'undefined' && book?.id && audioRef.current) {
            localStorage.setItem(`audiobook_progress_${book.id}`, audioRef.current.currentTime.toString());
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          backgroundAudioManager.updatePlaybackState('paused');
          if (typeof window !== 'undefined' && book?.id) {
            localStorage.removeItem(`audiobook_progress_${book.id}`);
          }
        }}
        onError={() => {
          setIsLoading(false);
          // 1. Fallback nếu blob ngoại tuyến thất bại -> phát trực tiếp từ downloadUrl gốc
          if (
            audioRef.current &&
            book.fallbackUrl &&
            audioRef.current.src !== book.fallbackUrl
          ) {
            console.warn('Offline blob playback failed, trying fallback:', book.fallbackUrl);
            audioRef.current.src = book.fallbackUrl;
            audioRef.current.load();
            audioRef.current.play().catch(() => {});
            return;
          }
          // 2. Fallback proxy
          if (
            audioRef.current &&
            !audioRef.current.src.includes('/api/download-proxy') &&
            (book.audioUrl.startsWith('http://') || book.audioUrl.startsWith('https://'))
          ) {
            audioRef.current.src = `/api/download-proxy?url=${encodeURIComponent(book.audioUrl)}`;
            audioRef.current.load();
            audioRef.current.play().catch(() => {
              setLoadError('Không thể nạp tệp âm thanh trực tuyến.');
            });
          } else {
            setLoadError('Không thể phát tệp âm thanh. Vui lòng thử lại.');
          }
        }}
      />

      {/* KHUNG TRÌNH PHÁT SÁCH NÓI ĐẲNG CẤP - RA CHÍNH GIỮA MÀN HÌNH */}
      <div
        className="w-full max-w-[360px] sm:max-w-md bg-gradient-to-b from-[#1f130b] via-[#150d08] to-[#0a0604] border border-amber-500/35 rounded-3xl shadow-[0_24px_70px_rgba(0,0,0,0.9)] p-4 sm:p-5 flex flex-col gap-3 text-white max-h-[88vh] overflow-y-auto no-scrollbar my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HÀNG TIÊU ĐỀ ĐẦU: NÚT THU GỌN / ĐÓNG + NHÃN + TỐC ĐỘ */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white cursor-pointer transition-colors shrink-0"
            title="Đóng trình phát sách nói"
            aria-label="Đóng"
          >
            <X size={17} />
          </button>

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
            <span className="text-[11px] font-black uppercase font-mono tracking-wider text-amber-300 truncate">
              SÁCH NÓI MP3 CHÍNH HIỆU
            </span>
          </div>

          {/* Tùy chọn tốc độ đọc 1 dòng tinh gọn */}
          <button
            type="button"
            onClick={cycleRate}
            className="h-7 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-black cursor-pointer transition-all shrink-0"
            title="Thay đổi tốc độ phát"
          >
            {playbackRate}x
          </button>
        </div>

        {/* ẢNH BÌA ĐĨA NHẠC / SÁCH NÓI NGHỆ THUẬT (CĂN GIỮA HOÀN HẢO) */}
        <div className="flex flex-col items-center justify-center my-0.5">
          <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-[0_12px_36px_rgba(0,0,0,0.85)] border border-amber-500/35 group">
            {displayCover && !displayCover.startsWith('style:') ? (
              <img
                src={displayCover}
                alt={book.title}
                className={`w-full h-full object-cover transition-transform duration-700 ${
                  isPlaying ? 'scale-105' : 'scale-100'
                }`}
              />
            ) : (
              <BookCoverArt
                coverUrl={book.coverUrl}
                title={book.title}
                author={book.author}
                medium="audio"
                format="mp3"
                aspectRatio="aspect-square"
                showBadge={false}
                className="w-full h-full rounded-none"
              />
            )}
            {/* Hiệu ứng sóng âm Equalizer nổi trên bìa */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex items-end justify-center pb-2.5">
              <div className="flex items-end gap-1 h-5 px-2">
                {[4, 8, 12, 16, 12, 6, 14, 18, 10, 5].map((h, i) => (
                  <span
                    key={i}
                    className={`w-1 bg-amber-400 rounded-full transition-all duration-300 ${
                      isPlaying
                        ? `animate-[bounce_0.6s_ease-in-out_infinite] h-[${h}px]`
                        : 'h-1.5 opacity-50'
                    }`}
                    style={{
                      height: isPlaying ? `${Math.max(4, (h * (i % 2 === 0 ? 1.2 : 0.8)))}px` : '4px',
                      animationDelay: `${i * 0.08}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* THÔNG TIN TÁC PHẨM & TÁC GIẢ (1 DÒNG DUY NHẤT) */}
        <div className="text-center flex flex-col gap-0.5">
          <h3 className="text-sm sm:text-base font-black text-amber-100 line-clamp-1">
            {book.title}
          </h3>
          <p className="text-xs text-amber-300/80 font-semibold truncate">
            {book.author} {book.audioNarrator ? `• ${book.audioNarrator}` : ''}
          </p>
        </div>

        {/* HUY HIỆU TẮT MÀN HÌNH VẪN PHÁT (CHUẨN 1 DÒNG TINH GỌN MOBILE) */}
        <div className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10.5px] font-bold self-center whitespace-nowrap overflow-hidden shadow-xs">
          <Moon size={11} className="shrink-0 text-emerald-400" />
          <span>Tắt màn hình vẫn phát · Điều khiển màn hình khóa</span>
        </div>

        {/* BÁO LỖI NẾU CÓ */}
        {loadError && (
          <div className="px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs text-center font-medium">
            {loadError}
          </div>
        )}

        {/* THANH TRƯỢT TIẾN TRÌNH & THỜI LƯỢNG */}
        <div className="flex flex-col gap-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.5}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-500 transition-all"
            aria-label="Thanh trượt thời lượng âm thanh"
          />
          <div className="flex items-center justify-between text-[11px] text-white/60 font-mono">
            <span>{formatSeconds(currentTime)}</span>
            <span>{duration > 0 ? formatSeconds(duration) : book.durationFormatted || '--:--'}</span>
          </div>
        </div>

        {/* CỤM NÚT ĐIỀU KHIỂN CHÍNH (TUA LẠI 15S, PLAY/PAUSE, TUA ĐI 15S) */}
        <div className="flex items-center justify-center gap-5 sm:gap-6 py-1">
          {/* Tua lùi 15s */}
          <button
            type="button"
            onClick={() => skipSeconds(-15)}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-all active:scale-95"
            title="Lùi lại 15 giây"
          >
            <RotateCcw size={18} />
          </button>

          {/* Nút Play / Pause tròn lớn nổi bật */}
          <button
            type="button"
            onClick={togglePlayPause}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center shadow-[0_8px_25px_rgba(245,158,11,0.5)] cursor-pointer transition-all active:scale-90 hover:scale-105"
            title={isPlaying ? 'Tạm dừng' : 'Phát sách nói'}
          >
            {isLoading ? (
              <Loader2 size={24} className="animate-spin text-slate-950" />
            ) : isPlaying ? (
              <Pause size={24} className="fill-current" />
            ) : (
              <Play size={24} className="fill-current ml-1" />
            )}
          </button>

          {/* Tua tới 15s */}
          <button
            type="button"
            onClick={() => skipSeconds(15)}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-all active:scale-95"
            title="Tua tới 15 giây"
          >
            <RotateCw size={18} />
          </button>
        </div>

        {/* HÀNG CUỐI: TẮT ÂM LƯỢNG & NÚT TẢI VỀ NGOẠI TUYẾN */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
          <button
            type="button"
            onClick={toggleMute}
            className="flex items-center gap-1.5 text-white/70 hover:text-white cursor-pointer transition-colors"
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            <span className="text-[11px] font-medium">{isMuted ? 'Đã tắt âm' : 'Âm thanh'}</span>
          </button>

          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className={`h-7 px-3 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                isDownloaded
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {isDownloaded ? (
                <>
                  <CheckCircle2 size={12} />
                  <span>Đã tải ngoại tuyến</span>
                </>
              ) : (
                <>
                  <Download size={12} />
                  <span>Tải nghe ngoại tuyến</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
