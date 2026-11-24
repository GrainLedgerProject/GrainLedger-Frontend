# Rà soát API và màn hình GrainLedger

Cập nhật ngày 24/11/2026 sau khi triển khai các giao diện còn thiếu. Phạm vi gồm OpenAPI v1 trong `grainledger-api.json`, lớp gọi API, route, menu theo vai trò và các thao tác trên màn hình. Quyền và phiên bản bản ghi được đối chiếu với mã backend cục bộ.

## Độ phủ API

| Đối chiếu theo phương thức và đường dẫn | Trước rà soát | Hiện tại |
| --- | ---: | ---: |
| Thao tác trong OpenAPI v1 | 254 | 254 |
| Thao tác có lớp gọi trên frontend | 229 | 254 |
| Thao tác thiếu lớp gọi | 25 | 0 |

Lượt rà soát ban đầu bổ sung 25 thao tác container. Màn hình Vụ mùa sử dụng các endpoint đã có trong OpenAPI và cập nhật kiểu dữ liệu của lớp gọi hiện hữu.

| Đường dẫn | Thao tác |
| --- | --- |
| `/api/container-production`, `/api/container-work-items` | `GET` danh sách sản xuất và công việc theo cơ sở |
| `/api/export-containers/{id}/execution` | `POST` tại `/trace` và `/holds` |
| `/api/export-containers/{id}/production` | `POST` tại `/draft`, `/commit`, `/next`, `/approve`, `/reject` |
| `/api/export-containers/{id}/workflow` | `POST` tại `/reviews`, `/handoffs`, `/handoffs/approve`, `/handoffs/commit`, `/notifications/read`, `/hold-responses` |
| `/api/ledger/containers` | `GET` danh sách, chi tiết, lịch sử và `POST` tạo, sửa metadata, lưu nháp, kiểm tra xếp, kiểm tra đóng niêm, chốt xếp, đóng niêm |

Hai thao tác chốt của API chuẩn bị cũ trả `409` theo backend. Giao diện chuẩn bị dùng chức năng lập nháp và kiểm tra. Thực xếp và đóng niêm đi qua API Export có phê duyệt. Các yêu cầu ghi trong luồng container giữ nguyên mã thao tác và nội dung khi thử lại sau lỗi mạng, `408` hoặc `5xx`.

## Kết quả rà soát màn hình

Router hiện đăng ký **61 route màn hình** và tham chiếu **46 module tải động**. Sáu route mới phục vụ đăng ký tài khoản, hai màn hình ngưỡng tiếp nhận, điều chuyển tồn kho, xác nhận chênh lệch và chứng cứ dư lượng.

| Nhóm | Số route | Kết quả đáng chú ý |
| --- | ---: | --- |
| Giới thiệu, xác thực và tổng quan | 8 | Đăng ký, gửi lại mã và xác minh email. Trang Bảo mật dẫn vào luồng đặt lại mật khẩu bằng OTP. |
| Lịch sử sự kiện | 2 | Route lịch sử có màn hình đọc sổ cái và hộp chi tiết. |
| Quản trị và danh mục | 9 | Có cấu hình, quản lý người dùng, danh mục, phiên bản MRL, lịch sử ngưỡng và ngưỡng của doanh nghiệp. |
| Hiện trường | 7 | Màn hình Vụ mùa đã hoạt động tại `/field/crop-seasons`. Trang thửa ruộng lấy hình học từ API chi tiết và dùng mã do backend cấp. Modal nông hộ gửi yêu cầu tạo theo schema v2 và gửi phiên bản bản ghi khi sửa. |
| Nhà máy | 11 | Có hàng đợi công việc container, điều chuyển tồn kho và hàng đợi xác nhận chênh lệch. |
| Xuất khẩu và chuẩn bị container | 12 | Có sửa đơn, thêm phiên bản quy cách, sửa mục tiêu container và lịch sử đơn trên màn hình chi tiết. Quy trình container hỗ trợ chuẩn bị, duyệt, bàn giao, HOLD và đánh dấu cảnh báo đã đọc. |
| Tuân thủ và rủi ro | 12 | Có quản lý chứng cứ dư lượng, bản nháp xét nghiệm và truy xuất nguồn từ khối lượng thực xếp. |

### Vụ mùa

Mục **Vụ mùa** trên thanh bên mở `/field/crop-seasons`. Giao diện hỗ trợ tiếng Việt và tiếng Anh, tìm theo tên vụ, xem khoảng ngày và phân trang. [Màn hình Vụ mùa](../src/features/field/pages/CropSeasonsPage.tsx)

| Vai trò | Quyền | Thao tác đã nối |
| --- | --- | --- |
| Quản trị viên (`MILL_ADMIN`) | `platform.configure` | Chọn công ty khách hàng từ `/api/admin/organizations`. Liệt kê, xem chi tiết, thêm, sửa và xóa vụ qua `/api/crop-seasons`. |
| Nhân viên thu mua (`CUSTOMER_PROCUREMENT_OFFICER`) | `farms.write` | Xem vụ của công ty mình, tìm mã thửa qua `/api/plots`, gắn thửa và giống lúa vào vụ, sửa hoặc gỡ liên kết qua `/api/plot-seasons`. |
| Quản lý khách hàng (`CUSTOMER_MANAGER`) | `farms.read` | Xem lịch vụ và danh sách thửa đã gắn trong công ty mình. |

- Ngày bắt đầu và kết thúc được gửi theo `YYYY-MM-DD`. Các thao tác sửa, xóa dùng phiên bản bản ghi và hiển thị theo `canEdit` và `canDelete` từ backend.
- Yêu cầu gắn thửa dùng `payloadSchemaVersion: 1`. Nút **Thử lại** gửi lại nguyên yêu cầu khi máy chủ chưa xác nhận kết quả. [Biểu mẫu Vụ mùa](../src/features/field/components/SeasonEditor.tsx)
- Backend giữ khóa duy nhất của cặp thửa–vụ sau khi gỡ liên kết. Hộp xác nhận nêu rõ tính vĩnh viễn của thao tác với cặp này.

### Các luồng vừa hoàn thiện

| Màn hình | Vị trí | Thao tác và quyền |
| --- | --- | --- |
| Điều chuyển tồn kho | `/stock/transfer` | Nhân viên vận hành chọn lô, vị trí có tồn khả dụng và kho đích theo cơ sở được phân công. Điều chuyển kho rời gửi revision hiện tại. Thử lại sau lỗi kết nối gửi đúng mã và nội dung điều chuyển. |
| Xác nhận chênh lệch | `/mill/operations/variance` | Quản lý xem hàng đợi chờ duyệt, tải chứng cứ và xác nhận đúng phiên bản. Nhân viên vận hành xem bản nháp và chốt khi đủ điều kiện. Bản nháp thay thế thuộc luồng đối soát. |
| Chi tiết đơn hàng | `/export/orders`, trong hộp chi tiết đơn | Người có quyền ghi sửa thông tin đơn, thêm phiên bản quy cách và sửa mục tiêu container đang lập kế hoạch. Các yêu cầu ghi dùng `If-Match` và mã thao tác. Lịch sử đọc được theo quyền xem đơn. |
| Chứng cứ dư lượng | `/compliance/residue-evidence` | Quản lý khách hàng có `residue.evidence.manage` quản lý phiên bản nhóm nguồn, xem trước và công bố lựa chọn kết quả đã xác nhận cho lô nguồn. |
| Bản nháp báo cáo kiểm nghiệm | `/compliance/lab-results`, trong hộp chi tiết báo cáo | Người có `lab.write` nhập chứng thư, sửa hoặc xóa bản nháp và xác nhận đối chiếu theo từng phần mẫu. Sửa tạo bản thay thế, xóa gỡ bản nháp khỏi danh sách đang hoạt động. Backend giữ chứng cứ gốc. |
| Ngưỡng tiếp nhận | `/admin/receiving-thresholds/history` và `/receiving-thresholds/company` | Quản trị viên xem lịch sử và lọc theo phạm vi hoặc doanh nghiệp. Quản lý, nhân viên xuất khẩu và nhân viên thu mua của khách hàng xem ngưỡng đang áp dụng cho chính doanh nghiệp. |
| Đăng ký và xác minh email | `/register` | Gửi đăng ký, xác minh mã OTP và gửi lại mã. Tài khoản mới nhận quyền qua quy trình phân quyền của quản trị viên. |

### Phụ thuộc backend

- Route `/invite/:token` hiển thị trạng thái chưa hỗ trợ và dẫn đến đăng ký hoặc đăng nhập. Việc chấp nhận lời mời cần endpoint backend để phát hành, xác minh và sử dụng token lời mời.
- Đăng ký và gửi OTP trên môi trường triển khai cần cấu hình JWT và dịch vụ gửi email.

## Kiểm tra

- Đối chiếu lại theo phương thức và đường dẫn xác nhận **254/254** thao tác OpenAPI có lớp gọi. Kiểm thử HTTP bao phủ 25 thao tác container được bổ sung ở lượt đầu.
- Kiểm thử lượt đầu bao phủ nhận công việc theo vai trò, gửi bản nháp sản xuất đúng tỷ lệ, thử lại chốt công đoạn với cùng bản nháp, giữ hình học khi sửa thửa và đặt lại mật khẩu bằng OTP.
- Build production, TypeScript và ESLint đạt. Bộ kiểm thử có **228 ca đạt trên 32 file**, gồm phân quyền Vụ mùa, xác minh OTP, retry điều chuyển kho rời, bàn giao và xác nhận bản nháp chế biến, sửa mục tiêu container và cập nhật bản nháp kiểm nghiệm. [Kiểm thử các luồng nghiệp vụ](../tests/features/completed-workflows.test.tsx)
- Chrome tải được 40 module động trong lượt rà soát ban đầu, gồm module Đăng ký thửa ruộng từng báo lỗi. Sau khi thêm Vụ mùa, Chrome kiểm tra riêng route mới cùng thao tác tìm kiếm, gắn và gỡ thửa ở 390 px và 1440 px.
- Chrome kiểm tra bản build ở 390 px và 1440 px với API mô phỏng. Các luồng đã chạy gồm đăng ký và OTP, điều chuyển, duyệt chênh lệch, hai màn hình ngưỡng tiếp nhận, sửa đơn và container, thêm quy cách, xem lịch sử đơn, tạo và sửa bản nháp lab, công bố nhóm nguồn và xem trước, công bố lựa chọn kết quả.
- Lượt rà soát trước kiểm tra ba màn hình container ở 390 px bằng API mô phỏng. Xác minh nghiệp vụ với tài khoản và dữ liệu backend thật vẫn còn.
