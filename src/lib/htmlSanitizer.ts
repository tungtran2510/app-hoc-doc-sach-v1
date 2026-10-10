import sanitizeLib from 'sanitize-html';

export const SAFE_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'blockquote', 'pre', 'code', 'ul', 'ol', 'li',
  'b', 'i', 'u', 's', 'strong', 'em', 'mark', 'small', 'sub', 'sup', 'a', 'img', 'span', 'div',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'figure', 'figcaption', 'section', 'article',
  'header', 'footer', 'aside', 'nav', 'dl', 'dt', 'dd', 'video', 'source', 'caption', 'colgroup', 'col',
];

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

/**
 * Bộ lọc HTML cho khối nội dung TextBlock (giữ nguyên 100% cấu hình và hành vi hiện tại)
 */
export function sanitizeHtml(raw: string): string {
  if (!raw) return '';
  return sanitizeLib(raw, {
    allowedTags: [
      'h1','h2','h3','h4','h5','h6','p','br','hr','blockquote','pre','code','ul','ol','li',
      'b','i','u','s','strong','em','mark','small','sub','sup','a','img','span','div',
      'table','thead','tbody','tr','td','th','figure','figcaption','section','video','source',
    ],
    allowedAttributes: {
      '*': ['style', 'class', 'title'],
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'loading'],
      video: ['src', 'controls', 'poster', 'width', 'height'],
      source: ['src', 'type'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName: string, attribs: Record<string, string>) => ({
        tagName,
        attribs: { ...attribs, rel: 'noopener noreferrer nofollow' },
      }),
    },
    allowedStyles: {
      '*': {
        color: [/^[#\w(),.\s%-]+$/],
        'background-color': [/^[#\w(),.\s%-]+$/],
        'text-align': [/^(left|right|center|justify)$/],
        'font-size': [/^[\d.]+(px|em|rem|%)$/],
        'font-weight': [/^[\w]+$/],
        'font-style': [/^[\w]+$/],
        'line-height': [/^[\d.]+(px|em|rem|%)?$/],
        'text-decoration': [/^[\w\s-]+$/],
        margin: [/^[\d.\sa-z%-]+$/],
        padding: [/^[\d.\sa-z%-]+$/],
        border: [/^[#\w(),.\s%-]+$/],
        'border-radius': [/^[\d.\sa-z%-]+$/],
        width: [/^[\d.]+(px|em|rem|%|vw)$/],
        'max-width': [/^[\d.]+(px|em|rem|%|vw)$/],
        height: [/^[\d.]+(px|em|rem|%|vh)$/],
        display: [/^(block|inline|inline-block|flex|grid|none)$/],
      },
    },
  });
}

/**
 * Bộ lọc an toàn chuyên dụng cho EPUB (chặn XSS script/iframe/on*, BẮT BUỘC hỗ trợ blob URL cho ảnh)
 */
export function sanitizeEpubHtml(raw: string): string {
  if (!raw) return '';
  return sanitizeLib(raw, {
    allowedTags: SAFE_TAGS,
    allowedAttributes: {
      '*': ['style', 'class', 'title', 'id', 'dir', 'lang'],
      a: ['href', 'target', 'rel', 'name', 'id'],
      img: ['src', 'alt', 'width', 'height', 'loading'],
      video: ['src', 'controls', 'poster', 'width', 'height'],
      source: ['src', 'type'],
      td: ['colspan', 'rowspan', 'align', 'valign'],
      th: ['colspan', 'rowspan', 'align', 'valign'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    // BẮT BUỘC cho phép scheme 'blob' để hiển thị các ảnh trích xuất từ file EPUB sang blob URL
    allowedSchemesByTag: { img: ['http', 'https', 'data', 'blob'] },
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName: string, attribs: Record<string, string>) => {
        const href = attribs.href || '';
        const isExternal = href.startsWith('http://') || href.startsWith('https://');
        return {
          tagName,
          attribs: {
            ...attribs,
            ...(isExternal ? { rel: 'noopener noreferrer nofollow', target: '_blank' } : {}),
          },
        };
      },
    },
    allowedStyles: {
      '*': {
        color: [/^[#\w(),.\s%-]+$/],
        'background-color': [/^[#\w(),.\s%-]+$/],
        'text-align': [/^(left|right|center|justify)$/],
        'text-indent': [/^[\d.-]+(px|em|rem|%|ch)?$/],
        'font-size': [/^[\d.]+(px|em|rem|%|pt)?$/],
        'font-weight': [/^[\w]+$/],
        'font-style': [/^[\w]+$/],
        'font-family': [/^[^;<>{}]+$/],
        'line-height': [/^[\d.]+(px|em|rem|%|pt)?$/],
        'letter-spacing': [/^[\d.-]+(px|em|rem)?$/],
        'text-decoration': [/^[\w\s-]+$/],
        margin: [/^[^;<>{}]+$/],
        'margin-top': [/^[^;<>{}]+$/],
        'margin-bottom': [/^[^;<>{}]+$/],
        'margin-left': [/^[^;<>{}]+$/],
        'margin-right': [/^[^;<>{}]+$/],
        padding: [/^[^;<>{}]+$/],
        'padding-top': [/^[^;<>{}]+$/],
        'padding-bottom': [/^[^;<>{}]+$/],
        'padding-left': [/^[^;<>{}]+$/],
        'padding-right': [/^[^;<>{}]+$/],
        border: [/^[#\w(),.\s%-]+$/],
        'border-radius': [/^[\d.\sa-z%-]+$/],
        width: [/^[\d.]+(px|em|rem|%|vw)?$/],
        'max-width': [/^[\d.]+(px|em|rem|%|vw)?$/],
        height: [/^[\d.]+(px|em|rem|%|vh)?$/],
        'max-height': [/^[\d.]+(px|em|rem|%|vh)?$/],
        display: [/^(inline|block|inline-block|flex|none)$/],
      },
    },
  });
}
