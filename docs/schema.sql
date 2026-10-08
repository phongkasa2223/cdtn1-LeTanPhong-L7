-- SQL DDL skeleton – Luồng L7, Track SE – MySQL 8.0 (InnoDB, utf8mb4)
-- Khớp với docs/erd.drawio. Mã yêu cầu ghi trong chú thích (FR, NFR, BR).

CREATE TABLE app_user (
  user_id        BIGINT       NOT NULL AUTO_INCREMENT,
  username       VARCHAR(50)  NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,                 -- NFR2: không lưu mật khẩu dạng đọc được
  full_name      VARCHAR(100) NOT NULL,
  role           ENUM('DATA_STAFF','DATA_MANAGER') NOT NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uk_user_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE import_batch (                             -- Lần nhập (FR1, FR3)
  import_batch_id BIGINT       NOT NULL AUTO_INCREMENT,
  import_code     VARCHAR(10)  NOT NULL,                -- ví dụ I001
  source          ENUM('RETAIL','WARRANTY') NOT NULL,
  file_name       VARCHAR(255) NOT NULL,
  imported_by     BIGINT       NOT NULL,
  imported_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (import_batch_id),
  UNIQUE KEY uk_batch_code (import_code),
  KEY idx_batch_imported_at (imported_at),              -- FR3: mới nhất trước
  CONSTRAINT fk_batch_user FOREIGN KEY (imported_by) REFERENCES app_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE customer (                                 -- Hồ sơ khách hàng (FR2, FR6, FR7)
  customer_id    BIGINT       NOT NULL AUTO_INCREMENT,
  customer_code  VARCHAR(10)  NOT NULL,                 -- ví dụ C000123
  full_name      VARCHAR(100) NOT NULL,
  phone          CHAR(10)     NOT NULL,                 -- BR2: 10 chữ số sau chuẩn hóa
  email          VARCHAR(100) NULL,
  address        VARCHAR(255) NULL,
  birth_date     DATE         NULL,
  created_date   DATE         NOT NULL,
  merged_into_id BIGINT       NULL,                     -- FR6: hồ sơ đã gộp trỏ tới hồ sơ giữ lại
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (customer_id),
  UNIQUE KEY uk_customer_code (customer_code),
  KEY idx_customer_phone (phone),                       -- FR2, FR7: tìm trùng, tra cứu SĐT
  KEY idx_customer_email (email),                       -- FR2: tìm trùng theo email
  CONSTRAINT fk_customer_merged FOREIGN KEY (merged_into_id) REFERENCES customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE import_record (                            -- Bản ghi nhập (FR1, FR4, FR5)
  record_id        BIGINT       NOT NULL AUTO_INCREMENT,
  import_batch_id  BIGINT       NOT NULL,
  row_no           INT          NOT NULL,
  raw_full_name    VARCHAR(255) NULL,                   -- giá trị gốc, không sửa (BR6)
  raw_phone        VARCHAR(50)  NULL,
  raw_email        VARCHAR(255) NULL,
  raw_address      VARCHAR(255) NULL,
  raw_birth_date   VARCHAR(30)  NULL,
  raw_created_date VARCHAR(30)  NULL,
  full_name        VARCHAR(100) NULL,                   -- giá trị sau chuẩn hóa / sau khi sửa (FR5)
  phone            VARCHAR(20)  NULL,
  email            VARCHAR(100) NULL,
  address          VARCHAR(255) NULL,
  birth_date       VARCHAR(30)  NULL,
  created_date     VARCHAR(30)  NULL,
  customer_id      BIGINT       NULL,                   -- NULL khi bản ghi còn lỗi (BR3)
  PRIMARY KEY (record_id),
  UNIQUE KEY uk_record_batch_row (import_batch_id, row_no),
  KEY idx_record_batch (import_batch_id),               -- NFR1, FR4
  CONSTRAINT fk_record_batch FOREIGN KEY (import_batch_id) REFERENCES import_batch (import_batch_id),
  CONSTRAINT fk_record_customer FOREIGN KEY (customer_id) REFERENCES customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE record_error (                             -- Lỗi bản ghi (FR2, FR4, FR8)
  error_id     BIGINT       NOT NULL AUTO_INCREMENT,
  record_id    BIGINT       NOT NULL,
  error_code   ENUM('MISSING_FIELD','PHONE_LENGTH','PHONE_PREFIX',
                    'PHONE_CHAR','EMAIL_INVALID','DATE_INVALID') NOT NULL,
  field_name   VARCHAR(30)  NOT NULL,
  message      VARCHAR(255) NOT NULL,
  resolved_at  DATETIME     NULL,                       -- FR5: thời điểm lỗi được khắc phục
  PRIMARY KEY (error_id),
  KEY idx_error_record (record_id),
  KEY idx_error_code (error_code, record_id),           -- NFR1, FR4: lọc theo mã lỗi
  CONSTRAINT fk_error_record FOREIGN KEY (record_id) REFERENCES import_record (record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE duplicate_pair (                           -- Cặp nghi trùng (FR2, FR6, FR8)
  pair_id          BIGINT       NOT NULL AUTO_INCREMENT,
  pair_code        VARCHAR(10)  NOT NULL,               -- ví dụ P0007
  import_batch_id  BIGINT       NOT NULL,               -- lần nhập phát sinh cặp
  customer_a_id    BIGINT       NOT NULL,
  customer_b_id    BIGINT       NOT NULL,
  matched_by       ENUM('PHONE','EMAIL') NOT NULL,
  similarity       DECIMAL(3,2) NOT NULL,               -- 0.00 – 1.00
  status           ENUM('PENDING','MERGED','KEEP_SEPARATE') NOT NULL DEFAULT 'PENDING',
  decided_by       BIGINT       NULL,
  decided_at       DATETIME     NULL,
  PRIMARY KEY (pair_id),
  UNIQUE KEY uk_pair_code (pair_code),
  UNIQUE KEY uk_pair_customers (customer_a_id, customer_b_id),
  KEY idx_pair_status_sim (status, similarity),         -- FR6: cặp chờ duyệt, sắp theo điểm
  CONSTRAINT fk_pair_batch FOREIGN KEY (import_batch_id) REFERENCES import_batch (import_batch_id),
  CONSTRAINT fk_pair_customer_a FOREIGN KEY (customer_a_id) REFERENCES customer (customer_id),
  CONSTRAINT fk_pair_customer_b FOREIGN KEY (customer_b_id) REFERENCES customer (customer_id),
  CONSTRAINT fk_pair_decider FOREIGN KEY (decided_by) REFERENCES app_user (user_id),
  CONSTRAINT ck_pair_distinct CHECK (customer_a_id <> customer_b_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
