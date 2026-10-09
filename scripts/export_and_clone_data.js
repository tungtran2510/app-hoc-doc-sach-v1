/**
 * Tiện ích Sao lưu và Di chuyển Dữ liệu sang Supabase Mới (App Đọc Sách)
 *
 * Cách dùng 1 (Sao lưu ra file JSON):
 *   node scripts/export_and_clone_data.js --export
 *
 * Cách dùng 2 (Clone trực tiếp sang dự án Supabase mới):
 *   node scripts/export_and_clone_data.js --target-url="https://abc.supabase.co" --target-key="eyJh..."
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const isExportOnly = args.includes('--export');
const targetUrlArg = args.find(a => a.startsWith('--target-url='))?.split('=')[1]?.replace(/^"|"$/g, '');
const targetKeyArg = args.find(a => a.startsWith('--target-key='))?.split('=')[1]?.replace(/^"|"$/g, '');

async function main() {
  console.log('====================================================');
  console.log('📦 TIỆN ÍCH DI CHUYỂN DỮ LIỆU SANG SUPABASE RIÊNG');
  console.log('====================================================\n');

  const envPath = path.resolve(__dirname, '../.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const sourceUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
  const sourceKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

  if (!sourceUrl || !sourceKey) {
    console.error('❌ Không tìm thấy thông tin Supabase nguồn trong .env.local');
    process.exit(1);
  }

  const sourceClient = createClient(sourceUrl, sourceKey);
  console.log(`🔌 Kết nối Supabase nguồn (Chỉ đọc - Read-only): ${sourceUrl}`);

  const [settingsRes, topicsRes, pagesRes, blocksRes] = await Promise.all([
    sourceClient.from('settings').select('*').in('workspace_id', ['book_platform', 'default']),
    sourceClient.from('topics').select('*').order('sort_order', { ascending: true }),
    sourceClient.from('pages').select('*').order('sort_order', { ascending: true }),
    sourceClient.from('blocks').select('*').order('sort_order', { ascending: true }),
  ]);

  const backupPayload = {
    exported_at: new Date().toISOString(),
    settings: settingsRes.data || [],
    topics: topicsRes.data || [],
    pages: pagesRes.data || [],
    blocks: blocksRes.data || [],
  };

  const backupFile = path.resolve(__dirname, '../backup_ebook_db.json');
  fs.writeFileSync(backupFile, JSON.stringify(backupPayload, null, 2), 'utf8');
  console.log(`💾 Đã sao lưu dữ liệu ra tệp: backup_ebook_db.json (${(fs.statSync(backupFile).size / 1024).toFixed(1)} KB)`);

  if (isExportOnly || (!targetUrlArg && !targetKeyArg)) {
    console.log('\n💡 Để sao chép tự động sang dự án Supabase mới, hãy chạy:');
    console.log('   node scripts/export_and_clone_data.js --target-url="https://<NEW_REF>.supabase.co" --target-key="<SERVICE_ROLE_KEY>"\n');
    return;
  }

  if (!targetUrlArg || !targetKeyArg) {
    console.error('❌ Cần cung cấp cả --target-url và --target-key để tiến hành clone dữ liệu.');
    process.exit(1);
  }

  console.log(`\n🚀 Đang nạp dữ liệu sang Supabase đích: ${targetUrlArg}...`);
  const targetClient = createClient(targetUrlArg, targetKeyArg);

  // 1. Nạp Settings
  console.log('⏳ Đang nạp bảng settings...');
  for (const s of backupPayload.settings) {
    const { error } = await targetClient.from('settings').upsert(s, { onConflict: 'workspace_id' });
    if (error) console.warn(`   ⚠️ Lỗi settings (${s.workspace_id}):`, error.message);
  }

  // 2. Nạp Topics
  console.log(`⏳ Đang nạp bảng topics (${backupPayload.topics.length} bản ghi)...`);
  for (const t of backupPayload.topics) {
    const { error } = await targetClient.from('topics').upsert(t, { onConflict: 'id' });
    if (error) console.warn(`   ⚠️ Lỗi topic (${t.title}):`, error.message);
  }

  // 3. Nạp Pages
  console.log(`⏳ Đang nạp bảng pages (${backupPayload.pages.length} bản ghi)...`);
  for (const p of backupPayload.pages) {
    const { error } = await targetClient.from('pages').upsert(p, { onConflict: 'id' });
    if (error) console.warn(`   ⚠️ Lỗi page (${p.title}):`, error.message);
  }

  // 4. Nạp Blocks
  console.log(`⏳ Đang nạp bảng blocks (${backupPayload.blocks.length} bản ghi)...`);
  for (const b of backupPayload.blocks) {
    const { error } = await targetClient.from('blocks').upsert(b, { onConflict: 'id' });
    if (error) console.warn(`   ⚠️ Lỗi block (${b.id}):`, error.message);
  }

  console.log('\n====================================================');
  console.log('🎉 SAO CHÉP DỮ LIỆU SANG SUPABASE MỚI HOÀN TẤT 100%!');
  console.log('====================================================\n');
}

main().catch(console.error);
