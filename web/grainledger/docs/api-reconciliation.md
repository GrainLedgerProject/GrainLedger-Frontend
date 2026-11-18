# Đối soát API và giao diện — 18/11/2026

Đã triển khai các đề xuất có thể xác minh trong `api-audit-report.md`. Report tự điều chỉnh kết luận ở các phần sau; số endpoint “thiếu” trong bảng tổng kết không phải danh sách công việc chính xác.

## Kết quả xác minh

Không tìm thấy bản `v1_(2).json` được report nhắc đến trong repository hiện tại. Đã đối chiếu trực tiếp với mã backend có sẵn tại repository cạnh bên `Capstone/GrainLedger/backend/src/GrainLedger.Api`, chỉ đọc và không sửa backend:

| Vấn đề trong report | Hợp đồng backend thực tế | Triển khai FE |
| --- | --- | --- |
| `GET /api/mrl-versions/resolve` bị nghi thiếu | `MrlVersionEndpoints.cs` có route; yêu cầu `marketId`, `commodityId`, `decisionAt` có múi giờ | Bổ sung query có kiểu và form tra cứu trong màn hình MRL |
| `POST /api/mrl-versions/import` bị nghi thiếu | Có route và `ImportMrlVersionRequest` trong `MrlImportEndpoints.cs` | Giữ endpoint, thêm kiểm tra JSON, UUID, thời gian, đơn vị, độ chính xác số và mã hoạt chất trùng; chỉ tạo bản nháp |
| `POST /api/mrl-versions/{id}/publish` bị nghi thiếu | Có route; yêu cầu `If-Match` của phiên bản đang xem | Công bố trong hộp thoại chi tiết; dùng đúng ETag, khóa ghi khi gặp HTTP 412 |
| `POST /api/residue-policy-settings/batch` bị nghi thiếu | `ResiduePolicySettings.cs` có route; nhận `{ items }`, trả `{ items }`; tối đa 100 thiết lập cùng doanh nghiệp | Thêm màn hình chính sách doanh nghiệp và menu theo quyền |
| DELETE hoạt chất/hàng hóa thiếu body? | `ActiveSubstanceEndpoints.cs`, `CommodityEndpoints.cs`: không nhận request body; yêu cầu `If-Match` | Giữ DELETE không body, thêm ETag đọc từ GET chi tiết |
| `IssuedTokens.user` có được trả về? | `IssuedTokens.cs` có `User`; `ExpiresIn` là `int` | Giữ `user` bắt buộc, chuẩn hóa `expiresIn` thành `number` |
| Các trường `EvidenceRequest` | `LedgerEndpoints.cs`: `Id`, `OwnerId`, `FacilityId`, `FileName`, `ContentType`, `ContentBase64` | Interface hiện có khớp; giữ nguyên |

Các phát hiện về route xác nhận **mã nguồn backend local**; phiên bản server triển khai có thể khác. FE hiện hiển thị lỗi 404/405 rõ ràng, không chuyển lỗi ghi thành thông báo thành công.

## Màn hình và hành vi

- `/compliance/mrl-versions`: hiển thị thị trường, hàng hóa, phiên bản, trạng thái và ngưỡng từ API; loại bỏ các dòng ngưỡng mẫu và biên an toàn cố định. “Đã công bố” không đồng nghĩa với đang hiệu lực. Tra cứu theo thời điểm dùng backend resolver.
- MRL hỗ trợ tạo/nhập bản nháp, sửa căn cứ và khoảng hiệu lực, thêm/cập nhật/xóa ngưỡng, công bố. Các thao tác ghi chỉ hiện khi có `platform.configure`; phiên bản công bố chỉ đọc. Khi sửa căn cứ, các mốc thời gian không thay đổi được bỏ khỏi PATCH để giữ nguyên độ chính xác của timestamp gốc.
- `/admin/master-data`: đọc GET chi tiết trước khi mở form sửa hoặc xác nhận xóa; gửi ETag đó qua `If-Match`. HTTP 412 yêu cầu người dùng tải lại. Tôn trọng `canEdit`/`canDelete` khi backend cung cấp.
- `/compliance/company-policies`: yêu cầu `residue.company-policy.manage` và doanh nghiệp trong phiên đăng nhập. Chọn hồ sơ mặc định hệ thống hoặc quy tắc riêng doanh nghiệp, nhập thông tin rà soát và công bố theo batch. Giữ lịch sử và `supersedesId`, dùng UUID ổn định khi thử lại yêu cầu chưa được ghi nhận.
- Chính sách chọn đúng đầu chuỗi hồ sơ trong phạm vi sở hữu. Hồ sơ ngừng dùng hoặc có đầu chuỗi xung đột bị khóa; không tự chọn phiên bản cũ. Đọc lại nguồn và lịch sử trước khi ghi; nếu khác lúc chọn thì chặn và yêu cầu rà soát lại.
- Dữ liệu danh mục, phiên bản và giới hạn được tải theo `hasMore`, không dừng ở trang đầu. Query key và trạng thái form được tách theo phiên/người dùng/doanh nghiệp.
- Hai màn hình dùng token giao diện hiện có, bảng có cuộn ngang, form responsive, bản dịch Việt/Anh, và `Modal` chung dùng `<dialog>`.

## API và kiểu dữ liệu

- GET chi tiết danh mục trả `ApiResource<T> = { data, etag }`. `apiFetchResource` giữ metadata theo từng response, không dùng cache ETag toàn cục. Nếu backend khác origin, cần expose header `ETag` qua CORS.
- PATCH/DELETE danh mục và các thao tác ghi MRL bắt buộc nhận ETag. Không dùng `If-Match: *` và không tự retry bằng phiên bản mới sau HTTP 412.
- `limitValue` khi ghi được tuần tự hóa thành JSON number từ chuỗi decimal đã kiểm tra bằng `decimal.js`, tránh làm tròn qua JavaScript `Number`. Import giữ giá trị decimal dạng chuỗi theo request backend.
- Bổ sung response/query/patch types cho danh mục và MRL; gắn các type hiện có vào endpoint residue source group, setting, selection và batch. Các phản hồi động chưa xác minh schema vẫn giữ `unknown` thay vì khẳng định một cấu trúc không được backend bảo đảm.
- Xóa wrapper trùng trong report. Tên giữ lại: `update*` cho PATCH danh mục; `getReferenceData`; `createHold`, `respondToHold`; `recordReceivingMeasurement`, `reviewReceiving`; `createSample`, `createLabReport`. Đã cập nhật cả màn hình và PWA cache dùng các tên cũ.

## Kiểm tra

- `npm test`: 128 kiểm thử đạt, gồm 28 kiểm thử mới cho hợp đồng API, metadata ETag, decimal, phân trang, import, phân quyền, HTTP 412, giữ độ chính xác timestamp và nguồn chính sách thay đổi.
- `npm run build`: TypeScript và production build đạt.
- ESLint trên API, màn hình/model thay đổi, router, sidebar và các kiểm thử mới: đạt. Lint toàn repository còn 9 lỗi và 9 cảnh báo trong các file không thuộc thay đổi này (`MapLocationPicker`, `PesticideDeclarationPage`, `PlotRegistrationPage`, `CorrectionManagementPage`, hai form auth và logger).
- Đã quan sát cây giao diện MRL đang chạy trên Chrome với dữ liệu backend thật. Công cụ Computer Use dừng vì không xác định URL Windows đủ chắc chắn; chưa hoàn tất kiểm tra ảnh desktop/mobile. Các thao tác ghi thực tế trên server chưa được chạy.
- Có fixture độc lập để kiểm tra giao diện bằng dữ liệu giả: `/tests/fixtures/api-audit-preview.html` và `?page=policies`; thêm `&theme=dark` để xem giao diện tối. Fixture nằm ngoài entrypoint production và chặn toàn bộ API trong trang xem thử.

Các màn hình nghiệp vụ khác không được report yêu cầu bổ sung, cùng các placeholder hiện có, không nằm trong đợt thay đổi này.
