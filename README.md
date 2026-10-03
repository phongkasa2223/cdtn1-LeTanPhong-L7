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
- Node.js 20 LTS trở lên (Express)
- MySQL 8.0
- Biến môi trường: xem `.env.example`

## 3. Hướng dẫn chạy
*(Hoàn thiện ở BT2 – tối đa 4 bước.)*

## 4. Cấu trúc thư mục
| Thư mục | Nội dung |
| :--- | :--- |
| `docs/` | Tài liệu: SRS (`srs.md`), khai báo sử dụng AI, tài liệu nộp theo tuần (`tuan1/`, `tuan2/`) |
| `src/` | Mã nguồn API (Node.js/Express) |
| `tests/` | Kiểm thử tự động |
| `data/` | File CSV khách hàng mẫu để thử chức năng nhập |

## 5. Kiểm thử
*(Hoàn thiện ở BT2.)*

## 6. Trạng thái hiện tại
- [x] Khởi tạo repo, cấu trúc thư mục, `.gitignore`, `.env.example`, README khung (buổi 2)
- [ ] Khởi tạo project Node.js và smoke test `GET /health` (buổi 2)
- [x] Bản SRS rút gọn (`docs/srs.md`) và Use Case Diagram (`docs/tuan2/UseCase_L7_DataQuality.drawio`) – Bài tập 1 (buổi 3–4)
- [x] API contract (Phần 3 trong `docs/tuan2/Baocaobuoi4–LeTanPhong–2374802010384–Track SE–L7.docx`) – Bài tập 1 (buổi 4)
- [ ] Module nhập file và kiểm tra bản ghi khách hàng (buổi 8–10)
- [ ] Module duyệt gộp hồ sơ trùng và báo cáo chất lượng (buổi 10–12)
