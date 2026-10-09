import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '../../../lib/authServer';
import { safeFetchWithRedirects, validateSafeUrl } from '../../../lib/ssrfProtection';

export const dynamic = 'force-dynamic';

/**
 * API Proxy Tải Sách Trực Tuyến Vượt Rào CORS (CORS-Bypass Download Proxy)
 * - Cho phép tải mượt mà mọi tệp sách (.epub, .pdf, .cbz) từ các nguồn trực tuyến (Gutenberg, Standard Ebooks, Internet Archive...)
 * - Bảo mật: Chặn SSRF toàn diện (IPv4/IPv6 private ranges, cloud metadata 169.254, loopback, internal domains)
 * - Kiểm tra an toàn cho mọi bước chuyển hướng (Redirect manual validation, tối đa 3 hops)
 * - Giới hạn tần suất: 30 lượt / 10 phút
 * - Giới hạn dung lượng tệp: tối đa 500MB
 */

export async function GET(req: NextRequest) {
  try {
    // 1. Giới hạn tần suất gọi API
    const clientIp = getClientIp(req);
    if (!rateLimit(`download-proxy:${clientIp}`, 30, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Bạn gửi quá nhiều yêu cầu tải sách. Vui lòng thử lại sau 10 phút.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'Thiếu tham số url tải tệp sách' },
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

    const parsedUrl = validation.parsedUrl!;

    // 3. Tải tệp an toàn qua safeFetchWithRedirects (chặn SSRF nếu bị chuyển hướng 3xx)
    let fetchResult;
    try {
      fetchResult = await safeFetchWithRedirects(targetUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 QbizEbook/2.0',
          Accept: '*/*',
        },
      });
    } catch (err: any) {
      if (err?.message?.includes('SSRF_BLOCKED')) {
        return NextResponse.json(
          { error: 'Truy cập dải mạng nội bộ hoặc chuyển hướng không an toàn bị từ chối' },
          { status: 403 }
        );
      }
      if (err?.message?.includes('TOO_MANY_REDIRECTS')) {
        return NextResponse.json(
          { error: 'Tệp nguồn chuyển hướng quá nhiều lần (tối đa 3 lần)' },
          { status: 400 }
        );
      }
      throw err;
    }

    const { response, finalUrl } = fetchResult;

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
    const finalParsed = new URL(finalUrl);
    const pathParts = finalParsed.pathname.split('/');
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
