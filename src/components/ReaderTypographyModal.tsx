'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Type,
  AlignJustify,
  AlignLeft,
  RotateCcw,
  Check,
  Eye,
  Sliders,
} from 'lucide-react';
import {
  TypographySettings,
  FontFamilyType,
  TextAlignType,
  DEFAULT_TYPOGRAPHY,
  getStoredTypography,
  saveStoredTypography,
  applyBionicToPlainText,
} from '../lib/typographyEngine';

interface ReaderTypographyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: TypographySettings;
  onChange: (newSettings: TypographySettings) => void;
  readingTheme?: 'dark' | 'light' | 'sepia';
}

export default function ReaderTypographyModal({
  isOpen,
  onClose,
  currentSettings,
  onChange,
  readingTheme = 'sepia',
}: ReaderTypographyModalProps) {
  const [settings, setSettings] = useState<TypographySettings>(currentSettings);

  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings, isOpen]);

  if (!isOpen) return null;

  const update = (partial: Partial<TypographySettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    saveStoredTypography(updated);
    onChange(updated);
  };

  const handleReset = () => {
    setSettings(DEFAULT_TYPOGRAPHY);
    saveStoredTypography(DEFAULT_TYPOGRAPHY);
    onChange(DEFAULT_TYPOGRAPHY);
  };

  const themeCardClasses = {
    dark: 'bg-[#181124] text-[#e0daf0] border-white/10',
    light: 'bg-white text-slate-900 border-black/10',
    sepia: 'bg-[#fbf0d9] text-[#2c1d11] border-[#eedac1]',
  }[readingTheme];

  const previewSampleText =
    'Đọc sách là hành trình nuôi dưỡng trí tuệ và mở rộng thế giới quan. Với công nghệ Bionic Reading, mắt của bạn sẽ lướt nhanh hơn gấp hai lần nhờ các điểm neo thị giác thông minh.';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg max-h-[92vh] rounded-3xl p-5 sm:p-6 flex flex-col shadow-2xl border transition-all ${themeCardClasses}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between pb-3.5 border-b border-black/10 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-base font-serif">
              Aa
            </div>
            <div>
              <h3 className="font-extrabold text-[15px] sm:text-base tracking-wide flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                <span>Cài Đặt Phông Chữ & Bionic Reading</span>
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                Tùy biến hiển thị và chế độ luyện đọc siêu tốc
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* NỘI DUNG CUỘN TRỰC QUAN */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 text-xs sm:text-sm">
          {/* KHỐI 1: BIONIC READING (ĐỌC SIÊU TỐC) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500 animate-pulse" />
                <div>
                  <span className="font-extrabold text-[13px] sm:text-sm text-amber-700 dark:text-amber-300">
                    Đọc Siêu Tốc Bionic Reading
                  </span>
                  <p className="text-[10.5px] opacity-75">
                    In đậm các chữ cái đầu để mắt tự lướt và não dự đoán từ nhanh hơn
                  </p>
                </div>
              </div>

              {/* TOGGLE SWITCH BIONIC */}
              <button
                type="button"
                onClick={() => update({ bionicReading: !settings.bionicReading })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  settings.bionicReading ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                aria-label="Bật tắt Bionic Reading"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.bionicReading ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* MỨC ĐỘ BIONIC (KHI BẬT) */}
            {settings.bionicReading && (
              <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold opacity-80 shrink-0">Độ bôi đậm:</span>
                <div className="flex items-center gap-1.5">
                  {[
                    { val: 1, label: 'Nhẹ' },
                    { val: 2, label: 'Chuẩn' },
                    { val: 3, label: 'Rõ' },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => update({ bionicIntensity: item.val })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        settings.bionicIntensity === item.val
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'bg-black/5 dark:bg-white/10 hover:bg-black/10'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* KHỐI XEM TRƯỚC (LIVE PREVIEW) */}
            <div className="mt-2.5 p-3 rounded-xl bg-white/70 dark:bg-black/30 border border-black/10 dark:border-white/10">
              <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider opacity-60 mb-1.5">
                <Eye size={12} />
                <span>Xem trước trực tiếp</span>
              </div>
              <p
                className={`leading-relaxed transition-all ${
                  settings.fontFamily === 'serif' || settings.fontFamily === 'lora'
                    ? 'font-serif'
                    : settings.fontFamily === 'mono'
                    ? 'font-mono'
                    : 'font-sans'
                }`}
                style={{
                  fontSize: `${Math.min(settings.fontSize, 18)}px`,
                  lineHeight: settings.lineHeight,
                  textAlign: settings.textAlign,
                }}
                dangerouslySetInnerHTML={{
                  __html: settings.bionicReading
                    ? applyBionicToPlainText(previewSampleText, settings.bionicIntensity)
                    : previewSampleText,
                }}
              />
            </div>
          </div>

          {/* KHỐI 2: CHỌN PHÔNG CHỮ */}
          <div className="space-y-2">
            <label className="text-[11.5px] font-extrabold uppercase tracking-wider opacity-80 flex items-center gap-1.5">
              <Type size={13} className="text-amber-500" />
              <span>Phông chữ</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'serif', label: 'Lora Serif', sub: 'Trang nhã', fontClass: 'font-serif' },
                { id: 'sans', label: 'Be Vietnam', sub: 'Hiện đại', fontClass: 'font-sans' },
                { id: 'inter', label: 'Inter', sub: 'Thanh thoát', fontClass: 'font-sans' },
                { id: 'mono', label: 'Monospace', sub: 'Kỹ thuật', fontClass: 'font-mono' },
              ].map((f) => {
                const isActive = settings.fontFamily === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => update({ fontFamily: f.id as FontFamilyType })}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isActive
                        ? 'border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/30'
                        : 'border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10'
                    }`}
                  >
                    <div className={`font-bold text-[13px] ${f.fontClass} flex items-center justify-between`}>
                      <span>{f.label}</span>
                      {isActive && <Check size={13} className="text-amber-600 dark:text-amber-400" />}
                    </div>
                    <span className="text-[10px] opacity-65">{f.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* KHỐI 3: CỠ CHỮ (FONT SIZE) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11.5px] font-extrabold uppercase tracking-wider opacity-80 flex items-center gap-1.5">
                <Sliders size={13} className="text-amber-500" />
                <span>Cỡ chữ: {settings.fontSize}px</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => update({ fontSize: Math.max(13, settings.fontSize - 1) })}
                  className="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 font-bold text-xs flex items-center justify-center cursor-pointer"
                  title="Giảm cỡ chữ"
                >
                  A-
                </button>
                <button
                  type="button"
                  onClick={() => update({ fontSize: Math.min(32, settings.fontSize + 1) })}
                  className="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 font-bold text-xs flex items-center justify-center cursor-pointer"
                  title="Tăng cỡ chữ"
                >
                  A+
                </button>
              </div>
            </div>
            <input
              type="range"
              min={13}
              max={30}
              step={1}
              value={settings.fontSize}
              onChange={(e) => update({ fontSize: Number(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* KHỐI 4: ĐỘ GIÃN DÒNG (LINE HEIGHT) & CĂN LỀ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Giãn dòng */}
            <div className="space-y-2">
              <label className="text-[11.5px] font-extrabold uppercase tracking-wider opacity-80 block">
                Khoảng cách dòng
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { val: 1.4, label: '1.4' },
                  { val: 1.6, label: '1.6' },
                  { val: 1.8, label: '1.8' },
                  { val: 2.0, label: '2.0' },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => update({ lineHeight: item.val })}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      settings.lineHeight === item.val
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-black/5 dark:bg-white/10 hover:bg-black/10'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Căn lề */}
            <div className="space-y-2">
              <label className="text-[11.5px] font-extrabold uppercase tracking-wider opacity-80 block">
                Căn lề đoạn văn
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => update({ textAlign: 'justify' })}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    settings.textAlign === 'justify'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-black/5 dark:bg-white/10 hover:bg-black/10'
                  }`}
                >
                  <AlignJustify size={14} />
                  <span>Đều 2 bên</span>
                </button>
                <button
                  type="button"
                  onClick={() => update({ textAlign: 'left' })}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    settings.textAlign === 'left'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-black/5 dark:bg-white/10 hover:bg-black/10'
                  }`}
                >
                  <AlignLeft size={14} />
                  <span>Căn trái</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs opacity-60 hover:opacity-100 hover:underline cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Mặc định</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-all cursor-pointer active:scale-95 shadow-md flex items-center gap-1.5"
          >
            <Check size={14} strokeWidth={2.5} />
            <span>Áp dụng ngay</span>
          </button>
        </div>
      </div>
    </div>
  );
}
