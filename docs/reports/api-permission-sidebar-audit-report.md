# Báo cáo Rà soát Toàn diện: OpenAPI/Scalar, Phân quyền Backend – Frontend, Sidebar, Màn hình & Luồng Nghiệp vụ Chính

- **Ngày rà soát:** 2026-11-25
- **Nguồn đối chiếu trực tiếp:**
  - Live OpenAPI spec backing Scalar (`http://localhost:5080/scalar` / `http://localhost:5080/openapi/v1.json`)
  - Backend source (`GrainLedger/backend/src/GrainLedger.Api`, bao gồm C# endpoints, `Permissions.cs`, `Roles.cs` và PostgreSQL RBAC routines trong `Data/Sql/*.sql`)
  - Frontend source (`GrainLedger-Frontend/web/grainledger/src`, bao gồm `routes.tsx`, `features/*/routes.tsx`, `sidebarItems.ts`, `dashboardConfig.ts`, `src/api/*.ts`, và các trang `features/*/pages/*.tsx`)

---

## 1. Tóm tắt Điều hành (Executive Summary)

| Hạng mục đối chiếu | Số liệu đo đạc thực tế | Đánh giá tổng quan |
|---|---|---|
| **OpenAPI v1 (`http://localhost:5080/openapi/v1.json`)** | **256 operations** trên **194 paths** | Backend API hoàn chỉnh và có tài liệu OpenAPI/Scalar đầy đủ |
| **Endpoint đã khai báo wrapper trong `src/api/*.ts`** | **254 / 256** (99.2%) | Còn **2** endpoint chưa có wrapper (`GET /api/ledger/business-history`, `POST .../workflow/documents/packing-list`) |
| **Endpoint thực sự được UI/hooks gọi trong runtime** | **235 / 256** (91.8%) | Còn **19** endpoint đã viết wrapper nhưng có **0 caller** trong UI (quan trọng nhất: `planning-yield-rules`) |
| **Màn hình / Route Frontend (`routes.tsx`)** | **64 paths** (5 public + 59 protected) | Đã phủ hầu hết luồng chính, trừ quản trị Yield Rule (`MillManager`) & trạng thái user pending (`role = null`) |
| **Role hệ thống** | BE: **6 roles** / **37 permissions** \| FE: **7 roles** | FE có thêm fallback role `AUTHORIZED_STOCK_VIEWER` (`StockViewer`) **không tồn tại ở BE**; **4 permissions** của BE chưa được FE tham chiếu |
| **Khớp quyền Route – Sidebar – Backend API** | Phát hiện **14 điểm lệch** (3 Critical, 5 High, 6 Medium) | Cần sửa ngay lỗi `403 Forbid` ở **Phiên bản MRL (`CustomerManager`)**, **Chuyển kho cách ly (`MillManager`)**, **Gọi `/api/ledger/setup` ở Truy vết (`Customer*`)**, và dọn danh sách `MILL_ADMIN` ở các route không có quyền |

### 3 Phát hiện Mức độ Nghiêm trọng Cao Nhất (Critical)
1. **`CUSTOMER_MANAGER` thấy mục `"Phiên bản MRL"` trên Sidebar và vào được màn hình, nhưng mọi API đều trả `403 Forbid`:**
   - FE `sidebarItems.ts:311-314` hiển thị `/compliance/mrl-versions` cho `CUSTOMER_MANAGER` và `catalogs/routes.tsx:172` cho phép `CUSTOMER_MANAGER` truy cập.
   - Khi mở màn hình, `useMrlWorkspace.ts:48-55` gọi `GET /api/mrl-versions`, trong khi BE `MrlVersionEndpoints.cs:157-158, 351-352, 497-498, 551-552` chỉ cấp quyền đọc MRL cho `platform.configure` (`Administrator`) và `mrl.read` (`ExportStaff`). `CustomerManager` (`Permissions.cs:60`) **không có cả 2 quyền này**.
2. **`MILL_MANAGER` bị chặn `403` ngay trên nút `"Chuyển kho cách ly"` do Route `/stock/transfer` khóa nhầm quyền:**
   - Tại `HoldManagementPage.tsx:373-383`, `MILL_MANAGER` (`holds.process`) được hiển thị nút link sang `/stock/transfer?lotId=...&holdId=...` để thực hiện chuyển kho cách ly HOLD.
   - Cả `StockTransferPage.tsx:70-71` lẫn Backend SQL (`InitialSchema.sql:1516-1535`) đều hỗ trợ rõ `MillManager` chạy `POST /api/ledger/transfers` khi có `holdId`. Tuy nhiên `mill/routes.tsx:483` lại khóa `/stock/transfer` chỉ cho `{ roles: ["MILL_OPERATOR"] }`, khiến `MILL_MANAGER` bị `ProtectedRoute` chặn trước khi vào trang.
3. **Customer roles (`CUSTOMER_MANAGER`, `CUSTOMER_EXPORT_OFFICER`) bị gọi `GET /api/ledger/setup` dẫn tới `403 Setup access denied` ở màn hình Truy vết:**
   - `TraceabilityPage.tsx:240-243` (mở cho `CUSTOMER_MANAGER`, `CUSTOMER_EXPORT_OFFICER`, `MILL_ADMIN`) và `ContainerTracePage.tsx:77-81` (mở cho `CUSTOMER_MANAGER`, `MILL_ADMIN`) gọi `ledgerEndpoints.getSetup()` (`/api/ledger/setup`).
   - Backend SQL (`InitialSchema.sql:3881`) chỉ cho phép `Administrator`, `MillManager`, `MillOperator` gọi `setup`; các role Customer bắt buộc phải dùng `/api/ledger/lookups`.

---

## 2. Đối chiếu Mô hình Role & Permission (Backend vs Frontend)

### 2.1. Bảng ánh xạ Role & Quyền canonical (`Permissions.cs` & `Roles.cs` vs `roles.ts`)

Backend (`GrainLedger.Api/Features/Identity/Domain/Roles.cs:16-21` và `Permissions.cs:55-64`) định nghĩa đúng **6 roles** và **37 permissions**. Frontend (`src/shared/types/roles.ts:5-96`) ánh xạ 6 role này và thêm role thứ 7 là `AUTHORIZED_STOCK_VIEWER`:

| Backend Role | OrganizationKind | Frontend `UserRole` (`normalizeUserRole`) | Bộ Permissions Backend (`Permissions.ForRole`) | Sai khác đáng chú ý trên Frontend |
|---|---|---|---|---|
| `Administrator` | `Mill` | `MILL_ADMIN` | `identity.manage`, `platform.configure`, `trace.read.all`, `residue.policy.manage` **(4 quyền)** | FE `routes.tsx` gán nhầm `MILL_ADMIN` vào 20+ route Nghiệp vụ Field / Mill / Export / Holds vốn đòi hỏi quyền khác |
| `MillManager` | `Mill` | `MILL_MANAGER` | `platform.read`, `lots.read.all`, `conversions.read`, `conversions.confirm`, `corrections.reconcile`, `receiving.reconcile`, `holds.process`, `reconciliation.read`, `history.read`, `residue.evaluate`, `blend.yield-policy.manage` **(11 quyền)** | Thiếu UI cho `blend.yield-policy.manage`; bị chặn nhầm ở route `/stock/transfer`; bị hiện nhầm `/mill/operations/new` ở sidebar |
| `MillOperator` | `Mill` | `MILL_OPERATOR` | `platform.read`, `lots.read.facility`, `lots.receive`, `conversions.write`, `containers.operate`, `history.read`, `residue.evaluate` **(7 quyền)** | Khớp khá tốt trừ `compliance/routes.tsx` không khóa `/compliance/residue-profiles` & `/company-policies` ở router |
| `CustomerManager` | `Customer` | `CUSTOMER_MANAGER` | `farms.read`, `lots.read.tenant`, `lab.write`, `blend.approve`, `holds.manage`, `trace.read.tenant`, `history.read`, `export-orders.read`, `residue.company-policy.manage`, `residue.evidence.manage`, `residue.evaluate`, `blend.assessment-policy.manage`, `blend.quality-evidence.manage` **(13 quyền)** | Bị 403 ở `/compliance/mrl-versions` (thiếu `mrl.read`); bị gọi `403 /api/ledger/setup` ở Truy vết |
| `ExportStaff` | `Customer` | `CUSTOMER_EXPORT_OFFICER` | `mrl.read`, `lots.read.tenant`, `lab.read`, `blend.propose`, `containers.write`, `trace.read.tenant`, `history.read`, `export-orders.read`, `export-orders.write`, `residue.evaluate` **(10 quyền)** | Có `lab.read` nhưng bị khóa ở `/compliance/lab-*`; bị gọi `/api/ledger/setup` (403) ở `TraceabilityPage`; `TraceReadTenant` ở BE C# khác SQL ở `ContainerTrace` |
| `PurchasingStaff` | `Customer` | `CUSTOMER_PROCUREMENT_OFFICER` | `farms.write`, `purchases.write`, `history.read` **(3 quyền)** | Không bị chặn ở router cho `/stock` và `/compliance/residue-profiles` dù không có `lots.read.*` hay `residue.evaluate` |
| *(Không tồn tại)* | — | `AUTHORIZED_STOCK_VIEWER` (`roles.ts:86,95` fallback khi `role = null` hoặc `StockViewer`) | **`[]` (0 quyền)** | BE SQL `ledger_role(a)` trả `NULL` -> `42501 Active actor required`. Nhưng FE `dashboardConfig.ts:388` & `sidebarItems.ts:368-382` cho gọi `/api/ledger/lots` (luôn lỗi 403) |

### 2.2. Các Permission Backend chưa được tham chiếu trên Frontend
Qua rà soát toàn bộ mã nguồn `src/` (loại trừ file test), **4/37 permission** của Backend chưa hề xuất hiện trong bất kỳ route guard, sidebar hay component check nào ở Frontend:
1. `blend.yield-policy.manage` (`MillManager`) — **Thiếu hẳn tính năng UI** (không chỉ thiếu check quyền mà thiếu cả màn hình gọi `POST /api/ledger/planning-yield-rules`).
2. `mrl.read` (`ExportStaff`) — Màn hình MRL hiện kiểm tra theo mảng `roles` thay vì `mrl.read` (dẫn tới lọt `CUSTOMER_MANAGER` không có `mrl.read`).
3. `history.read` (`MillManager`, `MillOperator`, `CustomerManager`, `ExportStaff`, `PurchasingStaff`) — `/events` (`auditRoutes`) đang mở không kiểm tra quyền.
4. `reconciliation.read` (`MillManager`) — `/mill/reconciliations` đang kiểm tra `roles` chứ không kiểm tra `reconciliation.read` / `corrections.reconcile`.

---

## 3. Rà soát Chi tiết Khớp quyền giữa Route Guard, Sidebar & Backend API

Dưới đây là toàn bộ các **bất đồng bộ đã xác minh bằng mã nguồn** giữa `features/*/routes.tsx` (`ProtectedRoute`), `src/app/navigation/sidebarItems.ts`, `dashboardConfig.ts`, và tầng bảo vệ của Backend (C# `RequireAuthorization` + SQL `ledger_role` / `CanReadAsync`).

### 3.1. Bảng Tổng hợp Sai lệch Màn hình & Sidebar

| Mức độ | Màn hình / Route | Quy định Router FE (`*routes.tsx`) | Hiển thị Sidebar (`sidebarItems.ts`) | Quy định Thực tế của Backend (API / SQL) | Hệ quả & Vấn đề cụ thể |
|---|---|---|---|---|---|
| **Critical** | `/compliance/mrl-versions` (`MrlVersionsPage`) | `catalogs/routes.tsx:172`: `MILL_ADMIN`, `CUSTOMER_MANAGER`, `CUSTOMER_EXPORT_OFFICER` | Hiện cho `MILL_ADMIN` (`:111`), `CUSTOMER_MANAGER` (`:312`), `CUSTOMER_EXPORT_OFFICER` (`:358`) | `MrlVersionEndpoints.cs:157-158, 351-352, 497-498, 551-552`: bắt buộc **`platform.configure`** (`Administrator`) hoặc **`mrl.read`** (`ExportStaff`) | **`CUSTOMER_MANAGER` click vào Sidebar → trang gọi `GET /api/mrl-versions` → 403 Forbid**. |
| **Critical** | `/stock/transfer` (`StockTransferPage`) | `mill/routes.tsx:483`: **Chỉ `MILL_OPERATOR`** | `sidebarItems.ts:398`: Chỉ `MILL_OPERATOR` | `InitialSchema.sql:1516-1535`: Transfer thường (`holdId = null`) cần `MillOperator`; Transfer cách ly HOLD (`holdId != null`) cần **`MillManager`** | `HoldManagementPage.tsx:376` cho `MILL_MANAGER` bấm link sang `/stock/transfer?lotId=...&holdId=...` → **bị `ProtectedRoute` chặn 403**. |
| **Critical** | `/risk/traceback` & `/risk/container-trace` (`TraceabilityPage`, `ContainerTracePage`) | `/traceback`: `CUSTOMER_MANAGER`, `CUSTOMER_EXPORT_OFFICER`, `MILL_ADMIN`<br>`/container-trace`: `CUSTOMER_MANAGER`, `MILL_ADMIN` | `/traceback`: `CUSTOMER_MANAGER` (không hiện cho `EO`/`MA` trong sidebar)<br>/container-trace: `CUSTOMER_MANAGER`, `MILL_ADMIN` | `GET /api/ledger/setup` (`InitialSchema.sql:3881`) chỉ cho `Administrator`, `MillManager`, `MillOperator`. Customer phải dùng `/api/ledger/lookups` | `TraceabilityPage.tsx:242` & `ContainerTracePage.tsx:79` gọi `getSetup()` vô điều kiện → **Customer roles ăn `403 Setup access denied` ngay khi load trang**. |
| **High** | 11 routes Xuất khẩu (`export/routes.tsx:330-351`: `/export/orders`, `/export/plans*`, `/export/containers*`, `/export/dossiers*`) | `readers`: `roles: ["CUSTOMER_EXPORT_OFFICER", "CUSTOMER_MANAGER", "MILL_ADMIN"]` **KÈM `permission: "export-orders.read"`** | Không hiện cho `MILL_ADMIN`; hiện `/export/orders` & `/dossiers` cho `EO`, chỉ `/ledger/container-preparation` cho `CM`/`MM`/`MO` | `ExportEndpoints.cs:81-91`: `ScopeAsync` yêu cầu `OrganizationKind.Customer` + `ExportOrdersRead` (`ExportStaff` hoặc `CustomerManager`) | `ProtectedRoute.tsx` đòi thỏa **CẢ HAI** `allowedRoles` VÀ `requiredPermission` nên `MILL_ADMIN` luôn bị chặn, nhưng khai báo `MILL_ADMIN` trong `readers.roles` là **dư thừa & gây hiểu nhầm**. Tương tự, `CUSTOMER_MANAGER` không có link `/export/plans/pending` trên sidebar dù dashboard shortcut (`:284`) dẫn tới đó. |
| **High** | `/field/farmers/new`, `/field/plots/new`, `/field/receipts/new`, `/field/sync` | `field/routes.tsx:399-407`: đều cho phép thêm **`MILL_ADMIN`** (kể cả `CUSTOMER_MANAGER` ở `receipts/new`) | Chỉ hiện cho `CUSTOMER_PROCUREMENT_OFFICER` (riêng `crop-seasons` hiện cho `MA`, `PO`, `CM` theo `platform.configure` / `farms.*`) | `FarmerEndpoints.cs:307` & `PlotEndpoints.cs:332`: cần `farms.read \|\| farms.write`. `ProcurementEndpoints.cs:65, 523`: list cần `purchases.write \|\| lots.read.tenant`, ref-data cần `purchases.write` | **`MILL_ADMIN` không có `farms.*`, `purchases.write`, `lots.read.tenant`** → truy cập URL trực tiếp sẽ gặp hàng loạt lỗi `403` khi tải farmers/plots/procurements. Riêng `CUSTOMER_MANAGER` vào `/field/receipts/new` bị lỗi ngầm `getReferenceData` (bắt `.catch(() => null)` ở `ProcurementReceiptPage.tsx:195`). |
| **High** | `/mill/receiving`, `/mill/operations/new`, `/mill/reconciliations*`, `/mill/plan-executions/:planId` | `mill/routes.tsx:479-488`: các route này có mặt **`MILL_ADMIN`** | Không hiện các mục này cho `MILL_ADMIN` | `receiving-tasks`, `receiving/{id}`, `ledger_can_read_operation`, `container-work-items` đều yêu cầu `MillOperator` hoặc `MillManager` thuộc cơ sở được phân công (`ledger_assigned`) | `MILL_ADMIN` vào các route này sẽ bị `403` hoặc trắng dữ liệu; riêng `ApprovedPlanExecutionPage.tsx:77-82` tự check `allowed = operator \|\| manager` nên trang tự chặn `MILL_ADMIN` dù router mở. |
| **High** | `/risk/holds/new` & `/risk/holds` | `risk/routes.tsx:516-517`: cho `MILL_ADMIN` vào cả `holds/new` và `holds` (ngoài `CM`, `MM`, `EO`) | Hiện cho `MM`, `CM`, `EO`; **không hiện cho `MILL_ADMIN`** | `POST /api/ledger/holds` đòi **`holds.manage`** (`CustomerManager`). `GET /api/ledger/holds` kiểm tra `ledger_can_read_lot` (`Customer*` hoặc `MillManager`/`MillOperator` được phân công — **loại trừ `Administrator`**!) | `MILL_ADMIN` mở `/risk/holds` nhận **danh sách trống/403** và không thể tạo HOLD (`holds/new`). Ngoài ra `CUSTOMER_EXPORT_OFFICER` thấy `"Cảnh báo HOLD"` ở sidebar & xem được HOLD lô của công ty mình (read-only), nhưng ở `ContainerTracePage.tsx:62-65` biến `canPlaceHold` kiểm tra thừa `permissions.includes("containers.write")` (sai quyền, vì `ExportStaff` không tạo được HOLD). |
| **High** | `/stock` & `/stock/lots/:lotId` (`StockOverviewPage`) | `mill/routes.tsx:489-490`: **`screenRoute` KHÔNG có `roles` hay `permission`** (mọi user đăng nhập đều qua) | `sidebarItems.ts:440-454` vừa sửa: chỉ hiện `"Tồn kho sổ cái"` nếu có `lots.read.all \| facility \| tenant` (và `STOCK_VIEWER`) | `InitialSchema.sql:754-768` (`ledger_can_read_lot`): chỉ `CustomerManager`, `ExportStaff`, `PurchasingStaff` (sở hữu) và `MillManager`, `MillOperator` (cơ sở). **`Administrator` & `StockViewer` không có quyền** | `MILL_ADMIN` vào `/stock` (hoặc gõ từ Global Search `⌘K`!) sẽ bị 403/rỗng; tài khoản `role=null` (`AUTHORIZED_STOCK_VIEWER`) bị lỗi 403 trên `/api/ledger/lots`. Nên thêm guard `{ permission / permissions }` vào router. |
| **Medium** | `/compliance/residue-profiles` & `/compliance/company-policies` | `compliance/routes.tsx:220, 222`: **KHÔNG có guard ở router** | Sidebar (`sidebarItems.ts:417-439`) check rất chuẩn theo `residue.company-policy.manage` và 4 quyền `residue.*` | `ResidueRules.cs:393`: đọc profiles cần `residue.policy.manage` hoặc `residue.evaluate`. `ResiduePolicySettings.cs:141-142`: đọc settings cần `Customer` + `residue.evaluate` (`CustomerManager`, `ExportStaff`) | `PurchasingStaff` hoặc `Mill*` truy cập thẳng URL `/compliance/company-policies` sẽ thấy alert từ component (`CompanyResiduePoliciesPage.tsx:50`), còn mở `/compliance/residue-profiles` sẽ gọi `GET /api/residue-rules` → `403 Forbid` (`ResidueProfilesPage`). Đồng thời `CUSTOMER_EXPORT_OFFICER` có `residue.evaluate` (đọc được `/api/residue-policy-settings` ở BE), nhưng `sidebarItems.ts:417` lại ẩn `/compliance/company-policies` vì check `residue.company-policy.manage` (chỉ để xem thì component cũng đang chặn ở dòng 51!). |
| **Medium** | `/mill/operations/new` (`OperationEntryPage`) cho `MILL_MANAGER` | `mill/routes.tsx:480`: cho phép `MILL_OPERATOR`, `MILL_MANAGER`, `MILL_ADMIN` | `sidebarItems.ts:198-201`: **HIỆN `"Ghi bước chế biến"` cho `MILL_MANAGER`** không qua check `conversions.write` | `POST /api/ledger/operations` & `/commit` đòi `conversions.write` (`MillOperator`). `MillManager` chỉ có `conversions.read` + `conversions.confirm` | `MILL_MANAGER` bấm vào sidebar chỉ xem ở chế độ read-only (`canWrite = false` ở `OperationEntryPage.tsx:127`), dễ gây nhầm lẫn vai trò với `Operator`. |
| **Medium** | `/risk/container-trace` (`ContainerTraceEndpoints.cs` vs SQL vs FE) | `risk/routes.tsx:515`: `CUSTOMER_MANAGER`, `MILL_ADMIN` | `sidebarItems.ts:409`: `CUSTOMER_MANAGER`, `MILL_ADMIN` | C# `ContainerTraceEndpoints.cs:21`: kiểm tra `TraceReadTenant \|\| TraceReadAll` (`CustomerManager`, `ExportStaff`, `Administrator`). **NHƯNG SQL `ContainerExecution.sql:131` chặn `ExportStaff`** (`r NOT IN ('CustomerManager','Administrator')`) | Frontend vô tình khớp SQL (không cho `ExportStaff`), nhưng tầng C# Endpoint đang khai báo lỏng hơn SQL (`ExportStaff` qua được C# nhưng rớt `403` trong Postgres). |
| **Medium** | `/events` & `/events/:type/:id` (`EventHistoryPage`) | `audit/routes.tsx:103-104`: **KHÔNG có guard ở router** | Hiện cho 6 role chính (`sidebarItems.ts`), ẩn với `AUTHORIZED_STOCK_VIEWER` | `GET /api/ledger/history` kiểm tra `ledger_can_read_lot/operation` (`Administrator` luôn ra rỗng!). `GET /api/ledger/business-history` kiểm tra `HistoryRead \|\| IdentityManage` | `MILL_ADMIN` bấm `"Tìm sự kiện"` mở tab mặc định `"ledger"` luôn thấy **trống**; `AUTHORIZED_STOCK_VIEWER` mở thẳng `/events` bị 403/rỗng. |
| **Medium** | `/compliance/lab-samples` & `/compliance/lab-results` cho `ExportStaff` | `compliance/routes.tsx:215-218`: Chỉ `CUSTOMER_MANAGER` | Không hiện cho `CUSTOMER_EXPORT_OFFICER` | `Permissions.cs:61`: `ExportStaff` có **`lab.read`** (`SampleEndpoints.cs:344-348` & `LabReportEndpoints.cs:608` đều cho phép đọc bằng `lab.read`) | `CUSTOMER_EXPORT_OFFICER` chỉ dùng được `lab.read` gián tiếp khi bấm truy vết từ Lab ở `TraceabilityPage`, không mở xem danh sách/chi tiết chứng thư lab được. |
| **Low** | User menu `"Bảo mật tài khoản"` (`/settings/security`) & Route `/invite/:token` | `auth/routes.tsx:142, 148` | Header `AppHeader.tsx:321` link tới `/settings/security` | Backend không có API đổi mật khẩu lúc đang đăng nhập hoặc API lời mời (`/invite`) | FE đã xử lý khéo léo bằng trang thông báo chuyển sang `/forgot-password` & `/register`, nhưng menu `"Bảo mật tài khoản"` vẫn khiến user tưởng có form đổi mật khẩu trực tiếp. |

---

## 4. Rà soát Toàn bộ API OpenAPI / Scalar (`256` Operations) vs Frontend

### 4.1. Thống kê theo Module Backend

| Module Backend | Số lượng Endpoint OpenAPI | Đã bọc Wrapper `src/api/` | Đang được UI gọi | Chưa bọc Wrapper / Chưa có UI |
|---|---|---|---|---|
| **Health (`/health`)** | 1 | 1 (`api/health.ts`) | 1 (`uiStore.ts`) | **0** |
| **Identity (`/api/auth/*`, `/api/profile`, `/api/admin/*`)** | 21 | 21 (`auth.ts`, `profile.ts`, `admin.ts`) | 16 | **5** (`0` chưa wrap + `5` chưa gọi UI: `web-login`, `csrf`, `google`, `google/complete`, `GET /api/profile`) |
| **Catalogs (`/api/active-substances`, `/markets`, `/commodities`, `/quality-attributes`, `/rice-varieties`, `/measurement-units`, `/mrl-versions`, `/residue-rules`, `/residue-policy-settings`, `/blend-assessment-policies`)** | 47 | 47 (`catalogs.ts`, `residue.ts`, `planning.ts`) | 45 | **2** (`0` chưa wrap + `2` chưa gọi UI: `POST /api/residue-policy-settings`, `GET /api/residue-policy-settings/{id}`) |
| **Capture (`/api/farmers`, `/plots`, `/crop-seasons`, `/plot-seasons`, `/spray-declarations`, `/procurements`, `/procurement-reference-data`, `/source-lots`, `/samples`, `/lab-reports`, `/residue-source-groups`, `/residue-report-selections`)** | 51 | 51 (`procurement.ts`, `compliance.ts`, `residue.ts`) | 49 | **2** (`0` chưa wrap + `2` chưa gọi UI: `GET /api/farmers/{id}`, `GET /api/plot-seasons/{id}`) |
| **Ledger (`/api/ledger/*`)** | 76 | 75 (`ledger.ts`, `containerPreparation.ts`, `planning.ts`) | 71 | **5** (**1 chưa wrap**: `GET /api/ledger/business-history`; **4 wrap nhưng 0 caller**: `planning-yield-rules` x2, `commit-loading`, `receiving-thresholds/companies`; ghi chú: `GET /api/ledger/history` có wrapper ở `api/ledger.ts:485`) |
| **Exports & Shipments (`/api/export-availability`, `/export-orders/*`, `/export-containers/*`, `/blend-plans/*`, `/api/container-*`)** | 60 | 59 (`exports.ts`, `planning.ts`, `containerExecution.ts`) | 53 | **7** (**1 chưa wrap**: `POST .../workflow/documents/packing-list`; **6 wrap nhưng 0 caller**: `export-availability`, `orders/{id}/specifications`, `stock-preview`, `inventory-scope`, `candidates/{lotId}/residue-preview`, `blend-plans/{id}/residue-preview`) |
| **Tổng cộng** | **256** | **254** | **235** | **21** (**2 chưa wrap + 19 wrap nhưng 0 UI caller**) |

> *Ghi chú đối chiếu `src/api/`*: Toàn bộ 254 wrapper nằm sạch trong `src/api/*.ts` và khớp đường dẫn/HTTP method với OpenAPI v1 (0 endpoint "ma" gọi sai URL hoặc HTTP method đã bị xóa ở backend).

### 4.2. Chi tiết 2 Endpoint Backend chưa được Wrapper ở Frontend

1. **`GET /api/ledger/business-history`** (`Features/Ledger/Endpoints/LedgerEndpoints.cs:17-39`)
   - **Backend:** Cung cấp lịch sử nghiệp vụ hợp nhất server-side, hỗ trợ lọc `category`, `eventType`, `search`, `from`, `to`, phân trang `page`, `pageSize`; cấp quyền cho `HistoryRead` và `IdentityManage` (`Administrator`).
   - **Frontend hiện tại:** `EventHistoryPage.tsx:115` gọi `fetchBusinessHistory()` trong `features/audit/model/businessHistory.ts` — hàm này tự gọi **9 endpoint song song** (`getProcurements`, `getSamples`, `getLabReports`, `getOperations`, `getCorrections`, `getHolds`, `getOrders`, `getWorkItems`, `getNotifications`) và nuốt lỗi bằng `.catch(() => undefined)`.
   - **Tác động:** Thiếu tính nhất quán phân trang server, dễ phát sinh nhiều HTTP `403` ngầm theo từng role trong DevTools, và khiến `MILL_ADMIN` không xem được lịch sử hợp nhất do server tổng hợp.

2. **`POST /api/export-containers/{id}/workflow/documents/packing-list`** (`Features/Exports/Shipments/ContainerWorkflowEndpoints.cs:85-87`)
   - **Backend:** Endpoint chuyên trách ghi nhận / sinh chứng từ Packing List cho container (`Permissions.ContainersWrite`).
   - **Frontend hiện tại:** `ContainerDossierPanel.tsx:69-100` dùng `buildPackingListDocument()` (`packingList.ts:147-265`) để tạo chuỗi HTML ngay trên trình duyệt, mã hóa Base64 rồi POST vào endpoint chứng từ tổng quát `POST /api/export-containers/{id}/workflow/documents`.
   - **Tác động:** Hệ thống vẫn lưu được file HTML Packing List, nhưng không tận dụng endpoint chuyên dụng của backend (gây lệch kiến trúc khi backend cập nhật validation/mẫu Packing List riêng).

### 4.3. Phân loại 19 Endpoint đã Wrapper nhưng Có 0 Caller trong UI

#### A. Thiếu hẳn Tính năng / Màn hình UI (Cần bổ sung)
- **`POST /api/ledger/planning-yield-rules`** (`planningEndpoints.createYieldRule`) & **`GET /api/ledger/planning-yield-rules/applicable`** (`planningEndpoints.getApplicableYieldRules`):
  - **Backend (`PlanningYieldRules.cs:15-58` & `Permissions.cs:58`):** Dành cho **`MillManager` (`blend.yield-policy.manage`)** công bố tỷ lệ thu hồi / hiệu suất dự kiến theo `facilityId` + `compatibilityPolicyId` kèm chứng cứ để bộ giải phối trộn sử dụng; `ExportStaff` & `CustomerManager` đọc quy tắc hiệu lực qua `/applicable`.
  - **Frontend:** Chưa có tab, form hay màn hình nào trong `BalancePolicyPage.tsx`, `SafetyMarginPolicyPage.tsx` hoặc `Mill` gọi 2 API này.

#### B. Endpoint Chẩn đoán / Preview Bổ trợ bị Bỏ qua (Thường dùng trong Export Planning)
- **`GET /api/export-availability`** (`exportEndpoints.getAvailability`)
- **`GET /api/export-containers/{id}/stock-preview`** (`exportEndpoints.getStockPreview`)
- **`GET /api/export-containers/{id}/inventory-scope`** (`exportEndpoints.getInventoryScope`)
- **`GET /api/export-containers/{id}/candidates/{lotId}/residue-preview`** (`exportEndpoints.getCandidateResiduePreview`)
- **`POST /api/blend-plans/{id}/residue-preview`** (`planningEndpoints.previewResidue`)
- *Đánh giá:* Hiện tại `BlendPlanRequestPage.tsx` dùng `getPlanningContext` + `getCandidates` + `previewPlan` (đã trả sẵn diagnostics & kết quả đánh giá tổng hợp) nên 5 endpoint phụ chưa được gắn thêm vào UI điều tra chi tiết.

#### C. Đã thay bằng API / Flow Mới Hơn hoặc Dư Thừa Hợp Lệ (Không cần gọi)
- **`POST /api/ledger/containers/{id}/commit-loading`** (`containerPreparationEndpoints.commitLoading`): Chú thích rõ tại `src/api/containerPreparation.ts:71-73` là Backend từ chối chuyển trạng thái với `409`; luồng thực xuất dùng `containerExecutionEndpoints.recordLoad` + `close`.
- **`GET /api/export-orders/{id}/specifications`** (`exportEndpoints.getSpecifications`): `ExportOrderMaintenance.tsx:48` lấy thông số tiêu chuẩn chất lượng nhúng sẵn trong `getOrderResource` (`GET /api/export-orders/{id}`).
- **`GET /api/ledger/receiving-thresholds/companies`** (`ledgerEndpoints.getReceivingThresholdCompanies`): `ReceivingThresholdsPage.tsx:69-72` lấy đủ dữ liệu qua `GET /api/ledger/receiving-thresholds` + `GET /api/admin/organizations`.
- **`POST /api/residue-policy-settings`** & **`GET /api/residue-policy-settings/{id}`** (`residue.ts:39,44`): `CompanyResiduePoliciesPage.tsx` dùng `batchPolicySettings` (`/batch`) và `getPolicySettings` (list).
- **`GET /api/farmers/{id}`**, **`GET /api/plot-seasons/{id}`**: Dùng dữ liệu từ danh sách list.
- **`GET /api/profile`**, **`POST /api/auth/web-login`**, **`GET /api/auth/csrf`**, **`GET /api/auth/google`**, **`GET /api/auth/google/complete`**: Nhóm Identity kỹ thuật (`main.tsx` dùng `/api/auth/session`, đăng nhập web dùng JWT `/api/auth/login`, Google login dùng `window.location` / link trực tiếp ở `SignInPage.tsx`, `client.ts` tự gọi `/api/auth/csrf` khi cần cookie session).

---

## 5. Rà soát Đầy đủ Màn hình & Luồng Nghiệp vụ Chính (End-to-End Business Workflows)

| # | Luồng nghiệp vụ chính | Màn hình FE tham gia | Endpoint BE chính | Đánh giá mức độ đầy đủ & Điểm nghẽn thực tế |
|---|---|---|---|---|
| **1** | **Định danh, Xác thực & Phân quyền (`Identity`)** | `LandingPage`, `SignInPage`, `RegisterPage`, `ForgotPasswordPage`, `EditProfilePage`, `CustomerOrganizationsPage`, `UserAccessManagementPage` | `/api/auth/*`, `/api/profile`, `/api/admin/{roles,organizations,users}` | **Đủ luồng chính.** Có đăng ký + verify email, Google OAuth, JWT refresh rotation, logout-all, tạo Mill/Customer org, gán role + ETag concurrency.<br>**Thiếu/Lệch:** Backend không có Invite token & Change Password đang đăng nhập (FE giữ màn thông báo `/invite/:token`, `/settings/security`); user `role=null` chưa có màn hình `"Chờ kích hoạt quyền"` riêng (bị rơi vào `AUTHORIZED_STOCK_VIEWER` và lỗi 403 khi mở `/home` & `/stock`); chưa có sửa/xóa Organization. |
| **2** | **Cấu hình Nền tảng, Danh mục & MRL (`Catalogs` + `Admin Setup`)** | `MasterDataPage`, `MrlVersionsPage`, `FacilityConfigPage`, `BalancePolicyPage`, `ReceivingThresholdsPage`, `ReceivingThresholdHistoryPage`, `OwnReceivingThresholdPage` | `/api/{commodities,markets,active-substances,quality-attributes,rice-varieties,measurement-units}`, `/api/mrl-versions/*`, `/api/ledger/{facilities,locations,equipment,assignments,policies,compatibilities,mixed-bulk-policies,receiving-thresholds}` | **Rất đầy đủ.** Hỗ trợ đủ CRUD danh mục, Import/Publish/Resolve MRL, Clearance kho trống, Retire thiết bị, lịch sử ngưỡng tiếp nhận & trang xem ngưỡng riêng của công ty khách.<br>**Lỗi:** `CUSTOMER_MANAGER` thấy & vào được `/compliance/mrl-versions` nhưng ăn `403`. |
| **3** | **Quản lý Vùng trồng, Khai báo BVTV, Thu mua Offline & Lấy mẫu (`Capture` / `Field`)** | `FarmerRegistrationPage`, `PlotRegistrationPage`, `CropSeasonsPage`, `PesticideDeclarationPage`, `ProcurementReceiptPage`, `ProcurementDetailPage`, `SourceLotDetailPage`, `FieldSampleRegistrationPage`, `OfflineSyncQueuePage` | `/api/{farmers,plots,crop-seasons,plot-seasons,spray-declarations,procurements,source-lots,samples,procurement-reference-data}` | **Đủ toàn diện E2E.** Bao gồm kiểm tra trùng lặp, GeoJSON MapPicker, lịch sử phun dạng modal, hàng đợi IndexedDB offline với `clientOperationId` idempotent, modal chi tiết lô nguồn.<br>**Lỗi quyền:** `field/routes.tsx` gán nhầm `MILL_ADMIN` vào `farmers`, `plots`, `receipts`, `sync`. |
| **4** | **Tiếp nhận Nhà máy, Chế biến, Điều chuyển & Bút toán Bù (`Ledger` / `Mill`)** | `ReceivingTasksPage`, `OperationEntryPage`, `OperationDraftsPage`, `VarianceReviewPage`, `StockTransferPage`, `CorrectionRequestPage`, `CorrectionManagementPage`, `StockOverviewPage` + `StockLotDetailModal` | `/api/ledger/{receiving-tasks,receiving,operations,corrections,transfers,lots,lookups,setup,evidence}` | **Rất chặt chẽ.** Có cân đến + duyệt thiếu hàng, 5 công đoạn (`DRYING/MILLING/MERGE/BLENDING/BAGGING`), quản lý pool revision cho `Mixed-Bulk`, rà soát chênh lệch cần chứng cứ quản lý, bút toán bù 4 bước (`Request → Reconcile/Cancel → Replacement Draft → Commit`).<br>**Lỗi:** `MILL_MANAGER` **không vào được `/stock/transfer`** khi đi từ trang HOLD; `MILL_MANAGER` bị hiện dư `"Ghi bước chế biến"` trên sidebar; `/stock` chưa đặt route guard. |
| **5** | **Kiểm nghiệm Lab, Hồ sơ & Chứng cứ Dư lượng (`Compliance`)** | `LabSampleRegistrationPage`, `MrlComplianceCheckPage`, `ResidueProfilesPage`, `CompanyResiduePoliciesPage`, `ResidueEvidencePage` | `/api/{samples,lab-reports,residue-rules,residue-policy-settings,residue-source-groups,residue-report-selections}` | **Đầy đủ & chuyên sâu.** Đã bọc đầy đủ quy trình mẫu → kết quả lab + file → xác nhận 2 bước (`IdentityChecked` & `TranscriptionChecked`) → hồ sơ phân giải/xử lý toàn chuỗi (`WholeFlowResidueProfiles`) → chính sách công ty + lựa chọn chứng cứ/nhóm nguồn.<br>**Lỗi quyền:** Router mở toang `/compliance/residue-profiles` và `/company-policies`; `ExportStaff` (`lab.read`) chưa vào được trang xem lab. |
| **6** | **Thiết lập Đánh giá Xuất khẩu & Lập Phương án Phối trộn (`Planning` & `Yield Policy`)** | `SafetyMarginPolicyPage`, `ExportWorkspacePage` (Orders / Plans), `BlendPlanRequestPage`, `BlendPlanReviewPage` | `/api/export-orders/*`, `/api/blend-assessment-policies/*`, `/api/ledger/planning-quality-observations`, `/api/ledger/planning-yield-rules*`, `/api/blend-plans/*` | **Luồng chính chạy tốt nhưng THIẾU MỘT MẢNH GHÉP QUAN TRỌNG:**<br>- Có đủ tạo/sửa Order, Spec, chia Container, Safety Margin Policy, Quality Observation (`CustomerManager`), chọn Candidate + Preview Solver + Propose (`ExportStaff`) và Approve/Reject/Revoke (`CustomerManager`).<br>- **THIẾU UI CHO `Planning Yield Rules`** (`MillManager` — `blend.yield-policy.manage`): chưa có màn hình công bố quy tắc hiệu suất dự kiến (`POST /api/ledger/planning-yield-rules`). Ngoài ra thiếu nút sidebar dẫn thẳng tới `/export/plans/pending` cho `CUSTOMER_MANAGER`. |
| **7** | **Sản xuất Container, Bàn giao, Thực xếp, Đóng niêm & Hồ sơ (`Shipments`)** | `ContainerPreparationPage`, `ApprovedPlanExecutionPage`, `ContainerWorkflowPage` (Plan / Loading / Closure / Dossier), `ExportWorkspacePage` (Containers / Dossiers) | `/api/ledger/containers/*`, `/api/container-work-items`, `/api/container-production`, `/api/export-containers/{id}/{production,workflow,execution}/*` | **Hoàn chỉnh nhất trong toàn hệ thống.** Liên kết xuyên suốt giữa Customer (`ExportStaff`/`CustomerManager`) và Mill (`MillOperator`/`MillManager`): từ Preparation nháp → Request Production → Operator Draft/Commit/Next → Customer Approve/Reject → Scope Review → Handoff Draft/Approve/Commit → Actual Loading → Closure → Dossier & Document Upload/Download.<br>**Ghi chú nhỏ:** Packing list HTML tự sinh ở client gửi qua `/workflow/documents` thay vì endpoint `/documents/packing-list`. |
| **8** | **Truy vết & Quản lý Lệnh HOLD (`Risk`)** | `TraceabilityPage`, `ContainerTracePage`, `HoldManagementPage` | `/api/ledger/{trace/starts,trace,trace/from-lab,holds}`, `/api/export-containers/{id}/execution/{trace,holds}`, `/api/export-containers/{id}/workflow/hold-responses` | **Đầy đủ nghiệp vụ, vướng lỗi kỹ thuật ở quyền & API phụ:**<br>- Truy vết xuôi/ngược theo lot, từ Lab Confirmed Result, truy xuất thực xếp container, phát hành HOLD kèm chứng cứ, phản hồi HOLD đa trạng thái (`ACKNOWLEDGED`, `ISOLATED`, `RESPONDED`).<br>**Lỗi:** Cả `TraceabilityPage` & `ContainerTracePage` gọi `/api/ledger/setup` gây `403` cho Customer; `HoldManagementPage` (`MILL_MANAGER`) bị chặn ở `/stock/transfer` khi bấm cách ly HOLD; `MILL_ADMIN` được route vào `holds` dù Backend không cấp quyền xem HOLD. |
| **9** | **Lịch sử & Kiểm toán (`Audit`)** | `EventHistoryPage` + `EventDetailsModal` | `GET /api/ledger/history`, `GET /api/ledger/business-history` *(chưa nối)* | **Cần đồng bộ API:** Đang tách 2 tab `ledger` (gọi `getHistory`) và `business` (gọi 9 API client thay cho `GET /api/ledger/business-history`). Chưa có guard kiểm tra `history.read \| identity.manage`. |

---

## 6. Danh sách Hành động Đề xuất (Ưu tiên Thực thi)

### P0 — Sửa ngay (Gây lỗi `403 Forbid` hoặc đứt luồng nghiệp vụ đang có nút bấm)
1. **Sửa quyền & sidebar MRL Versions (`CUSTOMER_MANAGER`):**
   - Bỏ `"Phiên bản MRL"` khỏi sidebar của `CUSTOMER_MANAGER` (`src/app/navigation/sidebarItems.ts:310-314`) và bỏ `"CUSTOMER_MANAGER"` khỏi `catalogs/routes.tsx:172`, thêm `permission` check thích hợp (hoặc dùng màn/quyền `mrl.read` cho `ExportStaff` và `platform.configure` cho `MILL_ADMIN`; nếu nghiệp vụ muốn `CustomerManager` đọc được MRL thì cần bổ sung `Permissions.MrlRead` cho `Roles.CustomerManager` ở Backend `Permissions.cs:60`).
2. **Mở route `/stock/transfer` & sidebar cho `MILL_MANAGER` (cách ly HOLD):**
   - Cập nhật `src/features/mill/routes.tsx:483` cho phép `roles: ["MILL_OPERATOR", "MILL_MANAGER"]` (hoặc phân tách rõ `conversions.write` vs `holds.process`) để nút `"Chuyển kho cách ly"` trong `HoldManagementPage.tsx:376` hoạt động đúng cho `MILL_MANAGER`. Cân nhắc bổ sung item điều chuyển/cách ly HOLD vào sidebar của `MILL_MANAGER` nếu cần thao tác trực tiếp.
3. **Thay `getSetup()` bằng `getLookups()` trên các màn hình Truy vết:**
   - Trong `src/features/risk/pages/TraceabilityPage.tsx:242` và `src/features/risk/pages/ContainerTracePage.tsx:79`, không gọi `/api/ledger/setup` cho tài khoản Customer; chuyển sang `/api/ledger/lookups` (`ledgerEndpoints.getLookups()`) hoặc chỉ gọi `getSetup()` khi `user.permissions.includes("platform.configure")` (`MILL_ADMIN`).

### P1 — Chuẩn hóa phân quyền Route vs Sidebar & Bổ sung UI còn thiếu
4. **Dọn danh sách `roles` dư/sai `MILL_ADMIN` và khóa các route đang để mở:**
   - Loại bỏ `"MILL_ADMIN"` khỏi:
     - `export/routes.tsx:334` (`readers` đang đòi `export-orders.read` nên tự chặn `MILL_ADMIN`).
     - `field/routes.tsx:399, 400, 403, 407` (`/field/farmers/new`, `/field/plots/new`, `/field/receipts/new`, `/field/sync`). *(Riêng `/field/crop-seasons` giữ `MILL_ADMIN` vì cần `platform.configure`).*
     - `mill/routes.tsx:479, 480, 485, 486, 488` (`/mill/receiving`, `/mill/operations/new`, `/mill/reconciliations*`, `/mill/plan-executions/:planId`).
     - `risk/routes.tsx:516, 517` (`/risk/holds/new`, `/risk/holds`).
   - Thêm route guard cho:
     - `/stock` & `/stock/lots/:lotId` (`mill/routes.tsx:489-490`): giới hạn theo quyền `lots.read.all | lots.read.facility | lots.read.tenant` (hoặc tương ứng 5 role đọc tồn kho hợp lệ).
     - `/compliance/residue-profiles` (`compliance/routes.tsx:220`): yêu cầu quyền `residue.policy.manage | residue.company-policy.manage | residue.evaluate | residue.evidence.manage`.
     - `/compliance/company-policies` (`compliance/routes.tsx:222`): yêu cầu `residue.company-policy.manage` (hoặc thêm quyền đọc `residue.evaluate` nếu muốn mở xem cho `ExportStaff` và cập nhật lại guard component).
     - `/events*` (`audit/routes.tsx:103-104`): yêu cầu `history.read | identity.manage`.
   - Sửa `sidebarItems.ts:198-202`: chỉ hiện `"Ghi bước chế biến"` cho role có `conversions.write` (`MILL_OPERATOR`), không hiện mặc định cho `MILL_MANAGER`.
5. **Bổ sung UI cho `Planning Yield Rules` (`blend.yield-policy.manage`):**
   - Tạo tab/panel trong `BalancePolicyPage.tsx` (hoặc trang riêng dưới `/mill` / `/admin/balance-policy` dành cho `MILL_MANAGER`) gọi `planningEndpoints.createYieldRule` (`POST /api/ledger/planning-yield-rules`) và `getApplicableYieldRules`.
6. **Xử lý trạng thái User Pending (`role = null`) rõ ràng thay vì rơi vào `AUTHORIZED_STOCK_VIEWER`:**
   - Khi Backend trả `user.role === null` và `permissions = []` (tài khoản mới xác thực email, chưa được Admin gán công ty/role), Frontend không nên map thành `AUTHORIZED_STOCK_VIEWER` rồi gọi `GET /api/ledger/lots` gây lỗi 403. Nên hiển thị màn hình `"Tài khoản đang chờ quản trị viên cấp quyền"`.

### P2 — Tối ưu & Đồng bộ Kỹ thuật
7. **Nối `GET /api/ledger/business-history` vào `EventHistoryPage.tsx`:** Thay hàm client fan-out 9 API trong `businessHistory.ts` bằng endpoint chính thống của backend (giúp `MILL_ADMIN` xem được lịch sử nghiệp vụ và giảm request 403).
8. **Chuyển Packing List sang gọi `POST /api/export-containers/{id}/workflow/documents/packing-list`** hoặc xác nhận thống nhất dùng chung `/workflow/documents`.
9. **Thống nhất quyền `ContainerTrace` (`ExportStaff`) và `canPlaceHold`:** Đồng bộ C# `ContainerTraceEndpoints.cs:21` với SQL `ContainerExecution.sql:131` (chỉ `CustomerManager | Administrator`), và bỏ check thừa `permissions.includes("containers.write")` trong `ContainerTracePage.tsx:65`.
10. **Hiển thị điều hướng thuận tiện cho `CUSTOMER_MANAGER` & `ExportStaff`:** Xem xét thêm link sidebar hoặc quick-link tới `/export/plans/pending` (duyệt phương án) và `/export/orders` cho `CUSTOMER_MANAGER` (vì Manager hiện phải đi đường vòng qua Dashboard shortcut mới tới duyệt kế hoạch).
