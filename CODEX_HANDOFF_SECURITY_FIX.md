# CODEX HANDOFF — VÁ 3 LỖI CRITICAL + 2 LỖI MEDIUM VỀ BẢO MẬT

> Repo: `d:\app-hoc-doc-sach-v1` (Next.js 14.2.15 App Router)
> Ngày phát lệnh: 10/10/2026
> Người phát lệnh: Claude (đã audit toàn bộ repo, tsc + build + Playwright 390x844)

---

## 0. ĐỌC TRƯỚC KHI LÀM BẤT CỨ THỨ GÌ

Bắt buộc đọc 2 file này trước, và tuân thủ mọi luật trong đó:
- `GEMINI.md` — đặc biệt luật số 1 (CẤM `git push` khi chưa được cho phép bằng chữ) và luật số 2 (nghiệm thu bằng ảnh Playwright 390x844).
- `PROJECT_BRAIN.md` — mục 4 (guard-rails dữ liệu) và mục 5 (mô hình phân quyền RBAC).

---

## GOAL

Sau khi xong, 5 điều sau phải đúng:

1. Không còn mật khẩu quản trị nào nằm trong mã nguồn hay hiển thị trên giao diện.
2. Tài khoản `instructor` KHÔNG thể: xem mật khẩu người khác, tải sao lưu CSDL, đổi mật khẩu hệ thống, hoặc tự nâng quyền mình lên `super_admin`.
3. Mật khẩu giảng viên lưu dưới dạng băm, không lưu chữ thường.
4. File EPUB độc hại không chạy được mã JavaScript trong app.
5. Hai API proxy không dùng được để quét mạng nội bộ của máy chủ.

Toàn bộ chức năng hiện có phải giữ nguyên, không được hỏng thêm thứ gì.

---

## CURRENT STATE / EVIDENCE

Đã kiểm chứng trên máy kiểm thử (tsc 0 lỗi, `next build` thành công 25 trang, Playwright 390x844 không lỗi console, không tràn ngang).

### CRITICAL-1 — Mật khẩu Super Admin lộ công khai + viết cứng trong code
- `src/app/dang-nhap/page.tsx:155` — placeholder ô mật khẩu ghi `"Nhập mật khẩu (ví dụ: Tung@2510)"`. Bất kỳ ai mở `/dang-nhap` đều đọc được mật khẩu thật. Đã chụp ảnh xác nhận hiển thị trên khung 390x844.
- `src/app/api/admin/login/route.ts:25-29` — so sánh chuỗi cứng:
  ```ts
  const isSpecialTungAccount =
    (cleanPhone === '0974248716' && password === 'Tung@2510') ||
    password === 'Tung@2510';
  ```
  Vế thứ hai (`password === 'Tung@2510'` đứng một mình) cho phép đăng nhập `super_admin` với **bất kỳ số điện thoại nào**.
- `src/app/api/admin/login/route.ts:95-107` — gán `role: 'super_admin'` dựa trên cùng chuỗi cứng đó.
- `src/lib/authServer.ts:57` — token định dạng cũ (2 phần) tự động trả về user `super_admin` cứng.
- `src/lib/authServer.ts:114` và `src/lib/adminAuth.ts:19` — nhận diện super admin bằng số điện thoại cứng `'0974248716'`.
- `PROJECT_BRAIN.md` mục 2 — ghi cả SĐT lẫn mật khẩu dạng chữ thường trong file nằm trong repo.

### CRITICAL-2 — Instructor làm được việc của Super Admin
`checkIsSuperAdminRequest` đã tồn tại trong `src/lib/authServer.ts:112-116` nhưng **không API nào gọi tới**. Đã grep toàn bộ `src/app/api`: 0 kết quả sử dụng.

Bốn API chỉ gác bằng `checkIsAdminRequest` (ai đăng nhập được cũng qua, kể cả instructor):
- `src/app/api/admin/manage-accounts/route.ts:7` (GET) và `:48` (POST) — GET trả về mảng `accounts` nguyên vẹn **bao gồm trường `password` chữ thường** (dòng 38). POST cho tạo/sửa/xoá/khoá mọi tài khoản.
- `src/app/api/admin/sao-luu/route.ts:7` — tải toàn bộ settings + topics + pages + blocks.
- `src/app/api/admin/change-password/route.ts:6` — đổi mật khẩu hệ thống.
- `src/app/api/admin/save-settings/route.ts:8` — dòng 34 merge nguyên khối `...(settings.block_styles || {})`, nên client POST `block_styles.admin_accounts` chứa `role: 'super_admin'` là tự nâng quyền được.

Trái trực tiếp với PROJECT_BRAIN mục 5 ("Ẩn hoàn toàn các chức năng nhạy cảm... Sao lưu CSDL").

### CRITICAL-3 — Mật khẩu giảng viên lưu chữ thường (CHƯA KIỂM CHỨNG trên DB thật)
- `src/app/api/admin/manage-accounts/route.ts:101` — `password: password.trim()` lưu thẳng.
- `src/app/api/admin/manage-accounts/route.ts:131` — update cũng lưu thẳng.
- `src/app/api/admin/login/route.ts:55-57` — có fallback `acc.password === password` so sánh chữ thường.
- `supabase/setup.sql:85` — `create policy "Cho phép mọi người đọc settings" on settings for select using (true);` → khoá anon (khoá này công khai trong bundle trình duyệt) đọc được cả bảng `settings`, trong đó có `admin_password` và `block_styles.admin_accounts`.
- `supabase/security.sql` có policy siết lại nhưng dùng điều kiện `key not like 'user_sync:%'` — bảng `settings` trong `setup.sql` không có cột `key`, nên **chưa rõ file này đã chạy được trên DB thật hay chưa**. Codex phải xác minh, không được giả định.

### MEDIUM-4 — EPUB chèn mã độc (XSS)
- `src/lib/ebookEngine.ts:383-389` — cắt thô nội dung `<body>` bằng regex rồi gán vào `htmlContent`, không lọc.
- `src/components/EpubReaderView.tsx:56-81` — `cleanChapterHtml` chỉ xoá tiêu đề trùng và đổi `h1`→`h3`, **không lọc `<script>`, `<iframe>`, hay thuộc tính `on*`**.
- Hai nơi render: `src/components/EpubReaderView.tsx:738` (`processedContent`) và `:785` (`renderedContent`).
- Đường tấn công thật: người dùng dán link sách lạ → `/api/proxy-ebook` tải về → mở đọc → mã chạy. Nếu admin đang đăng nhập (cookie `httpOnly` nhưng vẫn tự gửi kèm request), mã đó gọi được `/api/admin/*`.

### MEDIUM-5 — SSRF ở 2 API proxy
- `src/app/api/download-proxy/route.ts:10-38` và `src/app/api/proxy-ebook/route.ts:9-36` — hàm `isPrivateIp` bỏ sót: `169.254.0.0/16` (metadata cloud), `0.0.0.0`, dải `127.x` ngoài `127.0.0.1`, IPv6 rút gọn, và tên miền trỏ về IP nội bộ.
- `src/app/api/download-proxy/route.ts:76` — `fetch` không đặt `redirect`, mặc định tự theo chuyển hướng → nguồn ngoài có thể 302 về `169.254.169.254` và vượt qua toàn bộ kiểm tra.
- Không có giới hạn tần suất, không allowlist → ai cũng dùng máy chủ làm proxy mở.

---

## NON-NEGOTIABLES

1. **CẤM `git push`, CẤM deploy Vercel.** Chỉ sửa code tại chỗ và test localhost. Chờ người dùng gõ chữ "Đẩy" hoặc "Chốt và đẩy lên".
2. **CẤM đụng vào dữ liệu Supabase.** Không xoá bảng, không xoá hàng, không đổi schema, không chạy migration. DB này dùng chung với app gốc `app-hoc-co-the`. Nếu cần đổi RLS thì **chỉ soạn file SQL để người dùng tự chạy**, không tự chạy.
3. **CẤM đổi giao diện.** Nhiệm vụ này thuần bảo mật. Không chỉnh màu, bố cục, typography, không "tiện tay dọn dẹp".
4. **Không được làm hỏng đăng nhập.** Sau khi sửa, người dùng vẫn phải đăng nhập được bằng tài khoản chủ sở hữu. Xem mục "Điều kiện tiên quyết" bên dưới.
5. **Chỉ sửa Delta.** Giữ nguyên phần đang đúng. Không rebuild lại module vì vài dòng lỗi.
6. Không đổi `COOKIE_NAME`, không đổi định dạng token 3 phần — sẽ đá văng phiên đăng nhập hiện có.

---

## ĐIỀU KIỆN TIÊN QUYẾT (LÀM TRƯỚC, BÁO CÁO TRƯỚC KHI SỬA)

Trước khi gỡ bất kỳ mật khẩu cứng nào, phải xác minh và **báo lại kết quả cho người dùng**:

1. Đọc `.env.local`, xác nhận `ADMIN_SECRET` và `ADMIN_PASSWORD` đã có giá trị thật chưa. In ra **độ dài chuỗi và 3 ký tự đầu**, tuyệt đối không in nguyên giá trị.
2. Nếu `ADMIN_PASSWORD` trống → **DỪNG LẠI**, báo người dùng đặt giá trị trước. Gỡ mật khẩu cứng khi chưa có env sẽ khoá cửa chính, không ai vào được nữa.
3. Nếu `ADMIN_SECRET` trống → báo người dùng, vì khi đó khoá ký HMAC là ngẫu nhiên theo tiến trình, mọi phiên đăng nhập sẽ rụng mỗi lần khởi động lại máy chủ.

---

## FILES TO INSPECT FIRST

Đọc hết trước khi gõ dòng sửa đầu tiên, không đoán:

```
GEMINI.md
PROJECT_BRAIN.md
src/lib/authServer.ts                           (toàn bộ, 160 dòng)
src/lib/adminAuth.ts
src/app/api/admin/login/route.ts
src/app/api/admin/manage-accounts/route.ts
src/app/api/admin/change-password/route.ts
src/app/api/admin/sao-luu/route.ts
src/app/api/admin/save-settings/route.ts
src/app/dang-nhap/page.tsx
src/components/admin/InstructorManagerSection.tsx
src/components/blocks/TextBlock.tsx             (dòng 60-95: hàm sanitizeHtml đã có sẵn, TÁI SỬ DỤNG)
src/lib/ebookEngine.ts                          (dòng 355-405)
src/components/EpubReaderView.tsx               (dòng 56-81, 280-300, 700-790)
src/app/api/download-proxy/route.ts
src/app/api/proxy-ebook/route.ts
supabase/setup.sql, supabase/security.sql
src/lib/types.ts                                (interface InstructorAccount)
```

---

## IMPLEMENTATION REQUIREMENTS

Mô tả theo **hành vi cần đạt**. Cách hiện thực cụ thể do Codex quyết, miễn thoả acceptance criteria.

### FIX-1 — Gỡ mật khẩu cứng
- `src/app/dang-nhap/page.tsx:155`: đổi placeholder thành `"Nhập mật khẩu quản trị"`. Giữ nguyên mọi style và class.
- `src/app/api/admin/login/route.ts`: xoá sạch biến `isSpecialTungAccount` và mọi so sánh với chuỗi `'Tung@2510'`. Đường đăng nhập chủ sở hữu chỉ còn một: `verifyPassword(password, serverPassword)` với `serverPassword` lấy từ `settings.admin_password` hoặc `process.env.ADMIN_PASSWORD`.
- Giữ nguyên nhánh instructor và `rateLimit` đang có.
- `src/lib/authServer.ts`: xoá số `'0974248716'` cứng ở dòng 57 và 114; `src/lib/adminAuth.ts:19` tương tự. Nhận diện super admin **chỉ dựa trên `user.role === 'super_admin'`** trong payload token đã ký.
- Token định dạng cũ 2 phần (`authServer.ts:45-60`): không được mặc định trả `super_admin` nữa. Cho nó trả `isValid: false` để buộc đăng nhập lại — an toàn hơn, và chỉ ảnh hưởng phiên cũ.
- `PROJECT_BRAIN.md` mục 2: thay dòng mật khẩu bằng `**Mật khẩu:** (lưu trong biến môi trường ADMIN_PASSWORD — không ghi vào repo)`. Giữ nguyên phần còn lại của file.

### FIX-2 — Gác quyền Super Admin
Đổi gác từ `checkIsAdminRequest` sang `checkIsSuperAdminRequest`, trả HTTP 403 kèm thông báo tiếng Việt rõ nghĩa, ở đúng 4 chỗ:
- `manage-accounts/route.ts` — cả GET lẫn POST.
- `sao-luu/route.ts` — GET.
- `change-password/route.ts` — POST.
- `save-settings/route.ts` — POST: giữ `checkIsAdminRequest` (instructor vẫn cần sửa nội dung), **nhưng phải loại bỏ `admin_accounts` và `admin_password` khỏi payload client gửi lên** trước khi merge ở dòng 34. Hai trường đó chỉ được lấy từ bản ghi `existing` trong DB.
- `manage-accounts` GET: **không trả trường `password` ra client nữa**, kể cả dạng băm. Trả về object đã lọc bỏ field đó.
- `InstructorManagerSection.tsx`: nếu giao diện đang hiển thị hay điền sẵn mật khẩu cũ thì bỏ; ô mật khẩu khi sửa tài khoản để trống nghĩa là "giữ nguyên mật khẩu cũ" (logic này ở route đã đúng, chỉ cần UI khớp).

### FIX-3 — Băm mật khẩu giảng viên
- `manage-accounts/route.ts:101` và `:131`: lưu `hashPassword(password.trim())` thay vì chữ thường. Hàm `hashPassword` đã có sẵn trong `authServer.ts:138` (scrypt, định dạng `scrypt$salt$hash`) — dùng lại, không tự viết mới.
- `login/route.ts:55-57`: **giữ nguyên fallback `acc.password === password`**. Đây là đường tương thích ngược cho các tài khoản đã tạo trước đó. Xoá nó sẽ khoá cửa toàn bộ giảng viên hiện hữu.
- Khuyến khích: khi đăng nhập thành công qua nhánh fallback chữ thường, tự động ghi đè lại bằng bản băm (lazy migration). Nếu làm, phải test kỹ; nếu thấy rủi ro thì bỏ qua và ghi rõ là đã bỏ qua.

### FIX-4 — Lọc HTML của EPUB
- Lọc tại **một điểm duy nhất**: `src/lib/ebookEngine.ts` chỗ gán `htmlContent` (dòng ~389). Lọc ở đây là mọi nơi tiêu thụ đều sạch, không cần vá hai chỗ render.
- Tái sử dụng `sanitizeHtml` export sẵn từ `src/components/blocks/TextBlock.tsx:69`. Nếu import chéo thấy xấu thì tách hàm đó ra `src/lib/htmlSanitizer.ts` rồi cho cả hai nơi import — nhưng **phải giữ nguyên hành vi hiện tại của TextBlock**, không đổi cấu hình của nó.

> **BẪY — ĐỌC KỸ:** cấu hình hiện tại ở `TextBlock.tsx:83` là
> `allowedSchemesByTag: { img: ['http', 'https', 'data'] }`.
> EPUB thay ảnh trong sách bằng **blob URL** (`ebookEngine.ts:377-380`). Nếu dùng nguyên cấu hình này, **toàn bộ ảnh trong sách EPUB sẽ biến mất**. Bản dùng cho EPUB bắt buộc phải thêm `'blob'` vào danh sách scheme của `img`.

- Kết quả lọc phải bỏ: `<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, mọi thuộc tính `on*`, và `javascript:` trong `href`.
- Kết quả lọc phải giữ: `<p> <h1-h6> <div> <span> <em> <strong> <i> <b> <br> <img> <a> <ul> <ol> <li> <blockquote> <table>` và thuộc tính `style`, `class` — nếu không sách sẽ vỡ trình bày.

### FIX-5 — Siết 2 API proxy
Áp dụng cho **cả hai** file `download-proxy/route.ts` và `proxy-ebook/route.ts` (nên tách hàm dùng chung, tránh lặp code):
- Mở rộng `isPrivateIp` chặn thêm: toàn dải `127.0.0.0/8`, `169.254.0.0/16`, `0.0.0.0`, `::`, `fc00::/7`, `fe80::/10`, và tên miền kết thúc bằng `.internal`.
- Đặt `redirect: 'manual'` trong `fetch`. Nếu nhận 3xx thì đọc header `Location`, chạy lại **toàn bộ** kiểm tra an toàn trên URL mới, tối đa 3 lần chuyển hướng.
- Thêm `rateLimit` (hàm có sẵn `authServer.ts:118`) theo IP: tối đa 30 lượt / 10 phút.
- Giữ nguyên giới hạn dung lượng và các header phản hồi hiện có.

### FIX-6 — RLS Supabase (CHỈ SOẠN FILE, KHÔNG CHẠY)
Tạo `supabase/security_v2.sql` chứa SQL vá policy `"Cho phép mọi người đọc settings"` để khoá anon không đọc được `admin_password` và `block_styles.admin_accounts`. Ghi rõ đầu file: cách an toàn nhất là bỏ policy select cho anon trên bảng `settings` và để server dùng `SERVICE_ROLE_KEY` đọc — **nhưng phải kiểm tra trước xem có chỗ nào trong client gọi Supabase trực tiếp để đọc settings không**, vì gỡ policy sẽ làm trang trắng.
Trong file ghi rõ từng bước và cảnh báo chạy trên môi trường thử trước. **Không tự kết nối Supabase chạy SQL.**

---

## ACCEPTANCE CRITERIA

- [ ] `npx tsc --noEmit` — 0 lỗi.
- [ ] `npm run build` — thành công, đủ 25 route như trước.
- [ ] `grep -rn "Tung@2510" src/ PROJECT_BRAIN.md` — 0 kết quả.
- [ ] `grep -rn "0974248716" src/lib/ src/app/api/` — 0 kết quả (giữ lại ở `dang-nhap/page.tsx:137` cũng được, đó chỉ là placeholder SĐT, không phải bí mật).
- [ ] `grep -rn "checkIsSuperAdminRequest" src/app/api/` — tối thiểu 4 kết quả.
- [ ] Đăng nhập bằng mật khẩu thật trong `ADMIN_PASSWORD` → vào được, `role = super_admin`.
- [ ] Đăng nhập bằng chuỗi `Tung@2510` → **bị từ chối 401**.
- [ ] Với cookie phiên instructor: `GET /api/admin/sao-luu` → 403; `GET /api/admin/manage-accounts` → 403; `POST /api/admin/change-password` → 403.
- [ ] Với cookie phiên super_admin: cả 3 endpoint trên → 200, và response của `manage-accounts` **không chứa chuỗi `"password"`**.
- [ ] Tạo tài khoản giảng viên mới → giá trị lưu trong `block_styles.admin_accounts` bắt đầu bằng `scrypt$`.
- [ ] Tài khoản giảng viên vừa tạo đăng nhập được bằng mật khẩu vừa đặt.
- [ ] Tài khoản giảng viên cũ (mật khẩu chữ thường) vẫn đăng nhập được.
- [ ] Mở một file EPUB có chứa `<script>alert(1)</script>` và `<img src=x onerror=alert(2)>` → không có hộp thoại nào bật ra.
- [ ] Mở một file EPUB bình thường có ảnh → **ảnh vẫn hiện đầy đủ** (đây là chốt chặn cho bẫy blob ở FIX-4).
- [ ] `GET /api/download-proxy?url=http://169.254.169.254/latest/meta-data/` → 403.
- [ ] `GET /api/download-proxy?url=<URL 302 trỏ về 127.0.0.1>` → 403.
- [ ] `GET /api/download-proxy?url=<URL epub công khai hợp lệ>` → 200, tải được bình thường.
- [ ] 6 trang `/`, `/tim-kiem`, `/danh-muc`, `/da-luu`, `/tro-ly-ai`, `/dang-nhap` ở khung 390x844: 0 lỗi console, `scrollWidth === 390`.

---

## TEST PLAN

1. **Tĩnh:** `npx tsc --noEmit` rồi `npm run build`. Chạy đủ các lệnh `grep` ở phần acceptance, dán nguyên output.
2. **API bằng curl:** `npm run start` (cổng 3080). Lấy cookie bằng cách đăng nhập thật cho từng vai (một super_admin, một instructor), rồi gọi lần lượt các endpoint ở phần acceptance. Dán mã HTTP và thân phản hồi.
3. **EPUB:** tự tạo 2 file test trong `scratch/` — một file nhiễm `<script>` và `onerror`, một file sạch có ảnh. Mở cả hai trong reader. Chụp ảnh cả hai.
4. **Proxy:** curl 3 trường hợp ở phần acceptance, dán output.
5. **Giao diện Playwright 390x844:** chụp 6 trang. Thêm 2 ảnh: trang `/dang-nhap` (chứng minh placeholder đã sạch) và màn đọc EPUB có ảnh (chứng minh FIX-4 không làm vỡ ảnh).
6. **Hồi quy:** đăng nhập bằng cả 2 vai, vào chế độ chỉnh sửa, sửa thử một khối nội dung và lưu — xác nhận chức năng quản trị thường ngày không hỏng.

---

## EVIDENCE REQUIRED BEFORE DONE

Mọi ảnh phải nhúng thẳng vào đoạn chat bằng `![Mô tả](file:///...)` theo luật GEMINI.md số 2. Cấm chỉ đưa tên file.

- [ ] Output đầy đủ của `tsc` và `npm run build`.
- [ ] Output đầy đủ của toàn bộ lệnh `grep` trong acceptance.
- [ ] Bảng mã HTTP cho từng endpoint × từng vai (super_admin / instructor).
- [ ] Ảnh: EPUB nhiễm độc mở ra không có alert.
- [ ] Ảnh: EPUB sạch mở ra ảnh hiện đầy đủ.
- [ ] Ảnh: `/dang-nhap` 390x844 với placeholder đã sạch.
- [ ] Ảnh: 6 trang chính 390x844.
- [ ] `git diff --stat` và diff đầy đủ của từng file đã sửa.
- [ ] Một dòng xác nhận giá trị băm `scrypt$...` thật sự nằm trong DB sau khi tạo tài khoản thử.

---

## DO NOT CLAIM DONE IF

- [ ] Chưa test end-to-end bằng thao tác thật, mới chỉ build pass.
- [ ] Chưa kiểm chứng ảnh trong EPUB vẫn hiện sau khi thêm bộ lọc HTML.
- [ ] Chưa kiểm chứng tài khoản giảng viên cũ (mật khẩu chữ thường) còn đăng nhập được.
- [ ] Còn bất kỳ lệnh `grep` nào trong acceptance trả về kết quả đáng lẽ phải rỗng.
- [ ] Đã `git push` hoặc deploy mà chưa được người dùng cho phép bằng chữ.
- [ ] Đã tự chạy SQL lên Supabase.
- [ ] Có sửa gì đó ngoài phạm vi 6 FIX trên.

Nếu code xong mà chưa test thật được phần nào, báo đúng trạng thái `IMPLEMENTED_NOT_VERIFIED` và nói rõ phần nào chưa kiểm — không ghi là xong.

---

## RISKS / ROLLBACK

| Rủi ro | Dấu hiệu | Xử lý |
|---|---|---|
| Gỡ mật khẩu cứng khi `ADMIN_PASSWORD` trống → không ai đăng nhập được | Đăng nhập luôn trả 401 | Đây là lý do có mục "Điều kiện tiên quyết". Phải kiểm env trước, không được bỏ qua. |
| Bộ lọc HTML nuốt mất blob URL → sách EPUB mất sạch ảnh | Chữ còn, ảnh trắng | Thêm `'blob'` vào `allowedSchemesByTag.img`. Đã cảnh báo ở FIX-4. |
| Vô hiệu token 2 phần → đá văng phiên đang đăng nhập | Admin bị đẩy về trang đăng nhập | Chấp nhận được. Đăng nhập lại là xong. Báo trước cho người dùng. |
| Băm mật khẩu giảng viên làm hỏng tài khoản cũ | Giảng viên cũ không vào được | Giữ nguyên fallback chữ thường ở `login/route.ts:55-57`. Cấm xoá. |
| Chặn SSRF quá tay → chặn nhầm nguồn sách hợp lệ | Tải sách công khai báo 403 | Test với URL Gutenberg/Standard Ebooks thật trước khi báo xong. |

**Rollback:** toàn bộ thay đổi nằm trong working tree, chưa commit. Hỏng thì `git checkout -- <file>` từng file. Không đụng DB nên không có gì để rollback phía Supabase.

---

## SAU KHI XONG — VIỆC NGƯỜI DÙNG PHẢI TỰ LÀM (Codex nhắc lại trong báo cáo)

1. Đổi mật khẩu quản trị thật, vì mật khẩu cũ coi như đã lộ hoàn toàn.
2. Đặt `ADMIN_SECRET` là chuỗi ngẫu nhiên dài, cả ở local lẫn biến môi trường trên Vercel.
3. Xem lại `supabase/security_v2.sql` rồi tự chạy trên Supabase SQL Editor.
4. Đổi mật khẩu cho từng tài khoản giảng viên đang có.
