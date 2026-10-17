-- Dữ liệu mẫu SINH GIẢ để thử Sprint 1 (không phải dữ liệu thật).
-- Chạy lại được: khóa chính ghi tường minh + ON DUPLICATE KEY UPDATE, nên chạy lần 2 không nhân đôi dòng.
-- Mật khẩu mẫu của cả 3 tài khoản: Demo@123 (lưu dạng băm scrypt, NFR2).
-- Bộ dữ liệu thật (customers_raw.csv) sẽ được nạp qua chức năng nhập file ở Sprint 2.

INSERT INTO app_user (user_id, username, password_hash, full_name, role, store_code) VALUES
  (1, 'nv.lan',   'scrypt$6d656b6f6e672d64656d6f2d73616c7421$62528defd1c1cf5496fcdf5532159ec088d54254024dd147b99d2d650ec29886', 'Chị Lan',  'DATA_STAFF',   'CH01'),
  (2, 'nv.minh',  'scrypt$6d656b6f6e672d64656d6f2d73616c7421$62528defd1c1cf5496fcdf5532159ec088d54254024dd147b99d2d650ec29886', 'Anh Minh', 'DATA_STAFF',   'CH02'),
  (3, 'ql.hung',  'scrypt$6d656b6f6e672d64656d6f2d73616c7421$62528defd1c1cf5496fcdf5532159ec088d54254024dd147b99d2d650ec29886', 'Anh Hùng', 'DATA_MANAGER', NULL)
ON DUPLICATE KEY UPDATE
  username = VALUES(username), password_hash = VALUES(password_hash), full_name = VALUES(full_name),
  role = VALUES(role), store_code = VALUES(store_code);

-- Hồ sơ 11 được liệt kê trước hồ sơ 10 vì hồ sơ 10 đã gộp vào 11 (khóa ngoại tự tham chiếu, QT-13).
INSERT INTO customer (customer_id, customer_code, full_name, phone, email, address, birth_date, created_date, merged_into_id) VALUES
  (1,  'C000001', 'Nguyễn Văn An',  '0901234567', 'an.nguyen@gmail.com',  NULL,                          '1990-05-12', '2024-03-10', NULL),
  (2,  'C000002', 'Nguyen Van An',  '0987654321', 'an.nguyen@gmail.com',  '45 Nguyễn Huệ, Q.1, TP.HCM',  '1990-05-12', '2025-01-15', NULL),
  (3,  'C000003', 'Trần Thị Bích',  '0912345678', 'bich.tran@yahoo.com',  '12 Lê Lợi, Q.1, TP.HCM',      '1985-11-02', '2024-06-21', NULL),
  (4,  'C000004', 'Lê Hoàng Nam',   '0932111222', NULL,                   'Ninh Kiều, Cần Thơ',          '1992-07-20', '2024-08-02', NULL),
  (5,  'C000005', 'Lê Hoàng Nam',   '0976333444', NULL,                   NULL,                          '1992-07-20', '2025-02-11', NULL),
  (6,  'C000006', 'Phạm Quốc Huy',  '0368123456', 'huy.pham@gmail.com',   '8 Hai Bà Trưng, Hà Nội',      '1988-01-30', '2024-09-17', NULL),
  (7,  'C000007', 'Võ Thị Mai',     '0789456123', NULL,                   NULL,                          NULL,         '2025-03-05', NULL),
  (8,  'C000008', 'Đặng Minh Tuấn', '0859001122', 'tuan.dang@outlook.com', '77 Cách Mạng Tháng 8, Q.3',  '1995-12-25', '2025-04-19', NULL),
  (9,  'C000009', 'Hoàng Thu Hà',   '0583777888', NULL,                   NULL,                          '1991-03-08', '2025-05-30', NULL),
  (11, 'C000011', 'Bùi Anh Khoa',   '0765432199', 'khoa.bui@gmail.com',   '20 Trần Hưng Đạo, Q.5',       '1993-09-14', '2024-11-01', NULL),
  (10, 'C000010', 'Bùi Anh Khoa',   '0765432198', 'khoa.bui@gmail.com',   NULL,                          '1993-09-14', '2024-10-05', 11),
  (12, 'C000012', 'Lý Gia Bảo',     '0334556677', 'bao.ly@gmail.com',     '5 Nguyễn Trãi, Q.5',          '1987-04-18', '2025-06-12', NULL)
ON DUPLICATE KEY UPDATE
  customer_code = VALUES(customer_code), full_name = VALUES(full_name), phone = VALUES(phone),
  email = VALUES(email), address = VALUES(address), birth_date = VALUES(birth_date),
  created_date = VALUES(created_date), merged_into_id = VALUES(merged_into_id);

INSERT INTO import_batch (import_batch_id, import_code, source, file_name, imported_by, imported_at) VALUES
  (1, 'I001', 'RETAIL',   'customers_retail_demo.csv',   1, '2026-10-01 09:00:00'),
  (2, 'I002', 'WARRANTY', 'customers_warranty_demo.csv', 2, '2026-10-05 14:30:00')
ON DUPLICATE KEY UPDATE
  import_code = VALUES(import_code), source = VALUES(source), file_name = VALUES(file_name),
  imported_by = VALUES(imported_by), imported_at = VALUES(imported_at);

INSERT INTO stg_customer (stg_customer_id, import_batch_id, row_no, raw_full_name, raw_phone, raw_email,
                          raw_created_date, full_name, phone, email, created_date, customer_id) VALUES
  (1, 1, 1, 'nguyễn văn an', '0901 234 567', 'An.Nguyen@gmail.com', '10/03/2024',
            'Nguyễn Văn An', '0901234567', 'an.nguyen@gmail.com', '2024-03-10', 1),
  (2, 1, 2, 'Trần Thị Bích', '09123456',     'bich.tran@yahoo.com', '2024-06-21',
            'Trần Thị Bích', NULL,          'bich.tran@yahoo.com', '2024-06-21', NULL)
ON DUPLICATE KEY UPDATE
  raw_full_name = VALUES(raw_full_name), raw_phone = VALUES(raw_phone), raw_email = VALUES(raw_email),
  raw_created_date = VALUES(raw_created_date), full_name = VALUES(full_name), phone = VALUES(phone),
  email = VALUES(email), created_date = VALUES(created_date), customer_id = VALUES(customer_id);

INSERT INTO dq_result (dq_result_id, stg_customer_id, rule_code, field_name, message) VALUES
  (1, 2, 'PHONE_LENGTH', 'phone', 'Số điện thoại phải có 10 chữ số, bản ghi có 8 chữ số.')
ON DUPLICATE KEY UPDATE
  stg_customer_id = VALUES(stg_customer_id), rule_code = VALUES(rule_code),
  field_name = VALUES(field_name), message = VALUES(message);

INSERT INTO duplicate_pair (pair_id, pair_code, import_batch_id, customer_a_id, customer_b_id, matched_by, similarity, status) VALUES
  (1, 'P0001', 1, 1, 2, 'EMAIL',          0.93, 'PENDING'),
  (2, 'P0002', 1, 4, 5, 'NAME_BIRTHDATE', 0.88, 'PENDING')
ON DUPLICATE KEY UPDATE
  pair_code = VALUES(pair_code), import_batch_id = VALUES(import_batch_id),
  customer_a_id = VALUES(customer_a_id), customer_b_id = VALUES(customer_b_id),
  matched_by = VALUES(matched_by), similarity = VALUES(similarity), status = VALUES(status);
