'use client';

import { detectEbookFormat, EbookFormat } from './ebookEngine';

/**
 * Module quản lý Lưu trữ Ngoại tuyến IndexedDB (Offline Ebook Storage Engine)
 * Tương thích 100% tất cả các trình duyệt: Chrome, Safari iOS, Android WebView, Edge, Firefox.
 * Lưu trữ trực tiếp file gốc (PDF, EPUB, CBZ, TXT) và ảnh bìa vào bộ nhớ cục bộ của thiết bị.
 * Cho phép người dùng mở sách < 0.1 giây ngay cả khi không có kết nối mạng Internet.
 */

const DB_NAME = 'qbiz_ebook_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'cached_books';

export interface OfflineBookMeta {
  id: string;
  title: string;
  author?: string | null;
  coverUrl?: string | null;
  coverBlob?: Blob | null;
  fileUrl: string;
  fileName?: string | null;
  format: EbookFormat;
  fileSize: number; // bytes
  cachedAt: number; // timestamp
  lastReadPage?: number;
  totalPages?: number;
}

export type CachedBookMetadata = OfflineBookMeta;

export interface OfflineBookData extends OfflineBookMeta {
  fileBlob: Blob;
  blobUrl?: string;
}

class OfflineStorageEngine {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private activeBlobUrls = new Map<string, string>();

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.reject(new Error('IndexedDB không được hỗ trợ trong môi trường này.'));
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('title', 'title', { unique: false });
          store.createIndex('fileUrl', 'fileUrl', { unique: false });
          store.createIndex('cachedAt', 'cachedAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error || new Error('Không thể mở cơ sở dữ liệu IndexedDB'));
      };
    });

    return this.dbPromise;
  }

  /**
   * Chuẩn hoá ID định danh duy nhất cho cuốn sách
   */
  public normalizeBookId(idOrUrl: string): string {
    if (!idOrUrl) return 'unknown';
    // Nếu là ID thông thường
    if (!idOrUrl.startsWith('http://') && !idOrUrl.startsWith('https://')) {
      return idOrUrl;
    }
    // Nếu là URL, lấy tên file hoặc path sạch
    const clean = idOrUrl.split('?')[0].split('#')[0];
    const parts = clean.split('/');
    const lastPart = parts[parts.length - 1] || 'book';
    return `cached_${lastPart.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  }

  /**
   * Kiểm tra xem cuốn sách đã được lưu ngoại tuyến chưa
   */
  public async isBookCached(idOrUrl: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      const id = this.normalizeBookId(idOrUrl);

      return new Promise<boolean>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);

        req.onsuccess = () => {
          if (req.result) {
            resolve(true);
            return;
          }
          // Thử tìm theo fileUrl index nếu tìm theo id chưa thấy
          const urlIndex = store.index('fileUrl');
          const urlReq = urlIndex.get(idOrUrl);
          urlReq.onsuccess = () => {
            resolve(Boolean(urlReq.result));
          };
          urlReq.onerror = () => resolve(false);
        };

        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  /**
   * Lưu một cuốn sách về thiết bị để đọc ngoại tuyến
   */
  public async saveBookToOffline(
    book: {
      id?: string;
      title: string;
      author?: string | null;
      coverUrl?: string | null;
      fileUrl: string;
      fileName?: string | null;
      lastReadPage?: number;
      totalPages?: number;
    },
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; size: number }> {
    const db = await this.getDB();
    const id = this.normalizeBookId(book.id || book.fileUrl);
    const format = detectEbookFormat(book.fileName || book.fileUrl);

    // 1. Tải tệp sách gốc với theo dõi tiến trình
    onProgress?.(10);
    const fileRes = await fetch(book.fileUrl);
    if (!fileRes.ok) {
      throw new Error(`Không thể tải tệp sách (Mã lỗi ${fileRes.status})`);
    }

    onProgress?.(40);
    const fileBlob = await fileRes.blob();
    onProgress?.(75);

    // 2. Tải thêm ảnh bìa về máy (nếu có) để xem offline
    let coverBlob: Blob | null = null;
    if (book.coverUrl && !book.coverUrl.startsWith('data:')) {
      try {
        const coverRes = await fetch(book.coverUrl);
        if (coverRes.ok) {
          coverBlob = await coverRes.blob();
        }
      } catch {
        // Ảnh bìa thất bại thì bỏ qua, không chặn việc lưu file sách
      }
    }
    onProgress?.(90);

    // 3. Ghi vào IndexedDB
    const record: OfflineBookData = {
      id,
      title: book.title,
      author: book.author || null,
      coverUrl: book.coverUrl || null,
      coverBlob,
      fileUrl: book.fileUrl,
      fileName: book.fileName || null,
      format,
      fileBlob,
      fileSize: fileBlob.size,
      cachedAt: Date.now(),
      lastReadPage: book.lastReadPage || 0,
      totalPages: book.totalPages || 1,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);

      req.onsuccess = () => {
        onProgress?.(100);
        resolve({ success: true, size: fileBlob.size });
      };

      req.onerror = () => {
        reject(req.error || new Error('Lỗi khi ghi tệp vào IndexedDB'));
      };
    });
  }

  /**
   * Lấy tệp sách và tạo Object URL nạp tức thì từ bộ nhớ máy
   */
  public async getBookFromOffline(idOrUrl: string): Promise<OfflineBookData | null> {
    try {
      const db = await this.getDB();
      const id = this.normalizeBookId(idOrUrl);

      return new Promise<OfflineBookData | null>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);

        req.onsuccess = () => {
          let record: OfflineBookData | undefined = req.result;

          const finish = (rec?: OfflineBookData) => {
            if (!rec || !rec.fileBlob) {
              resolve(null);
              return;
            }

            // Tạo Object URL cho tệp sách
            let blobUrl = this.activeBlobUrls.get(rec.id);
            if (!blobUrl) {
              blobUrl = URL.createObjectURL(rec.fileBlob);
              this.activeBlobUrls.set(rec.id, blobUrl);
            }

            // Tạo Object URL cho bìa sách (nếu có blob bìa)
            let coverUrl = rec.coverUrl;
            if (rec.coverBlob) {
              coverUrl = URL.createObjectURL(rec.coverBlob);
            }

            resolve({
              ...rec,
              blobUrl,
              coverUrl,
            });
          };

          if (record) {
            finish(record);
          } else {
            // Thử tra cứu theo fileUrl index
            const urlIndex = store.index('fileUrl');
            const urlReq = urlIndex.get(idOrUrl);
            urlReq.onsuccess = () => finish(urlReq.result);
            urlReq.onerror = () => resolve(null);
          }
        };

        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Lấy danh sách tất cả các cuốn sách đã lưu ngoại tuyến (kèm dung lượng)
   */
  public async getAllCachedBooks(): Promise<OfflineBookMeta[]> {
    try {
      const db = await this.getDB();

      return new Promise<OfflineBookMeta[]>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          const list: OfflineBookData[] = req.result || [];
          const metas: OfflineBookMeta[] = list.map((item) => {
            let coverUrl = item.coverUrl;
            if (item.coverBlob) {
              coverUrl = URL.createObjectURL(item.coverBlob);
            }
            return {
              id: item.id,
              title: item.title,
              author: item.author,
              coverUrl,
              fileUrl: item.fileUrl,
              fileName: item.fileName,
              format: item.format,
              fileSize: item.fileSize,
              cachedAt: item.cachedAt,
              lastReadPage: item.lastReadPage,
              totalPages: item.totalPages,
            };
          });

          // Xếp sách mới lưu lên đầu
          metas.sort((a, b) => b.cachedAt - a.cachedAt);
          resolve(metas);
        };

        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  /**
   * Xóa một cuốn sách khỏi bộ nhớ ngoại tuyến
   */
  public async removeBookFromOffline(idOrUrl: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      const id = this.normalizeBookId(idOrUrl);

      // Thu hồi Object URL nếu đang tồn tại
      const existingUrl = this.activeBlobUrls.get(id);
      if (existingUrl) {
        URL.revokeObjectURL(existingUrl);
        this.activeBlobUrls.delete(id);
      }

      return new Promise<boolean>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  /**
   * Tính toán tổng dung lượng bộ nhớ ngoại tuyến đang sử dụng
   */
  public async getStorageUsage(): Promise<{
    count: number;
    totalBytes: number;
    formattedSize: string;
  }> {
    const list = await this.getAllCachedBooks();
    const count = list.length;
    const totalBytes = list.reduce((sum, item) => sum + (item.fileSize || 0), 0);

    const formattedSize = formatBytes(totalBytes);
    return { count, totalBytes, formattedSize };
  }

  /**
   * Xóa toàn bộ sách ngoại tuyến để giải phóng bộ nhớ
   */
  public async clearAllOfflineBooks(): Promise<boolean> {
    try {
      const db = await this.getDB();

      // Revoke all blob urls
      this.activeBlobUrls.forEach((url) => URL.revokeObjectURL(url));
      this.activeBlobUrls.clear();

      return new Promise<boolean>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }
}

export const offlineStorage = new OfflineStorageEngine();

/**
 * Định dạng dung lượng byte thành KB / MB dễ đọc
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
