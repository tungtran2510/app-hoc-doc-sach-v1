'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, BookOpen, Loader2, Move, Mic, MicOff } from 'lucide-react';
import { playTapSound } from '../lib/audioFeedback';

export default function FloatingAiButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<
    Array<{ id: string; role: 'user' | 'assistant'; text: string }>
  >([
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
        { id: (Date.now() + 1).toString(), role: 'assistant', text: botReply },
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

  const quickChips = [
    'Tóm tắt Cẩm nang Đốt sống cổ',
    'Chế độ dinh dưỡng kháng viêm khớp',
    'Bài tập phục hồi cột sống thắt lưng',
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

      {/* 2. MODAL TRỢ LÝ AI TRA CỨU SÁCH */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full sm:max-w-md h-[78vh] sm:h-[620px] max-h-[85vh] rounded-t-2xl sm:rounded-2xl bg-[#1c1109] border border-[#4a2e1b] text-[#fdf7ee] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10 bg-[#24160d]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                  <Sparkles size={13} />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xs font-bold text-amber-200 uppercase tracking-wide">
                    Trợ lý Tra Cứu Sách Y Khoa
                  </h3>
                  <span className="text-[10px] text-amber-300/70">
                    Hỏi đáp trực tiếp nội dung các cuốn sách
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                title="Đóng trợ lý AI"
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Chips */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto no-scrollbar bg-[#160e08]/60 border-b border-white/5">
              {quickChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(chip)}
                  className="px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300/90 border border-amber-500/25 text-[10.5px] font-medium whitespace-nowrap cursor-pointer transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-2.5 text-xs">
              {messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={m.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 leading-relaxed ${
                        isUser
                          ? 'bg-amber-500 text-slate-950 font-semibold rounded-br-xs'
                          : 'bg-[#2a1a10] border border-[#4d3220] text-amber-100/95 rounded-bl-xs'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-xl bg-[#2a1a10] border border-[#4d3220] text-amber-300 flex items-center gap-1.5 text-xs">
                    <Loader2 size={13} className="animate-spin" />
                    <span>Đang tra cứu trang sách...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Thông báo lỗi Micro nếu có */}
            {speechError && (
              <div className="px-3.5 py-1.5 bg-red-950/90 border-t border-red-500/40 text-[11px] text-red-200 flex items-center justify-between">
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

            {/* Input Bar - Chuẩn khung chat hiện đại, nút Micro & nút Gửi to rõ ràng */}
            <div className="p-2.5 sm:p-3 border-t border-white/10 bg-[#24160d] flex items-center gap-2">
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
                      : 'border-amber-500/30 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40'
                  } text-white text-[13.5px] placeholder:text-slate-400 focus:outline-none transition-all shadow-inner`}
                />
                {query && !isListening && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
                    title="Xóa văn bản"
                    aria-label="Xóa văn bản"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Nút Micro Nghe liên tục chuẩn kích thước ngón tay (44x44px, icon 20px) */}
              <button
                type="button"
                onClick={toggleListening}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-90 shadow-md ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50 ring-4 ring-red-400/50'
                    : 'bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/35 text-amber-300 border border-amber-500/40'
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

              {/* Nút Gửi câu hỏi chuẩn kích thước ngón tay (44x44px, icon 19px) */}
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!query.trim() || isLoading}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0 shadow-md ${
                  query.trim() && !isLoading
                    ? 'bg-gradient-to-tr from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold active:scale-90 cursor-pointer shadow-amber-500/30'
                    : 'bg-white/5 text-slate-500 border border-white/10 opacity-40 cursor-not-allowed'
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
