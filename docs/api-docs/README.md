# API documentation: Customer Data Quality service (flow L7, Mekong Mobile)

REST API of the application described in [`../../README.md`](../../README.md). It covers **every endpoint that exists in the running system (18 endpoints)**. Each endpoint has the seven items required by the assignment (method and path, business description, authentication, parameters and request body, success response, error-code table, notes and limits) and at least one **real** request and response.

Real examples were not written by hand: they were recorded from a running container by [`scripts/capture-api-examples.js`](../../scripts/capture-api-examples.js) and are kept unchanged in [`examples.json`](examples.json) (see section 4). Customer names, phone numbers and e-mail addresses in the examples are synthetic.

## 1. Common conventions

| Topic | Rule |
| :--- | :--- |
| Base URL | `http://localhost:3000` when started with Docker (host port is `APP_PORT`). Every endpoint is under `/api`, except `GET /health`. |
| Format | Requests and responses are JSON (`Content-Type: application/json`). Only `POST /api/imports` uses `multipart/form-data`. Dates are `yyyy-mm-dd`; timestamps are ISO 8601 with the `+07:00` offset. |
| Authentication | `POST /api/auth/login` returns `accessToken` (JWT, valid `expiresIn` = 3600 s). Send it as `Authorization: Bearer <token>` on every other endpoint except `/health`. Role and store are read from the database on each request; a token of a deleted account is rejected with `401`. |
| Roles | `DATA_STAFF` (data staff, belongs to one store) and `DATA_MANAGER` (company-wide read access, manages accounts). Staff see masked phone numbers (`090****567`) and only the imports and duplicate pairs of their own store; managers see full numbers and all stores. |
| Pagination | Lists accept `page` (>= 1, default 1) and `size` (1 to 100). Default `size`: 50 for customers, import errors and users; 20 for imports and duplicate pairs. Invalid values give `400 INVALID_PAGE`. |
| Error format | Every error is `{ "error": { "code": "...", "message": "...", "details": ..., "requestId": "..." } }`. `details` appears only for some errors; `requestId` only for `5xx` (use it to find the log line). `message` is **Vietnamese text for end users**: clients must branch on `error.code`, never on `message`. Responses never contain stack traces, SQL or table names. |
| Common errors | These can be returned by any endpoint that accepts a JSON body or reads the database: `400 INVALID_JSON` (body is not valid JSON), `413 PAYLOAD_TOO_LARGE` (JSON body larger than 256 KB, returned before authentication), `500 INTERNAL_ERROR` (unexpected failure, has `requestId`), `503 SERVICE_UNAVAILABLE` (database unreachable, has `requestId`), `404 NOT_FOUND` (path does not exist). |
| Rate limit | Only on login: 5 consecutive failures for the same (client IP, username) lock that pair for 15 minutes (`429`). There is no other rate limit. |

Endpoint index:

| # | Method and path | Purpose | Roles |
| :---: | :--- | :--- | :--- |
| 2.1 | `GET /health` | Health check | none |
| 2.2 | `POST /api/auth/login` | Log in | none |
| 2.3 | `GET /api/customers` | List customers, or look one up by phone | both |
| 2.4 | `GET /api/customers/{customerId}` | Read one customer | both |
| 2.5 | `POST /api/customers` | Create a customer | `DATA_STAFF` |
| 2.6 | `PUT /api/customers/{customerId}` | Replace a customer's editable fields | `DATA_STAFF` |
| 2.7 | `DELETE /api/customers/{customerId}` | Soft-delete a customer | `DATA_STAFF` |
| 2.8 | `GET /api/imports` | List imports | both |
| 2.9 | `POST /api/imports` | Import a customer CSV file | `DATA_STAFF` |
| 2.10 | `GET /api/imports/{importId}/errors` | List the error records of one import | both |
| 2.11 | `GET /api/duplicate-pairs` | List suspected duplicate pairs | both |
| 2.12 | `GET /api/duplicate-pairs/{pairId}` | Read one pair with both customers | both |
| 2.13 | `POST /api/duplicate-pairs/{pairId}/decision` | Merge a pair or keep it separate | `DATA_STAFF` |
| 2.14 | `GET /api/users` | List accounts | `DATA_MANAGER` |
| 2.15 | `GET /api/users/{id}` | Read one account | `DATA_MANAGER` |
| 2.16 | `POST /api/users` | Create an account | `DATA_MANAGER` |
| 2.17 | `PUT /api/users/{id}` | Update an account | `DATA_MANAGER` |
| 2.18 | `DELETE /api/users/{id}` | Delete an account without history | `DATA_MANAGER` |

The `customer` object used in several responses:

| Field | Type | Meaning |
| :--- | :--- | :--- |
| `customerId` | string | Display code, for example `C000001` |
| `fullName` | string | Full name, 2 to 100 characters |
| `phone` | string | 10-digit mobile number; masked as `090****567` for `DATA_STAFF` |
| `email`, `address`, `birthDate` | string or `null` | Optional fields |
| `createdDate` | string | Date the customer was created |
| `mergedInto` | string or `null` | Code of the surviving customer if this one was merged, otherwise `null` |

## 2. Endpoints

### 2.1 `GET /health`

| Item | Detail |
| :--- | :--- |
| 1. Method and path | `GET /health` |
| 2. Business description | Tells operators and Docker whether the API and its database are reachable. Used by the Docker healthcheck, so `docker compose ps` shows `healthy` only when this returns 200. |
| 3. Authentication | None. |
| 4. Parameters and body | None. |
| 5. Success response | `200` with `{ "status": "ok", "db": "ok" }`. |
| 6. Error codes | `503` with `{ "status": "degraded", "db": "unreachable" }` when the database cannot be reached (this body is not the standard error format). |
| 7. Notes and limits | Runs one `SELECT 1`. Does not report version, configuration or host details. |

*Request*

```http
GET /health
```

*Response*

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "ok",
  "db": "ok"
}
```

### 2.2 `POST /api/auth/login`

| Item | Detail |
| :--- | :--- |
| 1. Method and path | `POST /api/auth/login` |
| 2. Business description | Exchanges a username and password for a bearer token. Every other endpoint needs this token. |
| 3. Authentication | None (public endpoint). |
| 4. Parameters and body | JSON body: `username` (string, 3 to 50 characters, required), `password` (string, required). |
| 5. Success response | `200` with `accessToken` (JWT), `expiresIn` (seconds, 3600) and `user` = `{ username, fullName, role }`. The password hash is never returned. |
| 6. Error codes | See the table below. |
| 7. Notes and limits | Wrong username and wrong password give the same `INVALID_CREDENTIALS` response, so usernames cannot be probed. After 5 consecutive failures for the same (IP, username) the pair is locked for 15 minutes (900 s from the last failure), even if the correct password is then sent; the response carries `Retry-After` and `details.retryAfterSeconds`. A successful login clears the counter. The counter lives in process memory: it resets when the container restarts and is not shared between several instances. |

| HTTP | `error.code` | When |
| :---: | :--- | :--- |
| 400 | `VALIDATION_ERROR` | Missing or badly sized `username` or `password`; `details[]` lists each field |
| 400 | `INVALID_JSON` | Body is not valid JSON |
| 401 | `INVALID_CREDENTIALS` | Unknown username or wrong password |
| 413 | `PAYLOAD_TOO_LARGE` | JSON body larger than 256 KB |
| 429 | `TOO_MANY_ATTEMPTS` | 5 failed attempts in a row; wait `Retry-After` seconds |
| 503 | `SERVICE_UNAVAILABLE` | Database unreachable |

Successful login:

*Request*

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "nv.lan",
  "password": "Demo@123"
}
```

*Response*

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "accessToken": "eyJhbGciOiJIUzI1...",
  "expiresIn": 3600,
  "user": {
    "username": "nv.lan",
    "fullName": "Chị Lan",
    "role": "DATA_STAFF"
  }
}
```

Wrong password:

*Request*

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "nv.lan",
  "password": "SaiMatKhau1"
}
```

*Response*

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Sai tên đăng nhập hoặc mật khẩu."
  }
}
```

Locked after five wrong attempts (sixth request):

*Request*

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "nv.thu.sai",
  "password": "SaiMatKhau1"
}
```

*Response*

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 900
Content-Type: application/json

{
  "error": {
    "code": "TOO_MANY_ATTEMPTS",
    "message": "Đăng nhập sai quá nhiều lần. Thử lại sau 900 giây.",
    "details": {
      "retryAfterSeconds": 900
    }
  }
}
```

Body larger than 256 KB:

*Request*

```http
POST /api/auth/login
Content-Type: application/json

{ "username": "nv.lan", "password": "<300 KB of x>" }
```

*Response*

```http
HTTP/1.1 413 Payload Too Large
Content-Type: application/json

{
  "error": {
    "code": "PAYLOAD_TOO_LARGE",
    "message": "Nội dung gửi lên lớn hơn 256 KB."
  }
}
```

Request without a token on a protected endpoint (applies to every endpoint in 2.3 to 2.18):

*Request*

```http
GET /api/customers
```

*Response*

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Chưa đăng nhập."
  }
}
```

### 2.3 `GET /api/customers`

| Item | Detail |
| :--- | :--- |
| 1. Method and path | `GET /api/customers` |
| 2. Business description | Without `phone`: pages through all active customers. With `phone`: finds the one customer owning that number, in any common spelling (`0901234567`, `+84 901 234 567`, `0901.234.567`). A number that belongs to a merged customer returns the surviving customer. |
| 3. Authentication | Bearer token, any role. |
| 4. Parameters and body | Query: `page`, `size` (see section 1), `phone` (optional). When `phone` is present, `page` and `size` are ignored. No body. |
| 5. Success response | List: `200` with `{ data: [customer], page, size, total }`. Lookup: `200` with `{ data: customer }`. |
| 6. Error codes | See the table below. |
| 7. Notes and limits | Soft-deleted customers are hidden. Customers are shared company-wide and are **not** scoped to a store (a known limitation, see `docs/thay-doi-thiet-ke.md` item 22); only phone masking depends on the role. |

| HTTP | `error.code` | When |
| :---: | :--- | :--- |
| 400 | `INVALID_PAGE` | `page` < 1, `size` outside 1 to 100, or not a number |
| 400 | `VALIDATION_ERROR` | `phone` contains characters that cannot be part of a phone number (`details` has `PHONE_CHAR`) |
| 401 | `UNAUTHORIZED` | Missing, expired or invalid token |
| 404 | `CUSTOMER_NOT_FOUND` | No active customer owns the `phone` |
| 503 | `SERVICE_UNAVAILABLE` | Database unreachable |

List as `DATA_STAFF` (masked phones):

*Request*

```http
GET /api/customers?page=1&size=2
Authorization: Bearer <token>
```

*Response*

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {
      "customerId": "C000001",
      "fullName": "Nguyễn Văn An",
      "phone": "090****567",
      "email": "an.nguyen@gmail.com",
      "address": null,
      "birthDate": "1990-05-12",
      "createdDate": "2024-03-10",
      "mergedInto": null
    },
    {
      "customerId": "C000002",
      "fullName": "Nguyen Van An",
      "phone": "098****321",
      "email": "an.nguyen@gmail.com",
      "address": "45 Nguyễn Huệ, Q.1, TP.HCM",
      "birthDate": "1990-05-12",
      "createdDate": "2025-01-15",
      "mergedInto": null
    }
  ],
  "page": 1,
  "size": 2,
  "total": 12
}
```

The same list as `DATA_MANAGER` (full phones):

*Request*

```http
GET /api/customers?page=1&size=2
Authorization: Bearer <token>
```

*Response*

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {
      "customerId": "C000001",
      "fullName": "Nguyễn Văn An",
      "phone": "0901234567",
      "email": "an.nguyen@gmail.com",
      "address": null,
      "birthDate": "1990-05-12",
      "createdDate": "2024-03-10",
      "mergedInto": null
    },
    {
      "customerId": "C000002",
      "fullName": "Nguyen Van An",
      "phone": "0987654321",
      "email": "an.nguyen@gmail.com",
      "address": "45 Nguyễn Huệ, Q.1, TP.HCM",
      "birthDate": "1990-05-12",
      "createdDate": "2025-01-15",
      "mergedInto": null
    }
  ],
  "page": 1,
  "size": 2,
  "total": 12
}
```

Look up by phone:

*Request*

```http
GET /api/customers?phone=0901234567
Authorization: Bearer <token>
```

*Response*

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "customerId": "C000001",
    "fullName": "Nguyễn Văn An",
    "phone": "090****567",
    "email": "an.nguyen@gmail.com",
    "address": null,
    "birthDate": "1990-05-12",
    "createdDate": "2024-03-10",
    "mergedInto": null
  }
}
```

### 2.4 `GET /api/customers/{customerId}`

| Item | Detail |
| :--- | :--- |
| 1. Method and path | `GET /api/customers/{customerId}` |
| 2. Business description | Reads one customer by display code. |
| 3. Authentication | Bearer token, any role. |
| 4. Parameters and body | Path: `customerId`, for example `C000001`. No body. |
| 5. Success response | `200` with `{ data: customer }`. |
| 6. Error codes | `401 UNAUTHORIZED`; `404 CUSTOMER_NOT_FOUND` (also for a malformed or deleted code); `503 SERVICE_UNAVAILABLE`. |
| 7. Notes and limits | Phone is masked for `DATA_STAFF`. A merged customer is still returned, with `mergedInto` set. |

*Request*

```http
GET /api/customers/C000001
Authorization: Bearer <token>
```

*Response*

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "customerId": "C000001",
    "fullName": "Nguyễn Văn An",
    "phone": "090****567",
    "email": "an.nguyen@gmail.com",
    "address": null,
    "birthDate": "1990-05-12",
    "createdDate": "2024-03-10",
    "mergedInto": null
  }
}
```

Unknown code:

*Request*

```http
GET /api/customers/C999999
Authorization: Bearer <token>
```

*Response*

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": {
    "code": "CUSTOMER_NOT_FOUND",
    "message": "Không tìm thấy hồ sơ khách hàng C999999."
  }
}
```

### 2.5 `POST /api/customers`

| Item | Detail |
| :--- | :--- |
| 1. Method and path | `POST /api/customers` |
| 2. Business description | Creates one customer record by hand. The phone number is normalised to `0xxxxxxxxx` and must be unique among all customers (rule QT-01). |
| 3. Authentication | Bearer token, `DATA_STAFF` only. |
| 4. Parameters and body | JSON: `fullName` (required, 2 to 100 chars), `phone` (required, 10 digits after normalisation, a known mobile prefix), `email` (optional, at most 100 chars), `address` (optional, at most 255 chars), `birthDate` (optional, `yyyy-mm-dd` or `dd/mm/yyyy`), `createdDate` (optional, defaults to today). |
| 5. Success response | `201` with `{ data: customer }` and a `Location` header pointing to the new customer. |
| 6. Error codes | See the table below. |
| 7. Notes and limits | The phone of a soft-deleted customer stays reserved, so reusing it gives `409` with `details.deleted = true`. Body limit 256 KB. |

| HTTP | `error.code` | When |
| :---: | :--- | :--- |
| 400 | `VALIDATION_ERROR` | A field is invalid; `details[]` has one entry per field with `field`, `code` (`NAME_LENGTH`, `MISSING_FIELD`, `PHONE_CHAR`, `PHONE_LENGTH`, `PHONE_PREFIX`, `EMAIL_INVALID`, `DATE_INVALID`) and `message` |
| 401 | `UNAUTHORIZED` | Missing, expired or invalid token |
| 403 | `FORBIDDEN` | Caller is `DATA_MANAGER` |
| 409 | `DUPLICATE_PHONE` | The number already belongs to another customer; `details.customerId` names it |
| 503 | `SERVICE_UNAVAILABLE` | Database unreachable |

*Request*

```http
POST /api/customers
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "Phạm Thu Hà",
  "phone": "0935123456",
  "email": "ha.pham@example.com",
  "address": "12 Lê Lợi, Q.1, TP.HCM",
  "birthDate": "1994-07-21"
}
```

*Response*

```http
HTTP/1.1 201 Created
Location: /api/customers/C000013
Content-Type: application/json

{
  "data": {
    "customerId": "C000013",
    "fullName": "Phạm Thu Hà",
    "phone": "093****456",
    "email": "ha.pham@example.com",
    "address": "12 Lê Lợi, Q.1, TP.HCM",
    "birthDate": "1994-07-21",
    "createdDate": "2026-11-14",
    "mergedInto": null
  }
}
```

Invalid fields:

*Request*

```http
POST /api/customers
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "A",
  "phone": "09123456"
}
```

*Response*

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ ở các trường: fullName, phone",
    "details": [
      {
        "field": "fullName",
        "code": "NAME_LENGTH",
        "message": "Họ tên dài 2–100 ký tự."
      },
      {
        "field": "phone",
        "code": "PHONE_LENGTH",
        "message": "Số điện thoại phải có 10 chữ số, nhận được 8."
      }
    ]
  }
}
```

Phone already in use:

*Request*

```http
POST /api/customers
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "Người Trùng Số",
  "phone": "0935 123 456"
}
```

*Response*

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "error": {
    "code": "DUPLICATE_PHONE",
    "message": "Số điện thoại 0935123456 đã thuộc hồ sơ C000013.",
    "details": {
      "customerId": "C000013",
      "deleted": false
    }
  }
}
```

Called by a manager:

*Request*

```http
POST /api/customers
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "Quản Lý Thử",
  "phone": "0935123457"
}
```

*Response*

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "error": {
    "code": "FORBIDDEN",
    "message": "Vai trò của bạn không được dùng chức năng này."
  }
}
```

### 2.6 `PUT /api/customers/{customerId}`

| Item | Detail |
| :--- | :--- |
| 1. Method and path | `PUT /api/customers/{customerId}` |
| 2. Business description | Replaces all editable fields of a customer (full replacement, not a patch). |
| 3. Authentication | Bearer token, `DATA_STAFF` only. |
| 4. Parameters and body | Path: `customerId`. JSON body with the same fields and rules as 2.5; optional fields that are left out are cleared. |
| 5. Success response | `200` with `{ data: customer }`. |
| 6. Error codes | `400 VALIDATION_ERROR` (as in 2.5); `401 UNAUTHORIZED`; `403 FORBIDDEN` (manager); `404 CUSTOMER_NOT_FOUND`; `409 DUPLICATE_PHONE`; `409 CUSTOMER_MERGED` (the customer was merged into another one and can no longer be edited); `503 SERVICE_UNAVAILABLE`. |
| 7. Notes and limits | The phone must stay unique. A customer cannot be merged through this endpoint; merging is only done by 2.13. |

*Request*

```http
PUT /api/customers/C000013
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "Phạm Thu Hà",
  "phone": "0935123456",
  "email": "ha.pham@example.com",
  "address": "45 Nguyễn Huệ, Q.1, TP.HCM",
  "birthDate": "1994-07-21"
}
```

*Response*

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "customerId": "C000013",
    "fullName": "Phạm Thu Hà",
    "phone": "093****456",
    "email": "ha.pham@example.com",
    "address": "45 Nguyễn Huệ, Q.1, TP.HCM",
    "birthDate": "1994-07-21",
    "createdDate": "2026-11-14",
    "mergedInto": null
  }
}
```

### 2.7 `DELETE /api/customers/{customerId}`

| Item | Detail |
| :--- | :--- |
| 1. Method and path | `DELETE /api/customers/{customerId}` |
| 2. Business description | Soft-deletes a customer: the row stays in the table (rule BR5 forbids physical deletion) and is only marked deleted, after which lookups, lists and duplicate detection no longer see it. |
| 3. Authentication | Bearer token, `DATA_STAFF` only. |
| 4. Parameters and body | Path: `customerId`. No body. |
| 5. Success response | `204` with an empty body. |
| 6. Error codes | `401 UNAUTHORIZED`; `403 FORBIDDEN` (manager); `404 CUSTOMER_NOT_FOUND` (no such customer, or already deleted); `409 CUSTOMER_MERGED` (customer was merged into another); `409 CUSTOMER_HAS_MERGED` (customer is the survivor of a merge); `409 CUSTOMER_IN_PENDING_PAIR` (decide the pending duplicate pair first); `503 SERVICE_UNAVAILABLE`. |
| 7. Notes and limits | The phone number stays reserved (see 2.5). Importing a file that contains the same phone restores the customer. Any `DATA_STAFF` can delete any customer: customers are company-wide (known limitation). |

*Request*

```http
DELETE /api/customers/C000013
Authorization: Bearer <token>
```

*Response*

```http
HTTP/1.1 204 No Content
```

Deleting it a second time:

*Request*

```http
DELETE /api/customers/C000013
Authorization: Bearer <token>
```

*Response*

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": {
    "code": "CUSTOMER_NOT_FOUND",
    "message": "Không tìm thấy hồ sơ khách hàng C000013."
  }
}
```

### 2.8 `GET /api/imports`

| Item | Detail |
| :--- | :--- |
| 1. Method and path | `GET /api/imports` |
| 2. Business description | Lists the CSV imports, newest first. |
| 3. Authentication | Bearer token, any role. `DATA_STAFF` see only imports made by their own store; `DATA_MANAGER` see all (rule QT-14). |
| 4. Parameters and body | Query: `page`, `size` (default 20). No body. |
| 5. Success response | `200` with `{ page, size, total, items: [{ importId, source, fileName, importedBy, importedAt, totalRecords, errorRecords }] }`. |
| 6. Error codes | `400 INVALID_PAGE`; `401 UNAUTHORIZED`; `503 SERVICE_UNAVAILABLE`. |
| 7. Notes and limits | `source` is `RETAIL` or `WARRANTY`. In the example, `total` is 1 because the seed contains two imports and the staff member only sees the one from their own store. |

*Request*

```http
GET /api/imports?page=1&size=5
Authorization: Bearer <token>
```

*Response*

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "page": 1,
  "size": 5,
  "total": 1,
  "items": [
    {
      "importId": "I001",
      "source": "RETAIL",
      "fileName": "customers_retail_demo.csv",
      "importedBy": "nv.lan",
      "importedAt": "2026-10-01T09:00:00+07:00",
      "totalRecords": 2,
      "errorRecords": 1
    }
  ]
}
```

### 2.9 `POST /api/imports`

| Item | Detail |
| :--- | :--- |
| 1. Method and path | `POST /api/imports` |
| 2. Business description | Imports a customer CSV file. Each row is normalised and checked; bad rows are recorded as error records (they do **not** make the request fail). Customers are created, matching phones are attached to existing customers, and suspected duplicate pairs are generated. The whole file is saved in one transaction: if saving fails, nothing is kept. |
| 3. Authentication | Bearer token, `DATA_STAFF` only. |
| 4. Parameters and body | `multipart/form-data` with `source` (`RETAIL` or `WARRANTY`, required) and `file` (one CSV, required). The CSV must be UTF-8, at most 5 MB, have at least one data row, and have the header columns `ho_ten`, `so_dien_thoai`, `email`, `dia_chi`, `ngay_sinh`, `ngay_tao`. |
| 5. Success response | `201` with a `Location` header (`/api/imports/{importId}/errors`) and the summary: `importId`, `source`, `fileName`, `totalRecords`, `validRecords`, `errorRecords`, `errorsByCode` (counts for `MISSING_FIELD`, `PHONE_LENGTH`, `PHONE_PREFIX`, `PHONE_CHAR`, `EMAIL_INVALID`, `DATE_INVALID`), `newCustomers`, `attachedRecords`, `newDuplicatePairs`, `importedBy`, `importedAt`. |
| 6. Error codes | See the table below. |
| 7. Notes and limits | The 256 KB JSON limit does not apply to the upload; the file limit is 5 MB. The file is read in memory and is not stored on disk. A 3,000-row file imports in about 0.3 seconds. |

| HTTP | `error.code` | When |
| :---: | :--- | :--- |
| 400 | `INVALID_SOURCE` | `source` is not `RETAIL` or `WARRANTY` |
| 400 | `INVALID_FILE_TYPE` | No file, or the upload cannot be read as a CSV file |
| 400 | `FILE_TOO_LARGE` | File larger than 5 MB |
| 400 | `INVALID_ENCODING` | File is not UTF-8 text (for example a CSV saved as ANSI) |
| 400 | `MISSING_COLUMNS` | A required column is absent; `details` lists the missing names |
| 400 | `EMPTY_FILE` | Header only, no data rows |
| 401 | `UNAUTHORIZED` | Missing, expired or invalid token |
| 403 | `FORBIDDEN` | Caller is `DATA_MANAGER` |
| 500 | `IMPORT_FAILED` | Saving failed; the transaction was rolled back; has `requestId` |
| 503 | `SERVICE_UNAVAILABLE` | Database unreachable |

A file with 6 rows, 3 of them with errors. The uploaded `khach_hang_ban_le_mau.csv` contained exactly this text (row 3 has a short phone number, row 4 an unknown prefix, row 5 no name):

```csv
ho_ten,so_dien_thoai,email,dia_chi,ngay_sinh,ngay_tao
Nguyễn Minh Tâm,0912000111,tam.nguyen@example.com,"10 Lê Lợi, Q.1, TP.HCM",1992-03-04,2026-11-01
trần  thu hà,+84 913 000 222,,,15/08/1990,2026-11-01
Phạm Văn Lực,09123456,,,,2026-11-01
Lê Thị Nở,0111222333,,,,2026-11-01
,0934000555,,,,2026-11-01
Nguyen Van An,0909000999,an.nguyen@gmail.com,,1990-05-12,2026-11-01
```

*Request*

```http
POST /api/imports
Authorization: Bearer <token>
Content-Type: multipart/form-data

(source=RETAIL, file=khach_hang_ban_le_mau.csv (6 dòng dữ liệu))
```

*Response*

```http
HTTP/1.1 201 Created
Location: /api/imports/I003/errors
Content-Type: application/json

{
  "importId": "I003",
  "source": "RETAIL",
  "fileName": "khach_hang_ban_le_mau.csv",
  "totalRecords": 6,
  "validRecords": 3,
  "errorRecords": 3,
  "errorsByCode": {
    "MISSING_FIELD": 1,
    "PHONE_LENGTH": 1,
    "PHONE_PREFIX": 1,
    "PHONE_CHAR": 0,
    "EMAIL_INVALID": 0,
    "DATE_INVALID": 0
  },
  "newCustomers": 3,
  "attachedRecords": 0,
  "newDuplicatePairs": 2,
  "importedBy": "nv.lan",
  "importedAt": "2026-11-14T00:53:42+07:00"
}
```

A file that lacks required columns:

*Request*

```http
POST /api/imports
Authorization: Bearer <token>
Content-Type: multipart/form-data

(source=RETAIL, file=thieu_cot.csv (thiếu cột so_dien_thoai, ngay_tao))
```

*Response*

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": {
    "code": "MISSING_COLUMNS",
    "message": "File thiếu cột bắt buộc: so_dien_thoai, dia_chi, ngay_sinh, ngay_tao.",
    "details": [
      "so_dien_thoai",
      "dia_chi",
      "ngay_sinh",
      "ngay_tao"
    ]
  }
}
```

### 2.10 `GET /api/imports/{importId}/errors`

| Item | Detail |
| :--- | :--- |
| 1. Method and path | `GET /api/imports/{importId}/errors` |
| 2. Business description | Lists the error records of one import: the original row, the normalised values and the rules it broke, so staff can see what is wrong. An import with no errors returns an empty list. |
| 3. Authentication | Bearer token, any role. `DATA_STAFF` can only open imports of their own store (another store's import gives `404`); `DATA_MANAGER` can open all. |
| 4. Parameters and body | Path: `importId` (for example `I003`). Query: `code` (optional filter: `MISSING_FIELD`, `PHONE_LENGTH`, `PHONE_PREFIX`, `PHONE_CHAR`, `EMAIL_INVALID` or `DATE_INVALID`), `page`, `size` (default 50). No body. |
| 5. Success response | `200` with `{ importId, code, page, size, total, items: [{ recordId, rowNumber, original, normalized, errors: [{ code, field, message }] }] }`. `code` echoes the filter or is `null`. |
| 6. Error codes | `400 INVALID_ERROR_CODE`; `400 INVALID_PAGE`; `401 UNAUTHORIZED`; `404 IMPORT_NOT_FOUND` (no such import, or it belongs to another store); `503 SERVICE_UNAVAILABLE`. |
| 7. Notes and limits | Only errors that have not been fixed are listed. `rowNumber` is the data-row number in the uploaded file. Editing an error record (a design item) is not implemented, see section 3. |

*Request*

```http
GET /api/imports/I003/errors?page=1&size=2
Authorization: Bearer <token>
```

*Response*

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "importId": "I003",
  "code": null,
  "page": 1,
  "size": 2,
  "total": 3,
  "items": [
    {
      "recordId": 5,
      "rowNumber": 3,
      "original": {
        "ho_ten": "Phạm Văn Lực",
        "so_dien_thoai": "09123456",
        "email": null,
        "dia_chi": null,
        "ngay_sinh": null,
        "ngay_tao": "2026-11-01"
      },
      "normalized": {
        "fullName": "Phạm Văn Lực",
        "phone": "09123456",
        "email": null,
        "address": null,
        "birthDate": null,
        "createdDate": "2026-11-01"
      },
      "errors": [
        {
          "code": "PHONE_LENGTH",
          "field": "phone",
          "message": "Số điện thoại phải có 10 chữ số, nhận được 8."
        }
      ]
    },
    {
      "recordId": 6,
      "rowNumber": 4,
      "original": {
        "ho_ten": "Lê Thị Nở",
        "so_dien_thoai": "0111222333",
        "email": null,
        "dia_chi": null,
        "ngay_sinh": null,
        "ngay_tao": "2026-11-01"
      },
      "normalized": {
        "fullName": "Lê Thị Nở",
        "phone": "0111222333",
        "email": null,
        "address": null,
        "birthDate": null,
        "createdDate": "2026-11-01"
      },
      "errors": [
        {
          "code": "PHONE_PREFIX",
          "field": "phone",
          "message": "Đầu số 011 không thuộc danh mục đầu số di động."
        }
      ]
    }
  ]
}
```

Filtered by one error code:

*Request*

```http
GET /api/imports/I003/errors?code=PHONE_LENGTH
Authorization: Bearer <token>
```

*Response*

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "importId": "I003",
  "code": "PHONE_LENGTH",
  "page": 1,
  "size": 50,
  "total": 1,
  "items": [
    {
      "recordId": 5,
      "rowNumber": 3,
      "original": {
        "ho_ten": "Phạm Văn Lực",
        "so_dien_thoai": "09123456",
        "email": null,
        "dia_chi": null,
        "ngay_sinh": null,
        "ngay_tao": "2026-11-01"
      },
      "normalized": {
        "fullName": "Phạm Văn Lực",
        "phone": "09123456",
        "email": null,
        "address": null,
        "birthDate": null,
        "createdDate": "2026-11-01"
      },
      "errors": [
        {
          "code": "PHONE_LENGTH",
          "field": "phone",
          "message": "Số điện thoại phải có 10 chữ số, nhận được 8."
        }
      ]
    }
  ]
}
```

Unknown import:

*Request*

```http
GET /api/imports/I999/errors
Authorization: Bearer <token>
```

*Response*

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": {
    "code": "IMPORT_NOT_FOUND",
    "message": "Không tìm thấy lần nhập I999."
  }
}
```

### 2.11 `GET /api/duplicate-pairs`

| Item | Detail |
| :--- | :--- |
| 1. Method and path | `GET /api/duplicate-pairs` |
| 2. Business description | Lists the suspected duplicate customer pairs found at import time, highest similarity first. |
| 3. Authentication | Bearer token, any role. `DATA_STAFF` see only pairs of their own store (rule QT-14); phones are masked for staff. |
| 4. Parameters and body | Query: `status` (`PENDING` by default, `MERGED` or `KEEP_SEPARATE`), `page`, `size` (default 20). No body. |
| 5. Success response | `200` with `{ page, size, total, items: [{ pairId, matchedBy, similarity, status, customerA, customerB }] }`. `matchedBy` is `EMAIL` or `NAME_BIRTHDATE`; `customerA` and `customerB` have `customerId`, `fullName`, `phone` and `source`. |
| 6. Error codes | `400 INVALID_STATUS`; `400 INVALID_PAGE`; `401 UNAUTHORIZED`; `503 SERVICE_UNAVAILABLE`. |
| 7. Notes and limits | An empty `items` array with `total: 0` means nothing is waiting for review. `source` is `null` for customers that did not come from an import. |

*Request*

```http
GET /api/duplicate-pairs?status=PENDING&page=1&size=2
Authorization: Bearer <token>
```

*Response*

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "page": 1,
  "size": 2,
  "total": 4,
  "items": [
    {
      "pairId": "P0003",
      "matchedBy": "EMAIL",
      "similarity": 1,
      "status": "PENDING",
      "customerA": {
        "customerId": "C000001",
        "fullName": "Nguyễn Văn An",
        "phone": "090****567",
        "source": "RETAIL"
      },
      "customerB": {
        "customerId": "C000016",
        "fullName": "Nguyen Van An",
        "phone": "090****999",
        "source": "RETAIL"
      }
    },
    {
      "pairId": "P0004",
      "matchedBy": "EMAIL",
      "similarity": 1,
      "status": "PENDING",
      "customerA": {
        "customerId": "C000002",
        "fullName": "Nguyen Van An",
        "phone": "098****321",
        "source": null
      },
      "customerB": {
        "customerId": "C000016",
        "fullName": "Nguyen Van An",
        "phone": "090****999",
        "source": "RETAIL"
      }
    }
  ]
}
```

### 2.12 `GET /api/duplicate-pairs/{pairId}`

| Item | Detail |
| :--- | :--- |
| 1. Method and path | `GET /api/duplicate-pairs/{pairId}` |
| 2. Business description | Shows one pair with the full data of both customers and the list of fields whose values differ, so a reviewer can decide. |
| 3. Authentication | Bearer token, any role (staff limited to their own store). |
| 4. Parameters and body | Path: `pairId` (for example `P0001`). No body. |
| 5. Success response | `200` with `{ pairId, matchedBy, similarity, status, customerA, customerB, differentFields }`. Both customers include `email`, `address` and `birthDate`. |
| 6. Error codes | `401 UNAUTHORIZED`; `404 PAIR_NOT_FOUND` (no such pair, malformed id, or another store's pair for staff); `503 SERVICE_UNAVAILABLE`. |
| 7. Notes and limits | `differentFields` tells which fields must get an explicit choice in 2.13. |

*Request*

```http
GET /api/duplicate-pairs/P0001
Authorization: Bearer <token>
```

*Response*

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "pairId": "P0001",
  "matchedBy": "EMAIL",
  "similarity": 0.93,
  "status": "PENDING",
  "customerA": {
    "customerId": "C000001",
    "fullName": "Nguyễn Văn An",
    "phone": "090****567",
    "source": "RETAIL",
    "email": "an.nguyen@gmail.com",
    "address": null,
    "birthDate": "1990-05-12"
  },
  "customerB": {
    "customerId": "C000002",
    "fullName": "Nguyen Van An",
    "phone": "098****321",
    "source": null,
    "email": "an.nguyen@gmail.com",
    "address": "45 Nguyễn Huệ, Q.1, TP.HCM",
    "birthDate": "1990-05-12"
  },
  "differentFields": [
    "fullName",
    "phone"
  ]
}
```

Unknown pair:

*Request*

```http
GET /api/duplicate-pairs/P9999
Authorization: Bearer <token>
```

*Response*

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": {
    "code": "PAIR_NOT_FOUND",
    "message": "Không tìm thấy cặp nghi trùng P9999."
  }
}
```

### 2.13 `POST /api/duplicate-pairs/{pairId}/decision`

| Item | Detail |
| :--- | :--- |
| 1. Method and path | `POST /api/duplicate-pairs/{pairId}/decision` |
| 2. Business description | Records the reviewer's decision on a pending pair: merge the two customers into one, or keep them separate. A merge does not delete the other customer; it is marked `mergedInto` the survivor (rule QT-13). |
| 3. Authentication | Bearer token, `DATA_STAFF` only, and only for pairs of their own store. |
| 4. Parameters and body | Path: `pairId`. JSON: `action` (`MERGE` or `KEEP_SEPARATE`, required). For `MERGE` also `keepCustomerId` (one of the two customers of the pair) and `fieldChoices`, an object that maps every field in `differentFields` to the `customerId` whose value is kept. |
| 5. Success response | `MERGE`: `200` with `{ pairId, status: "MERGED", survivingCustomerId, mergedCustomerId, result, decidedBy, decidedAt }`. `KEEP_SEPARATE`: `200` with `{ pairId, status: "KEEP_SEPARATE", decidedBy, decidedAt }`. |
| 6. Error codes | See the table below. |
| 7. Notes and limits | A pair can be decided only once: when two people decide the same pair, the second gets `409` and nothing changes (rule BR4). Fields that are empty in the survivor are filled from the other customer. If `fieldChoices.phone` points at the customer being merged away, the two customers swap phone numbers, because a phone number must stay unique. |

| HTTP | `error.code` | When |
| :---: | :--- | :--- |
| 400 | `INVALID_ACTION` | `action` is neither `MERGE` nor `KEEP_SEPARATE` |
| 400 | `KEEP_ID_REQUIRED` | `MERGE` without `keepCustomerId` |
| 400 | `KEEP_ID_NOT_IN_PAIR` | `keepCustomerId` is not one of the two customers |
| 400 | `FIELD_CHOICE_REQUIRED` | A differing field has no choice; `details` lists the missing fields |
| 401 | `UNAUTHORIZED` | Missing, expired or invalid token |
| 403 | `FORBIDDEN` | Caller is `DATA_MANAGER` |
| 404 | `PAIR_NOT_FOUND` | No such pair, or it belongs to another store |
| 409 | `PAIR_ALREADY_DECIDED` | The pair was already merged or kept separate |
| 409 | `CUSTOMER_MERGED` | One of the two customers was already merged in another pair |
| 503 | `SERVICE_UNAVAILABLE` | Database unreachable |

Merge:

*Request*

```http
POST /api/duplicate-pairs/P0001/decision
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "MERGE",
  "keepCustomerId": "C000001",
  "fieldChoices": {
    "fullName": "C000001",
    "phone": "C000001"
  }
}
```

*Response*

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "pairId": "P0001",
  "status": "MERGED",
  "survivingCustomerId": "C000001",
  "mergedCustomerId": "C000002",
  "result": {
    "fullName": "Nguyễn Văn An",
    "phone": "090****567",
    "email": "an.nguyen@gmail.com",
    "address": "45 Nguyễn Huệ, Q.1, TP.HCM"
  },
  "decidedBy": "nv.lan",
  "decidedAt": "2026-11-14T00:53:42+07:00"
}
```

Deciding the same pair again:

*Request*

```http
POST /api/duplicate-pairs/P0001/decision
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "KEEP_SEPARATE"
}
```

*Response*

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "error": {
    "code": "PAIR_ALREADY_DECIDED",
    "message": "Cặp P0001 đã được xử lý."
  }
}
```

Keep separate:

*Request*

```http
POST /api/duplicate-pairs/P0002/decision
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "KEEP_SEPARATE"
}
```

*Response*

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "pairId": "P0002",
  "status": "KEEP_SEPARATE",
  "decidedBy": "nv.lan",
  "decidedAt": "2026-11-14T00:53:42+07:00"
}
```

### 2.14 `GET /api/users`

| Item | Detail |
| :--- | :--- |
| 1. Method and path | `GET /api/users` |
| 2. Business description | Lists accounts so a manager can administer them. |
| 3. Authentication | Bearer token, `DATA_MANAGER` only. |
| 4. Parameters and body | Query: `page`, `size` (default 50). No body. |
| 5. Success response | `200` with `{ page, size, total, items: [{ userId, username, fullName, role, storeCode, createdAt }] }`. Passwords and hashes are never returned. |
| 6. Error codes | `400 INVALID_PAGE`; `401 UNAUTHORIZED`; `403 FORBIDDEN` (caller is `DATA_STAFF`); `503 SERVICE_UNAVAILABLE`. |
| 7. Notes and limits | `storeCode` is `null` for managers. |

*Request*

```http
GET /api/users?page=1&size=2
Authorization: Bearer <token>
```

*Response*

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "page": 1,
  "size": 2,
  "total": 3,
  "items": [
    {
      "userId": 1,
      "username": "nv.lan",
      "fullName": "Chị Lan",
      "role": "DATA_STAFF",
      "storeCode": "CH01",
      "createdAt": "2026-11-14T00:51:30+07:00"
    },
    {
      "userId": 2,
      "username": "nv.minh",
      "fullName": "Anh Minh",
      "role": "DATA_STAFF",
      "storeCode": "CH02",
      "createdAt": "2026-11-14T00:51:30+07:00"
    }
  ]
}
```

Called by staff:

*Request*

```http
GET /api/users
Authorization: Bearer <token>
```

*Response*

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "error": {
    "code": "FORBIDDEN",
    "message": "Vai trò của bạn không được dùng chức năng này."
  }
}
```

### 2.15 `GET /api/users/{id}`

| Item | Detail |
| :--- | :--- |
| 1. Method and path | `GET /api/users/{id}` |
| 2. Business description | Reads one account. |
| 3. Authentication | Bearer token, `DATA_MANAGER` only. |
| 4. Parameters and body | Path: `id`, a positive integer. No body. |
| 5. Success response | `200` with `{ data: { userId, username, fullName, role, storeCode, createdAt } }`. |
| 6. Error codes | `400 VALIDATION_ERROR` (`id` is not a positive integer); `401 UNAUTHORIZED`; `403 FORBIDDEN`; `404 USER_NOT_FOUND`; `503 SERVICE_UNAVAILABLE`. |
| 7. Notes and limits | No password data in the response. |

*Request*

```http
GET /api/users/4
Authorization: Bearer <token>
```

*Response*

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "userId": 4,
    "username": "nv.thu",
    "fullName": "Chị Thu",
    "role": "DATA_STAFF",
    "storeCode": "CH03",
    "createdAt": "2026-11-14T00:53:43+07:00"
  }
}
```

Unknown account:

*Request*

```http
GET /api/users/999999
Authorization: Bearer <token>
```

*Response*

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "Không tìm thấy tài khoản 999999."
  }
}
```

### 2.16 `POST /api/users`

| Item | Detail |
| :--- | :--- |
| 1. Method and path | `POST /api/users` |
| 2. Business description | Creates an account. The password is stored only as a salted scrypt hash. |
| 3. Authentication | Bearer token, `DATA_MANAGER` only. |
| 4. Parameters and body | JSON: `username` (3 to 50 chars: lower-case letters, digits, `.` and `_`), `password` (8 to 72 chars, at least one letter and one digit), `fullName` (2 to 100 chars), `role` (`DATA_STAFF` or `DATA_MANAGER`), `storeCode` (2 to 10 upper-case letters or digits; required for `DATA_STAFF`, must be empty for `DATA_MANAGER`). |
| 5. Success response | `201` with `{ data: user }` and a `Location` header. |
| 6. Error codes | `400 VALIDATION_ERROR` (`details[]` has `field` and `code`: `INVALID_FORMAT`, `INVALID_LENGTH`, `INVALID_VALUE`); `401 UNAUTHORIZED`; `403 FORBIDDEN`; `409 USERNAME_TAKEN`; `503 SERVICE_UNAVAILABLE`. |
| 7. Notes and limits | The username cannot be changed after creation. |

*Request*

```http
POST /api/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "nv.thu",
  "password": "MatKhau123",
  "fullName": "Chị Thu",
  "role": "DATA_STAFF",
  "storeCode": "CH03"
}
```

*Response*

```http
HTTP/1.1 201 Created
Location: /api/users/4
Content-Type: application/json

{
  "data": {
    "userId": 4,
    "username": "nv.thu",
    "fullName": "Chị Thu",
    "role": "DATA_STAFF",
    "storeCode": "CH03",
    "createdAt": "2026-11-14T00:53:43+07:00"
  }
}
```

Username already used:

*Request*

```http
POST /api/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "nv.thu",
  "password": "MatKhau123",
  "fullName": "Chị Thu",
  "role": "DATA_STAFF",
  "storeCode": "CH03"
}
```

*Response*

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "error": {
    "code": "USERNAME_TAKEN",
    "message": "Tên đăng nhập đã được dùng."
  }
}
```

### 2.17 `PUT /api/users/{id}`

| Item | Detail |
| :--- | :--- |
| 1. Method and path | `PUT /api/users/{id}` |
| 2. Business description | Changes an account's name, role and store, and optionally its password. |
| 3. Authentication | Bearer token, `DATA_MANAGER` only. |
| 4. Parameters and body | Path: `id`. JSON: `fullName`, `role`, `storeCode` (same rules as 2.16); `password` only when it should change. Sending a different `username` is rejected. |
| 5. Success response | `200` with `{ data: user }`. |
| 6. Error codes | `400 VALIDATION_ERROR` (including `IMMUTABLE` for `username`); `401 UNAUTHORIZED`; `403 FORBIDDEN`; `404 USER_NOT_FOUND`; `409 LAST_MANAGER` (would leave no `DATA_MANAGER`); `503 SERVICE_UNAVAILABLE`. |
| 7. Notes and limits | The check for the last manager runs in a transaction that locks the manager rows, so two managers cannot demote each other at the same moment and leave zero managers (BUG-010). |

*Request*

```http
PUT /api/users/4
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "Chị Thu Hà",
  "role": "DATA_STAFF",
  "storeCode": "CH02"
}
```

*Response*

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "userId": 4,
    "username": "nv.thu",
    "fullName": "Chị Thu Hà",
    "role": "DATA_STAFF",
    "storeCode": "CH02",
    "createdAt": "2026-11-14T00:53:43+07:00"
  }
}
```

### 2.18 `DELETE /api/users/{id}`

| Item | Detail |
| :--- | :--- |
| 1. Method and path | `DELETE /api/users/{id}` |
| 2. Business description | Deletes an account that has never imported a file or decided a pair. |
| 3. Authentication | Bearer token, `DATA_MANAGER` only. |
| 4. Parameters and body | Path: `id`. No body. |
| 5. Success response | `204` with an empty body. |
| 6. Error codes | `401 UNAUTHORIZED`; `403 FORBIDDEN`; `404 USER_NOT_FOUND`; `409 CANNOT_DELETE_SELF`; `409 LAST_MANAGER`; `409 USER_HAS_HISTORY` (the account has imports or decisions, so the foreign keys keep it); `503 SERVICE_UNAVAILABLE`. |
| 7. Notes and limits | A deleted account's token stops working immediately. |

*Request*

```http
DELETE /api/users/4
Authorization: Bearer <token>
```

*Response*

```http
HTTP/1.1 204 No Content
```

Account with history:

*Request*

```http
DELETE /api/users/1
Authorization: Bearer <token>
```

*Response*

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "error": {
    "code": "USER_HAS_HISTORY",
    "message": "Tài khoản nv.lan đã có lịch sử thao tác (lần nhập hoặc quyết định duyệt cặp) nên không xóa được."
  }
}
```

## 3. Designed but not implemented

The API contract in [`../api-contract.md`](../api-contract.md) (written in Vietnamese in assignment 1) also designs two endpoints that are **not implemented** in the running system; calling them returns `404 NOT_FOUND`. They are not documented above on purpose, because this document describes only what the system really does.

| Contract id | Designed endpoint | Status |
| :--- | :--- | :--- |
| E8 | `PUT /api/records/{recordId}`: fix an error record | Not implemented (`src/routes/record.routes.js` is an empty skeleton) |
| E10 | `GET /api/reports/imports`: data-quality report per import | Not implemented (`src/routes/report.routes.js` is an empty skeleton) |

## 4. How the real examples were produced

1. Start from an empty database: `docker compose down -v`, then `docker compose up -d --build` (see the README).
2. Run the recorder inside the app container and save its output: `docker compose exec -T app node scripts/capture-api-examples.js > examples.json`.
3. The script logs in as the two sample accounts, calls every endpoint above (successes and the error cases shown), and prints each request and response as JSON. Only the access token is shortened, to its first 16 characters.
4. This document embeds those recorded requests and responses without editing them. Because the recorder writes data (it creates a customer and an account, imports a file and decides two pairs), identifiers such as `C000013`, `I003` and the timestamps depend on the state of the database at that run.
