'use client';

import React, { useState, useEffect } from 'react';
import { Topic, AuthorProfile, RecommendedBook, CustomHtmlBlockData } from '../lib/types';
import { checkIsAdminClient, logoutAdmin } from '../lib/adminAuth';
import RecommendedBooksSection from './RecommendedBooksSection';
import EditAppModal from './admin/EditAppModal';
import AdminSettingsModal from './admin/AdminSettingsModal';
import WelcomeModal from './WelcomeModal';
import UserSyncModal from './UserSyncModal';
import PwaInstallModal from './PwaInstallModal';

interface HomeSectionsClientProps {
  initialSectionsOrder?: string[] | null;
  initialHiddenSections?: string[] | null;
  topicsWithCounts?: {
    topic: Topic;
    pageCount: number;
  }[];
  topicsTitle?: string | null;
  authorProfile?: AuthorProfile | null;
  recommendedBooksTitle?: string | null;
  recommendedBooksSubtitle?: string | null;
  recommendedBooks?: RecommendedBook[];
  initialBooksLayout?: 'bookshelf' | 'grid' | 'lookbook' | null;
  flatBooksTitle?: string | null;
  flatBooks?: RecommendedBook[];
  appName?: string | null;
  appSubtitle?: string | null;
  brandTagline?: string | null;
  logoUrl?: string | null;
  hotline?: string | null;
  zaloUrl?: string | null;
  welcomeTitle?: string | null;
  welcomeMessage?: string | null;
  welcomeVideoUrl?: string | null;
  initialCustomBlocks?: Record<string, CustomHtmlBlockData> | null;
}

export default function HomeSectionsClient({
  recommendedBooksTitle,
  recommendedBooksSubtitle,
  recommendedBooks = [],
  initialBooksLayout = 'bookshelf',
  appName: initialAppName,
  appSubtitle: initialAppSubtitle,
  brandTagline: initialBrandTagline,
  logoUrl: initialLogoUrl,
  hotline: initialHotline,
  zaloUrl: initialZaloUrl,
  welcomeTitle: initialWelcomeTitle,
  welcomeMessage: initialWelcomeMessage,
  welcomeVideoUrl: initialWelcomeVideoUrl,
}: HomeSectionsClientProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [appName, setAppName] = useState(initialAppName || 'Qbiz-ebook');
  const [appSubtitle, setAppSubtitle] = useState(initialAppSubtitle ?? '');
  const [brandTagline, setBrandTagline] = useState(
    initialBrandTagline !== undefined && initialBrandTagline !== null
      ? initialBrandTagline
      : 'EMPOWERING MEDICAL KNOWLEDGE'
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl || '/logo.png');
  const [hotline, setHotline] = useState(initialHotline || '');
  const [zaloUrl, setZaloUrl] = useState(initialZaloUrl || '');

  const [welcomeTitle, setWelcomeTitle] = useState(
    initialWelcomeTitle || 'Chào mừng bạn đến với Qbiz-ebook'
  );
  const [welcomeMessage, setWelcomeMessage] = useState(
    initialWelcomeMessage ||
      'Chào mừng bạn đến với không gian đọc sách điện tử chuyên nghiệp. Nơi lưu trữ, nghiên cứu và đọc các tài liệu, sách điện tử chuyên sâu với trải nghiệm lật trang sống động, tiện ích ghi chú thông minh và trợ lý AI đồng hành.'
  );
  const [welcomeVideoUrl, setWelcomeVideoUrl] = useState(initialWelcomeVideoUrl || '');

  // Modals state
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showEditAppModal, setShowEditAppModal] = useState(false);
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [showUserSync, setShowUserSync] = useState(false);
  const [showPwaInstall, setShowPwaInstall] = useState(false);

  useEffect(() => {
    checkIsAdminClient().then(setIsAdmin);
  }, []);

  useEffect(() => {
    if (initialAppName) setAppName(initialAppName);
    if (initialAppSubtitle) setAppSubtitle(initialAppSubtitle);
    if (initialLogoUrl) setLogoUrl(initialLogoUrl);
    if (initialHotline) setHotline(initialHotline);
    if (initialZaloUrl) setZaloUrl(initialZaloUrl);
    if (initialWelcomeTitle) setWelcomeTitle(initialWelcomeTitle);
    if (initialWelcomeMessage) setWelcomeMessage(initialWelcomeMessage);
    if (initialWelcomeVideoUrl) setWelcomeVideoUrl(initialWelcomeVideoUrl);
  }, [
    initialAppName,
    initialAppSubtitle,
    initialLogoUrl,
    initialHotline,
    initialZaloUrl,
    initialWelcomeTitle,
    initialWelcomeMessage,
    initialWelcomeVideoUrl,
  ]);

  const handleLogout = async () => {
    await logoutAdmin();
    setIsAdmin(false);
    window.location.reload();
  };

  return (
    <>
      {/* KHỐI DUY NHẤT TRÊN TOÀN BỘ TRANG CHỦ: GIAN TRƯNG BÀY KỆ SÁCH GỖ TÍCH HỢP TOÀN DIỆN */}
      <RecommendedBooksSection
        initialTitle={recommendedBooksTitle}
        initialSubtitle={recommendedBooksSubtitle}
        initialBooks={recommendedBooks}
        initialLayout="bookshelf"
        hotline={hotline}
        zaloUrl={zaloUrl}
        appName={appName}
        logoUrl={logoUrl}
        onOpenWelcome={() => setShowWelcomeModal(true)}
        onOpenAdminSettings={() => setShowAdminSettings(true)}
        onOpenEditApp={() => setShowEditAppModal(true)}
        onOpenUserSync={() => setShowUserSync(true)}
        onOpenPwaInstall={() => setShowPwaInstall(true)}
        onLogout={handleLogout}
      />

      {/* MODAL CÀI ĐẶT QUẢN TRỊ */}
      <AdminSettingsModal
        isOpen={showAdminSettings}
        onClose={() => setShowAdminSettings(false)}
        onLogout={handleLogout}
      />

      {/* MODAL SỬA THÔNG TIN ỨNG DỤNG / THƯƠNG HIỆU */}
      {showEditAppModal && (
        <EditAppModal
          isOpen={true}
          initialName={appName}
          initialSubtitle={appSubtitle}
          initialBrandTagline={brandTagline}
          initialLogoUrl={logoUrl}
          initialHotline={hotline}
          initialZaloUrl={zaloUrl}
          onClose={() => setShowEditAppModal(false)}
          onSaved={(newName, newSubtitle, newLogo, newHotline, newZalo, newTagline) => {
            setAppName(newName);
            setAppSubtitle(newSubtitle);
            if (newTagline !== undefined) setBrandTagline(newTagline);
            setLogoUrl(newLogo);
            setHotline(newHotline);
            setZaloUrl(newZalo);
            setShowEditAppModal(false);
          }}
        />
      )}

      {/* MODAL LỜI NGỎ & VIDEO GIỚI THIỆU */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        appName={appName}
        appSubtitle={appSubtitle}
        logoUrl={logoUrl}
        hotline={hotline}
        zaloUrl={zaloUrl}
        initialWelcomeTitle={welcomeTitle}
        initialWelcomeMessage={welcomeMessage}
        initialWelcomeVideoUrl={welcomeVideoUrl}
        isAdmin={isAdmin}
        onSaved={(newTitle, newMessage, newVideo) => {
          setWelcomeTitle(newTitle);
          setWelcomeMessage(newMessage);
          setWelcomeVideoUrl(newVideo);
        }}
      />

      {/* MODAL ĐỒNG BỘ TIẾN ĐỘ & ĐIỆN THOẠI */}
      <UserSyncModal
        isOpen={showUserSync}
        onClose={() => setShowUserSync(false)}
      />

      {/* MODAL CÀI ỨNG DỤNG RA MÀN HÌNH CHÍNH (PWA) */}
      <PwaInstallModal
        isOpen={showPwaInstall}
        onClose={() => setShowPwaInstall(false)}
      />
    </>
  );
}
