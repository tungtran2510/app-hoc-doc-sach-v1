/**
 * Kịch bản tự động trích xuất và tạo file SQL khởi tạo trọn gói cho App Đọc Sách
 * Chạy lệnh: node scripts/generate_standalone_sql.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function escapeSql(str) {
  if (str === null || str === undefined) return 'null';
  return `'${String(str).replace(/'/g, "''")}'`;
}

function escapeJson(obj) {
  if (obj === null || obj === undefined) return "'{}'::jsonb";
  return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
}

async function main() {
  console.log('🔄 Đang đọc cấu hình từ .env.local...');
  const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8');
  const url = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
  const serviceKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

  if (!url || !serviceKey) {
    console.error('❌ Thiếu URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local');
    process.exit(1);
  }

  const sb = createClient(url, serviceKey);

  console.log('📦 Đang trích xuất dữ liệu từ Supabase nguồn...');
  const [settingsRes, topicsRes, pagesRes, blocksRes] = await Promise.all([
    sb.from('settings').select('*').in('workspace_id', ['book_platform', 'default']),
    sb.from('topics').select('*').order('sort_order', { ascending: true }),
    sb.from('pages').select('*').order('sort_order', { ascending: true }),
    sb.from('blocks').select('*').order('sort_order', { ascending: true }),
  ]);

  const bookSettings = settingsRes.data?.find(s => s.workspace_id === 'book_platform') 
    || settingsRes.data?.find(s => s.workspace_id === 'default');

  const topics = topicsRes.data || [];
  const pages = pagesRes.data || [];
  const blocks = blocksRes.data || [];

  console.log(`✅ Trích xuất thành công:`);
  console.log(`   - Settings: 1 bản ghi cấu hình Tủ Sách`);
  console.log(`   - Topics:   ${topics.length} chuyên đề`);
  console.log(`   - Pages:    ${pages.length} bài học / chương sách`);
  console.log(`   - Blocks:   ${blocks.length} khối nội dung`);

  // Xây dựng nội dung file SQL hoàn chỉnh
  let sql = `-- ==============================================================================
-- KHỞI TẠO CƠ SỞ DỮ LIỆU ĐỘC LẬP CHO APP ĐỌC SÁCH (QBIZ BOOKS / APP-HOC-DOC-SACH)
-- ==============================================================================
-- 🎯 MỤC TIÊU:
-- 1. Tách biệt 100% cơ sở dữ liệu với app gốc (app-hoc-co-the).
-- 2. Độc lập hoàn toàn, không sợ ghi đè hay làm ảnh hưởng dữ liệu của nhau.
-- 3. Tạo sẵn cấu trúc bảng, RLS bảo mật (Security V2), Storage bucket và nạp sẵn toàn bộ Tủ sách y khoa.
--
-- 🚀 CÁCH SỬ DỤNG:
-- 1. Tạo một dự án Supabase mới miễn phí trên https://database.new (ví dụ đặt tên: app-hoc-doc-sach).
-- 2. Vào mục "SQL Editor" ở thanh menu bên trái Supabase.
-- 3. Bấm "New Query", dán TOÀN BỘ nội dung file này vào và bấm nút "Run" (hoặc Ctrl+Enter).
-- 4. Lấy 3 thông số của dự án mới (URL, Anon Key, Service Role Key) cập nhật vào file .env.local.
-- ==============================================================================

-- BƯỚC 1: TẠO CÁC BẢNG DỮ LIỆU CỐT LÕI
-- ------------------------------------------------------------------------------

-- 1.1. Bảng Cấu hình Giao diện & Tủ sách (settings)
create table if not exists public.settings (
  workspace_id   text primary key default 'book_platform',
  app_name       text not null default 'Qbiz Books',
  logo_url       text,
  primary_color  text not null default '#0C0817',
  access_mode    text not null default 'OPEN' check (access_mode in ('OPEN','GUIDED','LOCKED')),
  block_styles   jsonb not null default '{}'::jsonb,
  expert_title   text,
  hotline        text,
  zalo_url       text,
  author_profile jsonb not null default '{}'::jsonb,
  admin_password text,
  updated_at     timestamptz not null default now()
);

-- 1.2. Bảng Danh mục & Chuyên đề Sách (topics)
create table if not exists public.topics (
  id           uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default',
  slug         text not null,
  title        text not null,
  description  text,
  meta_note    text,
  cover_url    text,
  icon         text,
  color_bg     text not null default '#E3ECF7',
  color_fg     text not null default '#2D5B94',
  sort_order   int  not null default 0,
  is_visible   boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, slug)
);

-- 1.3. Bảng Bài học & Chương sách (pages)
create table if not exists public.pages (
  id           uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default',
  topic_id     uuid not null references public.topics(id) on delete cascade,
  slug         text not null,
  title        text not null,
  summary      text,
  cover_url    text,
  sort_order   int  not null default 0,
  is_visible   boolean not null default true,
  status       text not null default 'published' check (status in ('draft','published')),
  access_mode  text check (access_mode in ('OPEN','GUIDED','LOCKED')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (topic_id, slug)
);

-- 1.4. Bảng Khối Nội dung Bài viết / Sách (blocks)
create table if not exists public.blocks (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  text not null default 'default',
  page_id       uuid not null references public.pages(id) on delete cascade,
  type          text not null check (type in ('text','images','videos','links','files','comparison')),
  display_style text not null,
  data          jsonb not null default '{}'::jsonb,
  sort_order    int  not null default 0,
  is_visible    boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 1.5. Bảng Tiến độ Học & Đọc Sách của Học viên (user_progress)
create table if not exists public.user_progress (
  phone         text primary key,
  xem_tiep      jsonb,
  tien_do       jsonb default '{}'::jsonb,
  bai_da_luu    jsonb default '[]'::jsonb,
  da_hoan_thanh jsonb default '[]'::jsonb,
  updated_at    timestamptz not null default now()
);

-- Chỉ mục tối ưu tốc độ truy vấn
create index if not exists idx_pages_topic_sort on public.pages (topic_id, sort_order);
create index if not exists idx_blocks_page_sort on public.blocks (page_id, sort_order);
create index if not exists idx_topics_workspace on public.topics (workspace_id);

-- BƯỚC 2: THIẾT LẬP BẢO MẬT & PHÂN QUYỀN (ROW LEVEL SECURITY - RLS)
-- ------------------------------------------------------------------------------
alter table public.settings enable row level security;
alter table public.topics enable row level security;
alter table public.pages enable row level security;
alter table public.blocks enable row level security;
alter table public.user_progress enable row level security;

-- Policies đọc công khai cho sách và nội dung
drop policy if exists "allow_anon_read_topics" on public.topics;
create policy "allow_anon_read_topics" on public.topics for select using (true);

drop policy if exists "allow_anon_read_pages" on public.pages;
create policy "allow_anon_read_pages" on public.pages for select using (true);

drop policy if exists "allow_anon_read_blocks" on public.blocks;
create policy "allow_anon_read_blocks" on public.blocks for select using (true);

drop policy if exists "allow_anon_user_progress" on public.user_progress;
create policy "allow_anon_user_progress" on public.user_progress for all using (true) with check (true);

-- Policy đọc settings công khai (bảo vệ mật khẩu thông qua API Server)
drop policy if exists "allow_anon_read_settings" on public.settings;
create policy "allow_anon_read_settings" on public.settings for select using (true);

-- Tạo View công khai v_public_settings loại bỏ mật khẩu và tài khoản quản trị
create or replace view public.v_public_settings as
select
  workspace_id,
  app_name,
  logo_url,
  primary_color,
  access_mode,
  expert_title,
  hotline,
  zalo_url,
  author_profile,
  case
    when block_styles is not null then
      (block_styles - 'admin_accounts' - 'admin_password')
    else '{}'::jsonb
  end as block_styles,
  updated_at
from public.settings;

grant select on public.v_public_settings to anon, authenticated;

-- BƯỚC 3: TẠO STORAGE BUCKET CHO ẢNH BÌA & TỆP TIN
-- ------------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "allow_public_read_media" on storage.objects;
create policy "allow_public_read_media" on storage.objects for select using (bucket_id = 'media');

-- BƯỚC 4: NẠP DỮ LIỆU CẤU HÌNH & TỦ SÁCH MẪU CHUẨN
-- ------------------------------------------------------------------------------
`;

  // 4.1 Settings
  if (bookSettings) {
    // Làm sạch admin_password và tạo row cho cả book_platform và default
    const cleanStyles = { ...bookSettings.block_styles };
    delete cleanStyles.admin_password;

    sql += `\n-- Cấu hình Giao diện & Tủ sách (Áp dụng cho cả workspace book_platform và default)
insert into public.settings (workspace_id, app_name, logo_url, primary_color, access_mode, block_styles, expert_title, hotline, zalo_url, author_profile, updated_at)
values
  ('book_platform', ${escapeSql(bookSettings.app_name)}, ${escapeSql(bookSettings.logo_url)}, ${escapeSql(bookSettings.primary_color)}, ${escapeSql(bookSettings.access_mode)}, ${escapeJson(cleanStyles)}, ${escapeSql(bookSettings.expert_title)}, ${escapeSql(bookSettings.hotline)}, ${escapeSql(bookSettings.zalo_url)}, ${escapeJson(bookSettings.author_profile)}, now()),
  ('default', ${escapeSql(bookSettings.app_name)}, ${escapeSql(bookSettings.logo_url)}, ${escapeSql(bookSettings.primary_color)}, ${escapeSql(bookSettings.access_mode)}, ${escapeJson(cleanStyles)}, ${escapeSql(bookSettings.expert_title)}, ${escapeSql(bookSettings.hotline)}, ${escapeSql(bookSettings.zalo_url)}, ${escapeJson(bookSettings.author_profile)}, now())
on conflict (workspace_id) do update set
  app_name = excluded.app_name,
  block_styles = excluded.block_styles,
  hotline = excluded.hotline,
  zalo_url = excluded.zalo_url,
  author_profile = excluded.author_profile,
  updated_at = now();\n`;
  }

  // 4.2 Topics
  if (topics.length > 0) {
    sql += `\n-- Danh mục chuyên đề (${topics.length} chuyên đề)\n`;
    for (const t of topics) {
      sql += `insert into public.topics (id, workspace_id, slug, title, description, meta_note, cover_url, icon, color_bg, color_fg, sort_order, is_visible)
values (${escapeSql(t.id)}, ${escapeSql(t.workspace_id || 'default')}, ${escapeSql(t.slug)}, ${escapeSql(t.title)}, ${escapeSql(t.description)}, ${escapeSql(t.meta_note)}, ${escapeSql(t.cover_url)}, ${escapeSql(t.icon)}, ${escapeSql(t.color_bg || '#E3ECF7')}, ${escapeSql(t.color_fg || '#2D5B94')}, ${t.sort_order || 0}, ${Boolean(t.is_visible)})
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sort_order = excluded.sort_order;\n`;
    }
  }

  // 4.3 Pages
  if (pages.length > 0) {
    sql += `\n-- Danh sách Bài học / Chương sách (${pages.length} bài)\n`;
    for (const p of pages) {
      sql += `insert into public.pages (id, workspace_id, topic_id, slug, title, summary, cover_url, sort_order, is_visible, status, access_mode)
values (${escapeSql(p.id)}, ${escapeSql(p.workspace_id || 'default')}, ${escapeSql(p.topic_id)}, ${escapeSql(p.slug)}, ${escapeSql(p.title)}, ${escapeSql(p.summary)}, ${escapeSql(p.cover_url)}, ${p.sort_order || 0}, ${Boolean(p.is_visible)}, ${escapeSql(p.status || 'published')}, ${escapeSql(p.access_mode)})
on conflict (id) do update set
  title = excluded.title,
  summary = excluded.summary,
  sort_order = excluded.sort_order;\n`;
    }
  }

  // 4.4 Blocks
  if (blocks.length > 0) {
    sql += `\n-- Khối Nội dung (${blocks.length} khối)\n`;
    for (const b of blocks) {
      sql += `insert into public.blocks (id, workspace_id, page_id, type, display_style, sort_order, is_visible, data)
values (${escapeSql(b.id)}, ${escapeSql(b.workspace_id || 'default')}, ${escapeSql(b.page_id)}, ${escapeSql(b.type)}, ${escapeSql(b.display_style)}, ${b.sort_order || 0}, ${Boolean(b.is_visible)}, ${escapeJson(b.data)})
on conflict (id) do update set
  type = excluded.type,
  display_style = excluded.display_style,
  data = excluded.data,
  sort_order = excluded.sort_order;\n`;
    }
  }

  sql += `\n-- ==============================================================================
-- HOÀN TẤT CÀI ĐẶT CSDL ĐỘC LẬP CHO APP ĐỌC SÁCH
-- ==============================================================================\n`;

  const outputPath = path.resolve(__dirname, '../supabase/init_standalone_app_hoc_doc_sach.sql');
  fs.writeFileSync(outputPath, sql, 'utf8');

  console.log(`\n🎉 Đã tạo thành công file: supabase/init_standalone_app_hoc_doc_sach.sql`);
  console.log(`   Dung lượng: ${(sql.length / 1024).toFixed(1)} KB`);
}

main().catch(console.error);
