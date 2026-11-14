# BẢNG KHAI BÁO SỬ DỤNG CÔNG CỤ AI HỖ TRỢ
**Học phần:** Chuyên đề Tốt nghiệp 1 (Specialized Graduation Topic I)  
**Học kỳ:** HK1, Năm học 2026 – 2027  
**Bài nộp:** Bài tập 3 – Kiểm thử và Đóng gói prototype (`BT3_2374802010384_LeTanPhong.pdf`, tag `v1.0`); gồm cả khai báo của Bài tập 1 và 2  
**Giai đoạn:** Buổi 1–16 (Tuần 1–8)

---

### I. THÔNG TIN SINH VIÊN
* **Họ và tên:** Lê Tấn Phong
* **Mã số sinh viên:** 2374802010384
* **Chuyên ngành (Track):** [x] SE   [ ] DA   [ ] AI
* **Luồng nghiệp vụ đã chọn:** L7 – Chất lượng dữ liệu khách hàng
* **Repo GitHub:** https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7

---

### II. BẢNG KHAI BÁO CHI TIẾT

#### II.0. Bài tập 3 – Kiểm thử và Đóng gói prototype (Buổi 13–16)

| Công cụ AI | Dùng vào việc gì | Áp dụng ở phần nào (File / Mục) | Em đã kiểm chứng thế nào |
| :--- | :--- | :--- | :--- |
| **Claude Code (Anthropic)** | Kiểm thử: soạn Test Plan bốn mục, dựng hạ tầng test chạm CSDL thật (CSDL thử `mekong_dq_test`), viết test tích hợp và test API, chọn 12 test case đủ năm loại và soạn Test Report kèm bảng truy vết quy tắc đến test | `docs/test-plan.md`, `docs/test-report.md`, `tests/helpers/`, `tests/integration/`, `tests/api/`, cột "Test case (BT3)" của `docs/srs.md` | Chạy 12 lệnh của Test Report, lần 1 có 3 ca FAIL được giữ nguyên rồi mới sửa; chạy `npm test` (125 test PASS); mỗi ca chạy lại được bằng đúng một lệnh ghi ở cột "Các bước" |
| **Claude Code (Anthropic)** | Tìm và sửa ba bug do test của Bài tập 3 phát hiện (BUG-008 body JSON quá lớn trả 500, BUG-009 đoán mật khẩu không giới hạn, BUG-010 hai Quản lý xóa nhau còn 0 Quản lý) và đề xuất phân loại lại mức độ năm bug cũ theo cây hai câu hỏi của thầy (em duyệt) | `src/app.js`, `src/middleware/login-throttle.js`, `src/routes/auth.routes.js`, `src/services/user.service.js`, `src/repositories/app-user.repository.js`, `docs/bug-log.md` | Mỗi bug được tái hiện bằng test FAIL trước khi sửa, sửa bằng một commit riêng, rồi chạy cả bộ test trên đúng cây mã của commit đó (117, 121, 124 test PASS); BUG-008 thử lại bằng server thật (body 300 KB trả 413) |
| **Claude Code (Anthropic)** | Đóng gói bằng Docker Compose: Dockerfile hai giai đoạn, `docker-compose.yml` (MariaDB 10.11 và app, healthcheck), SQL khởi tạo hai database, script khởi động bằng Node, `.env.example` có giá trị mẫu chạy được, `.gitattributes`, README đúng 2 lệnh | `Dockerfile`, `docker-compose.yml`, `docker/initdb/01-databases.sql`, `scripts/docker-start.js`, `.dockerignore`, `.gitattributes`, `.env.example`, `package.json`, `README.md` | Phép thử máy trắng: clone repo từ GitHub vào thư mục trống, chạy đúng hai lệnh của README, `docker compose ps` cả hai dịch vụ `healthy`, `curl /health`, `docker compose exec app npm test` (125 test PASS trên Linux và MariaDB 10.11), chạy seed lần hai không đổi số dòng; thử thêm đổi `APP_PORT`, thiếu `.env`, tắt rồi bật lại CSDL |
| **Claude Code (Anthropic)** | Chụp ảnh minh chứng: mở cửa sổ terminal thật, chạy lệnh trong đó rồi chụp màn hình đúng vùng cửa sổ đó bằng script PowerShell; chụp giao diện web đang chạy bằng trình duyệt (MCP chrome-devtools) | `docs/screenshots/TC-01.png` đến `TC-12.png`, `docs/screenshots/npm-test.png`, các ảnh ở mục 7 của PDF | Ảnh thể hiện rõ cửa sổ, lệnh đã gõ, kết quả và giờ máy; ảnh test chụp ngày 14/11/2026 từ lần chạy trong Docker. Riêng `TC-08-fail.png`, `TC-11-fail.png`, `TC-12-fail.png` và `BUG-008-fixed.png`, `BUG-009-fixed.png`, `BUG-010-fixed.png` là đầu ra thật của lần chạy ngày 07/11/2026 đã ghi lại rồi vẽ thành ảnh kiểu terminal bằng script (trình duyệt không giao diện), vì phải chạy trên mã trước khi sửa |
| **Claude Code (Anthropic)** | Tài liệu của Bài tập 3: Deployment Guide tiếng Anh, checklist bảo mật bảy mục, API docs tiếng Anh cho 18 endpoint (kèm script ghi lại request và response thật), cập nhật nhật ký thay đổi thiết kế (mục 23 đến 27), README | `docs/deployment-guide.md`, `docs/checklist-bao-mat.md`, `docs/api-docs/`, `scripts/capture-api-examples.js`, `docs/thay-doi-thiet-ke.md`, `README.md` | Mỗi dòng minh chứng của checklist là kết quả một lệnh đã chạy trên hệ thống Docker (quét lịch sử git, đọc cột `password_hash`, tắt CSDL, `grep` log, `npm audit`); ví dụ API do script ghi lại, không viết tay; đối chiếu 18 endpoint với `src/routes/`; chạy thử các lệnh trong Guide (sinh CSV 3.000 dòng, nhập file, đổi `APP_PORT`) |
| **Claude (Anthropic)**, gợi ý khi rà soát | Nêu điểm cần xem lại trước khi chốt cách đóng gói: tài khoản CSDL tạo bằng `db:setup` chỉ dùng được từ `localhost` nên không nối được giữa hai container, bảng mã `utf8mb4_unicode_ci` phải đặt tường minh, cờ `--env-file` hỏng khi container không có `.env`, nên chạy phép thử máy trắng thật | `docker-compose.yml`, `docker/initdb/`, `package.json`, `scripts/docker-start.js` | Quyết định cuối do em. Từng điểm được kiểm bằng lệnh: đọc `scripts/db-setup.js` và `migrations/001_init.sql` để xác nhận hai điểm đầu; `docker compose exec app npm run seed` chạy được trong container không có `.env`; `npm test` trong container PASS 125 test |
| *--- không dùng ---* | *Các phần tự thực hiện:* đổi quyết định để làm Docker sau khi thầy nhận xét Bài tập 2 (trước đó em chọn không làm), giữ nguyên màn hình tra cứu khách hàng, duyệt cách phân loại lại mức độ bug, chọn phạm vi kiểm soát truy cập ở mục 3 của checklist (lần nhập và cặp nghi trùng; hồ sơ khách hàng là dữ liệu chung), cho phép commit và push, nộp bài trên E-learning | Quyết định phạm vi; duyệt; nộp bài | Tự thực hiện |

#### II.1. Bài tập 2 – Hiện thực hóa module cốt lõi (Buổi 7–12)

| Công cụ AI | Dùng vào việc gì | Áp dụng ở phần nào (File / Mục) | Em đã kiểm chứng thế nào |
| :--- | :--- | :--- | :--- |
| **Claude Code (Anthropic)** | Hiện thực module lõi Sprint 1–2 (Buổi 8–10): migration và seed, ba lớp routes / services / repositories cho khách hàng, nhập file CSV trong một giao dịch (NFR3), duyệt cặp nghi trùng (BR4), đăng nhập JWT và phân quyền (QT-14, QT-15), giao diện React MH1–MH3 với ba trạng thái | `migrations/001_init.sql`, `seeds/001_demo.sql`, `src/`, `frontend/src/`, `scripts/` | Chạy `npm test`; chạy `npm run e2e` (đăng nhập, nhập 3.000 dòng trong khoảng 0,3 giây, xem lỗi, gộp cặp, quyết định lần hai bị từ chối 409, tra SĐT hồ sơ đã gộp); clone repo vào thư mục mới và chạy đủ các bước README; chụp giao diện thật bằng trình duyệt |
| **Claude Code (Anthropic)** | Bài tập 2, S1: xóa mềm hồ sơ khách hàng (`deleted_at`, ba luật chặn xóa, nhập file khôi phục hồ sơ đã xóa), quản lý tài khoản CRUD (`/api/users`), xác thực đọc lại tài khoản ở mỗi request | `migrations/002_customer_soft_delete.sql`, `src/services/customer.service.js`, `user.service.js`, `auth.service.js`, `src/repositories/`, `src/routes/user.routes.js` | Test cho từng luật (`npm test`: 107 test PASS); 14 kiểm tra xóa mềm và 19 kiểm tra quản lý tài khoản qua HTTP thật trên MariaDB (khóa ngoại chặn xóa tài khoản có lần nhập, token của tài khoản vừa xóa bị 401); chạy migration 002 hai lần không lỗi, chạy seed hai lần không nhân đôi dòng |
| **Claude Code (Anthropic)** | Xử lý lỗi và log theo Buổi 11: lỗi mất kết nối CSDL trả 503, log không ghi query string và che SĐT, từ chối file CSV không phải UTF-8 | `src/db.js`, `src/logger.js`, `src/routes/http-error.js`, `src/services/import.service.js`, `frontend/src/api/messages.js` | Tái hiện từng lỗi **trước khi sửa** bằng server thật rồi đọc log thật (SĐT nằm trong dòng log; đăng nhập khi CSDL tắt trả 500; file ANSI nhận 201); sửa xong chạy lại đúng kịch bản (503 sau 25 ms, log chỉ còn đường dẫn, file ANSI bị 400) và thêm test hồi quy; thử thêm 11 loại file sai |
| **Claude Code (Anthropic)** | Soạn tài liệu Bài tập 2: nhật ký thay đổi thiết kế, API contract, Bug Log, kiến trúc thực tế, README | `docs/thay-doi-thiet-ke.md`, `docs/api-contract.md`, `docs/bug-log.md`, `docs/architecture-thuc-te.md`, `README.md` | Đối chiếu từng mục với commit và kết quả chạy; chạy lệnh `rg` kiểm ranh giới lớp (service không có dấu vết HTTP hay SQL); mỗi mục Bug Log có link commit và test hồi quy tương ứng |
| **Claude (Anthropic)**, gợi ý khi rà soát | Nêu các điểm cần xem lại khi rà soát phương án và mã trước khi chốt: token của tài khoản đã xóa vẫn dùng được, file CSV ANSI bị nhận, database mặc định chưa chạy migration 002, tài liệu còn nói "không có DELETE" | Toàn bộ `src/`, `docs/` | Em là người rà soát và chốt cuối cùng. Điểm nào kiểm được bằng lệnh thì kiểm trước khi sửa (file ANSI: tái hiện 201 rồi mới sửa, ghi vào Bug Log là BUG-006); điểm về thiết kế (token của tài khoản đã xóa, BUG-007) thì kiểm sau khi sửa bằng HTTP thật (401 ngay) |
| **MCP chrome-devtools** | Mở ứng dụng đang chạy trong trình duyệt và chụp màn hình giao diện ở ba trạng thái (đang tải, rỗng, lỗi) cùng kết quả MH1–MH3 | Ảnh trong PDF Bài tập 2 và `docs/ket-qua-*.png` | Ảnh giao diện chụp từ ứng dụng thật. Riêng ảnh terminal (`npm test`, `npm run e2e`) là output thật đã ghi lại rồi vẽ thành ảnh bằng script, README mục 3 ghi rõ điều này |
| **Claude Code (Anthropic)** | Chạy các lệnh `git` theo yêu cầu và sự cho phép của em: tạo commit có thông điệp tiếng Việt cho từng nhóm thay đổi, đẩy mã lên GitHub và gắn tag `v0.2` | Lịch sử git của repo; tag `v0.2` | Mỗi commit chỉ thêm đúng các file của thay đổi đó (`git add` theo từng đường dẫn) rồi kiểm `git status`; `git log` đối chiếu thông điệp; đã quét repo: không có `.env`, bí mật hay file `.pdf` mới; sau khi đẩy tag, truy cập trang `releases/tag/v0.2` khi chưa đăng nhập, trang hiện ra (HTTP 200) |
| *--- không dùng ---* | *Các phần tự thực hiện:* chọn track SE và luồng L7, chọn phương án xóa mềm cùng quản lý tài khoản cho chữ D của CRUD (trong ba phương án được đề xuất), quyết định không làm Docker, rà soát và chốt cuối cùng, cho phép từng việc commit, push và gắn tag `v0.2`, nộp bài trên E-learning | Quyết định phạm vi; rà soát và chốt cuối cùng; nộp bài | Tự thực hiện |

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
* **Ngày khai báo:** 14/11/2026
