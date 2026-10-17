# Ứng dụng kiểm tra và hợp nhất hồ sơ khách hàng: nhân viên dữ liệu nhập file khách hàng, sửa bản ghi lỗi và duyệt gộp hồ sơ trùng

**Sinh viên:** Lê Tấn Phong – 2374802010384 – Track SE  
**Học phần:** Chuyên đề Tốt nghiệp 1, HK1 2026-2027  
**Luồng nghiệp vụ:** L7 – Chất lượng dữ liệu khách hàng (case study Mekong Mobile)

## 1. Mục tiêu
Dữ liệu khách hàng của Mekong Mobile nằm rải rác ở hệ thống bán lẻ và bảo hành, thường bị trùng hồ sơ,
thiếu trường bắt buộc và sai định dạng số điện thoại. Ứng dụng web + REST API này giúp **nhân viên dữ liệu**
nhập file khách hàng, được hệ thống tự đánh dấu bản ghi lỗi, sửa lỗi và duyệt gộp các hồ sơ nghi trùng;
**quản lý dữ liệu** xem báo cáo tỷ lệ lỗi theo từng lần nhập để theo dõi chất lượng dữ liệu.

## 2. Yêu cầu môi trường
- Node.js 20.6 trở lên (đã thử trên Node 24), npm
- MySQL 8.0 hoặc MariaDB 10.4 trở lên (đang chạy thử trên MariaDB 10.4.32 của XAMPP – xem `docs/thay-doi-thiet-ke.md`, mục 4)
- Biến môi trường: xem `.env.example` (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `PORT`)

## 3. Hướng dẫn chạy
```bash
cp .env.example .env            # điền DB_PASSWORD (và JWT_SECRET khi có xác thực)
npm install
npm run migrate && npm run seed # tạo 6 bảng + nạp dữ liệu mẫu; chạy lại bao nhiêu lần cũng không nhân đôi dữ liệu
npm start                       # API tại http://localhost:3000
```
Cơ sở dữ liệu `mekong_dq` và tài khoản `DB_USER` cần tạo trước một lần (quyền `ALL` trên `mekong_dq`):
```sql
CREATE DATABASE IF NOT EXISTS mekong_dq CHARACTER SET utf8mb4;
CREATE USER IF NOT EXISTS 'mekong'@'localhost' IDENTIFIED BY '<mật khẩu>';
GRANT ALL PRIVILEGES ON mekong_dq.* TO 'mekong'@'localhost';
```
Gọi thử:
```bash
curl -s localhost:3000/health
curl -s "localhost:3000/api/customers?phone=%2B84901234567"
curl -s -X POST localhost:3000/api/customers -H "Content-Type: application/json" \
     -d '{"fullName":"Tran Thi Bich Ngoc","phone":"+84 912 345 000"}'
```
Ảnh kết quả chạy: `docs/ket-qua-curl-customers.png`, `docs/ket-qua-migrate-seed-test.png`.

## 4. Cấu trúc thư mục
| Thư mục | Nội dung |
| :--- | :--- |
| `docs/` | Tài liệu BT1: `srs.md`, `usecase.drawio`, `architecture.drawio`, `erd.drawio`, `schema.sql`, `wireframe.drawio`, `wireframe.png`, `api-contract.md`, `ai-disclosure.md`; nhật ký `thay-doi-thiet-ke.md`; ảnh kết quả chạy Sprint 1 |
| `src/routes/` | Lớp API – Express Controller trong sơ đồ kiến trúc (`*.routes.js`); chỉ nhận HTTP và đổi mã nghiệp vụ sang mã HTTP |
| `src/services/` | Lớp nghiệp vụ – Service và `RecordValidator` (`record-validator.js`); toàn bộ quy tắc BR/QT, không biết HTTP hay SQL |
| `src/repositories/` | Lớp truy cập dữ liệu – mỗi bảng một Repository; chỉ đọc/ghi CSDL |
| `src/middleware/`, `src/errors/` | Xác thực/phân quyền (stub); lớp lỗi nghiệp vụ `AppError` |
| `config/` | `phone_prefixes.json` – danh mục đầu số di động (NFR5) |
| `migrations/`, `seeds/`, `scripts/` | DDL chạy lại được (`IF NOT EXISTS`), dữ liệu mẫu giả (`ON DUPLICATE KEY UPDATE`), script chạy SQL |
| `tests/` | Kiểm thử tự động (`node --test`) |

Ánh xạ sơ đồ kiến trúc → thư mục: ImportController, RecordController, DuplicatePairController, Customer/Report Controller → `src/routes/`; ImportService, RecordValidator, DuplicateService, ReportService → `src/services/`; ImportBatch, StgCustomer, DqResult, Customer, DuplicatePair, AppUser Repository → `src/repositories/`. Mới hiện thực `Customer` (routes + service + repository) và `RecordValidator`; các file còn lại là khung rỗng.

## 5. Kiểm thử
```bash
npm test      # node --test, 16 test, không cần CSDL (dùng repository giả)
```

## 6. Trạng thái hiện tại
- [x] Khởi tạo repo, cấu trúc thư mục, `.gitignore`, `.env.example`, README khung (buổi 2)
- [x] Khởi tạo project Node.js và smoke test `GET /health` (hoàn thành ở buổi 8)
- [x] Bản SRS rút gọn (`docs/srs.md`) và Use Case Diagram (`docs/usecase.drawio`) – Bài tập 1 (buổi 3–4)
- [x] API contract (`docs/api-contract.md`) – Bài tập 1 (buổi 4)
- [x] Thiết kế kiến trúc (`docs/architecture.drawio`), ERD + SQL DDL (`docs/erd.drawio`, `docs/schema.sql`), wireframe 3 màn hình (`docs/wireframe.png`, gốc `docs/wireframe.drawio`) – Bài tập 1 (buổi 5–6)
- [x] Sprint 1 (buổi 8): migration 6 bảng theo DDL BT1, seed mẫu chạy lại được, quản lý khách hàng qua 3 lớp (tạo, xem, sửa, liệt kê, tra cứu theo SĐT), 16 unit test PASS
- [x] QT-01 (SĐT duy nhất), QT-02 (chuẩn hóa SĐT theo `config/phone_prefixes.json`, NFR5), QT-13/BR5 (hồ sơ đã gộp không sửa được; không có thao tác xóa hồ sơ – `docs/thay-doi-thiet-ke.md` mục 7)
- [ ] QT-14 (phạm vi theo cửa hàng) và QT-15 (che SĐT) – cần xác thực JWT, làm ở Sprint 2
- [ ] Module nhập file và kiểm tra bản ghi khách hàng (buổi 8–10) – chưa có; cần giao dịch InnoDB cho NFR3 và test lỗi giữa chừng
- [ ] Module duyệt gộp hồ sơ trùng và báo cáo chất lượng (buổi 10–12) – cần test BR4 (hai nhân viên cùng duyệt một cặp)
- [ ] Chưa nạp bộ dữ liệu thật `customers_raw.csv` (tải từ E-learning); hiện dùng 12 hồ sơ sinh giả trong `seeds/001_demo.sql`
- Ghi chú: chạy trên MariaDB 10.4 thay vì MySQL 8.0 (`docs/thay-doi-thiet-ke.md` mục 4); chưa kiểm trên MySQL 8.0 thật.
