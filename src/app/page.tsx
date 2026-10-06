import React from 'react';
import { getSettings } from '../lib/data';
import HomeSectionsClient from '../components/HomeSectionsClient';
import BottomNav from '../components/BottomNav';
import FloatingAiButton from '../components/FloatingAiButton';
import QbizBooksOpeningSplash from '../components/QbizBooksOpeningSplash';
import { Metadata } from 'next';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: `${settings?.app_name || 'Qbiz Books'} · Tủ Sách Y Khoa`,
    description: 'Thư viện sách y khoa điện tử và cẩm nang chăm sóc sức khỏe chủ động',
  };
}

export default async function HomePage() {
  const settings = await getSettings();

  return (
    <main className="flex-1 flex flex-col px-3 sm:px-4 pt-2.5 pb-24 gap-3 max-w-[480px] md:max-w-[768px] lg:max-w-[880px] mx-auto w-full">
      {/* Hiệu ứng 3D mở sách Qbiz Books khi vào trang chủ */}
      <QbizBooksOpeningSplash />

      {/* Toàn bộ Gian trưng bày kệ sách gỗ toàn diện (Tích hợp thương hiệu, lời chào, cài đặt và các tầng sách) */}
      <HomeSectionsClient
        initialSectionsOrder={settings.home_sections_order}
        initialHiddenSections={settings.hidden_home_sections}
        authorProfile={settings.author_profile}
        recommendedBooksTitle={settings.recommended_books_title}
        recommendedBooksSubtitle={settings.recommended_books_subtitle}
        recommendedBooks={settings.recommended_books}
        initialBooksLayout={settings.recommended_books_layout}
        flatBooksTitle={settings.flat_books_title}
        flatBooks={settings.flat_books}
        appName={settings.app_name}
        appSubtitle={settings.app_subtitle}
        brandTagline={settings.brand_tagline}
        logoUrl={settings.logo_url}
        hotline={settings.hotline}
        zaloUrl={settings.zalo_url}
        welcomeTitle={settings.welcome_title}
        welcomeMessage={settings.welcome_message}
        welcomeVideoUrl={settings.welcome_video_url}
        initialCustomBlocks={settings.home_custom_blocks}
      />

      {/* Nút nhỏ bán trong suốt bám đuổi ở trên: Hỏi AI Tra cứu sách */}
      <FloatingAiButton />

      {/* Thanh điều hướng dưới cùng */}
      <BottomNav />
    </main>
  );
}
