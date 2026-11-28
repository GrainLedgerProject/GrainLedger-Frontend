# Báo cáo Kiểm tra & Đối soát Toàn bộ Mã nguồn Frontend – Backend (GrainLedger)

> [!NOTE]
> **Phạm vi kiểm tra (27/11/2026):**
> - **Frontend (`GrainLedger-Frontend/web/grainledger/src`)**: Rà soát **100% file `.ts`, `.tsx`, `.json`** (**249/252 file**, cộng thêm `index.css`; 2 file còn lại là `App.css`, `vite-env.d.ts`), bao gồm cả **7 file vừa sửa chưa commit** tại commit `0077e00`.
> - **Backend (`GrainLedger/backend/src/GrainLedger.Api`)**: Đối soát toàn bộ endpoint, DTO, authorization policy và PostgreSQL SQL routines tại commit `d27de41` (đến PR #29) cùng tài liệu `docs/api/*.md`.
> - **Tổng hợp lượt đối soát**: 8 phân hệ chuyên sâu, **>320 lượt đối chiếu endpoint/SQL**.

---

## 1. Kết quả Build, TypeCheck, Lint & Test hiện tại (Cập nhật 28/11/2026)

| Công cụ kiểm tra | Lệnh chạy | Kết quả | Chi tiết ghi nhận |
|---|---|---|---|
| **TypeScript** | `npx tsc -b --noEmit` | ✅ **Exit 0** | Không lỗi compile TS. |
| **ESLint** | `npm run lint` (`eslint .`) | ✅ **Exit 0** | **0 errors, 0 warnings** (đã xóa biến thừa `BlendPlanRequestPage.tsx:109`, cập nhật deps `EventHistoryPage.tsx`, xóa directive thừa `useWorkflowText.ts`). |
| **Unit/Integration Tests** | `npx vitest run --maxWorkers=2` | ✅ **300/300 pass** (44 files) | Chạy sau lần chỉnh sửa cuối (bao gồm bổ sung test P1/P2/P3 trong `p1-p2-audit-fixes.test.tsx` và `api-client.test.ts`). |
| **Production Build** | `npx vite build` | ✅ **Thành công** | Tạo bundle PWA hoàn chỉnh (`5359 modules`). |

---

## 2. Xác minh lại 5 lỗi đã sửa trước đó

| # | Trạng thái hiện tại | Chi tiết sau khi rà soát & sửa bổ sung |
|---|---|---|
| **Bug 1** | ✅ **Đã hoàn tất** | `ContainerTracePage.tsx` đã hiển thị chi tiết danh sách `record.holds` (`reason`, `recordedAt`, `evidenceId`) và truyền `graph.actualContainers` vào `<ActualLoading>`. |
| **Bug 2** | ✅ **Đã hoàn tất** | `ContainerControls.tsx`, `StockLotDetailModal.tsx` và `TraceabilityPage.tsx` truyền `?isolation=1`; `StockTransferPage.tsx` tự bật `holdIsolationMode` khi có `holdId` hoặc `isolation=1`. |
| **Bug 3** | ✅ **Đã hoàn tất (phần lõi & lint)** | Không còn vòng lặp vô hạn và đã xử lý sạch 2 warning ESLint. |
| **Bug 4** | ✅ **Đã hoàn tất** | Guard link `exportPaths.containers` đúng quyền và đã sửa `ContainerPreparationPage.tsx` gửi `poolRevision` dạng `string` thay vì JSON number. |
| **Bug 5** | ✅ **Đã hoàn tất** | Đã xóa biến thừa `isCustomerManager` ở `BlendPlanRequestPage.tsx`, `npm run lint` xanh. |

---

## 3. Thống kê tổng hợp các lỗi & sai lệch mới phát hiện (đã khử trùng lặp)

Từ **95 ghi nhận thô** trên 8 phân hệ, sau khi loại bỏ các lỗi trùng nhau giữa các phân hệ liên quan và đối chiếu trực tiếp mã nguồn:

| Mức độ | Số lượng (duy nhất) | Ý nghĩa |
|---|---:|---|
| **P0 — Blocker** | **7** | Tính năng chính hỏng hoàn toàn / BE luôn trả 400, 403, 412 hoặc query sai UUID trả rỗng. |
| **P1 — Nghiêm trọng** | **33** | Sai lệch quyền gây 403 trên UI, thiếu toàn bộ tính năng BE PR #27–#29 & S2, kẹt form/offline queue, mất dữ liệu khi reload. |
| **P2 — Trung bình** | **34** | Sai lệch validation/decimal/format, mất đồng bộ state/URL params, đọc nhầm field DTO không tồn tại, thiếu pagination. |
| **P3 — Nhẹ / Dọn dẹp** | **8** | Hardcoded copy bỏ qua i18n, dead code/interface thừa, cảnh báo lint, lỗi hiển thị CSS nhỏ. |
| **Tổng cộng** | **82** | **82 vấn đề duy nhất** trên toàn hệ thống FE ↔ BE. |

---

## 4. Chi tiết Lỗi P0 (Blocker — Cần xử lý ngay)

### P0-1. ✅ [Đã sửa FE] Duyệt phạm vi Container gửi enum `"CONTAINER_OUTPUT"` không hợp lệ
- **FE**: [`ContainerControls.tsx:377-391`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/export/components/ContainerControls.tsx#L377-L391), [`containerExecution.ts:175`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/api/containerExecution.ts#L175)
- **BE**: [`ContainerWorkflowEndpoints.cs:117`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger/backend/src/GrainLedger.Api/Features/Exports/Shipments/ContainerWorkflowEndpoints.cs#L117), [`ContainerTraceCorrections.sql:194`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger/backend/src/GrainLedger.Api/Data/Sql/ContainerTraceCorrections.sql#L194)
- **Chi tiết**: `<select>` dùng `<option value="CONTAINER_OUTPUT">`, nhưng BE kiểm tra nghiêm ngặt `review.Scope is not ("ALL_REMAINING" or "OUTPUT_ONLY")` và trả **HTTP 400**. Đồng thời nhãn `"OUTPUT_ONLY"` đang ghi nhầm thành *"Remaining production"* (ngược nghĩa với BE).
- **Khắc phục**: Đổi value `"CONTAINER_OUTPUT"` → `"ALL_REMAINING"` và sửa lại cặp nhãn mô tả cho đúng nghĩa (`OUTPUT_ONLY`: chỉ đầu ra đã tạo; `ALL_REMAINING`: cả phần còn lại + đầu ra hiện có).

### P0-2. ✅ [Đã sửa FE] Bộ lọc tương thích BLENDING trên `OperationEntryPage` luôn trả về rỗng
- **FE**: [`OperationEntryPage.tsx:195-198`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/mill/pages/OperationEntryPage.tsx#L195-L198)
- **BE**: [`InitialSchema.sql:1324, 3901`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger/backend/src/GrainLedger.Api/Data/Sql/InitialSchema.sql#L1324)
- **Chi tiết**: BE lưu và trả về `compatibilities[].inputProducts` theo định dạng `"<commodityId>:<productIdentity>"` (regex `^[0-9a-fA-F-]{36}:(HEAD_RICE|BROKEN_RICE|BLENDED_RICE)$`). FE lại kiểm tra `item.inputProducts.includes(activeLot.productIdentity)` (chuỗi trần không có `commodityId:`), khiến `compatibleCommodities` luôn rỗng và không chọn được mặt hàng đầu ra cho lệnh `BLENDING`.
- **Khắc phục**: Đổi điều kiện so khớp thành `` `${activeLot.commodityId}:${activeLot.productIdentity}` ``.

### P0-3. ✅ [Đã sửa FE] Tạo liên kết Thửa–Mùa vụ (`POST /api/plot-seasons`) luôn bị BE từ chối HTTP 400
- **FE**: [`SeasonEditor.tsx:146-192`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/field/components/SeasonEditor.tsx#L146-L192)
- **BE**: [`PlotSeasonEndpoints.cs:339-341`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger/backend/src/GrainLedger.Api/Features/Capture/Seasons/PlotSeasonEndpoints.cs#L339-L341)
- **Chi tiết**: Khi danh mục giống lúa (`varietyOptions`) tồn tại, `createLink` gửi đồng thời cả `riceVariety` (tên giống) lẫn `riceVarietyId`. BE `Validate` kiểm tra `(RiceVarietyId is null) == !hasText` — bắt buộc **chỉ được truyền đúng 1 trong 2**, nếu gửi cả hai sẽ trả HTTP 400 `"Provide exactly one rice variety ID or legacy name."`.
- **Khắc phục**: Khi có `resolvedVarietyId`, bỏ trống / `undefined` trường `riceVariety` ở `createLink` (và kiểm tra luôn `seasonId` trong so sánh `pendingLink`).

### P0-4. ✅ [Đã sửa FE] Hủy nháp phương án phối trộn (`cancelDraft`) luôn lỗi 412 `PLAN_VERSION_STALE`
- **FE**: [`api/planning.ts:60-64`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/api/planning.ts#L60-L64), [`BlendPlanRequestPage.tsx:150-157, 425-437`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/export/pages/BlendPlanRequestPage.tsx#L150-L157)
- **BE**: [`BlendPlanningEndpoints.cs:294-308`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger/backend/src/GrainLedger.Api/Features/Exports/Planning/BlendPlanningEndpoints.cs#L294-L308)
- **Chi tiết**: BE `CancelPlanDraftAsync` bắt buộc kiểm tra `If-Match: "<version>"`. FE gọi `POST /api/blend-plans/{id}/cancel` không truyền header `If-Match`, nên mọi thao tác hủy nháp đều thất bại với **412 Precondition Failed**.
- **Khắc phục**: Thêm tham số `version`/`etag` cho `planningEndpoints.cancelDraft` để gửi header `"If-Match": "\"${selected.version}\""`.

### P0-5. ⏸️ [BE hiện tại chưa có PR #29] Tạo đơn xuất khẩu gạo thiếu `requiredRiceVarietyId`
- **Ghi chú đối chiếu trực tiếp (28/11/2026)**: Kiểm tra `C:\Users\PhamCuong\Desktop\Capstone\GrainLedger\backend\src\GrainLedger.Api\Features\Exports\ExportRules.cs` và `ExportEndpoints.cs` cho thấy BE hiện tại **chưa có** `RequiredRiceVarietyId` hay `planAdjustment` / `varietyCompatible` (BE đang dừng ở PR #28 `LocationStock`). Do đó chưa thêm `requiredRiceVarietyId` vào FE để giữ khớp contract BE đang chạy.
- **FE**: [`api/exports.ts:115-130, 201-211`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/api/exports.ts#L115-L130), [`ExportOrderForm.tsx:99-108`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/export/components/ExportOrderForm.tsx#L99-L108), [`ExportOrderMaintenance.tsx`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/export/components/ExportOrderMaintenance.tsx), [`useExportOrderCatalogs.ts`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/export/hooks/useExportOrderCatalogs.ts)
- **BE**: [`ExportRules.cs:11-33`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger/backend/src/GrainLedger.Api/Features/Exports/ExportRules.cs#L11-L33), [`ExportEndpoints.cs:230-287`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger/backend/src/GrainLedger.Api/Features/Exports/Orders/ExportEndpoints.cs#L230-L287)
- **Chi tiết**: BE PR #29 bắt buộc `requiredRiceVarietyId` khi tạo đơn cho `RICE`, `POLISHED-RICE`, `RICE_POLISHED`, và hỗ trợ trường này trên `AddExportSpecificationRequest` & DTO phản hồi. FE hoàn toàn chưa có field/selector giống lúa ở form tạo đơn, sửa đặc tả hay hiển thị danh sách đơn.
- **Khắc phục**: Cập nhật type trong `api/exports.ts`, tải danh mục `getRiceVarieties`, thêm selector `requiredRiceVarietyId` vào `ExportOrderForm` & `ExportOrderMaintenance` (chế độ `spec`), hiển thị `requiredRiceVarietyName` ở `ExportOrdersWorkspace`.

### P0-6. ✅ [Đã sửa FE] `TraceSourceEvidence` dùng Ledger `lotId` thay vì Capture `sourceRecordId` → Mẫu & Lab luôn rỗng
- **FE**: [`ContainerTracePage.tsx:733-787`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/pages/ContainerTracePage.tsx#L733-L787), [`TraceabilityPage.tsx:1584-1695`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/pages/TraceabilityPage.tsx#L1584-L1695), [`TraceSourceEvidence.tsx:13-39`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/components/TraceSourceEvidence.tsx#L13-L39)
- **BE**: [`SampleEndpoints.cs:254-262`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger/backend/src/GrainLedger.Api/Features/Capture/Samples/SampleEndpoints.cs#L254-L262), [`LabReportEndpoints.cs:383-388`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger/backend/src/GrainLedger.Api/Features/Capture/LabReports/LabReportEndpoints.cs#L383-L388), `docs/api/traceability-api.md:134`
- **Chi tiết**: Cả hai trang truy xuất nguồn gốc truyền ID lô trong sổ cái (`ledger_lots.id`) vào `?sourceLotId=...` của `/api/samples` và `/api/lab-reports`, trong khi BE lọc theo `capture_samples.source_lot_id` (chính là `provenance.sourceRecordId`). Do 2 UUID thuộc 2 bảng khác nhau nên danh sách mẫu/lab luôn trả về rỗng.
- **Khắc phục**: Truyền `source.provenance?.sourceRecordId` vào `<TraceSourceEvidence sourceLotId={...} />`, ẩn/vô hiệu nút khi không có `sourceRecordId`.

### P0-7. ✅ [Đã sửa FE] `PlaceHoldModal` gọi `GET /api/ledger/setup` luôn bị 403 Forbidden với `CUSTOMER_MANAGER`
- **FE**: [`PlaceHoldModal.tsx:77-79, 113-117`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/components/PlaceHoldModal.tsx#L77-L117)
- **BE**: [`InitialSchema.sql:3880-3881`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger/backend/src/GrainLedger.Api/Data/Sql/InitialSchema.sql#L3880-L3881)
- **Chi tiết**: `PlaceHoldModal` chỉ mở cho `CUSTOMER_MANAGER`, nhưng lại gọi `ledgerEndpoints.getSetup()`. BE SQL chặn `action='setup'` với mã 403 (`Setup access denied`) nếu role không thuộc `Administrator | MillManager | MillOperator`. Hệ quả là danh sách cơ sở (`facilities`) luôn lỗi khi mở modal đặt HOLD (đặc biệt khi đặt HOLD từ `ContainerTracePage` vốn không truyền `facilityId` theo lô).
- **Khắc phục**: Đổi `ledgerEndpoints.getSetup()` sang `ledgerEndpoints.getLookups()` (`GET /api/ledger/lookups`, cho phép `CustomerManager`).

---

## 5. Tổng hợp Khoảng trống Đồng bộ với các PR Backend gần đây (#25–#29)

Đối soát lịch sử commit BE (`a364ad1` → `d27de41`) cho thấy Frontend hiện **đang trễ so với Backend** ở 3 nhóm tính năng lớn sau (được xếp vào P0/P1 tương ứng ở Mục 6):

1. **PR #29 (`d27de41`) — Variety-aware Whole-kg Blend Planning & Manual Adjustment**:
   - **Thiếu (P0)**: `requiredRiceVarietyId` / `requiredRiceVarietyName` trên tạo đơn, sửa đặc tả và hiển thị đơn xuất khẩu.
   - **Thiếu (P1)**: Chức năng chỉnh tay đa lô `planAdjustment` (`PreviewBlendPlanRequest.planAdjustment`) — FE mới chỉ có thanh trượt 2 lô `adjustment.firstQuantityKg`.
   - **Thiếu (P1)**: Các field mới trên candidate/preview/draft: `riceVariety`, `riceVarietyId`, `varietyStatus`, `varietyCompatible`, `varietyExclusion`, `varietyExclusions`, `quantityStepKg`, `demandChanged`.
2. **PR #28 (`75f534c`) — Rice Variety Segregation & Location Stock**:
   - **Thiếu (P1)**: Endpoint `GET /api/ledger/locations/{id}/stock` chưa được thêm vào `api/ledger.ts` hay hiển thị trên `StockOverviewPage` / `StockTransferPage`.
   - **Thiếu (P1)**: Các field `riceVariety`, `riceVarietyId`, `varietyStatus`, `expectedValue/Unit`, `actualValue/Unit` trên `Lot`, `ReceivingTask.items` và các màn hình Mill (`StockOverviewPage`, `StockLotDetailModal`, `ReceivingTasksPage`, `OperationEntryPage`, `OperationDraftsPage`).
3. **PR #27 (`9588e8c`) — F12 Residue Change Propagation & F14 Source Lab Evidence**:
   - **Thiếu (P1)**: 4 endpoint mới trong `ResidueRiskEndpoints.cs` (`/api/residue-changes/{changeId}`, `/targets`, `/api/residue-risk-events`, `/{eventId}`) hoàn toàn chưa có API client hoặc giao diện theo dõi ở FE.
4. **PR #25 / #26 (`464746e`, `a364ad1`) — Container S2 & Tracing Flowchart**:
   - **Thiếu / Lệch (P0–P1)**: `ContainerControls` sai enum `"CONTAINER_OUTPUT"`, `ContainerProductionPanel` khóa nút khi status `"LOADING"`, `GET /api/export-containers/{id}/execution` chặn `MillManager`/`MillOperator`, `traceFlow` sai schema `custodyEvents` & `directHold`/`effectiveHold`, `ContainerTracePage` bỏ qua `actualContainers`.

---

## 6. Danh sách Lỗi P1 (33 vấn đề nghiêm trọng)

### 6.1. Sai lệch Phân quyền / RBAC / API Client / Deep Link (10 lỗi)
1. ✅ **`useProcurementSync` gọi API thu mua trái quyền cho mọi role**: [`App.tsx:8`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/App.tsx#L8), [`useProcurementSync.ts:57-61`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/field/offline/useProcurementSync.ts#L57-L61), [`offlineCache.ts:229-234`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/field/offline/offlineCache.ts#L229-L234) tự gọi `/api/procurement-reference-data` (`purchases.write`) và `/api/farmers` (`farms.read/write`) cho mọi user đăng nhập/pending → 403 hàng loạt.
2. ✅ **`NotificationCenter` poll 403 cho pending user**: [`NotificationCenter.tsx:52-94`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/app/layout/NotificationCenter.tsx#L52-L94) polling 60s `/api/ledger/notifications` và `/api/ledger/lookups` dù user có `role = null` (BE `InitialSchema.sql:3879` trả 403).
3. ✅ **`GlobalSearchModal` lộ link `/stock` và `/events` sai quyền**: [`GlobalSearchModal.tsx:29-32`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/app/layout/GlobalSearchModal.tsx#L29-L32) luôn hiện cả 2 đích cho `MILL_ADMIN`, `CUSTOMER_PROCUREMENT_OFFICER` và pending user → bấm vào bị `ProtectedRoute` chặn.
4. ✅ **Cookie-session `apiFetch` & `getGoogleAuthUrl` bỏ qua `VITE_API_BASE_URL`**: [`api/client.ts:187`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/api/client.ts#L187), [`api/auth.ts:57-60`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/api/auth.ts#L57-L60) dùng path tương đối thay vì `getApiUrl(endpoint)`, gãy khi FE/BE deploy khác origin.
5. ✅ **[Đã guard FE / Còn hạn chế quyền BE] `GET /api/export-containers/{id}/execution` chặn 403 với `MILL_MANAGER`/`MILL_OPERATOR`**: BE [`ContainerExecutionEndpoints.cs:37`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger/backend/src/GrainLedger.Api/Features/Exports/Shipments/ContainerExecutionEndpoints.cs#L37) gắn policy `export-orders.read` dù SQL cho phép Mill đọc; FE [`ApprovedPlanExecutionPage.tsx:104-120`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/mill/pages/ApprovedPlanExecutionPage.tsx#L104-L120) đã guard chỉ gọi `getDetail` khi user có quyền `export-orders.read` (Mill roles chuyển sang dùng `directWorkflow` để tránh 403).
6. ✅ **`LabSampleRegistrationPage` lộ nút "Thêm lượt bàn giao" không có guard**: [`LabSampleRegistrationPage.tsx:934-943`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/compliance/pages/LabSampleRegistrationPage.tsx#L934-L943) trong detail modal thiếu `{canMutateSamples && ...}` (`purchases.write`), làm `CUSTOMER_MANAGER` & `CUSTOMER_EXPORT_OFFICER` bấm vào bị 403.
7. ✅ **`SourceLotDetailBody` mở link `/stock/lots/:lotId` cho `CUSTOMER_PROCUREMENT_OFFICER`**: [`ProcurementDetailPages.tsx:524`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/field/pages/ProcurementDetailPages.tsx#L524) & [`StockLotDetailModal.tsx:395-406`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/mill/components/StockLotDetailModal.tsx#L395-L406) dẫn đến route đòi quyền `lots.read.*` mà Procurement Officer không có.
8. ✅ **`MrlComplianceCheckPage` dẫn `CUSTOMER_EXPORT_OFFICER` tới `/stock/lots/<captureSourceLotId>`**: [`MrlComplianceCheckPage.tsx:837-839, 878-886`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/compliance/pages/MrlComplianceCheckPage.tsx#L837-L839) dùng `rs.sourceLotId` (ID của Capture) làm param cho route Ledger lot → 404 Not Found.
9. ✅ **`BlendInvestigation` mở link `/field/source-lots/:sourceLotId` cho `CUSTOMER_EXPORT_OFFICER`**: [`BlendInvestigation.tsx:286-292`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/export/components/BlendInvestigation.tsx#L286-L292) không kiểm tra role trong khi `fieldRoutes` chỉ cho phép `CUSTOMER_PROCUREMENT_OFFICER` và `CUSTOMER_MANAGER`.
10. ✅ **`TraceSourceEvidence` thiếu guard quyền Lab/Customer cho `MILL_ADMIN`**: [`ContainerTracePage.tsx:757-788`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/pages/ContainerTracePage.tsx#L757-L788) & [`TraceabilityPage.tsx:1593-1708`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/pages/TraceabilityPage.tsx#L1593-L1708) để `MILL_ADMIN` bấm xem mẫu & lab rồi nhận 403 từ Capture API.

### 6.2. Thiếu tính năng BE PR #27, #28, #29 & S2 (6 lỗi)
11. ✅ **[Đã hoàn tất]** Bổ sung DTO typed chuẩn `ResidueRiskReads.sql` trong [`api/residue.ts`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/api/residue.ts) và màn hình giám sát [`ResidueRiskPage.tsx`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/compliance/pages/ResidueRiskPage.tsx) (`/compliance/residue-risk`) liên kết từ `ResidueProfilesPage`.
12. ✅ **[Đã hoàn tất]** Bổ sung type `LocationStockResponse` & panel **Tồn kho tại vị trí đã chọn** gọi `GET /api/ledger/locations/{id}/stock` trên [`StockOverviewPage.tsx`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/mill/pages/StockOverviewPage.tsx).
13. ✅ **[Đã hoàn tất]** Bổ sung các field PR #28 (`riceVariety`, `riceVarietyId`, `varietyStatus`, `expectedValue/Unit`, `actualValue/Unit`) trên [`api/ledger.ts`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/api/ledger.ts), `StockOverviewPage`, `StockLotDetailModal`, `ReceivingTasksPage` và `OperationEntryPage`.
14. ⏸️ **[BE hiện tại chưa có PR #29]** Chưa cài đặt `planAdjustment` (chỉnh tay phân bổ đa lô nguyên kg) trên `api/planning.ts`, `BlendPlanRequestPage`, `BlendInvestigation`.
15. ⏸️ **[BE hiện tại chưa có PR #29]** Thiếu các field `riceVarietyId/Name`, `varietyCompatible`, `varietyExclusion`, `varietyExclusions`, `quantityStepKg`, `demandChanged` trên candidate & simulation preview.
16. ✅ [`ContainerProductionPanel.tsx:156-162`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/export/components/ContainerProductionPanel.tsx#L156-L162) đã cho phép nút "Request production" khi `status === "LOADING"`.

### 6.3. Lỗi State, DTO, Validation & Recovery (17 lỗi)
17. ✅ **[Đã giảm thiểu FE / Còn thiếu BE read endpoint]** [`BalancePolicyPage.tsx`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/admin/pages/BalancePolicyPage.tsx) đã lưu `publishedYieldRules` theo từng phiên người dùng vào `localStorage` để không mất danh sách phiên bản sau F5 (giảm lỗi 409 Conflict khi ghi tiếp version mới; đồng bộ hoàn toàn qua thiết bị vẫn cần BE bổ sung read endpoint).
18. ✅ [`BalancePolicyPage.tsx:954-970`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/admin/pages/BalancePolicyPage.tsx#L954-L970): Đã kiểm tra `effectiveFrom` hợp lệ trước khi gọi `.toISOString()`.
19. ✅ [`UserAccessManagementPage.tsx:371-379`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/admin/pages/UserAccessManagementPage.tsx#L371-L379) & [`CustomerOrganizationsPage.tsx:262-270`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/admin/pages/CustomerOrganizationsPage.tsx#L262-L270): Đã hiển thị lỗi ngay bên trong `<Modal>`.
20. ✅ [`ProcurementReceiptPage.tsx:1269-1278`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/field/pages/ProcurementReceiptPage.tsx#L1269-L1278): Đã hiển thị lỗi submit/validation ngay bên trong Create `<Modal>`.
21. ✅ [`ProcurementReceiptPage.tsx:578-590`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/field/pages/ProcurementReceiptPage.tsx#L578-L590): Đã bỏ fallback `crypto.randomUUID()` giả cho `collectionSiteId`, `receivingLocationId`, `commodityId`.
22. ✅ [`ProcurementReceiptPage.tsx:553-564`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/field/pages/ProcurementReceiptPage.tsx#L553-L564): `getAvailablePlotSeasons` trả về `[]` thay vì fallback sang thửa của nông hộ khác.
23. ✅ [`pendingCapture.ts:28-30`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/field/offline/pendingCapture.ts#L28-L30): Đã xóa `pending` khi gặp HTTP `409`.
24. ✅ [`OfflineSyncQueuePage.tsx:204-219`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/field/pages/OfflineSyncQueuePage.tsx#L204-L219) & [`procurementQueue.ts:82-85`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/field/offline/procurementQueue.ts#L82-L85): Đã thêm nút xóa phiếu thu mua offline khỏi hàng đợi.
25. ✅ [`MasterDataPage.tsx:209-253`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/catalogs/pages/MasterDataPage.tsx#L209-L253): Đã bỏ các field bất biến (`code`, `quantityKind`, `unit`) khi PATCH `measurement-units` và `quality-attributes`.
26. ✅ [`ContainerPreparationPage.tsx:854-859, 1030-1037`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/export/pages/ContainerPreparationPage.tsx#L854-L859): Đã gửi `poolRevision` dạng `string`.
27. ✅ [`StockTransferPage.tsx`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/mill/pages/StockTransferPage.tsx): Đã tự bật `holdIsolationMode` khi có `?isolation=1`/`holdId`, đồng bộ URL search params qua `setParams`, phân trang `activeHolds` bằng `collectPages`, hiển thị lỗi `activeHolds.error` và giữ nguyên `lotId` lô con kế thừa HOLD khi chọn lệnh HOLD gốc (kèm nút chuyển sang lô gốc khi cần).
28. ✅ [`StockLotDetailModal.tsx:204-250`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/mill/components/StockLotDetailModal.tsx#L204-L250): Đã phân biệt `hasHold` vs các restriction khác (`STALE`), chỉ hiện link `ISOLATION` khi có HOLD.
29. ✅ [`TraceabilityPage.tsx:118-120, 1318-1395`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/pages/TraceabilityPage.tsx#L118-L120), [`ContainerTracePage.tsx:128-135`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/pages/ContainerTracePage.tsx#L128-L135), [`traceFlow.ts:4-15, 232-245`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/model/traceFlow.ts#L4-L15): Đã hỗ trợ `directHold`/`effectiveHold` và `positions[]` của BE `ledger_trace_graph`.
30. ✅ [`traceFlow.ts:39-47, 329-350`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/model/traceFlow.ts#L39-L47): Đã hỗ trợ schema `custodyEvents` của BE (`action`, `primaryOutputLotId`, `locationId`, `revision`).
31. ✅ [`HoldManagementPage.tsx:288-292`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/pages/HoldManagementPage.tsx#L288-L292): Đã bỏ option `"RELEASED"` không tồn tại ở BE.
32. ✅ [`ContainerTracePage.tsx:581-611, 858-873`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/pages/ContainerTracePage.tsx#L581-L611): Đã hiển thị chi tiết `record.holds` và truyền `graph.actualContainers` vào `<ActualLoading>`.
33. ✅ **[Đã sửa FE / Còn BE không lưu field phụ]** [`ContainerTracePage.tsx`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/pages/ContainerTracePage.tsx) đã truyền `facilityId` vào `holdSelectableLots`; phần BE `POST /api/ledger/holds` chưa lưu `evidenceId`/`traceId` thuộc phạm vi Backend.

*(Ghi chú: Tổng mục 6 có 33 đầu việc do tách rõ `StockLotDetailModal` vs `Traceability/ContainerTrace` và liệt kê từng lỗi độc lập rõ ràng theo file/phân hệ).*

---

## 7. Tóm tắt các nhóm lỗi P2 (34 lỗi) & P3 (8 lỗi)

### Nhóm P2 — Sai lệch Validation, State, DTO phụ, Pagination & UX (34 vấn đề — Đã khắc phục toàn bộ phần FE)
- **App Shell / Auth / Role / Profile (4/4 ✅)**:
  - ✅ Pending user (`role: null`) không còn bị gắn nhãn giả `"[SV] Người xem tồn kho"` ở `AppHeader` & `EditProfilePage`.
  - ✅ `ROLE_DEFINITIONS.MILL_MANAGER.defaultPath` chuyển sang `/mill/stock` thay cho `/mill/operations/new`.
  - ✅ `EditProfilePage.tsx` bỏ tên nhà máy hardcode và đồng bộ `setUser` với `SessionUserDto` từ BE trong `authApi.updateProfile`.
  - ✅ `authEndpoints.webLogin` hỗ trợ truyền header `X-CSRF-TOKEN` khi có CSRF cookie/token.
- **Admin & Audit (6/6 ✅ FE)**:
  - ✅ `EventHistoryPage.tsx`: xóa banner lỗi khi lọc/tải lại thành công, giữ bảng hiện có khi đang refilter, sửa placeholder & `maxLength={100}` và không cắt dấu cách cuối đang gõ khi đồng bộ search param, ẩn tab Ledger Audit với `MILL_ADMIN`, hỗ trợ route params `/events/:type/:id`, hiển thị `evidenceId` & dịch `item.eventType` ở lịch sử nghiệp vụ.
  - ✅ `FacilityList`, `FacilityLocations`, `FacilityEquipment` kiểm tra cờ `canEdit !== false`; `FacilityList` ẩn nút "Thêm Nhà máy Đầu tiên" với role chỉ đọc.
  - ✅ `LocationClearanceDialog.tsx` & `useFacilityConfig.ts` tích hợp upload biên bản trực tiếp (khi có `ownerId`) và validate UUID `evidenceId`.
- **Field & Capture (5/5 ✅ FE)**:
  - ✅ `ProcurementReceiptPage.tsx`: bỏ `setTimeout` closure khi chuyển trang, guard `getReferenceData()` theo `canCapture`, không nuốt lỗi `getProcurements`, chỉ lọc offline queue ở client khi online để không rơi kết quả khớp `status` từ BE.
  - ✅ `FarmerRegistrationPage.tsx` & `PlotRegistrationPage.tsx`: tôn trọng `canEdit`/`canDelete`, chỉ ghi offline cache nông dân khi ở trang 1 đầy đủ không tìm kiếm.
  - ✅ Các lookup phân trang (`farmers`, `plots`, `plot-seasons`) dùng `collectPages` thay vì cắt ở 100.
- **Catalogs & Compliance (3/3 ✅ FE)**:
  - ✅ `MrlComplianceCheckPage.tsx` hiển thị `replacementReportId` & `residueBindings` khi xem chi tiết báo cáo lab, giữ `?sampleId=` ở link mẫu.
  - ✅ `LabSampleRegistrationPage.tsx` theo dõi `useSearchParams()` reactive theo URL.
  - ✅ `MasterDataPage.tsx` cung cấp `<select>` 5 giá trị `quantityKind` chuẩn BE (`MASS`, `AREA`, `RESIDUE_CONCENTRATION`, `APPLICATION_RATE`, `FRACTION`), khóa khi edit và hiển thị chi tiết `err.problem?.errors`.
- **Mill & Ledger (6/6 ✅ FE)**:
  - ✅ `ReceivingTasksPage.tsx` guard `CorrectionEvidenceDownload` bằng `review` (`MILL_MANAGER`) để tránh 403 cho `MILL_OPERATOR`.
  - ✅ `OperationEntryPage.tsx` dùng `collectPages` + `availableOnly="true"`, hỗ trợ chọn position khi lô có nhiều vị trí, dùng `toDecimal`, lọc `COMPARTMENT` đã clearance và dọn draft mồ côi khi lỗi 4xx. `decimalMass.ts` floor `allowedKg` 6 chữ số thập phân.
  - ✅ `OperationDraftsPage.tsx` đối chiếu policy theo `occurredAt`, lọc `availableKg > 0` và `COMPARTMENT` đã clearance.
  - ✅ `ContainerControls.tsx` khóa `declaredLossKg = "0"` và đồng bộ `outputKg = quantityKg` khi `BAGGING`, lọc bỏ kho `mixedBulk` và `COMPARTMENT` chưa cleared.
  - ✅ `CorrectionRequestForm` & `CorrectionRequestPage` tải đủ mọi trang `COMMITTED` bằng `collectPages`.
  - ✅ `CorrectionWorkbench.tsx` resolve tên `locationId` qua setup lookup và tính bằng `toDecimal`.
- **Export Planning & Containers (6/6 ✅ FE / trừ field `expiresAt` thiếu ở BE)**:
  - ✅ `BlendPlanRequestPage.tsx`: giữ lại `lastValidPreview` nếu lần chỉnh tỷ lệ `BlendRatioEditor` trả về `canPropose = false` và đưa `ContainerCommandFeedback` ra ngoài để khôi phục retry/discard sau F5; `BlendInvestigation.tsx` dùng state `null` thay vì `""` giúp xóa trắng ô số mượt mà. *(Lưu ý: đồng hồ hết hạn preview vẫn phụ thuộc việc BE trả field `expiresAt`).*
  - ✅ `BlendPlanReviewPage.tsx`: vô hiệu hóa Revoke khi container đã chạy/đã tiêu thụ và bỏ cảnh báo freshness thừa khi đã `APPROVED`.
  - ✅ `ExportOrderMaintenance.tsx`: chuẩn hóa `.toUpperCase()` mã đơn vị và giới hạn 6 chữ số thập phân.
  - ✅ `ContainerPreparationPage.tsx` dùng `key` duy nhất cho findings; `ContainerLoadingForm.tsx` giữ đủ giây (`step="1"`, `.slice(0, 19)`).
- **Risk & Traceability (5/5 ✅ FE)**:
  - ✅ `ContainerTracePage.tsx` & `traceFlow.ts`: tính tổng `positions[]`, đọc `edge.relationType ?? edge.kind`, đồng bộ `input` theo URL param và ẩn link `/risk/holds` cho `MILL_ADMIN`.
  - ✅ `HoldManagementPage.tsx`: tự mở modal tạo HOLD ở `/risk/holds/new` hoặc `?lotId=`, giữ nguyên bảng HOLD khi có `actionError`.
  - ✅ `PlaceHoldModal.tsx` & `RespondHoldModal`: cache `evidenceId` đã upload tránh gửi trùng khi retry 409 và refetch version container mới nhất khi submit.
  - ✅ `HoldBanner.tsx` & `vi.json`/`en.json`: bỏ mặc định `'15/10/2026 14:30'` hardcode và bổ sung đầy đủ key `risk.targetTypes.*`.

### Nhóm P3 — Lỗi nhẹ, Dead Code, i18n & Styling (8 vấn đề — Đã hoàn tất phần FE)
1. ✅ **ESLint / Dead vars**: Đã xóa directive `eslint-disable` thừa ở [`useWorkflowText.ts`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/shared/ui/useWorkflowText.ts) và biến `isCustomerManager` thừa ở [`BlendPlanRequestPage.tsx`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/export/pages/BlendPlanRequestPage.tsx).
2. ✅ **Dead Auth flows & tokens**: Đã xóa 3 hàm stub ném lỗi (`validateInvitationToken`, `acceptInvitation`, `changePassword`) khỏi [`authApi.ts`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/auth/api/authApi.ts) và các helper thừa (`getCsrf`, `loginGoogle`, `googleComplete`) khỏi [`api/auth.ts`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/api/auth.ts) *(giữ lại `acceptInvitationSchema`, `changePasswordSchema`, `webLogin` do đang có unit test riêng)*. Sửa [`api/client.ts`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/api/client.ts) báo đúng `"Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."` khi reactive refresh thất bại và đảm bảo `authApi.logout()` luôn dọn phiên cục bộ khi offline/mất mạng.
3. ✅ **Hardcoded copy bỏ qua i18n**: Đã i18n hóa toàn bộ text ở [`ProtectedRoute.tsx`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/app/router/ProtectedRoute.tsx), [`ErrorBoundary.tsx`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/shared/ui/ErrorBoundary.tsx), [`main.tsx`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/main.tsx), [`feedbackStore.ts`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/app/store/feedbackStore.ts) (bổ sung key cho cả `vi.json` & `en.json`), dịch song ngữ toàn bộ [`src/features/landing/components/*`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/landing/components/Navbar.tsx) qua `useWorkflowText()`, và bỏ chuỗi lặp `"kg lúa tươi"` trong [`vi.json`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/app/i18n/locales/vi.json) / [`en.json`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/app/i18n/locales/en.json) (`field.receipt.successCreated`).
4. ✅ **Dead API types / wrappers**: Đã xóa `RecordOperationRequest`, `HoldRequest`, `getReceivingThresholdCompanies` ở [`api/ledger.ts`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/api/ledger.ts), `createPolicySetting` ở [`api/residue.ts`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/api/residue.ts), `category`/`safetyIntervalDays` không tồn tại ở BE trên `ActiveSubstanceDto` trong [`api/catalogs.ts`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/api/catalogs.ts), và xóa dead component `StalePlanBanner.tsx`.
5. ✅ **Admin & Audit cleanup**: [`FacilityAssignments.tsx`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/admin/components/FacilityAssignments.tsx) đã xóa banner thành công khi mutation mới bắt đầu hoặc lỗi (`onMutate`/`onError`); [`EventHistoryPage.tsx`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/audit/pages/EventHistoryPage.tsx) đã dọn nhánh `getEntityIcon` unreachable; [`dashboardData.ts:490`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/dashboard/model/dashboardData.ts#L490) dùng trực tiếp `"/"` thay cho `landingPaths.landing`. *(Lưu ý: `AUTHORIZED_STOCK_VIEWER` được giữ lại làm fallback read-only ở FE để bảo toàn tương thích test nội bộ).*
6. ✅ **Field minor UX**: [`MapLocationPicker.tsx`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/field/components/MapLocationPicker.tsx) chặn debounced search mở lại dropdown sau khi chọn gợi ý Nominatim; [`FarmerRegistrationPage.tsx`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/field/pages/FarmerRegistrationPage.tsx) & [`PlotRegistrationPage.tsx`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/field/pages/PlotRegistrationPage.tsx) chuyển liên kết nội bộ sang `<Link>` (có guard `useInRouterContext()`); [`PesticideDeclarationPage.tsx`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/field/pages/PesticideDeclarationPage.tsx) thêm `owner` vào `queryKey`.
7. ✅ **Compliance minor**: [`LabSampleRegistrationPage.tsx`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/compliance/pages/LabSampleRegistrationPage.tsx) cập nhật nhãn/placeholder và kiểm tra định dạng UUID cho `sourceLotId`; [`ResidueProfilesPage.tsx:270`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/compliance/pages/ResidueProfilesPage.tsx#L270) hết lệch icon; [`ContainerReadiness.tsx`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/export/components/ContainerReadiness.tsx) đã dịch đủ các mã `ASSESSMENT_POLICY_MISSING`, `CLOSE_SCOPE_REVIEW_REQUIRED`, `NO_ACTUAL_LOADING`, `OUTPUT_PRODUCT_IDENTITY_CHANGED`, `RESIDUE_*` *(lưu ý BE `409 WORKFLOW_BLOCKED` đôi khi thiếu `title` nằm ngoài FE)*.
8. ✅ **Traceability minor**: [`TraceabilityPage.tsx`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/pages/TraceabilityPage.tsx) validate UUID cho `?lotId=` trước khi gọi API và giới hạn `maxLength={200}` trên ô tìm kiếm; [`ActualLoading.tsx`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/components/ActualLoading.tsx) chỉ tính `tracedContributionKg` khi dòng có `sourceContributions`.

---

## 8. Trạng thái Triển khai Khắc phục (Cập nhật 28/11/2026)

1. **✅ Đợt 1 — Đã hoàn tất (Lint + P0 khớp BE)**:
   - Sửa sạch 1 error + 2 warning ESLint (`BlendPlanRequestPage.tsx`, `EventHistoryPage.tsx`, `useWorkflowText.ts`).
   - Đã sửa **6/6 lỗi P0 áp dụng cho BE hiện tại** (`P0-1`, `P0-2`, `P0-3`, `P0-4`, `P0-6`, `P0-7`). Riêng `P0-5` (`PR #29 requiredRiceVarietyId`) chưa tồn tại trên nhánh BE hiện tại nên giữ nguyên FE.
2. **✅ Đợt 2 — Đã hoàn tất phần FE (RBAC, 403 nền, Deep Link, Modal/DTO/Validation/Trace P1)**:
   - Đã guard `useProcurementSync`, `offlineCache`, `ProcurementReceiptPage` (`initData`), `NotificationCenter`, `GlobalSearchModal`, `LabSampleRegistrationPage`, `ProcurementDetailPages`, `MrlComplianceCheckPage`, `field/routes.tsx`, `BlendInvestigation`, `TraceSourceEvidence`, `ContainerTracePage`, `TraceabilityPage`.
   - Đã sửa `client.ts` & `auth.ts` dùng `getApiUrl(endpoint)`.
   - Đã sửa hiển thị lỗi trong modal (`UserAccessManagementPage`, `CustomerOrganizationsPage`, `ProcurementReceiptPage`), sửa `BalancePolicyPage` invalid date, `ProcurementReceiptPage` không tạo UUID giả và không fallback sang thửa nông hộ khác, `pendingCapture` xóa khi gặp `409`, `OfflineSyncQueuePage` + `procurementQueue` hỗ trợ xóa phiếu lỗi, `MasterDataPage` bỏ field bất biến khi PATCH, `ContainerPreparationPage` ép `poolRevision` sang string, `HoldManagementPage` bỏ `"RELEASED"`, `StockLotDetailModal` phân biệt `hasHold` vs restriction khác, `traceFlow` & `ContainerTracePage` & `TraceabilityPage` đồng bộ `directHold`/`effectiveHold`, `positions[]`, `custodyEvents`, `actualContainers` và chi tiết `record.holds`.
   - Đã cập nhật 1 số P2 trọng yếu: `AppHeader`/`EditProfilePage` pending badge, `BlendPlanReviewPage` `maxLength={1000}`, `ContainerReadiness` thêm mã mới, `ExportOrderMaintenance` 6 chữ số thập phân.
3. **✅ Đợt 3 & Đợt 4 — Hoàn tất toàn bộ P1 & P2 phía FE**:
   - Đã hoàn tất PR #27 (`ResidueRiskPage` & typed DTO trong `api/residue.ts`) và PR #28 (`LocationStock` trên `StockOverviewPage`, `riceVariety`/`varietyStatus`/`expectedValue/Unit`/`actualValue/Unit` trên Ledger/Mill).
   - Đã hoàn tất `BalancePolicyPage` lưu `publishedYieldRules` vào `localStorage`, `StockTransferPage` đồng bộ URL/pagination holds & giữ `lotId` con kế thừa HOLD, `ApprovedPlanExecutionPage` guard 403 `getDetail`, `ContainerTracePage` truyền `facilityId` & sửa toàn bộ các hạng mục P2 phía FE ở Mục 7 (cộng thêm sửa CSS icon lệch trên `ResidueProfilesPage`).
   - **Còn chờ phía Backend (nếu bổ sung sau)**: mở quyền `GET /api/export-containers/{id}/execution` cho Mill roles, bổ sung read endpoint `planning_yield_rules` (`BalancePolicyPage`), trả `expiresAt` ở preview blend plan, lưu `evidenceId` cho `POST /api/ledger/holds`, bổ sung `title` ở một số lỗi `409 WORKFLOW_BLOCKED`, và PR #29 (`requiredRiceVarietyId`, `planAdjustment`).
4. **✅ Đợt 5 — Hoàn tất toàn bộ nhóm P3 phía FE**:
   - Đã hoàn tất 8/8 hạng mục P3 ở Mục 7: dọn dead auth/API types (`authApi.ts`, `api/auth.ts`, `api/ledger.ts`, `api/residue.ts`, `api/catalogs.ts`, xóa `StalePlanBanner.tsx`), sửa thông báo refresh token hết hạn & offline logout trên `client.ts`/`authApi.ts`, i18n hóa toàn bộ text còn cứng (`ProtectedRoute.tsx`, `ErrorBoundary.tsx`, `main.tsx`, `feedbackStore.ts`, `landing/components/*`, `vi.json`/`en.json`), sửa UX `FacilityAssignments`, `dashboardData`, `MapLocationPicker`, `FarmerRegistrationPage`/`PlotRegistrationPage`, `PesticideDeclarationPage`, `LabSampleRegistrationPage`, `TraceabilityPage`, `ActualLoading`, và cập nhật kiểm thử tương ứng.
