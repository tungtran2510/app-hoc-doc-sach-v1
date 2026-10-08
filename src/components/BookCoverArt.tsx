'use client';

import React, { useState } from 'react';
import { BookOpen, Headphones, Sparkles, Feather } from 'lucide-react';
import { removeVietnameseTones } from '../lib/onlineLibraryData';

export type BookCoverStyle =
  | 'white' // Bìa Trắng Tối Giản Hiện Đại (Nhã Nam / NXB Trẻ Style)
  | 'ivory' // Bìa Giấy Ngà Cổ Điển (Tao Đàn / Vintage Classics)
  | 'terracotta' // Bìa Đất Nung Gốm Mộc (Terracotta Earth)
  | 'navy' // Bìa Xanh Navy Hoàng Gia (Royal Navy Hardcover)
  | 'burgundy' // Bìa Đỏ Burgundy Da Mịn (Burgundy Leather)
  | 'audio' // Bìa Sách Nói Studio (Obsidian Purple)
  | 'auto';

interface BookCoverArtProps {
  coverUrl?: string | null;
  title: string;
  author?: string | null;
  format?: string | null;
  medium?: 'read' | 'audio';
  themeStyle?: BookCoverStyle;
  className?: string;
  aspectRatio?: string; // default 'aspect-[1/1.42]'
  badgeText?: string;
  showBadge?: boolean;
}

// Bảng màu điểm nhấn thanh nhã cho Bìa Trắng Hiện Đại (Mỗi sách có 1 điểm nhấn riêng)
const WHITE_COVER_ACCENTS = [
  { bar: 'bg-[#C84B31]', text: 'text-[#C84B31]', border: 'border-[#C84B31]/30', name: 'Terracotta' },
  { bar: 'bg-[#2C5E43]', text: 'text-[#2C5E43]', border: 'border-[#2C5E43]/30', name: 'Emerald' },
  { bar: 'bg-[#1A365D]', text: 'text-[#1A365D]', border: 'border-[#1A365D]/30', name: 'Indigo' },
  { bar: 'bg-[#B8860B]', text: 'text-[#B8860B]', border: 'border-[#B8860B]/30', name: 'Antique Gold' },
  { bar: 'bg-[#8B263E]', text: 'text-[#8B263E]', border: 'border-[#8B263E]/30', name: 'Ruby' },
  { bar: 'bg-[#3D405B]', text: 'text-[#3D405B]', border: 'border-[#3D405B]/30', name: 'Slate' },
];

function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export default function BookCoverArt({
  coverUrl,
  title,
  author,
  format,
  medium,
  themeStyle = 'auto',
  className = '',
  aspectRatio = 'aspect-[1/1.42]',
  badgeText,
  showBadge = false,
}: BookCoverArtProps) {
  const [imgFailed, setImgFailed] = useState<boolean>(false);

  // Tự động reset trạng thái lỗi khi prop coverUrl thay đổi
  React.useEffect(() => {
    setImgFailed(false);
  }, [coverUrl]);

  // Kiểm tra nếu coverUrl là một mã phong cách bìa tự chọn (style:... hoặc theme:...)
  let activeStyle: BookCoverStyle = themeStyle;
  if (coverUrl) {
    if (coverUrl.startsWith('style:') || coverUrl.startsWith('theme:')) {
      const parsed = coverUrl.replace(/^(style:|theme:)/, '') as BookCoverStyle;
      if (['white', 'ivory', 'terracotta', 'navy', 'burgundy', 'audio'].includes(parsed)) {
        activeStyle = parsed;
      }
    }
  }

  const isAudio = medium === 'audio' || format === 'audio';

  // Xác định style nếu đang là 'auto'
  if (activeStyle === 'auto') {
    if (isAudio) {
      activeStyle = 'audio';
    } else {
      // Mặc định cho Ebook: Bìa Trắng Tối Giản Hiện Đại chuẩn xuất bản
      activeStyle = 'white';
    }
  }

  // Kiểm tra tính hợp lệ sơ bộ của coverUrl dạng file ảnh
  const isCustomStyleTag =
    Boolean(coverUrl) && (coverUrl!.startsWith('style:') || coverUrl!.startsWith('theme:'));

  const isInvalidCoverUrl =
    !coverUrl ||
    isCustomStyleTag ||
    coverUrl.includes('/id/-1') ||
    coverUrl.includes('/id/0') ||
    coverUrl === 'null' ||
    coverUrl === 'undefined';

  const hasValidRealCoverImage = !isInvalidCoverUrl && !imgFailed;

  // Lấy màu điểm nhấn cho bìa trắng dựa trên tựa sách
  const hashIdx = hashStringToNumber(title || 'book') % WHITE_COVER_ACCENTS.length;
  const whiteAccent = WHITE_COVER_ACCENTS[hashIdx];

  // Phát hiện sách Việt Nam qua ngôn từ
  const isVietnameseBook =
    /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(
      `${title} ${author}`
    );

  return (
    <div
      className={`relative rounded-md overflow-hidden shrink-0 select-none shadow-sm ${aspectRatio} ${className}`}
    >
      {hasValidRealCoverImage ? (
        <img
          src={coverUrl!}
          alt={title}
          className="w-full h-full object-cover block"
          loading="lazy"
          onLoad={(e) => {
            // Phát hiện các ảnh 1x1 pixel rỗng do Open Library trả về khi không có bìa
            const img = e.currentTarget;
            if (img.naturalWidth <= 1 && img.naturalHeight <= 1) {
              setImgFailed(true);
            }
          }}
          onError={() => setImgFailed(true)}
        />
      ) : activeStyle === 'white' ? (
        /* ================= 1. BÌA TRẮNG TỐI GIẢN HIỆN ĐẠI (NHÃ NAM / NXB TRẺ / PENGUIN MODERN) ================= */
        <div className="w-full h-full bg-[#FAF9F5] border border-[#DDD5C7] p-1.5 flex flex-col justify-between relative overflow-hidden text-center shadow-xs">
          {/* Gáy sách đổ bóng 3D tự nhiên bên trái */}
          <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/15 via-white/50 to-transparent pointer-events-none" />

          {/* Đường viền mỏng tinh tế ôm sát 4 cạnh */}
          <div className="absolute inset-0.5 border border-stone-300/40 rounded-xs pointer-events-none" />

          {/* Đầu trang: Dòng định vị tác phẩm + Tên tác giả */}
          <div className="relative z-10 w-full pt-0.5 flex flex-col items-center">
            <span className="text-[6.5px] font-mono font-bold uppercase tracking-wider text-stone-500 line-clamp-1">
              {/(dinh duong|y khoa|cot song|khop|dia dem|suc khoe|co the|atlas|giai phau|than kinh)/i.test(removeVietnameseTones(`${title} ${author}`))
                ? 'Tủ Sách Y Khoa'
                : isVietnameseBook
                ? 'Văn Học Việt Nam'
                : 'Kinh Điển Thế Giới'}
            </span>
            <div className="w-3 h-px bg-stone-300 my-0.5" />
            <p className="text-[7.5px] font-semibold uppercase tracking-widest text-stone-600 truncate max-w-[95%]">
              {author || 'Tác giả'}
            </p>
          </div>

          {/* Giữa trang: Vạch màu điểm nhấn + Tựa sách in hoa đậm nét trang nhã */}
          <div className="flex-1 flex flex-col items-center justify-center px-0.5 my-0.5 relative z-10">
            <div className={`w-5 h-0.5 ${whiteAccent.bar} rounded-full mb-1 opacity-90`} />
            <h4 className="text-[9.5px] font-black text-stone-900 leading-tight uppercase font-serif line-clamp-3 tracking-tight drop-shadow-xs">
              {title}
            </h4>
            <div className={`w-5 h-0.5 ${whiteAccent.bar} rounded-full mt-1 opacity-90`} />
          </div>

          {/* Đáy trang: Nhãn thể loại & logo NXB thanh tao */}
          <div className="relative z-10 w-full pb-0.5 flex items-center justify-between px-0.5">
            <span className="text-[6.5px] font-mono font-bold text-stone-700 bg-stone-200/80 border border-stone-300/60 px-1 py-0.2 rounded-xs uppercase">
              {isAudio ? 'AUDIO' : (format || 'EBOOK').toUpperCase()}
            </span>
            <span className="text-[6.5px] font-serif italic text-stone-500">
              Qbiz Books
            </span>
          </div>
        </div>
      ) : activeStyle === 'ivory' ? (
        /* ================= 2. BÌA GIẤY BƠ NGÀ CỔ ĐIỂN (TAO ĐÀN / MOLESKINE) ================= */
        <div className="w-full h-full bg-[#F4EEDD] border border-[#C5B396] p-1.5 flex flex-col justify-between relative overflow-hidden text-center shadow-xs">
          <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-amber-950/20 via-white/40 to-transparent pointer-events-none" />
          <div className="absolute inset-1 border-2 border-double border-[#8C6D4F]/40 rounded-xs pointer-events-none" />

          <div className="relative z-10 w-full pt-1">
            <span className="text-[7px] font-serif italic text-[#6E4E37] block truncate">
              {author || 'Kinh điển'}
            </span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-1 my-0.5 relative z-10">
            <div className="w-4 h-px bg-[#8C6D4F]/60 mb-1" />
            <h4 className="text-[9.5px] font-bold text-[#2A160A] leading-tight uppercase font-serif line-clamp-3">
              {title}
            </h4>
            <div className="w-4 h-px bg-[#8C6D4F]/60 mt-1" />
          </div>

          <div className="relative z-10 w-full pb-0.5 flex items-center justify-center">
            <span className="text-[6.5px] font-serif uppercase tracking-widest text-[#8C6D4F] border-t border-[#8C6D4F]/30 pt-0.5 px-2">
              Ấn bản đặc biệt
            </span>
          </div>
        </div>
      ) : activeStyle === 'terracotta' ? (
        /* ================= 3. BÌA ĐẤT NUNG GỐM MỘC (TERRACOTTA ART) ================= */
        <div className="w-full h-full bg-gradient-to-br from-[#9C4123] via-[#7D321A] to-[#4F1D0E] border border-amber-500/30 p-1.5 flex flex-col justify-between relative overflow-hidden text-center shadow-xs">
          <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/40 via-white/10 to-transparent pointer-events-none" />
          <div className="absolute inset-1 border border-amber-200/20 rounded pointer-events-none" />

          <div className="relative z-10 w-full pt-0.5">
            <span className="text-[7px] font-mono tracking-widest text-amber-200/80 uppercase block truncate">
              {author || 'Tri thức'}
            </span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-1 my-0.5 relative z-10">
            <h4 className="text-[9.5px] font-black text-amber-50 leading-tight uppercase font-serif line-clamp-3">
              {title}
            </h4>
          </div>

          <div className="relative z-10 w-full pb-0.5 flex items-center justify-between px-0.5">
            <span className="text-[6.5px] font-mono font-bold bg-black/40 text-amber-200 px-1 py-0.2 rounded-xs">
              {format || 'EPUB'}
            </span>
            <span className="text-[6.5px] text-amber-200/60 font-serif italic">Gốm Mộc</span>
          </div>
        </div>
      ) : activeStyle === 'navy' ? (
        /* ================= 4. BÌA XANH NAVY HOÀNG GIA (ROYAL NAVY HARDCOVER) ================= */
        <div className="w-full h-full bg-gradient-to-br from-[#162B4D] via-[#0E1E36] to-[#070F1B] border border-blue-400/30 p-1.5 flex flex-col justify-between relative overflow-hidden text-center shadow-xs">
          <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/50 via-white/15 to-transparent pointer-events-none" />
          <div className="absolute inset-1 border border-amber-300/30 rounded pointer-events-none" />

          <div className="relative z-10 w-full pt-0.5">
            <span className="text-[7px] font-semibold text-blue-200/80 italic block truncate">
              {author || 'Kinh điển'}
            </span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-1 my-0.5 relative z-10">
            <div className="w-4 h-0.5 bg-amber-400/50 rounded-full mb-1" />
            <h4 className="text-[9.5px] font-black text-amber-100 leading-tight uppercase font-serif line-clamp-3 drop-shadow-xs">
              {title}
            </h4>
            <div className="w-4 h-0.5 bg-amber-400/50 rounded-full mt-1" />
          </div>

          <div className="relative z-10 w-full pb-0.5 flex items-center justify-between px-0.5">
            <span className="text-[6.5px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1 py-0.2 rounded-xs">
              {format || 'EPUB'}
            </span>
            <span className="text-[6.5px] text-amber-200/60 font-serif">Royal Navy</span>
          </div>
        </div>
      ) : activeStyle === 'burgundy' ? (
        /* ================= 5. BÌA ĐỎ BURGUNDY DA MỊN (BURGUNDY LEATHER) ================= */
        <div className="w-full h-full bg-gradient-to-br from-[#4A1525] via-[#2D0C16] to-[#14040A] border border-rose-400/30 p-1.5 flex flex-col justify-between relative overflow-hidden text-center shadow-xs">
          <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/50 via-white/15 to-transparent pointer-events-none" />
          <div className="absolute inset-1 border border-rose-300/30 rounded pointer-events-none" />

          <div className="relative z-10 w-full pt-0.5">
            <span className="text-[7px] font-semibold text-rose-200/80 italic block truncate">
              {author || 'Tác giả'}
            </span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-1 my-0.5 relative z-10">
            <div className="w-4 h-0.5 bg-rose-400/50 rounded-full mb-1" />
            <h4 className="text-[9.5px] font-black text-rose-100 leading-tight uppercase font-serif line-clamp-3">
              {title}
            </h4>
            <div className="w-4 h-0.5 bg-rose-400/50 rounded-full mt-1" />
          </div>

          <div className="relative z-10 w-full pb-0.5 flex items-center justify-between px-0.5">
            <span className="text-[6.5px] font-mono font-bold bg-rose-400/20 text-rose-300 border border-rose-400/30 px-1 py-0.2 rounded-xs">
              {format || 'EPUB'}
            </span>
            <span className="text-[6.5px] text-rose-200/60 font-serif">Burgundy</span>
          </div>
        </div>
      ) : (
        /* ================= 6. BÌA SÁCH NÓI STUDIO (OBSIDIAN PURPLE & GOLD HEADPHONES) ================= */
        <div className="w-full h-full bg-gradient-to-br from-[#2B1145] via-[#1A0B2B] to-[#0D0417] border border-purple-500/40 p-1.5 flex flex-col justify-between relative overflow-hidden text-center shadow-xs">
          <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/60 via-white/15 to-transparent pointer-events-none" />
          <div className="absolute inset-1 border border-purple-400/25 rounded pointer-events-none" />

          <div className="relative z-10 w-full pt-0.5 flex items-center justify-between px-0.5">
            <span className="px-1 py-0.2 rounded text-[6.5px] font-black uppercase font-mono tracking-tighter bg-purple-500/30 text-purple-200 border border-purple-400/30">
              AUDIO 🎧
            </span>
            <div className="opacity-80 text-amber-300">
              <Headphones size={10} />
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-1 my-0.5 relative z-10">
            <div className="w-4 h-0.5 bg-amber-400/60 rounded-full mb-1" />
            <h4 className="text-[9.5px] font-black text-amber-100 leading-tight uppercase font-serif line-clamp-3">
              {title}
            </h4>
            <div className="w-4 h-0.5 bg-amber-400/60 rounded-full mt-1" />
          </div>

          <div className="relative z-10 w-full pb-0.5">
            <p className="text-[7px] font-semibold text-purple-200/80 truncate italic">
              {author || 'Sách nói'}
            </p>
          </div>
        </div>
      )}

      {/* Huy hiệu nhỏ góc dưới nếu có yêu cầu */}
      {showBadge && badgeText && (
        <span className="absolute top-1 left-1 px-1 py-0.2 rounded bg-black/75 backdrop-blur-xs text-white text-[8px] font-mono font-bold z-10">
          {badgeText}
        </span>
      )}
    </div>
  );
}
