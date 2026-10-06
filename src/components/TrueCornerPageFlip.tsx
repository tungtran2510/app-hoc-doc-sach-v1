'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Sparkles } from 'lucide-react';

export interface TrueCornerPageFlipProps {
  images: string[];
  initialPage?: number;
  width?: number;
  height?: number;
  onPageChange?: (page: number) => void;
  className?: string;
}

export default function TrueCornerPageFlip({
  images,
  initialPage = 0,
  width = 420,
  height = 600,
  onPageChange,
  className = '',
}: TrueCornerPageFlipProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bookElRef = useRef<HTMLDivElement>(null);
  const pageFlipRef = useRef<any>(null);

  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [totalPages, setTotalPages] = useState<number>(images.length);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [flipState, setFlipState] = useState<string>('read');

  // Khởi tạo StPageFlip từ package 'page-flip'
  useEffect(() => {
    let isMounted = true;

    async function initPageFlip() {
      if (typeof window === 'undefined' || !bookElRef.current) return;

      try {
        const { PageFlip } = await import('page-flip');

        if (!isMounted || !bookElRef.current) return;

        // Xóa instance cũ nếu có
        if (pageFlipRef.current) {
          try {
            pageFlipRef.current.destroy();
          } catch (e) {
            // ignore
          }
          pageFlipRef.current = null;
        }

        // Tính kích thước phù hợp theo container
        const containerW = containerRef.current?.clientWidth || window.innerWidth;
        const isMobile = containerW < 768;
        
        const baseW = isMobile ? Math.min(containerW - 32, 400) : width;
        const baseH = isMobile ? Math.round(baseW * 1.414) : height;

        const pf = new PageFlip(bookElRef.current, {
          width: baseW,
          height: baseH,
          size: 'stretch',
          minWidth: 280,
          maxWidth: 600,
          minHeight: 380,
          maxHeight: 850,
          drawShadow: true,
          flippingTime: 700,
          usePortrait: true,
          startPage: initialPage,
          showCover: true,
          mobileScrollSupport: false,
          swipeDistance: 25,
          useMouseEvents: true,
          showPageCorners: true,
          disableFlipByClick: false,
          maxShadowOpacity: 0.85,
        });

        pf.loadFromImages(images);

        pf.on('init', (e: any) => {
          if (!isMounted) return;
          setIsReady(true);
          setTotalPages(pf.getPageCount());
          setCurrentPage(pf.getCurrentPageIndex());
          setOrientation(pf.getOrientation());
        });

        pf.on('flip', (e: any) => {
          if (!isMounted) return;
          const pageIdx = typeof e.data === 'number' ? e.data : pf.getCurrentPageIndex();
          setCurrentPage(pageIdx);
          onPageChange?.(pageIdx);
        });

        pf.on('changeState', (e: any) => {
          if (!isMounted) return;
          setFlipState(typeof e.data === 'string' ? e.data : 'read');
        });

        pf.on('changeOrientation', (e: any) => {
          if (!isMounted) return;
          setOrientation(e.data || pf.getOrientation());
        });

        pageFlipRef.current = pf;
      } catch (err) {
        console.error('Lỗi khởi tạo PageFlip:', err);
      }
    }

    initPageFlip();

    return () => {
      isMounted = false;
      if (pageFlipRef.current) {
        try {
          pageFlipRef.current.destroy();
        } catch (e) {
          // ignore
        }
        pageFlipRef.current = null;
      }
    };
  }, [images, width, height]);

  const handleFlipNext = useCallback(() => {
    if (pageFlipRef.current) {
      pageFlipRef.current.flipNext('bottom');
    }
  }, []);

  const handleFlipPrev = useCallback(() => {
    if (pageFlipRef.current) {
      pageFlipRef.current.flipPrev('bottom');
    }
  }, []);

  const handleReset = useCallback(() => {
    if (pageFlipRef.current) {
      pageFlipRef.current.turnToPage(0);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center justify-center select-none ${className}`}
    >
      {/* Vùng sách lật 3D */}
      <div className="relative w-full max-w-2xl flex items-center justify-center py-4">
        {/* Container cho StPageFlip */}
        <div
          ref={bookElRef}
          className="shadow-2xl rounded-sm transition-opacity duration-300"
          style={{ opacity: isReady ? 1 : 0 }}
        />

        {/* Loading placeholder khi chưa load xong ảnh */}
        {!isReady && (
          <div className="w-[340px] h-[480px] bg-slate-800/60 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center text-slate-300 gap-3 animate-pulse">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium tracking-wide">Đang nạp hiệu ứng lật trang 3D...</p>
          </div>
        )}
      </div>

      {/* Cụm điều khiển tối giản & trực quan */}
      <div className="w-full max-w-md mt-4 px-4 flex flex-col items-center gap-3">
        {/* Thông tin trang & trạng thái uốn góc */}
        <div className="flex items-center justify-between w-full text-xs text-slate-300 bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-full border border-slate-700/60 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-100">
              Trang {currentPage + 1} / {totalPages}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px]">
              {flipState === 'user_fold'
                ? 'Đang cầm góc gấp...'
                : flipState === 'fold_corner'
                ? 'Góc sách cuộn nhẹ'
                : flipState === 'flipping'
                ? 'Đang lật sang...'
                : 'Sẵn sàng lật góc'}
            </span>
          </div>
        </div>

        {/* Nút bấm lật trước / lật sau & reset */}
        <div className="flex items-center justify-center gap-3 w-full">
          <button
            type="button"
            onClick={handleFlipPrev}
            disabled={currentPage <= 0}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl font-medium text-xs transition-all shadow-md active:scale-95 ${
              currentPage <= 0
                ? 'bg-slate-800/40 text-slate-500 cursor-not-allowed border border-slate-800'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600/60 hover:border-slate-500'
            }`}
          >
            <ChevronLeft className="w-4 h-4 text-amber-400" />
            <span>Lật lùi (Trang trước)</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            title="Về trang bìa"
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-600/60 transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleFlipNext}
            disabled={currentPage >= totalPages - 1}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl font-medium text-xs transition-all shadow-md active:scale-95 ${
              currentPage >= totalPages - 1
                ? 'bg-slate-800/40 text-slate-500 cursor-not-allowed border border-slate-800'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold border border-amber-400/80 shadow-amber-500/20'
            }`}
          >
            <span>Lật tiếp (Trang sau)</span>
            <ChevronRight className="w-4 h-4 text-slate-950" />
          </button>
        </div>

        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
          💡 <strong className="text-slate-200">Mẹo thử nghiệm:</strong> Dùng ngón tay (hoặc chuột) bấm vào góc trên/dưới bên phải kéo chéo sang trái để cảm nhận góc uốn cong 3D. Nhả tay giữa chừng để thấy sách tự động đàn hồi trở lại!
        </p>
      </div>
    </div>
  );
}
