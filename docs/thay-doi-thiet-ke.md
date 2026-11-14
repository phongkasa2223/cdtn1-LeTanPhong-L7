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

> **Đã thay ở Bài tập 2:** mục 16 làm chữ D của CRUD bằng xóa mềm. Em giữ nguyên bản ghi này để thấy lịch sử quyết định.

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

## 16. Xóa mềm hồ sơ khách hàng để đủ chữ D của CRUD (thay quyết định ở mục 7)

- **Thay đổi gì:** thêm `DELETE /api/customers/{code}` (E17). Hồ sơ chỉ bị đánh dấu `deleted_at` (cột mới ở `migrations/002`), dòng vẫn nằm trong bảng; tra cứu, liệt kê
  và tìm cặp nghi trùng bỏ qua hồ sơ đã xóa. Không xóa được hồ sơ đã gộp (`CUSTOMER_MERGED`), hồ sơ giữ lại của hồ sơ đã gộp (`CUSTOMER_HAS_MERGED`) và hồ sơ đang
  trong cặp chờ duyệt (`CUSTOMER_IN_PENDING_PAIR`). SĐT của hồ sơ đã xóa vẫn được giữ (QT-01): tạo hoặc sửa sang số đó báo `DUPLICATE_PHONE`, còn nhập file gặp lại số
  đó thì **khôi phục** hồ sơ và gắn bản ghi vào.
- **Vì sao:** Bài tập 2 (S1) cần ít nhất hai thực thể đủ tạo – đọc – sửa – xóa. BR5 (QT-13) chỉ cấm xóa **vật lý** nên xóa mềm không vi phạm; mục 7 đã ghi đây là hướng sửa.
  Nếu nhập file coi hồ sơ đã xóa là không tồn tại thì INSERT vi phạm khóa SĐT duy nhất và hủy cả file (NFR3); nếu gắn bản ghi vào mà không khôi phục thì bản ghi rơi vào
  hồ sơ không ai thấy, nên em chọn khôi phục. Bảng vai trò trong SRS ghi nhân viên "không được xóa lần nhập hay hồ sơ (QT-13)": em hiểu là xóa vật lý và cho Nhân viên
  dữ liệu xóa mềm hồ sơ như các thao tác ghi khác; lần nhập và bản ghi nhập vẫn không xóa được dưới mọi hình thức.
- **Ảnh hưởng:** `migrations/002_customer_soft_delete.sql` (chạy lại được; `docs/schema.sql` và `docs/erd.drawio` của BT1 giữ nguyên, cột này chỉ có ở migration),
  `seeds/001_demo.sql`, `src/repositories/customer.repository.js`, `duplicate-pair.repository.js`, `src/services/customer.service.js`, `import.service.js`,
  `src/routes/customer.routes.js`, `docs/api-contract.md` mục 3.7, `tests/customer.service.test.js` (TC-S7 đổi nghĩa, thêm TC-S13 đến TC-S18),
  `tests/import.service.test.js` (TC-I11, TC-I12).

## 17. Thêm quản lý tài khoản, chỉ Quản lý dữ liệu được dùng

- **Thay đổi gì:** thêm `GET/POST /api/users` và `GET/PUT/DELETE /api/users/{id}` (E12 đến E16). Tên đăng nhập không đổi sau khi tạo; Nhân viên dữ liệu phải có mã đơn vị,
  Quản lý dữ liệu thì không (QT-14); không tự xóa tài khoản đang đăng nhập; không xóa hay hạ vai trò Quản lý dữ liệu cuối cùng; tài khoản đã có lần nhập hoặc quyết định
  duyệt cặp bị khóa ngoại chặn xóa (`USER_HAS_HISTORY`); mật khẩu 8 đến 72 ký tự có chữ và số, lưu băm scrypt, dữ liệu trả ra không bao giờ có mật khẩu.
- **Vì sao:** thực thể thứ hai của S1. `app_user` nằm ngoài BR5 nên xóa vật lý được và không phải đổi cấu trúc bảng. SRS ở BT1 chỉ có hai vai trò và **không có use case quản
  lý tài khoản**, nên đây là use case mới em thêm cho BT2. Em giao cho Quản lý dữ liệu vì đó là vai trò chịu trách nhiệm chung toàn công ty; nhân viên không tự cấp tài khoản.
- **Ảnh hưởng:** `src/services/user.service.js`, `user.contract.js`, `src/routes/user.routes.js`, `src/repositories/app-user.repository.js`, `src/app.js`,
  `docs/api-contract.md` mục 3.7, `tests/user.service.test.js` (TC-U1 đến TC-U14).

## 18. Xác thực đọc lại tài khoản từ CSDL ở mỗi request

- **Thay đổi gì:** `AuthService.verifyToken` thành bất đồng bộ: sau khi kiểm chữ ký và hạn, đọc người dùng theo id; không còn thì `UNAUTHORIZED`. Vai trò và đơn vị lấy từ
  CSDL, không lấy từ token.
- **Vì sao:** có xóa tài khoản thì token cũ không được dùng tiếp, nếu không nhập file bằng token đó sẽ vỡ khóa ngoại `imported_by`. Đổi vai trò cũng có hiệu lực ngay. Cái giá
  là mỗi request có thêm một truy vấn theo khóa chính.
- **Ảnh hưởng:** `src/services/auth.service.js`, `src/middleware/auth.js`, `tests/auth.service.test.js` (TC-A7, TC-A8), `tests/auth.middleware.test.js` (TC-M6).

## 19. Mất kết nối CSDL trả 503 `SERVICE_UNAVAILABLE`

- **Thay đổi gì:** `src/db.js` bọc pool; mã lỗi `ECONNREFUSED`, `ETIMEDOUT`, `PROTOCOL_CONNECTION_LOST`... đổi thành `SERVICE_UNAVAILABLE` ở một chỗ duy nhất. Middleware lỗi trả
  503 kèm `requestId` và log đúng một dòng; giao diện hiện thông báo ba phần và mã tra cứu. Trước đó đăng nhập khi DB tắt trả 500 "Đã xảy ra lỗi không mong đợi".
- **Vì sao:** Buổi 11 và bước chấm "tắt một thành phần rồi thử lại": hệ thống phải báo lỗi rõ ràng và không treo (kết nối chờ tối đa 3 giây). `/health` đã trả 503 từ trước,
  giờ cả API cũng nhất quán.
- **Ảnh hưởng:** `src/db.js`, `src/routes/http-error.js`, `frontend/src/api/messages.js`, `docs/api-contract.md` mục 2 và 3.7, `tests/db.test.js` (TC-N1 đến TC-N5),
  `tests/http-error.test.js` (TC-H1 đến TC-H4).

## 20. Log không ghi query string, che SĐT trong thông báo lỗi

- **Thay đổi gì:** dòng log request chỉ ghi đường dẫn, bỏ phần `?query`; thông báo lỗi gốc được che mọi dãy từ 9 chữ số trước khi ghi log; log lỗi cuối dùng khóa `reason`
  để không đè mất nhãn dòng log.
- **Vì sao:** Buổi 11 cấm ghi SĐT vào log, mà tra cứu theo SĐT (E9) đặt số trong query nên số lọt vào log; thông báo trùng khóa của MySQL cũng chứa giá trị trùng.
- **Ảnh hưởng:** `src/logger.js`, `src/app.js`, `src/routes/http-error.js`, `tests/logger.test.js` (TC-L1 đến TC-L3).

## 21. Từ chối file CSV không phải UTF-8

- **Thay đổi gì:** file CSV lưu theo mã hóa ANSI (Excel cũ) hoặc file nhị phân bị từ chối `400 INVALID_ENCODING` trước khi tạo lần nhập. Trước đó file ANSI được nhận (201)
  và tên bị hỏng chữ có dấu.
- **Vì sao:** BR8 quy định file CSV UTF-8. Em phát hiện khi thử các file sai (bước chấm 4): `buffer.toString('utf8')` không bao giờ báo lỗi nên không có gì chặn.
- **Ảnh hưởng:** `src/services/import.service.js`, `src/routes/http-error.js`, `frontend/src/api/messages.js`, `docs/api-contract.md` mục 3.7,
  `tests/import.service.test.js` (TC-I13).

## 22. Hạn chế đã biết của Bài tập 2

- **Thay đổi gì:** em chưa xử lý bốn chỗ. (1) Đơn vị của một lần nhập suy ra từ `app_user.store_code` **hiện tại**, nên đổi đơn vị của nhân viên đã có lần nhập sẽ chuyển luôn
  các lần nhập và cặp nghi trùng cũ sang đơn vị mới. (2) Hồ sơ khách hàng không gắn với đơn vị, nên nhân viên đơn vị nào cũng xóa mềm hoặc sửa được hồ sơ bất kỳ. (3) Gộp cặp
  chưa kiểm lại `deleted_at`, và kiểm tra "Quản lý cuối cùng" không khóa dòng, nên hai yêu cầu chồng nhau trong vài mili giây có thể cùng qua. (4) Chưa chặn đoán mật khẩu nhiều lần.
- **Vì sao:** (1) và (2) cần thêm cột đơn vị vào lần nhập và hồ sơ, tức đổi ERD; (3) hiếm khi xảy ra; em ưu tiên các việc kiểm chứng được trước hạn nộp.
- **Ảnh hưởng:** `src/services/user.service.js`, `customer.service.js`, `duplicate.service.js`; chưa có test cho bốn trường hợp này.

## 23. Phản hồi của thầy về Bài tập 2: làm Docker, giữ nguyên màn hình tra cứu

- **Thay đổi gì:** thầy nhận xét bài không có lỗi đáng kể, chỉ nêu chưa có Docker và chưa có màn hình tra cứu khách hàng; cả hai em đã ghi là chưa làm ở mục 1 của báo cáo Bài tập 2.
  Với Docker em **làm** ở Bài tập 3: thêm `Dockerfile` và `docker-compose.yml` để dựng hệ thống bằng không quá 2 lệnh. Với màn hình tra cứu (UC6) em **giữ nguyên**, không làm thêm.
  Thầy không nêu lỗi nào nên `docs/bug-log.md` không có mục mới từ phản hồi này.
- **Vì sao:** (1) Docker: mục C1 của Bài tập 3 yêu cầu dựng lại hệ thống từ thư mục trống bằng không quá 2 lệnh và slide Buổi 13 khuyến nghị Dockerfile cùng docker-compose; `README.md` hiện cần 8 bước.
  (2) Tra cứu: UC6 là SHOULD (`docs/srs.md` mục 6, FR7), đã ghi là cắt ở mục 9 và `README.md` mục 6; sáu thành phần của Bài tập 3 (Test Plan,
  Test Report, Bug Log, gói đóng gói, Deployment Guide, tài liệu kỹ thuật) không có thành phần nào là tính năng mới. API tra cứu theo SĐT (E9, `GET /api/customers?phone=`) vẫn có và đã được
  kiểm bằng TC-S7, TC-S11, TC-S12 và một bước của `npm run e2e`.
- **Ảnh hưởng:** `Dockerfile`, `docker-compose.yml` và `.dockerignore` đã thêm (chi tiết ở mục 26); `README.md`, Test Plan mục 4 và Deployment Guide ghi cách dựng bằng Docker. Test Plan mục 1 ghi
  giao diện tra cứu là phần chưa hiện thực nên không kiểm; cột "Test case (BT3)" của FR7 trong `docs/srs.md` mục 6 trỏ tới các test của API E9.

## 24. Chặn đoán mật khẩu nhiều lần (BUG-009)

- **Thay đổi gì:** `POST /api/auth/login` đếm số lần đăng nhập sai theo cặp (địa chỉ gọi, tên đăng nhập). Sai 5 lần liên tiếp thì cặp đó bị khóa 15 phút kể từ lần sai cuối: trả `429 TOO_MANY_ATTEMPTS`
  kèm `Retry-After`, kể cả khi nhập đúng mật khẩu. Đăng nhập đúng xóa bộ đếm; cặp khác không bị ảnh hưởng. Đây là hạn chế (4) của mục 22.
- **Vì sao:** test TC-API2 (bảo mật, OWASP A07) cho thấy sai mật khẩu 6 lần đều chỉ trả 401 và lần nhập đúng ngay sau đó vẫn vào được, tức đoán mật khẩu không giới hạn. Khóa theo cặp (địa chỉ, tên) để
  người ngoài không khóa được tài khoản của người dùng thật từ máy khác. Bộ đếm nằm trong bộ nhớ một tiến trình (khởi động lại thì xóa, chạy nhiều máy chủ cần kho chung); hệ thống hiện chạy một máy chủ nên đủ dùng.
- **Ảnh hưởng:** `src/middleware/login-throttle.js` (mới), `src/routes/auth.routes.js`, `src/routes/http-error.js`, `frontend/src/api/messages.js`, `docs/api-contract.md` mục 2 và 3.8,
  `tests/login-throttle.test.js` (TC-A9 đến TC-A12), `tests/api/security.api.test.js` (TC-API2).

## 25. Đổi số Quản lý dữ liệu chạy trong giao dịch có khóa (BUG-010)

- **Thay đổi gì:** xóa Quản lý dữ liệu và hạ vai trò Quản lý chạy trong một giao dịch: khóa các dòng Quản lý (`SELECT ... FOR UPDATE`) rồi mới đếm "còn mấy Quản lý" và ghi. Hai yêu cầu chồng nhau thì
  yêu cầu sau chờ, thấy chỉ còn một Quản lý và bị từ chối `LAST_MANAGER`. Xóa nhân viên không bị khóa. Đây là nửa sau của hạn chế (3) ở mục 22.
- **Vì sao:** test TC-DB6 trên CSDL thật cho thấy hai Quản lý xóa nhau cùng lúc thì cả hai cùng thấy "còn hai Quản lý" và cùng được xóa, để lại 0 Quản lý (vòng 2 của lần chạy đầu); test đơn vị với repository
  giả không thấy được lỗi này. Nửa đầu của hạn chế (3), gộp cặp chưa kiểm lại `deleted_at`, không xảy ra qua API: xóa mềm hồ sơ bị chặn khi hồ sơ đang nằm trong cặp chờ duyệt và kiểm tra đó chạy sau khi
  khóa dòng (TC-DB5), nên em chưa sửa phần này.
- **Ảnh hưởng:** `src/services/user.service.js`, `src/repositories/app-user.repository.js` (`lockManagers`), `src/app.js` (thêm `userUow`), `tests/integration/user.db.test.js` (TC-DB6),
  `tests/user.service.test.js` (TC-U15, TC-U16).

## 26. Đóng gói bằng Docker Compose để dựng từ thư mục trống bằng 2 lệnh

- **Thay đổi gì:** thêm `Dockerfile` (hai giai đoạn: build giao diện React, rồi image Node 24 Alpine chạy bằng user `node`), `docker-compose.yml` (dịch vụ `db` là MariaDB 10.11 và `app`; `app` chỉ khởi động
  khi `db` đã `healthy`; cổng CSDL không mở ra máy chủ; cổng ứng dụng là `APP_PORT`, mặc định 3000), `.dockerignore`, `.gitattributes` (giữ xuống dòng LF cho file container đọc), `docker/initdb/01-databases.sql`
  (tạo `mekong_dq` và `mekong_dq_test` với `utf8mb4_unicode_ci`, cấp quyền cho user `mekong`) và `scripts/docker-start.js` (chờ CSDL, chạy migrations, nạp seeds nếu `SEED_DEMO_DATA` không phải `false`, rồi chạy API).
  `.env.example` có giá trị mẫu chạy được cho `DB_PASSWORD` và `JWT_SECRET`; các script npm đổi `--env-file` thành `--env-file-if-exists` và `engines` đổi từ `>=20.12` thành `>=22.9`
  (cờ mới có từ Node 22.9). README mục 3 chỉ còn 2 lệnh (`cp .env.example .env`, `docker compose up -d --build`), luồng 8 bước cũ chuyển xuống mục 3b.
- **Vì sao:** (1) Mục C1 của Bài tập 3 là dựng lại từ thư mục trống bằng không quá 2 lệnh, không cần hỏi tác giả. (2) Image `mariadb` tự tạo user ở mọi máy (`'%'`), còn `db:setup` tạo user `'localhost'` nên
  không dùng được giữa hai container; vì vậy CSDL và quyền do file SQL khởi tạo lo. Bảng mã `utf8mb4_unicode_ci` phải đặt tường minh vì việc tìm cặp nghi trùng dựa vào nó và các bảng không ghi COLLATE.
  (3) Dùng script Node thay vì shell để không dính CRLF và quyền thực thi khi clone từ Windows. (4) `--env-file-if-exists` để `docker compose exec app npm run seed` chạy được trong container không có file `.env`.
  (5) Giá trị mẫu trong `.env.example` công khai nên Deployment Guide và checklist bảo mật ghi rõ phải đổi khi dùng thật; chạy ngoài Docker thì `npm run env:init` vẫn thay bằng chuỗi ngẫu nhiên.
- **Ảnh hưởng:** `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.gitattributes`, `docker/initdb/`, `scripts/docker-start.js`, `.env.example`, `package.json`, `README.md`, `docs/deployment-guide.md`,
  `docs/test-plan.md` mục 4. Đã kiểm bằng phép thử máy trắng: clone từ GitHub vào thư mục trống, hai lệnh trên, `docker compose ps` cả hai dịch vụ `healthy`, `/health` `ok`, `docker compose exec app npm test`
  125 test PASS (trên Linux và MariaDB 10.11), chạy seed lần hai không đổi số dòng. Chưa kiểm trên MySQL 8.0 thật.

## 27. Tài liệu kỹ thuật bằng tiếng Anh và checklist bảo mật

- **Thay đổi gì:** thêm `docs/api-docs/README.md` (tiếng Anh, 18 endpoint đang chạy, mỗi endpoint đủ 7 mục và ví dụ request, response thật), `docs/api-docs/examples.json` (kết quả ghi lại nguyên văn) và
  `scripts/capture-api-examples.js` (gọi từng endpoint của hệ thống đang chạy để ghi ví dụ); `docs/deployment-guide.md` (tiếng Anh, 5 mục); `docs/checklist-bao-mat.md` (7 mục, mỗi mục kèm lệnh và kết quả).
- **Vì sao:** Bài tập 3 yêu cầu tài liệu API đủ mọi endpoint với ví dụ chép từ lần chạy thật, Deployment Guide tiếng Anh và checklist bảo mật có minh chứng. `docs/api-contract.md` (tiếng Việt, từ Bài tập 1) giữ nguyên làm bản thiết kế;
  hai endpoint E8 và E10 có trong thiết kế nhưng chưa hiện thực nên API docs ghi riêng ở mục 3 thay vì mô tả như đã có.
- **Ảnh hưởng:** chỉ thêm tài liệu và một script chạy tay; không đổi mã ứng dụng. Hạn chế của checklist mục 3 (hồ sơ khách hàng chưa gắn với đơn vị) ghi trung thực ở `docs/checklist-bao-mat.md`.
