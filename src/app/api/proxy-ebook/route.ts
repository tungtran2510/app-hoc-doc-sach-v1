import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '../../../lib/authServer';
import { safeFetchWithRedirects, validateSafeUrl } from '../../../lib/ssrfProtection';

export const dynamic = 'force-dynamic';

/**
 * Proxy an toàn cho các tệp sách trực tuyến từ các kho mở quốc tế (Gutenberg, Internet Archive)
 * - Giúp tránh triệt để lỗi CORS "Failed to fetch" trên trình duyệt điện thoại và máy tính
 * - Bảo mật: Chặn SSRF toàn diện (private IPs, loopback, cloud metadata 169.254, internal hostnames)
 * - Kiểm tra an toàn cho mọi bước chuyển hướng (Redirect manual validation, tối đa 3 hops)
 * - Giới hạn tần suất: 30 lượt / 10 phút
 */

export async function GET(request: NextRequest) {
  // 1. Giới hạn tần suất gọi API theo địa chỉ IP
  const clientIp = getClientIp(request);
  if (!rateLimit(`proxy-ebook:${clientIp}`, 30, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Bạn gửi quá nhiều yêu cầu tải sách. Vui lòng thử lại sau 10 phút.' },
      { status: 429 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json(
      { error: 'Thiếu tham số url.' },
      { status: 400 }
    );
  }

  // 2. Kiểm tra tính hợp lệ và chặn SSRF tại điểm đầu
  const validation = validateSafeUrl(targetUrl);
  if (!validation.ok) {
    const isPrivate = validation.error?.includes('nội bộ');
    return NextResponse.json(
      { error: validation.error },
      { status: isPrivate ? 403 : 400 }
    );
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

    let fetchResult;
    try {
      fetchResult = await safeFetchWithRedirects(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 QbizBooks/1.0',
          Accept: '*/*',
        },
      });
    } catch (fetchErr: any) {
      if (fetchErr?.message?.includes('SSRF_BLOCKED')) {
        clearTimeout(timeout);
        return NextResponse.json(
          { error: 'Truy cập dải mạng nội bộ hoặc chuyển hướng không an toàn bị từ chối vì lý do bảo mật.' },
          { status: 403 }
        );
      }
      if (fetchErr?.message?.includes('TOO_MANY_REDIRECTS')) {
        clearTimeout(timeout);
        return NextResponse.json(
          { error: 'Tệp nguồn chuyển hướng quá nhiều lần (tối đa 3 lần).' },
          { status: 400 }
        );
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeout);
    }

    const { response: upstreamRes } = fetchResult;

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
