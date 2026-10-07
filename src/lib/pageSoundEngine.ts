'use client';

/**
 * PageSoundEngine: Hệ thống Âm Thanh Lật Trang Chân Thực (Realistic Paper Flip Synthesizer)
 * - 100% Web Audio API thuần: 0 KB tải ngoài, 0ms độ trễ, hoạt động ngoại tuyến 100%.
 * - Cơ chế Tự động Mở khóa (Auto-Unlock): Vượt qua chính sách Autoplay khắt khe của iOS Safari & Android Chrome.
 * - Hỗ trợ 5 cấu hình âm sắc lật sách thực tế:
 *   1. crisp_paper: Giấy thật tự nhiên (Fwick / Sột soạt chân thực của giấy in mộc)
 *   2. vintage_library: Sách cổ thư viện (Trang dày dặn, trầm ấm thư giãn)
 *   3. air_whoosh: Lướt gió êm nhẹ (Vạt giấy lướt thanh thoát, không giật mình)
 *   4. hardcover_snap: Bìa gập đanh gọn (Tiếng gập sách bìa cứng đanh chắc)
 *   5. silent: Tĩnh lặng (Tắt tiếng)
 */

export type PageSoundPreset =
  | 'crisp_paper'
  | 'vintage_library'
  | 'air_whoosh'
  | 'hardcover_snap'
  | 'silent';

export interface SoundPresetInfo {
  id: PageSoundPreset;
  name: string;
  subname: string;
  icon: string;
  description: string;
}

export const SOUND_PRESETS: SoundPresetInfo[] = [
  {
    id: 'crisp_paper',
    name: 'Giấy thật tự nhiên',
    subname: 'Sột soạt chân thực',
    icon: '📖',
    description: 'Âm thanh sột soạt tự nhiên của giấy in mộc khi lật trang, sống động và chân thật.',
  },
  {
    id: 'vintage_library',
    name: 'Sách cổ thư viện',
    subname: 'Trầm ấm & êm ái',
    icon: '🏛️',
    description: 'Âm sắc trang giấy dày dặn, độ trầm ấm cao, tạo cảm giác thư thái tĩnh tâm khi đọc.',
  },
  {
    id: 'air_whoosh',
    name: 'Lướt gió êm nhẹ',
    subname: 'Thanh thoát êm dịu',
    icon: '🍃',
    description: 'Tiếng lướt gió mềm mại của vạt giấy lướt nhẹ, êm tai và không gây giật mình ban đêm.',
  },
  {
    id: 'hardcover_snap',
    name: 'Bìa gập đanh gọn',
    subname: 'Đanh chắc & dứt khoát',
    icon: '📕',
    description: 'Tiếng gập lật đanh chắc của sách bìa cứng cao cấp, tạo cảm giác xúc giác rõ rệt.',
  },
  {
    id: 'silent',
    name: 'Tĩnh lặng (Tắt âm)',
    subname: 'Không phát tiếng',
    icon: '🤫',
    description: 'Tắt toàn bộ âm thanh lật sách để tập trung tối đa trong không gian tĩnh mịch.',
  },
];

class PageSoundEngine {
  private ctx: AudioContext | null = null;
  private currentPreset: PageSoundPreset = 'crisp_paper';
  private volume: number = 0.75;
  private isUnlocked: boolean = false;
  private noiseBuffer: AudioBuffer | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initFromStorage();
      this.setupAutoUnlock();
    }
  }

  private initFromStorage(): void {
    try {
      const savedPreset = localStorage.getItem('reader_sound_preset') as PageSoundPreset;
      if (savedPreset && SOUND_PRESETS.some((p) => p.id === savedPreset)) {
        this.currentPreset = savedPreset;
      }
      // Hỗ trợ đồng bộ với cấu hình reader_sound_pref cũ (nếu từng tắt)
      const oldPref = localStorage.getItem('reader_sound_pref');
      if (oldPref === 'false') {
        this.currentPreset = 'silent';
      }

      const savedVol = localStorage.getItem('reader_sound_volume');
      if (savedVol) {
        const v = parseFloat(savedVol);
        if (!isNaN(v) && v >= 0 && v <= 1) {
          this.volume = v;
        }
      }
    } catch {}
  }

  /**
   * Tự động đăng ký lắng nghe cử chỉ chạm đầu tiên để mở khóa AudioContext (iOS / Android Safari / Chrome)
   */
  private setupAutoUnlock(): void {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      this.unlockAudio();
    };

    window.addEventListener('pointerdown', unlock, { passive: true, capture: true });
    window.addEventListener('touchstart', unlock, { passive: true, capture: true });
    window.addEventListener('click', unlock, { passive: true, capture: true });
  }

  /**
   * Mở khóa AudioContext khi có tương tác người dùng
   */
  public unlockAudio(): void {
    try {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
          this.isUnlocked = true;
        }).catch(() => {});
      } else if (ctx && ctx.state === 'running') {
        this.isUnlocked = true;
      }
    } catch {}
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * Tạo bộ nhớ đệm nhiễu trắng/hồng (0.4s) dùng làm nền cho độ nhám của sợi giấy
   */
  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }

    const duration = 0.45;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Sinh Pink/Brownish noise kết hợp để tạo độ ráp tự nhiên của giấy
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      data[i] = pink * 0.12;
    }

    this.noiseBuffer = buffer;
    return buffer;
  }

  private lastPlayTime: number = 0;

  /**
   * Phát âm thanh lật sách dựa trên cấu hình đã chọn (hoặc override thử nghe)
   */
  public playFlipSound(presetOverride?: PageSoundPreset): void {
    const preset = presetOverride || this.currentPreset;
    if (preset === 'silent' || this.volume <= 0.01) return;

    if (!presetOverride) {
      const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (nowMs - this.lastPlayTime < 90) return;
      this.lastPlayTime = nowMs;
    }

    const ctx = this.getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume, now);
      masterGain.connect(ctx.destination);

      switch (preset) {
        case 'crisp_paper':
          this.synthesizeCrispPaper(ctx, masterGain, now);
          break;
        case 'vintage_library':
          this.synthesizeVintageLibrary(ctx, masterGain, now);
          break;
        case 'air_whoosh':
          this.synthesizeAirWhoosh(ctx, masterGain, now);
          break;
        case 'hardcover_snap':
          this.synthesizeHardcoverSnap(ctx, masterGain, now);
          break;
        default:
          break;
      }
    } catch {}
  }

  /**
   * 1. CRISP PAPER: Sột soạt giấy in mộc tự nhiên
   * Tiếng ma sát sợi giấy + tiếng búng gập nhẹ của góc trang
   */
  private synthesizeCrispPaper(ctx: AudioContext, destination: GainNode, now: number): void {
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);

    // Bộ lọc dải tần ma sát giấy (Bandpass 2600Hz -> 1400Hz)
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(2800, now);
    bandpass.frequency.exponentialRampToValueAtTime(1400, now + 0.18);
    bandpass.Q.setValueAtTime(1.4, now);

    // Gain Envelope mô phỏng cú vuốt dứt khoát của ngón tay
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.48, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

    noise.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(destination);

    // Âm búng góc giấy (Flick transient): Nhấp nhô tần số cao ngắn 35ms
    const flickOsc = ctx.createOscillator();
    const flickGain = ctx.createGain();
    flickOsc.type = 'triangle';
    flickOsc.frequency.setValueAtTime(680, now);
    flickOsc.frequency.exponentialRampToValueAtTime(260, now + 0.05);

    flickGain.gain.setValueAtTime(0.18, now);
    flickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    flickOsc.connect(flickGain);
    flickGain.connect(destination);

    noise.start(now);
    noise.stop(now + 0.22);
    flickOsc.start(now);
    flickOsc.stop(now + 0.06);
  }

  /**
   * 2. VINTAGE LIBRARY: Sách cổ thư viện trầm ấm
   * Dải tần thấp, giấy dày dặn, ngân trầm êm ái
   */
  private synthesizeVintageLibrary(ctx: AudioContext, destination: GainNode, now: number): void {
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);

    // Bộ lọc trầm ấm dải 950Hz -> 480Hz
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, now);
    filter.frequency.exponentialRampToValueAtTime(520, now + 0.26);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.55, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    // Âm thân sách cộng hưởng (Body resonance 220Hz -> 140Hz)
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = 'sine';
    bodyOsc.frequency.setValueAtTime(240, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(130, now + 0.12);

    bodyGain.gain.setValueAtTime(0.12, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(destination);

    noise.start(now);
    noise.stop(now + 0.28);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.15);
  }

  /**
   * 3. AIR WHOOSH: Lướt gió êm nhẹ
   * Vạt giấy lướt nhẹ nhàng trong không khí
   */
  private synthesizeAirWhoosh(ctx: AudioContext, destination: GainNode, now: number): void {
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.frequency.exponentialRampToValueAtTime(750, now + 0.24);
    filter.Q.setValueAtTime(0.9, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.42, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    noise.start(now);
    noise.stop(now + 0.26);
  }

  /**
   * 4. HARDCOVER SNAP: Bìa gập đanh gọn
   * Cú bật đanh của mép sách bìa cứng
   */
  private synthesizeHardcoverSnap(ctx: AudioContext, destination: GainNode, now: number): void {
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);

    // Tiếng rít siêu ngắn tần số cao (3400Hz, 80ms)
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1800, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.40, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    // Cú "Snap" đanh gọn (Impulse click)
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(540, now);
    snapOsc.frequency.exponentialRampToValueAtTime(180, now + 0.04);

    snapGain.gain.setValueAtTime(0.25, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    snapOsc.connect(snapGain);
    snapGain.connect(destination);

    noise.start(now);
    noise.stop(now + 0.14);
    snapOsc.start(now);
    snapOsc.stop(now + 0.06);
  }

  // ================= GETTER / SETTER API =================
  public getPreset(): PageSoundPreset {
    return this.currentPreset;
  }

  public setPreset(preset: PageSoundPreset): void {
    this.currentPreset = preset;
    try {
      localStorage.setItem('reader_sound_preset', preset);
      localStorage.setItem('reader_sound_pref', preset === 'silent' ? 'false' : 'true');
    } catch {}
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.volume = clamped;
    try {
      localStorage.setItem('reader_sound_volume', clamped.toString());
    } catch {}
  }

  public isMuted(): boolean {
    return this.currentPreset === 'silent' || this.volume <= 0.01;
  }

  public toggleMute(): PageSoundPreset {
    if (this.currentPreset === 'silent') {
      this.setPreset('crisp_paper');
      return 'crisp_paper';
    } else {
      this.setPreset('silent');
      return 'silent';
    }
  }
}

// Singleton Engine instance
export const pageSoundEngine = new PageSoundEngine();
