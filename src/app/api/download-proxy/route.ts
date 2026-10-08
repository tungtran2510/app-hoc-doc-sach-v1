import { NextRequest, NextResponse } from 'next/server';

/**
 * API Proxy Tải Sách Trực Tuyến Vượt Rào CORS (CORS-Bypass Download Proxy)
 * - Cho phép tải mượt mà mọi tệp sách (.epub, .pdf, .cbz) từ các nguồn trực tuyến (Gutenberg, Standard Ebooks, Internet Archive, Drive, GitHub...)
 * - Bảo mật: Chặn SSRF (ngăn chặn truy cập vào dải IP nội bộ/localhost)
 * - Hạn chế dung lượng tệp hợp lý (tối đa 120MB)
 */

function isPrivateIp(hostname: string): boolean {
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('172.16.') ||
    hostname.startsWith('172.17.') ||
    hostname.startsWith('172.18.') ||
    hostname.startsWith('172.19.') ||
    hostname.startsWith('172.20.') ||
    hostname.startsWith('172.21.') ||
    hostname.startsWith('172.22.') ||
    hostname.startsWith('172.23.') ||
    hostname.startsWith('172.24.') ||
    hostname.startsWith('172.25.') ||
    hostname.startsWith('172.26.') ||
    hostname.startsWith('172.27.') ||
    hostname.startsWith('172.28.') ||
    hostname.startsWith('172.29.') ||
    hostname.startsWith('172.30.') ||
    hostname.startsWith('172.31.') ||
    hostname.endsWith('.local')
  ) {
    return true;
  }
  return false;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'Thiếu tham số url tải tệp sách' },
        { status: 400 }
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return NextResponse.json(
        { error: 'Đường dẫn tệp không hợp lệ' },
        { status: 400 }
      );
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json(
        { error: 'Giao thức không được hỗ trợ (chỉ chấp nhận HTTP/HTTPS)' },
        { status: 400 }
      );
    }

    if (isPrivateIp(parsedUrl.hostname)) {
      return NextResponse.json(
        { error: 'Truy cập dải mạng nội bộ bị từ chối vì lý do an toàn' },
        { status: 403 }
      );
    }

    // Tải tệp từ nguồn ngoại vi
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 QbizEbook/2.0',
        Accept: '*/*',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Không thể tải tệp từ nguồn ngoại vi (Mã phản hồi HTTP ${response.status})`,
        },
        { status: response.status }
      );
    }

    const contentType =
      response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');

    // Chặn các file quá lớn (> 500MB) để tránh quá tải bộ nhớ máy chủ
    if (contentLength && parseInt(contentLength, 10) > 500 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Kích thước tệp vượt quá giới hạn cho phép (tối đa 500MB)' },
        { status: 413 }
      );
    }

    const arrayBuffer = await response.arrayBuffer();

    // Xác định tên tệp
    let filename = 'downloaded_ebook';
    const pathParts = parsedUrl.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && lastPart.includes('.')) {
      filename = lastPart;
    } else {
      if (contentType.includes('epub')) filename += '.epub';
      else if (contentType.includes('pdf')) filename += '.pdf';
      else if (contentType.includes('zip') || contentType.includes('cbz'))
        filename += '.cbz';
    }

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': arrayBuffer.byteLength.toString(),
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error:
          'Lỗi khi xử lý proxy tải sách: ' +
          (err?.message || 'Không rõ nguyên nhân'),
      },
      { status: 500 }
    );
  }
}
