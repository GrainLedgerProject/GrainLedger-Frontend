# UI mock data and API mismatch report

## Scope

Web and mobile frontend compared with backend API source. Findings come from static source inspection; no live API or UI execution. Input examples and explicitly labeled marketing simulations are excluded unless they prefill operational data.

**Path shorthand:** `W/` = `web/grainledger/src/`; `M/` = `mobile/grainledger/src/`; `B/` = `~/github/GrainLedger/backend/src/GrainLedger.Api/`.

## Highest risks

1. Web can report successful operation commits, correction requests, profile updates, and policy changes after backend failures.
2. Mobile marks most queued operations as synced without sending them.
3. Farmer, plot, procurement, spray, and sample creation have request-contract mismatches.
4. Compliance, dashboard, receiving, and traceability screens display fabricated operational data.
5. MRL screens misread backend status and limits; HOLD actions target incorrect data.

## 1. Mock data and simulated behavior

### Web

| Area | Finding | Evidence |
|---|---|---|
| Global search | Returns fixed farmer, lot, container, and event records, not search results from backend. | `W/components/GlobalSearchModal/GlobalSearchModal.tsx:24-110` |
| Notifications | Fixed alert count and fixed HOLD/MRL and plan notifications. | `W/components/AppHeader/AppHeader.tsx:144-219` |
| Dashboards | Role-specific KPIs, processing losses, plans, holds, lab results, residue values, orders, and company/user counts are hardcoded. Offline queue count is separate local state. | `W/features/dashboard/pages/RoleHomePage.tsx:41-70,95-270,417-665,768-840` |
| Lab sample registration | Starts with four fabricated sample records and prefilled lot/lab/substance data. Submit creates a local record after a timeout; no API write. | `W/features/compliance/pages/LabSampleRegistrationPage.tsx:55-166,186-270` |
| Lab results | Two fabricated inspections and MRL results. New entries exist only in component state. | `W/features/compliance/pages/MrlComplianceCheckPage.tsx:57-178` |
| Safety margin | Hardcoded substances and limits; slider and verdict operate locally. A simulated HOLD does not create a backend hold or save a policy. | `W/features/compliance/pages/SafetyMarginPolicyPage.tsx:20-33,104-176,295-389` |
| Field samples | Fixed sample records replace empty responses; valid paginated responses are also mishandled as described below. | `W/features/field/pages/FieldSampleRegistrationPage.tsx:57-154` |
| Receiving tasks | Three fixed tasks appear when API fails or returns an empty list. Measurement form also starts with preset weight and moisture. | `W/features/mill/pages/ReceivingTasksPage.tsx:53-104` |
| Operation entry | Fixed lots and quantities appear initially and on empty/error responses. A failed operation request can still produce a generated event code and committed-looking success state. | `W/features/mill/pages/OperationEntryPage.tsx:106-169,369-380,507-542` |
| Correction request | Recent operations and facility ID are fixed. Failed create request is swallowed; UI reports success. | `W/features/mill/pages/CorrectionRequestPage.tsx:35-72,215-242` |
| Reconciliation | Page initializes with fixed reconciliation records. | `W/features/mill/pages/ReconciliationReviewPage.tsx:65-107,211-214` |
| Facility configuration | Falls back to fabricated facility, silo, and equipment records when setup lacks facilities. | `W/features/admin/pages/FacilityConfigPage.tsx:68-127` |
| Receiving thresholds | Default settings and example company thresholds are hardcoded; page does not load backend default settings. | `W/features/admin/pages/ReceivingThresholdsPage.tsx:37-45,60-101` |
| Balance policy | Seeds fixed policies and compatibility rules. Some failed writes still show success; deletion changes local state only. | `W/features/admin/pages/BalancePolicyPage.tsx:65-171,205-218,232-290` |
| Profile | Displays a fixed facility assignment if assignment data is absent. Failed profile update can still show success. | `W/features/auth/pages/EditProfilePage.tsx:56-80,260-273`; `W/features/auth/api/authApi.ts:81-91` |
| Invitation and password change | Invitation validation returns fixed identity data; acceptance only delays/logs. Password change only checks whether current password equals literal `wrong`, then reports success. | `W/features/auth/api/authApi.ts:61-78,97-103` |
| MRL catalog | Missing names fall back to fixed EU market and rice commodity; fallback choices and some displayed legal/source values are hardcoded. | `W/features/catalogs/pages/MrlVersionsPage.tsx:66-82,411-444,513-545` |
| Procurement list | Missing moisture and mass values can display fixed `24.5` and `5.000`; form also starts with preset weight and moisture. | `W/features/field/pages/ProcurementReceiptPage.tsx:94-102,204-210,473-480,801-808` |

**Not reachable from current router:** `CorrectionManagementPage.tsx` contains additional local mock correction behavior, but `/mill/corrections/pending` routes to `PendingCorrectionsPage`, not that file. Do not treat the former as an active screen. Router: `W/app/router/routes.tsx:484-494`.

### Mobile

Mobile has real auth and some backend reads, but many displayed fields are synthesized after reading API data.

| Area | Fabricated or local-only behavior | Evidence |
|---|---|---|
| Farmer/plot | Random local codes; forms collect fields not included in corresponding requests. Plot rows receive fixed variety/season and current date. | `M/store/fieldStore.ts:119-132,191-224,247-284` |
| Procurement | Backend summaries are supplemented with fabricated plot, commodity, site, moisture, and contact values. Net mass is displayed as gross mass. | `M/store/fieldStore.ts:134-149` |
| Silos | Codes, capacity, moisture, status, and update time are synthesized/defaulted. Stock aggregation does not filter by facility. | `M/store/millStore.ts:78-102` |
| Receiving | Procurement summaries become synthetic receiving jobs with fixed vehicle, derived gross/tare, fixed moisture, and first-location target. Creating and changing task status is local only. | `M/store/millStore.ts:104-120,210-242`; `M/app/(tabs)/mill.tsx:163-172` |
| Operations | Fallback code, facility, product, lot, loss, variance, and confirmed status are fabricated. New operations are stored locally, not sent to ledger. | `M/store/millStore.ts:122-140,244-272` |
| Traceability | Lot origin, farmer/plot, purity, history event, initial mass, date, and QR URL are synthesized. Backend trace endpoints are not called. | `M/store/millStore.ts:142-185`; `B/Features/Ledger/Traceability/LotTraceability.cs:27-59` |
| Forms | Static pesticide, variety, season, site, vehicle, silo, facility, and operation defaults can look like real choices. | `M/app/spray-form.tsx:19-24`; `M/app/plot-form.tsx:19-31`; `M/app/procurement-form.tsx:24-32`; `M/app/receiving-form.tsx:26-33`; `M/app/operation-form.tsx:21-40` |
| Sync | Queue sends only farmer and plot actions. All other action types are marked successful without a request; retry also marks an item successful without syncing it. | `M/store/offlineStore.ts:70-112,154-175` |

`isMock` in mobile API means a network exception occurred; it does not provide a mock API response. Local AsyncStorage records are persisted locally, not necessarily on backend: `M/services/api.ts:63-122`; `M/services/storage.ts:3-28`.

## 2. API contract mismatches

### Field capture and procurement

| Area | UI behavior | Backend contract / effect |
|---|---|---|
| Web farmer creation | Sends schema version `1` and client-generated code. | Requires version `2` and assigns code server-side; request rejected. Editing also exposes an immutable code. `W/features/field/pages/FarmerRegistrationPage.tsx:177-207`; `B/Features/Capture/Farmers/FarmerEndpoints.cs:223-228,319-330` |
| Web plot creation | Sends version `1` and client code. | Requires version `2`; rejects supplied code. `W/features/field/pages/PlotRegistrationPage.tsx:216-230`; `B/Features/Capture/Farmers/PlotEndpoints.cs:293-312` |
| Web procurement creation | Sends version `1`. Offline queue retries same payload. | Requires version `2`; queued requests remain invalid until payload corrected. `W/features/field/pages/ProcurementReceiptPage.tsx:538-560`; `W/pwa/procurementQueue.ts:65-79`; `B/Features/Capture/Procurement/ProcurementEndpoints.cs:459-475` |
| Web procurement references | Generates random UUIDs for missing site, receiving location, commodity, or plot season. | Backend validates referenced records; generated IDs do not identify valid records. `W/features/field/pages/ProcurementReceiptPage.tsx:455-471,529-536`; `B/Features/Capture/Procurement/ProcurementEndpoints.cs:173-196` |
| Web procurement list | Requests default page only; uses summary records as if they contain item moisture. | Backend list is paginated and summary does not include line-item moisture. Older rows are omitted; fallback values can be shown as measurements. `W/features/field/pages/ProcurementReceiptPage.tsx:187-210,801-808`; `B/Features/Capture/Procurement/ProcurementEndpoints.cs:37-41,280,343-353` |
| Web spray declaration | Sends version `1` and item fields `rate`/`rateUnit`. | Backend requires version `2`; item contract contains product and substance fields, not those rate fields. `W/features/field/pages/PesticideDeclarationPage.tsx:121-141`; `B/Features/Capture/SprayDeclarations/SprayDeclarationEndpoints.cs:17-26,202-203` |
| Web sample list | Accepts only a bare array. | Backend returns `{ items, page, pageSize, hasMore }`; valid results become mock samples. `W/features/field/pages/FieldSampleRegistrationPage.tsx:61-87,104-132`; `B/Features/Capture/Samples/SampleEndpoints.cs:22-24,247-270` |
| Web sample creation | Sends version `1`, a client sample code, and a displayed lot code or random UUID as `sourceLotId`. | Requires version `2`, assigns sample code, and expects an accepted source-lot UUID. `W/features/field/pages/FieldSampleRegistrationPage.tsx:163-178,484-528`; `B/Features/Capture/Samples/SampleEndpoints.cs:69-85,110-113` |
| Web sample handover | Omits `deviceId`; locally marks sample delivered without sending a lab-dispatch kind. | Backend validates device ID and defaults kind to `HANDOVER`, not lab dispatch. `W/features/field/pages/FieldSampleRegistrationPage.tsx:232-265`; `B/Features/Capture/Samples/SampleEndpoints.cs:147-170,324-334` |
| Mobile farmer/plot | Omits `deviceId`, sends version `1` and generated codes; ignores server-assigned code. | Backend requires device ID and version `2`, and rejects client codes. `M/store/fieldStore.ts:211-224,267-284`; `B/Features/Capture/Farmers/FarmerEndpoints.cs:319-335`; `B/Features/Capture/Farmers/PlotEndpoints.cs:293-316` |
| Mobile spray list | Expects a bare array. | Backend returns paginated `items` wrapper; mobile retains cached sprays instead. `M/store/fieldStore.ts:103-108,151-166`; `B/Features/Capture/SprayDeclarations/SprayDeclarationEndpoints.cs:27-31,146-165` |
| Mobile spray/procurement | Writes are local only. Spray form uses plot ID where backend needs plot-season ID; procurement form lacks required referenced IDs and item lines. | Backend exposes separate create endpoints with those contracts. `M/app/spray-form.tsx:58-68`; `M/store/fieldStore.ts:333-360`; `B/Features/Capture/SprayDeclarations/SprayDeclarationEndpoints.cs:18-26,87-99`; `B/Features/Capture/Procurement/ProcurementEndpoints.cs:18-46` |

### Catalogs and MRL

| Area | Mismatch and effect | Evidence |
|---|---|---|
| Catalog edits | Master Data PATCH requests omit required `If-Match` ETag. | `W/features/catalogs/pages/MasterDataPage.tsx:129-167`; `W/api/catalogs.ts:82-90`; example backend `B/Features/Catalogs/ReferenceData/ActiveSubstanceEndpoints.cs:92-103` |
| Catalog deletes | Commodity, unit, and substance delete requests omit required `If-Match`. | `W/features/catalogs/pages/MasterDataPage.tsx:237-268`; `B/Features/Catalogs/Commodities/CommodityEndpoints.cs:156-166`; `B/Features/Catalogs/ReferenceData/MeasurementUnitEndpoints.cs:154-164` |
| Immutable fields | Unit edits send `code` and `quantityKind`; quality-attribute edits send `code` and `unit`. Backend rejects those changes. | `W/features/catalogs/pages/MasterDataPage.tsx:138-164`; `B/Features/Catalogs/ReferenceData/MeasurementUnitEndpoints.cs:109-114`; `B/Features/Catalogs/ReferenceData/QualityAttributeEndpoints.cs:97-102` |
| Catalog pagination | UI loads first page only; no pagination controls. | `W/features/catalogs/pages/MasterDataPage.tsx:52-90,409-412`; `B/Features/Catalogs/ReferenceData/ActiveSubstanceEndpoints.cs:65-80` |
| Commodity archive | Backend DELETE archives commodity; UI labels it deleted and renders listed rows active. | `W/features/catalogs/pages/MasterDataPage.tsx:263-268,479-486`; `B/Features/Catalogs/Commodities/CommodityEndpoints.cs:168-186,262-263` |
| Unsupported client methods | Client declares DELETE for markets, quality attributes, and rice varieties; backend has no such DELETE routes. Current Master Data UI hides those deletes. | `W/api/catalogs.ts:115-118,161-164,184-187`; `B/Features/Catalogs/ReferenceData/MarketEndpoints.cs:22-29` |
| MRL version fields | UI expects `versionNumber`/`isPublished`; backend sends `versionNo`/`status`. Published versions can appear as drafts and offer publish actions. | `W/features/catalogs/pages/MrlVersionsPage.tsx:26-42,437-462`; `B/Features/Catalogs/Mrl/MrlVersionEndpoints.cs:17-22` |
| MRL limits | UI accepts array only; backend returns paginated `items` wrapper, so limits appear empty. | `W/features/catalogs/pages/MrlVersionsPage.tsx:199-211,219-235`; `B/Features/Catalogs/Mrl/MrlVersionEndpoints.cs:23-26,347-381` |
| MRL writes | Limit edits/deletes and publish omit required version `If-Match`. | `W/api/catalogs.ts:230-244`; `B/Features/Catalogs/Mrl/MrlVersionEndpoints.cs:52-57,209-225,257-286` |
| MRL permissions | UI exposes write actions to customer roles; backend requires `platform.configure` for these writes. | `W/app/router/routes.tsx:359-372`; `B/Features/Catalogs/Mrl/MrlVersionEndpoints.cs:36-47`; `B/Features/Identity/Authorization/Permissions.cs:55-61` |

### Ledger, risk, compliance, and audit

| Area | Mismatch and effect | Evidence |
|---|---|---|
| Facility list | Client declares `GET /api/ledger/facilities`; backend exposes setup/lookups reads and facility mutations, but no facility-list GET at that path. | `W/api/ledger.ts:49-65`; `B/Features/Ledger/Endpoints/LedgerEndpoints.cs:15-20,49-53` |
| Facility mutations | Facility/location/equipment updates and deletes omit required row `version`. Page also forces location type `SILO` and equipment type `MILL` on save. | `W/features/admin/pages/FacilityConfigPage.tsx:179-198,225-269`; `B/Features/Ledger/Endpoints/LedgerManagementEndpoints.cs:11-34` |
| Receiving thresholds | UI sends different fields from backend: backend requires string `percentage` and `reason`, plus version on update/delete. | `W/features/admin/pages/ReceivingThresholdsPage.tsx:140-181`; `B/Features/Ledger/Endpoints/LedgerManagementEndpoints.cs:77-110` |
| HOLD creation | UI collects a lot code but sends a random lot UUID and `reasonCode`; backend expects the actual lot ID and `reason`. | `W/features/risk/pages/HoldManagementPage.tsx:97-120`; `B/Data/Sql/InitialSchema.sql:1557-1563` |
| HOLD response | UI sends `responseKind`, timestamp, and notes; backend expects status, response, and evidence. Isolation also requires actual stock transfer. | `W/features/risk/pages/HoldManagementPage.tsx:132-148,325-340`; `B/Data/Sql/InitialSchema.sql:1575-1612` |
| HOLD list | UI expects different reason, time, and status fields and renders badges as active; backend returns `reason`, `status`, and `createdAt`. | `W/features/risk/pages/HoldManagementPage.tsx:15-24,289-323`; `B/Data/Sql/InitialSchema.sql:3922,3995` |
| HOLD authorization | New-hold route admits mill admin, while backend `holds.manage` permission is granted to customer manager. | `W/app/router/routes.tsx:792-799`; `B/Features/Ledger/Endpoints/LedgerEndpoints.cs:60-61`; `B/Features/Identity/Authorization/Permissions.cs:57-61` |
| Lab workflows | UI sample registration and results are local simulations despite backend sample, handover, lab-report, file, and confirmation APIs. Their form models do not implement those backend request contracts. | `W/features/compliance/pages/LabSampleRegistrationPage.tsx:186-270`; `W/features/compliance/pages/MrlComplianceCheckPage.tsx:57-178`; `B/Features/Capture/Samples/SampleEndpoints.cs:15-24,52-85`; `B/Features/Capture/LabReports/LabReportEndpoints.cs:18-50,61-72` |
| Event history | UI expects `eventType`, entity fields, `timestamp`, `payload`, and hash; ledger history projection uses `kind`, `occurredAt`, actor/operation/lot IDs, and `details`. | `W/features/audit/pages/EventHistoryPage.tsx:25-37,73-75,118-134`; `B/Data/Sql/InitialSchema.sql:3991-4000` |
| Audit integrity claim | UI presents SHA-256 verification/hash information, but the history projection does not supply a hash. Identity audit events are not exposed through this ledger-history view. | `W/features/audit/pages/EventHistoryPage.tsx:187-188,429-432,566-575`; `B/Data/Sql/InitialSchema.sql:3995-3999`; `B/Features/Identity/EndpointMapping.cs:9-15` |

### Identity, roles, and transport

| Area | Mismatch and effect | Evidence |
|---|---|---|
| Role assignment | UI sends values such as `MILL_OPERATOR`; backend accepts names such as `MillOperator`. UI also offers `AUTHORIZED_STOCK_VIEWER`, absent from backend roles. | `W/features/admin/pages/UserAccessManagementPage.tsx:71-90,325-337`; `W/shared/types/roles.ts:5-12,74-81`; `B/Features/Identity/Domain/Roles.cs:5-22`; `B/Features/Identity/Administration/AdministrationEndpoints.cs:52-55` |
| Access ETag fallback | UI substitutes `"version-1"` if ETag is missing; backend expects a GUID version and rejects missing/invalid or stale versions. Backend normally includes an ETag in user list. | `W/features/admin/pages/UserAccessManagementPage.tsx:84-90`; `B/Features/Identity/Administration/AdministrationEndpoints.cs:45-61,95` |
| Password recovery | UI requests reset email but has no OTP/new-password completion screen, although client method and backend endpoint exist. | `W/features/auth/pages/ForgotPasswordPage.tsx:21-30`; `W/api/auth.ts:104-108`; `B/Features/Identity/Authentication/LocalAuthEndpoints.cs:199-217` |
| Invitation/password change | UI simulates both; backend identity route mappings do not expose matching invitation or authenticated password-change endpoints. | `W/features/auth/api/authApi.ts:61-78,97-103`; `B/Features/Identity/Authentication/LocalAuthEndpoints.cs:14-35`; `B/Features/Identity/Authentication/SessionEndpoints.cs:14-36` |
| Registration policy | Sign-in copy says public registration is closed, while backend exposes anonymous registration; frontend has no registration screen. | `W/app/i18n/locales/en.json:134-135`; `B/Features/Identity/Authentication/LocalAuthEndpoints.cs:16-18,39-65` |
| Profile language | Language preference is local only; profile API persists display name and phone. | `W/features/auth/pages/EditProfilePage.tsx:62-75`; `B/Features/Identity/Profile/UpdateProfileRequest.cs:5-6` |
| Company context | Bar displays one organization and has no switch action; backend session also supplies one organization and has no switch endpoint. | `W/components/CompanyContextBar/CompanyContextBar.tsx:7-46`; `B/Features/Identity/Authentication/SessionUserDto.cs:3-4` |
| Cookie authentication | Client exposes web-login/CSRF methods but does not inject CSRF header for cookie-authenticated mutations. Normal bearer login is a separate path. | `W/api/auth.ts:86-90,110-112`; `W/api/client.ts:197-211`; `B/Features/Identity/Infrastructure/Authentication/MutationAntiforgeryFilter.cs:11-22` |
| Validation errors | Backend validation can return field-level `errors`; frontend error contract/message exposes title/detail rather than those field errors. | `W/api/client.ts:12-29,290-302`; `B/Features/Identity/Common/EndpointValidation.cs:7` |
| Deployment topology | Web uses root-relative API paths and Vite proxy. Backend has no CORS policy found; separate-origin deployment needs configuration. Same-origin/proxy setup is aligned. | `W/api/client.ts:213-217`; `web/grainledger/vite.config.ts:43-60`; `B/Program.cs:101-131` |

## 3. Backend capabilities without functional UI

- **Export orders, containers, blend planning, and dossiers:** frontend routes are placeholders; no matching export/planning client calls found. Backend implements order/container and planning APIs. `W/app/router/routes.tsx:602-764`; `B/Features/Exports/Orders/ExportEndpoints.cs:49-73`; `B/Features/Exports/Planning/BlendPlanningEndpoints.cs:30-70`.
- **Approved plan execution:** route renders placeholder. `W/app/router/routes.tsx:517-527`.
- **Traceback:** web route renders placeholder despite backend trace endpoints. Mobile trace screen uses synthesized lineage instead. `W/app/router/routes.tsx:769-789`; `B/Features/Ledger/Traceability/LotTraceability.cs:16-20,27-58`.
- **Mobile receiving and operation writes:** UI changes local state rather than calling backend receiving measurement/review or operation draft/confirm/commit routes. `M/store/millStore.ts:210-272`; `B/Features/Ledger/Endpoints/LedgerEndpoints.cs:37-48,55-58`.

## Suggested repair order

1. Stop false success and false sync: operation/correction/profile/policy error handling; mobile queue.
2. Remove operational fixtures from live screens: show empty/error states distinctly from real data.
3. Align capture contracts: versions, device IDs, server-assigned codes, real reference IDs, and paginated responses.
4. Fix safety-critical contracts: HOLD, MRL status/limits, lab workflows, and audit claims.
5. Fix admin concurrency/roles, then implement missing export, traceability, and password-recovery workflows.
