# CODEX HANDOFF — VÁ LỖI TÍNH NĂNG & TRẢI NGHIỆM ĐỌC SÁCH

> Repo: `d:\app-hoc-doc-sach-v1` (Next.js 14.2.15 App Router)
> Ngày phát lệnh: 10/10/2026
> Người phát lệnh: Claude — đã audit bằng thao tác thật trên Playwright 390x844, tsc 0 lỗi, build 24 trang OK
> Lệnh trước: `CODEX_HANDOFF_SECURITY_FIX.md` — đã hoàn thành, KHÔNG được làm hỏng các bản vá đó

---

## 0. ĐỌC TRƯỚC KHI LÀM BẤT CỨ THỨ GÌ

- `GEMINI.md` — luật 1 (CẤM `git push` khi chưa được cho phép bằng chữ), luật 2 (nghiệm thu bằng ảnh Playwright 390x844), luật 3 (đơn dòng trên mobile).
- `PROJECT_BRAIN.md` — mục 4 (guard-rails dữ liệu), mục 7 (kiến trúc kho sách).
- `CODEX_HANDOFF_SECURITY_FIX.md` — để biết cái gì vừa được vá, tránh vá đè lên.

---

## GOAL

Sau khi xong, 4 điều sau phải đúng:

1. App **không bao giờ** dựng nội dung sách giả. Sách nào không có nội dung thật thì nói thẳng là chưa có, kèm lối đi để nạp nội dung vào.
2. Bấm vào bất kỳ kết quả tìm kiếm nào cũng mở **đúng cuốn đó**. Không bao giờ âm thầm mở cuốn khác.
3. Mọi lời hứa trên giao diện đều đúng sự thật. Chỗ nào không mở được đúng trang thì không được ghi là "Bấm vào để mở đúng trang".
4. Các nút nhỏ trên kệ sách bấm trúng được bằng ngón tay, **mà không đổi một pixel nào về mặt nhìn**.

---

## CURRENT STATE / EVIDENCE

Đã kiểm chứng bằng thao tác thật, không phải suy đoán.

### CRITICAL-A — Tìm kiếm mở sai cuốn sách (nguyên nhân đã xác định chính xác)

`src/app/tim-kiem/page.tsx:635-649`:

```ts
const targetBook =
  books.find((b) => b.id === snippet.bookId) ||
  books.find((b) => removeVietnameseTones(b.title).includes(removeVietnameseTones(snippet.bookTitle))) ||
  books[0];                                    // <-- DÒNG 643, THỦ PHẠM
```

Khi không khớp được cuốn nào, nó lặng lẽ lấy `books[0]` — cuốn đầu danh sách.

**Tái hiện:** vào `/tim-kiem`, gõ `kháng viêm`. Thẻ kết quả ghi sách **"Dinh Dưỡng Nền Tảng & Phục Hồi Khớp" – Trang 2**. Bấm vào → đầu đọc mở ra với tiêu đề **"Hiểu Đúng Về Cột Sống"** (chính là `books[0]`). Sai cuốn, và người dùng không hề được báo.

### CRITICAL-B — Sách không có nội dung, app tự dựng nội dung giả bằng bìa sách khác

`src/lib/bookReaderPages.ts`:
- Dòng 9-19: hằng số `DEFAULT_ATLAS_PAGES` — một danh sách **ảnh bìa của các cuốn khác** được dùng làm "trang nội dung".
- Dòng 61-140+: mỗi cuốn sách chuyên đề có một nhánh `if (title.includes(...))` trả về một dãy ảnh bìa của những cuốn khác, coi đó là các trang của cuốn đang mở.

**Tái hiện:** mở "Hiểu Đúng Về Cột Sống" từ kệ. Trang 1 đúng bìa của nó. Trang 2 là bìa cuốn **"Atlas Giải Phẫu Cột Sống & Cơ Thể 3D"**. Đầu đọc báo 7 trang, 6 trang trong đó là bìa cuốn khác.

`src/lib/bookTocData.ts` chỉ chứa mục lục: mỗi chương có `title`, `pageIndex`, `pageNumber`, `summary` một dòng. Đếm bằng script: **0 đoạn thân bài nào dài quá 40 ký tự**. Tức là trong dữ liệu không hề có thân sách.

> Đây là lỗi sản phẩm, không phải lỗi hiển thị. Phần này KHÔNG yêu cầu Codex viết nội dung sách. Yêu cầu là **ngừng bịa**, và làm đúng với thực tế sách đến từ nhiều nguồn.

### CRITICAL-C — Giao diện hứa điều không tồn tại

`src/app/tim-kiem/page.tsx:987-991` hiển thị nhãn **"TRÍCH ĐOẠN TRONG TRANG SÁCH (n)"** và **"Bấm vào để mở đúng trang"**, rồi ở dòng 1025-1027 in ra `snip.snippet`.

Nhưng `snip.snippet` lấy từ trường `summary` của mục lục (`bookTocData.ts`) — đó là câu tóm tắt chương do người viết đặt ra, **không phải chữ nằm trên trang nào cả**. Nên về bản chất không tồn tại cái "đúng trang" để mở.

### MEDIUM-D — Nút trên kệ sách quá nhỏ để bấm

Đo thực tế trên khung 390x844 ở trang chủ:
- 12 nút **"Xem tóm tắt sách …"**: **13x13 px**.
- "Thu nhỏ sách" / "Phóng to sách": 24x24 px.
- "Đưa sách vào kệ" / "Đổi thứ tự sắp xếp sách": 28x28 px.

Chuẩn tối thiểu cho mục tiêu chạm: 44x44 (iOS) / 48x48 (Android).

### MEDIUM-E — Số trang không khớp mục lục

`bookTocData.ts` khai cuốn `hieudungvecotsong` có **4 mục** (pageNumber 1→4). Đầu đọc hiển thị **7 trang**. Nhảy theo mục lục sẽ lệch trang.

### MEDIUM-F — Mỗi trang nặng thêm 60 kB

So với bản trước khi vá bảo mật: `/` 318 → **378 kB**, `/tim-kiem` 284 → **345 kB**, `/danh-muc` 238 → **298 kB**, `/da-luu` 224 → **284 kB**, `/tro-ly-ai` 230 → **290 kB**.

Nguyên nhân: `sanitize-html` bị kéo vào gói chạy trên trình duyệt qua `src/lib/ebookEngine.ts:5` → `htmlSanitizer.ts`. Chunk chứa nó nặng 304 KB chưa nén.

### MEDIUM-G — Ảnh logo và icon PWA có thể không lên được production (CHƯA KIỂM CHỨNG)

`.gitignore` vẫn có dòng `public/*.png`, loại trừ `logo.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-*.png`, `apple-icon.png`, `spine_hero_clean.png`. Nếu Vercel build từ GitHub thì logo và icon PWA sẽ thiếu. Chưa xác minh được vì chưa biết các file này đã được commit từ trước hay chưa.

### MINOR-H — Con dấu tròn trên bìa bị cắt chữ

Con dấu "CHUẨN Y KHOA · CHUYÊN SÂU" vẽ trên canvas bị tràn khỏi đường tròn, mất chữ ở hai mép (nhìn thấy "HUẨN Y KHOA"). Lỗi lặp trên mọi bìa sinh bằng canvas ở khung 390.

---

## NON-NEGOTIABLES

1. **CẤM `git push`, CẤM deploy Vercel.** Chờ người dùng gõ chữ "Đẩy" hoặc "Chốt và đẩy lên".
2. **CẤM đụng vào các nút trong giao diện đọc sách.** Thanh công cụ của đầu đọc (Thoát về kệ sách, Mục lục, Chế độ đọc sách, nút trăng, Aa, AI, Tiện ích khác) và cụm "Về trang / Trang x / y / Mở trang" đã được người dùng chốt. Không đổi kích thước, vị trí, thứ tự, icon, nhãn hay màu của chúng. Kể cả khi thấy chúng nhỏ hơn 44px — đó là lựa chọn đã chốt, không phải lỗi.
3. **CẤM bịa nội dung sách.** Không tự viết thân bài, không lấy ảnh của cuốn này làm trang của cuốn kia, không sinh nội dung bằng AI để lấp chỗ trống.
4. **CẤM đụng dữ liệu Supabase.** Không xoá, không migration, không chạy SQL.
5. **Giữ nguyên các bản vá bảo mật** của lệnh trước, đặc biệt là `blob` trong `sanitizeEpubHtml` (ảnh EPUB phụ thuộc vào nó).
6. **Chỉ sửa Delta.** Không rebuild lại module vì vài dòng lỗi.
7. Sách nào **đang hiển thị nội dung thật** (có `pages`, `flipbook_pages`, `gallery_images` từ Supabase, hoặc có file EPUB/PDF/CBZ/TXT) thì phải tiếp tục hoạt động y như cũ. Tuyệt đối không được làm hỏng nhóm này.

---

## FILES TO INSPECT FIRST

```
src/lib/bookReaderPages.ts          (toàn bộ — trung tâm của CRITICAL-B)
src/lib/bookTocData.ts              (cấu trúc BookTocItem, chỉ có summary)
src/app/tim-kiem/page.tsx           (dòng 600-700 handler, 960-1060 khối trích đoạn)
src/lib/types.ts                    (RecommendedBook, AuthorBook: các trường nguồn nội dung)
src/components/SideBooksReaderModal.tsx     (đầu đọc ảnh/canvas)
src/components/EpubReaderView.tsx           (đầu đọc EPUB — đường có chữ thật)
src/lib/ebookEngine.ts                      (nhận diện định dạng, phân luồng nguồn)
src/components/ImportBookModal.tsx          (luồng nạp sách từ link/file — TÁI SỬ DỤNG)
src/components/OnlineLibrarySection.tsx     (kho sách trực tuyến — TÁI SỬ DỤNG)
src/components/WoodenBookshelf.tsx          (kệ sách, các nút 13x13)
src/lib/bookFlipbookData.ts                 (dữ liệu trang flipbook)
```

---

## IMPLEMENTATION REQUIREMENTS

Mô tả theo **hành vi cần đạt**. Cách hiện thực cụ thể do Codex quyết.

### FIX-A — Không bao giờ mở sai sách

`src/app/tim-kiem/page.tsx:643`: bỏ `|| books[0]`.

Khi không khớp được cuốn nào:
- Không mở đầu đọc.
- Báo cho người dùng bằng một thông báo ngắn gọn tiếng Việt, đúng một dòng trên mobile.
- Ghi `console.warn` kèm `snippet.bookId` và `snippet.bookTitle` để sau này dò được.

Rà soát cả file xem còn chỗ nào dùng kiểu dự phòng "lấy phần tử đầu danh sách" tương tự không (`books[0]`, `[0]` sau một `find` thất bại). Có thì xử lý cùng nguyên tắc: thà không mở còn hơn mở sai.

### FIX-B — Ngừng bịa nội dung, phân luồng theo nguồn thật

Sách đến từ nhiều nguồn khác nhau. Viết lại `getBookReaderPageUrls` trong `src/lib/bookReaderPages.ts` thành một bộ phân loại trả về **nguồn nội dung thật**, thay vì luôn trả về một mảng URL ảnh.

Gợi ý kiểu trả về (Codex tự chốt tên):

```ts
type BookContent =
  | { kind: 'pages';  urls: string[] }      // có ảnh trang thật
  | { kind: 'file';   url: string; format: 'epub'|'pdf'|'cbz'|'txt'|'docx' }
  | { kind: 'empty';  reason: 'no-content' }
```

Thứ tự ưu tiên khi xác định nguồn:
1. `book.pages` (ảnh trang từ Supabase) → `kind: 'pages'`
2. `book.flipbook_pages` → `kind: 'pages'`
3. `book.gallery_images` → `kind: 'pages'`
4. Có file sách thật (`file_url` / `fileUrl` / đường dẫn `/documents/*.epub|.pdf|.cbz|.txt`) → `kind: 'file'`, giao cho đầu đọc tương ứng đang có sẵn
5. Không có gì → `kind: 'empty'`

**Xoá bỏ hoàn toàn:**
- Hằng số `DEFAULT_ATLAS_PAGES`.
- Toàn bộ các nhánh `if (title.includes('...'))` trả về dãy bìa sách khác (các mục 3 đến hết trong file hiện tại).

**Khi `kind: 'empty'`,** đầu đọc không mở ở chế độ lật trang. Thay vào đó hiện một màn hình trung thực, tinh gọn, đúng chuẩn 1 dòng trên 390x844:
- Bìa thật của cuốn sách.
- Một câu nói rõ sự thật, ví dụ: *"Cuốn này chưa có nội dung đọc được."*
- Mục lục các chương nếu `bookTocData` có — nhưng phải gắn nhãn đúng là **Mục lục**, và các mục **không bấm được** (vì không có trang để tới).
- Các nút hành động, **tái sử dụng component đã có, không viết mới**: mở `ImportBookModal` để nạp file hoặc dán link; mở `OnlineLibrarySection` để tìm bản sách trực tuyến.

Sau khi xong, nếu còn sách nào rơi vào `kind: 'empty'`, **liệt kê tên chúng ra trong báo cáo** để người dùng biết cần nạp nội dung cho những cuốn nào.

### FIX-C — Nhãn giao diện phải đúng sự thật

Trong `src/app/tim-kiem/page.tsx` khối dòng 980-1060:

- Phân biệt rõ hai loại kết quả:
  - **Trích đoạn thật** — chữ thực sự nằm trong một trang/chương mở được. Giữ nguyên nhãn "Trích đoạn trong trang sách" và "Bấm vào để mở đúng trang", và bấm vào phải nhảy đúng trang đó.
  - **Tóm tắt mục lục** — dữ liệu hiện tại thuộc loại này. Đổi nhãn thành **"Mục lục & tóm tắt chương"**, bỏ dòng "Bấm vào để mở đúng trang". Bấm vào thì mở trang chi tiết sách (hoặc màn hình `empty` ở FIX-B), không giả vờ nhảy trang.
- Phân loại dựa trên nguồn dữ liệu thật của mỗi kết quả, không hardcode.
- Giữ nguyên bố cục thẻ kết quả, chỉ đổi nhãn và hành vi bấm. Mọi nhãn phải nằm trọn 1 dòng ở 390px.

### FIX-D — Nút trên kệ bấm trúng mà KHÔNG đổi giao diện

Chỉ áp dụng cho các nút **trên kệ sách / trang chủ** (`WoodenBookshelf.tsx` và component liên quan). **Không đụng vào đầu đọc** (xem NON-NEGOTIABLES mục 2).

Yêu cầu: mở rộng **vùng chạm** lên tối thiểu 44x44 px mà **giữ nguyên 100% kích thước nhìn thấy được**. Cách làm: thêm vùng chạm trong suốt quanh nút bằng pseudo-element, ví dụ

```css
.tap-target-44::after {
  content: '';
  position: absolute;
  inset: -16px;        /* 13px + 16px*2 ≈ 45px */
}
```

kèm `position: relative` trên nút. Tuyệt đối không dùng `padding`, không đổi `width`/`height`, không đổi `font-size`, không đổi khoảng cách giữa các nút — vì những cách đó sẽ làm xê dịch bố cục kệ sách.

Áp dụng cho: 12 nút "Xem tóm tắt sách", "Thu nhỏ sách", "Phóng to sách", "Đưa sách vào kệ", "Đổi thứ tự sắp xếp sách".

Kiểm tra các vùng chạm mở rộng **không chồng lên nhau** — hai nút cạnh nhau cách 26px thì vùng chạm sẽ đè nhau, phải cân lại `inset` cho từng cụm sao cho không cướp cú chạm của nhau.

### FIX-E — Số trang khớp mục lục

Sau khi FIX-B xong, `pageNumber` trong `bookTocData.ts` phải trỏ đúng vào số trang thật của nguồn nội dung. Với sách `kind: 'empty'` thì mục lục chỉ để đọc, không có trang để trỏ, nên không còn mâu thuẫn.

Rà lại mọi cuốn trong `CURATED_BOOK_TOCS`: nếu `pageNumber` lớn nhất vượt quá số trang thật của cuốn đó, ghi cảnh báo ra console lúc dev và **liệt kê trong báo cáo**. Không tự ý sửa số trang theo phỏng đoán.

### FIX-F — Giảm 60 kB (TUỲ CHỌN, làm sau cùng)

Chỉ làm nếu 5 mục trên đã xong và test sạch. Nếu thiếu thời gian thì bỏ qua và nói rõ là đã bỏ qua.

Thay `sanitize-html` ở đường EPUB bằng bộ lọc tự viết dùng `DOMParser` có sẵn của trình duyệt, với đúng danh sách thẻ và thuộc tính cho phép như `sanitizeEpubHtml` hiện tại, **kể cả scheme `blob` cho ảnh**.

Bắt buộc: giữ nguyên `sanitize-html` cho `TextBlock.tsx` (chạy cả phía server, không có `DOMParser`). Và phải chạy lại đủ bộ test XSS ở `CODEX_HANDOFF_SECURITY_FIX.md` — nếu không chứng minh được là chặn XSS tương đương thì **hoàn nguyên, giữ `sanitize-html`**. 60 kB rẻ hơn một lỗ XSS.

### FIX-G — Xác minh ảnh logo/icon (XÁC MINH TRƯỚC, SỬA SAU)

Chạy:

```
git ls-files public/ | findstr /i ".png"
```

- Nếu các file png đã được theo dõi từ trước → không có vấn đề gì, báo lại và bỏ qua.
- Nếu thiếu `logo.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-*.png`, `apple-icon.png`, `spine_hero_clean.png` → sửa `.gitignore`: thay `public/*.png` bằng quy tắc hẹp hơn chỉ loại ảnh chụp màn hình QA (ví dụ `public/test_*.png`, `public/verify_*.png`), rồi `git add` các file thiếu. **Không commit, không push** — chỉ đưa vào staging và báo lại.

### FIX-H — Con dấu tròn trên bìa

Trong code vẽ canvas (tìm trong `BookCoverArt.tsx` hoặc `atlasCanvasGenerator.ts`), co chữ trong con dấu cho vừa đường kính: giảm cỡ chữ theo tỷ lệ, hoặc tăng đường kính dấu, hoặc xuống dòng. Chuẩn đạt: ở 390x844 đọc trọn vẹn "CHUẨN Y KHOA" và "CHUYÊN SÂU", không mất ký tự nào ở hai mép.

---

## ACCEPTANCE CRITERIA

- [ ] `npx tsc --noEmit` — 0 lỗi.
- [ ] `npm run build` — thành công, đủ số route như trước.
- [ ] `grep -rn "DEFAULT_ATLAS_PAGES" src/` — 0 kết quả.
- [ ] `grep -n "books\[0\]" src/app/tim-kiem/page.tsx` — 0 kết quả.
- [ ] Tìm `kháng viêm` → bấm thẻ kết quả → mở **đúng cuốn ghi trên thẻ**, hoặc báo rõ không mở được. Tuyệt đối không mở cuốn khác.
- [ ] Mở "Hiểu Đúng Về Cột Sống" từ kệ → **không còn** trang nào là bìa của cuốn khác.
- [ ] Cuốn không có nội dung → hiện màn hình trung thực kèm nút nạp sách, **không** mở chế độ lật trang giả.
- [ ] Cuốn **có** nội dung thật (EPUB trong `public/documents/`, hoặc sách có `flipbook_pages`) → vẫn đọc được bình thường, ảnh trong EPUB vẫn hiện đầy đủ.
- [ ] Nhãn "Bấm vào để mở đúng trang" chỉ còn xuất hiện ở nơi bấm vào thật sự nhảy đúng trang.
- [ ] Mọi nút trên kệ có vùng chạm ≥ 44x44 px, đo bằng script; **ảnh chụp kệ sách trước và sau phải giống hệt nhau**.
- [ ] Thanh công cụ đầu đọc giữ nguyên tuyệt đối: so ảnh trước/sau, không lệch một pixel.
- [ ] Con dấu "CHUẨN Y KHOA · CHUYÊN SÂU" đọc được trọn vẹn.
- [ ] 6 trang `/`, `/tim-kiem`, `/danh-muc`, `/da-luu`, `/tro-ly-ai`, `/dang-nhap` ở 390x844: 0 lỗi console, `scrollWidth === 390`.
- [ ] Toàn bộ tiêu chí bảo mật ở `CODEX_HANDOFF_SECURITY_FIX.md` vẫn đạt (chạy lại).

---

## TEST PLAN

1. **Tĩnh:** `npx tsc --noEmit`, `npm run build`, các lệnh `grep` ở phần acceptance. Dán nguyên output.
2. **Luồng tìm kiếm:** gõ `kháng viêm`, `dinh dưỡng`, `nước`, `cột sống`. Với mỗi truy vấn, bấm vào từng loại kết quả (Sách của bạn / Sách trực tuyến / Mục lục). Ghi lại: thẻ ghi tên sách gì → mở ra cuốn gì. Phải khớp 100%.
3. **Luồng đọc:** mở 3 cuốn — một cuốn có ảnh trang thật, một cuốn EPUB có ảnh bên trong, một cuốn không có nội dung. Chụp cả ba.
4. **Đo vùng chạm:** script Playwright duyệt mọi `button` trên trang chủ, in ra kích thước vùng chạm thật (tính cả pseudo-element) và kích thước nhìn thấy. Dán bảng kết quả.
5. **So ảnh trước/sau:** chụp kệ sách và thanh công cụ đầu đọc trước khi sửa và sau khi sửa, đặt cạnh nhau. Phải không phân biệt được.
6. **Hồi quy bảo mật:** chạy lại bộ test EPUB nhiễm `<script>` và `onerror`, và 3 ca SSRF ở lệnh trước.
7. **Hồi quy quản trị:** đăng nhập super_admin, vào chế độ chỉnh sửa, sửa và lưu một khối nội dung.

---

## EVIDENCE REQUIRED BEFORE DONE

Ảnh nhúng thẳng vào chat bằng `![Mô tả](file:///...)` theo GEMINI.md luật 2. Cấm chỉ đưa tên file.

- [ ] Output `tsc`, `npm run build`, và mọi lệnh `grep`.
- [ ] Bảng: truy vấn tìm kiếm → tên sách trên thẻ → tên sách thực sự mở ra (ít nhất 8 dòng).
- [ ] Ảnh: mở "Hiểu Đúng Về Cột Sống", lật hết các trang — chứng minh không còn bìa cuốn khác.
- [ ] Ảnh: màn hình sách chưa có nội dung.
- [ ] Ảnh: một cuốn EPUB đọc được, ảnh bên trong vẫn hiện.
- [ ] Ảnh so sánh kệ sách trước/sau và thanh công cụ đầu đọc trước/sau.
- [ ] Bảng đo vùng chạm mọi nút trên trang chủ.
- [ ] Ảnh: con dấu tròn đã đọc được trọn chữ.
- [ ] `git diff --stat` và diff đầy đủ từng file.
- [ ] Danh sách các cuốn sách còn rơi vào trạng thái chưa có nội dung.
- [ ] Danh sách các cuốn có `pageNumber` mục lục vượt quá số trang thật.

---

## DO NOT CLAIM DONE IF

- [ ] Chưa test end-to-end bằng thao tác thật, mới chỉ build pass.
- [ ] Còn bất kỳ trường hợp nào bấm vào mở ra cuốn sách khác với cuốn ghi trên thẻ.
- [ ] Còn bất kỳ trang sách nào là ảnh bìa của cuốn khác.
- [ ] Có thay đổi dù nhỏ về mặt nhìn của thanh công cụ đầu đọc hoặc bố cục kệ sách.
- [ ] Sách đang đọc được trước khi sửa mà sau khi sửa không đọc được nữa.
- [ ] Ảnh trong EPUB biến mất (dấu hiệu làm hỏng `blob` của bản vá bảo mật).
- [ ] Đã tự viết nội dung sách hoặc tự sinh nội dung để lấp chỗ trống.
- [ ] Đã `git push` hoặc deploy mà chưa được cho phép bằng chữ.

Code xong mà chưa test thật được phần nào thì báo `IMPLEMENTED_NOT_VERIFIED` và nói rõ phần nào chưa kiểm — không ghi là xong.

---

## RISKS / ROLLBACK

| Rủi ro | Dấu hiệu | Xử lý |
|---|---|---|
| Xoá `DEFAULT_ATLAS_PAGES` làm sách đang đọc được thành trống | Cuốn trước đọc được giờ báo chưa có nội dung | Trước khi xoá, liệt kê mọi cuốn và nguồn nội dung của nó. Cuốn nào có `pages`/`flipbook_pages`/`gallery_images`/file thật thì phải giữ nguyên đường đi cũ. |
| Mở rộng vùng chạm bằng `padding` làm xô lệch kệ sách | Khoảng cách giữa các bìa sách đổi | Chỉ dùng pseudo-element `inset` âm. So ảnh trước/sau để chốt. |
| Vùng chạm hai nút cạnh nhau đè lên nhau | Bấm nút này ra nút kia | Giảm `inset` ở cụm nút sát nhau, hoặc lệch vùng chạm ra phía không có nút khác. Phải test bấm từng nút. |
| Viết lại bộ lọc HTML ở FIX-F làm thủng XSS | Test EPUB nhiễm độc bật alert | FIX-F là tuỳ chọn. Không chứng minh được tương đương thì hoàn nguyên ngay. |
| Đổi kiểu trả về của `getBookReaderPageUrls` làm vỡ nơi gọi | tsc báo lỗi, hoặc đầu đọc trắng | Tìm hết nơi gọi trước khi đổi. Nếu nhiều nơi gọi thì giữ hàm cũ làm lớp bọc tương thích. |

**Rollback:** thay đổi nằm trong working tree, chưa commit. Hỏng thì `git checkout -- <file>` từng file. Không đụng DB nên không có gì để rollback phía Supabase.

---

## SAU KHI XONG — VIỆC NGƯỜI DÙNG PHẢI TỰ QUYẾT (Codex nhắc lại trong báo cáo)

1. Xem danh sách sách chưa có nội dung, quyết từng cuốn lấy nội dung từ nguồn nào: file EPUB/PDF thật, ảnh trang quét, hay gõ nội dung vào Supabase.
2. Xem danh sách mục lục lệch số trang, quyết sửa mục lục hay sửa nội dung.
3. Nếu FIX-G phát hiện thiếu ảnh trong git: tự kiểm tra lại logo và icon PWA trên bản production sau lần deploy kế tiếp.
