# Rà soát cấu trúc toàn dự án GrainLedger

Ngày 19/11/2026. Phạm vi gồm hai repository Git có trong thư mục Capstone. Số file dưới đây đếm bằng `git ls-files` tại checkout cục bộ. Đã đọc manifest, entry point, script kiểm thử, Dockerfile, workflow CI và các import đại diện để kiểm tra vai trò của từng thư mục.

## Kết luận và quyết định ưu tiên

Cấu trúc hiện tại có thể duy trì theo hai repository. Backend đã chia nghiệp vụ rõ, web có các feature riêng, mobile đặt route đúng vùng Expo Router. Rủi ro lớn nhất nằm ở chỗ một thay đổi đi qua ranh giới repository hoặc nền tảng. Người sửa portal chưa thể suy ra thay đổi của mình sẽ vào image nào. Người sửa API ở web có thể làm bộ kiểm tra mobile thất bại dù chưa chạm mã mobile.

**Quyết định cần chốt trước lần phát hành tiếp theo:** portal nào là sản phẩm cần triển khai, repository nào tạo artifact và pipeline nào đưa artifact đó đến người dùng. Dockerfile cho thấy cách build trong mã nguồn. Chưa có bằng chứng từ hạ tầng phát hành để kết luận production đang phục vụ portal nào.

## Bản đồ hiện trạng

| Repository và mốc rà soát | Thành phần | Vai trò thực tế |
|---|---|---|
| `GrainLedger-Frontend` · `fe/feat/workflow` · `1c9cd6b` · 339 file tracked | Root | Có README, LICENSE, quy tắc ignore và hai cây ứng dụng. Mỗi app có manifest và lockfile riêng. Root chưa khai báo npm workspace hay workflow GitHub Actions. |
| | `web/grainledger/` · 177 file | Portal React/Vite. `src/api` chứa client theo nghiệp vụ, `src/app` chứa router/store/i18n, `src/features` gồm 11 nhóm, `src/pwa` quản lý offline. Có `public/`, 20 file test trong `tests/`, cấu hình build và báo cáo API riêng. |
| | `mobile/grainledger/` · 155 file | App Expo SDK 58, entry `expo-router/entry`. Trong `src/` có 21 file ở `app/`, cùng `components/`, `services/endpoints/`, `store/`, `types/`, `theme/`, `hooks/`, `utils/` và `constants/`. `assets/` chứa tài nguyên app, `design/sleek/` chứa bản thiết kế HTML/JSON, `scripts/` chứa các kiểm tra và script reset. |
| | `mobile/package.json` | Manifest cấp cha chỉ có `name` và `private`. App Expo chạy từ `mobile/grainledger/package.json`. |
| | `docs/reports/` | Hai báo cáo gốc về khoảng trống giao diện và sai lệch UI/API. Báo cáo đối soát web nằm ở `web/grainledger/docs/`, ghi chú parity của mobile ở `mobile/grainledger/API_PARITY.md`. |
| `GrainLedger` · `dev` · `7dca4eb` · 564 file tracked | Root, Docker, CI | Root npm khai báo `apps/*`. `GrainLedger.slnx` trỏ đến API và project integration test. Dockerfile build workspace `@grainledger/web` rồi chép `apps/web/dist` vào `wwwroot` của API. Web job trong CI cũng chạy qua workspace này. |
| | `apps/` · 169 file | `apps/web/` là ứng dụng web được build bởi cấu hình trên. Bên trong còn có `apps/web/grainledger/` với manifest, lockfile và 71 file tracked. `apps/mobile/` chỉ có manifest giữ tên package. Ba vị trí này cần được ghi rõ quan hệ với portal và Expo app ở repo frontend. |
| | `backend/` · 220 file | `src/GrainLedger.Api/Features/` chia thành Capture, Catalogs, Exports, Identity và Ledger. `Data/`, `Configuration/`, `OpenApi/` đảm nhiệm hạ tầng. `tests/GrainLedger.Api.IntegrationTests/` là project test trong solution. `migration-history/` lưu lịch sử riêng. |
| | `contracts/`, `deploy/`, `tools/` | `contracts/openapi/` và `deploy/` hiện chỉ có file giữ thư mục. Dockerfile và Compose thực nằm ở root. `tools/` có script dữ liệu danh mục, tạo dữ liệu lab và test Python tương ứng. |
| | `docs/` · 149 file, `.github/` · 4 file | Tài liệu chia thành SDD, API, hướng dẫn, sơ đồ dữ liệu, plan và report. Workflow và script phụ trợ CI nằm cùng repository backend. |

## Những điểm cần xử lý

| Mức | Bằng chứng | Ảnh hưởng và đề xuất |
|---|---|---|
| P0 · Phát hành | Có ba cây mã web. Build được khai báo trong Dockerfile và CI chọn `GrainLedger/apps/web`; portal vừa được rà soát là `GrainLedger-Frontend/web/grainledger`. | Có thể build xanh nhưng kiểm tra một portal khác với portal cần phát hành. Ghi quyết định sở hữu, SHA nguồn và artifact; bổ sung smoke test nhận diện đúng bản web trong image hoặc đích hosting. Trước khi lưu trữ cây cũ, kiểm tra người dùng và luồng deploy của từng cây. |
| P1 · API đa nền tảng | `mobile/grainledger/scripts/check-api-parity.cjs` đọc trực tiếp tám module qua đường dẫn cố định `../../../web/grainledger/src/api` và giả định dependency runtime là `./client`. Test hiện dừng tại `admin.updateUserAccess`. | Web mã hóa đoạn ID trong URL, mobile nội suy trực tiếp. Fixture gây lỗi truyền object vào tham số ID; điều này xác nhận sai biệt khi tuần tự hóa, chưa chứng minh lỗi với UUID hợp lệ. Dùng fixture theo chữ ký từng endpoint, kiểm tra tham số bắt buộc, body, query, ETag và lỗi. Xuất OpenAPI có phiên bản từ backend để hai client cùng đối chiếu. |
| P1 · Kiểm tra trước merge | Repo frontend chưa có workflow GitHub Actions tracked. CI ở repo bên cạnh dùng lockfile và workspace của chính repo đó. | Bổ sung job web và mobile ở repo sở hữu ứng dụng, đặt working directory rõ ràng. Thay đổi hợp đồng dùng chung phải kích hoạt cả hai job. Xác minh thêm nếu nhóm đang dùng dịch vụ CI bên ngoài Git. |
| P1 · Điều hướng web | `src/app/router/routes.tsx` dài 835 dòng. Sidebar và dashboard trỏ đến `/mill/corrections/new`, trong khi router có wildcard đưa URL không khớp về `/home`. | Sửa điểm vào tạo yêu cầu theo đúng quyền, thêm test đích đến. Sau đó tách route theo feature, giữ URL công khai ổn định. |
| P1 · Trách nhiệm màn hình | Web có `FacilityConfigPage.tsx` 1.625 dòng và `MrlVersionsPage.tsx` 1.564 dòng. Mobile có `src/app/(tabs)/compliance.tsx` 677 dòng và `index.tsx` cùng thư mục 650 dòng. | Thí điểm tách UI, query và quy tắc nghiệp vụ cho một màn hình mỗi nền tảng. Giữ file route của Expo ở vị trí hiện tại để bảo toàn deep link. Phần transport, PWA/IndexedDB và native storage tiếp tục theo nền tảng. |
| P2 · Tái lập môi trường | Root frontend có hai lockfile của hai app. Môi trường mobile hiện thiếu `zustand` và `expo-haptics` trong `node_modules` dù manifest và lockfile có cả hai. | Giữ cài đặt độc lập trước mắt. Chạy từ clean checkout bằng `npm ci` trong đúng app và phân loại lại lỗi TypeScript/lint còn lại. Chỉ đổi sang một npm workspace khi cần chia sẻ package hoặc điều phối phát hành và đã kiểm chứng Metro, Expo và Vite. |
| P2 · File sinh và tài liệu | Git đang track ba file trong `web/grainledger/dev-dist/`, gồm service worker và Workbox dùng cho dev. README root còn liệt kê `web/src/`, đường dẫn không có trong cây tracked. README mobile vẫn hướng dẫn reset project mẫu. | Bỏ theo dõi output sau khi xác nhận có thể tái tạo; ghi ignore đúng phạm vi. Cập nhật README theo các lệnh đã kiểm chứng. Tách hướng dẫn vận hành khỏi báo cáo lịch sử, thêm liên kết giữa hai repo. |

## Kiểm tra đã thực hiện

| Kiểm tra trên checkout hiện tại | Kết quả |
|---|---|
| Web · `tsc -b --pretty false` | Đạt. |
| Mobile · `tsc --noEmit` | Thất bại. Có lỗi phân giải dependency, lỗi kiểu tham số và lỗi kiểu route. Cần chạy lại trong bản cài sạch để xác định phần còn lại thuộc mã nguồn. |
| Mobile · `npm run lint` | 7 lỗi phân giải import, liên quan đến `zustand` và `expo-haptics`. |
| Mobile · `npm test` | Dừng ở kiểm tra parity. Chạy riêng ba script phía sau đều đạt: design contrast với 44 cặp màu, corrections và management. |

Đây là kiểm tra cấu trúc và một số điểm tích hợp có thể chạy cục bộ. Chưa build image, chạy toàn bộ integration test .NET, khởi động app trên thiết bị hoặc xác minh dịch vụ production trong lần rà soát này.

## Cấu trúc đích và thứ tự triển khai

**Giữ hai đường dẫn app đang chạy** trong giai đoạn đầu. Đổi `web/grainledger` thành `apps/web` lúc này sẽ tạo thêm việc cho parity, CI, hướng dẫn và script mà chưa giải quyết quyền sở hữu bản phát hành.

| Thành phần | Nơi chịu trách nhiệm đề xuất |
|---|---|
| Backend, migration, integration test và đặc tả API đã phát hành | `GrainLedger/backend/` và `GrainLedger/contracts/openapi/`. Sinh đặc tả từ phiên bản backend xác định; ghi phiên bản/hash khi phát hành. |
| Portal và mobile client | `GrainLedger-Frontend/web/grainledger/` và `mobile/grainledger/`, nếu nhóm chọn portal này cho production. Mỗi app giữ entry point, transport và build riêng. |
| Quy tắc hợp đồng liên nền tảng | Một bộ fixture ở repo frontend tham chiếu phiên bản OpenAPI. Hai adapter cùng chạy fixture. Chỉ trích package TypeScript chung khi cả hai app đã có caller thực tế và tương thích bundler. |
| Tài liệu và thiết kế | Root của mỗi repo chỉ dẫn cách chạy, build và phát hành phần mình sở hữu. `docs/reports/` lưu kiểm toán có ngày/commit. Design source nằm cạnh app, tài nguyên runtime nằm trong `assets/` hoặc `public/`. |
| Pipeline | Repo frontend kiểm tra hai app. Repo đóng gói kiểm tra artifact đã chọn cùng API, ghi đủ SHA web và backend để truy ngược một bản phát hành. |

| Thứ tự | Phần việc và nhóm phụ trách | Điều kiện hoàn tất |
|---|---|---|
| 1 | Tech lead + phụ trách phát hành xác nhận portal chính thức và lập bản đồ nguồn → pipeline → artifact → môi trường. | Từ một bản đang chạy truy ra đúng SHA. Cả ba cây web có trạng thái và người chịu trách nhiệm. |
| 2 | Web + mobile + backend chuẩn hóa fixture, xử lý parity, tái lập mobile từ lockfile và tạo kiểm tra PR cho frontend. | Hai client chạy cùng hợp đồng đã định phiên bản. Các job phân biệt lỗi dependency, lỗi API và lỗi ứng dụng. |
| 3 | Web sửa link corrections; web và mobile tách thử MRL/compliance theo nghiệp vụ. | Deep link, quyền, phân trang, ETag, retry và dữ liệu offline có test hồi quy tương ứng. Áp dụng tiếp cho màn hình khác sau khi pilot đạt. |
| 4 | Nhóm nền tảng chuẩn hóa README, output build, manifest giữ chỗ và tài liệu lịch sử. | Người mới từ root xác định được hai app, backend, lệnh chạy/test và nơi phát hành. Fresh build không làm thay đổi file tracked. |

Kế hoạch chi tiết dành riêng cho portal nằm trong [frontend-architecture-plan.md](../../web/grainledger/docs/frontend-architecture-plan.md). Báo cáo này bổ sung các quyết định liên repository, mobile, hợp đồng API và phát hành.
