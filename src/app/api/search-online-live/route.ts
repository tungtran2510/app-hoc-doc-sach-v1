import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export interface LiveBookResult {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  format: 'pdf' | 'epub' | 'audio' | 'google-books';
  fileSizeFormatted?: string;
  pagesCount?: number;
  downloadUrl?: string;
  previewUrl?: string;
  badgeTag: string;
  source: string;
  publisher?: string;
  year?: string;
}

// Bảng ánh xạ các tác phẩm y học & kinh điển tiếng Việt đã được thẩm định bản gốc đầy đủ
const VERIFIED_COMMUNITY_MIRRORS: Record<
  string,
  {
    title: string;
    author: string;
    coverUrl: string;
    fileUrl: string;
    format: 'pdf' | 'epub';
    pagesCount: number;
    fileSizeFormatted: string;
    description: string;
    badgeTag: string;
  }
> = {
  'dinh duong hoc bi that truyen': {
    title: 'Dinh Dưỡng Học Bị Thất Truyền - Đẩy Lùi Bệnh Tật',
    author: 'Tiến sĩ, Bác sĩ Vương Đào (ĐH Y khoa Tokyo)',
    coverUrl: '/documents/covers/cover_dinh_duong_hoc_that_truyen.png',
    fileUrl: '/documents/dinh_duong_hoc_bi_that_truyen_goc.pdf',
    format: 'pdf',
    pagesCount: 136,
    fileSizeFormatted: '2.75 MB',
    description:
      'Bản gốc xuất bản toàn văn 136 trang của TS. BS. Vương Đào. Giải mã cơ chế tự chữa lành của cơ thể, phục hồi bệnh lý mãn tính, tim mạch, thoái hóa cột sống bằng dinh dưỡng tế bào.',
    badgeTag: 'BẢN GỐC 136 TRANG 🌟',
  },
  'nhan to enzyme': {
    title: 'Nhân Tố Enzyme - Phương Thức Sống Lành Mạnh',
    author: 'Bác sĩ Hiromi Shinya (Giáo sư Đại học Y Albert Einstein)',
    coverUrl: '/documents/covers/cover_nhan_to_enzyme.png',
    fileUrl: 'https://archive.org/download/nhan-to-enzyme-phuong-thuc-song-lanh-manh/Nhan_To_Enzyme.pdf',
    format: 'pdf',
    pagesCount: 208,
    fileSizeFormatted: '18.4 MB',
    description:
      'Kiệt tác y học nổi tiếng thế giới của BS. Hiromi Shinya. Khám phá chìa khóa enzyme diệu kỳ giúp duy trì tuổi trẻ, làm sạch đường ruột và ngăn ngừa bệnh tật từ gốc.',
    badgeTag: 'BẢN GỐC 208 TRANG 🌟',
  },
  'y hoc dinh duong': {
    title: 'Y Học Dinh Dưỡng - Những Điều Bác Sĩ Không Nói Với Bạn',
    author: 'Bác sĩ Ray D. Strand (Chuyên gia Thực dưỡng Hoa Kỳ)',
    coverUrl: '/documents/covers/cover_y_hoc_dinh_duong.png',
    fileUrl: 'https://archive.org/download/y-hoc-dinh-duong-nhung-dieu-bac-si-khong-noi-voi-ban/Y_Hoc_Dinh_Duong.pdf',
    format: 'pdf',
    pagesCount: 260,
    fileSizeFormatted: '22.1 MB',
    description:
      'Khám phá y học dự phòng dựa trên tế bào: Cách dùng vi chất dinh dưỡng và chất chống oxy hóa tự nhiên để bảo vệ cơ thể khỏi stress oxy hóa và bệnh thoái hóa.',
    badgeTag: 'BẢN GỐC 260 TRANG 🌟',
  },
  'the china study': {
    title: 'Bí Mật Dinh Dưỡng Cho Sức Khỏe Toàn Diện (The China Study)',
    author: 'TS. T. Colin Campbell & Thomas M. Campbell II',
    coverUrl: '/documents/covers/cover_china_study.png',
    fileUrl: 'https://archive.org/download/the-china-study-ban-tieng-viet/The_China_Study_Vietnamese.pdf',
    format: 'pdf',
    pagesCount: 420,
    fileSizeFormatted: '35 MB',
    description:
      'Công trình nghiên cứu về dinh dưỡng toàn diện và quy mô nhất trong lịch sử y học: Mối liên hệ mật thiết giữa chế độ ăn uống và nguy cơ ung thư, tim mạch, tiểu đường.',
    badgeTag: 'CÔNG TRÌNH THẾ KỶ 🌟',
  },
  'co the tu chua lanh': {
    title: 'Cơ Thể Tự Chữa Lành - Nước Ép Cần Tây & Thải Độc',
    author: 'Anthony William (Medical Medium)',
    coverUrl: '/documents/covers/cover_co_the_tu_chua_lanh.png',
    fileUrl: 'https://archive.org/download/co-the-tu-chua-lanh-anthony-william/Co_The_Tu_Chua_Lanh.pdf',
    format: 'pdf',
    pagesCount: 312,
    fileSizeFormatted: '26 MB',
    description:
      'Phương pháp phục hồi năng lượng sinh học tự nhiên, thanh lọc gan, giải độc tế bào và tái tạo hệ miễn dịch bằng thực phẩm tươi sống và nước ép thảo mộc.',
    badgeTag: 'BẢN GỐC 312 TRANG 🌟',
  },
  'dac nhan tam': {
    title: 'Đắc Nhân Tâm (How to Win Friends and Influence People)',
    author: 'Dale Carnegie (Bản dịch Nguyễn Hiến Lê)',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/9780671027032-M.jpg',
    fileUrl: '/documents/vietnam_dac_nhan_tam.epub',
    format: 'epub',
    pagesCount: 320,
    fileSizeFormatted: '1.2 MB',
    description:
      'Tác phẩm kinh điển thế giới về nghệ thuật giao tiếp, thấu hiểu lòng người và xây dựng mối quan hệ chân thành.',
    badgeTag: 'KINH ĐIỂN TOÀN CẦU 🌟',
  },
};

function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * API Tìm kiếm sách trực tuyến thời gian thực đa nguồn (Omni Live Book Search Engine)
 * - Nguồn 1: Kho thẩm định trực tiếp (Verified Community Mirrors: Sách PDF/EPUB thật 100%)
 * - Nguồn 2: Google Books API (Hàng triệu đầu sách tiếng Việt & quốc tế, metadata chuẩn NXB)
 * - Nguồn 3: Internet Archive Texts API (Kho tài liệu mở số hóa PDF scan)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], query: q || '', page: 1, hasMore: false });
  }

  const cleanQuery = removeVietnameseTones(q);
  const results: LiveBookResult[] = [];
  const seenTitles = new Set<string>();

  // 1. Kiểm tra nguồn thẩm định cộng đồng (Chỉ nạp ở trang đầu tiên page === 1)
  if (page === 1) {
    for (const [key, book] of Object.entries(VERIFIED_COMMUNITY_MIRRORS)) {
      if (cleanQuery.includes(key) || key.includes(cleanQuery)) {
        const normTitle = removeVietnameseTones(book.title);
        if (!seenTitles.has(normTitle)) {
        results.push({
          id: `verified-${key}`,
          title: book.title,
          author: book.author,
          description: book.description,
          coverUrl: book.coverUrl,
          format: book.format,
          fileSizeFormatted: book.fileSizeFormatted,
          pagesCount: book.pagesCount,
          downloadUrl: book.fileUrl.startsWith('http')
            ? `/api/download-proxy?url=${encodeURIComponent(book.fileUrl)}`
            : book.fileUrl,
          badgeTag: book.badgeTag,
          source: 'Thư Viện Thẩm Định Gốc',
        });
        seenTitles.add(normTitle);
        }
      }
    }
  }

  // 2. Tìm kiếm qua Google Books API
  try {
    const gbController = new AbortController();
    const gbTimeout = setTimeout(() => gbController.abort(), 6000); // 6s timeout
    const gbStartIndex = (page - 1) * 10;

    const gbRes = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
        q
      )}&maxResults=10&startIndex=${gbStartIndex}&printType=books`,
      {
        signal: gbController.signal,
        headers: {
          'User-Agent': 'QbizBooks/2.0 (GoogleBooksClient)',
          Accept: 'application/json',
        },
      }
    );
    clearTimeout(gbTimeout);

    if (gbRes.ok) {
      const gbData = await gbRes.json();
      if (Array.isArray(gbData.items)) {
        for (const item of gbData.items) {
          const info = item.volumeInfo || {};
          const title = info.title || '';
          if (!title) continue;

          const normTitle = removeVietnameseTones(title);
          if (seenTitles.has(normTitle)) continue;

          const authors =
            Array.isArray(info.authors) && info.authors.length > 0
              ? info.authors.join(', ')
              : 'Nhiều tác giả';

          let cover =
            info.imageLinks?.thumbnail ||
            info.imageLinks?.smallThumbnail ||
            info.imageLinks?.medium ||
            '';
          if (cover && cover.startsWith('http://')) {
            cover = cover.replace('http://', 'https://');
          }

          const pageCount = info.pageCount;
          const accessInfo = item.accessInfo || {};
          const hasEpub = accessInfo.epub?.isAvailable;
          const hasPdf = accessInfo.pdf?.isAvailable;

          let format: 'pdf' | 'epub' | 'google-books' = 'google-books';
          let dlUrl: string | undefined = undefined;

          if (hasPdf && accessInfo.pdf?.downloadLink) {
            format = 'pdf';
            dlUrl = `/api/download-proxy?url=${encodeURIComponent(accessInfo.pdf.downloadLink)}`;
          } else if (hasEpub && accessInfo.epub?.downloadLink) {
            format = 'epub';
            dlUrl = `/api/download-proxy?url=${encodeURIComponent(accessInfo.epub.downloadLink)}`;
          } else if (info.previewLink) {
            dlUrl = info.previewLink;
          }

          results.push({
            id: `gb-${item.id}`,
            title: title,
            author: authors,
            description:
              info.description ||
              `Tác phẩm xuất bản chính thức. ${info.publisher ? `Nhà xuất bản: ${info.publisher}. ` : ''}${pageCount ? `Độ dài: ${pageCount} trang.` : ''}`,
            coverUrl: cover || '/documents/covers/cover_dinh_duong_hoc_that_truyen.png',
            format: format,
            pagesCount: pageCount || undefined,
            fileSizeFormatted: pageCount ? `${pageCount} trang` : 'Sách xuất bản',
            downloadUrl: dlUrl,
            previewUrl: info.previewLink,
            badgeTag: pageCount ? `${pageCount} TRANG 📖` : 'XUẤT BẢN THẬT',
            source: info.publisher || 'Google Books',
            publisher: info.publisher,
            year: info.publishedDate ? info.publishedDate.substring(0, 4) : undefined,
          });
          seenTitles.add(normTitle);
        }
      }
    }
  } catch (err) {
    console.error('Lỗi khi truy vấn Google Books:', err);
  }

  // 3. Tìm kiếm qua Internet Archive API (Các ấn phẩm tiếng Việt và tài liệu y khoa mở)
  try {
    const iaController = new AbortController();
    const iaTimeout = setTimeout(() => iaController.abort(), 6000);

    const iaRes = await fetch(
      `https://archive.org/advancedsearch.php?q=(title:(${encodeURIComponent(
        q
      )})+OR+(${encodeURIComponent(
        q
      )}))+AND+mediatype:(texts)&fl[]=identifier,title,creator,description,year&rows=8&page=${page}&output=json`,
      {
        signal: iaController.signal,
        headers: {
          'User-Agent': 'QbizBooks/2.0 (InternetArchiveClient)',
          Accept: 'application/json',
        },
      }
    );
    clearTimeout(iaTimeout);

    if (iaRes.ok) {
      const iaData = await iaRes.json();
      const docs = iaData.response?.docs;
      if (Array.isArray(docs)) {
        for (const doc of docs) {
          const title = doc.title || '';
          if (!title || !doc.identifier) continue;

          const normTitle = removeVietnameseTones(title);
          if (seenTitles.has(normTitle)) continue;

          const id = doc.identifier;
          const pdfRawUrl = `https://archive.org/download/${id}/${id}.pdf`;
          const proxyDlUrl = `/api/download-proxy?url=${encodeURIComponent(pdfRawUrl)}`;

          results.push({
            id: `ia-${id}`,
            title: title,
            author: doc.creator || 'Lưu trữ Thư viện Mở',
            description:
              (typeof doc.description === 'string'
                ? doc.description
                : Array.isArray(doc.description)
                ? doc.description.join(' ')
                : '') || 'Bản số hóa tài liệu từ Internet Archive.',
            coverUrl: `https://archive.org/services/img/${id}`,
            format: 'pdf',
            fileSizeFormatted: 'PDF Bản Gốc',
            downloadUrl: proxyDlUrl,
            previewUrl: `https://archive.org/details/${id}`,
            badgeTag: 'ARCHIVE GỐC 🏛️',
            source: 'Internet Archive',
            year: doc.year ? String(doc.year) : undefined,
          });
          seenTitles.add(normTitle);
        }
      }
    }
  } catch (err) {
    console.error('Lỗi khi truy vấn Internet Archive:', err);
  }

  // 4. Tìm kiếm qua Open Library API (Kho sách mở toàn cầu & Ebook Catalog)
  try {
    const olController = new AbortController();
    const olTimeout = setTimeout(() => olController.abort(), 6000);

    const olRes = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8&page=${page}`,
      {
        signal: olController.signal,
        headers: {
          'User-Agent': 'QbizBooks/2.0 (OpenLibraryClient)',
          Accept: 'application/json',
        },
      }
    );
    clearTimeout(olTimeout);

    if (olRes.ok) {
      const olData = await olRes.json();
      const docs = olData.docs;
      if (Array.isArray(docs)) {
        for (const doc of docs) {
          const title = doc.title || '';
          if (!title) continue;

          const normTitle = removeVietnameseTones(title);
          if (seenTitles.has(normTitle)) continue;

          const authors =
            Array.isArray(doc.author_name) && doc.author_name.length > 0
              ? doc.author_name.join(', ')
              : 'Nhiều tác giả';

          let coverUrl = '';
          if (doc.cover_i) {
            coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
          } else if (doc.isbn && doc.isbn[0]) {
            coverUrl = `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`;
          }

          const pages = doc.number_of_pages_median || undefined;
          let dlUrl: string | undefined = undefined;
          let format: 'pdf' | 'epub' = 'pdf';

          if (doc.ia && Array.isArray(doc.ia) && doc.ia.length > 0) {
            const iaId = doc.ia[0];
            const pdfUrl = `https://archive.org/download/${iaId}/${iaId}.pdf`;
            dlUrl = `/api/download-proxy?url=${encodeURIComponent(pdfUrl)}`;
            format = 'pdf';
          }

          results.push({
            id: `ol-${doc.key?.replace(/\//g, '-') || Math.random().toString(36).substring(7)}`,
            title: title,
            author: authors,
            description: `Tác phẩm tra cứu từ Thư viện Mở Quốc Tế (Open Library). ${doc.first_publish_year ? `Năm xuất bản đầu: ${doc.first_publish_year}. ` : ''}${pages ? `Độ dài: ${pages} trang.` : ''}`,
            coverUrl: coverUrl || '/documents/covers/cover_dinh_duong_hoc_that_truyen.png',
            format: format,
            pagesCount: pages,
            fileSizeFormatted: pages ? `${pages} trang` : 'Sách mở',
            downloadUrl: dlUrl,
            previewUrl: doc.key ? `https://openlibrary.org${doc.key}` : undefined,
            badgeTag: dlUrl ? 'BẢN SỐ HÓA 📖' : 'THƯ VIỆN MỞ 🌐',
            source: 'Open Library',
            year: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
          });
          seenTitles.add(normTitle);
        }
      }
    }
  } catch (err) {
    console.error('Lỗi khi truy vấn Open Library:', err);
  }

  // Sắp xếp thông minh: Các tác phẩm khớp sát nhất với tiêu đề tìm kiếm được ưu tiên hàng đầu
  const normQ = removeVietnameseTones(q.toLowerCase());
  results.sort((a, b) => {
    const normA = removeVietnameseTones(a.title.toLowerCase());
    const normB = removeVietnameseTones(b.title.toLowerCase());
    const matchA = normA === normQ ? 100 : normA.startsWith(normQ) ? 80 : normA.includes(normQ) ? 50 : 0;
    const matchB = normB === normQ ? 100 : normB.startsWith(normQ) ? 80 : normB.includes(normQ) ? 50 : 0;
    return matchB - matchA;
  });

  return NextResponse.json({
    query: q,
    page: page,
    count: results.length,
    hasMore: results.length >= 4,
    results: results,
  });
}
