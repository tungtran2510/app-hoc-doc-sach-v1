import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Proxy an toàn cho các tệp sách trực tuyến từ các kho mở quốc tế (Gutenberg, Internet Archive)
 * Giúp tránh triệt để lỗi CORS "Failed to fetch" trên trình duyệt điện thoại và máy tính
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json(
      { error: 'Thiếu tham số url.' },
      { status: 400 }
    );
  }

  try {
    const parsed = new URL(targetUrl);
    // Chỉ cho phép các giao thức http/https hợp lệ
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return NextResponse.json(
        { error: 'Giao thức URL không hợp lệ.' },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

    const upstreamRes = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 QbizBooks/1.0',
        Accept: '*/*',
      },
    });

    clearTimeout(timeout);

    if (!upstreamRes.ok) {
      return NextResponse.json(
        {
          error: `Máy chủ nguồn từ chối hoặc tệp không tồn tại (Mã ${upstreamRes.status}).`,
        },
        { status: upstreamRes.status }
      );
    }

    const contentType =
      upstreamRes.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = upstreamRes.headers.get('content-disposition');

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

    if (contentDisposition) {
      headers.set('Content-Disposition', contentDisposition);
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    const isAbort = err.name === 'AbortError';
    return NextResponse.json(
      {
        error: isAbort
          ? 'Quá thời gian tải tệp từ máy chủ nguồn (Timeout).'
          : `Lỗi kết nối máy chủ nguồn: ${err.message || 'Không xác định'}`,
      },
      { status: 502 }
    );
  }
}
