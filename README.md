# Ứng dụng kiểm tra và hợp nhất hồ sơ khách hàng: nhân viên dữ liệu nhập file khách hàng, sửa bản ghi lỗi và duyệt gộp hồ sơ trùng

**Sinh viên:** Lê Tấn Phong – 2374802010384 – Track SE  
**Học phần:** Chuyên đề Tốt nghiệp 1, HK1 2026-2027  
**Luồng nghiệp vụ:** L7 – Chất lượng dữ liệu khách hàng (case study Mekong Mobile)

## 1. Mục tiêu
Dữ liệu khách hàng của Mekong Mobile nằm rải rác ở hệ thống bán lẻ và bảo hành, thường bị trùng hồ sơ,
thiếu trường bắt buộc và sai định dạng số điện thoại. Ứng dụng web + REST API này giúp **nhân viên dữ liệu**
nhập file khách hàng, được hệ thống tự đánh dấu bản ghi lỗi, sửa lỗi và duyệt gộp các hồ sơ nghi trùng;
**quản lý dữ liệu** xem báo cáo tỷ lệ lỗi theo từng lần nhập để theo dõi chất lượng dữ liệu.

## 2. Yêu cầu môi trường
- Node.js 20.12 trở lên (đã thử trên Node 24, xem `.nvmrc`) và npm
- MySQL 8.0 hoặc MariaDB 10.4 trở lên đang chạy (đang thử trên MariaDB 10.4.32 của XAMPP, xem `docs/thay-doi-thiet-ke.md` mục 4). Cần một tài khoản quản trị để tạo database, mặc định `root` không mật khẩu như XAMPP; đổi bằng `DB_ADMIN_USER` và `DB_ADMIN_PASSWORD` trong `.env`
- Trình duyệt hiện đại (Chrome, Edge hoặc Firefox)
- Biến môi trường: xem `.env.example` (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_POOL_MAX`, `DB_TZ_OFFSET`, `DB_ADMIN_USER`, `DB_ADMIN_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `LOG_LEVEL`; `E2E_BASE_URL` và `E2E_PASSWORD` chỉ dùng cho `npm run e2e`; `TEST_DB_NAME` tùy chọn, tên CSDL thử của `npm test`)

## 3. Hướng dẫn chạy
Mỗi bước một lệnh, chạy trong thư mục gốc của repo:

```bash
git clone https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7.git   # 0. lấy mã nguồn, rồi: cd cdtn1-LeTanPhong-L7
npm run env:init     # 1. tạo .env, mật khẩu DB và JWT_SECRET được sinh ngẫu nhiên
npm install          # 2. cài thư viện backend
npm run db:setup     # 3. tạo database mekong_dq, database thử mekong_dq_test (cho npm test) và tài khoản ứng dụng
npm run migrate      # 4. tạo 6 bảng theo DDL (chạy lại được)
npm run seed         # 5. nạp dữ liệu mẫu: 3 tài khoản, 12 hồ sơ (chạy lại không nhân đôi)
npm run gen:data     # 6. sinh file data/customers_raw.csv (3.000 dòng giả, có lỗi và trùng lặp)
npm run build        # 7. cài thư viện và build giao diện React
npm start            # 8. chạy ứng dụng tại http://localhost:3000
```

Đăng nhập thử (mật khẩu chung của tài khoản mẫu: `Demo@123`, chỉ dùng khi phát triển):

| Tài khoản | Vai trò | Làm được gì |
| :--- | :--- | :--- |
| `nv.lan` | Nhân viên dữ liệu, cửa hàng CH01 | Nhập file, xem lỗi, duyệt cặp nghi trùng của cửa hàng mình; SĐT bị che |
| `nv.minh` | Nhân viên dữ liệu, cửa hàng CH02 | Như trên, nhưng không thấy dữ liệu của CH01 (QT-14) |
| `ql.hung` | Quản lý dữ liệu | Xem dữ liệu toàn công ty với SĐT đầy đủ; không nhập file, không duyệt cặp |

Cách dùng: đăng nhập bằng `nv.lan`, vào **Nhập file**, chọn `data/customers_raw.csv`, bấm **Nhập file**; xem **Bản ghi lỗi** và **Cặp nghi trùng** (chọn Gộp hoặc Giữ riêng).

Chạy thử cả luồng bằng một lệnh (khi `npm start` đang chạy ở terminal khác):
```bash
npm run e2e          # đăng nhập, nhập file, xem lỗi, gộp một cặp, thử quyết định lần hai, tra SĐT của hồ sơ đã gộp
```

Thử đủ bốn thao tác tạo – xem – sửa – xóa của hai thực thể (hồ sơ khách hàng và tài khoản) bằng curl, khi `npm start` đang chạy (Windows dùng Git Bash hoặc Postman). Dữ liệu mẫu viết không dấu vì curl trên Windows đổi chữ có dấu trong tham số thành `?`; giao diện web và Postman gửi tiếng Việt có dấu bình thường:
```bash
field() { node -pe "JSON.parse(require('fs').readFileSync(0)).$1"; }
login() { curl -s -X POST localhost:3000/api/auth/login -H 'Content-Type: application/json' -d "{\"username\":\"$1\",\"password\":\"Demo@123\"}" | field accessToken; }
STAFF=$(login nv.lan); MANAGER=$(login ql.hung)
PHONE=$(node -pe '"091"+String(Math.floor(Math.random()*1e7)).padStart(7,"0")')   # SĐT giả ngẫu nhiên: SĐT của hồ sơ đã xóa vẫn bị giữ nên chạy lại khối này không bị trùng

# Hồ sơ khách hàng (Nhân viên dữ liệu). Xóa là xóa MỀM: hồ sơ vẫn nằm trong bảng (BR5).
CODE=$(curl -s -X POST localhost:3000/api/customers -H "Authorization: Bearer $STAFF" -H 'Content-Type: application/json' -d "{\"fullName\":\"Pham Thu\",\"phone\":\"$PHONE\"}" | field data.customerId)   # tạo -> 201
curl -s localhost:3000/api/customers/$CODE -H "Authorization: Bearer $STAFF"                                                                                                                         # xem
curl -s -X PUT localhost:3000/api/customers/$CODE -H "Authorization: Bearer $STAFF" -H 'Content-Type: application/json' -d "{\"fullName\":\"Pham Thu Sua\",\"phone\":\"$PHONE\",\"address\":\"12 Le Loi\"}"      # sửa
curl -s -i -X DELETE localhost:3000/api/customers/$CODE -H "Authorization: Bearer $STAFF"                                                                                                            # xóa mềm -> 204

# Tài khoản (Quản lý dữ liệu). Tài khoản đã có lần nhập thì khóa ngoại chặn xóa (409 USER_HAS_HISTORY).
ID=$(curl -s -X POST localhost:3000/api/users -H "Authorization: Bearer $MANAGER" -H 'Content-Type: application/json' -d '{"username":"nv.thu","password":"MatKhau123","fullName":"Chi Thu","role":"DATA_STAFF","storeCode":"CH03"}' | field data.userId)   # tạo -> 201
curl -s localhost:3000/api/users/$ID -H "Authorization: Bearer $MANAGER"                                                                                                                              # xem
curl -s -X PUT localhost:3000/api/users/$ID -H "Authorization: Bearer $MANAGER" -H 'Content-Type: application/json' -d '{"fullName":"Chi Thu Ha","role":"DATA_STAFF","storeCode":"CH02"}'                  # sửa
curl -s -i -X DELETE localhost:3000/api/users/$ID -H "Authorization: Bearer $MANAGER"                                                                                                                 # xóa -> 204
```
Dữ liệu sai bị từ chối kèm mã lỗi rõ ràng (ví dụ SĐT 8 số: `400 VALIDATION_ERROR`; tên đăng nhập trùng: `409 USERNAME_TAKEN`; file không phải UTF-8: `400 INVALID_ENCODING`). Tắt CSDL thì API trả `503 SERVICE_UNAVAILABLE` và giao diện báo "Hệ thống chưa kết nối được cơ sở dữ liệu" kèm nút Thử lại.

Chạy giao diện ở chế độ phát triển (tự nạp lại khi sửa mã): `npm run dev --prefix frontend`, mở http://localhost:5173 (tự chuyển `/api` về cổng 3000).

Ảnh kết quả chạy toàn luồng trong `docs/`: `ket-qua-mh1-nhap-file.png`, `ket-qua-mh2-ban-ghi-loi.png`, `ket-qua-mh3-duyet-cap.png`, `ket-qua-trang-thai-loi.png` (tắt backend), `ket-qua-trang-thai-rong.png`, `ket-qua-e2e.png`. Các ảnh MH1, MH2, MH3 và hai ảnh trạng thái chụp từ giao diện thật bằng trình duyệt; ảnh e2e là output terminal thật đã ghi lại rồi vẽ thành ảnh.

## 4. Cấu trúc thư mục
| Thư mục | Nội dung |
| :--- | :--- |
| `docs/` | Tài liệu BT1: `srs.md`, `usecase.drawio`, `architecture.drawio`, `erd.drawio`, `schema.sql`, `wireframe.drawio`, `wireframe.png`, `api-contract.md`; nhật ký `thay-doi-thiet-ke.md`; BT2: `bug-log.md`, `architecture-thuc-te.md`, `ai-disclosure.md`; ảnh kết quả chạy |
| `src/routes/` | Lớp API (Express Controller trong sơ đồ kiến trúc): chỉ nhận HTTP và đổi mã nghiệp vụ sang mã HTTP |
| `src/services/` | Lớp nghiệp vụ: Service, `RecordValidator`, các file `*.contract.js` (hợp đồng dữ liệu trả ra); toàn bộ quy tắc BR/QT, không biết HTTP hay SQL |
| `src/repositories/` | Lớp truy cập dữ liệu: mỗi bảng một Repository, `unit-of-work.js` gom các thao tác ghi vào một giao dịch (NFR3) |
| `src/middleware/`, `src/errors/` | Đăng nhập, phân quyền; lớp lỗi nghiệp vụ `AppError` |
| `frontend/` | Giao diện React: `src/api/client.js` (nơi duy nhất gọi `fetch`), `src/api/*.api.js`, `src/components/DataState.jsx` (đang tải, rỗng, lỗi), `src/pages/` (đăng nhập và 3 màn hình MH1–MH3) |
| `config/` | `phone_prefixes.json` – danh mục đầu số di động (NFR5) |
| `migrations/`, `seeds/`, `scripts/` | DDL chạy lại được, dữ liệu mẫu, script (`db-setup`, `run-sql`, `gen-sample-csv`, `e2e`...) |
| `tests/` | Kiểm thử tự động (`node --test`): test đơn vị ở `tests/`, test tích hợp ở `tests/integration/`, test API ở `tests/api/`; `tests/helpers/` có repository giả (test đơn vị) và hạ tầng CSDL thử (`db.js`, `api.js`, `csv.js`) |

Ánh xạ sơ đồ kiến trúc → thư mục: ImportController → `import.routes.js` (E2, E7, và E3 liệt kê bản ghi lỗi); DuplicatePairController → `duplicate-pair.routes.js`; Customer Controller → `customer.routes.js`; Xác thực → `auth.routes.js` và `middleware/auth.js`; ImportService, DuplicateService, RecordValidator → `src/services/`; ImportBatch, StgCustomer, DqResult, Customer, DuplicatePair, AppUser Repository → `src/repositories/`. Chưa làm: RecordController (sửa bản ghi lỗi, E8), Report Controller và ReportService (báo cáo, E10): `record.routes.js`, `report.routes.js`, `report.service.js` còn là khung rỗng. Bài tập 2 thêm quản lý tài khoản (`user.routes.js`, `user.service.js`), `src/db.js` (bọc pool, lỗi mất kết nối thành 503) và xóa mềm hồ sơ khách hàng; kiến trúc thực tế, ranh giới lớp và các lệnh kiểm nằm ở `docs/architecture-thuc-te.md`.

## 5. Kiểm thử
```bash
npm test      # node --test, 117 test: 109 đơn vị (repository giả), 5 tích hợp và 3 API chạy trên CSDL thử mekong_dq_test
npm run e2e   # chạy thử luồng chính qua API thật (cần npm start đang chạy)
```
`npm test` cần MariaDB/MySQL đang chạy và đã `npm run db:setup` (không cần `npm start`). Trước MỖI test tích hợp và API, CSDL thử được xóa sạch rồi nạp lại `seeds/001_demo.sql`; hạ tầng từ chối xóa nếu tên CSDL không kết thúc bằng `_test`, nên CSDL chạy thật `mekong_dq` không bị đụng tới. Chạy riêng một test case: `node --test --test-name-pattern="^TC-DB1 " tests/integration/import.db.test.js`.
Ba loại test (mã `TC-xx` ghi ngay trong tên test):
- **Luồng đúng:** tạo hồ sơ (TC-S1), nhập file hợp lệ (TC-I1), xóa mềm hồ sơ (TC-S7), tạo tài khoản (TC-U1), đăng nhập (TC-A1).
- **Giá trị biên:** token còn hạn ở giây 3599 và hết hạn ở giây 3601 (TC-A4); tên đăng nhập 2 và 3 ký tự, mật khẩu 7, 8, 72 và 73 ký tự (TC-U5); che dãy 8 và 9 chữ số trong log (TC-L2).
- **Dữ liệu sai:** SĐT sai độ dài (TC-S9), file CSV lưu ANSI (TC-I13), tên đăng nhập trùng (TC-U8), từng dòng lỗi của file nhập (TC-I2).

Các test chính: lỗi giữa chừng khi nhập file thì 0 bản ghi được lưu (NFR3), hai nhân viên cùng duyệt một cặp thì người sau bị từ chối (BR4), hoán đổi SĐT khi gộp, phân quyền và che SĐT (QT-14, QT-15), hạn token, chuẩn hóa SĐT theo file cấu hình (QT-02, NFR5).

## 6. Trạng thái hiện tại
- [x] Khởi tạo repo, cấu trúc thư mục, `.gitignore`, `.env.example`, README khung (buổi 2)
- [x] Bản SRS rút gọn, Use Case Diagram, API contract, kiến trúc, ERD + DDL, wireframe – Bài tập 1 (buổi 3–6)
- [x] Sprint 1 (buổi 8): migration 6 bảng, seed chạy lại được, quản lý khách hàng qua 3 lớp, QT-01, QT-02, QT-13
- [x] Sprint 2 (buổi 10), backend: đăng nhập JWT và phân quyền (E1, NFR2), QT-14 (phạm vi theo cửa hàng), QT-15 (che SĐT), nhập file CSV trong một giao dịch (E2, NFR3), danh sách lần nhập (E7), bản ghi lỗi (E3), duyệt cặp nghi trùng (E4, E5, E6, BR4)
- [x] Sprint 2, frontend: đăng nhập, MH1 nhập file, MH2 bản ghi lỗi, MH3 duyệt cặp; mọi màn hình bọc bằng `DataState`; nhận 401 thì xóa phiên và về trang đăng nhập
- [x] Luồng chính chạy end-to-end (`npm run e2e`): nhập 3.000 dòng trong khoảng 0,2–0,3 giây (NFR1 yêu cầu dưới 30 giây); 107 test PASS
- [x] Bài tập 2 (buổi 11–12): hồ sơ khách hàng và tài khoản đều đủ tạo – xem – sửa – xóa (hồ sơ xóa mềm, BR5); mất kết nối CSDL trả `503` với thông báo rõ; log không ghi SĐT; từ chối file không phải UTF-8; `docs/bug-log.md` (7 lỗi, kèm link commit), `docs/architecture-thuc-te.md`, `docs/ai-disclosure.md`; tag `v0.2`
- [ ] Sửa bản ghi lỗi (UC4, E8), tra cứu khách hàng trên giao diện (UC6; API E9 đã có), báo cáo chất lượng (UC7, E10): cắt khỏi Sprint 2, ghi ở `docs/thay-doi-thiet-ke.md`
- [ ] Dữ liệu chạy thử là dữ liệu giả sinh bằng `npm run gen:data` (thầy cho phép), chưa có `customers_raw.csv` thật của Mekong Mobile
- [ ] Hạn chế đã biết (chi tiết ở `docs/thay-doi-thiet-ke.md` mục 22): đổi đơn vị của nhân viên đã có lần nhập sẽ chuyển luôn các lần nhập cũ sang đơn vị mới; hồ sơ khách hàng chưa gắn với đơn vị; token lưu trong `sessionStorage`, giao diện chưa có test tự động, chưa kiểm trên MySQL 8.0 thật (đang dùng MariaDB 10.4)
