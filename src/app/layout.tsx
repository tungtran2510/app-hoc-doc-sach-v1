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
  title: 'Qbiz Books · Tủ Sách Y Khoa & Khám Phá Cơ Thể',
  description: 'Ứng dụng học hiểu kiến thức về cơ thể theo lộ trình tương tác',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon-192.png?v=22', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png?v=22', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico?v=22' },
    ],
    apple: [
      { url: '/apple-icon.png?v=22', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Qbiz Books',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
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
        <meta name="theme-color" id="app-theme-color" content="#160e08" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png?v=22" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png?v=22" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon.png?v=22" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.classList.add('dark');var color='#160e08';var m=document.getElementById('app-theme-color')||document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement('meta');m.id='app-theme-color';m.name='theme-color';document.head.appendChild(m)}m.setAttribute('content',color);m.removeAttribute('media');var all=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<all.length;i++){if(all[i]!==m){all[i].remove()}}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${beVietnamPro.className} bg-[#160e08] text-[#fdf7ee] min-h-screen flex justify-center selection:bg-amber-900 selection:text-amber-100`}>
        <PwaRegistrar />
        <div className="w-full max-w-[480px] md:max-w-[820px] lg:max-w-[820px] min-h-screen bg-[#160e08] relative flex flex-col mx-auto shadow-2xl transition-all">
          {children}
        </div>
      </body>
    </html>
  );
}
