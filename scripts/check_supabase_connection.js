/**
 * Kịch bản kiểm tra kết nối CSDL Supabase cho App Đọc Sách
 * Chạy lệnh: node scripts/verify_supabase_connection.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('====================================================');
  console.log('🔍 KIỂM TRA KẾT NỐI SUPABASE CHO APP ĐỌC SÁCH');
  console.log('====================================================\n');

  const envPath = path.resolve(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Không tìm thấy tệp .env.local!');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const getEnv = (key) => {
    const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
    if (!match) return null;
    let v = match[1].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    return v;
  };

  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const workspaceId = getEnv('APP_WORKSPACE_ID') || 'book_platform';

  console.log(`📌 Supabase URL:       ${url || 'CHƯA CẤU HÌNH'}`);
  console.log(`📌 Anon Key (Client):  ${anonKey ? anonKey.slice(0, 16) + '...' : 'CHƯA CẤU HÌNH'}`);
  console.log(`📌 Service Role Key:   ${serviceKey ? serviceKey.slice(0, 16) + '...' : 'CHƯA CẤU HÌNH'}`);
  console.log(`📌 Workspace ID:       ${workspaceId}\n`);

  if (!url || !anonKey) {
    console.error('❌ Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY trong .env.local');
    process.exit(1);
  }

  // 1. Kiểm tra Anon Client (Đọc công khai)
  console.log('--- 1. Kiểm tra kết nối Client (Anon Key) ---');
  const anonClient = createClient(url, anonKey);
  try {
    const { data: topics, error: topicsErr } = await anonClient
      .from('topics')
      .select('id, title')
      .limit(5);

    if (topicsErr) {
      console.warn('⚠️ Lỗi đọc bảng topics bằng Anon Key:', topicsErr.message);
    } else {
      console.log(`✅ Đọc bảng 'topics' thành công! (Số lượng mẫu: ${topics.length})`);
    }

    const { data: settings, error: settingsErr } = await anonClient
      .from('settings')
      .select('workspace_id, app_name')
      .limit(5);

    if (settingsErr) {
      console.warn('⚠️ Lỗi đọc bảng settings bằng Anon Key:', settingsErr.message);
    } else {
      console.log(`✅ Đọc bảng 'settings' thành công! Có ${settings.length} workspace:`, settings.map(s => s.workspace_id).join(', '));
    }
  } catch (err) {
    console.error('❌ Ngoại lệ khi kiểm tra Anon Key:', err.message);
  }

  // 2. Kiểm tra Service Role (Toàn quyền quản trị)
  if (serviceKey) {
    console.log('\n--- 2. Kiểm tra quyền Quản trị Máy chủ (Service Role Key) ---');
    const adminClient = createClient(url, serviceKey);
    try {
      const [topicsRes, pagesRes, blocksRes, bucketsRes] = await Promise.all([
        adminClient.from('topics').select('id', { count: 'exact', head: true }),
        adminClient.from('pages').select('id', { count: 'exact', head: true }),
        adminClient.from('blocks').select('id', { count: 'exact', head: true }),
        adminClient.storage.listBuckets(),
      ]);

      console.log(`✅ Bảng 'topics':  ${topicsRes.count ?? 0} bản ghi`);
      console.log(`✅ Bảng 'pages':   ${pagesRes.count ?? 0} bản ghi`);
      console.log(`✅ Bảng 'blocks':  ${blocksRes.count ?? 0} bản ghi`);

      const bucketNames = bucketsRes.data?.map(b => b.name) || [];
      console.log(`✅ Storage Buckets: [ ${bucketNames.join(', ')} ]`);

      if (!bucketNames.includes('media')) {
        console.warn("⚠️ CẢNH BÁO: Chưa tìm thấy bucket 'media'. Cần chạy file khởi tạo để tạo bucket này!");
      }
    } catch (err) {
      console.error('❌ Ngoại lệ khi kiểm tra Service Role Key:', err.message);
    }
  } else {
    console.log('\n⚠️ Không có SUPABASE_SERVICE_ROLE_KEY. Bỏ qua kiểm tra quyền quản trị máy chủ.');
  }

  console.log('\n====================================================');
  console.log('🎉 KIỂM TRA HOÀN TẤT');
  console.log('====================================================\n');
}

main().catch(console.error);
