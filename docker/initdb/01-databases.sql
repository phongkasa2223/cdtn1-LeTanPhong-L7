-- Chạy MỘT LẦN khi volume CSDL còn trống (image mariadb tự chạy mọi file trong /docker-entrypoint-initdb.d).
-- Tài khoản ứng dụng 'mekong'@'%' đã được image tạo từ MARIADB_USER / MARIADB_PASSWORD (xem docker-compose.yml).
-- Tạo hai database với bảng mã utf8mb4_unicode_ci: so sánh không phân biệt hoa/thường và dấu, việc tìm cặp
-- nghi trùng (similarity) dựa vào đó. Các bảng của migrations/001_init.sql không ghi COLLATE nên kế thừa từ database.
CREATE DATABASE IF NOT EXISTS mekong_dq CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Database thử cho `docker compose exec app npm test`: mỗi test xóa sạch rồi nạp lại dữ liệu mẫu, nên tách khỏi mekong_dq.
CREATE DATABASE IF NOT EXISTS mekong_dq_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON mekong_dq.* TO 'mekong'@'%';
GRANT ALL PRIVILEGES ON mekong_dq_test.* TO 'mekong'@'%';
FLUSH PRIVILEGES;
