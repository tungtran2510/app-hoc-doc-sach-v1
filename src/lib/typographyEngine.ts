/**
 * typographyEngine.ts
 * Module chuyên trách quản lý Tùy Biến Phông Chữ & Chế Độ Luyện Đọc Siêu Tốc Bionic Reading
 * Dành cho Ebook Reader App chuyên nghiệp
 */

export type FontFamilyType = 'sans' | 'serif' | 'lora' | 'inter' | 'mono';
export type TextAlignType = 'justify' | 'left';

export interface TypographySettings {
  fontFamily: FontFamilyType;
  fontSize: number; // 13 - 32px
  lineHeight: number; // 1.3 - 2.4
  textAlign: TextAlignType;
  bionicReading: boolean;
  bionicIntensity: number; // 1 (Nhẹ), 2 (Chuẩn), 3 (Rõ)
}

export const DEFAULT_TYPOGRAPHY: TypographySettings = {
  fontFamily: 'serif',
  fontSize: 18,
  lineHeight: 1.75,
  textAlign: 'justify',
  bionicReading: false,
  bionicIntensity: 2,
};

const STORAGE_KEY = 'qbiz_ebook_typography_v1';

/**
 * Đọc cài đặt typography đã lưu từ LocalStorage
 */
export function getStoredTypography(): TypographySettings {
  if (typeof window === 'undefined') return DEFAULT_TYPOGRAPHY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TYPOGRAPHY;
    const parsed = JSON.parse(raw);
    return {
      fontFamily: parsed.fontFamily || DEFAULT_TYPOGRAPHY.fontFamily,
      fontSize: typeof parsed.fontSize === 'number' ? parsed.fontSize : DEFAULT_TYPOGRAPHY.fontSize,
      lineHeight: typeof parsed.lineHeight === 'number' ? parsed.lineHeight : DEFAULT_TYPOGRAPHY.lineHeight,
      textAlign: parsed.textAlign || DEFAULT_TYPOGRAPHY.textAlign,
      bionicReading: Boolean(parsed.bionicReading),
      bionicIntensity: typeof parsed.bionicIntensity === 'number' ? parsed.bionicIntensity : DEFAULT_TYPOGRAPHY.bionicIntensity,
    };
  } catch {
    return DEFAULT_TYPOGRAPHY;
  }
}

/**
 * Lưu cài đặt typography vào LocalStorage
 */
export function saveStoredTypography(settings: TypographySettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

/**
 * Thuật toán Bionic Reading cho 1 từ:
 * In đậm điểm cố định mắt (artificial fixation point) ở phần đầu của từ
 * Hỗ trợ hoàn hảo cả tiếng Việt có dấu và tiếng Anh
 */
export function bionicWord(word: string, intensity: number = 2): string {
  if (!word || word.length === 0) return word;

  // Tách dấu câu ở đầu và cuối từ (VD: "(sức", "khỏe!?", "«y")
  const match = word.match(
    /^([^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]*)(.*?)([^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]*)$/
  );
  if (!match) return word;

  const [, prefix, coreWord, suffix] = match;
  if (!coreWord) return word;

  const len = coreWord.length;
  let fixLen = 1;

  if (intensity === 1) {
    // Nhẹ (~35%)
    fixLen = len <= 3 ? 1 : Math.ceil(len * 0.35);
  } else if (intensity === 3) {
    // Rõ (~60%)
    fixLen = len <= 2 ? 1 : Math.ceil(len * 0.6);
  } else {
    // Chuẩn (default ~45%)
    if (len <= 3) fixLen = 1;
    else if (len <= 5) fixLen = 2;
    else if (len <= 8) fixLen = 3;
    else fixLen = Math.ceil(len * 0.45);
  }

  const boldPart = coreWord.slice(0, fixLen);
  const restPart = coreWord.slice(fixLen);

  return `${prefix}<b class="bionic-fix font-black text-ink opacity-100">${boldPart}</b><span class="opacity-80">${restPart}</span>${suffix}`;
}

/**
 * Áp dụng Bionic Reading cho đoạn HTML mà không làm xáo trộn cấu trúc thẻ
 */
export function applyBionicToHtml(html: string, intensity: number = 2): string {
  if (!html) return '';

  // Bọc trong thẻ div tạm để đảm bảo mọi đoạn text đều nằm giữa > và <
  const wrapped = `<div>${html}</div>`;

  // Thay thế các vùng text nằm giữa > và <
  const processed = wrapped.replace(/>([^<]+)</g, (_match, textContent) => {
    // Bỏ qua nếu textContent chỉ gồm khoảng trắng
    if (!textContent.trim()) return `>${textContent}<`;

    // Thay thế từng từ trong textContent
    const bionic = textContent.replace(/[\w\u00C0-\u024F\u1EA0-\u1EF9]+/g, (w: string) => {
      return bionicWord(w, intensity);
    });

    return `>${bionic}<`;
  });

  // Bỏ thẻ bọc div tạm
  return processed.slice(5, -6);
}

/**
 * Áp dụng Bionic Reading cho Plain Text (chuỗi văn bản thuần túy)
 */
export function applyBionicToPlainText(text: string, intensity: number = 2): string {
  if (!text) return '';
  return text.replace(/[\w\u00C0-\u024F\u1EA0-\u1EF9]+/g, (w: string) => {
    return bionicWord(w, intensity);
  });
}

/**
 * Trả về class font tương ứng theo thiết lập
 */
export function getFontFamilyClass(font: FontFamilyType): string {
  switch (font) {
    case 'lora':
    case 'serif':
      return 'font-serif';
    case 'inter':
    case 'sans':
      return 'font-sans';
    case 'mono':
      return 'font-mono';
    default:
      return 'font-serif';
  }
}
