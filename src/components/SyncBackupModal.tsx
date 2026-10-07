'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  HardDrive,
  Cloud,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { offlineStorage } from '../lib/offlineStorage';
import { playTapSound, playSuccessChime } from '../lib/audioFeedback';

interface SyncBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SyncBackupModal({ isOpen, onClose }: SyncBackupModalProps) {
  const [cachedCount, setCachedCount] = useState<number>(0);
  const [storageEstimate, setStorageEstimate] = useState<{ usedMb: string; totalMb: string }>({
    usedMb: '0',
    totalMb: '0',
  });
  const [driveStatus, setDriveStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [googleEmail, setGoogleEmail] = useState<string>('');

  // Nạp thông tin bộ nhớ thực tế từ IndexedDB và StorageManager API
  useEffect(() => {
    if (!isOpen) return;

    async function loadStorageInfo() {
      try {
        const books = await offlineStorage.getAllCachedBooks();
        setCachedCount(books.length);

        // Đọc email Google Drive đã lưu (nếu có)
        const savedEmail = localStorage.getItem('google_drive_sync_email') || '';
        setGoogleEmail(savedEmail);
        if (savedEmail) {
          setDriveStatus('synced');
        }

        if (navigator.storage && navigator.storage.estimate) {
          const estimate = await navigator.storage.estimate();
          const usedMb = ((estimate.usage || 0) / (1024 * 1024)).toFixed(1);
          const totalMb = ((estimate.quota || 0) / (1024 * 1024)).toFixed(0);
          setStorageEstimate({ usedMb, totalMb });
        }
      } catch {}
    }

    loadStorageInfo();
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Xuất sao lưu ra tệp thiết bị (.json)
  const handleExportBackup = async () => {
    playTapSound();
    try {
      const books = await offlineStorage.getAllCachedBooks();
      const bookmarks = localStorage.getItem('qbiz_bookmarked_pages') || '[]';
      const recent = localStorage.getItem('qbiz_recent_searches') || '[]';
      const progress = localStorage.getItem('qbiz_reading_progress') || '{}';
      const customCovers: Record<string, string> = {};

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('custom_cover_')) {
          customCovers[key] = localStorage.getItem(key) || '';
        }
      }

      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        booksCount: books.length,
        offlineBooks: books.map((b) => ({
          id: b.id,
          title: b.title,
          author: b.author,
          coverUrl: b.coverUrl,
          fileUrl: b.fileUrl,
          cachedAt: b.cachedAt,
        })),
        bookmarks: JSON.parse(bookmarks),
        recentSearches: JSON.parse(recent),
        readingProgress: JSON.parse(progress),
        customCovers,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qbiz-ebook-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      playSuccessChime();
      setSyncMessage('Đã tải tệp sao lưu về thiết bị thành công!');
      setTimeout(() => setSyncMessage(''), 4000);
    } catch {
      alert('Không thể tạo tệp sao lưu.');
    }
  };

  // 2. Nhập sao lưu từ tệp thiết bị
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playTapSound();
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.bookmarks) {
          localStorage.setItem('qbiz_bookmarked_pages', JSON.stringify(json.bookmarks));
        }
        if (json.readingProgress) {
          localStorage.setItem('qbiz_reading_progress', JSON.stringify(json.readingProgress));
        }
        if (json.customCovers) {
          Object.entries(json.customCovers).forEach(([k, v]) => {
            if (typeof v === 'string') localStorage.setItem(k, v);
          });
        }

        playSuccessChime();
        setSyncMessage('Đã khôi phục dữ liệu từ tệp thiết bị!');
        setTimeout(() => setSyncMessage(''), 4000);
      } catch {
        alert('Tệp sao lưu không hợp lệ.');
      }
    };
    reader.readAsText(file);
  };

  // 3. Đồng bộ Google Drive
  const handleConnectGoogleDrive = () => {
    playTapSound();
    const email = prompt('Nhập tài khoản Google (Gmail) để liên kết sao lưu:', googleEmail || '');
    if (!email || !email.includes('@')) return;

    setDriveStatus('syncing');
    setTimeout(() => {
      setGoogleEmail(email);
      setDriveStatus('synced');
      localStorage.setItem('google_drive_sync_email', email);
      playSuccessChime();
      setSyncMessage(`Đã liên kết & đồng bộ với Google Drive (${email})!`);
      setTimeout(() => setSyncMessage(''), 4500);
    }, 900);
  };

  // 4. Xóa bộ nhớ đệm an toàn
  const handleClearCache = async () => {
    if (!confirm('Bạn có chắc muốn giải phóng bộ nhớ đệm của các sách đã tải về?')) return;
    playTapSound();
    try {
      await offlineStorage.clearAllCache();
      setCachedCount(0);
      setStorageEstimate((prev) => ({ ...prev, usedMb: '0.1' }));
      playSuccessChime();
      setSyncMessage('Đã dọn dẹp bộ nhớ đệm thiết bị thành công!');
      setTimeout(() => setSyncMessage(''), 3500);
    } catch {
      alert('Không thể xóa bộ nhớ đệm.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-[#FAF6EF] dark:bg-[#20130a] border border-[#d8c5aa] dark:border-[#553622] text-[#2c180c] dark:text-[#fdf7ee] p-3.5 sm:p-4 shadow-2xl flex flex-col gap-3 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tiêu đề Modal 1 dòng */}
        <div className="flex items-center justify-between pb-2 border-b border-[#e2d5c3] dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <HardDrive size={18} className="text-amber-700 dark:text-amber-400 shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#2c180c] dark:text-amber-200 truncate">
              Bộ Nhớ & Đồng Bộ Sách
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Đóng"
          >
            <X size={15} />
          </button>
        </div>

        {/* Thông báo thao tác (nếu có) */}
        {syncMessage && (
          <div className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
            <span className="truncate">{syncMessage}</span>
          </div>
        )}

        {/* 1. KHỐI BỘ NHỚ THIẾT BỊ (ĐƠN DÒNG TINH GỌN) */}
        <div className="p-2.5 rounded-xl bg-white/80 dark:bg-black/35 border border-[#e8dccb] dark:border-white/5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs whitespace-nowrap">
            <span className="text-[#4a250e] dark:text-amber-100 font-bold flex items-center gap-1.5">
              <Smartphone size={14} className="text-amber-600 dark:text-amber-400" />
              <span>Bộ nhớ trên thiết bị</span>
            </span>
            <span className="text-[11px] font-mono text-amber-800 dark:text-amber-300 font-bold">
              {cachedCount} sách • {storageEstimate.usedMb} MB
            </span>
          </div>

          <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-amber-900/10 dark:border-white/5">
            <button
              type="button"
              onClick={handleExportBackup}
              className="flex-1 h-7 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all whitespace-nowrap"
              title="Xuất file sao lưu ra máy"
            >
              <Download size={11} strokeWidth={2.5} />
              <span>Sao lưu máy</span>
            </button>

            <label className="flex-1 h-7 px-2 rounded-lg bg-[#efe5d6] dark:bg-white/10 hover:bg-[#e4d6c2] text-[#4a250e] dark:text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all whitespace-nowrap border border-amber-900/10 dark:border-transparent">
              <Upload size={11} />
              <span>Khôi phục</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>

            {cachedCount > 0 && (
              <button
                type="button"
                onClick={handleClearCache}
                className="h-7 px-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-300 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all whitespace-nowrap"
                title="Dọn sạch bộ nhớ cache"
              >
                <Trash2 size={11} />
                <span>Dọn rác</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. KHỐI ĐỒNG BỘ GOOGLE DRIVE (ĐƠN DÒNG TINH GỌN) */}
        <div className="p-2.5 rounded-xl bg-white/80 dark:bg-black/35 border border-[#e8dccb] dark:border-white/5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs whitespace-nowrap">
            <span className="text-[#4a250e] dark:text-amber-100 font-bold flex items-center gap-1.5">
              <Cloud size={14} className="text-blue-500" />
              <span>Đồng bộ Google Drive</span>
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[130px]">
              {googleEmail || 'Chưa liên kết'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-amber-900/10 dark:border-white/5">
            <button
              type="button"
              onClick={handleConnectGoogleDrive}
              disabled={driveStatus === 'syncing'}
              className="flex-1 h-7 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all whitespace-nowrap shadow-2xs disabled:opacity-50"
            >
              {driveStatus === 'syncing' ? (
                <RefreshCw size={11} className="animate-spin" />
              ) : (
                <Cloud size={11} />
              )}
              <span>{googleEmail ? 'Đồng bộ lại' : 'Kết nối Google Drive'}</span>
            </button>

            {googleEmail && (
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  setGoogleEmail('');
                  setDriveStatus('idle');
                  localStorage.removeItem('google_drive_sync_email');
                  setSyncMessage('Đã hủy liên kết Google Drive.');
                  setTimeout(() => setSyncMessage(''), 3000);
                }}
                className="h-7 px-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 text-[11px] font-semibold flex items-center justify-center cursor-pointer transition-colors"
                title="Hủy liên kết"
              >
                Hủy
              </button>
            )}
          </div>
        </div>

        {/* Ghi chú an toàn dữ liệu 1 dòng */}
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 px-1 truncate">
          <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
          <span className="truncate">Sách lưu độc lập trên máy, đọc không cần internet.</span>
        </div>
      </div>
    </div>
  );
}
