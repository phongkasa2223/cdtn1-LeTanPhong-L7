# Hệ thống kiểm tra và làm sạch dữ liệu khách hàng theo đợt, đo chất lượng dữ liệu trên dashboard

**Sinh viên:** Lê Tấn Phong – 2374802010384 – Track DA  
**Học phần:** Chuyên đề Tốt nghiệp 1, HK1 2026-2027  
**Luồng nghiệp vụ:** L7 – Chất lượng dữ liệu khách hàng (case study Mekong Mobile)

## 1. Mục tiêu
Dữ liệu khách hàng của Mekong Mobile nằm rải rác ở hệ thống bán lẻ và bảo hành, thường bị trùng lặp hồ sơ,
thiếu trường bắt buộc và sai định dạng số điện thoại. Hệ thống giúp **kỹ sư dữ liệu** trích xuất dữ liệu thô,
phát hiện lỗi, chuẩn hóa họ tên và số điện thoại, gộp hồ sơ trùng rồi nạp dữ liệu sạch vào kho dữ liệu;
**quản trị dữ liệu** theo dõi chỉ số chất lượng (completeness, validity, uniqueness, accuracy) qua từng đợt trên dashboard.

## 2. Yêu cầu môi trường
- Python 3.11 trở lên
- Thư viện: xem `requirements.txt`
- PostgreSQL 16 cho kho dữ liệu (giai đoạn đầu có thể dùng SQLite)
- Biến môi trường: xem `.env.example`

## 3. Hướng dẫn chạy
*(Hoàn thiện ở BT2 – tối đa 4 bước.)*

## 4. Cấu trúc thư mục
| Thư mục | Nội dung |
| :--- | :--- |
| `docs/` | Tài liệu: SRS, khai báo AI, ảnh minh chứng |
| `src/` | Mã nguồn pipeline xử lý dữ liệu |
| `tests/` | Kiểm thử tự động (pytest) |
| `data/` | Dữ liệu; chỉ commit mẫu nhỏ trong `data/sample/` |

## 5. Kiểm thử
*(Hoàn thiện ở BT2.)*

## 6. Trạng thái hiện tại
- [x] Khởi tạo repo, cấu trúc thư mục, `.gitignore`, `.env.example` (buổi 2)
- [ ] Smoke test đọc dữ liệu mẫu (buổi 2)
- [ ] Bản SRS và Use Case – Bài tập 1 (buổi 3–6)
- [ ] Trích xuất, phát hiện lỗi và chuẩn hóa dữ liệu
- [ ] Gộp hồ sơ trùng lặp và nạp kho dữ liệu
- [ ] Tính chỉ số chất lượng theo đợt và dashboard
