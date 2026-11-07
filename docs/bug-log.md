# Bug Log

Các lỗi đã gỡ từ Buổi 8 đến Bài tập 3, mỗi lỗi một mục bảy dòng theo mẫu Buổi 11. BUG-001 đến BUG-007 tìm được ở Bài tập 2; BUG-008 đến BUG-010 do test chạy thật của Bài tập 3 tìm ra (`docs/test-report.md`), mỗi bug một commit riêng. Cách gỡ: tái lập, khoanh vùng, sửa **nguyên nhân** (không sửa triệu chứng), rồi
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
| BUG-008 | Major | Body JSON quá lớn trả 500 thay vì 413 | [a9e5471](https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7/commit/a9e5471f1b65d4a3f847ba4253e6dcad50ae6b06) |
| BUG-009 | Critical | Đoán mật khẩu không giới hạn số lần | [4fef076](https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7/commit/4fef0766a53f83201c6d7a6cbadc0384ac5dbea3) |
| BUG-010 | Major | Hai Quản lý xóa nhau cùng lúc, còn 0 Quản lý | [9abc618](https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7/commit/9abc618a912f3cf3e3491d76286ea308ffe629f3) |

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

## BUG-008 · Major – Body JSON quá lớn trả 500 thay vì 413

| Dòng | Nội dung |
| :--- | :--- |
| 1. Mã và mức độ | BUG-008 · Major (câu hỏi 1 trả lời không: không sai hay lộ dữ liệu; câu hỏi 2 trả lời có: chức năng báo lỗi cho người gọi sai, cách làm tạm là gửi body nhỏ hơn 256 KB): lỗi của người gọi bị báo là lỗi máy chủ, trái yêu cầu phân biệt 400, 409 và 500 của track SE; người chưa đăng nhập cũng gây ra được |
| 2. Phát hiện bởi | Chạy test case TC-12 (TC-API3) lần 1 lúc 11:28 ngày 07/11/2026; ca này gom các kiểu gửi dữ liệu sai lên API theo gợi ý kiểm thử của track SE |
| 3. Triệu chứng | `POST /api/customers` với body JSON 300 KB (giới hạn 256 KB) trả `500 INTERNAL_ERROR` "Đã xảy ra lỗi không mong đợi" và log ghi `unhandled error` (`PayloadTooLargeError`); đáng ra phải là lỗi của người gọi (4xx) |
| 4. Cách tái lập | Trước `a9e5471`: `node --test --test-name-pattern="^TC-API3 " tests/api/invalid-input.api.test.js` (FAIL `500 !== 413`); hoặc bằng curl: `node -e "console.log(JSON.stringify({fullName:'A'.repeat(300000),phone:'0904111222'}))" > big.json` rồi `curl -s -o /dev/null -w "%{http_code}" -X POST localhost:3000/api/customers -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' --data @big.json` (in ra 500) |
| 5. Nguyên nhân | Bộ bắt lỗi cuối trong `src/app.js` chỉ nhận ra `entity.parse.failed` (JSON hỏng). Lỗi `entity.too.large` do `express.json` ném ra khi body vượt 256 KB không được nhận ra nên rơi vào nhánh lỗi lạ: trả 500 và ghi log mức error. Bộ đọc JSON chạy trước bước đăng nhập nên không cần đăng nhập cũng gặp |
| 6. Cách sửa | Thêm nhánh `entity.too.large` ở đúng bộ bắt lỗi cuối: trả `413 PAYLOAD_TOO_LARGE` kèm thông báo; giới hạn 256 KB thành hằng `JSON_LIMIT_KB` dùng chung cho cấu hình và thông báo; ghi vào `docs/api-contract.md` mục 2 và 3.8 |
| 7. Commit và xác nhận | [a9e5471](https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7/commit/a9e5471f1b65d4a3f847ba4253e6dcad50ae6b06) · TC-12 FAIL lần 1 (`docs/screenshots/TC-12-fail.png`), PASS sau sửa (`TC-12.png`); `npm test` 117/117 trên đúng cây mã của commit (`BUG-008-fixed.png`) |

## BUG-009 · Critical – Đoán mật khẩu không giới hạn số lần

| Dòng | Nội dung |
| :--- | :--- |
| 1. Mã và mức độ | BUG-009 · Critical (câu hỏi 1: lỗ hổng bảo mật, OWASP A07): ai cũng thử mật khẩu vô hạn lần, không bị chậm hay khóa |
| 2. Phát hiện bởi | Chạy test case TC-11 (TC-API2) lần 1 lúc 11:28 ngày 07/11/2026; đây là hạn chế (4) đã ghi ở `docs/thay-doi-thiet-ke.md` mục 22 nhưng chưa có test |
| 3. Triệu chứng | Sai mật khẩu `nv.minh` 6 lần liên tiếp đều trả `401`; lần nhập đúng ngay sau đó trả `200` và đăng nhập thành công |
| 4. Cách tái lập | Trước `4fef076`: `node --test --test-name-pattern="^TC-API2 " tests/api/security.api.test.js` (FAIL: `401` thay vì `429` ở lần thứ 6); hoặc bằng curl: `for i in 1 2 3 4 5 6; do curl -s -o /dev/null -w "%{http_code} " -X POST localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"nv.minh","password":"SaiMatKhau"}'; done` (in `401` cả 6 lần) |
| 5. Nguyên nhân | `POST /api/auth/login` chỉ kiểm tên đăng nhập và mật khẩu, không đếm số lần sai; không có giới hạn tốc độ hay khóa tạm |
| 6. Cách sửa | Thêm `LoginThrottle` (`src/middleware/login-throttle.js`): đếm theo cặp (địa chỉ, tên đăng nhập); sai 5 lần liên tiếp thì khóa 15 phút kể từ lần sai cuối và trả `429 TOO_MANY_ATTEMPTS` kèm `Retry-After`, kể cả khi nhập đúng; đăng nhập đúng xóa bộ đếm; cặp khác không bị ảnh hưởng; bảng đếm có trần 10.000 mục. Giao diện hiện "Thử lại sau 15 phút". Bộ đếm nằm trong bộ nhớ một tiến trình (xem `docs/thay-doi-thiet-ke.md` mục 24) |
| 7. Commit và xác nhận | [4fef076](https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7/commit/4fef0766a53f83201c6d7a6cbadc0384ac5dbea3) · TC-11 FAIL lần 1 (`docs/screenshots/TC-11-fail.png`), PASS sau sửa (`TC-11.png`); thêm TC-A9 đến TC-A12; `npm test` 121/121 trên đúng cây mã của commit (`BUG-009-fixed.png`) |

## BUG-010 · Major – Hai Quản lý xóa nhau cùng lúc, còn 0 Quản lý

| Dòng | Nội dung |
| :--- | :--- |
| 1. Mã và mức độ | BUG-010 · Major (câu hỏi 2: mất chức năng quản lý tài khoản; cách làm tạm là thêm một Quản lý bằng SQL; không sai hay lộ dữ liệu): hai Quản lý xóa nhau cùng lúc thì không còn Quản lý nào, trái luật "không xóa Quản lý cuối cùng" |
| 2. Phát hiện bởi | Chạy test case TC-08 (TC-DB6) lần 1 lúc 11:28 ngày 07/11/2026 trên CSDL thật; đây là nửa sau của hạn chế (3) ở `docs/thay-doi-thiet-ke.md` mục 22 |
| 3. Triệu chứng | Vòng 2 của TC-08: hai yêu cầu xóa đều trả "xóa được", bảng `app_user` còn 0 Quản lý (vòng 1 vẫn đúng: một yêu cầu bị `LAST_MANAGER`) |
| 4. Cách tái lập | Trước `9abc618`: `node --test --test-name-pattern="^TC-DB6 " tests/integration/user.db.test.js` (FAIL `vòng 2: còn 0 Quản lý`; là lỗi tranh chấp nên có vòng chưa gặp, thường lộ ra trong vài vòng đầu) |
| 5. Nguyên nhân | `UserService.remove` kiểm luật `LAST_MANAGER` bằng cách đếm số Quản lý rồi mới xóa, không khóa dòng: hai yêu cầu chồng nhau cùng đếm được 2 rồi cùng xóa. Test đơn vị dùng repository giả chạy lần lượt nên không thấy lỗi này |
| 6. Cách sửa | `remove` và `update` (hạ vai trò Quản lý) chạy trong một giao dịch: `SELECT ... FOR UPDATE` các dòng Quản lý (`lockManagers`) trước khi đếm; yêu cầu sau chờ rồi thấy chỉ còn một Quản lý và bị từ chối `LAST_MANAGER`. Xóa nhân viên không bị khóa (`docs/thay-doi-thiet-ke.md` mục 25) |
| 7. Commit và xác nhận | [9abc618](https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7/commit/9abc618a912f3cf3e3491d76286ea308ffe629f3) · TC-08 FAIL lần 1 (`docs/screenshots/TC-08-fail.png`), PASS 10/10 vòng sau sửa và lặp thêm 5 lần (`TC-08.png`); thêm TC-U15, TC-U16; `npm test` 124/124 trên đúng cây mã của commit (`BUG-010-fixed.png`) |
