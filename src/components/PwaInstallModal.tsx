'use client';

import React from 'react';
import { X, Download, Share2, PlusSquare, Smartphone } from 'lucide-react';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PwaInstallModal({ isOpen, onClose }: PwaInstallModalProps) {
  if (!isOpen) return null;

  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  const handleAndroidInstall = async () => {
    if (typeof window !== 'undefined' && window.deferredPrompt) {
      window.deferredPrompt.prompt();
      const choiceResult = await window.deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        window.deferredPrompt = null;
      }
      onClose();
    } else {
      alert('Để cài đặt ứng dụng: Mở menu trình duyệt (⋮) → Chọn "Cài đặt ứng dụng" hoặc "Thêm vào Màn hình chính".');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-[440px] bg-[#1c1109] text-[#fdf7ee] rounded-t-[28px] sm:rounded-[28px] flex flex-col overflow-hidden shadow-2xl border border-[#553622] animate-in slide-in-from-bottom duration-200">
        <div className="w-12 h-1.5 bg-[#553622] rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        <div className="flex items-center justify-between p-4 px-5 border-b border-[#3a2314]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] overflow-hidden shrink-0 border border-amber-500/40 p-0.5 bg-[#120a05] shadow-xs">
              <img src="/logo.png?v=25" alt="Qbiz-ebook" className="w-full h-full object-cover rounded-[10px]" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-[17px] font-black text-amber-200 leading-tight">
                Cài đặt Qbiz-ebook
              </h3>
              <span className="text-[11.5px] font-medium text-amber-100/70">
                Tủ Sách Điện Tử & Y Khoa
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-amber-300 hover:text-white cursor-pointer transition-colors"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Card giới thiệu app với logo chuẩn */}
          <div className="flex items-center gap-3 p-3.5 rounded-[18px] bg-[#24160d] border border-amber-500/30">
            <div className="w-12 h-12 rounded-[14px] overflow-hidden shrink-0 border border-amber-400/60 shadow-xs bg-[#120a05] p-0.5">
              <img src="/logo.png?v=25" alt="Qbiz-ebook" className="w-full h-full object-cover rounded-[11px]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[14px] font-black text-amber-200 leading-tight">
                Qbiz-ebook · Tủ Sách Điện Tử
              </span>
              <span className="text-[11.5px] text-amber-100/70 leading-relaxed mt-0.5">
                Cài đặt trực tiếp ra Màn hình chính trên Điện thoại, Máy tính bảng & Máy tính để mở đọc ngay 0ms không cần gõ link.
              </span>
            </div>
          </div>

          {isIOS ? (
            /* Hướng dẫn 2 bước cho iPhone / iPad */
            <div className="flex flex-col gap-3">
              <p className="text-[13.5px] text-amber-100 font-medium leading-relaxed">
                Để cài ứng dụng trên <strong>iPhone / iPad (Safari)</strong>:
              </p>

              <div className="flex items-start gap-3 p-3.5 rounded-[16px] bg-[#24160d] border border-white/5">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs font-black text-[14px]">
                  1
                </div>
                <div className="flex-1 flex flex-col gap-0.5">
                  <span className="text-[14px] font-bold text-amber-200 flex items-center gap-1.5">
                    <span>Bấm nút Chia sẻ</span>
                    <Share2 size={16} className="text-amber-400 inline" />
                  </span>
                  <span className="text-[12px] text-amber-100/70">
                    Biểu tượng ô vuông có mũi tên chỉ lên ở thanh công cụ Safari
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-[16px] bg-[#24160d] border border-white/5">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs font-black text-[14px]">
                  2
                </div>
                <div className="flex-1 flex flex-col gap-0.5">
                  <span className="text-[14px] font-bold text-amber-200 flex items-center gap-1.5">
                    <span>Chọn &ldquo;Thêm vào MH chính&rdquo;</span>
                    <PlusSquare size={16} className="text-amber-400 inline" />
                  </span>
                  <span className="text-[12px] text-amber-100/70">
                    Cuộn xuống danh sách tùy chọn và bấm &ldquo;Thêm vào Màn hình chính&rdquo;
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Android / Windows / Chrome */
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleAndroidInstall}
                className="flex items-center justify-center gap-2 h-[50px] rounded-[18px] bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-[15px] shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
              >
                <Download size={18} strokeWidth={2.5} />
                <span>Cài đặt Qbiz-ebook ngay</span>
              </button>
              <p className="text-[11.5px] text-center text-amber-100/60 leading-relaxed">
                Tương thích hoàn hảo với Android (Chrome, Samsung Internet, Edge), Windows PC và Mac.
              </p>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-5 rounded-[12px] bg-white/10 hover:bg-white/20 text-amber-200 font-bold text-[13.5px] cursor-pointer transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
