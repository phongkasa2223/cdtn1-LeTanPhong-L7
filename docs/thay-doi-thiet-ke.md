# Nhật ký thay đổi thiết kế

Mọi sai lệch so với thiết kế ban đầu (Bài tập 1) đều được ghi ở đây, mỗi thay đổi
ba dòng: **thay đổi gì · vì sao · ảnh hưởng tới thành phần nào**. Đây là mục kiểm
chứng của tiêu chí 3 (Nhất quán và Tích luỹ) trong rubric.

Cập nhật sau phản hồi Bài tập 1 (buổi 8, ngày 17/10/2026; điểm BT1 9.5/10). Với mỗi
điểm giảng viên góp ý, dòng "Thay đổi gì" ghi rõ phản hồi và quyết định SỬA hay GIỮ NGUYÊN.

## 1. Bổ sung ngưỡng số cho NFR5

- **Thay đổi gì:** phản hồi của GV: "NFR5 chưa có ngưỡng số, ví dụ thêm một đầu số mới
  trong dưới 5 phút, 0 dòng mã nguồn bị sửa". **Quyết định: SỬA.** NFR5 nay ghi: thêm một
  đầu số di động mới trong dưới 5 phút, chỉ bằng cách sửa file `config/phone_prefixes.json`,
  0 dòng mã nguồn bị sửa.
- **Vì sao:** yêu cầu phi chức năng không có số đo thì không kiểm thử được. Danh mục đầu số
  đã được tách ra file cấu hình ngay từ thiết kế kiến trúc nên ngưỡng này đo được.
- **Ảnh hưởng:** `docs/srs.md` mục 4 (dòng NFR5), `config/phone_prefixes.json` (đúng tên trong
  `docs/architecture.drawio`), `src/services/record-validator.js` (đọc đầu số từ file, mã nguồn
  không chứa đầu số nào), `tests/record-validator.test.js` TC-V3 kiểm đúng điều này.

## 2. Tóm tắt đặc tả UC5 phải đọc được trong bài, không chỉ trong file drawio

- **Thay đổi gì:** phản hồi của GV: "đặc tả UC5 mới nằm trong file drawio, nên đưa tóm tắt vào
  bài". **Quyết định: SỬA.** Đặc tả UC5 đã có trong `docs/srs.md`; phần tóm tắt sẽ được đưa vào
  báo cáo BT2. Sửa kèm một nhãn sai trong `docs/api-contract.md`: lỗi 409 `PAIR_ALREADY_DECIDED`
  tham chiếu BR5, đúng phải là BR4 (mỗi cặp chỉ được quyết định một lần).
- **Vì sao:** UC5 gắn với BR4, là quy tắc cần kiểm thử ở BT2; đặc tả phải đọc được ngay trong
  tài liệu SRS thay vì chỉ trong sơ đồ.
- **Ảnh hưởng:** `docs/srs.md` mục "Đặc tả chi tiết UC5" (luồng ngoại lệ 7a), `docs/usecase.drawio`
  trang 2 (đã khớp), `docs/api-contract.md` mục E6. File PDF BT1 đã chấm không nộp lại.

## 3. Giữ nguyên độ dài báo cáo BT1 (16 trang)

- **Thay đổi gì:** phản hồi của GV: "báo cáo 16 trang, có thể rút gọn phần ghi chú".
  **Quyết định: GIỮ NGUYÊN.** Không đổi báo cáo BT1.
- **Vì sao:** BT1 đã chấm và nộp, không nộp lại. Đề bài không đặt giới hạn trang; các ghi chú đối
  chiếu (bảng thuật ngữ, truy vết, ánh xạ wireframe–ERD) là bằng chứng cho tiêu chí Nhất quán.
  Góp ý này được áp dụng từ BT2: viết gọn phần ghi chú.
- **Ảnh hưởng:** không có thành phần nào.

## 4. Chạy thử trên MariaDB 10.4 (XAMPP) thay vì MySQL 8.0

- **Thay đổi gì:** môi trường chạy thử dùng MariaDB 10.4.32 có sẵn trong XAMPP; thiết kế vẫn
  nhắm tới MySQL 8.0. Không có phản hồi của GV, việc này phát sinh khi dựng môi trường.
- **Vì sao:** máy cá nhân đã có XAMPP. `docs/schema.sql` chỉ dùng InnoDB, utf8mb4 và một ràng buộc
  CHECK nên chạy được trên cả hai; driver `mysql2` dùng được với cả hai. Cài thêm MySQL 8.0 chỉ để
  chạy thử không đem lại lợi ích trong phạm vi Sprint 1. **Hạn chế đã biết:** chưa kiểm trên MySQL 8.0 thật.
- **Ảnh hưởng:** `README.md` mục 2 và mục 6, `.env.example`. Không đổi `docs/architecture.drawio`
  và `docs/erd.drawio` (đích triển khai vẫn là MySQL 8.0).

## 5. DDL thêm `IF NOT EXISTS` để chạy lại được

- **Thay đổi gì:** cả 6 câu `CREATE TABLE` trong DDL của BT1 thêm `IF NOT EXISTS`. Seed dùng khóa
  chính ghi tường minh và `ON DUPLICATE KEY UPDATE`. Không có phản hồi của GV, việc này phát sinh từ
  phép thử "chạy lại được" của Buổi 8.
- **Vì sao:** `CREATE TABLE` trần chạy lần hai sẽ báo "bảng đã tồn tại", còn `INSERT` thường sẽ vướng
  khóa duy nhất. Chạy migrate và seed hai lần cho cùng số dòng ở mọi bảng.
- **Ảnh hưởng:** `docs/schema.sql` và `migrations/001_init.sql` (hai file giống hệt nhau), `seeds/001_demo.sql`,
  `scripts/run-sql.js`. Cấu trúc bảng, khóa, chỉ mục không đổi. Bằng chứng: `docs/ket-qua-migrate-seed-test.png`.

## 6. Thêm endpoint quản lý khách hàng, dùng mã hiển thị làm định danh ở API

- **Thay đổi gì:** `docs/api-contract.md` BT1 chỉ có E9 (`GET /customers?phone=`). Thêm `GET /customers`,
  `GET /customers/{customerId}`, `POST /customers`, `PUT /customers/{customerId}`. Định danh trong URL là mã
  hiển thị (`C000013`), khớp trường `customerId` trong hợp đồng API; khóa số `customer_id` chỉ dùng trong CSDL.
- **Vì sao:** slide Buổi 8 yêu cầu CRUD đủ ba lớp cho entity chính, và `customer` là entity trung tâm của L7.
- **Ảnh hưởng:** `docs/api-contract.md` mục 3.5, `src/routes/customer.routes.js`, `src/services/customer.service.js`,
  `src/repositories/customer.repository.js`. Mã lỗi mới: `DUPLICATE_PHONE` (409), `CUSTOMER_NOT_FOUND` (404),
  `CUSTOMER_MERGED` (409). Bằng chứng: `docs/ket-qua-curl-customers.png`.

## 7. Không có thao tác xóa hồ sơ khách hàng (giữ BR5)

- **Thay đổi gì:** CRUD của Sprint 1 là tạo – xem – sửa – liệt kê/tra cứu; không có `DELETE /customers/{id}`.
  **Quyết định: GIỮ NGUYÊN BR5.** Sửa hồ sơ đã gộp bị chặn (`CUSTOMER_MERGED`).
- **Vì sao:** BR5 (QT-13) cấm xóa vật lý hồ sơ khách hàng; hồ sơ trùng chỉ được gộp và đánh dấu `merged_into_id`.
  Một bản `DELETE` đã được viết rồi gỡ ra vì nó xóa được cả hồ sơ đã gộp (khóa ngoại chỉ chặn xóa hồ sơ được
  giữ lại, không chặn xóa hồ sơ đã gộp) và mọi hồ sơ chưa ai tham chiếu. **Hạn chế đã biết:** thiếu chữ D của
  CRUD; nếu cần, hướng xử lý là thêm cột trạng thái hồ sơ (đổi ERD), chưa làm.
- **Ảnh hưởng:** `src/routes/customer.routes.js`, `src/services/customer.service.js` (chỉ còn `guard` cho lỗi trùng
  SĐT), `docs/api-contract.md` mục 3.5 (ghi chú "Không có `DELETE`"), `tests/customer.service.test.js` TC-S7.

## 8. Hoãn xác thực JWT sang Sprint 2, nên QT-14 và QT-15 chưa hiện thực

- **Thay đổi gì:** API ở Sprint 1 chưa yêu cầu đăng nhập, chưa có `POST /auth/login` (E1), chưa lọc dữ liệu theo
  cửa hàng (QT-14) và chưa che SĐT với Nhân viên dữ liệu (QT-15). Các bảng, tài khoản mẫu và cột `store_code`
  đã sẵn sàng.
- **Vì sao:** QT-14 và QT-15 cần biết người gọi, nên phụ thuộc vào xác thực. Mục tiêu Sprint 1 là module đầu tiên
  chạy được, và mỗi buổi chỉ làm một phần; làm xác thực dở dang sẽ khó kiểm thử hơn là làm trọn ở Sprint 2.
  **Hạn chế đã biết:** mọi endpoint hiện mở, không dùng cho môi trường thật; NFR2 chưa đạt.
- **Ảnh hưởng:** `src/middleware/auth.js` (khung rỗng), `docs/api-contract.md` mục 3.5 (ghi chú chưa hiện thực),
  `README.md` mục 6 (mục `[ ]` cho QT-14, QT-15), `docs/srs.md` NFR2.
