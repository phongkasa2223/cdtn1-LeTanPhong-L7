# Nhật ký thay đổi thiết kế

Mọi sai lệch so với thiết kế ban đầu (Bài tập 1) đều được ghi ở đây, mỗi thay đổi
ba dòng: **thay đổi gì · vì sao · ảnh hưởng tới thành phần nào**. Đây là mục kiểm
chứng của tiêu chí 3 (Nhất quán và Tích luỹ) trong rubric.

## 1. Thêm ngưỡng số cho NFR5

- **Thay đổi gì:** thầy góp ý NFR5 chưa có ngưỡng số. Em **sửa** lại: thêm một đầu số di động mới
  trong dưới 5 phút, chỉ cần sửa file `config/phone_prefixes.json`, 0 dòng mã nguồn bị sửa.
- **Vì sao:** yêu cầu không có con số thì không biết đo và kiểm thử bằng cách nào. Danh mục đầu số
  em đã tách ra file cấu hình từ lúc thiết kế kiến trúc, nên ngưỡng này kiểm được.
- **Ảnh hưởng:** `docs/srs.md` mục 4 (dòng NFR5), `config/phone_prefixes.json`,
  `src/services/record-validator.js` (đọc đầu số từ file, trong code không ghi sẵn đầu số nào),
  `tests/record-validator.test.js` (TC-V3 kiểm đúng điều này).

## 2. Đưa tóm tắt đặc tả UC5 vào bài

- **Thay đổi gì:** thầy góp ý đặc tả UC5 mới nằm trong file drawio. Em **sửa**: đặc tả UC5 đã có sẵn
  trong `docs/srs.md`, phần tóm tắt em sẽ đưa vào báo cáo BT2. Em cũng sửa một chỗ ghi nhầm trong
  `docs/api-contract.md`: lỗi 409 `PAIR_ALREADY_DECIDED` ghi BR5, đúng phải là BR4 (mỗi cặp chỉ quyết định một lần).
- **Vì sao:** UC5 gắn với BR4, quy tắc này em phải kiểm thử ở BT2, nên đặc tả cần đọc được ngay trong SRS.
- **Ảnh hưởng:** `docs/srs.md` (mục Đặc tả UC5, luồng ngoại lệ 7a), `docs/usecase.drawio` trang 2 (đã khớp),
  `docs/api-contract.md` mục E6. File PDF BT1 đã chấm nên em không nộp lại.

## 3. Giữ nguyên độ dài báo cáo BT1 (16 trang)

- **Thay đổi gì:** thầy góp ý báo cáo 16 trang, có thể rút gọn phần ghi chú. Em **giữ nguyên** báo cáo BT1.
- **Vì sao:** BT1 đã chấm và nộp rồi. Đề bài không giới hạn số trang, và các ghi chú đối chiếu (thuật ngữ,
  truy vết, wireframe với ERD) là bằng chứng cho tiêu chí Nhất quán. Em sẽ viết gọn hơn từ BT2.
- **Ảnh hưởng:** không có.

## 4. Chạy thử trên MariaDB 10.4 (XAMPP) thay vì MySQL 8.0

- **Thay đổi gì:** máy em có sẵn XAMPP nên chạy thử bằng MariaDB 10.4.32. Thiết kế vẫn nhắm tới MySQL 8.0.
  Việc này không do góp ý của thầy, phát sinh lúc dựng môi trường.
- **Vì sao:** `docs/schema.sql` chỉ dùng InnoDB, utf8mb4 và một ràng buộc CHECK nên chạy được trên cả hai,
  driver `mysql2` cũng dùng được cho cả hai. Cài thêm MySQL 8.0 chỉ để chạy thử thì không đáng.
  **Hạn chế đã biết:** em chưa kiểm trên MySQL 8.0 thật.
- **Ảnh hưởng:** `README.md` mục 2 và mục 6, `.env.example`. Hai sơ đồ `architecture.drawio` và `erd.drawio` không đổi.

## 5. Thêm `IF NOT EXISTS` vào DDL để chạy lại được

- **Thay đổi gì:** 6 câu `CREATE TABLE` trong DDL của BT1 em thêm `IF NOT EXISTS`. File seed dùng khóa chính
  ghi rõ và `ON DUPLICATE KEY UPDATE`. Việc này phát sinh từ phép thử "chạy lại được" của Buổi 8.
- **Vì sao:** `CREATE TABLE` trần chạy lần hai sẽ báo bảng đã tồn tại, còn `INSERT` thường sẽ vướng khóa duy nhất.
  Em chạy migrate và seed hai lần, số dòng mỗi bảng không đổi.
- **Ảnh hưởng:** `docs/schema.sql` và `migrations/001_init.sql` (hai file giống hệt nhau), `seeds/001_demo.sql`,
  `scripts/run-sql.js`. Cấu trúc bảng, khóa, chỉ mục không đổi. Bằng chứng: `docs/ket-qua-migrate-seed-test.png`.

## 6. Thêm các endpoint quản lý khách hàng, dùng mã hiển thị làm định danh

- **Thay đổi gì:** `docs/api-contract.md` ở BT1 chỉ có E9 (`GET /customers?phone=`). Em thêm `GET /customers`,
  `GET /customers/{customerId}`, `POST /customers`, `PUT /customers/{customerId}`. Trên URL em dùng mã hiển thị
  (ví dụ `C000013`) cho khớp trường `customerId` của hợp đồng API; khóa số `customer_id` chỉ dùng trong CSDL.
- **Vì sao:** slide Buổi 8 yêu cầu CRUD đủ ba lớp cho entity chính, và `customer` là entity trung tâm của luồng L7.
- **Ảnh hưởng:** `docs/api-contract.md` mục 3.5, `src/routes/customer.routes.js`, `src/services/customer.service.js`,
  `src/repositories/customer.repository.js`. Mã lỗi mới: `DUPLICATE_PHONE` (409), `CUSTOMER_NOT_FOUND` (404),
  `CUSTOMER_MERGED` (409). Bằng chứng: `docs/ket-qua-curl-customers.png`.

## 7. Không làm thao tác xóa hồ sơ khách hàng (giữ BR5)

- **Thay đổi gì:** CRUD của Sprint 1 em chỉ làm tạo, xem, sửa, liệt kê và tra cứu. Em **giữ nguyên BR5**
  nên không có `DELETE /customers/{id}`. Hồ sơ đã gộp thì không sửa được (`CUSTOMER_MERGED`).
- **Vì sao:** BR5 (QT-13) cấm xóa vật lý hồ sơ khách hàng, hồ sơ trùng chỉ được gộp và đánh dấu `merged_into_id`.
  Em có viết thử `DELETE` rồi gỡ, vì nó xóa được cả hồ sơ đã gộp (khóa ngoại chỉ chặn xóa hồ sơ được giữ lại)
  và mọi hồ sơ chưa ai tham chiếu. **Hạn chế đã biết:** thiếu chữ D của CRUD. Nếu cần thì thêm cột trạng thái
  hồ sơ (phải sửa ERD), em chưa làm.
- **Ảnh hưởng:** `src/routes/customer.routes.js`, `src/services/customer.service.js` (chỉ còn `guard` cho lỗi trùng SĐT),
  `docs/api-contract.md` mục 3.5 (ghi chú không có `DELETE`), `tests/customer.service.test.js` TC-S7.

## 8. Hoãn xác thực JWT sang Sprint 2, nên QT-14 và QT-15 chưa làm

- **Thay đổi gì:** API ở Sprint 1 chưa bắt đăng nhập, chưa có `POST /auth/login` (E1), chưa lọc dữ liệu theo cửa hàng
  (QT-14) và chưa che SĐT cho Nhân viên dữ liệu (QT-15). Bảng, tài khoản mẫu và cột `store_code` đã có sẵn.
- **Vì sao:** QT-14 và QT-15 cần biết ai đang gọi API nên phải có xác thực trước. Buổi 8 mục tiêu là module đầu tiên chạy được,
  em làm xác thực trọn vẹn ở Sprint 2 thì dễ kiểm thử hơn là làm dở bây giờ.
  **Hạn chế đã biết:** mọi endpoint đang mở, chưa dùng được cho môi trường thật, NFR2 chưa đạt.
- **Ảnh hưởng:** `src/middleware/auth.js` (khung rỗng), `docs/api-contract.md` mục 3.5 (ghi chú chưa làm),
  `README.md` mục 6 (mục `[ ]` cho QT-14, QT-15), `docs/srs.md` (NFR2).
