# Bug Log

Các lỗi đã gỡ từ Buổi 8 đến Bài tập 2, mỗi lỗi một mục bảy dòng theo mẫu Buổi 11. Cách gỡ: tái lập, khoanh vùng, sửa **nguyên nhân** (không sửa triệu chứng), rồi
xác nhận bằng một test hồi quy. Link commit: `https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7/commit/<mã>`.

Mức độ theo cây hai câu hỏi của Buổi 13: **Critical** nếu hệ thống không dùng được, dữ liệu bị sai, hoặc lộ dữ liệu hay có lỗ hổng bảo mật; **Major** nếu một chức năng quan trọng sai hoặc không dùng được;
**Minor** là các trường hợp còn lại. Ngày 07/11/2026 (Bài tập 3) em phân loại lại BUG-001, BUG-002, BUG-003, BUG-006 và BUG-007 từ Major lên Critical theo cây này; mã sửa và commit không đổi.

| Mã | Mức | Lỗi | Commit sửa |
| :--- | :---: | :--- | :--- |
| BUG-001 | Critical | Tra SĐT của hồ sơ đã gộp trả sai hồ sơ | [2204623](https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7/commit/2204623) |
| BUG-002 | Critical | Có thể xóa vật lý hồ sơ khách hàng, vi phạm BR5 | [fb8dc38](https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7/commit/fb8dc38) |
| BUG-003 | Critical | Số điện thoại lọt vào log | [47aeeb9](https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7/commit/47aeeb9) |
| BUG-004 | Minor | Nhãn dòng log lỗi bị ghi đè | [47aeeb9](https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7/commit/47aeeb9) |
| BUG-005 | Major | CSDL tắt thì API trả 500 "Đã xảy ra lỗi không mong đợi" | [95e8a97](https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7/commit/95e8a97) |
| BUG-006 | Critical | File CSV lưu ANSI được nhập với tên bị hỏng chữ | [7e7f2a5](https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7/commit/7e7f2a5) |
| BUG-007 | Critical | Token của tài khoản đã xóa vẫn dùng được | [d4a464b](https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7/commit/d4a464b) |

---

## BUG-001 · Critical – Tra SĐT của hồ sơ đã gộp trả sai hồ sơ

| Dòng | Nội dung |
| :--- | :--- |
| 1. Mã và mức độ | BUG-001 · Critical (trước đây ghi Major; phân loại lại ở Bài tập 3, câu hỏi 1: dữ liệu trả về sai): tra cứu theo SĐT cũ của hồ sơ đã gộp phải ra hồ sơ giữ lại (US6-AC2), nhưng ra chính hồ sơ đã gộp |
| 2. Phát hiện bởi | Chạy thử luồng gộp bằng curl theo tiêu chí US6-AC2 (kiểm thử thủ công, lúc đó chưa có test) |
| 3. Triệu chứng | `GET /api/customers?phone=<SĐT của hồ sơ đã gộp>` trả 200 với hồ sơ đã gộp (`mergedInto` khác `null`) thay vì hồ sơ giữ lại |
| 4. Cách tái lập | Dữ liệu mẫu có C000010 gộp vào C000011: `curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/customers?phone=0765432198"` (trả C000010, đúng ra là C000011) |
| 5. Nguyên nhân | `CustomerService.findByPhone` trả đúng dòng tìm được theo SĐT mà không đi theo `merged_into_id`. Hồ sơ đã gộp vẫn giữ SĐT của nó (BR5, QT-13) nên tra bằng SĐT đó vẫn tìm ra chính nó |
| 6. Cách sửa | Trong service (nơi giữ luật QT-13, repository chỉ đọc bảng): nếu dòng tìm được có `merged_into_code` thì đọc tiếp hồ sơ giữ lại rồi mới trả |
| 7. Commit và xác nhận | [2204623](https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7/commit/2204623) · test TC-S12 "tra bằng SĐT của hồ sơ đã gộp thì ra hồ sơ giữ lại" PASS; `npm run e2e` bước 7 |

## BUG-002 · Critical – Có thể xóa vật lý hồ sơ khách hàng, vi phạm BR5

| Dòng | Nội dung |
| :--- | :--- |
| 1. Mã và mức độ | BUG-002 · Critical (trước đây ghi Major; phân loại lại ở Bài tập 3, câu hỏi 1: dữ liệu bị mất): xóa được hồ sơ khách hàng khỏi bảng nên mất lịch sử gộp, trái BR5 (QT-13: không xóa vật lý hồ sơ khách hàng) |
| 2. Phát hiện bởi | Rà soát mã Sprint 1 đối chiếu với BR5 trong SRS (chưa có test cho trường hợp này) |
| 3. Triệu chứng | `DELETE /api/customers/{code}` trả 204 và dòng biến mất khỏi bảng `customer`, kể cả hồ sơ đã gộp |
| 4. Cách tái lập | Trên bản trước `fb8dc38`: `curl -X DELETE -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/customers/C000010` (hồ sơ đã gộp) |
| 5. Nguyên nhân | Endpoint chạy `DELETE FROM customer` trực tiếp. Khóa ngoại `fk_customer_merged` chỉ chặn xóa hồ sơ **đang được hồ sơ khác trỏ tới** (hồ sơ giữ lại), không chặn xóa hồ sơ đã gộp hay hồ sơ chưa ai tham chiếu |
| 6. Cách sửa | Gỡ endpoint (`fb8dc38`). Ở Bài tập 2 làm lại thành **xóa mềm** (`deleted_at`) kèm ba luật chặn, vì BR5 chỉ cấm xóa vật lý (`docs/thay-doi-thiet-ke.md` mục 16) |
| 7. Commit và xác nhận | [fb8dc38](https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7/commit/fb8dc38) gỡ, [698ec5e](https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7/commit/698ec5e) xóa mềm · tests TC-S7, TC-S13 đến TC-S18 PASS; 14 kiểm tra HTTP thật trên MariaDB |

## BUG-003 · Critical – Số điện thoại lọt vào log

| Dòng | Nội dung |
| :--- | :--- |
| 1. Mã và mức độ | BUG-003 · Critical (trước đây ghi Major; phân loại lại ở Bài tập 3, câu hỏi 1: lộ dữ liệu cá nhân, đúng ví dụ "SĐT lộ trong log" của Buổi 13): dữ liệu cá nhân nằm trong log, trái quy tắc "không ghi SĐT" của Buổi 11 và làm QT-15 (che SĐT) mất tác dụng |
| 2. Phát hiện bởi | Đối chiếu quy tắc log của Buổi 11, rồi chạy server thật và đọc dòng log |
| 3. Triệu chứng | Dòng log `"path":"/api/customers?phone=0901234567"`; thông báo trùng khóa của MySQL (`Duplicate entry '0901234567' ...`) cũng có thể vào log |
| 4. Cách tái lập | `curl "http://localhost:3000/api/customers?phone=0901234567"` rồi xem log của `npm start` (trước `47aeeb9`) |
| 5. Nguyên nhân | Logger ghi nguyên `req.originalUrl` (kèm query string, nơi E9 đặt SĐT) và ghi nguyên `err.message` của thư viện |
| 6. Cách sửa | `pathOnly()` bỏ query string ở một chỗ duy nhất (middleware log request); `redactText()` che mọi dãy từ 9 chữ số trước khi ghi thông báo lỗi |
| 7. Commit và xác nhận | [47aeeb9](https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7/commit/47aeeb9) · tests TC-L1, TC-L2, TC-L3, TC-H3 PASS; log thật chỉ còn `"path":"/api/customers"` |

## BUG-004 · Minor – Nhãn dòng log lỗi bị ghi đè

| Dòng | Nội dung |
| :--- | :--- |
| 1. Mã và mức độ | BUG-004 · Minor: dòng log lỗi cuối mất nhãn nên khó lọc |
| 2. Phát hiện bởi | Đọc log của server thật khi giả lập CSDL tắt (dùng cổng CSDL sai) |
| 3. Triệu chứng | Dòng log lỗi chỉ có `"message":"connect ECONNREFUSED 127.0.0.1:1"`, không còn nhãn `unhandled error` |
| 4. Cách tái lập | `DB_PORT=1 PORT=3999 node --env-file=.env src/server.js`, rồi `POST /api/auth/login`, xem log (trước `47aeeb9`) |
| 5. Nguyên nhân | Nơi gọi truyền context có khóa `message`; `write()` trải context sau nhãn nên giá trị `err.message` đè lên nhãn |
| 6. Cách sửa | Đổi khóa ở nơi gọi thành `reason` và thêm `code` của lỗi; ghi chú ngay trên dòng code để không quay lại |
| 7. Commit và xác nhận | [47aeeb9](https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7/commit/47aeeb9) · log thật sau sửa có đủ nhãn, `requestId`, `code` |

## BUG-005 · Major – CSDL tắt thì API trả 500 "Đã xảy ra lỗi không mong đợi"

| Dòng | Nội dung |
| :--- | :--- |
| 1. Mã và mức độ | BUG-005 · Major: người dùng không biết đây là sự cố tạm thời; trái yêu cầu "báo lỗi rõ ràng chứ không treo" khi tắt một thành phần |
| 2. Phát hiện bởi | Bước chấm "tắt một thành phần rồi thử lại", giả lập bằng cách chạy server với cổng CSDL sai |
| 3. Triệu chứng | Đăng nhập trả `500 INTERNAL_ERROR` "Đã xảy ra lỗi không mong đợi" (trong khi `/health` đã báo 503) |
| 4. Cách tái lập | `DB_PORT=1 PORT=3999 node --env-file=.env src/server.js`, rồi `curl -X POST localhost:3999/api/auth/login -H 'Content-Type: application/json' -d '{"username":"nv.lan","password":"Demo@123"}'` |
| 5. Nguyên nhân | Lỗi `ECONNREFUSED` của mysql2 không được dịch sang lỗi ứng dụng, nên rơi xuống handler cuối và bị coi là lỗi lạ |
| 6. Cách sửa | `src/db.js` bọc pool và dịch mã lỗi mất kết nối thành `SERVICE_UNAVAILABLE` ở **một chỗ**; `http-error.js` ánh xạ 503 kèm `requestId`, log một lần; giao diện hiện thông báo ba phần. Không sửa ở từng route |
| 7. Commit và xác nhận | [95e8a97](https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7/commit/95e8a97) · tests TC-N1 đến TC-N5, TC-H1 PASS; chạy lại: `503 SERVICE_UNAVAILABLE` sau 25 ms |

## BUG-006 · Critical – File CSV lưu ANSI được nhập với tên bị hỏng chữ

| Dòng | Nội dung |
| :--- | :--- |
| 1. Mã và mức độ | BUG-006 · Critical (trước đây ghi Major; phân loại lại ở Bài tập 3, câu hỏi 1: dữ liệu bị sai): ứng dụng làm chất lượng dữ liệu lại nhận dữ liệu hỏng; trái BR8 (file nhập là CSV UTF-8) |
| 2. Phát hiện bởi | Thử các loại file sai theo bước chấm 4 (kịch bản 11 loại file: ngoặc kép không đóng, chỉ có tiêu đề, file nhị phân đổi đuôi, ANSI...) |
| 3. Triệu chứng | File ANSI được nhận với HTTP 201, hợp lệ, tạo hồ sơ có tên chứa ký tự lỗi (�) thay cho chữ có dấu |
| 4. Cách tái lập | Tạo CSV có byte `0xEA` trong họ tên (lưu bằng Windows-1258), rồi `curl -F source=RETAIL -F file=@khach_hang.csv -H "Authorization: Bearer $TOKEN" localhost:3000/api/imports` |
| 5. Nguyên nhân | `buffer.toString('utf8')` không bao giờ báo lỗi: byte không hợp lệ bị thay bằng ký tự lỗi một cách âm thầm, nên không có gì chặn trước khi lưu |
| 6. Cách sửa | Giải mã nghiêm ngặt bằng `TextDecoder('utf-8', { fatal: true })` ngay khi đọc file, từ chối `400 INVALID_ENCODING` trước khi tạo lần nhập (nên 0 bản ghi được lưu) |
| 7. Commit và xác nhận | [7e7f2a5](https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7/commit/7e7f2a5) · test TC-I13 PASS; chạy lại kịch bản 11 loại file: ANSI và nhị phân đều `400 INVALID_ENCODING`, UTF-8 có BOM vẫn nhận |

## BUG-007 · Critical – Token của tài khoản đã xóa vẫn dùng được

| Dòng | Nội dung |
| :--- | :--- |
| 1. Mã và mức độ | BUG-007 · Critical (trước đây ghi Major; phân loại lại ở Bài tập 3, câu hỏi 1: lỗ hổng bảo mật; lỗi thiết kế, bắt trước khi phát hành): tài khoản bị xóa vẫn gọi được API cho tới khi token hết hạn |
| 2. Phát hiện bởi | Rà soát thiết kế khi thêm chức năng xóa tài khoản; bản cũ chưa có chức năng này nên chưa tái hiện được lỗi trên bản đã phát hành |
| 3. Triệu chứng | Sau khi xóa tài khoản, token cũ vẫn trả 200; nhập file bằng token đó sẽ vỡ khóa ngoại `import_batch.imported_by` |
| 4. Cách tái lập | Đăng nhập `nv.thu`, Quản lý xóa `nv.thu` (`DELETE /api/users/{id}`), rồi gọi `GET /api/customers` bằng token cũ: kết quả mong đợi 401 |
| 5. Nguyên nhân | `verifyToken` chỉ kiểm chữ ký và hạn của token, rồi tin vai trò ghi trong token; không đọc lại tài khoản từ CSDL |
| 6. Cách sửa | `verifyToken` đọc lại tài khoản theo id ở mỗi request, vai trò và đơn vị lấy từ CSDL. Cái giá: thêm một truy vấn theo khóa chính cho mỗi request |
| 7. Commit và xác nhận | [d4a464b](https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7/commit/d4a464b) · tests TC-A7, TC-A8, TC-M6 PASS; kiểm tra HTTP thật: token của tài khoản vừa xóa nhận 401 ngay |
