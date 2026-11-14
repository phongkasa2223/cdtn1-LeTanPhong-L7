# Checklist bảo mật bảy mục

**Sinh viên:** Lê Tấn Phong – 2374802010384 – Track SE · **Luồng:** L7 – Chất lượng dữ liệu khách hàng (Mekong Mobile)  
**Hệ thống kiểm:** bản chạy bằng Docker Compose dựng từ bản clone sạch của repo, ngày 14/11/2026 (hướng dẫn dựng: [`deployment-guide.md`](deployment-guide.md)). Mọi minh chứng dưới đây là kết quả của lệnh đã chạy thật trên hệ thống đó; ghi lại lệnh để người chấm chạy lại được.

Trạng thái dùng ba giá trị: **ĐÃ LÀM**, **CHƯA LÀM**, **KHÔNG ÁP DỤNG**. Mục ĐÃ LÀM luôn có một dòng minh chứng; phần giới hạn (nếu có) ghi ngay bên dưới bảng, không giấu.

| # | Mục (nhóm OWASP) | Trạng thái | Minh chứng (lệnh đã chạy và kết quả) |
| :---: | :--- | :---: | :--- |
| 1 | Không có secret nào trong repo (A02) | **ĐÃ LÀM** | `git log --all --oneline -- .env` không in dòng nào (0 commit đụng tới `.env`); `.env` nằm trong `.gitignore`; giá trị `DB_PASSWORD` (24 ký tự) và `JWT_SECRET` (48 ký tự) của `.env` thật được dò bằng `git log --all -S"<giá trị>"` cho kết quả 0 commit; `.env.example` chỉ chứa giá trị mẫu công khai và ghi rõ phải đổi. |
| 2 | Dữ liệu vào được kiểm ở tầng ứng dụng (A05) | **ĐÃ LÀM** | Gửi `' OR '1'='1` vào đăng nhập, tham số `phone` và mã hồ sơ cho `401 INVALID_CREDENTIALS`, `400 VALIDATION_ERROR`, `404 CUSTOMER_NOT_FOUND` (không lộ dữ liệu); gửi tên `Robert'); DROP TABLE customer;--` được lưu nguyên như một chuỗi chữ (chỉ chuẩn hóa viết hoa) và bảng `customer` vẫn đọc được (200); mọi giá trị người dùng đi qua tham số `?` của truy vấn; test TC-API3 (`tests/api/invalid-input.api.test.js`) kiểm dữ liệu sai bị từ chối. |
| 3 | Kiểm soát truy cập theo chủ sở hữu (A01) | **ĐÃ LÀM** (phạm vi: lần nhập và cặp nghi trùng theo cửa hàng; hồ sơ khách hàng là dữ liệu chung, xem giới hạn 1) | Test TC-11 (`TC-API2`, `tests/api/security.api.test.js`) PASS: nhân viên cửa hàng CH02 mở lần nhập hoặc cặp của CH01 nhận `404`, không đoán được dữ liệu; chạy tay `GET /api/imports/I002/errors` bằng `nv.lan` (CH01) → `404 IMPORT_NOT_FOUND`, bằng `ql.hung` (quản lý) → `200`; quản lý duyệt cặp → `403 FORBIDDEN`. |
| 4 | Mật khẩu và dữ liệu nhạy cảm được băm hoặc mã hóa (A04, A07) | **ĐÃ LÀM** | `SELECT username, LEFT(password_hash,40), LENGTH(password_hash) FROM app_user` trên MariaDB trong container cho `scrypt$6d656b6f6e672d64656d6f2d73616c742…`, dài 106 ký tự, không có mật khẩu rõ; tài khoản tạo qua API dùng salt ngẫu nhiên (`crypto.randomBytes` ở `src/services/auth.service.js`); `GET /api/users` không có chữ `hash` hay `scrypt` trong phản hồi. |
| 5 | Thông báo lỗi không lộ cấu trúc hệ thống (A10, A02) | **ĐÃ LÀM** | JSON hỏng → `400 INVALID_JSON` với thông báo chung; tắt CSDL bằng `docker compose stop db` thì đăng nhập trả `503 SERVICE_UNAVAILABLE` chỉ có thông báo chung và `requestId` (không có tên bảng, chuỗi kết nối hay stack trace), `/health` trả `{"status":"degraded","db":"unreachable"}`; bật lại CSDL thì cả hai dịch vụ trở lại `healthy`. |
| 6 | Log không chứa secret và dữ liệu cá nhân (A09) | **ĐÃ LÀM** | Sau 77 request gồm đăng nhập (mật khẩu trong body), tra cứu theo SĐT và gửi token, `docker compose logs app \| grep -ciE "password\|token\|0[0-9]{9}"` in `0`; mỗi dòng log chỉ có thời gian, mức, `requestId`, method, path (không có query), status và thời gian xử lý; test TC-L* kiểm log che dãy số điện thoại. |
| 7 | Thư viện ghim phiên bản và đã kiểm lỗ hổng (A03) | **ĐÃ LÀM** | `package.json` của backend và frontend chỉ ghim đúng một phiên bản (không có `^`, `~`) và có `package-lock.json`; `npm audit --omit=dev` cho `found 0 vulnerabilities` ở backend (chạy trong container) và ở frontend. |

## Giới hạn và điểm chưa hoàn hảo (nêu thẳng)

1. **Mục 3, hồ sơ khách hàng chưa có chủ sở hữu theo cửa hàng.** Theo SRS, hồ sơ khách hàng là dữ liệu dùng chung toàn công ty, nên mọi `DATA_STAFF` đều sửa và xóa mềm được mọi hồ sơ (`PUT` và `DELETE /api/customers/{id}`); chỉ SĐT bị che theo vai trò. Quyền theo chủ sở hữu hiện chỉ áp cho lần nhập và cặp nghi trùng. Ghi ở `thay-doi-thiet-ke.md` mục 22 (điểm 2); muốn kiểm soát theo chủ sở hữu cho hồ sơ phải thêm cột đơn vị vào `customer` và đổi ERD, chưa làm trong Bài tập 3.
2. **Mục 1, giá trị mẫu công khai.** `.env.example` có `DB_PASSWORD` và `JWT_SECRET` mẫu để dựng được bằng hai lệnh; vì công khai nên không được dùng cho dữ liệu thật. Chạy ngoài Docker thì `npm run env:init` thay hai giá trị bằng chuỗi ngẫu nhiên. Trong mã còn hằng số chỉ dùng cho test (`tests/helpers/db.js`, `tests/auth.service.test.js`) và mật khẩu mẫu `Demo@123` của tài khoản demo (ghi ở README, seed và tài liệu).
3. **Mục 4, tài khoản mẫu dùng chung một mã băm.** Ba tài khoản trong `seeds/001_demo.sql` có cùng mật khẩu mẫu nên cùng một salt cố định và cùng một chuỗi băm; chỉ để trình diễn, không dùng ngoài môi trường thử. Tài khoản tạo mới có salt riêng.
4. **Mục 7, ảnh nền chưa ghim digest.** Dockerfile dùng `node:24-alpine` và compose dùng `mariadb:10.11` (theo nhãn, không theo digest), và `npm audit --omit=dev` không quét các thư viện phát triển (ví dụ Vite lúc build).
5. **Bộ đếm khóa đăng nhập** (BUG-009) nằm trong bộ nhớ của tiến trình: khởi động lại thì xóa, chạy nhiều bản app cần kho chung.

## Cách chạy lại minh chứng

```bash
git log --all --oneline -- .env                                            # mục 1: không in gì
docker compose exec -T db sh -c 'mariadb -umekong -p"$MARIADB_PASSWORD" mekong_dq -e "SELECT username, LEFT(password_hash,40) FROM app_user"'   # mục 4
docker compose logs app | grep -ciE "password|token|0[0-9]{9}"             # mục 6: 0
docker compose exec app npm audit --omit=dev                               # mục 7: found 0 vulnerabilities
docker compose exec app npm test                                           # mục 2, 3: gồm TC-API2 và TC-API3, kỳ vọng pass 125
```
