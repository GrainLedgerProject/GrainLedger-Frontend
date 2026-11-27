# Báo cáo Kiểm tra & Đối soát Toàn bộ Mã nguồn Frontend – Backend (GrainLedger)

> [!NOTE]
> **Phạm vi kiểm tra (27/11/2026):**
> - **Frontend (`GrainLedger-Frontend/web/grainledger/src`)**: Rà soát **100% file `.ts`, `.tsx`, `.json`** (**249/252 file**, cộng thêm `index.css`; 2 file còn lại là `App.css`, `vite-env.d.ts`), bao gồm cả **7 file vừa sửa chưa commit** tại commit `0077e00`.
> - **Backend (`GrainLedger/backend/src/GrainLedger.Api`)**: Đối soát toàn bộ endpoint, DTO, authorization policy và PostgreSQL SQL routines tại commit `d27de41` (đến PR #29) cùng tài liệu `docs/api/*.md`.
> - **Tổng hợp lượt đối soát**: 8 phân hệ chuyên sâu, **>320 lượt đối chiếu endpoint/SQL**.

---

## 1. Kết quả Build, TypeCheck, Lint & Test hiện tại

| Công cụ kiểm tra | Lệnh chạy | Kết quả | Chi tiết ghi nhận |
|---|---|---|---|
| **TypeScript** | `npx tsc --noEmit` | ✅ **Exit 0** | Không lỗi compile TS (chỉ cảnh báo `TS5101` do `baseUrl` trong `tsconfig.json`). |
| **ESLint** | `npm run lint` | ❌ **Exit 1** (1 error, 2 warnings) | • **Error** [`BlendPlanRequestPage.tsx:109`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/export/pages/BlendPlanRequestPage.tsx#L109): `'isCustomerManager'` khai báo thừa trong `BlendPlanRequestContent` (không dùng, vì link nằm ở `PreviewPlan` dòng 549).<br>• **Warning** [`EventHistoryPage.tsx:174`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/audit/pages/EventHistoryPage.tsx#L174): `react-hooks/exhaustive-deps` thiếu `text`.<br>• **Warning** [`useWorkflowText.ts:8`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/shared/ui/useWorkflowText.ts#L8): `eslint-disable-next-line` không còn tác dụng sau khi bọc `useCallback`. |
| **Unit/Integration Tests** | `npx vitest run` | ✅ **291/291 pass** (43 files) | Chạy sau lần sửa cuối của 5 bug cũ (chưa có chỉnh sửa code mới sau lần chạy này). |
| **Production Build** | `npm run build` | ✅ **Thành công** (2.50s) | Tạo bundle PWA hoàn chỉnh (`dist/sw.js`). |

---

## 2. Xác minh lại 5 lỗi đã sửa trước đó

| # | Trạng thái sau đối soát | Ghi chú phát hiện thêm khi đối soát FE–BE |
|---|---|---|
| **Bug 1** | 🟡 **Đã sửa phần đếm, còn thiếu hiển thị chi tiết** | BE `POST /api/export-containers/{id}/execution/trace` ([`ContainerTraceCompletion.sql:180`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger/backend/src/GrainLedger.Api/Data/Sql/ContainerTraceCompletion.sql#L180)) **có trả về** `holds: [{ id, reason, evidenceId, recordedAt }]`. `ContainerTracePage.tsx` đã đếm `containerHoldCount`, nhưng chưa render danh sách chi tiết lý do/thời gian/evidence của container holds, đồng thời bỏ sót `graph.actualContainers`. |
| **Bug 2** | 🟡 **Đã chặn gửi nhầm `holdId`, còn lệch luồng UX** | `ContainerControls.tsx:702-716` bỏ `holdId` khi link sang `StockTransferPage`, nhưng `StockTransferPage.tsx:73-75` chỉ bật `holdIsolationMode` khi `Boolean(initialHoldId)` nên người dùng bị rơi về tab chuyển thường (trống tồn kho do đang HOLD). Ngoài ra `affectedLotId` thiếu fallback sang `proposals[0].context.inputs[0].lotId` với `BLEND_INPUT_STOCK` chưa sản xuất. |
| **Bug 3** | 🟢 **Đã hết vòng lặp vô hạn** | `useWorkflowText` ổn định bằng `useCallback([i18n.language])` và `EventHistoryPage.tsx` không lặp API. Tuy nhiên còn sót lỗi UX phụ: ledger mode giữ nguyên banner lỗi cũ sau khi lọc lại thành công và thiếu trạng thái loading khi đổi filter/mode (P2), cộng với 2 warning ESLint nêu trên. |
| **Bug 4** | 🟢 **Đã ẩn đúng nút ở Preparation, còn lỗi kiểu `poolRevision`** | Link `exportPaths.containers` đã được guard đúng cho `CUSTOMER_EXPORT_OFFICER` và `CUSTOMER_MANAGER`. Tuy nhiên cùng file `ContainerPreparationPage.tsx` vẫn còn lỗi **P1**: gửi `poolRevision` dạng JSON number thay vì string. |
| **Bug 5** | 🟡 **Guard đúng logic, còn 1 biến thừa gây fail ESLint** | Cả 2 link `compliancePaths.safetyMargin` trong `PreviewPlan` đã được guard bằng `isCustomerManager`, nhưng còn sót khai báo thừa `isCustomerManager` ở dòng 109 của `BlendPlanRequestContent` khiến `npm run lint` thất bại. |

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

### P0-1. Duyệt phạm vi Container gửi enum `"CONTAINER_OUTPUT"` không hợp lệ
- **FE**: [`ContainerControls.tsx:377-391`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/export/components/ContainerControls.tsx#L377-L391), [`containerExecution.ts:175`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/api/containerExecution.ts#L175)
- **BE**: [`ContainerWorkflowEndpoints.cs:117`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger/backend/src/GrainLedger.Api/Features/Exports/Shipments/ContainerWorkflowEndpoints.cs#L117), [`ContainerTraceCorrections.sql:194`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger/backend/src/GrainLedger.Api/Data/Sql/ContainerTraceCorrections.sql#L194)
- **Chi tiết**: `<select>` dùng `<option value="CONTAINER_OUTPUT">`, nhưng BE kiểm tra nghiêm ngặt `review.Scope is not ("ALL_REMAINING" or "OUTPUT_ONLY")` và trả **HTTP 400**. Đồng thời nhãn `"OUTPUT_ONLY"` đang ghi nhầm thành *"Remaining production"* (ngược nghĩa với BE).
- **Khắc phục**: Đổi value `"CONTAINER_OUTPUT"` → `"ALL_REMAINING"` và sửa lại cặp nhãn mô tả cho đúng nghĩa (`OUTPUT_ONLY`: chỉ đầu ra đã tạo; `ALL_REMAINING`: cả phần còn lại + đầu ra hiện có).

### P0-2. Bộ lọc tương thích BLENDING trên `OperationEntryPage` luôn trả về rỗng
- **FE**: [`OperationEntryPage.tsx:195-198`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/mill/pages/OperationEntryPage.tsx#L195-L198)
- **BE**: [`InitialSchema.sql:1324, 3901`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger/backend/src/GrainLedger.Api/Data/Sql/InitialSchema.sql#L1324)
- **Chi tiết**: BE lưu và trả về `compatibilities[].inputProducts` theo định dạng `"<commodityId>:<productIdentity>"` (regex `^[0-9a-fA-F-]{36}:(HEAD_RICE|BROKEN_RICE|BLENDED_RICE)$`). FE lại kiểm tra `item.inputProducts.includes(activeLot.productIdentity)` (chuỗi trần không có `commodityId:`), khiến `compatibleCommodities` luôn rỗng và không chọn được mặt hàng đầu ra cho lệnh `BLENDING`.
- **Khắc phục**: Đổi điều kiện so khớp thành `` `${activeLot.commodityId}:${activeLot.productIdentity}` ``.

### P0-3. Tạo liên kết Thửa–Mùa vụ (`POST /api/plot-seasons`) luôn bị BE từ chối HTTP 400
- **FE**: [`SeasonEditor.tsx:146-192`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/field/components/SeasonEditor.tsx#L146-L192)
- **BE**: [`PlotSeasonEndpoints.cs:339-341`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger/backend/src/GrainLedger.Api/Features/Capture/Seasons/PlotSeasonEndpoints.cs#L339-L341)
- **Chi tiết**: Khi danh mục giống lúa (`varietyOptions`) tồn tại, `createLink` gửi đồng thời cả `riceVariety` (tên giống) lẫn `riceVarietyId`. BE `Validate` kiểm tra `(RiceVarietyId is null) == !hasText` — bắt buộc **chỉ được truyền đúng 1 trong 2**, nếu gửi cả hai sẽ trả HTTP 400 `"Provide exactly one rice variety ID or legacy name."`.
- **Khắc phục**: Khi có `resolvedVarietyId`, bỏ trống / `undefined` trường `riceVariety` ở `createLink` (và kiểm tra luôn `seasonId` trong so sánh `pendingLink`).

### P0-4. Hủy nháp phương án phối trộn (`cancelDraft`) luôn lỗi 412 `PLAN_VERSION_STALE`
- **FE**: [`api/planning.ts:60-64`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/api/planning.ts#L60-L64), [`BlendPlanRequestPage.tsx:150-157, 425-437`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/export/pages/BlendPlanRequestPage.tsx#L150-L157)
- **BE**: [`BlendPlanningEndpoints.cs:294-308`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger/backend/src/GrainLedger.Api/Features/Exports/Planning/BlendPlanningEndpoints.cs#L294-L308)
- **Chi tiết**: BE `CancelPlanDraftAsync` bắt buộc kiểm tra `If-Match: "<version>"`. FE gọi `POST /api/blend-plans/{id}/cancel` không truyền header `If-Match`, nên mọi thao tác hủy nháp đều thất bại với **412 Precondition Failed**.
- **Khắc phục**: Thêm tham số `version`/`etag` cho `planningEndpoints.cancelDraft` để gửi header `"If-Match": "\"${selected.version}\""`.

### P0-5. Tạo đơn xuất khẩu gạo luôn thất bại HTTP 400 do thiếu `requiredRiceVarietyId` (BE PR #29)
- **FE**: [`api/exports.ts:115-130, 201-211`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/api/exports.ts#L115-L130), [`ExportOrderForm.tsx:99-108`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/export/components/ExportOrderForm.tsx#L99-L108), [`ExportOrderMaintenance.tsx`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/export/components/ExportOrderMaintenance.tsx), [`useExportOrderCatalogs.ts`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/export/hooks/useExportOrderCatalogs.ts)
- **BE**: [`ExportRules.cs:11-33`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger/backend/src/GrainLedger.Api/Features/Exports/ExportRules.cs#L11-L33), [`ExportEndpoints.cs:230-287`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger/backend/src/GrainLedger.Api/Features/Exports/Orders/ExportEndpoints.cs#L230-L287)
- **Chi tiết**: BE PR #29 bắt buộc `requiredRiceVarietyId` khi tạo đơn cho `RICE`, `POLISHED-RICE`, `RICE_POLISHED`, và hỗ trợ trường này trên `AddExportSpecificationRequest` & DTO phản hồi. FE hoàn toàn chưa có field/selector giống lúa ở form tạo đơn, sửa đặc tả hay hiển thị danh sách đơn.
- **Khắc phục**: Cập nhật type trong `api/exports.ts`, tải danh mục `getRiceVarieties`, thêm selector `requiredRiceVarietyId` vào `ExportOrderForm` & `ExportOrderMaintenance` (chế độ `spec`), hiển thị `requiredRiceVarietyName` ở `ExportOrdersWorkspace`.

### P0-6. `TraceSourceEvidence` dùng Ledger `lotId` thay vì Capture `sourceRecordId` → Mẫu & Lab luôn rỗng
- **FE**: [`ContainerTracePage.tsx:733-787`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/pages/ContainerTracePage.tsx#L733-L787), [`TraceabilityPage.tsx:1584-1695`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/pages/TraceabilityPage.tsx#L1584-L1695), [`TraceSourceEvidence.tsx:13-39`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/components/TraceSourceEvidence.tsx#L13-L39)
- **BE**: [`SampleEndpoints.cs:254-262`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger/backend/src/GrainLedger.Api/Features/Capture/Samples/SampleEndpoints.cs#L254-L262), [`LabReportEndpoints.cs:383-388`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger/backend/src/GrainLedger.Api/Features/Capture/LabReports/LabReportEndpoints.cs#L383-L388), `docs/api/traceability-api.md:134`
- **Chi tiết**: Cả hai trang truy xuất nguồn gốc truyền ID lô trong sổ cái (`ledger_lots.id`) vào `?sourceLotId=...` của `/api/samples` và `/api/lab-reports`, trong khi BE lọc theo `capture_samples.source_lot_id` (chính là `provenance.sourceRecordId`). Do 2 UUID thuộc 2 bảng khác nhau nên danh sách mẫu/lab luôn trả về rỗng.
- **Khắc phục**: Truyền `source.provenance?.sourceRecordId` vào `<TraceSourceEvidence sourceLotId={...} />`, ẩn/vô hiệu nút khi không có `sourceRecordId`.

### P0-7. `PlaceHoldModal` gọi `GET /api/ledger/setup` luôn bị 403 Forbidden với `CUSTOMER_MANAGER`
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
1. **`useProcurementSync` gọi API thu mua trái quyền cho mọi role**: [`App.tsx:8`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/App.tsx#L8), [`useProcurementSync.ts:57-61`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/field/offline/useProcurementSync.ts#L57-L61), [`offlineCache.ts:229-234`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/field/offline/offlineCache.ts#L229-L234) tự gọi `/api/procurement-reference-data` (`purchases.write`) và `/api/farmers` (`farms.read/write`) cho mọi user đăng nhập/pending → 403 hàng loạt.
2. **`NotificationCenter` poll 403 cho pending user**: [`NotificationCenter.tsx:52-94`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/app/layout/NotificationCenter.tsx#L52-L94) polling 60s `/api/ledger/notifications` và `/api/ledger/lookups` dù user có `role = null` (BE `InitialSchema.sql:3879` trả 403).
3. **`GlobalSearchModal` lộ link `/stock` và `/events` sai quyền**: [`GlobalSearchModal.tsx:29-32`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/app/layout/GlobalSearchModal.tsx#L29-L32) luôn hiện cả 2 đích cho `MILL_ADMIN`, `CUSTOMER_PROCUREMENT_OFFICER` và pending user → bấm vào bị `ProtectedRoute` chặn.
4. **Cookie-session `apiFetch` & `getGoogleAuthUrl` bỏ qua `VITE_API_BASE_URL`**: [`api/client.ts:187`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/api/client.ts#L187), [`api/auth.ts:57-60`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/api/auth.ts#L57-L60) dùng path tương đối thay vì `getApiUrl(endpoint)`, gãy khi FE/BE deploy khác origin.
5. **`GET /api/export-containers/{id}/execution` chặn 403 với `MILL_MANAGER`/`MILL_OPERATOR`**: BE [`ContainerExecutionEndpoints.cs:37`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger/backend/src/GrainLedger.Api/Features/Exports/Shipments/ContainerExecutionEndpoints.cs#L37) gắn policy `export-orders.read` dù SQL cho phép Mill đọc; FE [`ApprovedPlanExecutionPage.tsx:111-116`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/mill/pages/ApprovedPlanExecutionPage.tsx#L111-L116) gọi endpoint này khi mở container từ thông báo HOLD (ví dụ container `CLOSED`) và bị 403.
6. **`LabSampleRegistrationPage` lộ nút "Thêm lượt bàn giao" không có guard**: [`LabSampleRegistrationPage.tsx:934-943`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/compliance/pages/LabSampleRegistrationPage.tsx#L934-L943) trong detail modal thiếu `{canMutateSamples && ...}` (`purchases.write`), làm `CUSTOMER_MANAGER` & `CUSTOMER_EXPORT_OFFICER` bấm vào bị 403.
7. **`SourceLotDetailBody` mở link `/stock/lots/:lotId` cho `CUSTOMER_PROCUREMENT_OFFICER`**: [`ProcurementDetailPages.tsx:524`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/field/pages/ProcurementDetailPages.tsx#L524) & [`StockLotDetailModal.tsx:395-406`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/mill/components/StockLotDetailModal.tsx#L395-L406) dẫn đến route đòi quyền `lots.read.*` mà Procurement Officer không có.
8. **`MrlComplianceCheckPage` dẫn `CUSTOMER_EXPORT_OFFICER` tới `/stock/lots/<captureSourceLotId>`**: [`MrlComplianceCheckPage.tsx:837-839, 878-886`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/compliance/pages/MrlComplianceCheckPage.tsx#L837-L839) dùng `rs.sourceLotId` (ID của Capture) làm param cho route Ledger lot → 404 Not Found.
9. **`BlendInvestigation` mở link `/field/source-lots/:sourceLotId` cho `CUSTOMER_EXPORT_OFFICER`**: [`BlendInvestigation.tsx:286-292`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/export/components/BlendInvestigation.tsx#L286-L292) không kiểm tra role trong khi `fieldRoutes` chỉ cho phép `CUSTOMER_PROCUREMENT_OFFICER` và `CUSTOMER_MANAGER`.
10. **`TraceSourceEvidence` thiếu guard quyền Lab/Customer cho `MILL_ADMIN`**: [`ContainerTracePage.tsx:757-788`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/pages/ContainerTracePage.tsx#L757-L788) & [`TraceabilityPage.tsx:1593-1708`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/pages/TraceabilityPage.tsx#L1593-L1708) để `MILL_ADMIN` bấm xem mẫu & lab rồi nhận 403 từ Capture API.

### 6.2. Thiếu tính năng BE PR #27, #28, #29 & S2 (6 lỗi)
11. Chưa có FE client/UI cho PR #27 `ResidueRiskEndpoints` (`/api/residue-changes/*`, `/api/residue-risk-events/*`).
12. Chưa có FE client/UI cho PR #28 `GET /api/ledger/locations/{id}/stock` (`api/ledger.ts`, `StockOverviewPage`, `StockTransferPage`).
13. Thiếu các field PR #28 (`riceVariety`, `riceVarietyId`, `varietyStatus`, `expectedValue/Unit`, `actualValue/Unit`) trên FE Ledger types và các màn hình Mill.
14. Chưa cài đặt PR #29 `planAdjustment` (chỉnh tay phân bổ đa lô nguyên kg) trên `api/planning.ts`, `BlendPlanRequestPage`, `BlendInvestigation`.
15. Thiếu các field PR #29 (`riceVarietyId/Name`, `varietyCompatible`, `varietyExclusion`, `varietyExclusions`, `quantityStepKg`, `demandChanged`) trên candidate & simulation preview.
16. [`ContainerProductionPanel.tsx:156-162`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/export/components/ContainerProductionPanel.tsx#L156-L162) ẩn nút "Request production" khi `status === "LOADING"` (S2 hỗ trợ cấp lệnh sản xuất bổ sung khi đang `LOADING`).

### 6.3. Lỗi State, DTO, Validation & Recovery (17 lỗi)
17. [`BalancePolicyPage.tsx:266-268, 929-939`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/admin/pages/BalancePolicyPage.tsx#L266-L268): Quy tắc sản lượng dự kiến (`planning_yield_rules`) chỉ nằm trong React state (chưa có BE read endpoint cho `MillManager`) → F5 mất sạch dữ liệu và lần lưu sau gửi version `1` gây **409 Conflict**.
18. [`BalancePolicyPage.tsx:954-965`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/admin/pages/BalancePolicyPage.tsx#L954-L965): `new Date(value("effectiveFrom")).toISOString()` chạy ngoài `save.mutate` → văng `RangeError` chưa bắt nếu ngày lỗi.
19. [`UserAccessManagementPage.tsx:131-139`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/admin/pages/UserAccessManagementPage.tsx#L131-L139) & [`CustomerOrganizationsPage.tsx:88-94`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/admin/pages/CustomerOrganizationsPage.tsx#L88-L94): Lỗi 409/412 render ngoài `<Modal>`, bị che sau lớp nền tối.
20. [`ProcurementReceiptPage.tsx:670-816, 918`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/field/pages/ProcurementReceiptPage.tsx#L670-L816): Lỗi submit/validation của Create Modal cũng render ngoài `<Modal>`, người dùng không thấy lý do bị kẹt.
21. [`ProcurementReceiptPage.tsx:578-587`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/field/pages/ProcurementReceiptPage.tsx#L578-L587): Dùng `crypto.randomUUID()` giả cho `collectionSiteId`, `receivingLocationId`, `commodityId` khi thiếu `refData` → làm hỏng dữ liệu offline sync vĩnh viễn.
22. [`ProcurementReceiptPage.tsx:551-563`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/field/pages/ProcurementReceiptPage.tsx#L551-L563): `getAvailablePlotSeasons` fallback sang thửa của nông hộ khác → 409 `SOURCE_RECORD_NOT_READY`.
23. [`pendingCapture.ts:28-30`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/field/offline/pendingCapture.ts#L28-L30): Không xóa `pending` khi gặp HTTP `409`, khóa chết các form đăng ký nông dân/thửa/phun thuốc/mẫu trong `localStorage`.
24. [`OfflineSyncQueuePage.tsx:188-233`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/field/pages/OfflineSyncQueuePage.tsx#L188-L233) & [`procurementQueue.ts:106-123`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/field/offline/procurementQueue.ts#L106-L123): Không có nút xóa/hủy phiếu thu mua offline bị lỗi vĩnh viễn (400/409).
25. [`MasterDataPage.tsx:209-219, 248-257`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/catalogs/pages/MasterDataPage.tsx#L209-L219): PATCH `measurement-units` và `quality-attributes` gửi kèm `code`, `quantityKind`/`unit` bất biến → BE trả 400.
26. [`ContainerPreparationPage.tsx:854-859, 1030-1034`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/export/pages/ContainerPreparationPage.tsx#L854-L859): Gửi `poolRevision` dạng JSON number thay vì string → BE `ContainerPreparation.sql:173-174` trả 400.
27. [`StockTransferPage.tsx:68-80, 94-104, 464-472`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/mill/pages/StockTransferPage.tsx#L68-L80): Chọn HOLD tự ghi đè `lotId` thành lô tổ tiên 0 kg đối với HOLD kế thừa; không đồng bộ URL search params sau khi mount; khóa `MILL_OPERATOR` nếu URL có `holdId`; chỉ load 50 holds đầu và bỏ qua `activeHolds.error`.
28. [`StockLotDetailModal.tsx:46-58, 204-245`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/mill/components/StockLotDetailModal.tsx#L46-L58): Đọc các trường không tồn tại `directHoldIds`/`effectiveHoldIds` (BE `ledger_lot_json` chỉ trả `restrictions`) → làm rơi `holdId` khi link sang `StockTransferPage` và gắn nhầm nhãn HOLD cho restriction khác (`CORRECTION`, `RECEIVING_DISCREPANCY`, `SUPERSEDED`).
29. [`TraceabilityPage.tsx:119-120, 1316-1404`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/pages/TraceabilityPage.tsx#L119-L120), [`ContainerTracePage.tsx:131-135, 892-925`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/pages/ContainerTracePage.tsx#L131-L135), [`traceFlow.ts:12-13`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/model/traceFlow.ts#L12-L13): Kiểm tra `directHoldIds`/`effectiveHoldIds` thay vì boolean `directHold`/`effectiveHold` của BE `ledger_trace_graph` → làm tắt toàn bộ badge Direct/Inherited HOLD và link cách ly từ trang truy xuất.
30. [`traceFlow.ts:26-41, 309-332`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/model/traceFlow.ts#L26-L41): Schema `custodyEvents` ở FE (`kind`, `lotId`, `quantityKg`) lệch hoàn toàn với BE (`action`, `primaryOutputLotId`, `locationId`, `revision`), biến node `custody` trong `TraceFlowchart` thành dead code.
31. [`HoldManagementPage.tsx:276-293`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/pages/HoldManagementPage.tsx#L276-L293): Bộ lọc trạng thái có option `"RELEASED"` không tồn tại ở BE → chọn vào bị HTTP 400.
32. [`ContainerTracePage.tsx:139-142, 535-576, 802-815`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/pages/ContainerTracePage.tsx#L139-L142): (Follow-up Bug 1) Chưa render danh sách chi tiết `record.holds` (`reason`, `recordedAt`, `evidenceId`) và bỏ qua `graph.actualContainers` cho Flowchart & `<ActualLoading>`.
33. [`PlaceHoldModal.tsx:160-179, 305-310`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/components/PlaceHoldModal.tsx#L160-L179) & [`ContainerTracePage.tsx:217-242`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/risk/pages/ContainerTracePage.tsx#L217-L242): `POST /api/ledger/holds` trên BE không lưu `evidenceId`/`traceId` vào bảng `ledger_holds`, đồng thời `ContainerTracePage` không truyền `facilityId` vào `holdSelectableLots`.

*(Ghi chú: Tổng mục 6 có 33 đầu việc do tách rõ `StockLotDetailModal` vs `Traceability/ContainerTrace` và liệt kê từng lỗi độc lập rõ ràng theo file/phân hệ).*

---

## 7. Tóm tắt các nhóm lỗi P2 (34 lỗi) & P3 (8 lỗi)

### Nhóm P2 — Sai lệch Validation, State, DTO phụ, Pagination & UX (34 vấn đề)
- **App Shell / Auth / Role / Profile (4)**:
  - Pending user (`role: null`) bị gắn nhãn giả `"[SV] Người xem tồn kho"` ở `AppHeader.tsx:295` và `EditProfilePage.tsx:266` (BE chỉ có 6 role, không có `StockViewer`).
  - `ROLE_DEFINITIONS.MILL_MANAGER.defaultPath` là `/mill/operations/new`, trong khi route này bị ẩn khỏi sidebar của `MILL_MANAGER` (do không có `conversions.write`).
  - `EditProfilePage.tsx` hiển thị tên nhà máy hardcode (`"Cụm Silo & Dây chuyền A - Tiền Giang"`), và `authApi.updateProfile` bỏ qua `SessionUserDto` / thông báo lỗi trả về từ BE.
  - `authEndpoints.webLogin` (chưa dùng) thiếu header `X-CSRF-TOKEN` mà BE `/api/auth/web-login` bắt buộc.
- **Admin & Audit (6)**:
  - `EventHistoryPage.tsx` (Ledger mode) giữ banner lỗi cũ sau khi lọc lại thành công và không bật loading khi đổi bộ lọc/mode; placeholder tìm kiếm sai phạm vi/trường tìm trên BE và debounce 400ms cắt mất dấu cách cuối khi đang gõ; tab Ledger Audit vẫn hiện cho `MILL_ADMIN` dù BE luôn trả 0 dòng; BE `ledger_read_before_equipment_retirement` trả `lotId: null` khi chưa lọc `?lotId=`; FE bỏ qua route params `/events/:type/:id`, không hiện `evidenceId` ở business history, không dịch `item.eventType`, và thiếu `maxLength={100}`.
  - `FacilityList`, `FacilityLocations`, `FacilityEquipment` bỏ qua cờ `canEdit` từ BE (bấm sửa record do admin khác tạo bị 403), và `FacilityList` hiện nút "Thêm Nhà máy Đầu tiên" cho role chỉ đọc.
  - `LocationClearanceDialog.tsx` bắt nhập UUID `evidenceId` bằng tay thay vì tích hợp upload file và không kiểm tra định dạng UUID.
- **Field & Capture (5)**:
  - `ProcurementReceiptPage.tsx`: xung đột closure `setTimeout` khi phân trang vs `isFetchingRef`; `initData` gọi `getReferenceData()` không check `canCapture` gây 403 với `CUSTOMER_MANAGER`; nuốt lỗi `getProcurements` thành `[]` và lọc lại trên client làm rơi kết quả khớp theo `status`.
  - `FarmerRegistrationPage.tsx` & `PlotRegistrationPage.tsx` bỏ qua cờ `canEdit`/`canDelete` của BE và ghi đè cache nông dân offline bằng kết quả phân trang/tìm kiếm.
  - Các lookup đơn trang bị cắt cụt ở 100 (`farmers`, `plots`, `plot-seasons`) và 25 (`receivingOptions`).
- **Catalogs & Compliance (3)**:
  - `LabReportResponse.residueBindings` và `replacementReportId` không được hiển thị sau khi xác nhận báo cáo lab.
  - `MrlComplianceCheckPage` đánh rơi `?sampleId=` khi tạo link `compliancePaths.samples` cho Export Officer, và `LabSampleRegistrationPage` không theo dõi thay đổi của `useSearchParams()`.
  - `MasterDataPage` thiếu `<select>` 5 giá trị `quantityKind` chuẩn của BE và nuốt chi tiết `err.problem?.errors`.
- **Mill & Ledger (6)**:
  - `ReceivingTasksPage.tsx:988-992` hiện nút tải `CorrectionEvidenceDownload` cho `MILL_OPERATOR` dù BE trả 403.
  - `OperationEntryPage.tsx` chỉ lấy 100 lô trang 1 không `availableOnly="true"`, chỉ đọc `positions[0]`, dùng `checkMassBalance` không floor 6 chữ số thập phân, dùng `parseFloat`, không lọc `COMPARTMENT` chưa cleared và để sót draft mồ côi khi commit lỗi.
  - `OperationDraftsPage.tsx` kiểm tra dung sai theo thời điểm mở trang thay vì `occurredAt` và thiếu lọc `availableKg > 0` / `COMPARTMENT` clearance.
  - `ContainerControls.tsx:478-490, 533-551` (cũng liên quan Slice 7): bàn giao `BAGGING` cho nhập `declaredLossKg !== "0"` (vd `"0.0"` bị BE 400), `outputKg` không khóa khớp `quantityKg`, và danh sách đích không loại bỏ kho `mixedBulk` / `COMPARTMENT` chưa cleared.
  - `CorrectionRequestForm` & `CorrectionRequestPage` gọi `getOperations()` không tham số (chỉ lấy 25 lệnh mới nhất mọi status).
  - `CorrectionManagementPage` & `CorrectionWorkbench` đọc nhầm các field không có trên BE (`category`, `createdBy`, `proposedReversals`), hiển thị `locationId` dạng UUID thô và tính toán bằng `Number()`.
- **Export Planning & Containers (6)**:
  - BE `BlendPlanPreviewEndpoints.cs:452-466` không trả field `expiresAt` về JSON dù DB có lưu, khiến đồng hồ đếm ngược 10 phút trên `BlendPlanRequestPage` không bao giờ kích hoạt.
  - Chỉnh tỷ lệ `BlendRatioEditor` thất bại (`canPropose = false`) ghi đè mất preview hợp lệ trước đó và làm unmount editor; input số không xóa trắng được vì `edited || first.quantityKg` tự bật lại giá trị cũ.
  - Recovery UI cho `proposePlan` nằm trong khối `{result.canPropose && ...}` nên F5 sau lỗi mạng làm mất nút Retry/Discard.
  - `BlendPlanReviewPage` đặt `maxLength={2000}` (BE giới hạn 1000), cho bấm Revoke sau khi container đã chạy thực tế (409), và hiện cảnh báo freshness sai ngữ cảnh khi phương án đã `APPROVED`.
  - `ExportOrderMaintenance` cho nhập 9 chữ số thập phân (BE chỉ nhận 6) và không `.toUpperCase()` mã đơn vị (`KG`, `G`, `T`); đồng thời `BlendPlanRequestPage.tsx:109` còn biến thừa `isCustomerManager` gây fail ESLint.
  - Follow-up Bug 2 (`ContainerControls` → `StockTransferPage` không tự bật ISOLATION mode và thiếu fallback input lot cho `BLEND_INPUT_STOCK`); `ContainerProductionPanel` cho bấm approve/reject đơn mẻ ngay cả với đa mẻ (409); `ContainerPreparationPage` dùng `key={finding.code}` không duy nhất; `ContainerLoadingForm` cắt `loadedAt` đến phút gây 409 khi vừa tạo lô.
- **Risk & Traceability (5)**:
  - `ContainerTracePage` & `traceFlow.ts` đọc `lot.quantityKg`/`availableKg` (không tồn tại ở BE `ledger_trace_graph`, phải tính từ `positions[]`) và `edge.kind` (BE trả `edge.relationType`).
  - `ContainerTracePage` giữ input/containerCode cũ khi đổi URL và hiện link `/risk/holds` cho `MILL_ADMIN` (bị chặn bởi `ProtectedRoute`).
  - `HoldManagementPage` không tự mở `PlaceHoldModal` khi vào `/risk/holds/new` hoặc `?lotId=`, và ẩn toàn bộ bảng holds khi có `actionError`.
  - `PlaceHoldModal` & `RespondHoldModal` upload trùng file evidence khi retry sau 409 và không refetch version container cũ.
  - `HoldBanner` thiếu key i18n `risk.targetTypes.*` và mặc định `issuedAt = '15/10/2026 14:30'` hardcode.

### Nhóm P3 — Lỗi nhẹ, Dead Code, i18n & Styling (8 vấn đề)
1. **ESLint / Dead vars**: `useWorkflowText.ts:8` dư directive `eslint-disable`; `BlendPlanRequestPage.tsx:109` dư biến `isCustomerManager`.
2. **Dead Auth flows & tokens**: `authApi` có `validateInvitationToken`/`acceptInvitation`/`changePassword` stub throw lỗi, schema thừa trong `authSchemas.ts`, `api/auth.ts` dư `webLogin`/`getCsrf`/`loginGoogle`/`googleComplete`, refresh token hết hạn hiện nhầm thông báo "phiên đã đổi", và logout khi offline kẹt trên shell.
3. **Hardcoded copy bỏ qua i18n**: `ProtectedRoute.tsx`, `ErrorBoundary.tsx`, `main.tsx` (PWA prompt), `feedbackStore.ts`, `landing/components/*` còn tiếng Việt cứng; `ProcurementReceiptPage.tsx` lặp chữ `"kg lúa tươi"` trong `field.receipt.successCreated`.
4. **Dead API types / wrappers**: `api/ledger.ts` dư `getReceivingThresholdCompanies`, `RecordOperationRequest`, `HoldRequest`; `api/residue.ts` dư `createPolicySetting`; `api/catalogs.ts` khai báo `category`/`safetyIntervalDays` không có ở BE; `StalePlanBanner.tsx` là dead component chứa ID mock.
5. **Admin & Audit cleanup**: `FacilityAssignments.tsx` không xóa success banner khi mutation mới lỗi; `EventHistoryPage.getEntityIcon` có nhánh unreachable; `dashboardData.ts:491` dùng `landingPaths.landing` làm dấu `/` nối chuỗi ngày; nhắc tới `AUTHORIZED_STOCK_VIEWER` không tồn tại ở BE.
6. **Field minor UX**: `MapLocationPicker.tsx` tự mở lại dropdown Nominatim 450ms sau khi chọn; `<a href>` thay vì `<Link>` ở một số link nội bộ; `PesticideDeclarationPage.tsx` thiếu scope user/org trong `queryKey`.
7. **Compliance minor**: `LabSampleRegistrationPage` nhập `sourceLotId` bằng text gợi ý mã lô thay vì Guid; `ResidueProfilesPage.tsx:270` dùng `absolute` thiếu `relative` làm icon lệch vị trí; `ContainerReadiness.tsx` thiếu bản dịch cho vài mã lỗi mới (`ASSESSMENT_POLICY_MISSING`, `CLOSE_SCOPE_REVIEW_REQUIRED`, `NO_ACTUAL_LOADING`, `OUTPUT_PRODUCT_IDENTITY_CHANGED`, `RESIDUE_*`) và BE `409 WORKFLOW_BLOCKED` thiếu `title`.
8. **Traceability minor**: `TraceabilityPage.tsx` không validate UUID cho `?lotId=`, ô tìm kiếm thiếu `maxLength={200}`, và `ActualLoading` đọc `sourceContributions` trên lot trace vốn chỉ có ở container trace.

---

## 8. Thứ tự Ưu tiên Khắc phục Đề xuất

1. **Đợt 1 (Fix ngay — mở khóa các luồng gãy & pass CI Lint)**:
   - Xóa biến thừa [`BlendPlanRequestPage.tsx:109`](file:///C:/Users/PhamCuong/Desktop/Capstone/GrainLedger-Frontend/web/grainledger/src/features/export/pages/BlendPlanRequestPage.tsx#L109) và xử lý 2 warning ESLint để `npm run lint` xanh.
   - Sửa **7 lỗi P0** (`ContainerControls` scope `ALL_REMAINING`, `OperationEntryPage` `<commodityId>:<productIdentity>`, `SeasonEditor` chỉ gửi `riceVarietyId` hoặc `riceVariety`, `planningEndpoints.cancelDraft` gửi `If-Match`, `TraceSourceEvidence` truyền `provenance.sourceRecordId`, `PlaceHoldModal` chuyển sang `getLookups()`, và bổ sung `requiredRiceVarietyId` cho đơn xuất khẩu PR #29).
2. **Đợt 2 (Chặn toàn bộ 403 nền, kẹt form & lỗ hổng điều hướng — P1)**:
   - Guard `useProcurementSync`, `NotificationCenter`, `GlobalSearchModal`, `TraceSourceEvidence`, `LabSampleRegistrationPage`, `StockLotDetailModal`, `MrlComplianceCheckPage`, `BlendInvestigation`.
   - Sửa lỗi modal nuốt error (`UserAccessManagementPage`, `CustomerOrganizationsPage`, `ProcurementReceiptPage`), lỗi `pendingCapture` 409 lockup, `MasterDataPage` PATCH payload, `ContainerPreparationPage` `poolRevision` string, `HoldManagementPage` bỏ `"RELEASED"`, và đối soát `directHold`/`effectiveHold` + `custodyEvents` trên `Traceability`/`ContainerTrace`.
3. **Đợt 3 (Đồng bộ hoàn chỉnh tính năng BE PR #27, #28, #29 & S2)**:
   - Hoàn thiện UI cho `LocationStock` (`/api/ledger/locations/{id}/stock`), thuộc tính `riceVariety` trên toàn phân hệ Mill & Planning, bộ editor `planAdjustment` đa lô nguyên kg, `ContainerProductionPanel` cho phép `LOADING`, và màn hình theo dõi `ResidueRiskEndpoints` (F12).
   - Phối hợp BE bổ sung read endpoint cho `planning_yield_rules` (`BalancePolicyPage`), mở quyền `GET /api/export-containers/{id}/execution` cho Mill roles, trả `expiresAt` ở preview blend plan, và lưu `evidenceId` cho `POST /api/ledger/holds`.
