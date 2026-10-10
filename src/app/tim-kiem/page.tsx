'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search as SearchIcon,
  X,
  ArrowLeft,
  BookOpen,
  Sparkles,
  Info,
  ChevronRight,
  Clock,
  Trash2,
  Mic,
  MicOff,
  Bot,
  FileText,
  Compass,
  Globe,
  BookmarkPlus,
  Check,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import SideBooksReaderModal from '../../components/SideBooksReaderModal';
import BookDetailModal, { UnifiedBookItem } from '../../components/BookDetailModal';
import OnlineLibrarySection from '../../components/OnlineLibrarySection';
import FloatingAiButton from '../../components/FloatingAiButton';
import { playTapSound, playSuccessChime } from '../../lib/audioFeedback';
import { matchSmartKeywords, CURATED_ONLINE_BOOKS, unifyBookMediaItems, ONLINE_CATEGORIES } from '../../lib/onlineLibraryData';
import { offlineStorage } from '../../lib/offlineStorage';
import { userShelfStorage } from '../../lib/userShelfStorage';
import BookCoverArt from '../../components/BookCoverArt';

export const dynamic = 'force-dynamic';

function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/** Component tự động Highlight phần từ khóa khớp không phân biệt dấu tiếng Việt */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim() || !text) return <>{text}</>;

  const cleanQ = removeVietnameseTones(query);
  const cleanT = removeVietnameseTones(text);

  const idx = cleanT.indexOf(cleanQ);
  if (idx === -1) return <>{text}</>;

  const before = text.slice(0, idx);
  const matched = text.slice(idx, idx + cleanQ.length);
  const after = text.slice(idx + cleanQ.length);

  return (
    <>
      {before}
      <mark className="bg-amber-400/40 text-amber-950 dark:text-amber-200 font-extrabold px-1 py-0.5 rounded-sm">
        {matched}
      </mark>
      <HighlightText text={after} query={query} />
    </>
  );
}

interface SearchBookItem {
  id: string;
  title: string;
  author: string;
  description: string;
  cover_url: string;
  badge_tag: string;
  pages_count: number;
  pages: string[];
  gallery_images?: string[];
  flipbook_pages?: string[];
  file_url?: string | null;
  pdf_url?: string | null;
  file_name?: string | null;
}

interface BookSnippetItem {
  id: string;
  bookId: string;
  bookTitle: string;
  coverUrl: string;
  chapter: string;
  pageNumber: number;
  pageIndex: number;
  snippet: string;
}

const POPULAR_SEARCHES = [
  'Đĩa đệm',
  'Cột sống',
  'Thoát vị',
  'Kháng viêm',
  'Atlas giải phẫu',
  'Đốt sống cổ',
  'Tự chữa lành',
  'Lợi khuẩn',
  'Dinh dưỡng',
];

/** Kho dữ liệu trích đoạn trang sách phục vụ Deep In-Book Search */
const BOOK_PAGE_SNIPPETS: BookSnippetItem[] = [
  {
    id: 'snip-1',
    bookId: 'book-hieu-dung-cot-song',
    bookTitle: 'Hiểu Đúng Về Cột Sống',
    coverUrl: '/documents/covers/cover_hieu_dung_ve_cot_song.png',
    chapter: 'Chương 1: Cơ Chế Sinh Học & Giảm Xóc Đĩa Đệm',
    pageNumber: 2,
    pageIndex: 1,
    snippet:
      'Cột sống gồm 33-34 đốt sống tạo thành 4 đường cong sinh lý. Đĩa đệm đóng vai trò như bộ phận giảm xóc sinh học với nhân nhầy ngậm nước và các vòng sợi collagen bao quanh.',
  },
  {
    id: 'snip-2',
    bookId: 'book-hieu-dung-cot-song',
    bookTitle: 'Hiểu Đúng Về Cột Sống',
    coverUrl: '/documents/covers/cover_hieu_dung_ve_cot_song.png',
    chapter: 'Chương 2: Thoát Vị & Chèn Ép Rễ Thần Kinh',
    pageNumber: 3,
    pageIndex: 2,
    snippet:
      'Khi đĩa đệm bị thoát vị hoặc thoái hóa xẹp lún, nhân nhầy tràn ra chèn ép vào rễ thần kinh tọa L4-L5, S1 gây ra các cơn đau nhói buốt lan dọc xuống đùi và bắp chân.',
  },
  {
    id: 'snip-3',
    bookId: 'book-hieu-dung-cot-song',
    bookTitle: 'Hiểu Đúng Về Cột Sống',
    coverUrl: '/documents/covers/cover_hieu_dung_ve_cot_song.png',
    chapter: 'Phụ Lục: Bảng Tra Cứu Rễ Thần Kinh Cột Sống',
    pageNumber: 4,
    pageIndex: 3,
    snippet:
      'Bảng định vị phân bổ rễ thần kinh tủy sống: Nhánh C5-C7 chi phối cánh tay bàn tay; Nhánh L3-L5 chi phối khớp gối, cơ đùi, cẳng chân và mu bàn chân.',
  },
  {
    id: 'snip-4',
    bookId: 'book-cam-nang-co',
    bookTitle: 'Cẩm Nang Đốt Sống Cổ & Vai Gáy',
    coverUrl: '/documents/covers/cover_cam_nang_dot_song_co.png',
    chapter: 'Chương 1: Hội Chứng Cổ Vai Gáy Dân Văn Phòng',
    pageNumber: 2,
    pageIndex: 1,
    snippet:
      'Tải trọng đè nén lên các đốt sống cổ C1-C7 tăng gấp 3 đến 5 lần khi gập đầu cúi bấm điện thoại hoặc làm việc với máy tính trong thời gian dài mà không nghỉ giải lao.',
  },
  {
    id: 'snip-5',
    bookId: 'book-cam-nang-co',
    bookTitle: 'Cẩm Nang Đốt Sống Cổ & Vai Gáy',
    coverUrl: '/documents/covers/cover_cam_nang_dot_song_co.png',
    chapter: 'Chương 2: Bài Tập Vận Động Giải Nén Cột Sống Cổ',
    pageNumber: 3,
    pageIndex: 2,
    snippet:
      'Các động tác kéo giãn cơ ức đòn chũm, nhóm cơ thang và vươn cằm giải nén rễ thần kinh giúp giảm nhanh cơn co thắt, đau nửa đầu và tê bì các đầu ngón tay.',
  },
  {
    id: 'snip-6',
    bookId: 'book-dinh-duong-phuc-hoi',
    bookTitle: 'Dinh Dưỡng Nền Tảng & Phục Hồi Khớp',
    coverUrl: '/documents/covers/cover_dinh_duong_khang_viem.png',
    chapter: 'Chương 1: Cơ Chế Kháng Viêm Sinh Học Tế Bào',
    pageNumber: 2,
    pageIndex: 1,
    snippet:
      'Axit béo Omega-3 tỷ lệ EPA/DHA cao kết hợp Curcumin sinh khả dụng cao và Polyphenol thực vật giúp ức chế enzyme gây viêm, dập tắt ổ viêm âm thầm tại sụn khớp an toàn.',
  },
  {
    id: 'snip-7',
    bookId: 'book-dinh-duong-phuc-hoi',
    bookTitle: 'Dinh Dưỡng Nền Tảng & Phục Hồi Khớp',
    coverUrl: '/documents/covers/cover_dinh_duong_khang_viem.png',
    chapter: 'Chương 2: Tái Lập Mật Độ Xương & Đàn Hồi Sụn Khớp',
    pageNumber: 3,
    pageIndex: 2,
    snippet:
      'Collagen Type II thủy phân, Canxi sinh học từ tảo biển, Magie cùng Vitamin D3 và K2 giúp dẫn truyền khoáng chất trực tiếp vào khung xương và đĩa đệm mà không lắng đọng mạch máu.',
  },
  {
    id: 'snip-8',
    bookId: 'book-atlas-cot-song',
    bookTitle: 'Atlas Giải Phẫu Cột Sống & Khớp 3D',
    coverUrl: '/documents/covers/cover_atlas_y_khoa_toan_dien.png',
    chapter: 'Chương 1: Cấu Trúc Khớp Đốt Sống Đa Tầng 3D',
    pageNumber: 2,
    pageIndex: 1,
    snippet:
      'Mô phỏng giải phẫu 3D đa tầng hệ cơ dựng sống, dây chằng vàng, dây chằng dọc trước và khoang ngoài màng cứng bảo vệ tủy sống và điều hòa vận động linh hoạt.',
  },
  {
    id: 'snip-9',
    bookId: 'book-suc-khoe-tieu-hoa',
    bookTitle: 'Sức Khỏe Hệ Tiêu Hóa Toàn Diện',
    coverUrl: '/documents/covers/cover_tieu-hoa.png',
    chapter: 'Chương 1: Trục Vi Sinh Não - Ruột - Khớp',
    pageNumber: 2,
    pageIndex: 1,
    snippet:
      '70% tế bào miễn dịch nằm tại niêm mạc đường ruột. Lợi khuẩn Probiotics sản sinh axit béo chuỗi ngắn SCFA giúp điều hòa hệ thống miễn dịch tự nhiên và giảm viêm khớp.',
  },
  {
    id: 'snip-10',
    bookId: 'book-nuoc-va-khoang-chat',
    bookTitle: 'Nước & Khoáng Chất Cho Cơ Thể',
    coverUrl: '/documents/covers/cover_nuoc.png',
    chapter: 'Chương 1: Cấp Nước Tế Bào & Bơm Dịch Nhân Nhầy',
    pageNumber: 2,
    pageIndex: 1,
    snippet:
      'Nhân nhầy đĩa đệm chứa đến 80% là nước. Uống nước ion kiềm giàu hydrogen giúp thẩm thấu sâu vào tế bào, hỗ trợ quá trình bơm hút dịch dinh dưỡng tự nhiên của đĩa đệm khi ngủ.',
  },
  {
    id: 'snip-11',
    bookId: 'book-tu-chua-lanh-lung-co',
    bookTitle: 'Tự Chữa Lành Lưng & Cổ',
    coverUrl: '/documents/covers/cover_tu_chua_lanh_lung_co.png',
    chapter: 'Chương 1: Phục Hồi Đường Cong Sinh Lý Tự Nhiên',
    pageNumber: 2,
    pageIndex: 1,
    snippet:
      'Phương pháp giải nén cột sống tại nhà bằng các tư thế kê gối hỗ trợ điều chỉnh đường cong sinh lý tự nhiên, kết hợp nhịp thở cơ hoành giúp khối cơ dựng sống được thư giãn sâu.',
  },
  {
    id: 'snip-12',
    bookId: 'book-loi-khuan-duong-ruot',
    bookTitle: 'Lợi Khuẩn & Hệ Vi Sinh Đường Ruột',
    coverUrl: '/documents/covers/cover_gan-mat-tuy.png',
    chapter: 'Chương 1: Bảo Vệ Hàng Rào Niêm Mạc Ruột',
    pageNumber: 2,
    pageIndex: 1,
    snippet:
      'Hội chứng rò rỉ ruột do mất cân bằng hệ vi sinh đường ruột cho phép độc tố thẩm thấu vào máu, là nguồn cơn kích hoạt các phản ứng viêm mạn tính và đau mỏi cơ xương khớp.',
  },
];

export default function SearchPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [books, setBooks] = useState<SearchBookItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Lịch sử tìm kiếm gần đây
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Tìm kiếm bằng giọng nói tiếng Việt (SpeechRecognition)
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const recognitionRef = useRef<any>(null);

  // Modal đọc sách 3D và chi tiết sách
  const [readerBook, setReaderBook] = useState<SearchBookItem | null>(null);
  const [readerInitialPage, setReaderInitialPage] = useState<number>(0);
  const [detailBook, setDetailBook] = useState<UnifiedBookItem | null>(null);

  // Tab chuyển đổi: Tủ sách hiện có ('local') hoặc Kho sách trực tuyến ('online')
  const [activeTab, setActiveTab] = useState<'local' | 'online'>('local');

  // Lọc theo chuyên mục sách ('all' hoặc id chuyên mục)
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  // Trạng thái các cuốn sách đã thêm vào Kệ sách
  const [shelfBookIds, setShelfBookIds] = useState<Set<string>>(new Set());
  const [shelfToast, setShelfToast] = useState<string | null>(null);

  useEffect(() => {
    const updateShelfIds = () => {
      const all = userShelfStorage.getAll();
      setShelfBookIds(new Set(all.map((b) => b.id)));
    };
    updateShelfIds();

    window.addEventListener('qbiz_book_added_to_shelf', updateShelfIds);
    window.addEventListener('qbiz_book_removed_from_shelf', updateShelfIds);
    return () => {
      window.removeEventListener('qbiz_book_added_to_shelf', updateShelfIds);
      window.removeEventListener('qbiz_book_removed_from_shelf', updateShelfIds);
    };
  }, []);

  const handleToggleShelf = (book: SearchBookItem) => {
    playTapSound();
    if (shelfBookIds.has(book.id)) {
      userShelfStorage.remove(book.id);
      setShelfBookIds((prev) => {
        const next = new Set(prev);
        next.delete(book.id);
        return next;
      });
      setShelfToast(`Đã bỏ "${book.title}" khỏi Kệ sách`);
    } else {
      userShelfStorage.add({
        id: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.cover_url,
        fileUrl: book.file_url || book.pdf_url || '',
        format: book.file_url?.endsWith('.pdf') ? 'pdf' : 'epub',
        badgeTag: book.badge_tag,
        description: book.description,
      });
      playSuccessChime();
      setShelfBookIds((prev) => new Set(prev).add(book.id));
      setShelfToast(`✓ Đã thêm "${book.title}" vào Kệ sách!`);
    }
    setTimeout(() => setShelfToast(null), 2500);
  };

  // Lắng nghe sự kiện mở sách từ Trợ lý AI bám đuổi (FloatingAiButton)
  useEffect(() => {
    const handleOpenFromAi = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      playTapSound();
      const cleanT = removeVietnameseTones(detail.title || '');
      const localBook =
        books.find((b) => b.id === detail.id) ||
        books.find((b) => removeVietnameseTones(b.title).includes(cleanT));
      const onlineBook =
        CURATED_ONLINE_BOOKS.find((b) => b.id === detail.id) ||
        CURATED_ONLINE_BOOKS.find((b) => removeVietnameseTones(b.title).includes(cleanT));

      const fileUrl =
        localBook?.file_url ||
        localBook?.pdf_url ||
        onlineBook?.downloadUrl ||
        '/documents/cam_nang_tu_the_vang_bai_tap_lung.pdf';
      const coverUrl =
        detail.cover_url ||
        localBook?.cover_url ||
        onlineBook?.coverUrl ||
        '/documents/covers/cover_hieu_dung_ve_cot_song.png';

      const target: SearchBookItem = {
        id: localBook?.id || onlineBook?.id || detail.id,
        title: localBook?.title || onlineBook?.title || detail.title,
        author: localBook?.author || onlineBook?.author || detail.author || 'Tùng Dinh Dưỡng',
        description: localBook?.description || onlineBook?.description || detail.reason || '',
        cover_url: coverUrl,
        badge_tag: localBook?.badge_tag || onlineBook?.badgeTag || detail.badge_tag || 'AI ĐỀ XUẤT',
        pages_count: localBook?.pages_count || 10,
        pages: localBook?.pages || [],
        file_url: fileUrl,
        pdf_url: fileUrl,
        file_name: localBook?.file_name || onlineBook?.title || detail.title,
      };

      const initialP =
        detail.target_index ??
        (detail.target_page ? detail.target_page - 1 : 0);
      setReaderInitialPage(Math.max(0, initialP));
      setReaderBook(target);
    };

    window.addEventListener('open_book_from_ai', handleOpenFromAi);
    return () => window.removeEventListener('open_book_from_ai', handleOpenFromAi);
  }, [books]);

  useEffect(() => {
    // Không tự động focus ô tìm kiếm khi vừa vào để tránh nhảy bàn phím ảo (theo yêu cầu người dùng)
    document.title = 'Tìm kiếm sách · Qbiz Books';

    // Nạp lịch sử tìm kiếm gần đây từ localStorage
    try {
      const saved = localStorage.getItem('qbiz_recent_searches');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.slice(0, 8));
        }
      }
    } catch {}
  }, []);

  // Tải danh mục sách từ API và hợp nhất sách ngoại tuyến đã tải về
  useEffect(() => {
    async function loadAllLocalBooks() {
      try {
        const res = await fetch('/api/search');
        const data = await res.json();
        let list: SearchBookItem[] = Array.isArray(data?.books) ? [...data.books] : [];

        // Hợp nhất với các đầu sách đã tải về từ IndexedDB (tránh trùng lặp ID và tựa đề)
        try {
          const cached = await offlineStorage.getAllCachedBooks();
          const existingIds = new Set(list.map((b) => b.id));
          const existingKeys = new Set(
            list.map((b) => `${removeVietnameseTones(b.title)}__${removeVietnameseTones(b.author || '')}`)
          );

          for (const c of cached) {
            const key = `${removeVietnameseTones(c.title)}__${removeVietnameseTones(c.author || '')}`;
            if (!existingIds.has(c.id) && !existingKeys.has(key)) {
              const storedCustomCover =
                typeof window !== 'undefined'
                  ? localStorage.getItem(`custom_cover_${c.id}`)
                  : null;
              const bookCover = storedCustomCover || c.customCoverUrl || c.coverUrl || '';

              list.unshift({
                id: c.id,
                title: c.title,
                author: c.author || 'Tác giả',
                description: 'Sách ngoại tuyến đã tải về máy • Mở đọc ngay',
                cover_url: bookCover,
                badge_tag: c.format ? c.format.toUpperCase() : 'ĐÃ TẢI',
                pages_count: c.totalPages || 10,
                pages: [],
                file_url: c.fileUrl,
                pdf_url: c.fileUrl,
                file_name: c.fileName || c.title,
              });
              existingIds.add(c.id);
              existingKeys.add(key);
            }
          }
        } catch {}

        // Khử trùng lặp cuối cùng đảm bảo không bao giờ xuất hiện 2 thẻ sách cùng tên
        const seenKeys = new Set<string>();
        list = list.filter((b) => {
          const key = `${removeVietnameseTones(b.title)}__${removeVietnameseTones(b.author || '')}`;
          if (seenKeys.has(key)) return false;
          seenKeys.add(key);
          return true;
        });

        setBooks(list);
      } catch {}
      setLoading(false);
    }

    loadAllLocalBooks();

    const handleDownloadEvent = () => loadAllLocalBooks();
    window.addEventListener('qbiz_book_downloaded', handleDownloadEvent);
    return () => window.removeEventListener('qbiz_book_downloaded', handleDownloadEvent);
  }, []);

  // Debounce tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Lưu từ khóa vào lịch sử tìm kiếm gần đây
  const saveToRecentSearches = (term: string) => {
    const cleaned = term.trim();
    if (!cleaned || cleaned.length < 2) return;

    setRecentSearches((prev) => {
      const next = [cleaned, ...prev.filter((t) => t.toLowerCase() !== cleaned.toLowerCase())].slice(0, 8);
      try {
        localStorage.setItem('qbiz_recent_searches', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Xóa 1 từ khóa khỏi lịch sử
  const handleRemoveRecentItem = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    playTapSound();
    setRecentSearches((prev) => {
      const next = prev.filter((t) => t !== term);
      try {
        localStorage.setItem('qbiz_recent_searches', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Xóa toàn bộ lịch sử
  const handleClearAllRecent = () => {
    playTapSound();
    setRecentSearches([]);
    try {
      localStorage.removeItem('qbiz_recent_searches');
    } catch {}
  };

  // Xử lý Voice Search bằng giọng nói tiếng Việt
  const toggleVoiceSearch = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError('Trình duyệt chưa hỗ trợ nhận diện giọng nói. Hãy dùng Chrome hoặc Safari.');
      setTimeout(() => setSpeechError(''), 4500);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    try {
      playTapSound();
      setSpeechError('');
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          const cleanText = transcript.trim();
          setQuery(cleanText);
          saveToRecentSearches(cleanText);
        }
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setSpeechError('Vui lòng cấp quyền truy cập Micro trên trình duyệt.');
        } else if (event.error !== 'no-speech') {
          setSpeechError('Không nhận diện được giọng nói. Vui lòng thử lại.');
        }
        setIsListening(false);
        setTimeout(() => setSpeechError(''), 4000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setSpeechError('Không thể kích hoạt micro.');
      setTimeout(() => setSpeechError(''), 3000);
    }
  };

  // 1. Lọc kết quả tìm kiếm theo Sách: ƯU TIÊN TUYỆT ĐỐI THEO TIÊU ĐỀ
  const scoredBooks = books.map((b) => {
    if (!debouncedQuery.trim()) return { book: b, matched: true, score: 1 };
    const normQ = removeVietnameseTones(debouncedQuery).toLowerCase().trim();
    const qTokens = normQ.split(/\s+/).filter(Boolean);
    const normTitle = removeVietnameseTones(b.title).toLowerCase();
    const normAuthor = removeVietnameseTones(b.author || '').toLowerCase();

    // 1.1 Khớp chính xác cả cụm từ trong tiêu đề
    if (normTitle.includes(normQ)) {
      return { book: b, matched: true, score: 300 };
    }
    // 1.2 Khớp tất cả các từ trong tiêu đề
    if (qTokens.length > 1 && qTokens.every((t) => normTitle.includes(t))) {
      return { book: b, matched: true, score: 250 };
    }
    // 1.3 Khớp tên tác giả
    if (normAuthor.includes(normQ) || (qTokens.length > 1 && qTokens.every((t) => normAuthor.includes(t)))) {
      return { book: b, matched: true, score: 180 };
    }
    // 1.4 Khớp ít nhất 1 từ trong tiêu đề nếu cụm từ dài
    if (qTokens.length > 1 && qTokens.some((t) => normTitle.includes(t))) {
      return { book: b, matched: true, score: 100 };
    }

    return { book: b, matched: false, score: 0 };
  });

  const matchedBooks = scoredBooks
    .filter((s) => s.matched)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.book);

  // 1.5. Đếm số lượng sách trực tuyến khớp từ khóa THEO ĐÚNG TIÊU ĐỀ
  const unifiedCuratedOnlineBooks = useMemo(() => unifyBookMediaItems(CURATED_ONLINE_BOOKS), []);

  const onlineMatchedCount = useMemo(() => {
    if (!debouncedQuery.trim()) return unifiedCuratedOnlineBooks.length;
    const normQ = removeVietnameseTones(debouncedQuery).toLowerCase().trim();
    const qTokens = normQ.split(/\s+/).filter(Boolean);

    return unifiedCuratedOnlineBooks.filter((b) => {
      const normTitle = removeVietnameseTones(b.title).toLowerCase();
      const normAuthor = removeVietnameseTones(b.author).toLowerCase();
      return (
        normTitle.includes(normQ) ||
        (qTokens.length > 1 && qTokens.every((t) => normTitle.includes(t))) ||
        normAuthor.includes(normQ)
      );
    }).length;
  }, [debouncedQuery, unifiedCuratedOnlineBooks]);

  // 2. Tìm kiếm sâu trong các trang sách (Deep In-Book Snippet Search)
  const scoredSnippets = BOOK_PAGE_SNIPPETS.map((snip) => {
    if (!debouncedQuery.trim()) return { snip, matched: false, score: 0 };
    const fullText = `${snip.snippet} ${snip.chapter} ${snip.bookTitle}`;
    const res = matchSmartKeywords(fullText, debouncedQuery);
    return { snip, matched: res.matched, score: res.score };
  });

  const matchedSnippets = scoredSnippets
    .filter((s) => s.matched)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.snip);

  const isSearching = debouncedQuery.length > 0;

  // Mở sách tại trang cụ thể
  const handleOpenSnippetPage = (snippet: BookSnippetItem) => {
    playTapSound();
    saveToRecentSearches(debouncedQuery);

    // Tìm cuốn sách tương ứng trong danh sách books
    const targetBook =
      books.find((b) => b.id === snippet.bookId) ||
      books.find((b) => removeVietnameseTones(b.title).includes(removeVietnameseTones(snippet.bookTitle))) ||
      books[0];

    if (targetBook) {
      setReaderInitialPage(snippet.pageIndex);
      setReaderBook(targetBook);
    }
  };

  // Mở sách từ đầu
  const handleOpenBook = (book: SearchBookItem) => {
    playTapSound();
    saveToRecentSearches(debouncedQuery || book.title);
    setReaderInitialPage(0);
    setReaderBook(book);
  };

  // Mở sách tải từ Kho Trực Tuyến
  const handleOpenOnlineBook = (book: {
    id: string;
    title: string;
    author: string;
    fileUrl: string;
    coverUrl?: string;
    pages?: string[];
  }) => {
    playTapSound();
    if (!book.fileUrl || !book.fileUrl.trim() || book.fileUrl === 'undefined') {
      alert(`Tác phẩm "${book.title}" là bản ghi danh mục tra cứu, hiện chưa có tệp đọc số hóa toàn văn.`);
      return;
    }
    saveToRecentSearches(book.title);
    setReaderInitialPage(0);
    setReaderBook({
      id: book.id,
      title: book.title,
      author: book.author,
      description: '',
      cover_url: book.coverUrl || '',
      badge_tag: 'SÁCH MỞ',
      pages_count: 10,
      pages: book.pages || [],
      file_url: book.fileUrl,
      pdf_url: book.fileUrl,
      file_name: (book as any).fileName || (book.fileUrl ? book.fileUrl.split('/').pop()?.split('?')[0] : book.title),
    });
  };

  return (
    <main className="flex-1 flex flex-col px-3 sm:px-4 pt-2.5 pb-32 gap-3.5 max-w-[640px] w-full mx-auto select-none">
      {/* 1. THANH TÌM KIẾM ĐẦU TRANG & MICRO VOICE SEARCH */}
      <section className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                router.push('/');
              }
            }}
            className="w-10 h-10 rounded-full bg-[#e8ded1] dark:bg-white/10 hover:bg-[#ded1c0] dark:hover:bg-white/20 border border-[#d5c3b1] dark:border-white/10 flex items-center justify-center text-[#2A160A] dark:text-amber-200 hover:text-amber-600 dark:hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Quay lại"
          >
            <ArrowLeft size={18} />
          </button>

          {/* NÚT BỘ LỌC CHUYÊN MỤC CẠNH MŨI TÊN QUAY VỀ (YÊU CẦU NGƯỜI DÙNG) */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                playTapSound();
                setIsFilterOpen((prev) => !prev);
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer border shrink-0 ${
                selectedCategory !== 'all'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md ring-2 ring-amber-400/50'
                  : 'bg-[#e8ded1] dark:bg-white/10 hover:bg-[#ded1c0] dark:hover:bg-white/20 border-[#d5c3b1] dark:border-white/10 text-[#2A160A] dark:text-amber-200'
              }`}
              aria-label="Bộ lọc chuyên mục"
              title={selectedCategory === 'all' ? 'Lọc theo chuyên mục sách' : `Đang lọc: ${ONLINE_CATEGORIES.find(c => c.id === selectedCategory)?.name || selectedCategory}`}
            >
              <SlidersHorizontal size={18} />
              {selectedCategory !== 'all' && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white dark:border-[#2A160A]" />
              )}
            </button>

            {/* POPOVER BỘ LỌC CHUYÊN MỤC */}
            {isFilterOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsFilterOpen(false)}
                />
                <div
                  className="absolute left-0 top-full mt-2 w-64 sm:w-72 rounded-2xl bg-[#FAF6F0] dark:bg-[#1C120C] border border-amber-500/40 shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between px-2 py-1.5 border-b border-amber-900/10 dark:border-amber-500/20 mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                      <SlidersHorizontal size={13} className="text-amber-500" />
                      <span>Bộ lọc chuyên mục</span>
                    </div>
                    {selectedCategory !== 'all' ? (
                      <button
                        type="button"
                        onClick={() => {
                          playTapSound();
                          setSelectedCategory('all');
                        }}
                        className="text-[11px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                      >
                        Đặt lại
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsFilterOpen(false)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                        aria-label="Đóng bộ lọc"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 max-h-64 overflow-y-auto no-scrollbar">
                    {ONLINE_CATEGORIES.map((cat) => {
                      const isSelected = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            playTapSound();
                            setSelectedCategory(cat.id);
                            setIsFilterOpen(false);
                            // Nếu đang ở tab local, tự động chuyển sang tab online để thấy kho sách chuyên mục
                            if (activeTab === 'local' && cat.id !== 'all') {
                              setActiveTab('online');
                            }
                          }}
                          className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                              : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#4A2612] dark:text-amber-100/90'
                          }`}
                        >
                          <span className="truncate">{cat.name}</span>
                          {isSelected && <Check size={14} className="text-slate-950 shrink-0" strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-amber-500">
              <SearchIcon size={17} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveToRecentSearches(query);
                }
              }}
              placeholder={isListening ? 'Đang lắng nghe bạn nói...' : 'Tìm kiếm sách, tác giả, chủ đề y khoa...'}
              className={`w-full h-[46px] pl-11 pr-20 rounded-2xl border text-[#2A160A] dark:text-[#fdf7ee] text-[13.5px] placeholder:text-[#9e8574] focus:outline-none transition-all shadow-sm ${
                isListening
                  ? 'bg-red-500/10 border-red-500 ring-2 ring-red-500/30'
                  : 'bg-white dark:bg-[#22150c] border-[#e6dcce] dark:border-[#553622] focus:border-amber-500'
              }`}
              aria-label="Nhập từ khóa tìm kiếm sách"
            />

            {/* Các nút hành động bên phải ô input: Xóa & Micro */}
            <div className="absolute inset-y-0 right-2 flex items-center gap-1">
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  aria-label="Xóa từ khóa"
                >
                  <X size={15} />
                </button>
              )}

              {/* Nút Micro Voice Search tiếng Việt */}
              <button
                type="button"
                onClick={toggleVoiceSearch}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse shadow-md'
                    : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400'
                }`}
                title={isListening ? 'Đang nghe... Bấm để dừng' : 'Bấm để tìm kiếm bằng giọng nói tiếng Việt'}
              >
                {isListening ? <Mic size={16} className="animate-spin" /> : <Mic size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Thông báo lỗi giọng nói (nếu có) */}
        {speechError && (
          <div className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs font-semibold text-center animate-fade-in">
            {speechError}
          </div>
        )}
      </section>

      {/* 2. CHUYỂN ĐỔI TAB: SÁCH CỦA BẠN VS SÁCH TRỰC TUYẾN (KHUNG CHIA ĐÔI 50-50, 1 DÒNG DUY NHẤT) */}
      <section className="grid grid-cols-2 p-1 rounded-2xl bg-[#e8ded1] dark:bg-white/5 border border-[#d5c3b1] dark:border-white/10 gap-1 shadow-2xs">
        <button
          type="button"
          onClick={() => {
            playTapSound();
            setActiveTab('local');
          }}
          className={`h-9 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap overflow-hidden ${
            activeTab === 'local'
              ? 'bg-white dark:bg-[#2A160A] text-[#2A160A] dark:text-amber-200 shadow-sm border border-amber-500/25'
              : 'text-[#6E4223] dark:text-slate-400 hover:text-[#2A160A] dark:hover:text-white'
          }`}
        >
          <BookOpen size={14} className={`shrink-0 ${activeTab === 'local' ? 'text-amber-500' : ''}`} />
          <span className="truncate">Sách của bạn ({matchedBooks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playTapSound();
            setActiveTab('online');
          }}
          className={`h-9 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap overflow-hidden ${
            activeTab === 'online'
              ? 'bg-white dark:bg-[#2A160A] text-[#2A160A] dark:text-amber-200 shadow-sm border border-amber-500/25'
              : 'text-[#6E4223] dark:text-slate-400 hover:text-[#2A160A] dark:hover:text-white'
          }`}
        >
          <Globe size={14} className={`shrink-0 ${activeTab === 'online' ? 'text-amber-500' : ''}`} />
          <span className="truncate">
            {debouncedQuery.trim()
              ? onlineMatchedCount > 0
                ? `Sách trực tuyến (${onlineMatchedCount})`
                : 'Sách trực tuyến (Internet)'
              : `Sách trực tuyến (${onlineMatchedCount})`}
          </span>
        </button>
      </section>

      {/* CHỈ BÁO ĐANG LỌC CHUYÊN MỤC (NẾU CÓ CHỌN KHÁC TẤT CẢ) */}
      {selectedCategory !== 'all' && (
        <div className="flex items-center gap-1.5 px-1 animate-in fade-in">
          <span className="text-[11px] text-[#7A4B27] dark:text-amber-300/80 font-medium">Chuyên mục:</span>
          <button
            type="button"
            onClick={() => {
              playTapSound();
              setSelectedCategory('all');
            }}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-bold border border-amber-500/40 hover:bg-amber-500/30 transition-all cursor-pointer"
            title="Bấm để bỏ lọc chuyên mục"
          >
            <span>{ONLINE_CATEGORIES.find((c) => c.id === selectedCategory)?.name || selectedCategory}</span>
            <X size={12} />
          </button>
        </div>
      )}

      {/* HIỂN THỊ NỘI DUNG THEO TAB ĐƯỢC CHỌN */}
      {activeTab === 'online' ? (
        <OnlineLibrarySection
          searchQuery={debouncedQuery}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onOpenBook={handleOpenOnlineBook}
        />
      ) : (
        <>

      {/* 3. LỊCH SỬ TÌM KIẾM GẦN ĐÂY (TINH GỌN 1 HÀNG DUY NHẤT, KHÔNG HỘP THÔ, ĐÃ BỎ GỢI Ý RÁC) */}
      {!isSearching && recentSearches.length > 0 && (
        <section className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 whitespace-nowrap scroll-smooth px-0.5">
          <div className="flex items-center gap-1 text-[11px] font-bold text-[#8B4513] dark:text-amber-400/80 shrink-0 mr-0.5">
            <Clock size={12} className="text-amber-500" />
            <span className="hidden xs:inline">Gần đây:</span>
          </div>

          {recentSearches.map((term, idx) => (
            <div
              key={idx}
              onClick={() => {
                playTapSound();
                setQuery(term);
                saveToRecentSearches(term);
              }}
              className="group pl-2.5 pr-1.5 py-1 rounded-full bg-[#ede3d5] dark:bg-white/5 hover:bg-amber-500/20 text-[#3A1F10] dark:text-amber-100 text-[11.5px] font-semibold flex items-center gap-1.5 border border-[#dccebe] dark:border-white/10 hover:border-amber-500/40 transition-all cursor-pointer shrink-0 whitespace-nowrap active:scale-95"
            >
              <span className="whitespace-nowrap max-w-[160px] truncate">{term}</span>
              <button
                type="button"
                onClick={(e) => handleRemoveRecentItem(e, term)}
                className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors shrink-0"
                title="Xóa mục này"
              >
                <X size={10} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={handleClearAllRecent}
            className="px-2 py-1 rounded-full text-[10.5px] font-semibold text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0 flex items-center gap-1 ml-0.5"
            title="Xóa toàn bộ lịch sử"
          >
            <Trash2 size={10} />
            <span>Xóa hết</span>
          </button>
        </section>
      )}


      {/* 6. KẾT QUẢ TÌM KIẾM NỘI DUNG SÂU (DEEP IN-BOOK SNIPPETS) */}
      {isSearching && matchedSnippets.length > 0 && (
        <section className="flex flex-col gap-2 p-3 rounded-2xl bg-[#fdf9f4] dark:bg-[#1a110a] border border-amber-500/25 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#8B4513] dark:text-amber-300">
              <FileText size={14} className="text-amber-500" />
              <span>Trích đoạn trong trang sách ({matchedSnippets.length})</span>
            </div>
            <span className="text-[10px] text-amber-700/80 dark:text-amber-300/70 font-semibold">
              Bấm vào để mở đúng trang
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {matchedSnippets.map((snip) => (
              <div
                key={snip.id}
                onClick={() => handleOpenSnippetPage(snip)}
                className="p-2.5 rounded-xl bg-white dark:bg-[#23170e] border border-[#e8ded1] dark:border-white/10 hover:border-amber-500/50 flex items-start gap-2.5 transition-all cursor-pointer group shadow-2xs"
              >
                {/* Ảnh bìa nhỏ chuẩn BookCoverArt */}
                <div className="w-10 aspect-[1/1.42] rounded overflow-hidden shadow-xs border border-white/10 shrink-0 mt-0.5">
                  <BookCoverArt
                    coverUrl={snip.coverUrl}
                    title={snip.bookTitle}
                    format="EPUB"
                    className="w-full h-full"
                  />
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-[#2A160A] dark:text-amber-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-300">
                      {snip.bookTitle}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-amber-500/20 text-amber-800 dark:text-amber-300 shrink-0 font-mono">
                      Trang {snip.pageNumber}
                    </span>
                  </div>

                  <span className="text-[10.5px] font-semibold text-[#8B4513] dark:text-amber-300/80 truncate">
                    {snip.chapter}
                  </span>

                  <p className="text-[11.5px] text-[#553218] dark:text-[#c4aba0] leading-relaxed line-clamp-2">
                    <HighlightText text={snip.snippet} query={debouncedQuery} />
                  </p>

                  <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-amber-900/10 dark:border-white/5">
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <Compass size={11} />
                      <span>Nhảy thẳng đến trang {snip.pageNumber}</span>
                    </span>
                    <button
                      type="button"
                      data-testid={`read-snippet-btn-${snip.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSnippetPage(snip);
                      }}
                      className="px-2 py-0.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10.5px] font-black flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                    >
                      <BookOpen size={11} />
                      <span>Đọc trang này ↗</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. TIÊU ĐỀ KẾT QUẢ ĐẦU SÁCH */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-amber-500 dark:text-amber-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-[#8B4513] dark:text-amber-200">
            {isSearching ? `Đầu sách phù hợp (${matchedBooks.length})` : `Tất cả đầu sách (${matchedBooks.length})`}
          </h2>
        </div>
        {isSearching && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
            }}
            className="text-[11px] text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 cursor-pointer font-semibold"
          >
            Xem tất cả
          </button>
        )}
      </div>

      {/* 8. DANH SÁCH SÁCH TÌM THẤY (CÓ HIGHLIGHT TỪ KHÓA) */}
      {(loading || (query.trim().length > 0 && query !== debouncedQuery)) ? (
        <div className="py-8 flex flex-col items-center justify-center gap-2 text-amber-700 dark:text-amber-200">
          <div className="w-8 h-8 border-2 border-amber-500 dark:border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold animate-pulse">Đang tìm kiếm sách trong thư viện, vui lòng chờ...</span>
        </div>
      ) : matchedBooks.length === 0 && matchedSnippets.length === 0 ? (
        <div className="py-10 px-4 rounded-2xl bg-white dark:bg-[#22150c] border border-[#e6dcce] dark:border-[#553622] flex flex-col items-center justify-center text-center gap-3 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 dark:bg-white/5 border border-amber-500/20 dark:border-white/10 flex items-center justify-center text-amber-700 dark:text-amber-400">
            <SearchIcon size={22} />
          </div>
          <div className="flex flex-col gap-1 max-w-xs">
            <h3 className="text-sm font-bold text-[#2A160A] dark:text-amber-100">Không tìm thấy sách phù hợp</h3>
            <p className="text-xs text-[#6E4223] dark:text-amber-200/60 leading-relaxed">
              Không có đầu sách nào khớp với từ khóa "{query}". Bạn có thể thử với từ khóa khác hoặc bấm nút "Nhờ AI tìm sách" bên dưới.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {matchedBooks.map((book) => (
            <div
              key={book.id}
              className="p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-[#22150c] border border-[#e6dcce] dark:border-[#553622] hover:border-amber-500/60 text-[#2A160A] dark:text-[#fdf7ee] shadow-sm dark:shadow-md flex items-center gap-3 transition-all group"
            >
              {/* Bìa sách 3D thu nhỏ chuẩn BookCoverArt chống lỗi ảnh bìa */}
              <div
                onClick={() => handleOpenBook(book)}
                className="w-[72px] sm:w-[84px] aspect-[1/1.42] rounded-r-md rounded-l-xs overflow-hidden shadow-md border-l-2 border-amber-900/10 dark:border-white/20 shrink-0 cursor-pointer group-hover:scale-105 transition-transform relative bg-[#F5EFE6] dark:bg-[#1c1109] flex items-center justify-center"
                title="Bấm để đọc sách 3D"
              >
                <BookCoverArt
                  coverUrl={book.cover_url}
                  title={book.title}
                  author={book.author}
                  format={book.badge_tag}
                  className="w-full h-full"
                />
              </div>

              {/* Thông tin sách có Highlight từ khóa */}
              <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-800 border border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                      {book.badge_tag}
                    </span>
                    <span className="text-[10px] text-[#6E4223] dark:text-amber-200/60 truncate font-mono">
                      {book.pages_count} trang
                    </span>
                  </div>
                  <h3
                    onClick={() => handleOpenBook(book)}
                    className="text-[13.5px] sm:text-sm font-bold text-[#2A160A] dark:text-amber-100 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors line-clamp-1 cursor-pointer leading-snug"
                  >
                    <HighlightText text={book.title} query={debouncedQuery} />
                  </h3>
                  {book.description && (
                    <p className="text-[11px] text-[#6E4223] dark:text-[#9e8574] line-clamp-1 leading-normal mt-0.5">
                      <HighlightText text={book.description} query={debouncedQuery} />
                    </p>
                  )}
                  <span className="text-[10.5px] text-[#8B4513] dark:text-amber-200/70 truncate block mt-0.5">
                    Tác giả: <HighlightText text={book.author} query={debouncedQuery} />
                  </span>
                </div>

                {/* Nút hành động (1 dòng tinh gọn, chuẩn mobile) */}
                <div className="flex items-center gap-1.5 mt-2 pt-1">
                  {/* NÚT THÊM VÀO KỆ SÁCH */}
                  {shelfBookIds.has(book.id) ? (
                    <button
                      type="button"
                      onClick={() => handleToggleShelf(book)}
                      className="h-6 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap active:scale-95 shrink-0"
                      title="Sách đã có trên Kệ sách gỗ. Bấm để bỏ"
                    >
                      <Check size={11} strokeWidth={2.5} />
                      <span>Đã trên kệ</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleShelf(book)}
                      className="h-6 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap active:scale-95 shrink-0"
                      title="Thêm vào Kệ sách gỗ trên trang chủ"
                    >
                      <BookmarkPlus size={11} />
                      <span>+ Kệ</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenBook(book)}
                    className="h-6 px-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10.5px] flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs whitespace-nowrap shrink-0"
                  >
                    <BookOpen size={11} strokeWidth={2.5} />
                    <span>Đọc 3D</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDetailBook({
                        id: book.id,
                        title: book.title,
                        author: book.author,
                        description: book.description,
                        cover_url: book.cover_url,
                        pages: book.pages,
                        gallery_images: book.gallery_images,
                        flipbook_pages: book.flipbook_pages,
                        file_url: book.file_url,
                        pdf_url: book.pdf_url,
                        type: 'recommended',
                      })
                    }
                    className="px-2.5 py-1 rounded-lg bg-[#F5EFE6] hover:bg-[#ebe3d7] text-[#4A2612] border border-amber-900/15 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white dark:border-transparent font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                  >
                    <Info size={12} />
                    <span>Chi tiết</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

          {/* BANNER MỜI KHÁM PHÁ SÁCH TRỰC TUYẾN Ở ĐÁY KẾT QUẢ */}
          <div
            onClick={() => {
              playTapSound();
              setActiveTab('online');
            }}
            className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-600/10 to-amber-700/15 border border-amber-500/30 flex items-center justify-between gap-2.5 cursor-pointer hover:border-amber-400 transition-all active:scale-[0.99] shadow-2xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
                <Globe size={15} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black text-[#2A160A] dark:text-amber-100 truncate">
                  Khám phá Sách trực tuyến
                </span>
                <span className="text-[10px] text-[#6E4223] dark:text-amber-300/80 truncate">
                  Đọc và nghe sách ngoại tuyến không cần đăng nhập
                </span>
              </div>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 text-xs font-black flex items-center gap-1 shrink-0 whitespace-nowrap">
              <span>Xem ngay</span>
              <ChevronRight size={13} strokeWidth={2.5} />
            </div>
          </div>
        </>
      )}

      {/* MODAL ĐỌC SÁCH 3D KHI CHỌN SÁCH TỪ KẾT QUẢ TÌM KIẾM */}
      <SideBooksReaderModal
        isOpen={Boolean(readerBook)}
        title={readerBook?.title || 'Tủ Sách Y Khoa'}
        author={readerBook?.author}
        coverUrl={readerBook?.cover_url}
        fileUrl={readerBook?.file_url || undefined}
        pdfUrl={readerBook?.pdf_url || undefined}
        fileName={readerBook?.file_name || undefined}
        pages={readerBook?.pages || []}
        initialPage={readerInitialPage}
        onClose={() => {
          setReaderBook(null);
          setReaderInitialPage(0);
        }}
      />

      {/* MODAL CHI TIẾT SÁCH */}
      <BookDetailModal
        book={detailBook}
        onClose={() => setDetailBook(null)}
        onReadBook3D={(b) => {
          const target = books.find((x) => x.id === b.id) || b;
          setDetailBook(null);
          handleOpenBook(target as SearchBookItem);
        }}
      />

      {/* NÚT AI BÁM ĐUỔI THÔNG MINH (TỰ ĐỘNG NHẬN DIỆN TRANG TÌM KIẾM ĐỂ DÀI HƠN THÀNH 'NHỜ AI TÌM SÁCH') */}
      <FloatingAiButton />

      {/* THÔNG BÁO TOAST KHI THÊM / BỎ KHỎI KỆ SÁCH */}
      {shelfToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-xl bg-[#2A160A] text-amber-300 border border-amber-500/40 text-xs font-bold shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150 whitespace-nowrap">
          {shelfToast}
        </div>
      )}

      {/* THANH ĐIỀU HƯỚNG DƯỚI CÙNG */}
      <BottomNav />
    </main>
  );
}
