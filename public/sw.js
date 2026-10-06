// Service Worker PWA Chuyên Nghiệp Cho Qbiz-ebook
// Cập nhật phiên bản v28: Thanh lọc toàn bộ đường dẫn cũ, xóa 404 và triệt tiêu lỗi chunk mismatch

const CACHE_NAME = 'qbiz-ebook-shell-v28';
const STATIC_ASSETS_CACHE = 'qbiz-ebook-static-v28';

// Chỉ cache các route thực tế tồn tại trong ứng dụng
const PRECACHE_SHELL_URLS = [
  '/',
  '/danh-muc',
  '/da-luu',
  '/tim-kiem',
  '/tro-ly-ai',
  '/dang-nhap',
  '/favicon.ico',
  '/apple-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.webmanifest',
];

// Cài đặt SW & Tải sẵn Shell ngầm vào điện thoại
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_SHELL_URLS).catch((err) => {
        console.warn('[SW] Pre-caching partial failure, continuing:', err);
      });
    })
  );
});

// Kích hoạt SW & Dọn dẹp TOÀN BỘ cache cũ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== STATIC_ASSETS_CACHE) {
            console.log('[SW] Purging old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Điều phối yêu cầu mạng & Bộ nhớ đệm (Caching & Fetching Strategy)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Chỉ áp dụng cho yêu cầu GET
  if (request.method !== 'GET') return;

  // 2. Không can thiệp các luồng stream video YouTube hoặc file tài liệu lớn
  if (
    url.hostname.includes('youtube.com') ||
    url.hostname.includes('googlevideo.com') ||
    url.hostname.includes('ytimg.com') ||
    url.pathname.endsWith('.pdf') ||
    url.pathname.includes('/documents/pdf/') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // 2b. MANIFEST & BRAND ICONS: Network-first
  if (
    url.pathname.startsWith('/manifest.') ||
    url.pathname === '/icon-192.png' ||
    url.pathname === '/icon-512.png' ||
    url.pathname === '/apple-icon.png' ||
    url.pathname === '/favicon.ico'
  ) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(STATIC_ASSETS_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 3. Next.js App Router RSC Payloads: NETWORK FIRST (Tránh chunk version mismatch trên điện thoại)
  const isRSC = url.searchParams.has('_rsc') || request.headers.get('rsc') === '1' || request.headers.get('RSC') === '1';
  if (isRSC) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || new Response('Offline', { status: 503 });
        })
    );
    return;
  }

  // 4. Với các file tĩnh Next.js (_next/static, CSS, JS, fonts, images):
  // Chiến lược: STALE WHILE REVALIDATE an toàn
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.open(STATIC_ASSETS_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 5. Với các trang điều hướng HTML: NETWORK FIRST
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(request);
          return cached || caches.match('/');
        })
    );
    return;
  }
});
