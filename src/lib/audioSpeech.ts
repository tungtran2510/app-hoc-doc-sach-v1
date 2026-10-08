'use client';

/**
 * Module quản lý Sách Nói / Giọng đọc AI Tiếng Việt (Web Speech Synthesis Engine)
 * Tối ưu hoá cho Chrome, Safari iOS, Edge và Android.
 * Tích hợp cơ chế tự động chống dừng âm thanh (SpeechSynthesis Keep-Alive Heartbeat)
 */

import { backgroundAudioManager } from './backgroundAudioManager';

export interface SpeechVoiceOption {
  voice: SpeechSynthesisVoice;
  name: string;
  lang: string;
  isVietnamese: boolean;
  isDefault: boolean;
}

export interface AudioPlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  currentIndex: number;
  totalItems: number;
  currentText: string;
  rate: number;
  voiceName: string;
}

class BookAudioPlayerEngine {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private heartbeatTimer: any = null;

  private queue: string[] = [];
  private currentIndex: number = 0;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private rate: number = 1.0;
  private selectedVoice: SpeechSynthesisVoice | null = null;

  private bookTitle: string = 'Qbiz Sách Nói';
  private author: string = 'Giọng đọc AI';
  private chapterTitle: string = '';
  private coverUrl: string = '';

  private onStateChangeCallback: ((state: AudioPlayerState) => void) | null = null;
  private onChapterFinishCallback: (() => void) | null = null;
  private onParagraphChangeCallback: ((index: number, text: string) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      // Nạp danh sách giọng đọc
      this.initVoices();
    }
  }

  public isSupported(): boolean {
    return Boolean(this.synth);
  }

  public async getAvailableVoices(): Promise<SpeechVoiceOption[]> {
    if (!this.synth) return [];

    let voices = this.synth.getVoices();
    if (voices.length === 0) {
      // Đợi voiceschanged event
      await new Promise<void>((resolve) => {
        const handler = () => {
          this.synth?.removeEventListener('voiceschanged', handler);
          resolve();
        };
        this.synth?.addEventListener('voiceschanged', handler);
        // Timeout dự phòng
        setTimeout(resolve, 800);
      });
      voices = this.synth.getVoices();
    }

    const options: SpeechVoiceOption[] = voices.map((v) => {
      const langLower = (v.lang || '').toLowerCase();
      const nameLower = (v.name || '').toLowerCase();
      const isVi =
        langLower.startsWith('vi') ||
        nameLower.includes('vietnam') ||
        nameLower.includes('việt') ||
        nameLower.includes('hoaimy') ||
        nameLower.includes('nam') ||
        nameLower.includes('linh') ||
        nameLower.includes('an');

      return {
        voice: v,
        name: v.name,
        lang: v.lang,
        isVietnamese: isVi,
        isDefault: v.default,
      };
    });

    // Ưu tiên giọng tiếng Việt lên đầu bảng
    options.sort((a, b) => {
      if (a.isVietnamese && !b.isVietnamese) return -1;
      if (!a.isVietnamese && b.isVietnamese) return 1;
      return a.name.localeCompare(b.name);
    });

    return options;
  }

  private async initVoices() {
    const list = await this.getAvailableVoices();
    const viVoice = list.find((v) => v.isVietnamese);
    if (viVoice) {
      this.selectedVoice = viVoice.voice;
    } else if (list.length > 0) {
      this.selectedVoice = list[0].voice;
    }
  }

  public setVoice(voice: SpeechSynthesisVoice) {
    this.selectedVoice = voice;
    if (this.isPlaying && !this.isPaused) {
      // Phát lại đoạn hiện tại với giọng mới
      this.speakCurrent();
    }
  }

  public setRate(newRate: number) {
    this.rate = Math.max(0.5, Math.min(2.5, newRate));
    if (this.isPlaying && !this.isPaused) {
      this.speakCurrent();
    }
    this.notifyState();
  }

  public getRate(): number {
    return this.rate;
  }

  public setQueue(paragraphs: string[], startIndex: number = 0) {
    this.stop();
    this.queue = paragraphs
      .map((p) => p.replace(/<[^>]*>/g, '').trim())
      .filter((p) => p.length > 0);
    this.currentIndex = Math.max(0, Math.min(startIndex, this.queue.length - 1));
    this.notifyState();
  }

  public setBookContext(title: string, author?: string, coverUrl?: string, chapterTitle?: string) {
    if (title) this.bookTitle = title;
    if (author) this.author = author;
    if (coverUrl) this.coverUrl = coverUrl;
    if (chapterTitle) this.chapterTitle = chapterTitle;

    if (this.isPlaying && !this.isPaused) {
      this.syncMediaSession();
    }
  }

  private syncMediaSession() {
    backgroundAudioManager.setupMediaSession({
      title: this.chapterTitle ? `${this.bookTitle} · ${this.chapterTitle}` : this.bookTitle,
      artist: this.author,
      album: 'Qbiz Books · Giọng đọc AI',
      artworkUrl: this.coverUrl || '/icon.png',
      onPlay: () => this.resume(),
      onPause: () => this.pause(),
      onSeekBackward: () => this.prev(),
      onSeekForward: () => this.next(),
      onPreviousTrack: () => this.prev(),
      onNextTrack: () => this.next(),
    });
  }

  public play(startIndex?: number) {
    if (!this.synth || this.queue.length === 0) return;

    if (this.isPaused && this.currentUtterance) {
      this.resume();
      return;
    }

    if (typeof startIndex === 'number') {
      this.currentIndex = Math.max(0, Math.min(startIndex, this.queue.length - 1));
    }

    this.isPlaying = true;
    this.isPaused = false;
    this.notifyState();
    backgroundAudioManager.startSilentAudioKeepAlive();
    this.syncMediaSession();
    backgroundAudioManager.updatePlaybackState('playing');
    this.speakCurrent();
  }

  private speakCurrent() {
    if (!this.synth || this.currentIndex >= this.queue.length) {
      this.stop();
      this.onChapterFinishCallback?.();
      return;
    }

    this.clearHeartbeat();
    this.synth.cancel();

    const rawText = this.queue[this.currentIndex];
    if (!rawText) {
      this.next();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(rawText);
    utterance.rate = this.rate;
    utterance.pitch = 1.0;
    utterance.lang = 'vi-VN';

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    utterance.onstart = () => {
      this.isPlaying = true;
      this.isPaused = false;
      this.startHeartbeat();
      backgroundAudioManager.startSilentAudioKeepAlive();
      backgroundAudioManager.updatePlaybackState('playing');
      backgroundAudioManager.updatePositionState(
        this.currentIndex + 1,
        Math.max(1, this.queue.length),
        this.rate
      );
      this.notifyState();
      this.onParagraphChangeCallback?.(this.currentIndex, rawText);
    };

    utterance.onend = () => {
      this.clearHeartbeat();
      if (this.isPlaying && !this.isPaused) {
        if (this.currentIndex < this.queue.length - 1) {
          this.currentIndex++;
          this.speakCurrent();
        } else {
          // Kết thúc danh sách
          this.isPlaying = false;
          this.isPaused = false;
          backgroundAudioManager.stopSilentAudioKeepAlive();
          backgroundAudioManager.clearMediaSession();
          this.notifyState();
          this.onChapterFinishCallback?.();
        }
      }
    };

    utterance.onerror = (e) => {
      this.clearHeartbeat();
      console.warn('Lỗi SpeechSynthesisUtterance:', e);
      if (this.isPlaying && !this.isPaused) {
        // Tự động chuyển đoạn tiếp theo nếu gặp lỗi
        if (this.currentIndex < this.queue.length - 1) {
          this.currentIndex++;
          this.speakCurrent();
        } else {
          this.stop();
        }
      }
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
    this.notifyState();
  }

  /**
   * Heartbeat để sửa lỗi trình duyệt Chrome tự ngắt âm thanh sau 15 giây
   */
  private startHeartbeat() {
    this.clearHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.synth && this.isPlaying && !this.isPaused) {
        this.synth.pause();
        this.synth.resume();
      }
    }, 10000);
  }

  private clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  public pause() {
    if (!this.synth || !this.isPlaying) return;
    this.clearHeartbeat();
    this.synth.pause();
    this.isPaused = true;
    backgroundAudioManager.stopSilentAudioKeepAlive();
    backgroundAudioManager.updatePlaybackState('paused');
    this.notifyState();
  }

  public resume() {
    if (!this.synth) return;
    if (this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
      this.startHeartbeat();
      backgroundAudioManager.startSilentAudioKeepAlive();
      this.syncMediaSession();
      backgroundAudioManager.updatePlaybackState('playing');
      this.notifyState();
    } else {
      this.play();
    }
  }

  public togglePlayPause() {
    if (this.isPlaying && !this.isPaused) {
      this.pause();
    } else {
      this.resume();
    }
  }

  public next() {
    if (this.currentIndex < this.queue.length - 1) {
      this.currentIndex++;
      if (this.isPlaying) {
        this.speakCurrent();
      } else {
        this.notifyState();
        this.onParagraphChangeCallback?.(this.currentIndex, this.queue[this.currentIndex]);
      }
    } else {
      this.onChapterFinishCallback?.();
    }
  }

  public prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      if (this.isPlaying) {
        this.speakCurrent();
      } else {
        this.notifyState();
        this.onParagraphChangeCallback?.(this.currentIndex, this.queue[this.currentIndex]);
      }
    }
  }

  public stop() {
    this.clearHeartbeat();
    if (this.synth) {
      this.synth.cancel();
    }
    this.isPlaying = false;
    this.isPaused = false;
    this.currentUtterance = null;
    backgroundAudioManager.stopSilentAudioKeepAlive();
    backgroundAudioManager.clearMediaSession();
    this.notifyState();
  }

  public onStateChange(cb: (state: AudioPlayerState) => void) {
    this.onStateChangeCallback = cb;
  }

  public onChapterFinish(cb: () => void) {
    this.onChapterFinishCallback = cb;
  }

  public onParagraphChange(cb: (index: number, text: string) => void) {
    this.onParagraphChangeCallback = cb;
  }

  public getState(): AudioPlayerState {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentIndex: this.currentIndex,
      totalItems: this.queue.length,
      currentText: this.queue[this.currentIndex] || '',
      rate: this.rate,
      voiceName: this.selectedVoice?.name || 'Mặc định (Tiếng Việt)',
    };
  }

  private notifyState() {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.getState());
    }
  }
}

// Singleton audio player instance
export const bookAudioPlayer = new BookAudioPlayerEngine();

/**
 * Trích xuất các đoạn văn bản từ chuỗi HTML của chương sách EPUB
 */
export function extractParagraphsFromHtml(html: string): string[] {
  if (typeof window === 'undefined') return [];
  const div = document.createElement('div');
  div.innerHTML = html;

  // Lấy các thẻ tiêu đề, đoạn văn và thẻ danh sách
  const elements = div.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, blockquote');
  const paragraphs: string[] = [];

  if (elements.length > 0) {
    elements.forEach((el) => {
      const text = (el.textContent || '').trim();
      if (text.length > 2) {
        paragraphs.push(text);
      }
    });
  } else {
    // Nếu không có thẻ cấu trúc, bóc theo ngắt dòng
    const text = (div.textContent || '').trim();
    const parts = text.split(/\n+/).map((s) => s.trim()).filter((s) => s.length > 2);
    paragraphs.push(...parts);
  }

  return paragraphs;
}

/**
 * Chia một trang văn bản PDF thành các đoạn câu tự nhiên
 */
export function extractParagraphsFromPdfText(text: string): string[] {
  if (!text) return [];
  const clean = text.replace(/\r\n/g, '\n').trim();
  // Tách theo đoạn xuống dòng đôi hoặc dấu chấm câu
  const lines = clean.split(/\n\s*\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length > 1) return lines;

  // Nếu chỉ có 1 khối text dài, tách theo câu kết thúc bằng dấu chấm/hỏi/than
  const sentences = clean
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  return sentences.length > 0 ? sentences : [clean];
}
