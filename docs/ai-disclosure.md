# BẢNG KHAI BÁO SỬ DỤNG CÔNG CỤ AI HỖ TRỢ
**Học phần:** Chuyên đề Tốt nghiệp 1 (Specialized Graduation Topic I)  
**Học kỳ:** HK1, Năm học 2026 – 2027  
**Bài nộp:** Bài tập 1 – Phân tích và Thiết kế (`BT1_2374802010384_LeTanPhong.pdf`)  
**Giai đoạn:** Buổi 1–6 (Tuần 1–3)

---

### I. THÔNG TIN SINH VIÊN
* **Họ và tên:** Lê Tấn Phong
* **Mã số sinh viên:** 2374802010384
* **Chuyên ngành (Track):** [x] SE   [ ] DA   [ ] AI
* **Luồng nghiệp vụ đã chọn:** L7 – Chất lượng dữ liệu khách hàng
* **Repo GitHub:** https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7

---

### II. BẢNG KHAI BÁO CHI TIẾT

| Công cụ AI | Dùng vào việc gì | Áp dụng ở phần nào (File / Mục) | Đã kiểm chứng & Chỉnh sửa thế nào |
| :--- | :--- | :--- | :--- |
| **Gemini** | Phân tích bài toán chất lượng dữ liệu khách hàng của case study Mekong Mobile; gợi ý chọn luồng L7; bản nháp đầu phiếu phạm vi (theo Track DA, đã được thay thế) | Phiếu phạm vi (Buổi 2) | Đối chiếu với mô tả luồng L7 trong case study; không dùng nội dung bản nháp DA trong bài nộp |
| **Muse (Meta AI)** | Gợi ý cấu trúc SRS 6 mục, dàn ý đặc tả use case, bản nháp sơ đồ Use Case (theo Track DA) | Bản nháp BT1 (đã loại bỏ) | Không dùng nội dung bản nháp trong bài nộp |
| **Claude (Anthropic)** | Rà soát lỗi bản nháp BT1 (sai «include»/«extend», truy vết FR → User Story sai, MoSCoW lệch, tên bảng nằm trong User Story, quy tắc nghiệp vụ mâu thuẫn với đặc tả); chuyển phân tích sang Track SE; đề xuất 7 User Story dạng bảng, mỗi story có tiêu chí Given–When–Then, 8 FR, 5 NFR có ngưỡng số, 8 quy tắc nghiệp vụ (theo Bảng 9.1 của case study), bảng thuật ngữ, bảng truy vết, đặc tả UC1 và UC5 | Mục 1 – SRS, Mục 2 – Use Case; `docs/srs.md` | Đối chiếu đề BT1 và slide Buổi 3–4 (cấu trúc SRS 6 mục, INVEST, MoSCoW, checklist); tự quyết định nội dung cuối cùng |
| **Claude (Anthropic)** | Vẽ Use Case Diagram (2 actor, 7 use case, 1 quan hệ «extend»), sơ đồ kiến trúc phân lớp, ERD 6 bảng chuẩn 3NF và wireframe 3 màn hình bằng draw.io; viết 4 câu lập luận kiến trúc gắn với NFR1, NFR2, NFR3, NFR5 và SQL DDL skeleton cho MySQL; đối chiếu mô hình dữ liệu với từ điển dữ liệu (mục 8) và quy tắc QT-01, QT-02, QT-13, QT-14, QT-15 của case study Smart CRM | Mục 2–5; `docs/usecase.drawio`, `docs/architecture.drawio`, `docs/erd.drawio`, `docs/schema.sql`, `docs/wireframe.drawio` | Render từng sơ đồ bằng trình xem diagrams.net và soát chữ, đường nối; phân tích cú pháp DDL theo phương ngữ MySQL (6 bảng, 9 khóa ngoại); đối chiếu từng trường wireframe với cột ERD và bảng thuật ngữ |
| **Claude (Anthropic)** | Soạn API contract theo mẫu Track SE (11 endpoint, đặc tả chi tiết 6 endpoint cho 3 story MUST, mã HTTP, bảng validation); gộp báo cáo thành file PDF | `docs/api-contract.md`; `BT1_2374802010384_LeTanPhong.pdf` | Kiểm tra mỗi endpoint truy vết về một User Story, mã lỗi khớp bảng thuật ngữ; xem lại từng trang PDF |
| *--- không dùng ---* | *Các phần tự thực hiện* | Chọn luồng L7, tạo repo GitHub, quyết định nội dung cuối cùng, nộp bài trên E-learning | Tự thực hiện |

*Ghi chú:*
- Nếu ở bài nộp này sinh viên **hoàn toàn không sử dụng bất kỳ công cụ AI nào**, hãy ghi rõ `Không sử dụng công cụ AI` vào bảng.

---

### III. CAM KẾT VỀ LIÊM CHÍNH HỌC THUẬT

> **"Tôi xác nhận đã đọc, hiểu và chịu trách nhiệm về toàn bộ nội dung nộp."**

* **Chữ ký / Họ tên sinh viên:** Lê Tấn Phong  
* **Mã số sinh viên:** 2374802010384  
* **Ngày khai báo:** 10/10/2026
