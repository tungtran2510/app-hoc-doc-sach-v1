'use client';

import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { bookAudioPlayer } from '../lib/audioSpeech';

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
}

interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  followUpQuestions?: string[];
  timestamp: number;
}

// Hàm format text markdown đơn giản (bold, bullet)
function renderFormattedCopilotText(text: string) {
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('• ');
    const cleanLine = isBullet ? line.trim().replace(/^[-•]\s*/, '') : line;

    const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
    const renderedParts = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={pIdx} className="font-extrabold text-amber-900 dark:text-amber-200">
            {part.slice(2, -2)}
          </strong>
        );
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
}: ReaderAiCopilotProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [readingSpeechIdx, setReadingSpeechIdx] = useState<string | null>(null);

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
          text: `Chào bạn! Tôi là **Trợ lý AI Đọc Sách**. Tôi đang đồng hành cùng bạn đọc cuốn **"${bookTitle}"** (Trang ${currentPage + 1}/${totalPages}).\n\nBạn có thể nhấn các gợi ý bên dưới hoặc hỏi tôi bất cứ điều gì về trang sách này!`,
          followUpQuestions: [
            'Tóm tắt 3 ý cốt lõi của trang này?',
            'Giải thích các thuật ngữ chuyên sâu trang này?',
            'Có bài học thực tế nào áp dụng được ngay không?',
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
      // Chuẩn bị ngữ cảnh trang sách
      const bookContext = {
        title: bookTitle,
        author: author || null,
        page: currentPage + 1,
        excerpt: selectedText || (pageContent ? pageContent.slice(0, 2000) : null),
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
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] max-w-full bg-[#FAF6F0] dark:bg-[#1C120C] text-[#2A160A] dark:text-[#F5EFE6] border-l border-amber-900/20 dark:border-amber-500/20 shadow-2xl flex flex-col animate-in slide-in-from-right duration-250 select-none"
    >
      {/* 1. HEADER TRỢ LÝ AI */}
      <header className="p-3.5 border-b border-amber-900/15 dark:border-amber-500/20 bg-white/70 dark:bg-[#251810]/80 backdrop-blur-md flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-white flex items-center justify-center shadow-sm shrink-0">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-black text-[#2A160A] dark:text-amber-200 uppercase tracking-wide truncate flex items-center gap-1.5">
              <span>Hỏi AI Đồng Hành</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-mono text-[9px]">
                Copilot
              </span>
            </h2>
            <p className="text-[10.5px] text-[#6E4223] dark:text-amber-300/70 truncate">
              Trang {currentPage + 1}/{totalPages} · {bookTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleClearHistory}
            className="w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center justify-center transition-colors cursor-pointer"
            title="Xóa lịch sử hội thoại"
            aria-label="Xóa lịch sử hội thoại"
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer"
            title="Đóng trợ lý AI"
            aria-label="Đóng"
          >
            <X size={17} />
          </button>
        </div>
      </header>

      {/* 2. KHỐI TRÍCH ĐOẠN ĐANG ĐƯỢC CHỌN (NẾU CÓ) */}
      {selectedText && (
        <div className="p-2.5 mx-3 mt-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 flex flex-col gap-1.5 shrink-0 animate-in fade-in">
          <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Quote size={11} />
              Đoạn văn bản đang chọn
            </span>
            {onClearSelection && (
              <button
                type="button"
                onClick={onClearSelection}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
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
                  <div>{renderFormattedCopilotText(msg.text)}</div>
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

      {/* 4. THANH GỢI Ý NHANH (QUICK ACTIONS CHIPS) */}
      <div className="px-3 pt-2 pb-1 border-t border-amber-900/10 dark:border-amber-500/15 bg-white/40 dark:bg-[#1C120C]/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
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
          className="flex items-center gap-1.5"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi AI về trang sách này..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 rounded-xl bg-[#FAF6F0] dark:bg-[#1C120C] border border-amber-900/20 dark:border-amber-500/30 text-[12.5px] text-[#2A160A] dark:text-amber-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-1.5 focus:ring-amber-500 transition-all"
          />

          {/* Nút Micro nghe liên tục (Continuous Speech-to-Text) */}
          <button
            type="button"
            onClick={toggleListening}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              isListening
                ? 'bg-red-500 text-white shadow-md animate-pulse ring-2 ring-red-400/50'
                : 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25 border border-amber-500/30'
            }`}
            title={isListening ? 'Dừng lắng nghe' : 'Bật micro nói liên tục'}
            aria-label="Micro giọng nói"
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          {/* Nút Gửi */}
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-9 h-9 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
            title="Gửi câu hỏi"
            aria-label="Gửi"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
          </button>
        </form>
      </footer>
    </aside>
  );
}
