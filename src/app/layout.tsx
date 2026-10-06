import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Lora, Inter } from 'next/font/google';
import './globals.css';
import PwaRegistrar from '../components/PwaRegistrar';

const beVietnamPro = Be_Vietnam_Pro({
  weight: ['400', '500', '600', '700', '800', '900'],
  subsets: ['vietnamese', 'latin'],
  variable: '--font-be-vietnam-pro',
  display: 'swap',
});

const lora = Lora({
  weight: ['400', '500', '600', '700'],
  subsets: ['vietnamese', 'latin'],
  variable: '--font-lora',
  display: 'swap',
});

const inter = Inter({
  weight: ['400', '500', '600', '700'],
  subsets: ['vietnamese', 'latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Qbiz-ebook · Tủ Sách Điện Tử & Y Khoa',
  description: 'Nền tảng đọc sách điện tử 3D và tra cứu tài liệu chuyên sâu',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon-192.png?v=25', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png?v=25', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico?v=25' },
    ],
    apple: [
      { url: '/apple-icon.png?v=25', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Qbiz-ebook',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#1c1109',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} ${lora.variable} ${inter.variable} ${beVietnamPro.className}`}>
      <head>
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('giao_dien');if(t==='light'){document.documentElement.classList.remove('dark');}else{document.documentElement.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`,
          }}
        />
      </head>
      <body className={`${beVietnamPro.className} bg-[#f8f5f0] dark:bg-[#160e08] text-[#29180c] dark:text-[#fdf7ee] min-h-screen flex justify-center selection:bg-amber-900 selection:text-amber-100 transition-colors duration-200`}>
        <PwaRegistrar />
        <div className="w-full max-w-[480px] md:max-w-[820px] lg:max-w-[820px] min-h-screen bg-[#f8f5f0] dark:bg-[#160e08] text-[#29180c] dark:text-[#fdf7ee] relative flex flex-col mx-auto shadow-2xl transition-colors duration-200">
          {children}
        </div>
      </body>
    </html>
  );
}
