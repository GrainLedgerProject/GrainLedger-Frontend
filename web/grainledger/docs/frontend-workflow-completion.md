# Triển khai các màn hình chờ và bút toán bù

Ngày đối chiếu: 19/11/2026. Backend tham chiếu ban đầu: repository `GrainLedger`, commit `5ca7fdc`; rà soát lại role Export tại `464746e`. Phạm vi: chín route chờ trong kế hoạch kiến trúc, vòng đời yêu cầu sửa công đoạn và các màn hình Export.

## Kết quả kiểm tra lại role Export

Backend `464746e` đã bổ sung API container execution, production, workflow và trace. Thông tin thiếu API của đợt đầu không còn đúng với các màn hình Export. Frontend đã kết nối các API này; không thay đổi mã nguồn backend.

- `/export/plans` có workspace yêu cầu phối trộn riêng, không còn chuyển người dùng về đơn hàng. Trang theo dõi đề xuất có đường sang xếp hàng container. Chỉ `CUSTOMER_MANAGER` có `blend.approve` được thấy thao tác quyết định.
- Xếp hàng đọc `GET /api/export-containers/{id}/execution`, hiển thị mục tiêu, thực xếp, còn lại, HOLD, kết quả kiểm tra và các vị trí bảo lưu. Ghi thực xếp gửi `operationId`, `version`, `proposalId`, `decisionVersion`, thời điểm thực tế và các dòng kg. Số thập phân được kiểm tra bằng Decimal; không tự coi lượng kế hoạch là lượng thực xếp.
- Nếu phiên bản hoặc phê duyệt/bảo lưu đổi khi người dùng nhập, biểu mẫu yêu cầu nạp lại snapshot và nhập lại lượng. Nếu phản hồi ghi bị mất, nút thử lại gửi đúng ID và payload cũ dù một lượt đọc nền đã đổi phiên bản. Không tự đổi phiên bản để gửi thành một lần xếp mới.
- Niêm phong lưu số container/seal bằng phiên bản máy chủ, chỉ cho chốt khi kiểm tra CLOSE đạt, đã thực xếp đúng mục tiêu và không có HOLD. Thông tin seal còn sửa chưa lưu không thể được dùng để đóng niêm. Mục tiêu lấy từ từng container, không cố định 25.000 kg.
- Hồ sơ chỉ tải snapshot khi `dossierAvailable`. Tải JSON gốc dưới dạng Blob để không làm tròn các giá trị số lớn khi parse/stringify; tải chứng từ qua HTTP có xác thực. Export nhận bản hồ sơ do backend giới hạn quyền, không tự dựng lại thành phần nguồn bị ẩn. Hỗ trợ thêm phiên bản chứng từ tối đa 10 MiB và liên kết chứng cứ bổ sung sau đóng niêm.
- Phương án `BLEND_INPUT_STOCK` cho Export gửi yêu cầu sản xuất và xem trạng thái; không cho Export tự ghi mẻ hoặc duyệt đầu ra. Lịch sử container được đọc theo trang.
- Màn hình Cảnh báo HOLD không còn hiện nút ban hành/cách ly cho Export. Lỗi tải HOLD được báo rõ, không chuyển thành danh sách rỗng thành công. Đọc đủ các trang HOLD và hiển thị cảnh báo container từ `/api/container-notifications`.
- Biểu mẫu đơn hàng kiểm tra ngày giao hàng, khối lượng dương, độ chính xác quy đổi kg và container không vượt hợp đồng; chuẩn hóa mã đơn vị thành chữ hoa. Sau tạo, chọn đúng ID đơn hàng máy chủ vừa trả về và giữ các query parameter khác.

## Đồng bộ bốn workspace Export

- Bốn trang dùng chung màu, chữ, đường viền, điều khiển và trạng thái tải/lỗi/rỗng của ứng dụng; mỗi trang có bố cục riêng theo tác vụ. Menu chính của ứng dụng điều hướng giữa các trang, không lặp thêm bốn tab trên mỗi trang. Đổi đơn xóa lựa chọn container/phương án cũ.
- Đơn hàng là bảng hợp đồng kèm vùng chi tiết bên cạnh; màn hình hẹp xếp dọc và nút xem đơn đưa focus đến chi tiết. Hỗ trợ tìm mã, sắp xếp lịch giao, xem quy cách và tiến độ phân bổ; thêm container gửi ETag của đơn đang xem. Tổng kg tính bằng Decimal, ngày giao hàng giữ đúng ngày lịch.
- Container là bảng điều phối chia cột chuẩn bị xếp/đang xếp/đã niêm phong, lọc và tìm mã, thao tác đúng giai đoạn. Không kéo thả đổi trạng thái hoặc suy ra lượng thực xếp từ mục tiêu; không tải hàng loạt endpoint execution có bước kiểm tra lại nghiệp vụ.
- Phương án có vùng chọn nhu cầu bên trái, phiên bản theo thứ tự mới nhất bên phải, hướng dẫn ba bước lập/đánh giá/gửi và bộ lọc nháp/đã gửi/nhu cầu thay đổi/đã hủy. Trang chi tiết đề xuất mở đúng `planId`, đọc snapshot, quyết định và bảo lưu. Chỉ Customer Manager có `blend.approve` được quyết định qua hộp xác nhận; Export và Mill Admin không hiện thao tác này dù có grant. Retry cùng payload giữ operation ID và phiên bản quyết định.
- Hồ sơ là kho tra cứu riêng: danh sách container CLOSED bên trái, snapshot đóng niêm và chứng từ bên phải. Chỉ đọc hồ sơ của container đang chọn, tải snapshot gốc dưới dạng Blob, lọc loại chứng từ, mặc định hiện bản mới nhất và cho xem/tải các bản cũ. Bổ sung chứng từ/chứng cứ qua liên kết đến trang chi tiết có kiểm tra phiên bản và quyền. Container chưa đóng niêm không có trong kho hồ sơ.
- Bảng giữ ngữ nghĩa HTML, tiêu đề cố định và vùng cuộn có tên, truy cập bằng bàn phím. Biểu mẫu và nút dùng kích thước chạm phù hợp; màu chữ trên nền nhấn dùng token đảo màu để theo chế độ sáng/tối.

## Trạng thái của chín màn hình

Không còn route nào trong nhóm này dựng `PlaceholderPage`. Tám route có màn hình gọi API nghiệp vụ; màn hình vận hành thực thi phương án còn chờ nối frontend và được đánh dấu `handle.kind = "integration-pending"`.

| Route | Hiện có trên frontend | Phần còn thiếu |
| --- | --- | --- |
| `/export/orders` | Danh sách đơn, chi tiết quy cách, tạo đơn cùng container đầu tiên, thêm container bằng ETag của đơn đang xem | UI sửa đơn, sửa quy cách và lịch sử đơn chưa được bổ sung trong đợt này |
| `/export/orders/:orderId/containers/:containerId/plan` | Xác minh container thuộc đơn, tạo/hủy nháp, chọn sản phẩm và cơ sở, tính phương án, hiển thị đánh giá, gửi preview reference do máy chủ cấp, mở trang quyết định | Chưa có UI cho các tùy chọn tối ưu/điều chỉnh tỷ lệ nâng cao của backend |
| `/export/containers` | Chọn đơn và tải đủ danh sách container, trạng thái, khối lượng mục tiêu, liên kết tới các bước | Chưa có UI sửa mục tiêu container; số thực xếp xem tại chi tiết container |
| `/export/containers/:id/loading` | Đọc thực xếp/bảo lưu/kiểm tra hiện tại, ghi lượng thực tế có phiên bản và retry ổn định, gửi yêu cầu sản xuất khi cần | Cần luồng operator/manager đầy đủ để xử lý mẻ sản xuất và bàn giao không đạt điều kiện |
| `/export/containers/:id/closure` | Lưu số container/seal, kiểm tra mục tiêu thực tế và đóng niêm bằng phiên bản đã xác nhận | Chưa kiểm thử tích hợp với dữ liệu backend thật |
| `/export/dossiers` | Chọn đơn, tìm mã container CLOSED và mở hồ sơ đã phát hành | Chưa có tra cứu hồ sơ xuyên mọi đơn hàng |
| `/export/containers/:id/dossier` | Đọc snapshot máy chủ đã phát hành, tải JSON gốc, chứng từ theo phiên bản và bổ sung chứng cứ | Chưa có tính năng sinh chứng thư PDF trong frontend |
| `/mill/plan-executions/:planId` | Hiển thị trạng thái còn chờ nối màn hình vận hành, không gọi API xuất khẩu bằng quyền operator | Cần nối API production/work-items/handoffs đã có. Operator không có `export-orders.read` |
| `/risk/traceback` | Chọn/tìm/phân trang lô, truy xuôi/ngược, hiện tại/lịch sử, deep link kết quả lab, liên kết giữa lô, khối lượng và phần trăm đóng góp đã lưu, nguồn thu mua theo quyền | Chưa nối đồ thị container/trace API mới trong đợt kiểm tra role Export |

Các màn hình không tạo thành công giả, không tự sinh số liệu đã xếp/niêm phong và không trình bày dữ liệu hiện tại như snapshot đã phát hành. Bản ghi xuất khẩu cần vai trò khách hàng cùng `export-orders.read`; `MILL_ADMIN` không mặc nhiên có quyền đọc dữ liệu đơn hàng của doanh nghiệp. Ghi xếp/chốt yêu cầu role Export và các quyền nghiệp vụ tương ứng, còn duyệt đầu ra thuộc quản lý.

## Luồng bút toán bù

1. Operator có `conversions.write` mở danh sách đối soát từ sidebar hoặc deep link. Nhóm mặc định của operator là `RECONCILED` để nhận gói sẵn sàng chốt.
2. Khi yêu cầu đang mở, operator có thể tạo nháp thay thế từ công đoạn gốc. Biểu mẫu giữ chủ sở hữu, cơ sở, loại công đoạn, thiết bị, thời điểm và đầu vào; đầu ra có ID mới, liên kết `originalLotId`, khối lượng/vị trí điều chỉnh và hao hụt. Backend gán mã lô và kiểm tra tính hợp lệ. Gửi lại cùng nội dung sau lỗi kết nối giữ nguyên ID lệnh và ID đầu ra.
3. Manager có `corrections.reconcile` tải chứng cứ bất biến theo chủ sở hữu/cơ sở của bản gốc, nhập kết luận, tải mọi vị trí tồn dương của đầu ra gốc, chọn nháp cùng phạm vi và xem nội dung/phiên bản cụ thể. Tải chứng cứ đã lưu qua HTTP có xác thực, nhận Blob thay vì giả định JSON.
4. Nếu nháp thay thế có chênh lệch khác 0 và chưa được xác nhận đúng phiên bản, manager cần `conversions.confirm`. Gửi `version`, `evidenceId`, `reason` tới endpoint xác nhận; sau đó xác minh lại trước khi duyệt đối soát.
5. Duyệt đối soát gửi `evidenceId`, `reason`, toàn bộ `reconciliation` gồm `lotId/locationId/quantityKg`, `replacementOperationId` và `replacementVersion`. Thay đổi phiên bản đang xem làm mất hiệu lực dấu xác minh cũ. Backend tiếp tục kiểm tra đầy đủ vị trí, phân công cơ sở và dữ liệu thay thế.
6. Hủy được phép ở trạng thái đang yêu cầu hoặc đã đối soát, cần chứng cứ, lý do và xác nhận rằng bản gốc đúng. Các hạn chế HOLD/tiếp nhận độc lập tiếp tục có hiệu lực.
7. Operator chốt khi hồ sơ ở `RECONCILED`, có công đoạn thay thế đã gắn và đã xác nhận hành động. Payload chỉ gửi `replacementOperationId` đã gắn trong hồ sơ. Backend ghi đồng thời bút toán bù và thay thế, đồng thời kiểm tra lại phiên bản, tồn kho, hạn chế độc lập, chính sách cân bằng và xác nhận chênh lệch.

Manager không được hiện nút chốt chỉ vì là quản lý; administrator cũng không được hiện nút ghi dựa vào vai trò quản trị. Lỗi ghi được giữ tại tác vụ. Phản hồi 409/412 xóa xác nhận cũ và tải lại trạng thái/phiên bản. Không cập nhật thành công cục bộ trước khi máy chủ xác nhận.

Danh sách yêu cầu và nháp thay thế tải đủ các trang API; deep link không bị giới hạn ở trang dữ liệu đầu. Hồ sơ không tìm thấy trong phạm vi truy cập có thông báo riêng.

## Những việc cần tiếp theo để hoàn tất nghiệp vụ

- Nối màn hình operator với API production/work-items/handoffs và màn hình manager với API duyệt đầu ra/phạm vi còn lại; backend đã có các API này. Export chỉ gửi yêu cầu và xem trạng thái, không thay vai trò vận hành hoặc quản lý.
- Bổ sung UI sửa đơn/quy cách, mục tiêu container, tra cứu lịch sử đơn và các tùy chọn tối ưu phương án nâng cao nếu cần hoàn thiện toàn bộ năng lực backend.
- Nối đồ thị truy xuất container và làm rõ nhu cầu xuất chứng thư PDF; snapshot JSON và tệp chứng từ đã được hỗ trợ.
- Chạy tích hợp với backend và dữ liệu cơ sở được phân công: tồn đã chuyển kho, thay thế có chênh lệch, HOLD độc lập, thay đổi phiên bản và luân chuyển operator → manager → operator. Kiểm thử hiện tại dùng mock API, chưa chứng minh transaction trên cơ sở dữ liệu thật.
- Kiểm tra trực quan desktop/mobile và bàn phím bằng trình duyệt thật. Bản preview đã chuẩn bị nhưng chưa quan sát được: browser host không khả dụng; Computer Use dừng vì không xác định được URL Chrome đủ chắc chắn.

## Kiểm tra và bản preview

Đợt triển khai ban đầu: 159 test trong 24 file đạt. Kiểm tra lại Export bổ sung `tests/features/export-role.test.tsx` và `tests/api/container-execution-contract.test.ts`, cùng tình huống Export không được quyết định dù có grant trong test trang duyệt. Các kết quả test/build không thay thế kiểm tra giao diện trực quan hoặc tích hợp cơ sở dữ liệu thật.

Kết quả rà soát Export: 178 test trong 26 file đạt; production build (kèm service worker), ESLint `--max-warnings 0` và `git diff --check` đạt. Browser host vẫn không khả dụng nên chưa xác nhận giao diện bằng trình duyệt thật.

Sau đợt đồng bộ bốn workspace: 184 test trong 26 file đạt; production build và ESLint `--max-warnings 0` đạt. `tests/features/export-workspaces.test.tsx` kiểm tra danh sách đơn thực/tổng Decimal, chuyển ngữ cảnh, thêm container bằng ETag, lọc vòng đời, hồ sơ CLOSED, phiên bản phương án, deep link đề xuất, lỗi tải, giới hạn role, xác nhận và retry quyết định theo phiên bản. Browser host và native pipe hiện chưa khả dụng; chưa xác nhận trực quan trên desktop/mobile hoặc tích hợp với backend thật.

Sau đợt tách bốn bố cục theo tác vụ: 187 test trong 26 file đạt; production build, ESLint `--max-warnings 0` và `git diff --check` đạt. Bổ sung kiểm thử chọn/đổi snapshot đúng container CLOSED, lọc và tải phiên bản chứng từ, giữ nguyên Blob snapshot gốc, lỗi tải chứng từ không biến thành danh sách rỗng, và đưa focus từ đơn hàng sang chi tiết. Đã quan sát ảnh render desktop của trang đơn hàng bằng Chrome headless với fixture cục bộ; lần mở Chrome headless tiếp theo bị duyệt tự động chặn (`blocked by policy`). Browser host/native pipe cũng chưa khả dụng, nên chưa xác nhận trực quan ba trang còn lại hoặc mobile; chưa kiểm thử backend thật.

Các kiểm thử mới trong `tests/features/workflow-completion.test.tsx` kiểm tra payload đối soát, retry, thay phiên bản, xác nhận chênh lệch, lỗi tải chứng cứ, hủy sau đối soát, phân quyền chốt, tạo nháp thay thế, deep link ở trang API sau, chín route, giới hạn backend, container sai đơn, preview reference và truy xuất lab/đóng góp nguồn.

```sh
npm test
npm run build
npm run lint -- --max-warnings 0
```

Preview cục bộ: chạy `npm run dev`, mở `/tests/fixtures/workflow-preview.html`. Có thể thêm `?theme=dark` hoặc `?screen=/mill/reconciliations/correction`. Fixture ghi đè các phương thức endpoint bằng dữ liệu trong bộ nhớ và chặn fetch ngoài dự kiến; không ghi vào backend. Vite production build không đưa fixture vào entry của ứng dụng.
