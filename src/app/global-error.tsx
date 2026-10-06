'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global Error Caught]:', error);
  }, [error]);

  return (
    <html lang="vi">
      <body className="bg-[#160e08] text-[#fdf7ee] min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-2xl bg-[#22150c] border border-[#3d2617] text-center flex flex-col items-center gap-4 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <AlertCircle size={28} />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-black text-amber-200">
              Hệ Thống Đang Làm Mới
            </h2>
            <p className="text-xs text-[#9e8574] leading-relaxed">
              Ứng dụng vừa nhận bản cập nhật mới nhất hoặc có kết nối mạng gián đoạn. Bấm thử lại để tiếp tục đọc sách.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full mt-2">
            <button
              type="button"
              onClick={() => {
                try {
                  caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
                } catch {}
                reset();
              }}
              className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Thử lại ngay</span>
            </button>
            <a
              href="/"
              className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-white/10 cursor-pointer"
            >
              <Home size={14} />
              <span>Về kệ sách</span>
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
