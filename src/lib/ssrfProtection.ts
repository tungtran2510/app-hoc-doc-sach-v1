import net from 'net';

/**
 * Kiểm tra xem hostname/IP có trỏ về mạng nội bộ, metadata dịch vụ cloud hoặc dải IP cấm (SSRF) hay không.
 */
export function isPrivateHost(rawHost: string): boolean {
  if (!rawHost) return true;
  const host = rawHost.toLowerCase().trim().replace(/^\[|\]$/g, '');

  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::' ||
    host === '::1' ||
    host === '0:0:0:0:0:0:0:0' ||
    host === '0:0:0:0:0:0:0:1'
  ) {
    return true;
  }

  // Tên miền nội bộ phổ biến
  if (
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost') ||
    host.endsWith('.lan') ||
    host.endsWith('.localdomain') ||
    host.endsWith('.home.arpa')
  ) {
    return true;
  }

  // Chặn biểu diễn số nguyên / hex / octal (ví dụ: 2130706433, 0x7f000001, 0177.0.0.1)
  if (/^0x[0-9a-f]+$/i.test(host) || /^\d+$/.test(host)) {
    return true;
  }

  // Kiểm tra IPv4 chuẩn (dotted-decimal)
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1).map(Number);
    if (octets.some((o) => o < 0 || o > 255)) return true;
    const [o1, o2] = octets;

    // 0.0.0.0/8 (Mạng hiện tại / mặc định)
    if (o1 === 0) return true;
    // 10.0.0.0/8 (Mạng riêng cục bộ RFC 1918)
    if (o1 === 10) return true;
    // 127.0.0.0/8 (Loopback)
    if (o1 === 127) return true;
    // 169.254.0.0/16 (Link-local & Cloud metadata: AWS, GCP, Azure, OpenStack)
    if (o1 === 169 && o2 === 254) return true;
    // 172.16.0.0/12 (172.16.0.0 -> 172.31.255.255)
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;
    // 192.168.0.0/16 (Mạng gia đình / văn phòng RFC 1918)
    if (o1 === 192 && o2 === 168) return true;
    // 100.64.0.0/10 (Carrier-Grade NAT)
    if (o1 === 100 && o2 >= 64 && o2 <= 127) return true;
    // 192.0.0.0/24 & 192.0.2.0/24 (TEST-NET)
    if (o1 === 192 && o2 === 0) return true;
    // 198.18.0.0/15 (Benchmarking)
    if (o1 === 198 && (o2 === 18 || o2 === 19)) return true;
    // 198.51.100.0/24 & 203.0.113.0/24 (TEST-NET-2, TEST-NET-3)
    if (o1 === 198 && o2 === 51) return true;
    if (o1 === 203 && o2 === 0) return true;
    // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
    if (o1 >= 224) return true;

    return false;
  }

  // Kiểm tra IPv6
  if (host.startsWith('::ffff:')) {
    const v4Part = host.replace('::ffff:', '');
    return isPrivateHost(v4Part);
  }
  // fc00::/7 (Unique Local Address - ULA)
  if (host.startsWith('fc') || host.startsWith('fd')) return true;
  // fe80::/10 (Link-Local)
  if (/^fe[89ab]/i.test(host)) return true;

  if (net.isIPv6(host)) {
    // Các địa chỉ IPv6 chưa gán hoặc đặc biệt
    return host === '::' || host === '::1';
  }

  return false;
}

export function validateSafeUrl(rawUrl: string): { ok: boolean; parsedUrl?: URL; error?: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { ok: false, error: 'Thiếu tham số url tải tệp' };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, error: 'Đường dẫn tệp không hợp lệ' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Giao thức không được hỗ trợ (chỉ chấp nhận HTTP/HTTPS)' };
  }

  if (isPrivateHost(parsed.hostname)) {
    return { ok: false, error: 'Truy cập dải mạng nội bộ bị từ chối vì lý do an toàn' };
  }

  return { ok: true, parsedUrl: parsed };
}

export interface SafeFetchResult {
  response: Response;
  finalUrl: string;
}

/**
 * Thực hiện tải dữ liệu ngoại vi với kiểm tra SSRF trên mọi bước chuyển hướng (Redirect Validation).
 * - Sử dụng redirect: 'manual'
 * - Tối đa 3 lần chuyển hướng
 * - Mỗi bước chuyển hướng đều kiểm tra lại giao thức và dải IP đích
 */
export async function safeFetchWithRedirects(
  initialUrl: string,
  options: {
    headers?: Record<string, string>;
    signal?: AbortSignal;
    maxHops?: number;
  } = {}
): Promise<SafeFetchResult> {
  const maxHops = options.maxHops ?? 3;
  let currentUrl = initialUrl;
  let hops = 0;

  while (hops <= maxHops) {
    const check = validateSafeUrl(currentUrl);
    if (!check.ok) {
      throw new Error(`SSRF_BLOCKED: ${check.error}`);
    }

    const res = await fetch(currentUrl, {
      method: 'GET',
      headers: options.headers,
      signal: options.signal,
      redirect: 'manual', // KHÔNG tự động chuyển hướng để ngăn chặn lừa đảo SSRF qua 3xx
    });

    const isRedirect = [301, 302, 303, 307, 308].includes(res.status);
    if (isRedirect) {
      const location = res.headers.get('location');
      if (!location) {
        return { response: res, finalUrl: currentUrl };
      }

      hops += 1;
      if (hops > maxHops) {
        throw new Error('TOO_MANY_REDIRECTS: Quá số lần chuyển hướng cho phép (tối đa 3 lần)');
      }

      const nextUrl = new URL(location, currentUrl).toString();
      const redirectCheck = validateSafeUrl(nextUrl);
      if (!redirectCheck.ok) {
        throw new Error(`SSRF_BLOCKED: Chuyển hướng đến địa chỉ bị cấm (${redirectCheck.error})`);
      }

      currentUrl = nextUrl;
      continue;
    }

    return { response: res, finalUrl: currentUrl };
  }

  throw new Error('TOO_MANY_REDIRECTS: Quá số lần chuyển hướng cho phép');
}
