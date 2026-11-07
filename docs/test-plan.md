# Test Plan: Luồng L7, Chất lượng dữ liệu khách hàng (Track SE)

Test Plan rút gọn cho Bài tập 3, viết **trước khi chạy** Test Report (`docs/test-report.md`). Bốn mục theo mẫu Buổi 13.

## 1. Phạm vi

**Kiểm:** các quy tắc đã hiện thực.

- **Dữ liệu khách hàng:** QT-01 (mỗi SĐT một hồ sơ), QT-02 (chuẩn hóa SĐT, đầu số đọc từ `config/phone_prefixes.json`), QT-13 và BR5 (không xóa vật lý hồ sơ, xóa mềm), BR3 (dòng lỗi chưa vào danh sách khách hàng).
- **Nhập file và duyệt cặp:** BR8 (CSV UTF-8, tối đa 5 MB), NFR3 (nhập file trong một giao dịch), BR4 (mỗi cặp nghi trùng chỉ quyết định một lần).
- **Truy cập:** QT-14 (nhân viên chỉ thấy dữ liệu của đơn vị mình), QT-15 (che SĐT với nhân viên), NFR2 (đăng nhập, phân quyền theo vai trò), quản lý tài khoản (không xóa Quản lý dữ liệu cuối cùng).
- **Hành vi API:** mã trạng thái 400, 401, 403, 404, 409 đúng loại; dữ liệu sai không để lại bản ghi; không bao giờ trả 500 cho lỗi của người gọi.

**Chủ ý KHÔNG kiểm:**

- Giao diện React: chưa có test tự động (kiểm tay, ảnh ở `docs/`).
- Màn hình tra cứu khách hàng (UC6), sửa bản ghi lỗi (E8, UC4), báo cáo chất lượng (E10, UC7): chưa hiện thực, đã ghi ở `docs/thay-doi-thiet-ke.md` mục 9 và 23. API tra cứu theo SĐT (E9) vẫn được kiểm.
- Hiệu năng và tải: NFR1 đã đo bằng `npm run e2e` (3.000 dòng dưới 30 giây), không đưa vào Test Report; kiểm tải thuộc Chuyên đề tốt nghiệp 2.
- MySQL 8.0 thật: chỉ thử trên MariaDB 10.4.

## 2. Loại test và số lượng

- **Bộ tự động hiện có (`npm test`):** 109 test đơn vị (repository giả, không cần CSDL) + 5 test tích hợp (service và repository thật trên CSDL thử) + 3 test API (HTTP thật, đủ middleware, service, repository và CSDL) = **117 test**. Số này tăng khi thêm test hồi quy cho từng bug tìm được.
- **Test Report chọn 12 ca đại diện:** 6 đơn vị · 3 tích hợp · 3 API, theo hình kim tự tháp (đáy rộng là test đơn vị, đỉnh hẹp là test API).
- **Đủ năm loại của đề:** luồng đúng ×4 · giá trị biên ×2 · dữ liệu sai ×2 · bảo mật hoặc chất lượng dữ liệu ×3 · tái lập ×1.
- **Kỹ thuật chọn dữ liệu:** phân vùng tương đương (SĐT hợp lệ, sai độ dài, sai ký tự, sai đầu số; vai trò nhân viên hoặc quản lý; đơn vị CH01 hoặc CH02) và giá trị biên (file 5 MB và 5 MB + 1 byte; ngoài ra các test đơn vị có sẵn thử token 3599 và 3601 giây, mật khẩu 7, 8, 72, 73 ký tự, SĐT 8 và 9 chữ số trong log).

## 3. Tiêu chí thành công (đặt trước khi chạy)

- 12 trên 12 test case có kết quả thực tế ghi lại bằng giá trị cụ thể (mã trạng thái, thông báo, số dòng trước và sau) và có ảnh chụp trong `docs/screenshots/`.
- Mỗi quy tắc đã hiện thực ở mục 1 có ít nhất một test tự động; bảng truy vết nằm ở `docs/test-report.md`.
- Không còn bug Critical đang mở; bug Major còn lại có lý do và hướng xử lý.
- Mỗi bug tìm được có commit sửa riêng, kèm test hồi quy.
- Sau khi sửa bug, `npm test` PASS bằng một lệnh, 0 test lỗi.

## 4. Môi trường và dữ liệu thử

- **Máy chạy:** Windows 11, Node.js 24, MariaDB 10.4.32 (XAMPP) chạy cục bộ. Gói Docker (`Dockerfile`, `docker-compose.yml`) được thêm ở Bài tập 3 (`docs/thay-doi-thiet-ke.md` mục 23); cách chạy test trong container sẽ ghi bổ sung khi gói đó chạy được.
- **CSDL thử:** `mekong_dq_test`, tách riêng với CSDL chạy thật `mekong_dq`, do `npm run db:setup` tạo. Hạ tầng test từ chối xóa dữ liệu nếu tên CSDL không kết thúc bằng `_test`.
- **Dữ liệu thử:** `seeds/001_demo.sql` gồm 3 tài khoản (`nv.lan` CH01, `nv.minh` CH02, `ql.hung` quản lý, mật khẩu `Demo@123`), 12 hồ sơ khách hàng, 2 lần nhập, 2 cặp nghi trùng chờ duyệt.
- **Dựng và dọn:** `resetDb()` xóa sạch 6 bảng rồi nạp lại seeds trước **mỗi** test tích hợp và test API; test đơn vị dùng repository giả nên không đụng CSDL.
- **Lệnh:** `npm test` chạy cả ba tầng (khoảng 8 giây); chạy riêng một ca: `node --test --test-name-pattern="^TC-DB1 " tests/integration/import.db.test.js`.
