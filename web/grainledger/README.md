# GrainLedger Web

## Cấu hình môi trường

Sao chép `.env.example` thành `.env` trước khi chạy frontend:

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Rỗng | Origin backend, không kèm `/api`. Để rỗng để gọi cùng origin; khi chạy dev, Vite chuyển tiếp qua proxy. |
| `API_PROXY_TARGET` | `http://localhost:5080` | Backend mà proxy dev chuyển tiếp các đường dẫn `/api`, `/health`, `/signin-google` tới. |
| `DEV_PORT` | `5173` | Cổng chạy frontend khi phát triển. |

Khi triển khai với backend riêng, đặt `VITE_API_BASE_URL=https://api.example.com` trước khi chạy `npm run build`; backend cần cho phép CORS và cookie từ origin frontend. Nếu để rỗng khi triển khai, web server cần chuyển tiếp các đường dẫn backend trên vì proxy Vite chỉ hoạt động khi phát triển.

Khởi động lại dev server sau khi sửa `.env`. Các biến `VITE_*` được đưa vào mã trình duyệt khi build, vì vậy không đặt thông tin bí mật trong các biến này. `.env` và các file môi trường riêng được Git bỏ qua; `.env.example` được lưu trong repository.

## Đồng bộ API

Các API được khai báo trực tiếp trong `src/api/` theo nhóm chức năng (`auth.ts`, `ledger.ts`, `planning.ts`, ...), dùng chung `apiFetch` từ `client.ts`. Interface request/response nằm ngay trong file API tương ứng. Khi cập nhật endpoint, sửa trực tiếp file API rồi chạy `npm test` và `npm run build`.

Xem [kết quả đối soát API và giao diện](docs/api-reconciliation.md) để biết endpoint mới, interface bổ sung và giới hạn của đặc tả.

## Tổ chức mã nguồn

- Mỗi nghiệp vụ trong `src/features/` sở hữu URL trong `paths.ts`, điều kiện truy cập và màn hình tải theo nhu cầu trong `routes.tsx`. Dùng chung path hoặc hàm dựng URL cho sidebar, dashboard và liên kết tới bản ghi.
- `src/app/router/` ghép route và kiểm tra quyền, `src/app/navigation/` định nghĩa menu, `src/app/layout/` chứa khung ứng dụng. Màn hình chờ có `handle.kind === "placeholder"` để phân biệt khi kiểm tra điều hướng.
- Trong feature, `pages/` ghép màn hình, `components/` hiển thị từng tác vụ, `hooks/` quản lý truy vấn và thao tác ghi, `model/` chứa parser và quy tắc nghiệp vụ. Chỉ tạo thư mục có mã sử dụng.
- `src/shared/ui/` chứa thành phần dùng chung. `src/api/` sở hữu DTO, ETag và HTTP. Adapter trong `src/app/providers/` kết nối HTTP với phiên đăng nhập và trạng thái kết nối khi khởi động.
- `src/pwa/` quản lý service worker và IndexedDB. Logic lưu, gửi lại và lọc phiếu thu mua theo tài khoản và doanh nghiệp nằm trong `src/features/field/offline/`.

Ví dụ, để sửa luồng MRL, bắt đầu từ `src/features/catalogs/routes.tsx`, theo `MrlVersionsPage` tới `useMrlWorkspace`, rồi xem hợp đồng trong `src/api/catalogs.ts`. Kiểm thử màn hình nằm ở `tests/features/api-audit-pages.test.tsx`.

## Kiểm tra trước khi tích hợp

```sh
npm run lint
npm test
npm run build
```

Vitest chạy các nhóm `tests/api/`, `tests/routing/`, `tests/features/` và `tests/pwa/`. Dữ liệu mẫu dùng chung nằm trong `tests/fixtures/`.
