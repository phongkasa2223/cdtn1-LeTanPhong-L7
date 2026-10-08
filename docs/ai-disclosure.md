# BẢNG KHAI BÁO SỬ DỤNG CÔNG CỤ AI HỖ TRỢ
**Học phần:** Chuyên đề Tốt nghiệp 1 (Specialized Graduation Topic I)  
**Học kỳ:** HK1, Năm học 2026 – 2027  
**Phạm vi khai báo:** Toàn bộ sản phẩm trong repo đến hết Buổi 4 – phiếu phạm vi, khởi tạo repo, `docs/srs.md`, `docs/usecase.drawio`, `docs/api-contract.md`  
**Giai đoạn:** Buổi 1–4 (Tuần 1–2)

> Bảng khai báo riêng của từng bài nộp: [`docs/tuan1/ai-disclosure.md`](tuan1/ai-disclosure.md) (Buổi 1–2) và [`docs/tuan2/ai-disclosure.md`](tuan2/ai-disclosure.md) (Buổi 3–4).

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
| **Gemini** | Phân tích bài toán chất lượng dữ liệu khách hàng và nghiệp vụ case study Mekong Mobile; gợi ý chọn luồng L7; soạn bản nháp đầu của phiếu phạm vi (theo Track DA, đã được thay thế) | Phiếu phạm vi – mục 1; bản nháp | Tự đối chiếu với mô tả luồng L7 trong case study; không dùng nội dung bản nháp DA trong bản nộp cuối |
| **Claude (Anthropic)** | Chuyển phiếu phạm vi sang góc nhìn Track SE: câu phạm vi, User Story sơ bộ, ước lượng bảng dữ liệu, công nghệ Node.js + Express + MySQL | `docs/tuan1/LeTanPhong_2374802010384.docx` | Đối chiếu với 5 câu hỏi tự kiểm phạm vi ở slide Buổi 2 |
| **Claude (Anthropic)** | Tạo cấu trúc thư mục `docs/ src/ tests/ data/`, `.gitignore` và `.env.example` theo mẫu Track SE, README khung (mục 1, 2, 6) | Thư mục gốc repo | Chạy `git status --ignored` kiểm chứng `node_modules/`, `.env`, `*.log` không bị đưa vào repo |
| **Muse (Meta AI)** | Gợi ý cấu trúc SRS 6 mục, dàn ý đặc tả use case, bản nháp sơ đồ Use Case (theo Track DA, đã bị loại bỏ) | Bản nháp BT1 | Không dùng nội dung bản nháp trong bản nộp |
| **Claude (Anthropic)** | Rà soát lỗi bản nháp BT1 (sai «include»/«extend», truy vết FR → User Story sai, MoSCoW lệch, tên bảng nằm trong User Story, quy tắc mâu thuẫn với đặc tả, dữ liệu kiểm thử sai); chuyển phân tích sang Track SE; đề xuất 8 User Story kèm tiêu chí Given–When–Then, 9 FR, 5 NFR, 7 quy tắc nghiệp vụ, bảng truy vết, đặc tả UC1 và UC5 | `docs/srs.md`, file Word báo cáo buổi 4 trong `docs/tuan2/` | Đối chiếu slide Buổi 3–4 (cấu trúc SRS 6 mục, INVEST, MoSCoW, checklist 10 mục) và case study; tự quyết định nội dung cuối cùng |
| **Claude (Anthropic)** | Vẽ Use Case Diagram bằng draw.io (2 actor, 7 use case, 1 quan hệ «extend», ranh giới, chú thích) và trang đặc tả UC1, UC5 kèm luồng ngoại lệ | `docs/usecase.drawio` | Render bằng trình xem diagrams.net và kiểm tra từng vùng: không có đường nối cắt qua use case, mũi tên đúng chiều, không có chữ tràn khung |
| **Claude (Anthropic)** | Soạn API contract theo mẫu Track SE: 11 endpoint, đặc tả chi tiết 6 endpoint cho 3 story MUST (request/response JSON, mã HTTP), quy ước phản hồi lỗi, bảng validation từng trường | `docs/api-contract.md` | Kiểm tra mỗi endpoint truy vết được về một User Story và mỗi mã lỗi khớp bảng thuật ngữ của SRS |
| *--- không dùng ---* | *Các phần tự thực hiện* | Chọn luồng L7, tạo tài khoản và repo GitHub, quyết định nội dung cuối cùng, peer review, nộp bài trên E-learning | Tự thực hiện |

*Ghi chú:*
- Nếu ở bài nộp này sinh viên **hoàn toàn không sử dụng bất kỳ công cụ AI nào**, hãy ghi rõ `Không sử dụng công cụ AI` vào bảng.

---

### III. CAM KẾT VỀ LIÊM CHÍNH HỌC THUẬT

> **"Tôi xác nhận đã đọc, hiểu và chịu trách nhiệm về toàn bộ nội dung nộp."**

* **Chữ ký / Họ tên sinh viên:** Lê Tấn Phong  
* **Ngày khai báo:** 08/10/2026
