# Kế hoạch chuẩn hóa cấu trúc frontend GrainLedger

Ngày rà soát 19/11/2026 · Web React/TypeScript · Nhánh `fe/feat/workflow` · Mốc mã nguồn `1c9cd6b`

## Kết luận

Giữ cách tổ chức theo nghiệp vụ trong `src/features`. Với 11 nhóm nghiệp vụ và 33 file trong các thư mục `pages`, nền tảng hiện tại phù hợp cho nhiều người cùng phát triển. Việc cần ưu tiên là xác định nơi chịu trách nhiệm cho từng thay đổi. Hiện một thay đổi quyền hoặc URL có thể phải sửa router, sidebar và dashboard. Một thay đổi hợp đồng API có thể đi vào cả lớp HTTP lẫn một trang dài hơn nghìn dòng. Đây là hai chi phí bảo trì lớn nhất.

## Phát hiện có thể kiểm tra

| Ưu tiên | Bằng chứng ở mốc rà soát | Tác động và quyết định |
|---|---|---|
| P0 | Sidebar và `features/dashboard/model/dashboardConfig.ts` cùng trỏ tới `/mill/corrections/new`. Router có `/mill/reconciliations` và `/mill/reconciliations/:id`, thiếu đích tạo yêu cầu. | Người vận hành có thể bị đưa về trang chủ qua route dự phòng. Xác định màn hình tạo đúng nghiệp vụ và quyền trước khi sửa hai điểm vào. Thêm kiểm thử điều hướng cho vai trò này. |
| P1 | `app/router/routes.tsx` có 835 dòng, 50 khai báo `path`, 34 khai báo lazy và 9 chỗ dựng `PlaceholderPage`. | Chia route theo feature. Phân biệt route nghiệp vụ, chuyển hướng và màn hình chờ backend khi kiểm tra menu. |
| P1 | `FacilityConfigPage.tsx` có 1.625 dòng, gồm cả DTO của cơ sở, vị trí, thiết bị và phản hồi setup. `MrlVersionsPage.tsx` có 1.564 dòng. `ProcurementReceiptPage.tsx` có 1.139 dòng. | Tách theo hành vi có thể kiểm thử riêng. Làm thử với MRL vì đã có test hợp đồng và giao diện. Để phần thu mua ngoại tuyến sang sau. |
| P1 | `api/client.ts` nhập trực tiếp cả `authStore` và `uiStore`. `pwa/procurementQueue.ts` vừa thao tác IndexedDB vừa hiểu payload thu mua và chủ sở hữu phiên. | Tách trách nhiệm vận chuyển HTTP, phiên và hàng đợi theo từng bước. Bảo toàn cơ chế refresh, chống ghi đè dữ liệu và cách ly dữ liệu theo chủ sở hữu. |
| P2 | `src/components` chứa cả primitive như `Modal`, khung ứng dụng như `AppSidebar` và UI nghiệp vụ như `HoldBanner`. Bên cạnh `src/api` còn có adapter của `auth` và `dashboard`. | Quyết định vị trí theo người sử dụng và lý do thay đổi. Dashboard có thể giữ adapter tổng hợp dữ liệu riêng. |
| P2 | Biến lazy `BlendPlansPendingPage` trong router nạp `BlendPlanDecisionsPage`, đồng thời có một file riêng tên `BlendPlansPendingPage.tsx`. Vitest hiện chỉ tìm test trong `tests/`, nơi có 20 file test. | Đặt tên theo component thực sự được route dùng. Kiểm tra import và điểm vào trước khi dọn file cũ. Giữ quy ước test tập trung trong đợt này. |

## Cấu trúc đích

Cây dưới là phần liên quan đến việc tái cấu trúc. Mỗi feature chỉ tạo thư mục khi đã có mã thuộc trách nhiệm đó.

```text
src/
  app/
    router/                 # Ghép route, guard, route dự phòng
    navigation/             # Menu và liên kết dashboard theo quyền
    layout/                 # AppLayout, AppHeader, AppSidebar
    providers/              # Khởi tạo QueryClient và kết nối phiên với HTTP
    store/                  # Trạng thái toàn ứng dụng
    i18n/
  api/
    client.ts               # HTTP, retry, ETag và ProblemDetails
    config.ts
    query.ts
    catalogs.ts             # Hợp đồng HTTP theo nhóm backend
    ledger.ts
    ...                     # Các module API nghiệp vụ hiện có
  features/
    catalogs/
      routes.tsx            # Route lazy và điều kiện truy cập
      pages/                # Ghép màn hình và xử lý ngữ cảnh URL
      components/           # Bảng phiên bản, form giới hạn, hộp thoại import
      model/                # Quy tắc, parser, mapper và state của quy trình
      hooks/                # Query và mutation dùng trong feature
    field/
      offline/              # Hàng đợi thu mua, replay và phân vùng dữ liệu
    ...                     # admin, audit, auth, compliance, dashboard, ...
  shared/
    ui/                     # Modal, ConfirmPopover, loader và các primitive
    types/
    utils/
  pwa/                      # Service worker, IndexedDB và hạ tầng offline dùng chung
tests/
  api/
  routing/
  features/
  pwa/
  fixtures/
docs/
```

**Quy tắc phụ thuộc.** App ghép feature và truyền ngữ cảnh phiên. Feature gọi module trong `api/` và dùng primitive trong `shared/`. Module HTTP không nhập React component. Hợp đồng dùng cùng một endpoint ở nhiều màn hình có một nơi định nghĩa trong `api/`. Kiểu hiển thị và cách biến đổi dữ liệu thuộc feature sử dụng. Chỉ đưa component nghiệp vụ lên vùng dùng chung khi đã xác định được các caller và hành vi chung của chúng.

**Quy tắc điều hướng.** Feature sở hữu path, builder cho URL có tham số và điều kiện vào route. Sidebar và dashboard tham chiếu cùng định danh route, đồng thời giữ nhãn, biểu tượng và cách sắp xếp riêng. Có quyền đọc một màn hình vẫn phải kiểm tra riêng quyền ghi cho từng thao tác. Backend tiếp tục quyết định quyền cuối cùng.

## Thứ tự triển khai

| PR | Thay đổi | Điều kiện nghiệm thu |
|---|---|---|
| 1 · Chốt đường cơ sở và sửa liên kết | Lập danh sách route, quyền, deep link và điểm vào. Chạy build, test, lint ở cùng commit và ghi lỗi có sẵn. Sửa luồng `/mill/corrections/new` sau khi xác định người dùng và handler tạo yêu cầu. | Click từ sidebar và dashboard bằng vai trò vận hành mở đúng tác vụ. Vai trò thiếu quyền bị chặn. Test phát hiện đích menu không khớp route cụ thể kể cả khi router có wildcard. |
| 2 · Tách router | Thí điểm với `catalogs`, sau đó `export` và các feature còn lại. Chuyển từng nhóm lazy route, dùng chung builder ở menu/dashboard và sửa tên import dễ nhầm. | Giữ URL đã phát hành, query string, nút Back, tải lại deep link và lazy loading. Danh sách màn hình chờ backend vẫn nhận diện được. |
| 3 · Tách màn hình MRL | Giữ `MrlVersionsPage` làm điểm vào. Chuyển phần danh sách, form chỉnh giới hạn và import sang component riêng. Tách query/mutation theo phiên và quyền. Dùng lại `model/mrlImport.ts` cùng hợp đồng trong `api/catalogs.ts`. | Test bao phủ nhập bản nháp, phân trang, số thập phân, quyền công bố, phản hồi 412 và đổi tổ chức. Nội dung VI/EN và thao tác bàn phím vẫn hoạt động. |
| 4 · Áp dụng cho quản trị và sổ cái | Tách bảng và form của facility/location/equipment, chuyển DTO dùng lại vào `api/ledger.ts`. Tách quy trình đối soát khỏi phần hiển thị. Chuyển app shell và primitive theo danh sách nơi sử dụng. | Mỗi thay đổi tập trung vào một nghiệp vụ. Ghi dữ liệu gửi đúng phiên bản, lỗi hiển thị tại thao tác và test hiện có tiếp tục chạy. |
| 5 · Tách phiên và thu mua ngoại tuyến | App khởi tạo adapter phiên cho HTTP. Giữ một cơ chế refresh dùng chung. Chuyển phần replay thu mua vào `features/field/offline`, giữ lớp truy cập IndexedDB ở `pwa`. | Hàng đợi đã lưu trước nâng cấp vẫn đọc được. Hai lần kích hoạt đồng bộ không ghi trùng. Retry giữ nguyên operation ID. Đổi tài khoản hoặc doanh nghiệp không làm lộ hoặc gửi nhầm phiếu. |
| 6 · Khóa quy ước | Nhóm test trong `tests/` theo phạm vi. Bổ sung kiểm tra import bằng ESLint cho các ranh giới đã chuyển xong. Ghi quy ước ngắn trong README và kiểm tra pipeline hiện có ở cấp repository. | Build, test và kiểm tra import đạt. Mỗi route có chủ sở hữu. File tương thích chỉ được bỏ khi không còn caller. Người mới có thể lần từ URL tới page, gọi API và test tương ứng. |

**Cách chia công việc.** PR 1 đi trước PR 2. Nhóm phụ trách catalog có thể làm PR 3 sau khi đã chốt test nền. PR 5 cần người hiểu cả phiên đăng nhập lẫn cơ chế offline. Mỗi PR tách riêng việc di chuyển file và thay đổi hành vi để người review dễ kiểm tra, và có thể hoàn tác từng bước mà vẫn giữ dữ liệu đã lưu.

**Phạm vi đánh giá.** Đây là rà soát tĩnh của ứng dụng web tại commit nêu trên. Các con số là ảnh chụp để chọn thứ tự xử lý. Độ dài file chỉ là tín hiệu để xem xét cùng với số trách nhiệm, số nơi sử dụng và rủi ro thay đổi. Kết quả chạy test của nhánh khác không được dùng làm đường cơ sở cho kế hoạch này.

## Kết quả triển khai trên web

Router trung tâm ghép 11 nhóm route theo nghiệp vụ. Đối chiếu với `1c9cd6b` cho thấy cả 50 khai báo path trước đây vẫn tồn tại, bao gồm route dự phòng. Path mới `/mill/corrections/new` mở biểu mẫu gửi yêu cầu cho công đoạn đã chốt. Route kiểm tra vai trò `MILL_OPERATOR` và quyền `conversions.write`. Backend tiếp tục kiểm tra phân công cơ sở. Chín route chờ nghiệp vụ có `handle.kind = "placeholder"`.

| Phần đã chuyển | Điểm vào để bảo trì | Kiểm thử liên quan |
| --- | --- | --- |
| Router, menu và dashboard | `src/app/router/routes.tsx`, `src/app/navigation/sidebarItems.ts`, `src/features/*/paths.ts` | `tests/routing/navigation.test.tsx` kiểm tra các đích cụ thể, hai điểm vào của nhân viên vận hành và mã lệnh khi gửi lại |
| Danh mục MRL | `features/catalogs/pages/MrlVersionsPage.tsx` ghép danh sách, chi tiết, tra cứu, chỉnh sửa và import. `useMrlWorkspace` xử lý truy vấn, quyền ghi và ETag | `tests/features/api-audit-pages.test.tsx` |
| Cơ sở, vị trí và thiết bị | `features/admin/pages/FacilityConfigPage.tsx`, `useFacilityConfig` và DTO trong `src/api/ledger.ts` | `tests/features/facility-config.test.tsx` kiểm tra gửi phiên bản gốc và hiển thị lỗi trong biểu mẫu |
| Đối soát sổ cái | `features/mill/hooks/useCorrectionReview.ts` đọc danh sách và chọn bản ghi theo URL. `CorrectionWorkbench` hiển thị chi tiết | Route danh sách và chi tiết giữ đường dẫn cũ |
| Phiên và ngoại tuyến | `src/app/providers/` cấp cache theo phiên và kết nối HTTP với trạng thái đăng nhập. `features/field/offline/` quản lý phiếu, gửi lại và dữ liệu tra cứu. IndexedDB tiếp tục dùng `grainledger-field` phiên bản 2 | `tests/api/api-client.test.ts`, `tests/features/session-scope.test.tsx`, `tests/pwa/` |

Đường cơ sở tại `1c9cd6b` có 129 test đạt, production build thành công, ESLint báo 9 lỗi và 9 cảnh báo. Sau tái cấu trúc, production build thành công, 139 test trong 23 file đều đạt và ESLint chạy với `--max-warnings 0` thành công. Vite preview trả HTML khi mở trực tiếp cả 50 đường dẫn nghiệp vụ với query string, đồng thời phục vụ được JavaScript đầu vào, manifest và service worker. Kiểm thử nghiệp vụ dùng API giả lập và IndexedDB kiểm thử. Các lệnh kiểm tra và quy ước thư mục được ghi trong [README của ứng dụng](../README.md). Repository frontend hiện chưa có cấu hình pipeline CI tại thư mục gốc.

Đợt tiếp theo ngày 19/11/2026 đã nối cả chín route sang màn hình nghiệp vụ, triển khai tải chứng cứ, nháp thay thế, xác nhận chênh lệch, duyệt/hủy đối soát và chốt gói bút toán bù theo quyền operator/manager. Khi backend cập nhật tới `464746e`, frontend Export được nối thêm API thực xếp, niêm phong, snapshot hồ sơ, chứng từ và yêu cầu sản xuất. Tám route có màn hình gọi API nghiệp vụ; màn hình thực thi cho operator còn `handle.kind = "integration-pending"` để nối API theo phạm vi cơ sở. Chi tiết từng route, kiểm thử và phần còn thiếu được ghi trong [báo cáo triển khai workflow](frontend-workflow-completion.md). [Báo cáo khoảng trống giao diện](../../../docs/reports/frontend-gap-report.md) và [báo cáo đối chiếu UI/API](../../../docs/reports/UI_API_MISMATCH_REPORT.md) theo dõi phạm vi rộng hơn.
