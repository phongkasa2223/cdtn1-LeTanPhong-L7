# Bản đặc tả yêu cầu rút gọn (SRS) – Luồng L7

**Sinh viên:** Lê Tấn Phong – 2374802010384 – Track SE  
**Luồng nghiệp vụ:** L7 – Chất lượng dữ liệu khách hàng (case study Mekong Mobile)  
**Sơ đồ Use Case gốc:** [`docs/usecase.drawio`](usecase.drawio)  
**API contract (Track SE):** [`docs/api-contract.md`](api-contract.md)  
**Thiết kế:** [`docs/architecture.drawio`](architecture.drawio) · [`docs/erd.drawio`](erd.drawio) · [`docs/schema.sql`](schema.sql) · [`docs/wireframe.drawio`](wireframe.drawio)  
**Bản nộp BT1 (PDF):** `BT1_2374802010384_LeTanPhong.pdf` – nội dung trùng với tài liệu này

> Cấu trúc rút gọn theo tinh thần ISO/IEC/IEEE 29148 (không tuân thủ đầy đủ chuẩn).

---

## 1. Giới thiệu và phạm vi

### 1.1. Bối cảnh
Dữ liệu khách hàng của Mekong Mobile hiện nằm rải rác ở hệ thống bán lẻ và hệ thống bảo hành, một phần còn ghi chép thủ công trên Excel. Hồ sơ trùng lặp, thiếu trường bắt buộc và số điện thoại sai định dạng xuất hiện thường xuyên; nhân viên phải rà soát bằng tay trên Excel, doanh nghiệp chưa có “góc nhìn khách hàng duy nhất” (Single Customer View) và chưa đo được tỷ lệ lỗi dữ liệu.

### 1.2. Mục tiêu hệ thống
Xây dựng **ứng dụng web và REST API** cho phép nhân viên dữ liệu nhập file khách hàng, được hệ thống tự chuẩn hóa và đánh dấu bản ghi lỗi, sửa lỗi và duyệt gộp hồ sơ nghi trùng; quản lý dữ liệu xem báo cáo tỷ lệ lỗi theo từng lần nhập.

### 1.3. Phạm vi (luồng L7)
*Nhân viên dữ liệu nhập file khách hàng từ hệ thống bán lẻ và bảo hành vào ứng dụng, hệ thống tự chuẩn hóa và đánh dấu bản ghi lỗi (thiếu trường, sai số điện thoại, nghi trùng) để nhân viên sửa lỗi và duyệt gộp hồ sơ trùng, kết thúc khi quản lý dữ liệu xem báo cáo tỷ lệ lỗi của từng lần nhập.*

- Nhập file CSV khách hàng (nguồn bán lẻ hoặc bảo hành) và xem danh sách các lần nhập.
- Tự động chuẩn hóa họ tên, số điện thoại và đánh dấu bản ghi lỗi; phát hiện cặp hồ sơ nghi trùng.
- Xem danh sách bản ghi lỗi và sửa bản ghi lỗi trên ứng dụng.
- Duyệt từng cặp hồ sơ nghi trùng: gộp hoặc giữ riêng.
- Tra cứu khách hàng theo số điện thoại.
- Báo cáo tỷ lệ lỗi và kết quả gộp theo từng lần nhập.

### 1.4. Những gì CHỦ Ý KHÔNG làm (mức WON’T của MoSCoW)
- Không kết nối trực tiếp (API, đồng bộ thời gian thực) tới hệ thống bán lẻ và bảo hành; chỉ nhận file CSV do các hệ thống đó xuất ra.
- Không sửa hay ghi ngược dữ liệu về hệ thống nguồn.
- Không tự động gộp hồ sơ khi chưa có nhân viên duyệt.
- Không phát hiện trùng giữa hai hồ sơ không chung số điện thoại và không chung email (ví dụ khách đã đổi số).
- Không xác minh số điện thoại/email với nhà mạng hoặc bằng tin nhắn.
- Không có màn hình quản lý tài khoản; tài khoản người dùng được tạo sẵn bằng script khởi tạo dữ liệu.

### 1.5. Bảng thuật ngữ
| Thuật ngữ | Tên trong ERD / API | Giải thích |
| :--- | :--- | :--- |
| Người dùng | `app_user` | Tài khoản đăng nhập; vai trò Nhân viên dữ liệu (`DATA_STAFF`) hoặc Quản lý dữ liệu (`DATA_MANAGER`). |
| Lần nhập | `import_batch` | Một lần tải một file CSV lên ứng dụng; có mã duy nhất (ví dụ I001), lưu nguồn, người nhập, thời điểm. |
| Bản ghi nhập | `import_record` | Một dòng của file đã nhập; giữ giá trị gốc và giá trị sau chuẩn hóa/sau khi sửa. |
| Mã lỗi | `record_error` | `MISSING_FIELD` – thiếu trường bắt buộc; `PHONE_LENGTH` – SĐT sau chuẩn hóa không đủ 10 chữ số; `PHONE_PREFIX` – đầu số không thuộc danh mục đầu số di động Việt Nam; `PHONE_CHAR` – SĐT chứa ký tự khác chữ số; `EMAIL_INVALID` – email sai định dạng; `DATE_INVALID` – ngày sai định dạng hoặc ở tương lai. |
| Hồ sơ khách hàng | `customer` | Bản ghi hợp lệ đã vào danh sách khách hàng; mỗi khách hàng thật chỉ nên có một hồ sơ (Single Customer View). |
| Cặp nghi trùng | `duplicate_pair` | Hai hồ sơ cùng SĐT đã chuẩn hóa hoặc cùng email; trạng thái Chờ duyệt (`PENDING`), Đã gộp (`MERGED`), Giữ riêng (`KEEP_SEPARATE`). |
| Trường bắt buộc | — | Họ tên, số điện thoại (SĐT), ngày tạo. |
| Chuẩn hóa | — | Họ tên: bỏ khoảng trắng thừa, viết hoa chữ cái đầu mỗi từ. SĐT: bỏ khoảng trắng, dấu chấm, gạch nối; đổi +84/84 thành 0. Email: chữ thường. |
| Điểm tương đồng | `similarity` | Số từ 0 đến 1 đo mức giống nhau của họ tên hai hồ sơ; chỉ để sắp xếp và gợi ý, không dùng để tự gộp. |
| Tỷ lệ lỗi | — (tính khi truy vấn) | Số bản ghi có ít nhất một mã lỗi / tổng số bản ghi của lần nhập × 100%. |

## 2. Các bên liên quan và vai trò người dùng
| Vai trò (Actor) | Mô tả | Được làm | Không được làm |
| :--- | :--- | :--- | :--- |
| Nhân viên dữ liệu | Nhân viên phụ trách dữ liệu khách hàng, người dùng chính của ứng dụng | Nhập file; xem danh sách lần nhập; xem và sửa bản ghi lỗi; duyệt cặp nghi trùng; tra cứu khách hàng. | Xem báo cáo tổng hợp; xóa lần nhập; tách hồ sơ đã gộp. |
| Quản lý dữ liệu | Người chịu trách nhiệm chất lượng dữ liệu khách hàng | Xem báo cáo theo lần nhập; tra cứu khách hàng. | Nhập file; sửa bản ghi; duyệt cặp nghi trùng (tách bạch người làm và người kiểm soát). |

## 3. Yêu cầu chức năng và User Story

### 3.1. Danh sách yêu cầu chức năng
| Mã | Yêu cầu chức năng (phát biểu kiểm chứng được) |
| :---: | :--- |
| FR1 | Hệ thống cho phép nhân viên dữ liệu tải lên một file CSV khách hàng (tối đa 5 MB) kèm nguồn (bán lẻ / bảo hành), kiểm tra file có đủ các cột bắt buộc, tạo một lần nhập có mã duy nhất và lưu toàn bộ bản ghi của file. |
| FR2 | Với mỗi bản ghi được nhập hoặc được sửa, hệ thống chuẩn hóa họ tên, SĐT, email, gắn mã lỗi cho bản ghi vi phạm, đưa bản ghi không lỗi vào danh sách khách hàng và tạo cặp nghi trùng khi bản ghi trùng SĐT chuẩn hoặc email với một hồ sơ đã có. |
| FR3 | Hệ thống hiển thị danh sách các lần nhập, mới nhất trước; mỗi dòng có mã lần nhập, nguồn, người nhập, thời điểm, tổng bản ghi và số bản ghi lỗi. |
| FR4 | Hệ thống hiển thị danh sách bản ghi lỗi của một lần nhập, lọc được theo mã lỗi, phân trang 50 dòng mỗi trang; mỗi dòng có giá trị gốc và mô tả lỗi. |
| FR5 | Hệ thống cho phép sửa họ tên, SĐT, email, địa chỉ, ngày sinh, ngày tạo của một bản ghi lỗi; khi lưu, bản ghi được kiểm tra lại theo FR2, chỉ được lưu khi không còn lỗi và các mã lỗi cũ được đánh dấu đã khắc phục. |
| FR6 | Hệ thống hiển thị từng cặp nghi trùng cạnh nhau kèm điểm tương đồng; nhân viên chọn Gộp (chọn hồ sơ giữ lại) hoặc Giữ riêng; hệ thống lưu người quyết định và thời điểm. |
| FR7 | Hệ thống tìm khách hàng theo SĐT (chuẩn hóa SĐT nhập vào trước khi tìm) và trả về hồ sơ kèm danh sách bản ghi nguồn. |
| FR8 | Hệ thống hiển thị báo cáo theo từng lần nhập: tổng bản ghi, số và tỷ lệ bản ghi lỗi theo mã lỗi, số cặp nghi trùng đã gộp / giữ riêng / chờ duyệt; chỉ vai trò Quản lý dữ liệu xem được. |

### 3.2. User Story (kèm mức MoSCoW và tiêu chí chấp nhận Given–When–Then)

**US1 [MUST]** Là nhân viên dữ liệu, tôi muốn nhập file CSV khách hàng xuất từ hệ thống bán lẻ hoặc bảo hành vào ứng dụng để toàn bộ hồ sơ được tự động kiểm tra và chuẩn hóa thay vì rà soát thủ công trên Excel.
- AC1. GIVEN file CSV hợp lệ có 1.000 dòng, nguồn “Bán lẻ”; WHEN nhân viên tải lên; THEN hệ thống tạo một lần nhập mới, lưu đủ 1.000 bản ghi và hiển thị số bản ghi hợp lệ, số bản ghi lỗi, số cặp nghi trùng.
- AC2 (ngoại lệ). GIVEN file thiếu cột số điện thoại; WHEN tải lên; THEN hệ thống từ chối, thông báo nêu rõ cột còn thiếu và không tạo lần nhập.
- AC3. GIVEN dòng có họ tên “  NGUYỄN   văn  AN ” và SĐT “+84 901 234 567”; WHEN nhập; THEN bản ghi được lưu với “Nguyễn Văn An” và “0901234567”, không bị gắn mã lỗi.

**US2 [SHOULD]** Là nhân viên dữ liệu, tôi muốn xem danh sách các lần nhập đã thực hiện để biết file nào đã được xử lý và chọn lần nhập cần xem lỗi.
- AC1. GIVEN đã có 3 lần nhập I001, I002, I003; WHEN mở danh sách lần nhập; THEN I003 hiển thị đầu tiên, mỗi dòng có nguồn, người nhập, thời điểm, tổng bản ghi, số bản ghi lỗi.
- AC2. GIVEN chưa có lần nhập nào; WHEN mở danh sách; THEN hiển thị “Chưa có lần nhập nào”.

**US3 [MUST]** Là nhân viên dữ liệu, tôi muốn xem danh sách bản ghi lỗi của một lần nhập và lọc theo loại lỗi để biết cần xử lý bản ghi nào.
- AC1. GIVEN lần nhập I001 có 45 bản ghi lỗi, trong đó 20 bản ghi PHONE_LENGTH; WHEN lọc theo PHONE_LENGTH; THEN danh sách hiện đúng 20 bản ghi, mỗi dòng có giá trị gốc và mô tả lỗi.
- AC2. GIVEN lần nhập không có bản ghi lỗi; WHEN mở danh sách; THEN hiển thị “Lần nhập này không có bản ghi lỗi”.
- AC3 (ngoại lệ). GIVEN không có lần nhập mã I999; WHEN mở danh sách bản ghi lỗi của I999; THEN hệ thống báo “Không tìm thấy lần nhập I999”.

**US4 [SHOULD]** Là nhân viên dữ liệu, tôi muốn sửa trực tiếp một bản ghi lỗi trên ứng dụng để bản ghi được kiểm tra lại ngay mà không phải sửa file rồi nhập lại.
- AC1. GIVEN bản ghi có SĐT “09012345” (mã PHONE_LENGTH); WHEN nhân viên sửa thành “0901234567” và bấm Lưu; THEN mã lỗi được đánh dấu đã khắc phục và bản ghi được đưa vào danh sách khách hàng.
- AC2 (ngoại lệ). GIVEN nhân viên sửa SĐT thành “0111234567” (đầu số 011 không thuộc danh mục); WHEN bấm Lưu; THEN hệ thống từ chối, báo “Đầu số không hợp lệ” và giữ nguyên dữ liệu đang nhập trên form.

**US5 [MUST]** Là nhân viên dữ liệu, tôi muốn duyệt từng cặp hồ sơ nghi trùng và chọn gộp hoặc giữ riêng để mỗi khách hàng thật chỉ còn một hồ sơ.
- AC1. GIVEN cặp A, B cùng SĐT “0901234567”, A thiếu email còn B có email; WHEN nhân viên chọn Gộp và giữ A; THEN chỉ còn hồ sơ A, email của A được lấy từ B, cặp chuyển sang “Đã gộp”.
- AC2. GIVEN cặp A, B cùng SĐT nhưng là hai người khác nhau (người thân dùng chung số); WHEN chọn Giữ riêng; THEN cả hai hồ sơ được giữ, cặp chuyển sang “Giữ riêng” và không hiện lại trong danh sách chờ duyệt.
- AC3 (ngoại lệ). GIVEN cặp đã được một nhân viên khác xử lý; WHEN nhân viên gửi quyết định; THEN hệ thống từ chối và báo “Cặp này đã được xử lý”.

**US6 [SHOULD]** Là nhân viên dữ liệu, tôi muốn tra cứu khách hàng theo số điện thoại để xem hồ sơ đã hợp nhất kèm nguồn gốc khi bộ phận khác cần đối chiếu.
- AC1. GIVEN có khách hàng với SĐT 0901234567; WHEN tra cứu “090 123 4567”; THEN hiển thị hồ sơ khách hàng và danh sách bản ghi nguồn (bán lẻ / bảo hành).
- AC2 (ngoại lệ). GIVEN không có khách hàng nào với SĐT đã nhập; WHEN tra cứu; THEN hiển thị “Không tìm thấy khách hàng”.

**US7 [SHOULD]** Là quản lý dữ liệu, tôi muốn xem báo cáo tỷ lệ bản ghi lỗi và số hồ sơ đã gộp của từng lần nhập để theo dõi chất lượng dữ liệu khách hàng theo thời gian.
- AC1. GIVEN lần nhập I001 có 300 bản ghi, trong đó 15 bản ghi có lỗi; WHEN mở báo cáo; THEN tỷ lệ lỗi của I001 hiển thị 5%.
- AC2 (ngoại lệ). GIVEN người dùng đăng nhập với vai trò Nhân viên dữ liệu; WHEN mở báo cáo; THEN hệ thống từ chối truy cập.

> **Ghi chú MoSCoW.** 7 story: 3 MUST (US1, US3, US5) tạo thành luồng tối thiểu nhập file → thấy lỗi → gộp hồ sơ trùng; 4 SHOULD (US2, US4, US6, US7) vì có cách làm tạm: xem kết quả ngay sau khi nhập (US2), sửa file nguồn rồi nhập lại (US4), tìm trong danh sách khách hàng (US6), đếm từ danh sách bản ghi lỗi (US7). **COULD – hướng mở rộng, không hiện thực:** Quản lý dữ liệu tách một hồ sơ bị gộp nhầm. Các mục WON’T ở mục 1.4.

### 3.3. Tự kiểm INVEST
| Story | I | N | V | E | S | T | Ghi chú |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| US1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Story lớn nhất (khoảng 3 ngày); nếu vượt, tách phần tìm cặp nghi trùng thành story riêng. |
| US2 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| US3 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| US4 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Dùng lại quy tắc kiểm tra của US1, không cần US1 xong trước nếu có dữ liệu mẫu. |
| US5 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| US6 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| US7 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |

*I – độc lập, N – thương lượng được (không nêu công nghệ, tên bảng), V – có giá trị cho người dùng, E – ước lượng được, S – làm xong trong 1–3 ngày, T – kiểm thử được bằng tiêu chí chấp nhận.*

## 4. Yêu cầu phi chức năng
| Mã | Loại | Phát biểu yêu cầu (có ngưỡng đo được) |
| :---: | :--- | :--- |
| NFR1 | Hiệu năng | Nhập một file 3.000 dòng (kiểm tra, chuẩn hóa, tìm cặp nghi trùng) hoàn tất trong dưới 30 giây; danh sách bản ghi lỗi hiển thị trong dưới 2 giây khi lần nhập có 10.000 bản ghi; đo trên máy 8 GB RAM. |
| NFR2 | Bảo mật | Mọi chức năng trừ kiểm tra tình trạng hệ thống (health check) yêu cầu đăng nhập; tài khoản Nhân viên dữ liệu gọi chức năng báo cáo bị từ chối 100% số lần; mật khẩu không được lưu ở dạng đọc được trong cơ sở dữ liệu. |
| NFR3 | Tin cậy | Nhập file được lưu theo giao dịch: nếu lỗi giữa chừng (ví dụ mất kết nối cơ sở dữ liệu) thì 0 bản ghi của file được lưu và không có lần nhập dở dang. |
| NFR4 | Khả dụng | Nhân viên dữ liệu mới, sau 5 phút được hướng dẫn, duyệt xong một cặp nghi trùng trong dưới 1 phút mà không cần hỏi đồng nghiệp. |
| NFR5 | Bảo trì | Thêm một đầu số di động mới chỉ cần sửa file cấu hình danh mục đầu số, không sửa mã nguồn. |

## 5. Ràng buộc và quy tắc nghiệp vụ
- **BR1:** Trường bắt buộc gồm họ tên, SĐT, ngày tạo; bản ghi thiếu trường nào bị gắn `MISSING_FIELD`.
- **BR2:** SĐT hợp lệ khi sau chuẩn hóa gồm đúng 10 chữ số, bắt đầu bằng 0 và có đầu số thuộc danh mục đầu số di động Việt Nam hiện hành (lưu trong file cấu hình).
- **BR3:** Bản ghi còn mã lỗi chưa khắc phục không được đưa vào danh sách khách hàng.
- **BR4:** Hồ sơ chỉ được gộp khi có nhân viên duyệt; hệ thống không tự gộp.
- **BR5:** Mỗi cặp nghi trùng chỉ được quyết định một lần; quyết định sau bị từ chối.
- **BR6:** Không xóa lần nhập và giá trị gốc của bản ghi; hồ sơ đã gộp không tự tách ngược.
- **BR7:** File nhập là CSV mã hóa UTF-8, tối đa 5 MB, có các cột: `ho_ten`, `so_dien_thoai`, `email`, `dia_chi`, `ngay_sinh`, `ngay_tao`.

## 6. Bảng truy vết yêu cầu
| Mã FR | Yêu cầu chức năng | User Story | Use Case | MoSCoW | Test case (BT3) |
| :---: | :--- | :---: | :---: | :---: | :--- |
| FR1 | Nhập file CSV khách hàng | US1 | UC1 | MUST | Bổ sung ở BT3 |
| FR2 | Kiểm tra và chuẩn hóa bản ghi, tạo cặp nghi trùng | US1, US4 | UC1, UC4 | MUST | Bổ sung ở BT3 |
| FR3 | Danh sách các lần nhập | US2 | UC2 | SHOULD | Bổ sung ở BT3 |
| FR4 | Danh sách bản ghi lỗi có lọc theo mã lỗi | US3 | UC3 | MUST | Bổ sung ở BT3 |
| FR5 | Sửa bản ghi lỗi | US4 | UC4 | SHOULD | Bổ sung ở BT3 |
| FR6 | Duyệt cặp hồ sơ nghi trùng | US5 | UC5 | MUST | Bổ sung ở BT3 |
| FR7 | Tra cứu khách hàng theo SĐT | US6 | UC6 | SHOULD | Bổ sung ở BT3 |
| FR8 | Báo cáo chất lượng theo lần nhập | US7 | UC7 | SHOULD | Bổ sung ở BT3 |

*Bảng không có ô trống. Mã test case cụ thể (TC01, TC02…) được bổ sung vào cột “Test case” khi làm BT3.*

---

# Phụ lục – Use Case

## Danh sách Actor
| Actor | Loại | Use case tham gia | Ghi chú |
| :--- | :--- | :--- | :--- |
| Nhân viên dữ liệu | Người dùng chính | UC1, UC2, UC3, UC4 (mở rộng từ UC3), UC5, UC6 | Thực hiện toàn bộ thao tác xử lý dữ liệu. |
| Quản lý dữ liệu | Người dùng | UC6, UC7 | Theo dõi chất lượng; không thao tác sửa hay gộp dữ liệu. |

Không có actor là hệ thống ngoài: hệ thống bán lẻ và bảo hành không kết nối trực tiếp với ứng dụng mà chỉ cung cấp file CSV do nhân viên tải lên (mục 1.4).

## Danh sách Use Case và quan hệ
| Mã | Tên use case (ĐỘNG TỪ + ĐỐI TƯỢNG) | Actor | MoSCoW | Truy vết |
| :---: | :--- | :--- | :---: | :--- |
| UC1 | Nhập file khách hàng | Nhân viên dữ liệu | MUST | FR1, FR2, US1 |
| UC2 | Xem danh sách lần nhập | Nhân viên dữ liệu | SHOULD | FR3, US2 |
| UC3 | Xem danh sách bản ghi lỗi | Nhân viên dữ liệu | MUST | FR4, US3 |
| UC4 | Sửa bản ghi lỗi | Nhân viên dữ liệu (qua UC3) | SHOULD | FR5, FR2, US4 |
| UC5 | Duyệt cặp hồ sơ nghi trùng | Nhân viên dữ liệu | MUST | FR6, US5 |
| UC6 | Tra cứu khách hàng theo số điện thoại | Nhân viên dữ liệu, Quản lý dữ liệu | SHOULD | FR7, US6 |
| UC7 | Xem báo cáo chất lượng theo lần nhập | Quản lý dữ liệu | SHOULD | FR8, US7 |

- **UC4 «extend» UC3** – việc sửa CHỈ xảy ra khi nhân viên chọn một bản ghi trong danh sách lỗi (điểm mở rộng “Chọn bản ghi”); xem danh sách vẫn hoàn chỉnh khi không sửa.
- “Kiểm tra và chuẩn hóa bản ghi” (FR2) không vẽ thành use case riêng vì tự nó không mang lại mục tiêu hoàn chỉnh cho actor; đây là một bước trong luồng chính của UC1 (bước 5) và UC4.

Sơ đồ: [`docs/usecase.drawio`](usecase.drawio) – trang 1 “UseCase_L7” là sơ đồ, trang 2 “DacTa_UseCase” là đặc tả UC1 và UC5 (mở bằng app.diagrams.net).

## Đặc tả chi tiết UC1 – Nhập file khách hàng
- **Actor chính:** Nhân viên dữ liệu
- **Mục tiêu:** Đưa toàn bộ hồ sơ trong file vào ứng dụng, mỗi bản ghi đều được kiểm tra và chuẩn hóa.
- **Điều kiện trước:** Nhân viên đã đăng nhập; có file CSV xuất từ hệ thống bán lẻ hoặc bảo hành.
- **Điều kiện sau:** Một lần nhập mới có mã duy nhất được lưu cùng toàn bộ bản ghi; mỗi bản ghi ở một trong ba trạng thái: hợp lệ (đã vào danh sách khách hàng), có mã lỗi, hoặc thuộc một cặp nghi trùng chờ duyệt.
- **Liên quan:** FR1, FR2, US1 | **Mức ưu tiên:** MUST

**Luồng chính (happy path):**
1. Nhân viên chọn chức năng “Nhập file khách hàng”.
2. Nhân viên chọn nguồn (Bán lẻ / Bảo hành), chọn file CSV và bấm “Nhập”.
3. Hệ thống kiểm tra định dạng, dung lượng và các cột bắt buộc của file.
4. Hệ thống tạo lần nhập mới và đọc từng dòng thành bản ghi nhập.
5. Với từng bản ghi, hệ thống chuẩn hóa và kiểm tra theo BR1, BR2; gắn mã lỗi cho bản ghi vi phạm, đưa bản ghi không lỗi vào danh sách khách hàng và tạo cặp nghi trùng nếu trùng SĐT hoặc email với hồ sơ đã có.
6. Hệ thống lưu lần nhập và toàn bộ bản ghi trong một giao dịch.
7. Hệ thống hiển thị tóm tắt: tổng bản ghi, số bản ghi hợp lệ, số bản ghi lỗi theo mã lỗi, số cặp nghi trùng mới.

**Luồng ngoại lệ:**
- **3a.** File không phải CSV hoặc lớn hơn 5 MB → Hệ thống từ chối, nêu rõ lý do; không tạo lần nhập.
- **3b.** File thiếu cột bắt buộc → Hệ thống từ chối, liệt kê tên các cột còn thiếu; không tạo lần nhập.
- **4a.** File không có dòng dữ liệu nào → Hệ thống báo “File không có dữ liệu”; không tạo lần nhập.
- **6a.** Lỗi khi lưu (ví dụ mất kết nối cơ sở dữ liệu) → Hệ thống hủy toàn bộ giao dịch, không lưu bản ghi nào của file và báo nhân viên nhập lại (NFR3).

## Đặc tả chi tiết UC5 – Duyệt cặp hồ sơ nghi trùng
- **Actor chính:** Nhân viên dữ liệu
- **Mục tiêu:** Quyết định gộp hay giữ riêng từng cặp nghi trùng để mỗi khách hàng thật chỉ còn một hồ sơ.
- **Điều kiện trước:** Nhân viên đã đăng nhập; có ít nhất một cặp nghi trùng ở trạng thái “Chờ duyệt”.
- **Điều kiện sau:** Cặp được chuyển sang “Đã gộp” hoặc “Giữ riêng”, lưu người duyệt và thời điểm; nếu gộp thì chỉ còn một hồ sơ khách hàng.
- **Liên quan:** FR6, US5 | **Mức ưu tiên:** MUST

**Luồng chính (happy path):**
1. Nhân viên mở danh sách cặp nghi trùng đang chờ duyệt.
2. Hệ thống hiển thị danh sách, sắp xếp theo điểm tương đồng giảm dần.
3. Nhân viên chọn một cặp.
4. Hệ thống hiển thị hai hồ sơ cạnh nhau, tô màu các trường khác nhau, kèm nguồn và điểm tương đồng.
5. Nhân viên chọn “Gộp” và chọn hồ sơ giữ lại, hoặc chọn “Giữ riêng”, rồi bấm Xác nhận.
6. Nếu gộp: hệ thống bổ sung các trường còn trống của hồ sơ giữ lại từ hồ sơ kia và ghi hồ sơ kia là “đã gộp vào” hồ sơ giữ lại.
7. Hệ thống cập nhật trạng thái cặp, lưu người duyệt và thời điểm, rồi quay về danh sách.

**Luồng ngoại lệ:**
- **2a.** Không có cặp nào chờ duyệt → Hệ thống hiển thị “Không có cặp nghi trùng cần duyệt”.
- **5a.** Hai hồ sơ có giá trị khác nhau ở cùng một trường (ví dụ hai địa chỉ) và nhân viên chọn Gộp → Hệ thống yêu cầu chọn giá trị giữ lại cho từng trường khác nhau trước khi cho xác nhận.
- **7a.** Cặp đã được nhân viên khác xử lý trong lúc đang xem → Hệ thống từ chối quyết định, báo “Cặp này đã được xử lý” và tải lại danh sách (BR5).
