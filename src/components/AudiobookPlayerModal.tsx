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
  Trash2,
  Clock,
  Minimize2,
} from 'lucide-react';
import { playTapSound, playSuccessChime } from '../lib/audioFeedback';
import { backgroundAudioManager } from '../lib/backgroundAudioManager';
import { recordAudiobookListening } from '../lib/audiobookHistory';
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
  onDeleteDownload?: () => void;
  isDownloaded?: boolean;
}

export default function AudiobookPlayerModal({
  isOpen,
  onClose,
  book,
  onDownload,
  onDeleteDownload,
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

  // Tính năng chuyên nghiệp: Thu nhỏ thành Mini Player bám đáy & Hẹn giờ ngủ
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [sleepTimerSeconds, setSleepTimerSeconds] = useState<number | null>(null);
  const [showSleepMenu, setShowSleepMenu] = useState<boolean>(false);

  // Bộ đếm lùi Hẹn giờ tắt (Sleep Timer)
  useEffect(() => {
    if (sleepTimerSeconds === null) return;
    if (sleepTimerSeconds <= 0) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setSleepTimerSeconds(null);
      backgroundAudioManager.updatePlaybackState('paused');
      return;
    }

    const timer = setInterval(() => {
      setSleepTimerSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [sleepTimerSeconds]);

  // Hàm ghi lại tiến độ vào Lịch sử nghe chuyên nghiệp
  const syncHistory = (curTime: number, dur: number) => {
    if (!book) return;
    recordAudiobookListening({
      id: book.id,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      audioUrl: book.audioUrl,
      fallbackUrl: book.fallbackUrl,
      audioNarrator: book.audioNarrator,
      durationFormatted: book.durationFormatted,
      currentTime: curTime,
      duration: dur || duration,
    });
  };

  // Khởi tạo audio khi mở modal
  useEffect(() => {
    if (!isOpen || !book) {
      if (audioRef.current) {
        syncHistory(audioRef.current.currentTime, audioRef.current.duration);
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setIsMinimized(false);
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
      syncHistory(safeInitialTime, audio.duration || 0);
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
        syncHistory(audioRef.current.currentTime, audioRef.current.duration);
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
      syncHistory(time, audioRef.current.duration || duration);
    }
  };

  const skipSeconds = (seconds: number) => {
    playTapSound();
    if (audioRef.current) {
      const next = Math.max(0, Math.min(duration || 9999, audioRef.current.currentTime + seconds));
      audioRef.current.currentTime = next;
      setCurrentTime(next);
      syncHistory(next, audioRef.current.duration || duration);
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
    <>
      {/* ẨN AUDIO TAG ĐIỀU KHIỂN CHÍNH - LUÔN ĐƯỢC MOUNT ĐỂ KHÔNG GIÁN ĐOẠN PHÁT ÂM THANH */}
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
                syncHistory(cur, audioRef.current.duration || duration);
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
            syncHistory(audioRef.current.currentTime, audioRef.current.duration || duration);
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

      {/* THANH PHÁT NỔI BÁM ĐÁY (MINI PLAYER) KHI THU NHỎ ĐỂ DUYỆT SÁCH KHÁC */}
      {isMinimized && (
        <div
          role="region"
          aria-label={`Thanh phát nổi sách nói ${book.title}`}
          className="fixed bottom-[68px] left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 bg-[#160e09]/95 backdrop-blur-md border border-amber-500/40 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.85)] p-2 sm:p-2.5 flex items-center justify-between text-white gap-2 select-none animate-in slide-in-from-bottom-3 duration-200"
        >
          {/* Nhấn để mở rộng toàn màn hình */}
          <div
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
            onClick={() => {
              playTapSound();
              setIsMinimized(false);
            }}
            title="Nhấn để mở rộng trình phát"
          >
            {/* Ảnh bìa tròn xoay khi phát */}
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-amber-500/40 shadow-xs">
              {displayCover && !displayCover.startsWith('style:') ? (
                <img
                  src={displayCover}
                  alt={book.title}
                  className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_8s_linear_infinite]' : ''}`}
                />
              ) : (
                <div className="w-full h-full bg-amber-900/50 flex items-center justify-center">
                  <Headphones size={18} className="text-amber-400" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/20" />
            </div>

            {/* Tiêu đề & Tiến độ */}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-black text-amber-100 line-clamp-1">
                {book.title}
              </span>
              <div className="flex items-center gap-1.5 text-[10px] text-amber-300/80 font-mono">
                <span>{formatSeconds(currentTime)}</span>
                <span>/</span>
                <span>{duration > 0 ? formatSeconds(duration) : book.durationFormatted || '--:--'}</span>
                {sleepTimerSeconds !== null && (
                  <span className="text-emerald-400 font-bold ml-1">
                    🌙 {Math.ceil(sleepTimerSeconds / 60)}p
                  </span>
                )}
              </div>
              {/* Thanh tiến trình mini cực mỏng */}
              <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-amber-400 h-full transition-all duration-300"
                  style={{
                    width: `${duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Cụm nút điều khiển mini */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Lùi 15s */}
            <button
              type="button"
              onClick={() => skipSeconds(-15)}
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white cursor-pointer transition-colors"
              title="Lùi 15s"
            >
              <RotateCcw size={15} />
            </button>

            {/* Play / Pause */}
            <button
              type="button"
              onClick={togglePlayPause}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center shadow-md cursor-pointer transition-transform active:scale-95"
              title={isPlaying ? 'Tạm dừng' : 'Tiếp tục phát'}
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isPlaying ? (
                <Pause size={16} className="fill-current" />
              ) : (
                <Play size={16} className="fill-current ml-0.5" />
              )}
            </button>

            {/* Mở rộng toàn màn hình */}
            <button
              type="button"
              onClick={() => {
                playTapSound();
                setIsMinimized(false);
              }}
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-amber-400 hover:text-amber-300 cursor-pointer transition-colors"
              title="Mở rộng trình phát"
            >
              <Sparkles size={15} />
            </button>

            {/* Đóng hẳn */}
            <button
              type="button"
              onClick={() => {
                playTapSound();
                if (audioRef.current) {
                  syncHistory(audioRef.current.currentTime, audioRef.current.duration);
                  audioRef.current.pause();
                }
                setIsPlaying(false);
                onClose();
              }}
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white cursor-pointer transition-colors"
              title="Tắt trình phát"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* KHUNG TRÌNH PHÁT SÁCH NÓI ĐẲNG CẤP TOÀN DIỆN (FULL SCREEN MODAL) */}
      {!isMinimized && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Trình phát sách nói ${book.title}`}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-center items-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => {
            playTapSound();
            setIsMinimized(true);
          }}
        >
          <div
            className="w-full max-w-[360px] sm:max-w-md bg-gradient-to-b from-[#1f130b] via-[#150d08] to-[#0a0604] border border-amber-500/35 rounded-3xl shadow-[0_24px_70px_rgba(0,0,0,0.9)] p-4 sm:p-5 flex flex-col gap-3 text-white max-h-[88vh] overflow-y-auto no-scrollbar my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HÀNG TIÊU ĐỀ ĐẦU: NÚT ĐÓNG + NÚT THU NHỎ + NHÃN + HẸN GIỜ + TỐC ĐỘ */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    if (audioRef.current) {
                      syncHistory(audioRef.current.currentTime, audioRef.current.duration);
                      audioRef.current.pause();
                    }
                    setIsPlaying(false);
                    onClose();
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white cursor-pointer transition-colors shrink-0"
                  title="Dừng và đóng trình phát"
                  aria-label="Đóng"
                >
                  <X size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setIsMinimized(true);
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-amber-300 hover:text-amber-200 cursor-pointer transition-colors shrink-0"
                  title="Thu nhỏ thành thanh phát nổi"
                  aria-label="Thu nhỏ"
                >
                  <Minimize2 size={15} />
                </button>
              </div>

              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                <span className="text-[11px] font-black uppercase font-mono tracking-wider text-amber-300 truncate">
                  SÁCH NÓI MP3
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Nút Hẹn giờ tắt (Sleep Timer) */}
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setShowSleepMenu((prev) => !prev);
                  }}
                  className={`h-7 px-2 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0 ${
                    sleepTimerSeconds !== null
                      ? 'bg-emerald-500/25 border border-emerald-500/50 text-emerald-300 animate-pulse'
                      : 'bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 hover:text-white'
                  }`}
                  title="Hẹn giờ tắt khi ngủ"
                >
                  <Clock size={13} className={sleepTimerSeconds !== null ? 'text-emerald-400' : 'text-amber-400'} />
                  <span className="text-[11px]">
                    {sleepTimerSeconds !== null ? `${Math.ceil(sleepTimerSeconds / 60)}p` : 'Hẹn giờ'}
                  </span>
                </button>

                {/* Tùy chọn tốc độ đọc */}
                <button
                  type="button"
                  onClick={cycleRate}
                  className="h-7 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-black cursor-pointer transition-all shrink-0"
                  title="Thay đổi tốc độ phát"
                >
                  {playbackRate}x
                </button>
              </div>
            </div>

            {/* POPOVER MENU HẸN GIỜ TẮT KHI NGỦ */}
            {showSleepMenu && (
              <div className="p-3 rounded-2xl bg-[#140b06] border border-amber-500/40 flex flex-col gap-2 animate-in zoom-in-95 duration-150 shadow-2xl">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Clock size={13} />
                    <span>HẸN GIỜ TẮT KHI NGỦ</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSleepMenu(false)}
                    className="text-white/60 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {[
                    { label: 'Tắt hẹn giờ', value: null },
                    { label: '15 phút', value: 15 * 60 },
                    { label: '30 phút', value: 30 * 60 },
                    { label: '45 phút', value: 45 * 60 },
                    { label: '60 phút', value: 60 * 60 },
                    {
                      label: 'Hết tệp này',
                      value: duration > currentTime ? Math.round(duration - currentTime) : 30 * 60,
                    },
                  ].map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        playTapSound();
                        setSleepTimerSeconds(opt.value);
                        setShowSleepMenu(false);
                      }}
                      className={`py-1.5 px-2 rounded-xl text-center font-bold transition-all cursor-pointer ${
                        (opt.value === null && sleepTimerSeconds === null) ||
                        (opt.value !== null && sleepTimerSeconds !== null && Math.abs(sleepTimerSeconds - opt.value) < 10)
                          ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                          : 'bg-white/10 hover:bg-white/20 text-white/90 border border-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {sleepTimerSeconds !== null && (
                  <p className="text-[10.5px] text-center text-emerald-300 font-mono font-bold">
                    🌙 Tự động dừng phát sau: {formatSeconds(sleepTimerSeconds)}
                  </p>
                )}
              </div>
            )}

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

        {/* HÀNG CUỐI: TẮT ÂM LƯỢNG & NÚT TẢI / XÓA VỀ NGOẠI TUYẾN */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
          <button
            type="button"
            onClick={toggleMute}
            className="flex items-center gap-1.5 text-white/70 hover:text-white cursor-pointer transition-colors"
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            <span className="text-[11px] font-medium">{isMuted ? 'Đã tắt âm' : 'Âm thanh'}</span>
          </button>

          <div className="flex items-center gap-1.5">
            {/* Nút Xóa bản tải khi đã tải về máy */}
            {isDownloaded && onDeleteDownload && (
              <button
                type="button"
                onClick={onDeleteDownload}
                className="h-7 px-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
                title="Xóa tệp âm thanh ngoại tuyến khỏi máy"
              >
                <Trash2 size={12} />
                <span>Xóa tải</span>
              </button>
            )}

            {onDownload && (
              <button
                type="button"
                onClick={isDownloaded ? undefined : onDownload}
                className={`h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                  isDownloaded
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer active:scale-95 shadow-sm'
                }`}
              >
                {isDownloaded ? (
                  <>
                    <CheckCircle2 size={12} />
                    <span>Đã lưu offline</span>
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
    </div>
  )}
</>
);
}
