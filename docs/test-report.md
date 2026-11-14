# Test Report: Luồng L7, Chất lượng dữ liệu khách hàng (Track SE)

Kết quả chạy 12 test case của `docs/test-plan.md`. Mọi ca đã **chạy thật** trên máy của em (Windows 11, Node.js 24, MariaDB 10.4.32, CSDL thử `mekong_dq_test`). Cột "Kết quả thực tế" ghi giá trị quan sát được trong đầu ra của lệnh; mỗi ca có ảnh trong [`docs/screenshots/`](screenshots/). Ca nào FAIL ở lần chạy 1 được giữ nguyên kết quả đó, rồi sửa bug và chạy lại (chi tiết ở `docs/bug-log.md`).

## 1. Tóm tắt

| Lần chạy | Thời điểm (07/11/2026) | Kết quả |
| :--- | :--- | :--- |
| Lần 1, trước khi sửa bug | 11:28 | 12 ca chạy: **9 PASS, 3 FAIL** (TC-08, TC-11, TC-12) |
| Lần cuối, sau khi sửa 3 bug | 11:39 | 12 ca chạy: **12 PASS, 0 FAIL** |
| Cả bộ bằng một lệnh `npm test` | sau commit cuối của phần kiểm thử (07/11/2026) | **125 test, 125 PASS, 0 FAIL**, khoảng 9 giây (115 đơn vị, 6 tích hợp, 4 API) |
| Cả bộ trong Docker, trên bản clone sạch từ GitHub | 14/11/2026 | `docker compose exec app npm test`: **125 test, 125 PASS, 0 FAIL**, khoảng 8 giây, trên Linux (Node 24.22) và MariaDB 10.11 (máy phát triển dùng Windows và MariaDB 10.4); ảnh chụp màn hình thật `npm-test.png` |

Ba ca FAIL ở lần 1 tìm ra ba bug thật, mỗi bug đã sửa bằng một commit riêng: TC-12 tìm ra BUG-008, TC-11 tìm ra BUG-009, TC-08 tìm ra BUG-010. Sau mỗi lần sửa, cả bộ `npm test` được chạy lại trên đúng cây mã của commit đó: 117, 121 rồi 124 test, đều PASS hết (ảnh `BUG-008-fixed.png`, `BUG-009-fixed.png`, `BUG-010-fixed.png`).

**Chạy lại một ca:** cần MariaDB đang chạy và đã `npm run db:setup` một lần; mỗi ca có đúng một lệnh ở cột "Các bước". Chạy cả bộ: `npm test`.

## 2. Các test case

Kết quả "lần 1" và "lần cuối" giống nhau nếu không ghi khác. Tầng và loại ghi ngay dưới mã.

| Mã | Tiền điều kiện | Các bước | Dữ liệu thử | Kết quả mong đợi | Ưu tiên | Kết quả thực tế | PASS/FAIL |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| **TC-01**<br>đơn vị<br>luồng đúng<br>QT-02 | Danh mục đầu số `config/phone_prefixes.json` có đầu số 090 | `node --test --test-name-pattern="^TC-V1 " tests/record-validator.test.js` | `0901234567`, `0901 234 567`, `84901234567`, `+84 901.234.567`, `(090) 123-4567` | Cả 5 cách viết đều chuẩn hóa về `0901234567` | Cao | Cả 5 dạng ra `0901234567` (ví dụ `"+84 901.234.567" -> 0901234567`) | PASS<br>`TC-01.png` |
| **TC-02**<br>đơn vị<br>luồng đúng<br>BR5, QT-13 | Kho giả có hồ sơ C000001 (SĐT 0901234567), chưa xóa | `node --test --test-name-pattern="^TC-S7 " tests/customer.service.test.js` | Xóa hồ sơ `C000001`, rồi tra bằng mã, bằng SĐT và liệt kê | Không xóa vật lý: số dòng trong kho vẫn 1 và có `deleted_at`; tra bằng mã hoặc SĐT đều `CUSTOMER_NOT_FOUND`; danh sách còn 0 hồ sơ | Cao | Số dòng trong kho 1; `deleted_at = 2026-10-17 15:00:00`; số hồ sơ còn hiện trong danh sách 0; hai lần tra cứu đều `CUSTOMER_NOT_FOUND` | PASS<br>`TC-02.png` |
| **TC-03**<br>đơn vị<br>giá trị biên<br>BR8 | Dịch vụ nhập file với repository giả; giới hạn 5 MB = 5.242.880 byte | `node --test --test-name-pattern="^TC-I14 " tests/import.service.test.js` | File CSV hợp lệ dài **đúng 5.242.880 byte** (một dòng khách hàng, phần còn lại là khoảng trắng) | File được nhận: tạo 1 lần nhập, 1 trên 1 bản ghi hợp lệ | Trung bình | `file 5242880 byte -> I001, hợp lệ 1/1; số lần nhập đã lưu: 1` | PASS<br>`TC-03.png` |
| **TC-04**<br>đơn vị<br>giá trị biên<br>BR8 | Như TC-03 (cùng ranh giới, phía bên kia) | `node --test --test-name-pattern="^TC-I15 " tests/import.service.test.js` | File CSV dài **5.242.881 byte** (5 MB cộng 1 byte) | Bị từ chối `FILE_TOO_LARGE` với thông báo nhắc 5 MB; không lưu gì | Trung bình | `file 5242881 byte -> FILE_TOO_LARGE: File lớn hơn 5 MB.; số lần nhập đã lưu: 0` | PASS<br>`TC-04.png` |
| **TC-05**<br>đơn vị<br>dữ liệu sai<br>BR8 | Dịch vụ nhập file với repository giả, chưa có lần nhập nào | `node --test --test-name-pattern="^TC-I13 " tests/import.service.test.js` | File CSV lưu ANSI (93 byte, họ tên chứa byte 0xEA và 0xE3) | Bị từ chối `INVALID_ENCODING`; không có lần nhập và không có hồ sơ nào được lưu | Trung bình | `file ANSI (93 byte, có byte 0xEA và 0xE3) -> INVALID_ENCODING: File không phải văn bản CSV mã hóa UTF-8.; số lần nhập đã lưu 0, số hồ sơ 0` | PASS<br>`TC-05.png` |
| **TC-06**<br>đơn vị<br>bảo mật<br>QT-15 | Kho giả có hồ sơ C000001, SĐT 0901234567 | `node --test --test-name-pattern="^TC-S11 " tests/customer.service.test.js` | Nhân viên tra bằng `+84 901 234 567`; quản lý tra bằng `0901234567` | Nhân viên thấy SĐT bị che `090****567`; quản lý thấy đầy đủ `0901234567` | Cao | Nhân viên thấy `090****567`; quản lý thấy `0901234567` | PASS<br>`TC-06.png` |
| **TC-07**<br>tích hợp<br>luồng đúng<br>QT-01, BR3, FR2 | CSDL thử nạp lại `seeds/001_demo.sql`: 12 hồ sơ, 2 lần nhập, 2 cặp nghi trùng chờ duyệt | `node --test --test-name-pattern="^TC-DB1 " tests/integration/import.db.test.js` | File 5 dòng của `nv.lan`: 3 khách mới hợp lệ (trong đó 1 người trùng email và họ tên + ngày sinh với hồ sơ mẫu), 1 dòng SĐT 8 chữ số, 1 dòng có SĐT của C000009 | Lần nhập `I003`: tổng 5, hợp lệ 4, lỗi 1 (`PHONE_LENGTH`); hồ sơ mới 3; gắn vào hồ sơ có sẵn 1; cặp nghi trùng mới 2; số dòng tăng đúng: `import_batch` +1, `stg_customer` +5, `dq_result` +1, `customer` +3, `duplicate_pair` +2 | Cao | `I003`, tổng 5, hợp lệ 4, lỗi 1 (PHONE_LENGTH 1), hồ sơ mới 3, gắn vào hồ sơ có sẵn 1, cặp mới 2. Số dòng thêm: `{"dq_result":1,"stg_customer":5,"duplicate_pair":2,"import_batch":1,"customer":3,"app_user":0}`. Hồ sơ `0904111222` lưu `Phạm Minh Tâm`, `tam.pham@gmail.com`, `1994-02-10` | PASS<br>`TC-07.png` |
| **TC-08**<br>tích hợp<br>chất lượng dữ liệu<br>quản lý cuối cùng | CSDL thử nạp lại seeds: một Quản lý duy nhất (`ql.hung`, user_id 3); mỗi vòng tạo thêm Quản lý thứ hai | `node --test --test-name-pattern="^TC-DB6 " tests/integration/user.db.test.js` | 10 vòng; mỗi vòng hai Quản lý xóa nhau, hai yêu cầu chạy chồng nhau | Mọi vòng còn **ít nhất 1 Quản lý** (một yêu cầu xóa được, yêu cầu kia bị `LAST_MANAGER`) | Cao | **Lần 1: vòng 2 `xóa được / xóa được; còn 0 Quản lý`** (vòng 1 `xóa được / LAST_MANAGER; còn 1`).<br>Lần cuối: cả 10 vòng `xóa được / LAST_MANAGER; còn 1 Quản lý` | **Lần 1: FAIL** (BUG-010)<br>`TC-08-fail.png`<br>**Lần cuối: PASS**<br>`TC-08.png` |
| **TC-09**<br>tích hợp<br>tái lập<br>C8 | CSDL thử đã có bảng và seeds (lần 1) | `node --test --test-name-pattern="^TC-DB3 " tests/integration/repro.db.test.js` | Chạy lại `001_init.sql`, `002_customer_soft_delete.sql` và `001_demo.sql` lần hai | Không lỗi; số dòng 6 bảng không đổi, không nhân đôi | Trung bình | Không lỗi. Số dòng sau lần 1 và lần 2 giống nhau: `{"dq_result":1,"stg_customer":2,"duplicate_pair":2,"import_batch":2,"customer":12,"app_user":3}` | PASS<br>`TC-09.png` |
| **TC-10**<br>API<br>luồng đúng<br>BR4, QT-15, US6-AC2 | API chạy trên cổng ngẫu nhiên, nối CSDL thử đã nạp seeds; tài khoản `nv.lan` (CH01) và `ql.hung` (quản lý) | `node --test --test-name-pattern="^TC-API1 " tests/api/flow.api.test.js` | Đăng nhập; nhập file 3 dòng (2 dòng cùng email, 1 dòng SĐT 7 chữ số); xem lỗi; xem cặp; gộp giữ hồ sơ A; gộp lần hai; tra SĐT của hồ sơ B | 201 với 1 cặp mới; có 1 bản ghi lỗi `PHONE_LENGTH`; nhân viên thấy SĐT che, quản lý thấy đủ; gộp 200 `MERGED`; quyết định lần hai 409 `PAIR_ALREADY_DECIDED`; tra SĐT hồ sơ B ra hồ sơ A; hồ sơ B vẫn còn trong bảng | Cao | (1) nhập file 201 `I003`: 3 dòng, 1 lỗi, 1 cặp mới. (2) lỗi `PHONE_LENGTH` 200: 1 bản ghi, dòng 3 có SĐT `0906000`. (3) cặp `P0003` (EMAIL): nhân viên thấy `090****222`, quản lý thấy `0906000222`. (4) gộp `P0003`, giữ `C000013` 200 `MERGED`, `C000014` đánh dấu đã gộp. (5) lần hai 409 `PAIR_ALREADY_DECIDED`. (6) tra SĐT `0906000222` 200 ra `C000013`; `C000014` còn trong bảng `customer`, đã gộp | PASS<br>`TC-10.png` |
| **TC-11**<br>API<br>bảo mật<br>QT-14, QT-15, NFR2, OWASP A01 và A07 | Như TC-10, thêm `nv.minh` (CH02) | `node --test --test-name-pattern="^TC-API2 " tests/api/security.api.test.js` | Gọi không token, token giả, sai vai trò, dữ liệu của đơn vị khác; rồi đăng nhập `nv.minh` sai mật khẩu 6 lần, sau đó nhập đúng | 401 (không token, token giả); 403 (nhân viên gọi `/api/users`, quản lý nhập file); 404 (CH02 xem `I001`, `P0001`, quyết định `P0001` của CH01); được phép thì 200; SĐT che đúng vai trò; không bản ghi nào đổi. **Sai 5 lần liên tiếp thì lần 6 và cả lần nhập đúng ngay sau đó bị 429 `TOO_MANY_ATTEMPTS`**, kèm `Retry-After`; tài khoản khác vẫn đăng nhập được | Cao | Các bước truy cập đúng như mong đợi (401, 401, 403, 403, 404, 404, 404; 200, 200, 200; `090****567` và `0901234567`; số dòng các bảng không đổi, `P0001` vẫn `PENDING`).<br>**Lần 1:** 6 lần sai `401, 401, 401, 401, 401, 401`, nhập đúng ngay sau đó **200** (không bị chặn).<br>Lần cuối: `401, 401, 401, 401, 401, 429`; nhập đúng `429 TOO_MANY_ATTEMPTS (Retry-After: 900)`; `nv.lan` đăng nhập 200 | **Lần 1: FAIL** (BUG-009)<br>`TC-11-fail.png`<br>**Lần cuối: PASS**<br>`TC-11.png` |
| **TC-12**<br>API<br>dữ liệu sai<br>400, 404, 409, 413 | Như TC-10 | `node --test --test-name-pattern="^TC-API3 " tests/api/invalid-input.api.test.js` | 13 yêu cầu sai: SĐT 6 chữ số, thiếu họ tên, họ tên kiểu số, trùng SĐT, hồ sơ không tồn tại, `size=0`, `size=101`, `page=-1`, tra SĐT `abc`, nhập file không chọn file, đăng nhập với kiểu dữ liệu sai, JSON hỏng, **body JSON 300 KB** | Mỗi yêu cầu đúng 400, 404 hoặc 409 kèm mã và thông báo (SĐT sai: `PHONE_LENGTH`, "Số điện thoại phải có 10 chữ số, nhận được 6."); body 300 KB bị **413 `PAYLOAD_TOO_LARGE`**; không có lỗi 5xx; số dòng các bảng không đổi | Cao | 12 yêu cầu đầu đúng như mong đợi (400 `VALIDATION_ERROR`, 409 `DUPLICATE_PHONE`, 404 `CUSTOMER_NOT_FOUND`, 400 `INVALID_PAGE`, 400 `INVALID_FILE_TYPE`, 400 `INVALID_JSON`...).<br>**Lần 1:** body 300 KB trả **500 `INTERNAL_ERROR`**, log ghi `unhandled error` (`PayloadTooLargeError`).<br>Lần cuối: **413 `PAYLOAD_TOO_LARGE`**; mã đã gặp 400, 409, 404, 413; số dòng các bảng không đổi | **Lần 1: FAIL** (BUG-008)<br>`TC-12-fail.png`<br>**Lần cuối: PASS**<br>`TC-12.png` |

## 3. Đối chiếu năm loại và ba tầng

| Loại test của đề | Số ca | Test case |
| :--- | :---: | :--- |
| Luồng đúng | 4 | TC-01, TC-02, TC-07, TC-10 |
| Giá trị biên (hai bên cùng một ranh giới 5 MB) | 2 | TC-03, TC-04 |
| Dữ liệu sai | 2 | TC-05, TC-12 |
| Bảo mật hoặc chất lượng dữ liệu | 3 | TC-06, TC-08, TC-11 |
| Tái lập | 1 | TC-09 |

Ba tầng: 6 test đơn vị (TC-01 đến TC-06), 3 test tích hợp (TC-07 đến TC-09), 3 test API (TC-10 đến TC-12): đáy rộng, đỉnh hẹp.

## 4. Truy vết quy tắc đến test

Mỗi quy tắc đã hiện thực ở mục 1 của Test Plan có ít nhất một test tự động trong `npm test`. Mã test nằm ngay trong tên test (`TC-xx`).

| Quy tắc | Test đơn vị | Test tích hợp và API | Ca ở mục 2 |
| :--- | :--- | :--- | :--- |
| QT-01 SĐT duy nhất | TC-S2, TC-S3, TC-S17, TC-I3, TC-I4, TC-I11, TC-P5 | TC-DB1, TC-API3 (409) | TC-07, TC-12 |
| QT-02 chuẩn hóa SĐT; NFR5 đầu số đọc từ cấu hình | TC-V1, TC-V2, TC-V3 | TC-DB1 | TC-01, TC-07 |
| QT-13, BR5 không xóa vật lý | TC-S6, TC-S7, TC-S14, TC-I11, TC-P11 | TC-DB4, TC-DB5, TC-API1 | TC-02, TC-10 |
| QT-14 phạm vi theo đơn vị | TC-E4, TC-P1, TC-U7 | TC-API2, TC-API4 | TC-11 |
| QT-15 che SĐT | TC-S11, TC-C2, TC-C3 | TC-API1, TC-API2 | TC-06, TC-10, TC-11 |
| BR3 dòng lỗi chưa vào danh sách khách hàng | TC-I2, TC-V9 | TC-DB1 | TC-07 |
| BR4 mỗi cặp chỉ quyết định một lần | TC-P7, TC-P8 | TC-API1 (bước 5) | TC-10 |
| BR8 CSV UTF-8, tối đa 5 MB | TC-I8, TC-I10, TC-I13, TC-I14, TC-I15 | TC-API3 (không chọn file) | TC-03, TC-04, TC-05 |
| NFR2 đăng nhập, phân quyền, chống đoán mật khẩu | TC-A1 đến TC-A12, TC-M1 đến TC-M6 | TC-API2 | TC-11 |
| NFR3 nhập file trong một giao dịch | TC-I7 | TC-DB2 | (ngoài 12 ca) |
| Quản lý tài khoản, Quản lý cuối cùng | TC-U1 đến TC-U16 | TC-DB6 | TC-08 |
| C8 migration và seed chạy lại | | TC-DB3 | TC-09 |
| Lỗi của người gọi trả 400, 404, 409, 413, không bao giờ 500 | TC-H1 đến TC-H4 | TC-API3 | TC-12 |
| FR3 danh sách lần nhập | | TC-API4, TC-API2 | |

## 5. Bug tìm được

| Bug | Mức | Phát hiện ở | Commit sửa | Ảnh trước và sau |
| :--- | :---: | :--- | :--- | :--- |
| BUG-008 body JSON quá lớn trả 500 | Major | TC-12 lần 1 | [a9e5471](https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7/commit/a9e5471f1b65d4a3f847ba4253e6dcad50ae6b06) | `TC-12-fail.png`, `TC-12.png`, `BUG-008-fixed.png` |
| BUG-009 đoán mật khẩu không giới hạn | Critical | TC-11 lần 1 | [4fef076](https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7/commit/4fef0766a53f83201c6d7a6cbadc0384ac5dbea3) | `TC-11-fail.png`, `TC-11.png`, `BUG-009-fixed.png` |
| BUG-010 hai Quản lý xóa nhau cùng lúc còn 0 Quản lý | Major | TC-08 lần 1 | [9abc618](https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7/commit/9abc618a912f3cf3e3491d76286ea308ffe629f3) | `TC-08-fail.png`, `TC-08.png`, `BUG-010-fixed.png` |

Không còn bug Critical đang mở. Mỗi bug có đủ bảy dòng ở `docs/bug-log.md`.

## 6. Ghi chú và hạn chế

- **Nguồn của ảnh chụp.** `TC-01.png` đến `TC-12.png` và `npm-test.png` là **ảnh chụp màn hình thật** của cửa sổ terminal đang chạy lệnh, chụp ngày 14/11/2026 từ lần chạy trong Docker (bản clone sạch từ GitHub): lệnh là `docker compose exec app` cộng đúng lệnh ở cột "Các bước" (ví dụ `docker compose exec app node --test --test-name-pattern="^TC-V1 " tests/record-validator.test.js`), cả 12 ca PASS; tiêu đề cửa sổ và dòng giờ ở cuối ảnh cho biết thời điểm chạy. Riêng `TC-08-fail.png`, `TC-11-fail.png`, `TC-12-fail.png` và `BUG-008-fixed.png`, `BUG-009-fixed.png`, `BUG-010-fixed.png` là đầu ra thật của lần chạy ngày 07/11/2026 đã ghi lại rồi vẽ thành ảnh kiểu terminal, vì chúng phải chạy trên mã trước khi sửa hoặc trên cây mã của từng commit sửa; khai báo ở phụ lục AI. Mọi ca đều chạy lại được bằng lệnh ở cột "Các bước".
- **TC-08 trong Docker:** ở mỗi vòng một yêu cầu xóa được và yêu cầu kia bị `LAST_MANAGER`, nhưng yêu cầu nào thắng thay đổi giữa các vòng (ví dụ vòng 2 hiện `LAST_MANAGER / xóa được`); điều bắt buộc là mọi vòng còn đúng 1 Quản lý.
- **TC-08 là lỗi tranh chấp** nên trước khi sửa, một lần chạy có thể chưa gặp lỗi ở vòng nào; sau khi sửa, cả 10 vòng luôn đạt (đã lặp thêm 5 lần liên tiếp, đều PASS).
- **Còn mở, chưa sửa:** hồ sơ khách hàng chưa gắn với đơn vị nên nhân viên đơn vị nào cũng sửa hoặc xóa mềm được hồ sơ bất kỳ (`docs/thay-doi-thiet-ke.md` mục 22, điểm 2; cần đổi ERD); giao diện React chưa có test tự động; chưa kiểm trên MySQL 8.0 thật.
