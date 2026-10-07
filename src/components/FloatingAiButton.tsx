'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, BookOpen, Loader2, Move, Mic, MicOff } from 'lucide-react';
import { playTapSound } from '../lib/audioFeedback';

interface FloatingAiBook {
  id: string;
  title: string;
  author?: string;
  cover_url?: string;
  badge_tag?: string;
  target_page?: number;
  target_index?: number;
  reason?: string;
}

interface FloatingChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  suggested_books?: FloatingAiBook[];
}

export default function FloatingAiButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<FloatingChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Xin chào! Tôi là Trợ lý Tra cứu Sách Y Khoa. Bạn cần tìm kiếm thông tin hay tóm tắt nội dung cuốn sách nào?',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // Vị trí tọa độ và điều khiển cử chỉ Giữ 2.5s để di chuyển
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedSignificantlyRef = useRef<boolean>(false);

  // Micro nghe liên tục (Speech Recognition)
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const baseTextRef = useRef('');
  const currentQueryRef = useRef(query);

  useEffect(() => {
    currentQueryRef.current = query;
  }, [query]);

  const stopListening = () => {
    isListeningRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  };

  const startListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError('Trình duyệt chưa hỗ trợ nhận diện giọng nói.');
      setTimeout(() => setSpeechError(''), 4000);
      return;
    }

    try {
      playTapSound();
      setSpeechError('');
      baseTextRef.current = currentQueryRef.current;

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'vi-VN';

      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = 0; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        const sessionTranscript = (finalTranscript + ' ' + interimTranscript).trim();
        const base = baseTextRef.current ? (baseTextRef.current.trim() + ' ') : '';
        setQuery(base + sessionTranscript);
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          isListeningRef.current = false;
          setIsListening(false);
          setSpeechError('Vui lòng cấp quyền Micro trên trình duyệt.');
          setTimeout(() => setSpeechError(''), 4000);
        }
      };

      recognition.onend = () => {
        if (isListeningRef.current) {
          try {
            baseTextRef.current = currentQueryRef.current;
            recognition.start();
          } catch {
            setTimeout(() => {
              if (isListeningRef.current) {
                try {
                  baseTextRef.current = currentQueryRef.current;
                  recognition.start();
                } catch {
                  isListeningRef.current = false;
                  setIsListening(false);
                }
              }
            }, 300);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      isListeningRef.current = true;
      setIsListening(true);
    } catch {
      isListeningRef.current = false;
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      playTapSound();
      stopListening();
    } else {
      startListening();
    }
  };

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  // Nạp vị trí đã lưu từ localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('floating_ai_btn_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const validX = Math.max(8, Math.min(window.innerWidth - 85, parsed.x));
          const validY = Math.max(8, Math.min(window.innerHeight - 45, parsed.y));
          setPos({ x: validX, y: validY });
          return;
        }
      }
    } catch {}
    // Mặc định góc trên bên phải
    if (typeof window !== 'undefined') {
      setPos({ x: Math.max(10, window.innerWidth - 95), y: 14 });
    }
  }, []);

  const clearHoldTimers = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setIsHolding(false);
    setHoldProgress(0);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const clientX = e.clientX;
    const clientY = e.clientY;
    startPointerRef.current = { x: clientX, y: clientY };
    hasMovedSignificantlyRef.current = false;

    const currentX = pos?.x ?? Math.max(10, window.innerWidth - 95);
    const currentY = pos?.y ?? 14;
    dragOffsetRef.current = {
      x: clientX - currentX,
      y: clientY - currentY,
    };

    setIsHolding(true);
    setHoldProgress(0);

    const startTime = Date.now();
    const DURATION = 2500; // Giữ đúng 2.5s để kích hoạt chế độ di chuyển

    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / DURATION) * 100));
      setHoldProgress(pct);
    }, 40);

    holdTimerRef.current = setTimeout(() => {
      clearHoldTimers();
      setIsUnlocked(true);
      setIsDragging(true);
      try {
        navigator.vibrate?.([50, 40, 50]);
      } catch {}
    }, DURATION);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const dx = e.clientX - startPointerRef.current.x;
    const dy = e.clientY - startPointerRef.current.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 8) {
      hasMovedSignificantlyRef.current = true;
    }

    if (isDragging) {
      const btnW = 85;
      const btnH = 35;
      const newX = Math.max(8, Math.min(window.innerWidth - btnW - 8, e.clientX - dragOffsetRef.current.x));
      const newY = Math.max(8, Math.min(window.innerHeight - btnH - 8, e.clientY - dragOffsetRef.current.y));
      setPos({ x: newX, y: newY });
    } else if (!isUnlocked && dist > 15) {
      clearHoldTimers();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const wasDragging = isDragging;
    clearHoldTimers();

    if (wasDragging) {
      if (pos) {
        try {
          localStorage.setItem('floating_ai_btn_pos', JSON.stringify(pos));
        } catch {}
      }
      setIsDragging(false);
      setIsUnlocked(false);
      return;
    }

    if (!hasMovedSignificantlyRef.current) {
      setIsOpen(true);
    }
    setIsUnlocked(false);
  };

  const handleSend = async (textToSend?: string) => {
    if (isListeningRef.current) {
      stopListening();
    }
    const q = (textToSend || query).trim();
    if (!q || isLoading) return;

    const userMsg = { id: Date.now().toString(), role: 'user' as const, text: q };
    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      const botReply =
        data.answer ||
        data.text ||
        'Xin lỗi, hiện tại tôi chưa tìm thấy đoạn trích phù hợp trong các đầu sách. Bạn có thể tra cứu theo tựa sách cụ thể nhé!';

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: botReply,
          suggested_books: data.suggested_books || [],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: 'Hệ thống tra cứu đang bận, xin vui lòng thử lại sau giây lát!',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenBook = (book: FloatingAiBook) => {
    playTapSound();
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('open_book_from_ai', {
          detail: {
            id: book.id,
            title: book.title,
            cover_url: book.cover_url,
            target_page: book.target_page ?? 1,
            target_index: book.target_index ?? (book.target_page ? book.target_page - 1 : 0),
          },
        })
      );
    }
  };

  const quickTopics = [
    '✦ Tất cả chủ đề',
    '🦴 Giải phẫu 3D',
    '🥗 Dinh dưỡng tế bào',
    '🩺 Cột sống & Thoát vị',
    '🌿 Phục hồi Lưng & Cổ',
    '🦠 Tiêu hóa & Vi sinh',
    '💧 Nước & Khoáng chất',
    '⚠️ Dấu hiệu cờ đỏ',
    '📄 Bảng tra thần kinh',
  ];

  return (
    <>
      {/* 1. NÚT AI BÁN TRONG SUỐT - GIỮ 2.5s LÀ DI CHUYỂN ĐƯỢC */}
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          left: pos ? `${pos.x}px` : undefined,
          top: pos ? `${pos.y}px` : '14px',
          right: pos ? undefined : '14px',
          touchAction: 'none',
        }}
        className={`fixed z-40 px-2.5 py-1 rounded-full border shadow-[0_4px_16px_rgba(0,0,0,0.6)] backdrop-blur-md flex items-center gap-1.5 text-[11px] font-extrabold select-none transition-shadow ${
          isDragging
            ? 'bg-amber-500 text-slate-950 border-amber-300 ring-4 ring-amber-400/40 scale-110 shadow-2xl cursor-grabbing'
            : isHolding
            ? 'bg-black/90 text-amber-300 border-amber-400 ring-2 ring-amber-400/50 scale-105'
            : 'bg-black/60 hover:bg-black/85 text-amber-300 border-amber-400/40 opacity-85 hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer'
        }`}
        title="Bấm để Hỏi AI · Giữ 2.5s để di chuyển vị trí"
        aria-label="Hỏi AI"
      >
        {isDragging ? (
          <Move size={13} className="text-slate-950 animate-bounce shrink-0" />
        ) : (
          <Sparkles size={13} className="text-amber-400 animate-pulse shrink-0" />
        )}
        <span className="tracking-wide">
          {isDragging ? 'Thả để đặt' : 'Hỏi AI'}
        </span>

        {/* Vòng đếm ngược trực quan 2.5s khi giữ ngón tay */}
        {isHolding && !isDragging && (
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-md bg-black/95 text-[9px] text-amber-300 whitespace-nowrap border border-amber-500/40 shadow-md pointer-events-none">
            Giữ {((2500 - (holdProgress * 25)) / 1000).toFixed(1)}s để dời
          </span>
        )}
      </button>

      {/* 2. MODAL TRỢ LÝ AI TRA CỨU SÁCH - 1 TÔNG MÀU TỐI DUY NHẤT (#161311) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full sm:max-w-md h-[80vh] sm:h-[630px] max-h-[85vh] rounded-t-2xl sm:rounded-2xl bg-[#161311] border border-white/10 text-stone-200 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - 1 màu tối đồng bộ #161311 */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10 bg-[#161311]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-stone-200">
                  <Sparkles size={14} />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xs font-bold text-stone-100 uppercase tracking-wide">
                    Trợ lý Tra Cứu Sách Y Khoa
                  </h3>
                  <span className="text-[10px] text-stone-400">
                    Tra cứu nội dung & đọc sách trực tiếp
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-stone-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                title="Đóng trợ lý AI"
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            {/* Dải chủ đề đa dạng bao quát toàn bộ kho sách */}
            <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar bg-[#161311] border-b border-white/10">
              {quickTopics.map((topic, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const prompt = topic.startsWith('✦')
                      ? 'Tổng quan các chủ đề và đầu sách chính trong thư viện'
                      : `Tóm tắt nội dung và sách về chủ đề: ${topic}`;
                    handleSend(prompt);
                  }}
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/15 text-stone-300 border border-white/10 text-[11px] font-medium whitespace-nowrap cursor-pointer transition-all active:scale-95"
                >
                  {topic}
                </button>
              ))}
            </div>

            {/* Vùng tin nhắn - Đồng bộ 1 màu tối #161311 */}
            <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3 text-xs bg-[#161311]">
              {messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-xl px-3.5 py-2.5 leading-relaxed ${
                        isUser
                          ? 'bg-[#241c16] border border-stone-700/40 text-stone-100 font-medium rounded-br-xs'
                          : 'bg-[#1c1611] border border-white/10 text-stone-200 rounded-bl-xs'
                      }`}
                    >
                      {m.text}
                    </div>

                    {/* Hiển thị thẻ sách gợi ý có nút Mở đọc sách ngay */}
                    {!isUser && m.suggested_books && m.suggested_books.length > 0 && (
                      <div className="w-full max-w-[92%] flex flex-col gap-2 mt-1">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-1">
                          📖 Sách đề xuất đọc ngay:
                        </span>
                        {m.suggested_books.slice(0, 2).map((book, bIdx) => (
                          <div
                            key={bIdx}
                            className="p-2.5 rounded-xl bg-[#1c1611] border border-white/10 flex items-start gap-2.5 shadow-sm"
                          >
                            <img
                              src={book.cover_url || '/documents/covers/cover_hieu_dung_ve_cot_song.png'}
                              alt={book.title}
                              className="w-11 h-15 rounded-md object-cover border border-white/10 shrink-0"
                            />
                            <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  {book.badge_tag && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-stone-300">
                                      {book.badge_tag}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-stone-400 truncate">
                                    {book.author || 'Tùng Dinh Dưỡng'}
                                  </span>
                                </div>
                                <h4 className="text-xs font-bold text-stone-100 truncate mt-0.5">
                                  {book.title}
                                </h4>
                                {book.reason && (
                                  <p className="text-[10.5px] text-stone-400 line-clamp-2 mt-0.5 leading-snug">
                                    {book.reason}
                                  </p>
                                )}
                              </div>
                              <div className="pt-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenBook(book)}
                                  className="px-2.5 py-1 rounded-lg bg-stone-200 hover:bg-white text-stone-900 text-[11px] font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                                >
                                  <BookOpen size={12} />
                                  <span>Mở đọc sách (3D)</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-xl bg-[#1c1611] border border-white/10 text-stone-300 flex items-center gap-1.5 text-xs">
                    <Loader2 size={13} className="animate-spin text-stone-400" />
                    <span>Đang tra cứu trang sách...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Thông báo lỗi Micro nếu có */}
            {speechError && (
              <div className="px-3.5 py-1.5 bg-red-950/90 border-t border-red-500/30 text-[11px] text-red-200 flex items-center justify-between">
                <span>{speechError}</span>
                <button
                  type="button"
                  onClick={() => setSpeechError('')}
                  className="p-0.5 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Input Bar - Đồng bộ 1 màu tối #161311 */}
            <div className="p-2.5 sm:p-3 border-t border-white/10 bg-[#161311] flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSend();
                  }}
                  placeholder={
                    isListening
                      ? 'Đang lắng nghe bạn nói...'
                      : 'Nhập câu hỏi tra cứu...'
                  }
                  className={`w-full h-11 pl-4 pr-9 rounded-full bg-black/50 border ${
                    isListening
                      ? 'border-red-500 ring-2 ring-red-400/40'
                      : 'border-white/15 focus:border-stone-400 focus:ring-1 focus:ring-stone-400/30'
                  } text-stone-100 text-[13.5px] placeholder:text-stone-500 focus:outline-none transition-all shadow-inner`}
                />
                {query && !isListening && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
                    title="Xóa văn bản"
                    aria-label="Xóa văn bản"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Nút Micro Nghe liên tục chuẩn 44x44px */}
              <button
                type="button"
                onClick={toggleListening}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-90 shadow-md ${
                  isListening
                    ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/40 ring-2 ring-red-400'
                    : 'bg-white/10 hover:bg-white/15 active:bg-white/20 text-stone-200 border border-white/15'
                }`}
                title={isListening ? 'Dừng nghe liên tục' : 'Bật Micro nói liên tục'}
                aria-label={isListening ? 'Dừng nghe liên tục' : 'Bật Micro nói liên tục'}
              >
                {isListening ? (
                  <MicOff size={20} strokeWidth={2.2} />
                ) : (
                  <Mic size={20} strokeWidth={2.2} />
                )}
              </button>

              {/* Nút Gửi câu hỏi chuẩn 44x44px - Đồng bộ màu tao nhã */}
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!query.trim() || isLoading}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0 shadow-md ${
                  query.trim() && !isLoading
                    ? 'bg-stone-200 hover:bg-white text-stone-900 font-bold active:scale-90 cursor-pointer'
                    : 'bg-white/5 text-stone-600 border border-white/10 opacity-40 cursor-not-allowed'
                }`}
                title="Gửi câu hỏi"
                aria-label="Gửi câu hỏi"
              >
                <Send
                  size={19}
                  strokeWidth={2.4}
                  className={query.trim() ? 'translate-x-0.5' : ''}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
