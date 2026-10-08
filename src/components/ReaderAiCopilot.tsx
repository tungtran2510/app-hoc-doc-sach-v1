'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  RotateCcw,
  Bot,
  User,
  Loader2,
  BookOpen,
  Quote,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  FileText,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { bookAudioPlayer } from '../lib/audioSpeech';
import { BookTocItem, getBookToc } from '../lib/bookTocData';

export interface ReaderAiCopilotProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle: string;
  author?: string | null;
  currentPage: number; // 0-based
  totalPages?: number;
  selectedText?: string | null;
  pageContent?: string | null;
  onClearSelection?: () => void;
  readingTheme?: 'dark' | 'sepia' | 'ivory';
  toc?: BookTocItem[];
  onJumpToPage?: (pageIndex: number) => void;
}

interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  followUpQuestions?: string[];
  timestamp: number;
}

// Trích xuất các số trang tham chiếu từ văn bản phản hồi của AI
export function extractPageNumbers(text: string, maxPages: number = 9999): number[] {
  const matches = text.match(/(?:(?:Trang|trang|Page|p\.)\s*(\d+)|\[Trang\s*(\d+)\])/g);
  if (!matches) return [];
  const pages = new Set<number>();
  for (const m of matches) {
    const numMatch = m.match(/\d+/);
    if (numMatch) {
      const p = parseInt(numMatch[0], 10);
      if (p >= 1 && p <= maxPages) {
        pages.add(p);
      }
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

// Hàm format text markdown đơn giản (bold, bullet, click-to-jump page tags)
function renderFormattedCopilotText(
  text: string,
  onJumpToPage?: (p0: number) => void,
  maxPages: number = 9999
) {
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('• ');
    const cleanLine = isBullet ? line.trim().replace(/^[-•]\s*/, '') : line;

    // Tách bold (**...**) và trích dẫn trang ([Trang \d+])
    const parts = cleanLine.split(/(\*\*.*?\*\*|\[Trang\s*\d+\])/g);
    const renderedParts = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={pIdx} className="font-extrabold text-amber-900 dark:text-amber-200">
            {part.slice(2, -2)}
          </strong>
        );
      }

      // Nhận diện thẻ [Trang X] để bấm lật trang trực tiếp
      const pageMatch = part.match(/^\[Trang\s*(\d+)\]$/);
      if (pageMatch && onJumpToPage) {
        const pNum = parseInt(pageMatch[1], 10);
        if (pNum >= 1 && pNum <= maxPages) {
          return (
            <button
              key={pIdx}
              type="button"
              onClick={() => onJumpToPage(pNum - 1)}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/35 text-amber-900 dark:text-amber-200 font-extrabold text-[11px] underline decoration-amber-500 cursor-pointer align-baseline transition-all active:scale-95"
              title={`Lật tới trang ${pNum}`}
            >
              <span>Trang {pNum}</span>
              <ChevronRight size={10} className="shrink-0 text-amber-600 dark:text-amber-400" />
            </button>
          );
        }
      }

      return part;
    });

    if (isBullet) {
      return (
        <div key={idx} className="flex items-start gap-1.5 my-1 text-[12.5px] leading-relaxed">
          <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0 mt-0.5">•</span>
          <span className="flex-1 min-w-0">{renderedParts}</span>
        </div>
      );
    }

    if (!line.trim()) {
      return <div key={idx} className="h-1.5" />;
    }

    return (
      <p key={idx} className="text-[12.5px] leading-relaxed my-1">
        {renderedParts}
      </p>
    );
  });
}

export default function ReaderAiCopilot({
  isOpen,
  onClose,
  bookTitle,
  author,
  currentPage,
  totalPages = 1,
  selectedText,
  pageContent,
  onClearSelection,
  readingTheme = 'sepia',
  toc,
  onJumpToPage,
}: ReaderAiCopilotProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [readingSpeechIdx, setReadingSpeechIdx] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [scope, setScope] = useState<'page' | 'book'>('page');

  // Mục lục thực tế (ưu tiên prop toc truyền vào, fallback từ bảng mục lục kinh điển)
  const effectiveToc = useMemo(() => {
    if (toc && toc.length > 0) return toc;
    return getBookToc(bookTitle, totalPages);
  }, [toc, bookTitle, totalPages]);

  useEffect(() => {
    if (isOpen) {
      setIsCollapsed(false);
    }
  }, [isOpen, selectedText]);

  // Micro nghe liên tục (SpeechRecognition)
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const baseTextRef = useRef('');
  const currentInputRef = useRef(input);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    currentInputRef.current = input;
  }, [input]);

  // Khởi tạo tin nhắn chào mừng ban đầu khi mở
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          text: `Chào bạn! Tôi là **Trợ lý AI Đọc Sách**. Tôi đang đồng hành cùng bạn đọc cuốn **"${bookTitle}"** (Trang ${currentPage + 1}/${totalPages}).\n\nBạn có thể nhấn các gợi ý bên dưới hoặc chuyển đổi giữa chế độ **"Trang này"** và **"Toàn cuốn sách"** để tôi hỗ trợ tối đa!`,
          followUpQuestions: [
            'Tóm tắt 3 ý cốt lõi của trang này?',
            'Tóm tắt cấu trúc và thông điệp toàn cuốn sách?',
            'Giải thích các thuật ngữ chuyên sâu trang này?',
          ],
          timestamp: Date.now(),
        },
      ]);
    }
  }, [isOpen, bookTitle, currentPage, totalPages, messages.length]);

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Tự động focus vào input khi mở
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Dừng đọc sách và mic khi đóng
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      if (readingSpeechIdx) {
        bookAudioPlayer.stop();
        setReadingSpeechIdx(null);
      }
    }
  }, [isOpen]);

  // Xử lý micro nghe liên tục
  const stopListening = () => {
    isListeningRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
  };

  const startListening = () => {
    setSpeechError('');
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError('Trình duyệt chưa hỗ trợ ghi âm trực tiếp.');
      setTimeout(() => setSpeechError(''), 3000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      baseTextRef.current = currentInputRef.current.trim()
        ? currentInputRef.current.trim() + ' '
        : '';

      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(baseTextRef.current + transcript);
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.warn('[Copilot Voice Err]:', event.error);
        }
      };

      recognition.onend = () => {
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch {
            isListeningRef.current = false;
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Không thể kích hoạt nhận diện giọng nói:', err);
      setSpeechError('Lỗi micro: ' + err.message);
      setIsListening(false);
      isListeningRef.current = false;
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Gửi câu hỏi đến AI API
  const handleSend = async (questionText?: string) => {
    const query = (questionText || input).trim();
    if (!query || isLoading) return;

    if (isListening) {
      stopListening();
    }

    const userMsg: CopilotMessage = {
      id: 'usr_' + Date.now(),
      role: 'user',
      text: query,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Chuẩn bị ngữ cảnh trang sách hoặc toàn cuốn sách
      const bookContext = {
        title: bookTitle,
        author: author || null,
        page: currentPage + 1,
        totalPages: totalPages,
        scope: scope,
        excerpt: scope === 'page' ? (selectedText || (pageContent ? pageContent.slice(0, 2500) : null)) : undefined,
        toc: effectiveToc && effectiveToc.length > 0 ? effectiveToc.slice(0, 25) : undefined,
      };

      // Gọi API /api/ai/ask
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          bookContext,
          history: messages.slice(-4).map((m) => ({
            role: m.role,
            text: m.text,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error(`Mã phản hồi ${res.status}`);
      }

      const data = await res.json();
      const answer = data.answer || 'Xin lỗi, tôi chưa thể tìm thấy câu trả lời phù hợp trong trang sách này.';
      const followUps = data.follow_up_questions || [];

      const assistantMsg: CopilotMessage = {
        id: 'ast_' + Date.now(),
        role: 'assistant',
        text: answer,
        followUpQuestions: followUps,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Lỗi gọi Copilot AI:', err);
      const errorMsg: CopilotMessage = {
        id: 'err_' + Date.now(),
        role: 'assistant',
        text: '⚠️ Không thể kết nối đến Trợ lý AI lúc này. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau ít giây.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Đọc to câu trả lời của AI
  const toggleSpeechOutput = (msgId: string, text: string) => {
    if (readingSpeechIdx === msgId) {
      bookAudioPlayer.stop();
      setReadingSpeechIdx(null);
    } else {
      // Lọc bỏ markdown thô để đọc tự nhiên
      const clean = text.replace(/[*_#`]/g, '').trim();
      bookAudioPlayer.setQueue([clean], 0);
      bookAudioPlayer.play(0);
      setReadingSpeechIdx(msgId);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Xóa toàn bộ lịch sử trò chuyện về cuốn sách này?')) {
      setMessages([]);
      if (readingSpeechIdx) {
        bookAudioPlayer.stop();
        setReadingSpeechIdx(null);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <aside
      role="complementary"
      aria-label="Trợ lý AI Đọc Sách"
      className={`fixed bottom-0 inset-x-0 sm:bottom-4 sm:right-4 sm:inset-x-auto sm:w-[440px] max-w-full z-50 flex flex-col bg-[#FAF6F0]/98 dark:bg-[#1C120C]/98 text-[#2A160A] dark:text-[#F5EFE6] rounded-t-3xl sm:rounded-2xl border-t sm:border border-amber-500/40 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom duration-250 select-none transition-all ${
        isCollapsed
          ? 'h-12 overflow-hidden cursor-pointer'
          : isExpanded
          ? 'h-[75vh] sm:h-[620px]'
          : 'h-[48vh] sm:h-[480px]'
      }`}
    >
      {/* 1. HEADER TRỢ LÝ AI (KÈM THANH THU NHỎ / MỞ RỘNG) */}
      {isCollapsed ? (
        <div
          onClick={() => setIsCollapsed(false)}
          className="h-12 px-4 flex items-center justify-between gap-2 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent hover:bg-amber-500/25 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={16} className="text-amber-500 animate-pulse shrink-0" />
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200 truncate">
              Trợ lý AI Đang Sẵn Sàng · Bấm để tiếp tục trò chuyện
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(false);
              }}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-amber-600 dark:text-amber-400 cursor-pointer"
              title="Mở rộng khung"
              aria-label="Mở rộng"
            >
              <ChevronUp size={16} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-red-500 cursor-pointer"
              title="Đóng"
              aria-label="Đóng"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <header className="px-3.5 pt-2 pb-2.5 border-b border-amber-900/15 dark:border-amber-500/20 bg-white/70 dark:bg-[#251810]/80 backdrop-blur-md flex flex-col gap-1 shrink-0">
          {/* Thanh kéo nhỏ gọn trên điện thoại */}
          <div
            onClick={() => setIsCollapsed(true)}
            className="w-10 h-1 bg-amber-500/40 hover:bg-amber-500/70 rounded-full mx-auto mb-1 cursor-pointer transition-colors sm:hidden"
            title="Kéo hoặc bấm để thu gọn"
          />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-white flex items-center justify-center shadow-xs shrink-0">
                <Sparkles size={14} className="animate-pulse" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs font-black text-[#2A160A] dark:text-amber-200 uppercase tracking-wide truncate flex items-center gap-1.5">
                  <span>Hỏi AI Đồng Hành</span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-mono text-[9px]">
                    Copilot
                  </span>
                </h2>
                <p className="text-[10px] text-[#6E4223] dark:text-amber-300/70 truncate">
                  Trang {currentPage + 1}/{totalPages} · {bookTitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={handleClearHistory}
                className="w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center justify-center transition-colors cursor-pointer"
                title="Xóa lịch sử hội thoại"
                aria-label="Xóa lịch sử"
              >
                <RotateCcw size={13} />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center justify-center transition-colors cursor-pointer"
                title={isExpanded ? 'Thu nhỏ lại' : 'Mở rộng khung'}
                aria-label={isExpanded ? 'Thu nhỏ' : 'Mở rộng'}
              >
                {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center justify-center transition-colors cursor-pointer"
                title="Thu gọn xuống thanh đáy"
                aria-label="Thu gọn"
              >
                <ChevronDown size={15} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer"
                title="Đóng trợ lý AI"
                aria-label="Đóng"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </header>
      )}

      {!isCollapsed && (
        <>
          {/* THANH CHUYỂN PHẠM VI NGỮ CẢNH: TRANG NÀY vs TOÀN CUỐN SÁCH (CHUẨN TINH GỌN 1 DÒNG MOBILE) */}
          <div className="px-3 pt-2 pb-1.5 shrink-0 border-b border-amber-900/10 dark:border-amber-500/15 bg-white/40 dark:bg-[#1C120C]/50">
            <div className="grid grid-cols-2 p-0.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 text-xs">
              <button
                type="button"
                onClick={() => setScope('page')}
                className={`h-7 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap overflow-hidden ${
                  scope === 'page'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-900/70 dark:text-amber-200/70 hover:text-amber-900 dark:hover:text-amber-100'
                }`}
                title="Hỏi và phân tích trang sách đang mở"
              >
                <FileText size={12} className="shrink-0" />
                <span className="truncate">Trang này ({currentPage + 1}/{totalPages})</span>
              </button>
              <button
                type="button"
                onClick={() => setScope('book')}
                className={`h-7 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap overflow-hidden ${
                  scope === 'book'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-900/70 dark:text-amber-200/70 hover:text-amber-900 dark:hover:text-amber-100'
                }`}
                title="Hỏi và phân tích toàn bộ cuốn sách"
              >
                <BookOpen size={12} className="shrink-0" />
                <span className="truncate">Toàn sách ({effectiveToc.length > 0 ? `${effectiveToc.length} mục` : `${totalPages} trang`})</span>
              </button>
            </div>
          </div>

          {/* 2. KHỐI TRÍCH ĐOẠN ĐANG ĐƯỢC CHỌN (NẾU CÓ) */}
          {selectedText && (
            <div className="p-2.5 mx-3 mt-2 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 flex flex-col gap-1.5 shrink-0 animate-in fade-in">
              <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Quote size={11} />
                  Đoạn văn bản đang chọn
                </span>
                {onClearSelection && (
                  <button
                    type="button"
                    onClick={onClearSelection}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    title="Bỏ chọn"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <p className="text-[11.5px] italic text-[#4A2612] dark:text-amber-100 line-clamp-3 leading-relaxed">
                "{selectedText}"
              </p>
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleSend(`Giải thích chi tiết đoạn văn bản sau bằng ngôn ngữ dễ hiểu: "${selectedText}"`)}
                  className="px-2 py-1 rounded-md bg-amber-600 text-white font-bold text-[10px] hover:bg-amber-700 transition-colors cursor-pointer"
                >
                  🔍 Giải thích đoạn này
                </button>
                <button
                  type="button"
                  onClick={() => handleSend(`Tóm tắt 1 câu cốt lõi của đoạn văn sau: "${selectedText}"`)}
                  className="px-2 py-1 rounded-md bg-white dark:bg-[#251810] text-amber-800 dark:text-amber-200 border border-amber-500/30 font-bold text-[10px] hover:bg-amber-500/20 transition-colors cursor-pointer"
                >
                  📝 Tóm tắt ý
                </button>
              </div>
            </div>
          )}

          {/* 3. VÙNG DANH SÁCH TIN NHẮN (CHAT MESSAGES) */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col gap-3 min-h-0">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const jumpPages = !isUser ? extractPageNumbers(msg.text, totalPages) : [];

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium px-1">
                    {isUser ? (
                      <>
                        <span>Bạn</span>
                        <User size={10} />
                      </>
                    ) : (
                      <>
                        <Bot size={11} className="text-amber-600 dark:text-amber-400" />
                        <span className="font-bold text-amber-700 dark:text-amber-300">AI Copilot</span>
                      </>
                    )}
                  </div>

                  <div
                    className={`p-3 rounded-2xl max-w-[92%] shadow-xs ${
                      isUser
                        ? 'bg-amber-600 text-white rounded-br-xs'
                        : 'bg-white dark:bg-[#251810] border border-amber-900/15 dark:border-amber-500/25 text-[#2A160A] dark:text-amber-100 rounded-bl-xs'
                    }`}
                  >
                    {isUser ? (
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <div>{renderFormattedCopilotText(msg.text, onJumpToPage, totalPages)}</div>
                    )}

                    {/* NÚT BẤM NHẢY TRANG NHANH KHI AI NHẮC ĐẾN SỐ TRANG */}
                    {!isUser && jumpPages.length > 0 && onJumpToPage && (
                      <div className="flex items-center gap-1.5 pt-2 mt-2 border-t border-amber-900/10 dark:border-amber-500/15 text-[10px] overflow-x-auto no-scrollbar">
                        <span className="font-extrabold text-amber-800 dark:text-amber-300 shrink-0 flex items-center gap-1">
                          <BookOpen size={11} className="text-amber-600" />
                          Lật tới:
                        </span>
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                          {jumpPages.map((pNum) => (
                            <button
                              key={pNum}
                              type="button"
                              onClick={() => onJumpToPage(pNum - 1)}
                              className="px-2 py-0.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10.5px] transition-all active:scale-95 shadow-2xs flex items-center gap-0.5 shrink-0 cursor-pointer"
                              title={`Lật tới trang ${pNum} trên trình đọc 3D`}
                            >
                              <span>Trang {pNum}</span>
                              <ChevronRight size={10} strokeWidth={3} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Nút nghe đọc câu trả lời AI */}
                    {!isUser && (
                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-amber-900/10 dark:border-amber-500/15 text-[10px]">
                        <span className="text-slate-500 dark:text-slate-400">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleSpeechOutput(msg.id, msg.text)}
                          className={`px-2 py-0.5 rounded flex items-center gap-1 font-bold transition-colors cursor-pointer ${
                            readingSpeechIdx === msg.id
                              ? 'bg-amber-500 text-slate-950 font-black animate-pulse'
                              : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20'
                          }`}
                          title={readingSpeechIdx === msg.id ? 'Dừng đọc' : 'Nghe giọng đọc AI'}
                        >
                          {readingSpeechIdx === msg.id ? <VolumeX size={11} /> : <Volume2 size={11} />}
                          <span>{readingSpeechIdx === msg.id ? 'Dừng' : 'Nghe đọc'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Các câu hỏi gợi ý tiếp theo (Follow-up chips) */}
                  {!isUser && msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 max-w-[92%]">
                      {msg.followUpQuestions.map((q, qIdx) => (
                        <button
                          key={qIdx}
                          type="button"
                          onClick={() => handleSend(q)}
                          className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 border border-amber-500/25 text-[11px] font-bold text-amber-900 dark:text-amber-200 text-left transition-colors cursor-pointer flex items-center gap-1 active:scale-98"
                        >
                          <ChevronRight size={10} className="shrink-0 text-amber-600 dark:text-amber-400" />
                          <span className="truncate">{q}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/70 dark:bg-[#251810]/70 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs w-fit">
                <Loader2 size={14} className="animate-spin text-amber-600 dark:text-amber-400" />
                <span className="font-medium animate-pulse">Trợ lý AI đang tra cứu & suy luận...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 4. THANH GỢI Ý NHANH (QUICK ACTIONS CHIPS) THÍCH ỨNG THEO PHẠM VI NGỮ CẢNH */}
          <div className="px-3 pt-2 pb-1 border-t border-amber-900/10 dark:border-amber-500/15 bg-white/40 dark:bg-[#1C120C]/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {scope === 'page' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSend('Tóm tắt ngắn gọn 3 ý chính cốt lõi của trang sách này.')}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#251810] border border-amber-900/15 dark:border-amber-500/30 text-[11px] font-bold text-amber-900 dark:text-amber-200 hover:border-amber-500 shadow-2xs whitespace-nowrap flex items-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <FileText size={11} className="text-amber-600" />
                  <span>Tóm tắt trang</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSend('Giải thích các thuật ngữ chuyên môn và ý nghĩa quan trọng trong trang sách này.')}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#251810] border border-amber-900/15 dark:border-amber-500/30 text-[11px] font-bold text-amber-900 dark:text-amber-200 hover:border-amber-500 shadow-2xs whitespace-nowrap flex items-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Lightbulb size={11} className="text-amber-600" />
                  <span>Giải thích từ ngữ</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSend('Tạo 2 câu hỏi ôn tập để kiểm tra xem tôi đã hiểu kỹ nội dung trang sách này chưa.')}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#251810] border border-amber-900/15 dark:border-amber-500/30 text-[11px] font-bold text-amber-900 dark:text-amber-200 hover:border-amber-500 shadow-2xs whitespace-nowrap flex items-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <BrainCircuit size={11} className="text-amber-600" />
                  <span>Câu hỏi ôn tập</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSend('Tóm tắt cấu trúc và thông điệp cốt lõi của toàn bộ cuốn sách này.')}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#251810] border border-amber-900/15 dark:border-amber-500/30 text-[11px] font-bold text-amber-900 dark:text-amber-200 hover:border-amber-500 shadow-2xs whitespace-nowrap flex items-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <BookOpen size={11} className="text-amber-600" />
                  <span>Tóm tắt toàn sách</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSend('Liệt kê mục lục và nội dung chính của các chương trong cuốn sách này kèm số trang.')}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#251810] border border-amber-900/15 dark:border-amber-500/30 text-[11px] font-bold text-amber-900 dark:text-amber-200 hover:border-amber-500 shadow-2xs whitespace-nowrap flex items-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <FileText size={11} className="text-amber-600" />
                  <span>Mục lục các chương</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSend('Những ý tưởng cốt lõi và bài học thực tiễn lớn nhất của tác giả trong cuốn sách này là gì?')}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#251810] border border-amber-900/15 dark:border-amber-500/30 text-[11px] font-bold text-amber-900 dark:text-amber-200 hover:border-amber-500 shadow-2xs whitespace-nowrap flex items-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Lightbulb size={11} className="text-amber-600" />
                  <span>Ý tưởng cốt lõi</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSend('Gợi ý lộ trình đọc cuốn sách này theo thứ tự các chương quan trọng nhất.')}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#251810] border border-amber-900/15 dark:border-amber-500/30 text-[11px] font-bold text-amber-900 dark:text-amber-200 hover:border-amber-500 shadow-2xs whitespace-nowrap flex items-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <BrainCircuit size={11} className="text-amber-600" />
                  <span>Lộ trình đọc</span>
                </button>
              </>
            )}
          </div>

          {/* 5. KHUNG NHẬP LIỆU & NÚT MICRO NGHE LIÊN TỤC */}
          <footer className="p-3 border-t border-amber-900/15 dark:border-amber-500/20 bg-white/80 dark:bg-[#251810]/90 backdrop-blur-md shrink-0">
            {speechError && (
              <p className="text-[10px] text-red-500 font-bold mb-1.5 px-1">{speechError}</p>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    isListening
                      ? "Đang lắng nghe..."
                      : scope === 'book'
                      ? "Hỏi về toàn bộ cuốn sách, tác giả, các chương..."
                      : "Hỏi AI về trang sách này..."
                  }
                  disabled={isLoading}
                  className={`w-full h-11 pl-4 pr-9 rounded-full bg-[#FAF6F0] dark:bg-[#1C120C] border ${
                    isListening
                      ? 'border-red-500 ring-2 ring-red-400/40'
                      : 'border-amber-900/20 dark:border-amber-500/30 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40'
                  } text-[13.5px] text-[#2A160A] dark:text-amber-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-all shadow-inner`}
                />
                {input && !isListening && (
                  <button
                    type="button"
                    onClick={() => setInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs font-bold p-1 cursor-pointer"
                    title="Xóa nhanh"
                    aria-label="Xóa nhanh"
                  >
                    ✕
                  </button>
                )}
              </div>

          {/* Nút Micro nghe liên tục (44x44px, icon 20px) */}
          <button
            type="button"
            onClick={toggleListening}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-90 shadow-md ${
              isListening
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/40 ring-4 ring-red-400/50 animate-pulse'
                : 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25 border border-amber-500/40'
            }`}
            title={isListening ? 'Dừng lắng nghe' : 'Bật micro nói liên tục'}
            aria-label="Micro giọng nói"
          >
            {isListening ? (
              <MicOff size={20} strokeWidth={2.2} />
            ) : (
              <Mic size={20} strokeWidth={2.2} />
            )}
          </button>

          {/* Nút Gửi câu hỏi (44x44px, icon 19px) */}
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0 shadow-md ${
              input.trim() && !isLoading
                ? 'bg-gradient-to-tr from-amber-500 to-amber-400 hover:from-amber-400 text-slate-950 font-bold active:scale-90 cursor-pointer shadow-amber-500/30'
                : 'bg-amber-500/20 text-amber-800/40 dark:text-amber-300/40 border border-amber-500/20 opacity-40 cursor-not-allowed'
            }`}
            title="Gửi câu hỏi"
            aria-label="Gửi"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send
                size={19}
                strokeWidth={2.4}
                className={input.trim() ? 'translate-x-0.5' : ''}
              />
            )}
          </button>
        </form>
      </footer>
        </>
      )}
    </aside>
  );
}
