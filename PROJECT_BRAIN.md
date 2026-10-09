# DỰ ÁN: APP HỌC CƠ THỂ & GIẢI PHẪU (APP-HOC-CO-THE)
> **Bộ nhớ dùng chung & Bối cảnh phát triển toàn diện (Project Brain)**  
> Cập nhật lần cuối: 07/10/2026

---

## 0. QUY TẮC BẤT KHẢ XÂM PHẠM (MANDATORY SUPREME RULES)
1. **NGHIỆM THU BẰNG MẮT THỰC TẾ TRÊN MOBILE 390x844:**
   - Sau BẤT KỲ một thao tác, tính năng, sửa lỗi, căn chỉnh nút bấm hay văn bản nào: Agent BẮT BUỘC phải dùng trình duyệt (Playwright mobile viewport 390x844) chụp ảnh màn hình giao diện thực tế và GỬI TRỰC TIẾP HÌNH ÁNH ĐÓ VÀO ĐOẠN CHAT (dùng định dạng Markdown `![Mô tả ảnh](file:///...)`) để người dùng nghiệm thu bằng mắt thường.
   - Tuyệt đối CẤM báo cáo chay bằng chữ hay chỉ đưa tên file.
2. **TIÊU CHUẨN TINH GỌN TRÊN ĐIỆN THOẠI (STRICT MOBILE-FIRST MINIMALISM):**
   - Mỗi tính năng hoàn thiện BẮT BUỘC phải chuẩn tinh gọn trên điện thoại.
   - CẤM TUYỆT ĐỐI các dòng thừa, từ thừa, nhãn thừa gây rối mắt, phình trang hoặc xô lệch bố cục màn hình dọc.

---

## 1. TỔNG QUAN DỰ ÁN & HẠ TẦNG KỸ THUẬT
- **Tên dự án:** Học Cơ Thể & Giải Phẫu 3D (Mobile-First Web App).
- **Thư mục dự án độc lập:** `d:\app-hoc-co-the`.
- **Framework & Công nghệ:** Next.js 14.2.15 (App Router), React 18, Tailwind CSS, Lucide Icons, TypeScript.
- **Hosting & Triển khai:** Vercel Production (`https://app-hoc-co-the.vercel.app`).
- **Kho mã nguồn:** GitHub (`tungtran2510/app-hoc-co-the`), nhánh chính `main`.
- **Cơ sở dữ liệu Đám mây:** Supabase độc lập (`evuhamqlzprrbuabxyyn`):
  - Bảng chính: `topics` (Chủ đề), `pages` (Bài học), `blocks` (Khối nội dung), `settings` (Cấu hình hệ thống & Admin).
  - Storage: Supabase Storage lưu trữ hình ảnh nén WebP và tài liệu PDF.

---

## 2. TÀI KHOẢN QUẢN TRỊ CỦA NGƯỜI DÙNG
- **Trang đăng nhập:** `https://app-hoc-co-the.vercel.app/dang-nhap`
- **Số điện thoại:** `0974248716`
- **Mật khẩu:** (lưu trong biến môi trường ADMIN_PASSWORD — không ghi vào repo)
- **Tên người dùng:** Tùng Dinh Dưỡng
- **Vai trò:** Admin toàn quyền (Chỉnh sửa nội dung trực tiếp tại chỗ trên trang học).

---

## 3. KIẾN TRÚC NỘI DUNG (3 CẤP: TOPIC -> PAGE -> BLOCK)
Mỗi chủ đề gồm nhiều bài học, mỗi bài học gồm danh sách các khối nội dung (`blocks`).
Hệ thống hỗ trợ đầy đủ **10 khối nội dung chuẩn**:
1. **Khối Hình ảnh & Video:**
   - **Ảnh đơn (`display_style: 'single'`):** Hiển thị 1 ảnh rõ nét, có giao diện chọn ảnh từ máy (tự động nén WebP và chèn ngay), dán link, cắt khung (Crop) theo tỷ lệ.
   - **Bộ sưu tập ảnh (`display_style: 'gallery'`):** Danh sách nhiều ảnh dạng lưới/vuốt, tự động thêm ảnh ngay khi tải từ máy.
   - **Video đơn:** Nhập link YouTube, tự động lấy tiêu đề và ảnh bìa gốc, cho phép đổi ảnh bìa tùy chọn.
   - **Danh sách video:** Quản lý nhiều video bài giảng trong bài học.
2. **Khối Chữ & Ghi nhớ:**
   - **Văn bản (`van_ban`):** Đoạn văn bản mô tả, đính kèm được ảnh và PDF.
   - **Ý nghĩa (`y_nghia`):** Khối nêu bật ý nghĩa y học/chức năng.
   - **Điểm cần nhớ (`diem_can_nho`):** Khối thẻ nhớ quan trọng màu xanh navy/vàng.
   - **Chú ý (`chu_y`):** Khối cảnh báo màu hổ phách/cam.
   - **Sai lầm thường gặp (`sai_lam`):** Khối lưu ý các thói quen sai gây tổn thương cơ thể.
   - **Giải pháp (`giai_phap`):** Khối hướng dẫn bài tập / phương pháp cải thiện.
3. **Các khối bổ trợ khác:** So sánh 2 cột (`comparison`), Câu hỏi thường gặp (`faq`), Mã HTML tùy biến (`html`), Tài liệu Atlas PDF (`files`).

---

## 4. BẢO VỆ DỮ LIỆU & NGUYÊN TẮC KỸ THUẬT QUAN TRỌNG (STRICT GUARD-RAILS)
1. **Lưu thẳng vào Supabase Cloud (Direct Save):**
   - Mọi thao tác thêm/sửa khối gọi thẳng `saveBlockApi` lên Supabase. Không dùng fallback lưu ảo vào `localStorage` của trình duyệt.
   - Khi cập nhật mã nguồn (Deploy Vercel), **CHỈ cập nhật phần code giao diện**, tuyệt đối **KHÔNG xóa hay ghi đè Database Supabase**. Dữ liệu người dùng được bảo toàn 100%.
2. **Không tự ý ẩn khối nội dung:**
   - Cấm thêm bộ lọc ẩn khối chữ khi có video (lỗi cũ đã gỡ bỏ hoàn toàn). Tất cả các khối người dùng tạo ra phải được hiển thị trung thực trên trang.
3. **Tránh Unsplash trên mạng Việt Nam:**
   - Cấm dùng link `images.unsplash.com` làm ảnh mặc định vì dễ bị chặn trên Viettel/Vinaphone. Dùng ảnh nội bộ `/spine_hero_clean.png` hoặc Supabase Storage.
4. **Tự động gắn tệp khi upload:**
   - Khi người dùng bấm "Chọn từ máy", ngay khi hoàn tất tải lên hệ thống phải tự động gán vào mảng dữ liệu, không bắt người dùng bấm thêm nút phụ.

---

## 5. HỆ THỐNG PHÂN QUYỀN ĐA KHÓA HỌC & GIẢNG VIÊN (RBAC) - ĐÃ HOÀN TẤT
- **Chủ sở hữu tối cao (Super Admin):**
  - SĐT: `0974248716` (Tùng Dinh Dưỡng) hoặc mật khẩu quản trị máy chủ.
  - Toàn quyền 100%: Quản lý tất cả khóa học, cài đặt chung, sao lưu CSDL, và trực tiếp cấp/sửa/xóa tài khoản giảng viên con tại tab "Giảng viên" trong Cài đặt quản trị.
- **Tài khoản Giảng viên (Instructor Sub-Accounts):**
  - Đăng nhập bằng SĐT + Mật khẩu riêng tại `/dang-nhap`.
  - Phân quyền theo danh sách chủ đề (`allowed_topic_ids`): Chỉ thấy nút sửa, thêm khối, quản lý bài học trên những chủ đề được bàn giao.
  - Tự động chặn quyền chỉnh sửa tại cả 2 tầng:
    + Client: Không hiện các nút quản trị trên bài học ngoài phạm vi.
    + Server API: `/api/admin/save-block`, `/api/admin/delete-block`, `/api/admin/save-page` kiểm tra quyền sở hữu chủ đề trước khi ghi vào Supabase.
  - Ẩn hoàn toàn các chức năng nhạy cảm (Đổi tên app, Đổi mật khẩu hệ thống, Sao lưu CSDL).

---

## 6. ĐỊNH HƯỚNG THƯƠNG MẠI HÓA TIẾP THEO
- **Mô hình White-label (Bán cho đối tác theo tên miền riêng):**
  - Cung cấp web riêng với logo, thương hiệu và nội dung độc lập cho từng khách hàng hoặc phòng khám.

---

## 7. KIẾN TRÚC E-BOOK & KHO SÁCH TRỰC TUYẾN (BẢN V2 MỚI NHẤT)
1. **Trợ lý AI Tìm Sách & Khuyến Nghị Tinh Gọn (Khắc phục triệt để lỗi giảng giải lê thê):**
   - AI đóng vai trò Thủ thư hỗ trợ tra cứu sách, tuyệt đối KHÔNG đưa ra lời chẩn đoán bệnh, đơn thuốc hay các gạch đầu dòng triệu chứng bệnh học dài dòng.
   - Lời dẫn AI cố định 1 câu súc tích: *"Sau khi đã hiểu rõ nhu cầu của bạn, đây là những gợi ý đầu sách phù hợp nhất về [chủ đề] của tôi:"* kèm các thẻ sách thực tế (tựa đề, tác giả, loại sách đọc/nói, lý do khớp 1 dòng, nút mở đọc ngay 3D).
2. **Bộ Xử Lý Tìm Kiếm Tự Nhiên (Smart NLP Keyword Matching):**
   - Tự động tách câu văn hội thoại dài (ví dụ: *"Tôi thích một cuốn sách nói về dinh dưỡng và các chế độ ăn..."*), loại bỏ từ dừng tiếng Việt (`matchSmartKeywords` trong `onlineLibraryData.ts`), lọc ra các cặp từ và từ khóa trọng tâm để xếp hạng sách chính xác ở cả tab *Sách của bạn* và *Sách trực tuyến*.
3. **Tải Sách Thực Tế & Lưu Trữ Ngoại Tuyến (Offline Storage):**
   - Lưu trữ Blob trực tiếp vào `IndexedDB` của trình duyệt, có cơ chế `download-proxy` vượt tường lửa CORS từ các nguồn mở/Internet Archive/Project Gutenberg.
   - Tải về thực tế hoàn tất sẽ chuyển nút sang màu xanh ngọc *"Đọc ngay"*, mở đọc trực tiếp trong SideBooks 3D Reader ngoại tuyến mà không cần đăng nhập.
4. **Quy Tắc Đơn Dòng Tuyệt Đối Trên Mobile (390x844):**
   - Toàn bộ thanh lọc (Tất cả, Sách đọc, Sách nói, Dán link), thẻ metadata và nút bấm bắt buộc 1 dòng duy nhất, cấm gãy thành 2 dòng.
6. **Rà Soát Toàn Cục Ứng Dụng - Tối Giản, Tinh Gọn, Thông Minh & Đơn Dòng Tuyệt Đối (Global Polish):**
   - **Trang Chủ (`/`):** Loại bỏ hoàn toàn nút Floating AI đè lên cụm nút Header Settings/Exit; giao diện Kệ sách gỗ 3D giữ trọn vẻ đẹp tự nhiên, sang trọng, tinh tế và không có thành phần thừa.
   - **Trang Danh Mục (`/danh-muc`):** Khắc phục triệt để lỗi tiêu đề bị rớt 3 dòng ("Danh" / "Mục" / "Sách") trên màn hình 390x844; chuẩn hóa tiêu đề và nút thêm danh mục trên đúng 1 dòng duy nhất (`whitespace-nowrap`). Xóa bỏ hoàn toàn khối Hỏi đáp FAQ tĩnh cồng kềnh, loại bỏ lỗi lặp 2 lần tên tác giả trong thẻ sách.
   - **Trang Đã Lưu (`/da-luu`):** Loại bỏ khối giải thích kỹ thuật IndexedDB dài dòng ở chân trang; rút gọn tiêu đề sách để không bị tràn dòng hoặc cắt chữ.
   - **Trang Tìm Kiếm (`/tim-kiem`):** Tích hợp nút AI bám đuổi góc dưới bên phải ("✨ Nhờ AI tìm sách"), mở modal gợi ý đầu sách thông minh chuẩn xác; thân trang tìm kiếm sạch sẽ, tối giản tuyệt đối.



