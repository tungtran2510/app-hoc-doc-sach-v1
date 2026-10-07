# CẨM NANG HOẠT ĐỘNG AI AGENT (GEMINI.md) - APP HỌC CƠ THỂ V2 (GIAO DIỆN MỚI)
> **Tài liệu nạp tự động cho AI Agent khi mở thư mục `d:\app-hoc-co-the-v2`**

## 0. QUY TẮC BẤT KHẢ XÂM PHẠM (MANDATORY SUPREME RULES)
1. **TUYỆT ĐỐI KHÔNG TỰ Ý ĐẨY (GIT PUSH) LÊN MẠNG KHI NGƯỜI DÙNG CHƯA CHO PHÉP:**
   Chỉ kiểm thử trên localhost/môi trường xem thử nội bộ. CẤM TUYỆT ĐỐI mọi hành động `git push` hoặc đẩy code lên Vercel/GitHub khi người dùng chưa xác nhận lệnh rõ ràng bằng chữ ("Đẩy" hoặc "Chốt và đẩy lên").
2. **NGHIỆM THU BẰNG MẮT THỰC TẾ TRÊN MOBILE 390x844:**
   Sau BẤT KỲ một thao tác, tính năng, sửa lỗi, căn chỉnh nút bấm hay văn bản nào: Agent BẮT BUỘC phải dùng trình duyệt (Playwright mobile viewport 390x844) chụp ảnh màn hình giao diện thực tế và GỬI TRỰC TIẾP HÌNH ÁNH ĐÓ VÀO ĐOẠN CHAT (dùng định dạng `![Mô tả](file:///...)`) để người dùng nghiệm thu bằng mắt thường. Tuyệt đối CẤM báo cáo chay bằng chữ hay chỉ đưa tên file.
3. **TIÊU CHUẨN TINH GỌN TRÊN ĐIỆN THOẠI & NGUYÊN TẮC ĐƠN DÒNG (STRICT 1-LINE CONSTRAINTS ON MOBILE):**
   Mỗi tính năng hoàn thiện BẮT BUỘC phải chuẩn tinh gọn trên điện thoại. CẤM TUYỆT ĐỐI các nút bấm, nhãn, metadata, tab switcher bị rớt xuống 2 dòng gây xô lệch giao diện, phình trang hoặc rối mắt. Mọi nhãn, nút bấm, thông tin phụ phụ phải tối ưu chặt chẽ trên đúng 1 dòng duy nhất.

## 1. NGUYÊN TẮC CỐT LÕI
1. **Dự án độc lập 100% (Không gian sáng tạo Giao diện mới V2):** Thư mục này (`d:\app-hoc-doc-sach-v1`) được phát triển riêng để cách ly hoàn toàn khỏi bản gốc đang chạy.
2. **Bảo vệ dữ liệu người dùng:** Dùng chung dữ liệu Supabase Database (`evuhamqlzprrbuabxyyn`) nhưng tuyệt đối không xóa, không phá vỡ cấu trúc CSDL hiện tại.
3. **Thỏa sức thiết kế Giao diện mới:** Được phép thiết kế lại trang chủ, trang bài học, phối màu, typography, thẻ bài học hiện đại theo yêu cầu của người dùng.
4. **Tham khảo chi tiết:** Đọc file `PROJECT_BRAIN.md` trong thư mục gốc để nắm rõ kiến trúc toàn hệ thống.

## 2. QUY TRÌNH TRIỂN KHAI CHUẨN
- Kiểm tra biên dịch: `cmd.exe /c npx tsc --noEmit`
- Kiểm tra build: `cmd.exe /c npm run build`
- Kiểm thử trực quan thực tế: Playwright Mobile 390x844 chụp ảnh và gửi trực tiếp vào đoạn chat.

