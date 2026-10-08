# API contract – Luồng L7 (Track SE)

**Sinh viên:** Lê Tấn Phong – 2374802010384 – Track SE  
**Luồng nghiệp vụ:** L7 – Chất lượng dữ liệu khách hàng (case study Mekong Mobile)  
**Tài liệu liên quan:** [`docs/srs.md`](srs.md) · [`docs/usecase.drawio`](usecase.drawio)

API theo kiểu REST, trao đổi dữ liệu JSON (riêng chức năng nhập file dùng `multipart/form-data`). Mọi endpoint trừ đăng nhập và health check yêu cầu header `Authorization: Bearer <token>` (NFR2). Thời gian theo múi giờ Việt Nam (+07:00). Dữ liệu trong ví dụ là dữ liệu minh họa theo cấu trúc file khách hàng của case study.

---

## 1. Danh sách endpoint

| Mã | Phương thức | Đường dẫn | Mục đích | Truy vết |
| :---: | :---: | :--- | :--- | :--- |
| E1 | POST | `/api/auth/login` | Đăng nhập, nhận token | NFR2 (điều kiện trước của mọi US) |
| E2 | POST | `/api/imports` | Nhập file CSV khách hàng | US1 – UC1 – FR1, FR2 |
| E3 | GET | `/api/imports/{importId}/errors` | Danh sách bản ghi lỗi của một lần nhập | US3 – UC3 – FR4 |
| E4 | GET | `/api/duplicate-pairs` | Danh sách cặp nghi trùng | US5 – UC5 – FR6 |
| E5 | GET | `/api/duplicate-pairs/{pairId}` | Chi tiết một cặp nghi trùng | US5 – UC5 – FR6 |
| E6 | POST | `/api/duplicate-pairs/{pairId}/decision` | Gửi quyết định Gộp / Giữ riêng | US5 – UC5 – FR6 |
| E7 | GET | `/api/imports` | Danh sách lần nhập | US2 – UC2 – FR3 |
| E8 | PUT | `/api/records/{recordId}` | Sửa một bản ghi lỗi | US4 – UC4 – FR5 |
| E9 | GET | `/api/customers?phone=` | Tra cứu khách hàng theo SĐT | US6 – UC6 – FR7 |
| E10 | GET | `/api/reports/imports` | Báo cáo chất lượng theo lần nhập | US7 – UC7 – FR8 |
| E11 | GET | `/health` | Kiểm tra tình trạng hệ thống | Smoke test (Buổi 2) |

*E1–E6 phục vụ 3 story MUST (US1, US3, US5) và được đặc tả chi tiết ở mục 3; E7–E11 phục vụ story SHOULD và sẽ đặc tả chi tiết khi hiện thực ở BT2.*

## 2. Quy ước chung

| Mã HTTP | Ý nghĩa trong hệ thống |
| :--- | :--- |
| 200 OK | Đọc dữ liệu hoặc thực hiện thao tác thành công. |
| 201 Created | Tạo mới thành công (lần nhập). |
| 400 Bad Request | Dữ liệu gửi lên sai: thiếu trường, sai kiểu, sai giá trị cho phép. |
| 401 Unauthorized | Chưa đăng nhập, token hết hạn hoặc sai tên đăng nhập/mật khẩu. |
| 403 Forbidden | Đã đăng nhập nhưng vai trò không được phép (ví dụ Nhân viên dữ liệu gọi báo cáo). |
| 404 Not Found | Không tìm thấy lần nhập, bản ghi hoặc cặp nghi trùng theo mã. |
| 409 Conflict | Xung đột trạng thái (ví dụ cặp nghi trùng đã được xử lý). |
| 500 Internal Server Error | Lỗi phía máy chủ; giao dịch được hủy toàn bộ (NFR3). |

Mọi phản hồi lỗi có cùng cấu trúc:

```json
{
  "error": {
    "code": "MISSING_COLUMNS",
    "message": "File thiếu cột bắt buộc",
    "details": ["so_dien_thoai"]
  }
}
```

Vai trò người dùng: `DATA_STAFF` (Nhân viên dữ liệu), `DATA_MANAGER` (Quản lý dữ liệu).

## 3. Đặc tả chi tiết endpoint

### E1. `POST /api/auth/login` – Đăng nhập
Truy vết: NFR2. Trả về token dùng cho các endpoint khác.

**Request mẫu:**
```http
POST /api/auth/login
Content-Type: application/json

{ "username": "nv.lan", "password": "MatKhau@2026" }
```

**Response thành công – 200 OK:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": { "username": "nv.lan", "fullName": "Trần Thị Lan", "role": "DATA_STAFF" }
}
```

| Mã | Khi nào | error.code |
| :---: | :--- | :--- |
| 200 | Đăng nhập thành công | — |
| 400 | Thiếu username/password hoặc sai độ dài | `VALIDATION_ERROR` |
| 401 | Sai tên đăng nhập hoặc mật khẩu | `INVALID_CREDENTIALS` |

### E2. `POST /api/imports` – Nhập file khách hàng
Truy vết: US1 – UC1 – FR1, FR2. Lưu toàn bộ file trong một giao dịch; mỗi dòng được chuẩn hóa và kiểm tra. Lỗi của từng dòng **không** làm request thất bại mà được ghi thành mã lỗi của bản ghi.

**Request mẫu:**
```http
POST /api/imports
Authorization: Bearer <token>
Content-Type: multipart/form-data

source = RETAIL
file   = khach_hang_ban_le_2026-09-28.csv   (1.000 dòng)
```

**Response thành công – 201 Created:**
```json
{
  "importId": "I001",
  "source": "RETAIL",
  "fileName": "khach_hang_ban_le_2026-09-28.csv",
  "totalRecords": 1000,
  "validRecords": 955,
  "errorRecords": 45,
  "errorsByCode": { "MISSING_FIELD": 12, "PHONE_LENGTH": 20, "PHONE_PREFIX": 9,
                    "PHONE_CHAR": 3, "EMAIL_INVALID": 0, "DATE_INVALID": 1 },
  "newDuplicatePairs": 25,
  "importedBy": "nv.lan",
  "importedAt": "2026-10-05T09:15:00+07:00"
}
```

| Mã | Khi nào | error.code |
| :---: | :--- | :--- |
| 201 | Nhập thành công | — |
| 400 | File không phải CSV (UC1-3a) | `INVALID_FILE_TYPE` |
| 400 | File lớn hơn 5 MB (UC1-3a) | `FILE_TOO_LARGE` |
| 400 | File thiếu cột bắt buộc (UC1-3b, US1-AC2) | `MISSING_COLUMNS` |
| 400 | File không có dòng dữ liệu (UC1-4a) | `EMPTY_FILE` |
| 400 | `source` không phải RETAIL/WARRANTY | `INVALID_SOURCE` |
| 401 | Chưa đăng nhập | `UNAUTHORIZED` |
| 403 | Vai trò không phải DATA_STAFF | `FORBIDDEN` |
| 500 | Lỗi khi lưu, đã hủy giao dịch (UC1-6a) | `IMPORT_FAILED` |

### E3. `GET /api/imports/{importId}/errors` – Danh sách bản ghi lỗi
Truy vết: US3 – UC3 – FR4. Lọc theo mã lỗi, phân trang. Lần nhập không có lỗi trả 200 với danh sách rỗng (US3-AC2).

**Request mẫu:**
```http
GET /api/imports/I001/errors?code=PHONE_LENGTH&page=1&size=50
Authorization: Bearer <token>
```

**Response thành công – 200 OK:**
```json
{
  "importId": "I001",
  "code": "PHONE_LENGTH",
  "page": 1, "size": 50, "total": 20,
  "items": [
    {
      "recordId": 1532,
      "rowNumber": 12,
      "original":   { "ho_ten": "trần  thị bích", "so_dien_thoai": "09012345",
                      "email": "bich.tran@gmail.com", "ngay_tao": "2024-03-15" },
      "normalized": { "fullName": "Trần Thị Bích", "phone": "09012345" },
      "errors": [ { "code": "PHONE_LENGTH", "field": "phone",
                    "message": "Số điện thoại phải có đúng 10 chữ số" } ]
    }
  ]
}
```

| Mã | Khi nào | error.code |
| :---: | :--- | :--- |
| 200 | Thành công (kể cả khi không có bản ghi lỗi) | — |
| 400 | `code` không thuộc 6 mã lỗi; `page`/`size` ngoài giới hạn | `INVALID_ERROR_CODE` / `INVALID_PAGE` |
| 401 | Chưa đăng nhập | `UNAUTHORIZED` |
| 404 | Không có lần nhập với `importId` (US3-AC3) | `IMPORT_NOT_FOUND` |

### E4. `GET /api/duplicate-pairs` – Danh sách cặp nghi trùng
Truy vết: US5 – UC5 (bước 1–2) – FR6. Mặc định lấy các cặp đang chờ duyệt, sắp xếp theo điểm tương đồng giảm dần.

**Request mẫu:**
```http
GET /api/duplicate-pairs?status=PENDING&page=1&size=20
Authorization: Bearer <token>
```

**Response thành công – 200 OK:**
```json
{
  "page": 1, "size": 20, "total": 25,
  "items": [
    {
      "pairId": "P0007",
      "matchedBy": "PHONE",
      "similarity": 0.93,
      "status": "PENDING",
      "customerA": { "customerId": "C000123", "fullName": "Nguyễn Văn An",
                     "phone": "0901234567", "source": "RETAIL" },
      "customerB": { "customerId": "C000987", "fullName": "Nguyễn Văn Ân",
                     "phone": "0901234567", "source": "WARRANTY" }
    }
  ]
}
```

| Mã | Khi nào | error.code |
| :---: | :--- | :--- |
| 200 | Thành công (danh sách rỗng khi không có cặp chờ duyệt – UC5-2a) | — |
| 400 | `status` không thuộc PENDING/MERGED/KEEP_SEPARATE | `INVALID_STATUS` |
| 401 | Chưa đăng nhập | `UNAUTHORIZED` |

### E5. `GET /api/duplicate-pairs/{pairId}` – Chi tiết cặp nghi trùng
Truy vết: US5 – UC5 (bước 3–4) – FR6. Trả về đầy đủ hai hồ sơ và danh sách trường có giá trị khác nhau.

**Request mẫu:**
```http
GET /api/duplicate-pairs/P0007
Authorization: Bearer <token>
```

**Response thành công – 200 OK:**
```json
{
  "pairId": "P0007",
  "matchedBy": "PHONE",
  "similarity": 0.93,
  "status": "PENDING",
  "customerA": { "customerId": "C000123", "fullName": "Nguyễn Văn An",
                 "phone": "0901234567", "email": null,
                 "address": "12 Lê Lợi, Q.1, TP.HCM", "birthDate": "1990-05-12",
                 "source": "RETAIL" },
  "customerB": { "customerId": "C000987", "fullName": "Nguyễn Văn Ân",
                 "phone": "0901234567", "email": "an.nguyen@gmail.com",
                 "address": "45 Nguyễn Huệ, Q.1, TP.HCM", "birthDate": "1990-05-12",
                 "source": "WARRANTY" },
  "differentFields": ["fullName", "address"]
}
```

| Mã | Khi nào | error.code |
| :---: | :--- | :--- |
| 200 | Thành công | — |
| 401 | Chưa đăng nhập | `UNAUTHORIZED` |
| 404 | Không có cặp với `pairId` | `PAIR_NOT_FOUND` |

### E6. `POST /api/duplicate-pairs/{pairId}/decision` – Gộp hoặc giữ riêng
Truy vết: US5 – UC5 (bước 5–7) – FR6, BR4, BR5. Với Gộp, `fieldChoices` chỉ định hồ sơ lấy giá trị cho từng trường khác nhau (UC5-5a); trường còn trống của hồ sơ giữ lại được bổ sung tự động (US5-AC1). Với Giữ riêng gửi `{ "action": "KEEP_SEPARATE" }`.

**Request mẫu:**
```http
POST /api/duplicate-pairs/P0007/decision
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "MERGE",
  "keepCustomerId": "C000123",
  "fieldChoices": { "fullName": "C000123", "address": "C000987" }
}
```

**Response thành công – 200 OK:**
```json
{
  "pairId": "P0007",
  "status": "MERGED",
  "survivingCustomerId": "C000123",
  "mergedCustomerId": "C000987",
  "result": { "fullName": "Nguyễn Văn An", "phone": "0901234567",
              "email": "an.nguyen@gmail.com", "address": "45 Nguyễn Huệ, Q.1, TP.HCM" },
  "decidedBy": "nv.lan",
  "decidedAt": "2026-10-05T10:02:41+07:00"
}
```

| Mã | Khi nào | error.code |
| :---: | :--- | :--- |
| 200 | Ghi nhận quyết định thành công | — |
| 400 | `action` không phải MERGE/KEEP_SEPARATE | `INVALID_ACTION` |
| 400 | MERGE nhưng thiếu `keepCustomerId` hoặc mã không thuộc cặp | `KEEP_ID_REQUIRED` / `KEEP_ID_NOT_IN_PAIR` |
| 400 | MERGE nhưng chưa chọn giá trị cho trường khác nhau (UC5-5a) | `FIELD_CHOICE_REQUIRED` |
| 401 | Chưa đăng nhập | `UNAUTHORIZED` |
| 403 | Vai trò không phải DATA_STAFF | `FORBIDDEN` |
| 404 | Không có cặp với `pairId` | `PAIR_NOT_FOUND` |
| 409 | Cặp đã được xử lý trước đó (UC5-7a, US5-AC3, BR5) | `PAIR_ALREADY_DECIDED` |

## 4. Quy tắc validation từng trường

| Trường | Dùng ở | Bắt buộc | Kiểu | Độ dài / dải giá trị | Khi vi phạm |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `file` | E2 | Có | File CSV UTF-8 | ≤ 5 MB; có đủ 6 cột của BR7; ≥ 1 dòng dữ liệu | 400 `INVALID_FILE_TYPE` / `FILE_TOO_LARGE` / `MISSING_COLUMNS` / `EMPTY_FILE` |
| `source` | E2 | Có | Chuỗi (enum) | `RETAIL` hoặc `WARRANTY` | 400 `INVALID_SOURCE` |
| `ho_ten` | Dòng CSV, E8 | Có | Chuỗi | 2–100 ký tự sau chuẩn hóa | Mã `MISSING_FIELD` gắn vào bản ghi |
| `so_dien_thoai` | Dòng CSV, E8, E9 | Có | Chuỗi | 10 chữ số sau chuẩn hóa, bắt đầu bằng 0, đầu số thuộc danh mục (BR2) | Mã `MISSING_FIELD` / `PHONE_LENGTH` / `PHONE_PREFIX` / `PHONE_CHAR` |
| `email` | Dòng CSV, E8 | Không | Chuỗi email | ≤ 100 ký tự, dạng `ten@mien.tld` | Mã `EMAIL_INVALID` |
| `dia_chi` | Dòng CSV, E8 | Không | Chuỗi | ≤ 255 ký tự | Phần vượt quá không được nhận: 400 `VALIDATION_ERROR` (E8) |
| `ngay_sinh` | Dòng CSV, E8 | Không | Ngày | `yyyy-mm-dd` hoặc `dd/mm/yyyy`, không sau ngày nhập | Mã `DATE_INVALID` |
| `ngay_tao` | Dòng CSV, E8 | Có | Ngày | `yyyy-mm-dd` hoặc `dd/mm/yyyy`, không sau ngày nhập | Mã `MISSING_FIELD` / `DATE_INVALID` |
| `code` | E3 (query) | Không | Chuỗi (enum) | Một trong 6 mã lỗi ở mục 1.5 của SRS | 400 `INVALID_ERROR_CODE` |
| `page`, `size` | E3, E4 (query) | Không | Số nguyên | `page` ≥ 1 (mặc định 1); `size` 1–100 (mặc định 50 ở E3, 20 ở E4) | 400 `INVALID_PAGE` |
| `status` | E4 (query) | Không | Chuỗi (enum) | `PENDING` (mặc định), `MERGED`, `KEEP_SEPARATE` | 400 `INVALID_STATUS` |
| `action` | E6 | Có | Chuỗi (enum) | `MERGE` hoặc `KEEP_SEPARATE` | 400 `INVALID_ACTION` |
| `keepCustomerId` | E6 | Có khi MERGE | Chuỗi | Là một trong hai mã hồ sơ của cặp | 400 `KEEP_ID_REQUIRED` / `KEEP_ID_NOT_IN_PAIR` |
| `fieldChoices` | E6 | Có khi MERGE và có trường khác nhau | Object | Mỗi trường trong `differentFields` → mã hồ sơ được chọn | 400 `FIELD_CHOICE_REQUIRED` |
| `username`, `password` | E1 | Có | Chuỗi | username 3–50 ký tự; password 8–72 ký tự | 400 `VALIDATION_ERROR` |

## 5. Tự kiểm
- Mỗi endpoint E1–E11 truy vết được về một User Story (hoặc NFR2 / smoke test) ở bảng mục 1.
- Cả 3 story MUST (US1, US3, US5) đều có endpoint được đặc tả chi tiết.
- Mọi mã lỗi dữ liệu dùng trong API trùng với bảng thuật ngữ mục 1.5 của [`srs.md`](srs.md).
