'use client';

/**
 * Module Quản lý Âm thanh Chạy Nền & Điều khiển Màn hình Khóa (Background Audio & Lock Screen Engine)
 * Tương thích 100%: iOS Safari, Android Chrome, Edge, Safari macOS, Chrome Desktop.
 * 
 * Tính năng chính:
 * 1. Media Session API: Đẩy Tên sách, Tác giả, Bìa sách, Thanh thời gian lên Màn hình Khóa & Dynamic Island.
 * 2. Lock Screen Controls: Phím Play, Pause, Tua 10s, Tua tới 10s trực tiếp từ màn hình khóa / tai nghe Bluetooth.
 * 3. Silent Audio Loop Anchor: Neo kênh âm thanh hệ thống để Giọng đọc AI (TTS) & Sách nói không bị ngắt khi TẮT MÀN HÌNH.
 * 4. Screen Wake Lock API: Tùy chọn giữ sáng màn hình khi đọc sách chữ ban đêm.
 */

// File âm thanh PCM 16-bit 44.1kHz siêu ngắn (1 chu kỳ im lặng) dạng Base64
const SILENT_AUDIO_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';

export interface MediaSessionConfig {
  title: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onSeekBackward?: () => void;
  onSeekForward?: () => void;
  onPreviousTrack?: () => void;
  onNextTrack?: () => void;
}

class BackgroundAudioManager {
  private silentAudio: HTMLAudioElement | null = null;
  private wakeLockSentinel: any = null;
  private isWakeLockRequested: boolean = false;
  private activeConfig: MediaSessionConfig | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Tự động khôi phục Wake Lock khi người dùng chuyển lại tab
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.isWakeLockRequested) {
          this.acquireWakeLock();
        }
      });
    }
  }

  /* ====================================================================
   * 1. MEDIA SESSION API (ĐIỀU KHIỂN MÀN HÌNH KHÓA & BLUETOOTH)
   * ==================================================================== */

  /**
   * Đăng ký phiên âm thanh hệ thống (Lock screen metadata + Action Handlers)
   */
  public setupMediaSession(config: MediaSessionConfig) {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    this.activeConfig = config;
    const nav = navigator as any;

    try {
      // 1. Cập nhật Metadata (Tiêu đề, Tác giả, Bìa sách)
      const artworkList: any[] = [];
      if (config.artworkUrl) {
        artworkList.push(
          { src: config.artworkUrl, sizes: '96x96', type: 'image/png' },
          { src: config.artworkUrl, sizes: '128x128', type: 'image/png' },
          { src: config.artworkUrl, sizes: '192x192', type: 'image/png' },
          { src: config.artworkUrl, sizes: '256x256', type: 'image/png' },
          { src: config.artworkUrl, sizes: '512x512', type: 'image/png' }
        );
      }

      if (typeof (window as any).MediaMetadata !== 'undefined') {
        nav.mediaSession.metadata = new (window as any).MediaMetadata({
          title: config.title || 'Qbiz Sách Nói',
          artist: config.artist || 'Tác giả',
          album: config.album || 'Tủ Sách Điện Tử Qbiz Books',
          artwork: artworkList,
        });
      }

      // 2. Đăng ký Action Handlers (Play / Pause / Seek / Skip)
      const registerHandler = (action: string, handler?: () => void) => {
        try {
          if (handler) {
            nav.mediaSession.setActionHandler(action, handler);
          } else {
            nav.mediaSession.setActionHandler(action, null);
          }
        } catch {
          // Một số trình duyệt cũ có thể không hỗ trợ một số action cụ thể
        }
      };

      registerHandler('play', config.onPlay);
      registerHandler('pause', config.onPause);
      registerHandler('seekbackward', config.onSeekBackward);
      registerHandler('seekforward', config.onSeekForward);
      registerHandler('previoustrack', config.onPreviousTrack);
      registerHandler('nexttrack', config.onNextTrack);

      nav.mediaSession.playbackState = 'playing';
    } catch (err) {
      console.warn('Lỗi thiết lập MediaSession:', err);
    }
  }

  /**
   * Cập nhật trạng thái phát (playing / paused / none)
   */
  public updatePlaybackState(state: 'playing' | 'paused' | 'none') {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      (navigator as any).mediaSession.playbackState = state;
    } catch {}
  }

  /**
   * Cập nhật vị trí thanh tiến trình trên màn hình khóa
   */
  public updatePositionState(position: number, duration: number, playbackRate: number = 1.0) {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    const nav = navigator as any;

    if (typeof nav.mediaSession.setPositionState === 'function') {
      try {
        if (
          typeof duration === 'number' &&
          Number.isFinite(duration) &&
          duration > 0 &&
          typeof position === 'number' &&
          Number.isFinite(position) &&
          position >= 0 &&
          position <= duration
        ) {
          nav.mediaSession.setPositionState({
            duration: Math.max(1, duration),
            playbackRate: Math.max(0.5, Math.min(2.5, playbackRate)),
            position: Math.max(0, Math.min(position, duration)),
          });
        }
      } catch {}
    }
  }

  /**
   * Xóa phiên Media Session khi dừng hẳn
   */
  public clearMediaSession() {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    const nav = navigator as any;
    try {
      nav.mediaSession.playbackState = 'none';
      if (nav.mediaSession.metadata) {
        nav.mediaSession.metadata = null;
      }
      const actions = ['play', 'pause', 'seekbackward', 'seekforward', 'previoustrack', 'nexttrack'];
      actions.forEach((act) => {
        try { nav.mediaSession.setActionHandler(act, null); } catch {}
      });
    } catch {}
    this.activeConfig = null;
  }

  /* ====================================================================
   * 2. SILENT AUDIO KEEP-ALIVE (CHỐNG DỪNG KHI TẮT MÀN HÌNH CHO TTS / AUDIO)
   * ==================================================================== */

  /**
   * Bật neo âm thanh ngầm để giữ audio session phần cứng không bị OS đóng khi tắt màn hình
   */
  public startSilentAudioKeepAlive(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      if (!this.silentAudio) {
        const audio = new Audio();
        audio.src = SILENT_AUDIO_DATA_URI;
        audio.loop = true;
        audio.volume = 0.01; // Âm lượng cực nhỏ (không nghe thấy nhưng iOS/Android nhận diện có stream)
        audio.setAttribute('playsinline', 'true');
        audio.setAttribute('webkit-playsinline', 'true');
        this.silentAudio = audio;
      }

      const p = this.silentAudio.play();
      if (p && typeof p.then === 'function') {
        p.catch(() => {
          // Trình duyệt chặn nếu chưa có tương tác chạm người dùng
        });
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Tắt neo âm thanh ngầm
   */
  public stopSilentAudioKeepAlive() {
    if (this.silentAudio) {
      try {
        this.silentAudio.pause();
        this.silentAudio.currentTime = 0;
      } catch {}
    }
  }

  /* ====================================================================
   * 3. SCREEN WAKE LOCK API (TÙY CHỌN GIỮ SÁNG MÀN HÌNH KHI ĐỌC SÁCH)
   * ==================================================================== */

  public isWakeLockSupported(): boolean {
    return typeof window !== 'undefined' && 'wakeLock' in navigator;
  }

  public async acquireWakeLock(): Promise<boolean> {
    if (!this.isWakeLockSupported()) return false;
    try {
      this.isWakeLockRequested = true;
      if (this.wakeLockSentinel && !this.wakeLockSentinel.released) {
        return true;
      }
      const nav = navigator as any;
      this.wakeLockSentinel = await nav.wakeLock.request('screen');
      this.wakeLockSentinel.addEventListener('release', () => {
        // Tự động thông báo nếu bị giải phóng
      });
      return true;
    } catch (err) {
      console.warn('Wake Lock request error:', err);
      return false;
    }
  }

  public async releaseWakeLock() {
    this.isWakeLockRequested = false;
    if (this.wakeLockSentinel) {
      try {
        await this.wakeLockSentinel.release();
        this.wakeLockSentinel = null;
      } catch {}
    }
  }

  public isWakeLockActive(): boolean {
    return Boolean(this.wakeLockSentinel && !this.wakeLockSentinel.released);
  }
}

// Singleton export
export const backgroundAudioManager = new BackgroundAudioManager();
