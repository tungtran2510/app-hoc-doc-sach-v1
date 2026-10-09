import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '../../../../lib/supabaseServer';
import { UserProgressSyncData } from '../../../../lib/types';
import crypto from 'crypto';
import { rateLimit, getClientIp } from '../../../../lib/authServer';

export const dynamic = 'force-dynamic';

function cleanPhoneNumber(raw?: string | null): string {
  if (!raw) return '';
  return raw.replace(/[^0-9]/g, '');
}

function hashedSyncKey(cleanPhone: string): string {
  const pepper = process.env.USER_SYNC_PEPPER || process.env.ADMIN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'qbiz-user-sync';
  return 'user_sync:' + crypto.createHmac('sha256', pepper).update(cleanPhone).digest('hex').slice(0, 40);
}

export async function POST(req: NextRequest) {
  try {
    // Chặn dò số điện thoại hàng loạt: tối đa 40 lần / 10 phút cho mỗi IP
    if (!rateLimit(`usersync:${getClientIp(req)}`, 40, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'Thao tác quá nhanh, vui lòng thử lại sau ít phút' }, { status: 429 });
    }
    const body = await req.json();
    const { phone, action = 'sync', localData } = body;

    const cleanPhone = cleanPhoneNumber(phone);
    if (!cleanPhone || cleanPhone.length < 9 || cleanPhone.length > 11) {
      return NextResponse.json(
        { error: 'Số điện thoại không hợp lệ (vui lòng nhập từ 9 đến 11 chữ số)' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Hệ thống chưa kết nối cơ sở dữ liệu' },
        { status: 503 }
      );
    }

    // Khóa lưu trữ đã băm: không để số điện thoại xuất hiện dạng chữ rõ trong bảng dữ liệu
    const syncKey = hashedSyncKey(cleanPhone);
    const legacyKey = `user_sync:${cleanPhone}`;

    // Lấy dữ liệu đã lưu trên đám mây của số điện thoại này
    const { data: record, error: fetchErr } = await supabase
      .from('settings')
      .select('block_styles, updated_at')
      .eq('workspace_id', syncKey)
      .maybeSingle();

    if (fetchErr && fetchErr.code !== 'PGRST116') {
      return NextResponse.json(
        { error: fetchErr.message || 'Lỗi khi tra cứu dữ liệu học tập' },
        { status: 500 }
      );
    }

    // Tương thích dữ liệu cũ (khóa chứa số điện thoại): đọc rồi tự chuyển sang khóa đã băm khi lưu
    let legacyRecord: any = null;
    if (!record) {
      const { data: legacy } = await supabase
        .from('settings')
        .select('block_styles, updated_at')
        .eq('workspace_id', legacyKey)
        .maybeSingle();
      legacyRecord = legacy || null;
    }

    const sourceRecord = record || legacyRecord;
    const cloudData: UserProgressSyncData | null =
      sourceRecord?.block_styles?.user_progress || sourceRecord?.block_styles || null;

    // 1. Chỉ lấy dữ liệu từ đám mây (GET)
    if (action === 'get') {
      return NextResponse.json({
        success: true,
        data: cloudData,
        phone: cleanPhone,
      });
    }

    // 2. Đồng bộ & Gộp dữ liệu đám mây + thiết bị hiện tại (SYNC / SAVE)
    // Merge danh sách bài đã lưu (bai_da_luu)
    const cloudSaved = Array.isArray(cloudData?.bai_da_luu) ? cloudData!.bai_da_luu : [];
    const localSaved = Array.isArray(localData?.bai_da_luu) ? localData.bai_da_luu : [];
    const savedMap = new Map<string, any>();

    for (const item of [...cloudSaved, ...localSaved]) {
      if (!item || !item.page_id) continue;
      const existing = savedMap.get(item.page_id);
      if (!existing || (item.saved_at || 0) >= (existing.saved_at || 0)) {
        savedMap.set(item.page_id, item);
      }
    }
    const mergedBaiDaLuu = Array.from(savedMap.values()).sort(
      (a, b) => (b.saved_at || 0) - (a.saved_at || 0)
    );

    // Merge danh sách bài đã hiểu (da_hoan_thanh)
    const cloudCompleted = Array.isArray(cloudData?.da_hoan_thanh) ? cloudData!.da_hoan_thanh : [];
    const localCompleted = Array.isArray(localData?.da_hoan_thanh) ? localData.da_hoan_thanh : [];
    const mergedDaHoanThanh = Array.from(new Set([...cloudCompleted, ...localCompleted]));

    // Merge tiến độ video từng bài (tien_do)
    const cloudTienDo = (cloudData?.tien_do && typeof cloudData.tien_do === 'object') ? cloudData.tien_do : {};
    const localTienDo = (localData?.tien_do && typeof localData.tien_do === 'object') ? localData.tien_do : {};
    const mergedTienDo: Record<string, { last_video: number; watched: number[] }> = {};
    const allPageIds = Array.from(new Set([...Object.keys(cloudTienDo), ...Object.keys(localTienDo)]));

    for (const pid of allPageIds) {
      const c = cloudTienDo[pid] || { last_video: 0, watched: [] };
      const l = localTienDo[pid] || { last_video: 0, watched: [] };
      const watched = Array.from(new Set([...(c.watched || []), ...(l.watched || [])])).sort((a, b) => a - b);
      const last_video = Math.max(c.last_video || 0, l.last_video || 0);
      mergedTienDo[pid] = { last_video, watched };
    }

    // Merge vị trí học cuối cùng (xem_tiep)
    let mergedXemTiep = localData?.xem_tiep || cloudData?.xem_tiep || null;
    if (cloudData?.xem_tiep && localData?.xem_tiep) {
      const cloudTime = cloudData.xem_tiep.updated_at || 0;
      const localTime = localData.xem_tiep.updated_at || 0;
      mergedXemTiep = cloudTime >= localTime ? cloudData.xem_tiep : localData.xem_tiep;
    }

    // Merge thói quen đọc sách (reading_streak)
    let mergedReadingStreak = localData?.reading_streak || cloudData?.reading_streak || null;
    if (cloudData?.reading_streak && localData?.reading_streak) {
      mergedReadingStreak = {
        streakDays: Math.max(cloudData.reading_streak.streakDays || 0, localData.reading_streak.streakDays || 0),
        pagesToday: Math.max(cloudData.reading_streak.pagesToday || 0, localData.reading_streak.pagesToday || 0),
        minutesToday: Math.max(cloudData.reading_streak.minutesToday || 0, localData.reading_streak.minutesToday || 0),
        totalBooksCompleted: Math.max(cloudData.reading_streak.totalBooksCompleted || 0, localData.reading_streak.totalBooksCompleted || 0),
        lastActiveDate: localData.reading_streak.lastActiveDate || cloudData.reading_streak.lastActiveDate,
      };
    }

    // Merge dấu trang sách (book_bookmarks)
    const mergedBookmarks = {
      ...(cloudData?.book_bookmarks || {}),
      ...(localData?.book_bookmarks || {}),
    };

    // Merge tiến độ đọc sách gần nhất (last_read_progress & last_read_book_title)
    const mergedLastReadProgress = {
      ...(cloudData?.last_read_progress || {}),
      ...(localData?.last_read_progress || {}),
    };
    const mergedLastReadBookTitle = localData?.last_read_book_title || cloudData?.last_read_book_title || null;

    // Merge sổ tay ghi chú & Flashcard (reading_notes)
    const cloudNotes = Array.isArray(cloudData?.reading_notes) ? cloudData.reading_notes : [];
    const localNotes = Array.isArray(localData?.reading_notes) ? localData.reading_notes : [];
    const notesMap = new Map<string, any>();
    for (const n of [...cloudNotes, ...localNotes]) {
      if (!n || !n.id) continue;
      const existing = notesMap.get(n.id);
      if (!existing || (n.createdAt || 0) >= (existing.createdAt || 0)) {
        notesMap.set(n.id, n);
      }
    }
    const mergedReadingNotes = Array.from(notesMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // Merge Kệ sách cá nhân (user_shelf)
    const cloudShelf = Array.isArray(cloudData?.user_shelf) ? cloudData!.user_shelf : [];
    const localShelf = Array.isArray(localData?.user_shelf) ? localData.user_shelf : [];
    const shelfMap = new Map<string, any>();
    for (const item of [...cloudShelf, ...localShelf]) {
      if (!item || !item.id) continue;
      const existing = shelfMap.get(item.id);
      if (!existing || (item.addedAt || 0) >= (existing.addedAt || 0)) {
        shelfMap.set(item.id, item);
      }
    }
    const mergedUserShelf = Array.from(shelfMap.values()).sort(
      (a, b) => (b.addedAt || 0) - (a.addedAt || 0)
    );

    // Merge Lịch sử sách nói (audiobook_history)
    const cloudAudio = Array.isArray(cloudData?.audiobook_history) ? cloudData!.audiobook_history : [];
    const localAudio = Array.isArray(localData?.audiobook_history) ? localData.audiobook_history : [];
    const audioMap = new Map<string, any>();
    for (const item of [...cloudAudio, ...localAudio]) {
      if (!item || !item.id) continue;
      const existing = audioMap.get(item.id);
      if (!existing || (item.lastListenedAt || 0) >= (existing.lastListenedAt || 0)) {
        audioMap.set(item.id, item);
      }
    }
    const mergedAudioHistory = Array.from(audioMap.values()).sort(
      (a, b) => (b.lastListenedAt || 0) - (a.lastListenedAt || 0)
    );

    // Merge Sách yêu thích (favorite_books)
    const cloudFavs = Array.isArray(cloudData?.favorite_books) ? cloudData!.favorite_books : [];
    const localFavs = Array.isArray(localData?.favorite_books) ? localData.favorite_books : [];
    const favMap = new Map<string, any>();
    for (const item of [...cloudFavs, ...localFavs]) {
      if (!item || !item.id) continue;
      const existing = favMap.get(item.id);
      if (!existing || (item.favoritedAt || 0) >= (existing.favoritedAt || 0)) {
        favMap.set(item.id, item);
      }
    }
    const mergedFavoriteBooks = Array.from(favMap.values()).sort(
      (a, b) => (b.favoritedAt || 0) - (a.favoritedAt || 0)
    );

    const mergedPayload: UserProgressSyncData = {
      phone: '',
      xem_tiep: mergedXemTiep,
      tien_do: mergedTienDo,
      bai_da_luu: mergedBaiDaLuu,
      da_hoan_thanh: mergedDaHoanThanh,
      reading_streak: mergedReadingStreak,
      book_bookmarks: mergedBookmarks,
      last_read_progress: mergedLastReadProgress,
      last_read_book_title: mergedLastReadBookTitle,
      reading_notes: mergedReadingNotes,
      user_shelf: mergedUserShelf,
      audiobook_history: mergedAudioHistory,
      favorite_books: mergedFavoriteBooks,
      updated_at: new Date().toISOString(),
    };

    // Ghi an toàn vào Supabase
    const { error: upsertErr } = await supabase.from('settings').upsert(
      {
        workspace_id: syncKey,
        app_name: 'Học viên',
        primary_color: '#0C0817',
        access_mode: 'OPEN',
        block_styles: { user_progress: mergedPayload },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id' }
    );

    if (upsertErr) {
      return NextResponse.json(
        { error: upsertErr.message || 'Lỗi khi lưu dữ liệu học tập lên máy chủ' },
        { status: 500 }
      );
    }

    // Đã chuyển sang khóa đã băm → xóa bản ghi cũ chứa số điện thoại
    if (legacyRecord || (!record && legacyKey !== syncKey)) {
      await supabase.from('settings').delete().eq('workspace_id', legacyKey);
    }

    return NextResponse.json({
      success: true,
      data: mergedPayload,
      phone: cleanPhone,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Lỗi máy chủ khi xử lý đồng bộ' },
      { status: 500 }
    );
  }
}
