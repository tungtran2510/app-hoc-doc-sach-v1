-- ==============================================================================
-- HUỚNG DẪN BẢO MẬT RLS CHO SUPABASE (SECURITY V2)
-- Dự án: App Học & Đọc Sách Qbiz Books (Database Supabase: evuhamqlzprrbuabxyyn)
-- ==============================================================================
-- CẢNH BÁO CỰC KỲ QUAN TRỌNG:
-- 1. FILE NÀY CHỈ DÀNH CHO QUẢN TRỊ VIÊN XEM XÉT VÀ TỰ CHẠY TRÊN SUPABASE SQL EDITOR.
-- 2. TUYỆT ĐỐI KHÔNG CHẠY TỰ ĐỘNG BẰNG AI AGENT ĐỂ BẢO VỆ DATABASE SỨC KHỎE DÙNG CHUNG.
-- 3. HÃY THỬ NGHIỆM TRÊN MÔI TRƯỜNG TEST TRƯỚC KHI ÁP DỤNG TRÊN PRODUCTION.
-- ==============================================================================

-- BỐI CẢNH VÀ NGUYÊN NHÂN:
-- Trong setup.sql trước đây có chính sách:
--   create policy "Cho phép mọi người đọc settings" on settings for select using (true);
-- Khóa anon (NEXT_PUBLIC_SUPABASE_ANON_KEY) được nhúng công khai trong file Javascript
-- của trình duyệt để tải nội dung trang chủ. Do đó, bất kỳ ai biết kỹ thuật cũng có thể
-- dùng khóa anon này để gọi API Supabase đọc trọn vẹn bản ghi settings (trong đó có
-- admin_password và block_styles.admin_accounts).
--
-- LƯU Ý KỸ THUẬT VỀ MÃ NGUỒN CLIENT HIỆN TẠI:
-- Hiện tại `src/lib/data.ts` đang dùng `getSupabaseClient()` (sử dụng khóa anon) để đọc
-- cài đặt trang chủ trong Server Component (SSR).
-- => NẾU XÓA BỎ HOÀN TOÀN QUYỀN SELECT CỦA ANON MÀ CHƯA CHUYỂN `data.ts` SANG DÙNG
--    `getSupabaseServer()` (Service Role Key), TRANG CHỦ SẼ BỊ TRẮNG TRANG.
--
-- DƯỚI ĐÂY LÀ 2 PHƯƠNG ÁN SIẾT BẢO MẬT:

-- ------------------------------------------------------------------------------
-- PHƯƠNG ÁN 1 (KHUYÊN DÙNG — AN TOÀN NHẤT, KHÔNG LÀM HỎNG GIAO DIỆN):
-- TẠO VIEW RIÊNG ĐÃ GIẤU MẬT KHẨU & TÀI KHOẢN QUẢN TRỊ CHO KHÓA ANON
-- ------------------------------------------------------------------------------

-- Bước 1.1: Tạo View công khai an toàn, loại bỏ triệt để admin_password và admin_accounts
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
  -- Bóc tách block_styles, lọc bỏ admin_accounts và admin_password
  case
    when block_styles is not null then
      (block_styles - 'admin_accounts' - 'admin_password')
    else '{}'::jsonb
  end as block_styles,
  created_at,
  updated_at
from public.settings;

-- Cấp quyền đọc view công khai cho anon và authenticated
grant select on public.v_public_settings to anon, authenticated;

-- ------------------------------------------------------------------------------
-- PHƯƠNG ÁN 2 (SIẾT TRỰC TIẾP TRÊN BẢNG SETTINGS — CẦN ĐỔI DATA.TS SANG SERVICE ROLE):
-- ------------------------------------------------------------------------------
-- Khi toàn bộ việc đọc settings trên máy chủ Next.js đã chuyển sang getSupabaseServer(),
-- bạn có thể tắt hẳn quyền SELECT công khai của anon trên bảng settings bằng lệnh sau:

/*
alter table public.settings enable row level security;

-- Hủy bỏ policy đọc công khai cũ
drop policy if exists "Cho phép mọi người đọc settings" on public.settings;
drop policy if exists "anon_read_public_settings" on public.settings;

-- Chỉ cho phép service_role (máy chủ backend có khóa SUPABASE_SERVICE_ROLE_KEY) đọc/ghi:
-- (Mặc định khi không có policy nào cho anon, Supabase sẽ từ chối mọi yêu cầu từ anon)
*/

-- ------------------------------------------------------------------------------
-- ROLLBACK (LỆNH PHỤC HỒI NẾU CẦN KHÔI PHỤC LẠI TRẠNG THÁI CŨ):
-- ------------------------------------------------------------------------------
/*
drop policy if exists "Cho phép mọi người đọc settings" on public.settings;
create policy "Cho phép mọi người đọc settings" on public.settings for select using (true);
*/
