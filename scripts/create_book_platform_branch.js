/**
 * Tách nhánh dữ liệu riêng cho App Đọc Sách trên Supabase hiện tại
 * Nhánh CSDL: workspace_id = 'book_platform'
 * 
 * Lệnh chạy: node scripts/create_book_platform_branch.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function main() {
  console.log('====================================================');
  console.log('🌿 TÁCH NHÁNH CƠ SỞ DỮ LIỆU RIÊNG CHO APP ĐỌC SÁCH');
  console.log('   Nhánh mục tiêu: workspace_id = "book_platform"');
  console.log('====================================================\n');

  const envPath = path.resolve(__dirname, '../.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const url = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
  const serviceKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

  if (!url || !serviceKey) {
    console.error('❌ Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const sb = createClient(url, serviceKey);

  // 1. Kiểm tra xem nhánh book_platform đã có topics chưa
  const { data: existingTopics } = await sb
    .from('topics')
    .select('id, title')
    .eq('workspace_id', 'book_platform');

  if (existingTopics && existingTopics.length > 0) {
    console.log(`ℹ️ Nhánh 'book_platform' đã tồn tại ${existingTopics.length} chuyên đề.`);
    console.log('   Không cần clone lại. CSDL đã được tách nhánh riêng!');
    return;
  }

  console.log('⏳ Đang đọc dữ liệu gốc từ nhánh "default" (Read-only)...');
  const [topicsRes, pagesRes, blocksRes] = await Promise.all([
    sb.from('topics').select('*').eq('workspace_id', 'default').order('sort_order', { ascending: true }),
    sb.from('pages').select('*').eq('workspace_id', 'default').order('sort_order', { ascending: true }),
    sb.from('blocks').select('*').eq('workspace_id', 'default').order('sort_order', { ascending: true }),
  ]);

  const defaultTopics = topicsRes.data || [];
  const defaultPages = pagesRes.data || [];
  const defaultBlocks = blocksRes.data || [];

  console.log(`📊 Tìm thấy: ${defaultTopics.length} chuyên đề, ${defaultPages.length} bài học, ${defaultBlocks.length} khối nội dung.`);

  // 2. Clone Topics sang book_platform
  console.log('\n⏳ 1/3: Đang tạo các chuyên đề riêng cho book_platform...');
  const oldTopicToNew = new Map();
  const newTopics = [];

  for (const t of defaultTopics) {
    const newId = crypto.randomUUID();
    oldTopicToNew.set(t.id, newId);
    newTopics.push({
      ...t,
      id: newId,
      workspace_id: 'book_platform',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  const { error: topicsErr } = await sb.from('topics').insert(newTopics);
  if (topicsErr) {
    console.error('❌ Lỗi khi chèn topics mới:', topicsErr.message);
    process.exit(1);
  }
  console.log(`✅ Đã tạo thành công ${newTopics.length} chuyên đề riêng trong book_platform.`);

  // 3. Clone Pages sang book_platform
  console.log('\n⏳ 2/3: Đang tạo các bài học / chương sách riêng cho book_platform...');
  const oldPageToNew = new Map();
  const newPages = [];

  for (const p of defaultPages) {
    const newId = crypto.randomUUID();
    oldPageToNew.set(p.id, newId);
    const newTopicId = oldTopicToNew.get(p.topic_id);
    if (!newTopicId) continue;

    newPages.push({
      ...p,
      id: newId,
      workspace_id: 'book_platform',
      topic_id: newTopicId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  const { error: pagesErr } = await sb.from('pages').insert(newPages);
  if (pagesErr) {
    console.error('❌ Lỗi khi chèn pages mới:', pagesErr.message);
    process.exit(1);
  }
  console.log(`✅ Đã tạo thành công ${newPages.length} bài học/chương sách riêng trong book_platform.`);

  // 4. Clone Blocks sang book_platform (chèn theo batch 50 để tối ưu)
  console.log('\n⏳ 3/3: Đang tạo các khối nội dung riêng cho book_platform...');
  const newBlocks = [];

  for (const b of defaultBlocks) {
    const newPageId = oldPageToNew.get(b.page_id);
    if (!newPageId) continue;

    newBlocks.push({
      ...b,
      id: crypto.randomUUID(),
      workspace_id: 'book_platform',
      page_id: newPageId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  const batchSize = 50;
  for (let i = 0; i < newBlocks.length; i += batchSize) {
    const batch = newBlocks.slice(i, i + batchSize);
    const { error: blocksErr } = await sb.from('blocks').insert(batch);
    if (blocksErr) {
      console.error(`❌ Lỗi khi chèn blocks batch ${i}:`, blocksErr.message);
      process.exit(1);
    }
  }
  console.log(`✅ Đã tạo thành công ${newBlocks.length} khối nội dung riêng trong book_platform.`);

  console.log('\n====================================================');
  console.log('🎉 TÁCH NHÁNH THÀNH CÔNG RỰC RỠ!');
  console.log('   Nhánh "book_platform" đã hoàn toàn độc lập với "default".');
  console.log('====================================================\n');
}

main().catch(console.error);
