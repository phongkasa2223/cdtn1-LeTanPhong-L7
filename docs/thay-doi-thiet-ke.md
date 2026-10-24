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

## 8. Xác thực JWT: hoãn ở Buổi 8, làm xong ở Sprint 2 (QT-14, QT-15)

- **Thay đổi gì:** ở Buổi 8 em hoãn xác thực nên API còn mở. Ở Buổi 10 em làm `POST /auth/login` (E1) và mọi route khác đều cần token
  (NFR2). Nhân viên chỉ thấy dữ liệu của cửa hàng mình (QT-14), SĐT che với nhân viên và chỉ quản lý thấy đầy đủ (QT-15).
  Mật khẩu của tài khoản mẫu lưu dạng băm scrypt, token JWT HS256 hết hạn sau 3600 giây.
- **Vì sao:** QT-14 và QT-15 cần biết ai đang gọi API nên phải có xác thực trước; giao diện cũng cần để làm yêu cầu "nhận 401 thì xóa
  token, về trang đăng nhập". **Hạn chế đã biết:** chưa chặn đoán mật khẩu nhiều lần (không giới hạn số lần thử).
- **Ảnh hưởng:** `src/middleware/auth.js`, `src/services/auth.service.js`, `src/routes/auth.routes.js`, `src/services/access-scope.js` (QT-14),
  `src/services/customer.contract.js` (QT-15), `docs/api-contract.md` mục 3.6, `tests/auth.service.test.js`, `tests/auth.middleware.test.js`.

## 9. Cắt phạm vi Sprint 2: giao diện chỉ có các màn hình của luồng chính

- **Thay đổi gì:** giao diện có đăng nhập và 3 màn hình theo wireframe BT1 (MH1 nhập file, MH2 bản ghi lỗi, MH3 duyệt cặp). Em **cắt**
  nút sửa bản ghi lỗi (UC4, E8), màn hình tra cứu khách hàng (UC6, API E9 vẫn có) và báo cáo chất lượng (UC7, E10).
- **Vì sao:** slide Buổi 10 cho phép cắt chức năng phụ ngoài luồng chính. Ba story MUST (US1, US3, US5) chạy đủ từ nhập file đến gộp hồ sơ;
  các story còn lại là SHOULD và có cách làm tạm.
- **Ảnh hưởng:** `README.md` mục 6; `src/routes/record.routes.js`, `report.routes.js` và `src/services/report.service.js` vẫn là khung rỗng.
  Wireframe và SRS không đổi.

## 10. Dùng dữ liệu giả thay cho customers_raw.csv

- **Thay đổi gì:** em chạy luồng chính trên file giả 3.000 dòng do `npm run gen:data` sinh ra (SĐT nhiều dạng, thiếu trường, trùng SĐT, trùng email,
  trùng họ tên và ngày sinh), vì file thật không có trên E-learning và thầy cho phép dùng dữ liệu giả.
- **Vì sao:** script cố định hạt giống nên ai chạy cũng ra đúng một file, nhờ vậy kiểm chứng được số lỗi (ví dụ 90 lỗi `PHONE_LENGTH`).
  **Hạn chế đã biết:** file thật khoảng 65.000 dòng sẽ vượt giới hạn 5 MB (BR8) và vượt cơ sở đo NFR1 (3.000 dòng); khi có file thật phải
  tách file hoặc nâng giới hạn rồi đo lại.
- **Ảnh hưởng:** `scripts/gen-sample-csv.js`, `.gitignore` (không commit `data/*.csv`), `README.md` mục 3 và 6.

## 11. Giữ nguyên định dạng lỗi của BT1

- **Thay đổi gì:** slide Buổi 9 gợi ý lỗi có ba trường `error`, `message`, `fields`. Em **giữ nguyên** `{ error: { code, message, details } }` của BT1.
- **Vì sao:** BT1 đã chấm và hợp đồng đã ghi rõ. Giao diện rẽ nhánh theo `error.code` (mã máy đọc), không theo câu chữ `message`, nên vẫn đúng tinh thần
  của slide. Đổi định dạng là đổi hợp đồng đã nộp.
- **Ảnh hưởng:** không có.

## 12. Khi gộp mà chọn SĐT của hồ sơ bị gộp thì hai hồ sơ hoán đổi SĐT

- **Thay đổi gì:** hợp đồng E6 bắt chọn SĐT giữ lại. Nếu chọn SĐT của hồ sơ bị gộp thì hai hồ sơ hoán đổi SĐT trong cùng một giao dịch (qua một SĐT tạm),
  hồ sơ bị gộp trỏ tới hồ sơ giữ lại.
- **Vì sao:** BR5 cấm xóa hồ sơ bị gộp nên nó vẫn giữ chỗ SĐT của nó; gán thẳng sẽ vi phạm ràng buộc SĐT duy nhất (QT-01). Hoán đổi thì tra bằng SĐT nào
  cũng ra hồ sơ giữ lại.
- **Ảnh hưởng:** `src/services/duplicate.service.js`, `docs/api-contract.md` mục 3.6, `tests/duplicate.service.test.js` TC-P5.

## 13. Sửa lỗi tra SĐT của hồ sơ đã gộp (phát hiện khi chạy thử)

- **Thay đổi gì:** khi chạy thử luồng gộp bằng curl, em thấy tra bằng SĐT cũ của hồ sơ bị gộp vẫn trả về hồ sơ bị gộp, trong khi US6-AC2 yêu cầu trả về
  hồ sơ giữ lại. Em sửa `findByPhone` và thêm test TC-S12.
- **Vì sao:** tra bằng SĐT cũ phải ra hồ sơ hiện hành.
- **Ảnh hưởng:** `src/services/customer.service.js`, `tests/customer.service.test.js`.

## 14. Express phục vụ luôn bản build giao diện, token lưu trong sessionStorage

- **Thay đổi gì:** chạy thật chỉ cần `npm start` (một cổng 3000), Express phục vụ thư mục `frontend/dist`; khi phát triển dùng proxy của Vite nên không gặp lỗi CORS.
  Token đăng nhập lưu trong `sessionStorage`, không dùng cookie `httpOnly`.
- **Vì sao:** một lệnh chạy giúp README mục 3 ngắn gọn. sessionStorage đơn giản hơn cookie (không cần cấu hình CORS và CSRF) và mất khi đóng tab.
  **Hạn chế đã biết:** nếu có lỗi XSS thì token đọc được; em giảm rủi ro bằng cách không dùng `dangerouslySetInnerHTML` và thêm header CSP.
- **Ảnh hưởng:** `src/app.js`, `frontend/src/api/client.js`.

## 15. Thêm npm run env:init và npm run db:setup để README mỗi bước một lệnh

- **Thay đổi gì:** thêm `npm run env:init` (tạo `.env`, sinh mật khẩu ngẫu nhiên) và `npm run db:setup` (tạo database và tài khoản ứng dụng). Bỏ đoạn SQL nhiều câu
  trong README.
- **Vì sao:** máy em không có lệnh `mysql` trong PATH, và đoạn SQL nhiều câu trái yêu cầu "mỗi bước một lệnh". Hai script đọc `.env` nên chạy giống nhau ở mọi máy.
- **Ảnh hưởng:** `scripts/init-env.js`, `scripts/db-setup.js`, `.env.example` (thêm `DB_ADMIN_USER`, `DB_ADMIN_PASSWORD`), `README.md` mục 3. Em đã clone repo sang
  một thư mục mới và chạy đủ các bước.
