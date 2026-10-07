'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  BookOpen,
  ChevronRight,
  Loader2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { PdfPageProvider, EpubChapter } from '../lib/ebookEngine';
import { extractParagraphsFromHtml } from '../lib/audioSpeech';

export interface SearchMatchItem {
  pageOrChapter: number; // 1-based page or 0-based chapter index
  label: string; // "Trang 5" or "Chương 2: Cột sống"
  snippet: string; // Đoạn văn bản chứa từ khóa
  matchIndices: [number, number]; // vị trí bắt đầu và kết thúc của keyword trong snippet
}

export interface ReaderSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle: string;
  totalPages: number;
  pdfProvider?: PdfPageProvider | null;
  epubChapters?: EpubChapter[];
  onSelectResult: (page1Based: number, chapterIdx?: number) => void;
}

export default function ReaderSearchModal({
  isOpen,
  onClose,
  bookTitle,
  totalPages,
  pdfProvider,
  epubChapters,
  onSelectResult,
}: ReaderSearchModalProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchMatchItem[]>([]);
  const [searchedCount, setSearchedCount] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<any>(null);

  // Cache văn bản đã trích xuất từ các trang để tìm kiếm tức thì những lần sau
  const textCacheRef = useRef<Map<number, string>>(new Map());

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 250);
    } else {
      setQuery('');
      setResults([]);
      setHasSearched(false);
    }
  }, [isOpen]);

  const executeSearch = async (searchTerm: string) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q || q.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    const matches: SearchMatchItem[] = [];

    try {
      // 1. Nếu là sách PDF
      if (pdfProvider) {
        const total = pdfProvider.numPages || totalPages;
        for (let p = 1; p <= total; p++) {
          setSearchedCount(p);
          let text = textCacheRef.current.get(p);
          if (!text) {
            text = (await pdfProvider.getPageText(p)) || '';
            textCacheRef.current.set(p, text);
          }

          if (text) {
            const lowerText = text.toLowerCase();
            let startIdx = 0;
            while (true) {
              const foundIdx = lowerText.indexOf(q, startIdx);
              if (foundIdx === -1) break;

              // Trích xuất snippet 60 ký tự trước và 80 ký tự sau
              const snippetStart = Math.max(0, foundIdx - 45);
              const snippetEnd = Math.min(text.length, foundIdx + q.length + 65);
              const rawSnippet = text.substring(snippetStart, snippetEnd).replace(/\s+/g, ' ');

              matches.push({
                pageOrChapter: p,
                label: `Trang ${p}`,
                snippet: (snippetStart > 0 ? '...' : '') + rawSnippet + (snippetEnd < text.length ? '...' : ''),
                matchIndices: [
                  foundIdx - snippetStart + (snippetStart > 0 ? 3 : 0),
                  foundIdx - snippetStart + q.length + (snippetStart > 0 ? 3 : 0),
                ],
              });

              startIdx = foundIdx + q.length + 10;
              if (matches.length >= 50) break; // giới hạn 50 kết quả
            }
          }
          if (matches.length >= 50) break;
        }
      }
      // 2. Nếu là sách EPUB
      else if (epubChapters && epubChapters.length > 0) {
        epubChapters.forEach((ch, chIdx) => {
          const paras = extractParagraphsFromHtml(ch.htmlContent);
          const text = paras.join(' ');
          const lowerText = text.toLowerCase();

          let startIdx = 0;
          while (true) {
            const foundIdx = lowerText.indexOf(q, startIdx);
            if (foundIdx === -1) break;

            const snippetStart = Math.max(0, foundIdx - 45);
            const snippetEnd = Math.min(text.length, foundIdx + q.length + 65);
            const rawSnippet = text.substring(snippetStart, snippetEnd).replace(/\s+/g, ' ');

            matches.push({
              pageOrChapter: chIdx + 1,
              label: ch.title || `Chương ${chIdx + 1}`,
              snippet: (snippetStart > 0 ? '...' : '') + rawSnippet + (snippetEnd < text.length ? '...' : ''),
              matchIndices: [
                foundIdx - snippetStart + (snippetStart > 0 ? 3 : 0),
                foundIdx - snippetStart + q.length + (snippetStart > 0 ? 3 : 0),
              ],
            });

            startIdx = foundIdx + q.length + 10;
            if (matches.length >= 50) break;
          }
        });
      }
    } catch (err) {
      console.warn('Lỗi tìm kiếm trong sách:', err);
    } finally {
      setIsSearching(false);
      setResults(matches);
    }
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      executeSearch(val);
    }, 400);
  };

  // Highlight từ khóa bên trong snippet
  const renderHighlightedSnippet = (snippet: string, keyword: string) => {
    if (!keyword) return snippet;
    const parts = snippet.split(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === keyword.toLowerCase() ? (
        <mark key={i} className="bg-amber-400 text-slate-950 font-black px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[85vh] rounded-3xl bg-[#FAF6F0] dark:bg-[#1C120C] border border-amber-900/30 dark:border-amber-500/30 shadow-2xl flex flex-col overflow-hidden text-[#2A160A] dark:text-[#F5EFE6]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. THANH TÌM KIẾM TRÊN CÙNG */}
        <header className="p-3.5 border-b border-amber-900/15 dark:border-amber-500/20 bg-white/80 dark:bg-[#251810]/90 backdrop-blur-md flex items-center gap-2 shrink-0">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#FAF6F0] dark:bg-[#1C120C] border border-amber-900/20 dark:border-amber-500/30 shadow-inner">
            <Search size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder={`Tìm từ khóa trong ${totalPages} trang sách...`}
              className="flex-1 bg-transparent text-xs sm:text-sm text-[#2A160A] dark:text-amber-100 placeholder:text-slate-500 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setHasSearched(false);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Đóng"
          >
            <X size={18} />
          </button>
        </header>

        {/* 2. THANH TRẠNG THÁI KẾT QUẢ */}
        <div className="px-4 py-2 border-b border-amber-900/10 dark:border-amber-500/15 bg-white/40 dark:bg-white/5 flex items-center justify-between text-xs font-bold shrink-0">
          <span className="text-[#6E4223] dark:text-amber-300/80 truncate">
            {bookTitle}
          </span>
          {isSearching ? (
            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-mono text-[11px]">
              <Loader2 size={12} className="animate-spin" />
              Đang quét...
            </span>
          ) : hasSearched ? (
            <span className="text-amber-800 dark:text-amber-300 font-mono text-[11px]">
              {results.length} kết quả tìm thấy
            </span>
          ) : (
            <span className="text-slate-400 text-[11px]">Nhập từ 2 ký tự để tìm</span>
          )}
        </div>

        {/* 3. DANH SÁCH KẾT QUẢ TRÙNG KHỚP */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col gap-2 min-h-0">
          {isSearching && results.length === 0 ? (
            <div className="p-8 flex flex-col items-center justify-center gap-2 text-center text-amber-700 dark:text-amber-300">
              <Loader2 size={28} className="animate-spin text-amber-500" />
              <p className="text-xs font-bold">Đang tìm kiếm toàn văn trong từng trang sách...</p>
            </div>
          ) : hasSearched && results.length === 0 ? (
            <div className="p-8 flex flex-col items-center justify-center gap-2 text-center text-slate-500">
              <AlertCircle size={28} className="text-amber-500/60" />
              <p className="text-xs font-bold text-[#2A160A] dark:text-amber-200">
                Không tìm thấy kết quả nào cho "{query}"
              </p>
              <p className="text-[11px] text-[#6E4223] dark:text-amber-300/70 max-w-xs">
                Hãy thử tìm bằng từ khóa ngắn hơn, không dấu hoặc các thuật ngữ đồng nghĩa.
              </p>
            </div>
          ) : !hasSearched ? (
            <div className="p-8 flex flex-col items-center justify-center gap-2 text-center text-slate-500">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Search size={22} />
              </div>
              <p className="text-xs font-bold text-[#2A160A] dark:text-amber-200">
                Tìm kiếm thông minh toàn bộ cuốn sách
              </p>
              <p className="text-[11px] text-[#6E4223] dark:text-amber-300/70 max-w-xs">
                Nhập tên bệnh, thuật ngữ y khoa, chế độ ăn, hoặc khái niệm cần tra cứu nhanh.
              </p>
            </div>
          ) : (
            results.map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  onSelectResult(item.pageOrChapter);
                  onClose();
                }}
                className="p-3 rounded-2xl bg-white dark:bg-[#251810] border border-amber-900/10 dark:border-amber-500/20 hover:border-amber-500 shadow-xs flex items-start justify-between gap-3 cursor-pointer group transition-all"
              >
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold font-mono text-[10px]">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Nhấn để lật đến</span>
                  </div>
                  <p className="text-xs text-[#4A2612] dark:text-amber-100/90 leading-relaxed group-hover:text-amber-900 dark:group-hover:text-amber-200">
                    {renderHighlightedSnippet(item.snippet, query)}
                  </p>
                </div>

                <ChevronRight
                  size={16}
                  className="text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-2"
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
