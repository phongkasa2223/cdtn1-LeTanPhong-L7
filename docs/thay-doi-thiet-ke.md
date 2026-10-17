# Nhật ký thay đổi thiết kế

## Sau phản hồi Bài tập 1 (buổi 8, ngày 17/10/2026)

Điểm BT1: 9.5/10. Hai điểm cần khắc phục được ghi ở TD-01 và TD-02; TD-03 là góp ý về độ dài báo cáo; TD-04 phát sinh khi dựng môi trường.

### TD-01 Bổ sung ngưỡng số cho NFR5

- Phản hồi của GV : NFR5 chưa có ngưỡng số, ví dụ "thêm một đầu số mới trong dưới 5 phút, 0 dòng mã nguồn bị sửa".
- Quyết định  : SỬA
- Lý do       : Yêu cầu phi chức năng không có số đo thì không kiểm thử được. Danh mục đầu số đã được tách ra
                file cấu hình ngay từ thiết kế kiến trúc nên ngưỡng này đo được.
- Ảnh hưởng   : Sửa dòng NFR5 ở mục 4 của `docs/srs.md`. Hiện thực bằng file `config/phone_prefixes.json`
                (đúng tên trong `architecture.drawio`); `RecordValidator` đọc danh sách đầu số từ file này, mã nguồn không chứa đầu số.

### TD-02 Đưa tóm tắt đặc tả UC5 vào bài

- Phản hồi của GV : Đặc tả UC5 mới nằm trong file drawio, nên đưa tóm tắt vào bài.
- Quyết định  : SỬA
- Lý do       : UC5 gắn với BR4 (mỗi cặp nghi trùng chỉ được quyết định một lần), là quy tắc cần kiểm thử ở BT2;
                đặc tả phải đọc được ngay trong tài liệu SRS thay vì chỉ trong sơ đồ.
- Ảnh hưởng   : Mục "Đặc tả chi tiết UC5" đã có trong `docs/srs.md` (luồng ngoại lệ 7a tham chiếu BR4);
                rà lại cho khớp trang 2 của `docs/usecase.drawio`. File PDF BT1 đã chấm không nộp lại.

### TD-03 Giữ nguyên độ dài báo cáo BT1 (16 trang)

- Phản hồi của GV : Báo cáo 16 trang, có thể rút gọn phần ghi chú.
- Quyết định  : GIỮ NGUYÊN
- Lý do       : BT1 đã chấm và nộp, không nộp lại. Đề bài không đặt giới hạn trang; các ghi chú đối chiếu
                (bảng thuật ngữ, truy vết, ánh xạ wireframe–ERD) là bằng chứng cho tiêu chí Nhất quán.
                Góp ý này được áp dụng từ BT2: viết gọn phần ghi chú.
- Ảnh hưởng   : Không.

### TD-04 Chạy thử trên MariaDB 10.4 (XAMPP) thay vì MySQL 8.0

- Phản hồi của GV : Không có – phát sinh khi dựng môi trường.
- Quyết định  : SỬA (chỉ môi trường chạy thử; thiết kế giữ nguyên)
- Lý do       : Máy cá nhân đã có sẵn XAMPP với MariaDB 10.4.32. `docs/schema.sql` chỉ dùng InnoDB, utf8mb4 và một
                ràng buộc CHECK nên chạy được trên cả hai; driver `mysql2` dùng được với cả hai. Cài thêm MySQL 8.0
                chỉ để chạy thử không đem lại lợi ích trong phạm vi Sprint 1.
- Ảnh hưởng   : Không đổi `architecture.drawio` và `erd.drawio` (đích triển khai vẫn là MySQL 8.0). Ghi chú ở README mục 2 và mục 6.
                Hạn chế đã biết: chưa kiểm trên MySQL 8.0 thật.

### TD-05 DDL thêm `IF NOT EXISTS` để chạy lại được

- Phản hồi của GV : Không có – phát sinh từ yêu cầu phép thử "chạy lại được" của Buổi 8.
- Quyết định  : SỬA
- Lý do       : DDL của BT1 dùng `CREATE TABLE` trần, chạy lần hai sẽ báo "bảng đã tồn tại". Thêm `IF NOT EXISTS` cho cả 6 bảng;
                seed dùng khóa chính tường minh và `ON DUPLICATE KEY UPDATE` nên chạy lại không nhân đôi dòng.
- Ảnh hưởng   : `docs/schema.sql` và `migrations/001_init.sql` (hai file giống hệt nhau). Cấu trúc bảng, khóa, chỉ mục không đổi;
                chạy migrate + seed hai lần cho cùng số dòng (xem `docs/ket-qua-migrate-seed-test.png`).

### TD-06 Thêm endpoint CRUD khách hàng và dùng mã hiển thị làm định danh ở API

- Phản hồi của GV : Không có – phát sinh khi chọn entity đầu tiên cho Sprint 1.
- Quyết định  : SỬA
- Lý do       : `api-contract.md` BT1 chỉ có E9 (`GET /customers?phone=`). Slide Buổi 8 yêu cầu CRUD đủ ba lớp cho entity chính, và `customer`
                là entity trung tâm của L7. Định danh trong URL là mã hiển thị (`C000013`), khớp trường `customerId` trong hợp đồng API;
                khóa số `customer_id` chỉ dùng trong CSDL.
- Ảnh hưởng   : Thêm `GET /customers`, `GET/PUT/DELETE /customers/{customerId}`, `POST /customers` vào mục 3.5 của `docs/api-contract.md`.
                Mã lỗi mới: `DUPLICATE_PHONE` (409), `CUSTOMER_NOT_FOUND` (404), `CUSTOMER_MERGED` (409), `CUSTOMER_IN_USE` (409).
                QT-14 và QT-15 (cần biết người gọi) chưa hiện thực ở Sprint 1 vì xác thực JWT làm ở Sprint 2; ghi `[ ]` trong README mục 6.
                **Mâu thuẫn đã biết với BR5 (QT-13):** BR5 cấm xóa vật lý hồ sơ khách hàng, nhưng `DELETE /customers/{id}` xóa vật lý.
                Giảm nhẹ: khóa ngoại từ `stg_customer`, `duplicate_pair` và `merged_into_id` chặn xóa mọi hồ sơ đã phát sinh dữ liệu (trả 409 `CUSTOMER_IN_USE`),
                nên chỉ xóa được hồ sơ vừa tạo nhầm. Hướng xử lý ở Sprint 2: bỏ endpoint hoặc chỉ cho `DATA_MANAGER`, vì khi đó mới có phân quyền.
