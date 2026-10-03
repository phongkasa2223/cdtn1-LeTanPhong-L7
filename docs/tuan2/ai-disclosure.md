# BẢNG KHAI BÁO SỬ DỤNG CÔNG CỤ AI HỖ TRỢ
**Học phần:** Chuyên đề Tốt nghiệp 1 (Specialized Graduation Topic I)  
**Học kỳ:** HK1, Năm học 2026 – 2027  
**Bài nộp:** Bài tập 1 – Phần 1 (SRS rút gọn), Phần 2 (Use Case Diagram + đặc tả Use Case), Phần 3 (API contract – Track SE)  
**Giai đoạn:** Tuần 2 – Buổi 3–4 (Phân tích yêu cầu và Đặc tả kỹ thuật)

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
| **Muse (Meta AI)** | Gợi ý cấu trúc SRS 6 mục, dàn ý đặc tả use case, sinh bản nháp sơ đồ Use Case L7 | Bản nháp BT1 (viết theo Track DA) | Bản nháp đã bị loại bỏ vì làm theo Track DA trong khi sinh viên học chuyên ngành Công nghệ phần mềm (Track SE) |
| **Claude (Anthropic)** | Rà soát bản nháp theo đề BT1 và slide Buổi 3, chỉ ra lỗi: dùng sai «include»/«extend», truy vết FR → User Story sai, mức MoSCoW lệch giữa FR và User Story, tên bảng dữ liệu nằm trong User Story (vi phạm tiêu chí Negotiable của INVEST), quy tắc nghiệp vụ mâu thuẫn với đặc tả use case, dữ liệu kiểm thử sai (đầu số 099 là đầu số di động có thật) | Bản nháp BT1 | Sinh viên đối chiếu từng lỗi với slide Buổi 3 (mục 03 – Use Case, mục 04 – SRS & bảng truy vết, mục 06 – tiêu chí chấm BT1) |
| **Claude (Anthropic)** | Chuyển toàn bộ phân tích sang góc nhìn Track SE (ứng dụng web + REST API, actor là người dùng ứng dụng); đề xuất 8 User Story kèm tiêu chí Given–When–Then và bảng tự kiểm INVEST, 9 FR, 5 NFR có ngưỡng đo, 7 quy tắc nghiệp vụ, bảng truy vết, đặc tả UC1 và UC5 | `Baocaobuoi4–LeTanPhong–2374802010384–Track SE–L7.docx` – toàn bộ Phần 1 và Phần 2 | AI chỉ đề xuất. Sinh viên tự quyết định nội dung cuối cùng, kiểm tra thuật ngữ thống nhất giữa SRS và sơ đồ, đối chiếu với phiếu phạm vi Track SE và case study Mekong Mobile |
| **Claude (Anthropic)** | Soạn API contract theo mẫu Track SE: danh sách 11 endpoint, đặc tả chi tiết 6 endpoint phục vụ 3 story MUST (request/response JSON, mã HTTP 200/201/400/401/403/404/409/500), quy ước phản hồi lỗi và bảng validation từng trường | `Baocaobuoi4–LeTanPhong–2374802010384–Track SE–L7.docx` – Phần 3 | Sinh viên đối chiếu với yêu cầu Track SE ở slide Buổi 4 (chặng 4) và kiểm tra mỗi endpoint truy vết được về một User Story, mỗi mã lỗi khớp bảng thuật ngữ của SRS |
| **Claude (Anthropic)** | Vẽ lại Use Case Diagram bằng draw.io (2 actor, 7 use case, 1 quan hệ «extend», ghi chú và chú thích), xuất ảnh PNG chèn vào báo cáo | `UseCase_L7_DataQuality.drawio`, `UseCase_L7_DataQuality.png`, Hình 1 | Sơ đồ được render bằng trình xem của diagrams.net và kiểm tra từng vùng: không có đường nối cắt qua use case, mũi tên «extend» đúng chiều, không có chữ tràn khung. Sinh viên mở lại file `.drawio` trên app.diagrams.net trước khi nộp |
| *--- không dùng ---* | *Các phần tự thực hiện* | Chọn luồng L7, quyết định nội dung cuối cùng, điền thông tin lớp, nộp bài trên Elearning | Tự thực hiện |

*Ghi chú:*
- Nếu ở bài nộp này sinh viên **hoàn toàn không sử dụng bất kỳ công cụ AI nào**, hãy ghi rõ `Không sử dụng công cụ AI` vào bảng.

---

### III. CAM KẾT VỀ LIÊM CHÍNH HỌC THUẬT

> **"Tôi xác nhận đã đọc, hiểu và chịu trách nhiệm về toàn bộ nội dung nộp."**

* **Chữ ký / Họ tên sinh viên:** Lê Tấn Phong  
* **Ngày khai báo:** 03/10/2026
