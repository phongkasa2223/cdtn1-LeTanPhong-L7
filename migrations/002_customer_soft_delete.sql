-- Bài tập 2 (S1): xóa MỀM hồ sơ khách hàng. BR5 (QT-13) chỉ cấm xóa VẬT LÝ nên hồ sơ vẫn nằm trong bảng,
-- chỉ được đánh dấu deleted_at. NULL là hồ sơ còn dùng.
-- Chạy lại được: kiểm information_schema trước khi ALTER (MariaDB có ADD COLUMN IF NOT EXISTS, MySQL 8.0 thì không).
SET @has_deleted_at := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer' AND COLUMN_NAME = 'deleted_at'
);
SET @ddl := IF(@has_deleted_at = 0,
  'ALTER TABLE customer ADD COLUMN deleted_at DATETIME NULL AFTER merged_into_id',
  'SELECT 1');
PREPARE add_deleted_at FROM @ddl;
EXECUTE add_deleted_at;
DEALLOCATE PREPARE add_deleted_at;
