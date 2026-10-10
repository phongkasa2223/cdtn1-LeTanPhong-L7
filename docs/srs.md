# Bản đặc tả yêu cầu rút gọn (SRS) – Luồng L7

**Sinh viên:** Lê Tấn Phong – 2374802010384 – Track SE  
**Luồng nghiệp vụ:** L7 – Chất lượng dữ liệu khách hàng (case study Mekong Mobile)  
**Sơ đồ Use Case gốc:** [`docs/usecase.drawio`](usecase.drawio)  
**API contract (Track SE):** [`docs/api-contract.md`](api-contract.md)  
**Thiết kế:** [`docs/architecture.drawio`](architecture.drawio) · [`docs/erd.drawio`](erd.drawio) · [`docs/schema.sql`](schema.sql) · [`docs/wireframe.drawio`](wireframe.drawio)  
**Bản nộp BT1 (PDF):** `BT1_2374802010384_LeTanPhong.pdf` – nội dung trùng với tài liệu này

> Cấu trúc rút gọn theo tinh thần ISO/IEC/IEEE 29148 (không tuân thủ đầy đủ chuẩn). Thuật ngữ, thực thể dữ liệu và quy tắc nghiệp vụ lấy từ tài liệu Case study Smart CRM – Mekong Mobile (Bảng 3.1, mục 7 – L7, mục 8, Bảng 9.1).

---

## 1. Giới thiệu và phạm vi

### 1.1. Bối cảnh
Dữ liệu khách hàng của Mekong Mobile nằm rải rác ở ba nơi: file Excel của từng cửa hàng, tin nhắn Zalo của nhân viên bán hàng và sổ tay của trung tâm bảo hành. Một khách hàng có thể tồn tại ba lần với ba số điện thoại khác nhau; ước tính 18–22% hồ sơ bị trùng (vấn đề V1). Số điện thoại có nhiều dạng (0901234567, 84901234567, 0901 234 567), có ô để trống; tên viết hoa/thường lẫn lộn (Bảng 5.2). Doanh nghiệp chưa có “góc nhìn khách hàng duy nhất” và chưa đo được mức độ sạch của dữ liệu.

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
- Không kết nối trực tiếp (API, đồng bộ thời gian thực) tới hệ thống bán lẻ và bảo hành; chỉ nhận file CSV do các hệ thống đó xuất ra; không ghi ngược dữ liệu về nguồn.
- Không tự động gộp hồ sơ khi chưa có nhân viên duyệt.
- Không phát hiện trùng khi hai hồ sơ khác số điện thoại, khác email và khác họ tên hoặc ngày sinh.
- Không tính phân khúc khách hàng (thuộc luồng L1); không xác minh số điện thoại/email với nhà mạng; không có màn hình quản lý tài khoản.

### 1.5. Bảng thuật ngữ
| Thuật ngữ | Tên trong ERD / API | Giải thích |
| :--- | :--- | :--- |
| Khách hàng / Hồ sơ khách hàng | `customer` | Cá nhân đã mua ít nhất một sản phẩm hoặc dùng dịch vụ của Mekong Mobile (Bảng 3.1); mỗi khách hàng thật chỉ có một hồ sơ hiệu lực, xác định duy nhất bằng SĐT (QT-01). |
| Người dùng | `app_user` | Tài khoản đăng nhập; vai trò Nhân viên dữ liệu (`DATA_STAFF`, thuộc một cửa hàng/trung tâm) hoặc Quản lý dữ liệu (`DATA_MANAGER`). |
| Lần nhập | `import_batch` | Một lần tải một file CSV lên ứng dụng; có mã duy nhất (ví dụ I001), lưu nguồn, người nhập, thời điểm. |
| Bản ghi nhập (vùng tạm) | `stg_customer` | Một dòng của file đã nhập; giữ giá trị gốc và giá trị sau chuẩn hóa/sau khi sửa. |
| Quy tắc kiểm tra | `dq_rule` (mã quy tắc) | `MISSING_FIELD` – thiếu trường bắt buộc; `PHONE_LENGTH` – SĐT không đủ 10 chữ số; `PHONE_PREFIX` – đầu số không thuộc danh mục; `PHONE_CHAR` – SĐT chứa ký tự khác chữ số; `EMAIL_INVALID` – email sai định dạng; `DATE_INVALID` – ngày sai định dạng hoặc ở tương lai. |
| Kết quả kiểm tra (lỗi) | `dq_result` | Một lỗi của một bản ghi nhập theo một quy tắc kiểm tra; có thời điểm được khắc phục. |
| Cặp nghi trùng | `duplicate_pair` | Hai hồ sơ KHÁC số điện thoại nhưng cùng email, hoặc cùng họ tên và ngày sinh; trạng thái Chờ duyệt (`PENDING`), Đã gộp (`MERGED`), Giữ riêng (`KEEP_SEPARATE`). |
| Chuẩn hóa | — | Họ tên: bỏ khoảng trắng thừa, viết hoa chữ cái đầu mỗi từ. SĐT: quy về 10 chữ số bắt đầu bằng 0 (QT-02). Email: chữ thường. |
| Điểm tương đồng | `similarity` | Số từ 0 đến 1 đo mức giống nhau của họ tên hai hồ sơ; chỉ để sắp xếp, không dùng để tự gộp. |
| Tỷ lệ lỗi | — (tính khi truy vấn) | Số bản ghi có ít nhất một lỗi chưa khắc phục / tổng số bản ghi của lần nhập × 100%. |

## 2. Các bên liên quan và vai trò người dùng
| Vai trò (Actor) | Mô tả | Được làm | Không được làm |
| :--- | :--- | :--- | :--- |
| Nhân viên dữ liệu | Phụ trách dữ liệu khách hàng của một cửa hàng / trung tâm; người dùng chính | Nhập file; xem lần nhập, bản ghi lỗi, cặp nghi trùng của đơn vị mình (QT-14); sửa bản ghi lỗi; duyệt cặp nghi trùng; tra cứu khách hàng. | Xem báo cáo tổng hợp; xem SĐT đầy đủ trong hồ sơ khách hàng (QT-15); xóa lần nhập hay hồ sơ (QT-13). |
| Quản lý dữ liệu | Chịu trách nhiệm chất lượng dữ liệu khách hàng toàn công ty | Xem báo cáo theo lần nhập của mọi đơn vị; tra cứu khách hàng với SĐT đầy đủ. | Nhập file; sửa bản ghi; duyệt cặp nghi trùng (tách bạch người làm và người kiểm soát). |

## 3. Yêu cầu chức năng và User Story

### 3.1. Danh sách yêu cầu chức năng
| Mã | Yêu cầu chức năng (phát biểu kiểm chứng được) |
| :---: | :--- |
| FR1 | Hệ thống cho phép nhân viên dữ liệu tải lên một file CSV khách hàng (tối đa 5 MB) kèm nguồn (bán lẻ / bảo hành), kiểm tra file có đủ các cột bắt buộc, tạo một lần nhập có mã duy nhất và lưu toàn bộ bản ghi của file. |
| FR2 | Với mỗi bản ghi được nhập hoặc được sửa, hệ thống chuẩn hóa họ tên, SĐT, email và kiểm tra theo BR1, BR3; bản ghi hợp lệ có SĐT đã tồn tại được gắn vào hồ sơ có sẵn (QT-01), ngược lại tạo hồ sơ mới; tạo cặp nghi trùng khi hồ sơ mới khác SĐT nhưng cùng email, hoặc cùng họ tên và ngày sinh với một hồ sơ đã có. |
| FR3 | Hệ thống hiển thị danh sách các lần nhập của đơn vị người dùng (BR6), mới nhất trước; mỗi dòng có mã lần nhập, nguồn, người nhập, thời điểm, tổng bản ghi và số bản ghi lỗi. |
| FR4 | Hệ thống hiển thị danh sách bản ghi lỗi của một lần nhập, lọc được theo mã quy tắc, phân trang 50 dòng mỗi trang; mỗi dòng có giá trị gốc và mô tả lỗi. |
| FR5 | Hệ thống cho phép sửa họ tên, SĐT, email, địa chỉ, ngày sinh, ngày tạo của một bản ghi lỗi; khi lưu, bản ghi được kiểm tra lại theo FR2, chỉ được lưu khi không còn lỗi và các lỗi cũ được đánh dấu đã khắc phục. |
| FR6 | Hệ thống hiển thị từng cặp nghi trùng cạnh nhau kèm điểm tương đồng; nhân viên chọn Gộp (chọn hồ sơ giữ lại) hoặc Giữ riêng; khi gộp, hồ sơ còn lại được đánh dấu “đã gộp vào” hồ sơ giữ lại (BR5); hệ thống lưu người quyết định và thời điểm. |
| FR7 | Hệ thống tìm khách hàng theo SĐT (chuẩn hóa SĐT nhập vào trước khi tìm) và trả về hồ sơ kèm danh sách bản ghi nguồn; SĐT của một hồ sơ đã gộp trả về hồ sơ giữ lại; SĐT hiển thị theo BR7. |
| FR8 | Hệ thống hiển thị báo cáo theo từng lần nhập: tổng bản ghi, số và tỷ lệ bản ghi lỗi theo mã quy tắc, số cặp nghi trùng đã gộp / giữ riêng / chờ duyệt; chỉ vai trò Quản lý dữ liệu xem được. |

### 3.2. User Story và tiêu chí chấp nhận
| Mã | MoSCoW | User Story | Tiêu chí chấp nhận (Given – When – Then) |
| :---: | :---: | :--- | :--- |
| US1 | MUST | Là nhân viên dữ liệu, tôi muốn nhập file CSV khách hàng xuất từ hệ thống bán lẻ hoặc bảo hành vào ứng dụng để toàn bộ hồ sơ được tự động kiểm tra và chuẩn hóa thay vì rà soát thủ công trên Excel. | AC1. GIVEN file CSV hợp lệ 1.000 dòng, nguồn “Bán lẻ”; WHEN tải lên; THEN tạo một lần nhập mới, lưu đủ 1.000 bản ghi và hiển thị số bản ghi hợp lệ, số bản ghi lỗi, số cặp nghi trùng.<br>AC2 (ngoại lệ). GIVEN file thiếu cột số điện thoại; WHEN tải lên; THEN từ chối, nêu rõ cột còn thiếu, không tạo lần nhập.<br>AC3. GIVEN dòng có họ tên “  NGUYỄN   văn  AN ” và SĐT “+84 901 234 567”; WHEN nhập; THEN lưu “Nguyễn Văn An” và “0901234567”, không có lỗi.<br>AC4 (QT-01). GIVEN đã có hồ sơ SĐT 0901234567; WHEN nhập dòng có SĐT “84901234567”; THEN không tạo hồ sơ mới mà gắn bản ghi vào hồ sơ có sẵn. |
| US2 | SHOULD | Là nhân viên dữ liệu, tôi muốn xem danh sách các lần nhập đã thực hiện để biết file nào đã được xử lý và chọn lần nhập cần xem lỗi. | AC1. GIVEN đã có I001, I002, I003; WHEN mở danh sách; THEN I003 hiện đầu tiên, mỗi dòng có nguồn, người nhập, thời điểm, tổng bản ghi, số bản ghi lỗi.<br>AC2. GIVEN chưa có lần nhập nào; WHEN mở danh sách; THEN hiển thị “Chưa có lần nhập nào”.<br>AC3 (QT-14). GIVEN nhân viên thuộc cửa hàng Quận 10; WHEN mở danh sách; THEN chỉ thấy lần nhập do nhân viên cửa hàng Quận 10 thực hiện. |
| US3 | MUST | Là nhân viên dữ liệu, tôi muốn xem danh sách bản ghi lỗi của một lần nhập và lọc theo loại lỗi để biết cần xử lý bản ghi nào. | AC1. GIVEN I001 có 45 bản ghi lỗi, 20 bản ghi PHONE_LENGTH; WHEN lọc PHONE_LENGTH; THEN hiện đúng 20 bản ghi kèm giá trị gốc và mô tả lỗi.<br>AC2. GIVEN lần nhập không có bản ghi lỗi; WHEN mở danh sách; THEN hiển thị “Lần nhập này không có bản ghi lỗi”.<br>AC3 (ngoại lệ). GIVEN không có lần nhập I999; WHEN mở bản ghi lỗi của I999; THEN báo “Không tìm thấy lần nhập I999”. |
| US4 | SHOULD | Là nhân viên dữ liệu, tôi muốn sửa trực tiếp một bản ghi lỗi trên ứng dụng để bản ghi được kiểm tra lại ngay mà không phải sửa file rồi nhập lại. | AC1. GIVEN bản ghi có SĐT “09012345” (PHONE_LENGTH); WHEN sửa thành “0901234567” và bấm Lưu; THEN lỗi được đánh dấu đã khắc phục và bản ghi vào danh sách khách hàng.<br>AC2 (ngoại lệ). GIVEN sửa SĐT thành “0111234567” (đầu số 011 không thuộc danh mục); WHEN bấm Lưu; THEN từ chối, báo “Đầu số không hợp lệ”, giữ nguyên dữ liệu đang nhập. |
| US5 | MUST | Là nhân viên dữ liệu, tôi muốn duyệt từng cặp hồ sơ nghi trùng và chọn gộp hoặc giữ riêng để mỗi khách hàng thật chỉ còn một hồ sơ. | AC1. GIVEN hồ sơ A (SĐT 0901234567, chưa có địa chỉ) và B (SĐT 0987654321) cùng email an.nguyen@gmail.com; WHEN chọn Gộp, giữ A; THEN B được đánh dấu “đã gộp vào” A, địa chỉ của A lấy từ B, cặp chuyển “Đã gộp”.<br>AC2. GIVEN cặp cùng họ tên và ngày sinh nhưng là hai người khác nhau; WHEN chọn Giữ riêng; THEN giữ cả hai hồ sơ, cặp chuyển “Giữ riêng”, không hiện lại trong danh sách chờ duyệt.<br>AC3 (ngoại lệ). GIVEN cặp đã được nhân viên khác xử lý; WHEN gửi quyết định; THEN từ chối, báo “Cặp này đã được xử lý”. |
| US6 | SHOULD | Là nhân viên dữ liệu, tôi muốn tra cứu khách hàng theo số điện thoại để xem hồ sơ đã hợp nhất kèm nguồn gốc khi bộ phận khác cần đối chiếu. | AC1. GIVEN có hồ sơ SĐT 0901234567; WHEN nhân viên tra cứu “090 123 4567”; THEN hiển thị hồ sơ với SĐT dạng 090\*\*\*\*567 (QT-15) và danh sách bản ghi nguồn.<br>AC2. GIVEN hồ sơ B (0987654321) đã gộp vào A; WHEN tra cứu 0987654321; THEN hiển thị hồ sơ A.<br>AC3 (ngoại lệ). GIVEN không có hồ sơ nào với SĐT đã nhập; WHEN tra cứu; THEN hiển thị “Không tìm thấy khách hàng”. |
| US7 | SHOULD | Là quản lý dữ liệu, tôi muốn xem báo cáo tỷ lệ bản ghi lỗi và số hồ sơ đã gộp của từng lần nhập để theo dõi chất lượng dữ liệu khách hàng theo thời gian. | AC1. GIVEN I001 có 300 bản ghi, 15 bản ghi có lỗi; WHEN mở báo cáo; THEN tỷ lệ lỗi của I001 hiển thị 5%.<br>AC2 (ngoại lệ). GIVEN người dùng có vai trò Nhân viên dữ liệu; WHEN mở báo cáo; THEN hệ thống từ chối truy cập. |

> **Ghi chú MoSCoW.** 3 MUST (US1, US3, US5) tạo luồng tối thiểu nhập file → thấy lỗi → gộp hồ sơ trùng; 4 SHOULD (US2, US4, US6, US7) có cách làm tạm. **COULD – hướng mở rộng, không hiện thực:** Quản lý dữ liệu tách một hồ sơ bị gộp nhầm. Mỗi story có tiêu chí chấp nhận; mỗi story MUST có ít nhất một tiêu chí ngoại lệ. Các mục WON’T ở mục 1.4.

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
Các quy tắc QT lấy từ Bảng 9.1 của case study (QT-01, QT-02 của luồng L7 và QT-13, QT-14, QT-15 áp dụng cho mọi luồng); BR là mã dùng trong tài liệu này.

| Mã | Nguồn | Quy tắc |
| :---: | :---: | :--- |
| BR1 | QT-02 | SĐT được chuẩn hóa về 10 chữ số bắt đầu bằng 0 trước khi lưu; các dạng +84…, 84…, có dấu cách hoặc dấu chấm đều quy về dạng chuẩn. Đầu số phải thuộc danh mục đầu số di động Việt Nam (file cấu hình). |
| BR2 | QT-01 | SĐT khách hàng là duy nhất. Khi nhập một SĐT đã tồn tại, hệ thống gắn bản ghi vào hồ sơ có sẵn thay vì tạo hồ sơ mới. |
| BR3 | Phân tích | Trường bắt buộc: họ tên, SĐT, ngày tạo; thiếu trường nào bị gắn `MISSING_FIELD`. Bản ghi còn lỗi chưa khắc phục không được đưa vào danh sách khách hàng. |
| BR4 | Phân tích | Cặp nghi trùng chỉ được gộp khi có nhân viên duyệt; mỗi cặp chỉ được quyết định một lần, quyết định sau bị từ chối. |
| BR5 | QT-13 | Không xóa vật lý lần nhập, bản ghi nhập hay hồ sơ khách hàng; hồ sơ bị gộp chỉ được đánh dấu “đã gộp vào” hồ sơ giữ lại và giữ nguyên lịch sử. |
| BR6 | QT-14 | Nhân viên dữ liệu chỉ xem lần nhập, bản ghi và cặp nghi trùng của cửa hàng/trung tâm mình; Quản lý dữ liệu xem toàn công ty. |
| BR7 | QT-15 | SĐT trong hồ sơ khách hàng hiển thị dạng che (090\*\*\*\*567) với Nhân viên dữ liệu; Quản lý dữ liệu xem đầy đủ. |
| BR8 | Phân tích | File nhập là CSV UTF-8, tối đa 5 MB, có các cột: `ho_ten`, `so_dien_thoai`, `email`, `dia_chi`, `ngay_sinh`, `ngay_tao`. |

## 6. Bảng truy vết yêu cầu
| Mã FR | Yêu cầu chức năng | User Story | Use Case | MoSCoW | Test case (BT3) |
| :---: | :--- | :---: | :---: | :---: | :--- |
| FR1 | Nhập file CSV khách hàng | US1 | UC1 | MUST | Bổ sung ở BT3 |
| FR2 | Kiểm tra và chuẩn hóa bản ghi, tạo cặp nghi trùng | US1, US4 | UC1, UC4 | MUST | Bổ sung ở BT3 |
| FR3 | Danh sách các lần nhập | US2 | UC2 | SHOULD | Bổ sung ở BT3 |
| FR4 | Danh sách bản ghi lỗi có lọc theo mã quy tắc | US3 | UC3 | MUST | Bổ sung ở BT3 |
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
- **Điều kiện sau:** Một lần nhập mới có mã duy nhất được lưu cùng toàn bộ bản ghi; mỗi bản ghi hợp lệ (gắn với một hồ sơ khách hàng), có lỗi, hoặc làm phát sinh một cặp nghi trùng chờ duyệt.
- **Liên quan:** FR1, FR2, US1 | **Mức ưu tiên:** MUST

**Luồng chính (happy path):**
1. Nhân viên chọn chức năng “Nhập file khách hàng”.
2. Nhân viên chọn nguồn (Bán lẻ / Bảo hành), chọn file CSV và bấm “Nhập”.
3. Hệ thống kiểm tra định dạng, dung lượng và các cột bắt buộc của file.
4. Hệ thống tạo lần nhập mới và đọc từng dòng thành bản ghi nhập.
5. Với từng bản ghi, hệ thống chuẩn hóa và kiểm tra theo BR1, BR3; gắn lỗi cho bản ghi vi phạm; bản ghi hợp lệ có SĐT đã tồn tại được gắn vào hồ sơ có sẵn (BR2), ngược lại tạo hồ sơ mới; tạo cặp nghi trùng nếu hồ sơ mới khác SĐT nhưng cùng email, hoặc cùng họ tên và ngày sinh với hồ sơ đã có.
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
- **7a.** Cặp đã được nhân viên khác xử lý trong lúc đang xem → Hệ thống từ chối quyết định, báo “Cặp này đã được xử lý” và tải lại danh sách (BR4).
