# BẢNG KHAI BÁO SỬ DỤNG CÔNG CỤ AI HỖ TRỢ
**Học phần:** Chuyên đề Tốt nghiệp 1 (Specialized Graduation Topic I)  
**Học kỳ:** HK1, Năm học 2026 – 2027  
**Bài nộp:** Bài tập 2 – Hiện thực hóa module cốt lõi (`BT2_2374802010384_LeTanPhong.pdf`, tag `v0.2`); gồm cả khai báo của Bài tập 1  
**Giai đoạn:** Buổi 1–12 (Tuần 1–6)

---

### I. THÔNG TIN SINH VIÊN
* **Họ và tên:** Lê Tấn Phong
* **Mã số sinh viên:** 2374802010384
* **Chuyên ngành (Track):** [x] SE   [ ] DA   [ ] AI
* **Luồng nghiệp vụ đã chọn:** L7 – Chất lượng dữ liệu khách hàng
* **Repo GitHub:** https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7

---

### II. BẢNG KHAI BÁO CHI TIẾT

#### II.1. Bài tập 2 – Hiện thực hóa module cốt lõi (Buổi 7–12)

Phần lớn mã nguồn Sprint 1, Sprint 2 và Bài tập 2 do Claude Code viết theo yêu cầu của em; phạm vi, dữ liệu mẫu và thứ tự công việc do em chọn. Cột cuối chỉ ghi những kiểm chứng đã chạy thật, kèm lệnh hoặc con số.

| Công cụ AI | Dùng vào việc gì | Áp dụng ở phần nào (File / Mục) | Em đã kiểm chứng thế nào |
| :--- | :--- | :--- | :--- |
| **Claude Code (Anthropic)** | Hiện thực module lõi Sprint 1–2 (Buổi 8–10): migration và seed, ba lớp routes / services / repositories cho khách hàng, nhập file CSV trong một giao dịch (NFR3), duyệt cặp nghi trùng (BR4), đăng nhập JWT và phân quyền (QT-14, QT-15), giao diện React MH1–MH3 với ba trạng thái | `migrations/001_init.sql`, `seeds/001_demo.sql`, `src/`, `frontend/src/`, `scripts/` | Chạy `npm test`; chạy `npm run e2e` (đăng nhập, nhập 3.000 dòng trong khoảng 0,3 giây, xem lỗi, gộp cặp, quyết định lần hai bị từ chối 409, tra SĐT hồ sơ đã gộp); clone repo vào thư mục mới và chạy đủ các bước README; chụp giao diện thật bằng trình duyệt |
| **Claude Code (Anthropic)** | Bài tập 2, S1: xóa mềm hồ sơ khách hàng (`deleted_at`, ba luật chặn xóa, nhập file khôi phục hồ sơ đã xóa), quản lý tài khoản CRUD (`/api/users`), xác thực đọc lại tài khoản ở mỗi request | `migrations/002_customer_soft_delete.sql`, `src/services/customer.service.js`, `user.service.js`, `auth.service.js`, `src/repositories/`, `src/routes/user.routes.js` | Test cho từng luật (`npm test`: 107 test PASS); 14 kiểm tra xóa mềm và 19 kiểm tra quản lý tài khoản qua HTTP thật trên MariaDB (khóa ngoại chặn xóa tài khoản có lần nhập, token của tài khoản vừa xóa bị 401); chạy migration 002 hai lần không lỗi, chạy seed hai lần không nhân đôi dòng |
| **Claude Code (Anthropic)** | Xử lý lỗi và log theo Buổi 11: lỗi mất kết nối CSDL trả 503, log không ghi query string và che SĐT, từ chối file CSV không phải UTF-8 | `src/db.js`, `src/logger.js`, `src/routes/http-error.js`, `src/services/import.service.js`, `frontend/src/api/messages.js` | Tái hiện từng lỗi **trước khi sửa** bằng server thật rồi đọc log thật (SĐT nằm trong dòng log; đăng nhập khi CSDL tắt trả 500; file ANSI nhận 201); sửa xong chạy lại đúng kịch bản (503 sau 25 ms, log chỉ còn đường dẫn, file ANSI bị 400) và thêm test hồi quy; thử thêm 11 loại file sai |
| **Claude Code (Anthropic)** | Soạn tài liệu Bài tập 2: nhật ký thay đổi thiết kế, API contract, Bug Log, kiến trúc thực tế, README | `docs/thay-doi-thiet-ke.md`, `docs/api-contract.md`, `docs/bug-log.md`, `docs/architecture-thuc-te.md`, `README.md` | Đối chiếu từng mục với commit và kết quả chạy; chạy lệnh `rg` kiểm ranh giới lớp (service không có dấu vết HTTP hay SQL); mỗi mục Bug Log có link commit và test hồi quy tương ứng |
| **Claude (Anthropic), vai trò rà soát** | Rà soát phương án và mã trước khi chốt: chỉ ra token của tài khoản đã xóa vẫn dùng được, file CSV ANSI bị nhận, database mặc định chưa chạy migration 002, tài liệu còn nói "không có DELETE" | Toàn bộ `src/`, `docs/` | Ý kiến nào kiểm được bằng lệnh thì kiểm trước khi sửa (file ANSI: tái hiện 201 rồi mới sửa, ghi vào Bug Log là BUG-006); ý kiến về thiết kế (token của tài khoản đã xóa, BUG-007) thì kiểm sau khi sửa bằng HTTP thật (401 ngay) |
| **MCP chrome-devtools** | Mở ứng dụng đang chạy trong trình duyệt và chụp màn hình giao diện ở ba trạng thái (đang tải, rỗng, lỗi) cùng kết quả MH1–MH3 | Ảnh trong PDF Bài tập 2 và `docs/ket-qua-*.png` | Ảnh giao diện chụp từ ứng dụng thật. Riêng ảnh terminal (`npm test`, `npm run e2e`) là output thật đã ghi lại rồi vẽ thành ảnh bằng script, README mục 3 ghi rõ điều này |
| *--- không dùng ---* | *Các phần tự thực hiện:* chọn track SE và luồng L7, chọn phương án xóa mềm cùng quản lý tài khoản cho chữ D của CRUD (trong ba phương án được đề xuất), quyết định không làm Docker, cho phép commit từng nhóm thay đổi, đẩy mã lên GitHub, gắn tag `v0.2`, nộp bài trên E-learning | Quyết định phạm vi; `git commit`, `git push`; tag `v0.2` | Tự thực hiện |

#### II.2. Bài tập 1 – Phân tích và Thiết kế (`BT1_2374802010384_LeTanPhong.pdf`, Buổi 1–6)

| Công cụ AI | Dùng vào việc gì | Áp dụng ở phần nào (File / Mục) | Đã kiểm chứng & Chỉnh sửa thế nào |
| :--- | :--- | :--- | :--- |
| **Claude (Anthropic)** | Rà soát lỗi bản nháp BT1 (sai «include»/«extend», truy vết FR → User Story sai, MoSCoW lệch, tên bảng nằm trong User Story, quy tắc nghiệp vụ mâu thuẫn với đặc tả); chuyển phân tích sang Track SE; đề xuất 7 User Story dạng bảng, mỗi story có tiêu chí Given–When–Then, 8 FR, 5 NFR có ngưỡng số, 8 quy tắc nghiệp vụ (theo Bảng 9.1 của case study), bảng thuật ngữ, bảng truy vết, đặc tả UC1 và UC5 | Mục 1 – SRS, Mục 2 – Use Case; `docs/srs.md` | Đối chiếu đề BT1 và slide Buổi 3–4 (cấu trúc SRS 6 mục, INVEST, MoSCoW, checklist); tự quyết định nội dung cuối cùng |
| **Claude (Anthropic)** | Vẽ Use Case Diagram (2 actor, 7 use case, 1 quan hệ «extend»), sơ đồ kiến trúc phân lớp, ERD 6 bảng chuẩn 3NF và wireframe 3 màn hình bằng draw.io; viết 4 câu lập luận kiến trúc gắn với NFR1, NFR2, NFR3, NFR5 và SQL DDL skeleton cho MySQL; đối chiếu mô hình dữ liệu với từ điển dữ liệu (mục 8) và quy tắc QT-01, QT-02, QT-13, QT-14, QT-15 của case study Smart CRM | Mục 2–5; `docs/usecase.drawio`, `docs/architecture.drawio`, `docs/erd.drawio`, `docs/schema.sql`, `docs/wireframe.drawio` | Render từng sơ đồ bằng trình xem diagrams.net và soát chữ, đường nối; phân tích cú pháp DDL theo phương ngữ MySQL (6 bảng, 9 khóa ngoại); đối chiếu từng trường wireframe với cột ERD và bảng thuật ngữ |
| **Claude (Anthropic)** | Soạn API contract theo mẫu Track SE (11 endpoint, đặc tả chi tiết 6 endpoint cho 3 story MUST, mã HTTP, bảng validation); gộp báo cáo thành file PDF | `docs/api-contract.md`; `BT1_2374802010384_LeTanPhong.pdf` | Kiểm tra mỗi endpoint truy vết về một User Story, mã lỗi khớp bảng thuật ngữ; xem lại từng trang PDF |
| **MCP drawio (draw.io)** | Vẽ và chỉnh sửa sơ đồ Use Case, kiến trúc phân lớp, ERD và wireframe ở định dạng .drawio | `docs/usecase.drawio`, `docs/architecture.drawio`, `docs/erd.drawio`, `docs/wireframe.drawio`; Mục 2–5 | Mở lại từng file .drawio trên app.diagrams.net; soát ký hiệu, chú thích và đối chiếu tên gọi với bảng thuật ngữ SRS |
| *--- không dùng ---* | *Các phần tự thực hiện:* phân tích bài toán chất lượng dữ liệu khách hàng của case study, chọn luồng L7, soạn phiếu phạm vi; dựng cấu trúc SRS 6 mục, dàn ý đặc tả use case và bản nháp sơ đồ Use Case | Phiếu phạm vi (Buổi 2); bản nháp BT1; tạo repo GitHub, quyết định nội dung cuối cùng, nộp bài trên E-learning | Tự thực hiện |

*Ghi chú:*
- Nếu ở bài nộp này sinh viên **hoàn toàn không sử dụng bất kỳ công cụ AI nào**, hãy ghi rõ `Không sử dụng công cụ AI` vào bảng.

---

### III. CAM KẾT VỀ LIÊM CHÍNH HỌC THUẬT

> **"Tôi xác nhận đã đọc, hiểu và chịu trách nhiệm về toàn bộ nội dung nộp."**

* **Chữ ký / Họ tên sinh viên:** Lê Tấn Phong  
* **Mã số sinh viên:** 2374802010384  
* **Ngày khai báo:** 31/10/2026
