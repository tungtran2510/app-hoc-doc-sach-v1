import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Qbiz-ebook',
    short_name: 'Qbiz-ebook',
    description: 'Nền tảng đọc sách điện tử 3D và tra cứu tài liệu chuyên sâu',
    start_url: '/',
    id: 'qbiz-ebook-app',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#120a05',
    theme_color: '#120a05',
    lang: 'vi',
    icons: [
      {
        src: '/icon-192.png?v=25',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-192.png?v=25',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png?v=25',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-512.png?v=25',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/logo.png?v=25',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Kệ sách',
        short_name: 'Kệ sách',
        description: 'Mở kệ sách Qbiz-ebook',
        url: '/',
        icons: [{ src: '/icon-192.png?v=25', sizes: '192x192' }],
      },
      {
        name: 'Danh mục sách',
        short_name: 'Danh mục',
        description: 'Tra cứu danh mục sách & chuyên đề',
        url: '/danh-muc',
        icons: [{ src: '/icon-192.png?v=25', sizes: '192x192' }],
      },
      {
        name: 'Sách đã lưu',
        short_name: 'Đã lưu',
        description: 'Xem lại các sách và dấu trang đã lưu',
        url: '/da-luu',
        icons: [{ src: '/icon-192.png?v=25', sizes: '192x192' }],
      },
    ],
  };
}
