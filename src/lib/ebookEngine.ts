'use client';

import JSZip from 'jszip';
import { ensurePdfJsLoaded } from './documentExtractor';
import { sanitizeEpubHtml } from './htmlSanitizer';

export type EbookFormat =
  | 'pdf'
  | 'epub'
  | 'mobi'
  | 'azw'
  | 'azw3'
  | 'fb2'
  | 'cbz'
  | 'cbr'
  | 'txt'
  | 'docx'
  | 'audio'
  | 'unknown';

export interface EbookFormatMeta {
  format: EbookFormat;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  description: string;
  iconName: string;
}

/**
 * Giải mã toàn diện các thực thể HTML/XML (tránh lỗi hiển thị ký tự mã hóa như &amp;, &lt;, &gt;,...)
 */
export function decodeHtmlEntities(str?: string | null): string {
  if (!str) return '';
  let result = str;
  for (let i = 0; i < 3; i++) {
    const prev = result;
    result = result
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, dec) => {
        try {
          return String.fromCharCode(parseInt(dec, 10));
        } catch {
          return _;
        }
      })
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
        try {
          return String.fromCharCode(parseInt(hex, 16));
        } catch {
          return _;
        }
      });
    if (result === prev) break;
  }
  return result;
}

export function detectEbookFormat(
  fileNameOrUrl?: string | null,
  fallbackUrl?: string | null
): EbookFormat {
  const detectSingle = (target?: string | null): EbookFormat => {
    if (!target) return 'unknown';
    const lower = target.toLowerCase();

    // Kiểm tra định dạng qua query proxy nếu có
    if (lower.includes('.epub')) return 'epub';
    if (lower.includes('.cbz') || lower.includes('.cbr')) return 'cbz';
    if (lower.includes('.pdf')) return 'pdf';
    if (lower.includes('.mp3') || lower.includes('.m4a') || lower.includes('.ogg') || lower.includes('.wav') || lower.includes('.audio')) return 'audio';
    if (lower.includes('.mobi')) return 'mobi';
    if (lower.includes('.azw3') || lower.includes('.azw')) return 'azw3';
    if (lower.includes('.fb2')) return 'fb2';
    if (lower.includes('.docx') || lower.includes('.doc')) return 'docx';
    if (lower.includes('.txt') || lower.includes('.text') || lower.includes('.md')) return 'txt';

    const clean = lower.split('?')[0].split('#')[0];
    const ext = clean.split('.').pop() || '';

    if (ext === 'pdf') return 'pdf';
    if (ext === 'epub') return 'epub';
    if (ext === 'mp3' || ext === 'm4a' || ext === 'ogg' || ext === 'wav') return 'audio';
    if (ext === 'mobi') return 'mobi';
    if (ext === 'azw' || ext === 'azw3') return 'azw3';
    if (ext === 'fb2') return 'fb2';
    if (ext === 'cbz') return 'cbz';
    if (ext === 'cbr') return 'cbr';
    if (ext === 'txt' || ext === 'text' || ext === 'md') return 'txt';
    if (ext === 'docx' || ext === 'doc') return 'docx';

    return 'unknown';
  };

  const primary = detectSingle(fileNameOrUrl);
  if (primary !== 'unknown') return primary;

  if (fallbackUrl) {
    const fallback = detectSingle(fallbackUrl);
    if (fallback !== 'unknown') return fallback;
  }

  return 'unknown';
}

export function getEbookFormatMeta(format: EbookFormat): EbookFormatMeta {
  switch (format) {
    case 'pdf':
      return {
        format: 'pdf',
        label: 'PDF',
        badgeBg: 'bg-red-500/15 dark:bg-red-950/60',
        badgeText: 'text-red-600 dark:text-red-400',
        badgeBorder: 'border-red-500/30',
        description: 'Tài liệu điện tử chuẩn quốc tế (Vector & Typography sắc nét)',
        iconName: 'FileText',
      };
    case 'epub':
      return {
        format: 'epub',
        label: 'EPUB',
        badgeBg: 'bg-emerald-500/15 dark:bg-emerald-950/60',
        badgeText: 'text-emerald-600 dark:text-emerald-400',
        badgeBorder: 'border-emerald-500/30',
        description: 'Định dạng Ebook chuẩn thế giới (Tự dàn trang & Mục lục chương)',
        iconName: 'BookOpen',
      };
    case 'mobi':
    case 'azw':
    case 'azw3':
      return {
        format: 'mobi',
        label: format.toUpperCase(),
        badgeBg: 'bg-amber-500/15 dark:bg-amber-950/60',
        badgeText: 'text-amber-600 dark:text-amber-400',
        badgeBorder: 'border-amber-500/30',
        description: 'Định dạng sách điện tử Amazon Kindle',
        iconName: 'BookMarked',
      };
    case 'cbz':
    case 'cbr':
      return {
        format: 'cbz',
        label: format.toUpperCase(),
        badgeBg: 'bg-purple-500/15 dark:bg-purple-950/60',
        badgeText: 'text-purple-600 dark:text-purple-400',
        badgeBorder: 'border-purple-500/30',
        description: 'Định dạng truyện tranh, Graphic Novel & Manga',
        iconName: 'Layers',
      };
    case 'fb2':
      return {
        format: 'fb2',
        label: 'FB2',
        badgeBg: 'bg-blue-500/15 dark:bg-blue-950/60',
        badgeText: 'text-blue-600 dark:text-blue-400',
        badgeBorder: 'border-blue-500/30',
        description: 'FictionBook XML – Cấu trúc chương mục chuẩn hóa',
        iconName: 'FileCode',
      };
    case 'txt':
      return {
        format: 'txt',
        label: 'VĂN BẢN',
        badgeBg: 'bg-slate-500/15 dark:bg-slate-800/60',
        badgeText: 'text-slate-700 dark:text-slate-300',
        badgeBorder: 'border-slate-500/30',
        description: 'Văn bản thuần túy / Markdown',
        iconName: 'FileText',
      };
    case 'docx':
      return {
        format: 'docx',
        label: 'WORD',
        badgeBg: 'bg-blue-600/15 dark:bg-blue-950/60',
        badgeText: 'text-blue-600 dark:text-blue-400',
        badgeBorder: 'border-blue-500/30',
        description: 'Tài liệu Microsoft Word',
        iconName: 'FileEdit',
      };
    case 'audio':
      return {
        format: 'audio',
        label: 'SÁCH NÓI MP3',
        badgeBg: 'bg-purple-500/15 dark:bg-purple-950/60',
        badgeText: 'text-purple-600 dark:text-purple-300',
        badgeBorder: 'border-purple-500/30',
        description: 'Sách nói âm thanh MP3 mở thế giới',
        iconName: 'Headphones',
      };
    default:
      return {
        format: 'unknown',
        label: 'EBOOK',
        badgeBg: 'bg-primary-soft',
        badgeText: 'text-primary',
        badgeBorder: 'border-primary/30',
        description: 'Tệp sách điện tử nguyên bản',
        iconName: 'BookOpen',
      };
  }
}

/**
 * Trích xuất ảnh bìa tự động từ file PDF (Trang 1) hoặc file EPUB (Cover image)
 * Giúp người dùng khi tải tệp sách lên sẽ tự động có ngay ảnh bìa chuẩn mà không cần chụp riêng!
 */
export async function extractCoverFromEbookFile(file: File): Promise<string | null> {
  const format = detectEbookFormat(file.name);

  if (format === 'pdf') {
    try {
      const pdfjs = await ensurePdfJsLoaded();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({
        data: arrayBuffer,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
      }).promise;
      if (pdf.numPages < 1) return null;

      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      await page.render({ canvasContext: ctx, viewport }).promise;
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch (err) {
      console.warn('Lỗi trích xuất bìa từ PDF:', err);
      return null;
    }
  }

  if (format === 'epub' || format === 'cbz') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      if (format === 'cbz') {
        // Lấy ảnh đầu tiên trong file truyện tranh
        const imageFiles = Object.keys(zip.files).filter((name) =>
          /\.(jpg|jpeg|png|webp|gif)$/i.test(name) && !name.startsWith('__MACOSX')
        ).sort();
        if (imageFiles.length > 0) {
          const imgBlob = await zip.files[imageFiles[0]].async('blob');
          return URL.createObjectURL(imgBlob);
        }
      }

      // EPUB: Tìm file ảnh bìa trong manifest của container/opf
      let opfPath = '';
      const containerFile = zip.file('META-INF/container.xml');
      if (containerFile) {
        const containerXml = await containerFile.async('text');
        const match = containerXml.match(/full-path="([^"]+)"/i);
        if (match && match[1]) opfPath = match[1];
      }

      // Nếu không tìm thấy qua container, tìm file có đuôi .opf
      if (!opfPath) {
        opfPath = Object.keys(zip.files).find((n) => n.endsWith('.opf')) || '';
      }

      if (opfPath && zip.file(opfPath)) {
        const opfText = await zip.file(opfPath)!.async('text');
        const basePath = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

        // Tìm cover-image trong manifest
        let coverHref = '';
        const coverMatch =
          opfText.match(/<item[^>]+id="[^"]*cover[^"]*"[^>]+href="([^"]+)"/i) ||
          opfText.match(/<item[^>]+properties="[^"]*cover-image[^"]*"[^>]+href="([^"]+)"/i) ||
          opfText.match(/<item[^>]+href="([^"]*(?:cover|bia)[^"]*\.(?:jpg|jpeg|png|webp))"/i);

        if (coverMatch && coverMatch[1]) {
          coverHref = basePath + coverMatch[1];
        }

        if (coverHref && zip.file(coverHref)) {
          const coverBlob = await zip.file(coverHref)!.async('blob');
          return URL.createObjectURL(coverBlob);
        }
      }

      // Fallback: Tìm bất kỳ ảnh nào có tên chứa 'cover'
      const fallbackCover = Object.keys(zip.files).find(
        (n) => /cover\.(jpg|jpeg|png|webp)/i.test(n) && !n.startsWith('__MACOSX')
      );
      if (fallbackCover && zip.file(fallbackCover)) {
        const blob = await zip.file(fallbackCover)!.async('blob');
        return URL.createObjectURL(blob);
      }
    } catch (err) {
      console.warn('Lỗi trích xuất bìa từ EPUB:', err);
      return null;
    }
  }

  return null;
}

export interface EpubChapter {
  id: string;
  title: string;
  htmlContent: string;
  href: string;
}

export interface ParsedEpubBook {
  title: string;
  author: string;
  coverUrl: string | null;
  chapters: EpubChapter[];
}

/**
 * Trình giải mã EPUB siêu nhẹ, hoạt động 100% trên trình duyệt và PWA không cần máy chủ
 */
export async function parseEpub(arrayBuffer: ArrayBuffer): Promise<ParsedEpubBook> {
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 1. Tìm OPF path
  let opfPath = '';
  const container = zip.file('META-INF/container.xml');
  if (container) {
    const text = await container.async('text');
    const m = text.match(/full-path="([^"]+)"/i);
    if (m && m[1]) opfPath = m[1];
  }
  if (!opfPath) {
    opfPath = Object.keys(zip.files).find((n) => n.endsWith('.opf')) || '';
  }
  if (!opfPath || !zip.file(opfPath)) {
    throw new Error('Tệp EPUB không hợp lệ (không tìm thấy cấu trúc OPF chuẩn).');
  }

  const opfText = await zip.file(opfPath)!.async('text');
  const basePath = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  // 2. Parse Metadata
  const titleMatch = opfText.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
  const authorMatch = opfText.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
  const title = decodeHtmlEntities(titleMatch ? titleMatch[1].trim() : 'Sách Ebook');
  const author = decodeHtmlEntities(authorMatch ? authorMatch[1].trim() : 'Tác giả');

  // 3. Parse Manifest (id -> href)
  const manifest: Record<string, string> = {};
  const itemRegex = /<item\s+[^>]*id="([^"]+)"[^>]*href="([^"]+)"[^>]*\/?>/gi;
  let match;
  while ((match = itemRegex.exec(opfText)) !== null) {
    manifest[match[1]] = match[2];
  }
  // Reverse order fallback regex for attributes in different order
  const itemRegex2 = /<item\s+[^>]*href="([^"]+)"[^>]*id="([^"]+)"[^>]*\/?>/gi;
  while ((match = itemRegex2.exec(opfText)) !== null) {
    manifest[match[2]] = match[1];
  }

  // 4. Parse Spine (thứ tự đọc)
  const spineIds: string[] = [];
  const spineRegex = /<itemref\s+[^>]*idref="([^"]+)"[^>]*\/?>/gi;
  while ((match = spineRegex.exec(opfText)) !== null) {
    spineIds.push(match[1]);
  }

  // 5. Trích xuất tất cả ảnh bên trong EPUB thành Blob URLs để hiển thị minh họa inline
  const imageBlobMap: Record<string, string> = {};
  const imageFiles = Object.keys(zip.files).filter((n) =>
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(n) && !n.startsWith('__MACOSX')
  );
  for (const imgPath of imageFiles) {
    try {
      const blob = await zip.files[imgPath].async('blob');
      imageBlobMap[imgPath] = URL.createObjectURL(blob);
      // Đồng thời lưu cả relative name
      const simpleName = imgPath.split('/').pop() || '';
      if (simpleName) imageBlobMap[simpleName] = imageBlobMap[imgPath];
    } catch {}
  }

  // 6. Đọc từng chương trong spine
  const chapters: EpubChapter[] = [];
  let chapterIndex = 1;

  for (const idref of spineIds) {
    const href = manifest[idref];
    if (!href) continue;

    const fullHref = basePath ? `${basePath}${href}`.replace(/\/+/g, '/') : href;
    const file = zip.file(fullHref) || zip.file(decodeURIComponent(fullHref));
    if (!file) continue;

    let content = await file.async('text');

    // Trích xuất tiêu đề chương
    const hMatch = content.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i) || content.match(/<title>([^<]+)<\/title>/i);
    let chapterTitle = hMatch ? decodeHtmlEntities(hMatch[1].replace(/<[^>]+>/g, '').trim()) : `Chương ${chapterIndex}`;
    if (!chapterTitle || chapterTitle.length > 80) chapterTitle = `Chương ${chapterIndex}`;

    // Thay thế đường dẫn ảnh thành blob url
    for (const [imgKey, blobUrl] of Object.entries(imageBlobMap)) {
      const escapedKey = imgKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      content = content.replace(new RegExp(`src=["'][^"']*${escapedKey}["']`, 'gi'), `src="${blobUrl}"`);
    }

    // Lọc nội dung bên trong <body>
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyContent = bodyMatch ? bodyMatch[1] : content;

    chapters.push({
      id: idref,
      title: chapterTitle,
      htmlContent: sanitizeEpubHtml(bodyContent),
      href: fullHref,
    });
    chapterIndex++;
  }

  // Ảnh bìa
  const coverUrl =
    Object.values(imageBlobMap).find((url, i) =>
      Object.keys(imageBlobMap)[i]?.toLowerCase().includes('cover')
    ) || null;

  return {
    title,
    author,
    coverUrl,
    chapters: chapters.length > 0 ? chapters : [{ id: 'ch1', title: 'Nội dung', htmlContent: '<p>Không có nội dung chương.</p>', href: '' }],
  };
}

/**
 * Giải nén truyện tranh CBZ thành danh sách URL ảnh HD theo thứ tự trang
 */
export async function extractCbzImages(arrayBuffer: ArrayBuffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const imageNames = Object.keys(zip.files).filter(
    (name) => /\.(jpg|jpeg|png|webp|gif)$/i.test(name) && !name.startsWith('__MACOSX')
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const urls: string[] = [];
  for (const name of imageNames) {
    const blob = await zip.files[name].async('blob');
    urls.push(URL.createObjectURL(blob));
  }
  return urls;
}

export interface PdfOutlineItem {
  title: string;
  pageIndex: number;
  pageNumber: number;
}

export interface PdfTextSpan {
  str: string;
  left: number; // percentage (0 - 100)
  top: number;  // percentage (0 - 100)
  width: number; // percentage
  height: number; // percentage
  fontSize: number; // percentage of page height
}

export interface PdfPageProvider {
  numPages: number;
  getPageUrl: (pageNum1Based: number) => Promise<string>;
  getPageText: (pageNum1Based: number) => Promise<string>;
  getPageSpans?: (pageNum1Based: number) => Promise<PdfTextSpan[]>;
  getOutline?: () => Promise<PdfOutlineItem[]>;
  destroy: () => void;
}

/**
 * Tạo bộ cung cấp trang PDF động theo nhu cầu (On-Demand PDF Page Provider)
 * Đọc trực tiếp tệp PDF nguyên bản, chỉ tải trang khi đọc tới, tự động nạp trước (prefetch)
 * Giúp mở sách PDF 200 - 500 trang trong chưa đầy 1 giây mà không tốn bộ nhớ hay dung lượng!
 */
export async function createPdfPageProvider(pdfUrl: string): Promise<PdfPageProvider> {
  const pdfjs = await ensurePdfJsLoaded();
  
  let safePdfUrl = pdfUrl;
  if (
    typeof window !== 'undefined' &&
    (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://')) &&
    !pdfUrl.includes(window.location.host) &&
    !pdfUrl.includes('/api/download-proxy') &&
    !pdfUrl.includes('/api/proxy-ebook')
  ) {
    safePdfUrl = `/api/download-proxy?url=${encodeURIComponent(pdfUrl)}`;
  }

  const pdf = await pdfjs.getDocument({
    url: safePdfUrl,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
  }).promise;

  const cache = new Map<number, string>();
  const activeRenders = new Map<number, Promise<string>>();

  const renderPage = async (pageNum: number): Promise<string> => {
    if (cache.has(pageNum)) return cache.get(pageNum)!;
    if (activeRenders.has(pageNum)) return activeRenders.get(pageNum)!;

    const renderPromise = (async () => {
      try {
        const page = await pdf.getPage(pageNum);
        // Tối ưu độ phân giải cao 2.2x để chữ tiếng Việt có dấu sắc nét, chống nhòe kerning
        const viewport = page.getViewport({ scale: 2.2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('Không khởi tạo được bộ vẽ Canvas 2D');

        // Bật làm mịn chất lượng cao chống vỡ font
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        await page.render({ canvasContext: ctx, viewport }).promise;
        let dataUrl: string;
        try {
          dataUrl = canvas.toDataURL('image/webp', 0.94);
        } catch {
          dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        }

        // Giới hạn bộ nhớ cache tối đa 40 trang gần nhất
        if (cache.size > 40) {
          const firstKey = cache.keys().next().value;
          if (firstKey !== undefined) cache.delete(firstKey);
        }

        cache.set(pageNum, dataUrl);
        return dataUrl;
      } finally {
        activeRenders.delete(pageNum);
      }
    })();

    activeRenders.set(pageNum, renderPromise);
    return renderPromise;
  };

  return {
    numPages: pdf.numPages,
    getPageUrl: async (pageNum: number) => {
      const clamped = Math.max(1, Math.min(pageNum, pdf.numPages));
      const url = await renderPage(clamped);

      // Tự động tải trước 2 trang kế tiếp ở chế độ nền để chuyển trang tức thì không độ trễ
      if (clamped + 1 <= pdf.numPages && !cache.has(clamped + 1)) {
        setTimeout(() => renderPage(clamped + 1).catch(() => {}), 80);
      }
      if (clamped + 2 <= pdf.numPages && !cache.has(clamped + 2)) {
        setTimeout(() => renderPage(clamped + 2).catch(() => {}), 250);
      }

      return url;
    },
    getPageText: async (pageNum: number) => {
      try {
        const clamped = Math.max(1, Math.min(pageNum, pdf.numPages));
        const page = await pdf.getPage(clamped);
        const content = await page.getTextContent();
        const text = content.items
          .map((item: any) => item.str || '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        return text;
      } catch (err) {
        console.warn('Không trích xuất được text trang PDF:', err);
        return '';
      }
    },
    getPageSpans: async (pageNum: number): Promise<PdfTextSpan[]> => {
      try {
        const clamped = Math.max(1, Math.min(pageNum, pdf.numPages));
        const page = await pdf.getPage(clamped);
        const viewport = page.getViewport({ scale: 1.0 });
        const content = await page.getTextContent();
        const spans: PdfTextSpan[] = [];

        for (const item of (content.items as any[])) {
          const str = item.str || '';
          if (!str || !str.trim()) continue;

          const fontHeight = Math.abs(item.transform[3]) || item.height || 12;
          const tx = item.transform[4];
          const ty = item.transform[5];
          const itemWidth = item.width || (fontHeight * str.length * 0.55);

          // PDF coordinate space origin is at bottom-left, y points upwards
          // HTML origin is at top-left, y points downwards
          const topFromTop = viewport.height - ty - (fontHeight * 0.85);

          spans.push({
            str,
            left: Math.max(0, Math.min(99, (tx / viewport.width) * 100)),
            top: Math.max(0, Math.min(99, (topFromTop / viewport.height) * 100)),
            width: Math.max(0.5, Math.min(100, (itemWidth / viewport.width) * 100)),
            height: Math.max(0.5, Math.min(20, (fontHeight / viewport.height) * 100)),
            fontSize: (fontHeight / viewport.height) * 100,
          });
        }
        return spans;
      } catch (err) {
        console.warn('Không trích xuất được text spans PDF:', err);
        return [];
      }
    },
    getOutline: async (): Promise<PdfOutlineItem[]> => {
      try {
        const outline = await pdf.getOutline();
        if (!outline || !Array.isArray(outline) || outline.length === 0) return [];
        const result: PdfOutlineItem[] = [];
        for (const item of outline) {
          if (!item || !item.title) continue;
          let pageIdx = 0;
          try {
            if (item.dest) {
              let dest = item.dest;
              if (typeof dest === 'string') {
                dest = await pdf.getDestination(dest);
              }
              if (Array.isArray(dest) && dest[0]) {
                const ref = dest[0];
                const pIdx = await pdf.getPageIndex(ref);
                if (typeof pIdx === 'number' && pIdx >= 0) {
                  pageIdx = pIdx;
                }
              }
            }
          } catch {
            // bỏ qua lỗi resolve dest cụ thể
          }
          result.push({
            title: item.title,
            pageIndex: pageIdx,
            pageNumber: pageIdx + 1,
          });
        }
        return result;
      } catch (err) {
        console.warn('Không lấy được outline từ PDF:', err);
        return [];
      }
    },
    destroy: () => {
      cache.clear();
      try {
        pdf.destroy();
      } catch {}
    },
  };
}
