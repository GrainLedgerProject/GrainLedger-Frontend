# Frontend feature gap report

## Scope and method

Static comparison of the original `apps/web/src/` with the replacement web application `GrainLedger-Frontend/web/grainledger/src/`, including its routes, page handlers and API clients. Backend source was consulted where needed. Mobile is outside this comparison. No live UI, API, database, or tests were run; findings describe code paths, not observed production behavior. Features can be distributed across different replacement pages; a route, button, or API wrapper alone does not establish functional parity.

Evidence shorthand: **O** = `apps/web/src/`; **N** = `GrainLedger-Frontend/web/grainledger/src/`; **B** = `backend/src/GrainLedger.Api/`. Line numbers describe the inspected snapshots and can move. Existing `GrainLedger-Frontend/UI_API_MISMATCH_REPORT.md` is older; some of its findings have since changed, notably lab-report API integration and blend decision routes. This report uses current source instead.

**Status:** Missing = no equivalent routed workflow found; Partial = some capability exists but material original behavior is absent or incompatible; Unsafe = visible action can present invented data, suppress failures, or construct incorrect operational evidence. Priorities are migration recommendations, not a claim that every feature is used in every deployment.

## Executive summary

**Do not cut over yet.** Missing or incomplete workflows include traceability, export orders and blend proposal authoring, crop-season administration, residue-rule authoring/adoption, export assessment setup, and important capture, receiving, stock, correction and laboratory operations. Several screens look complete but use fabricated values, incomplete requests, or local-only policy changes. These are higher risk than an obvious placeholder.

| Priority | Migration blockers |
|---|---|
| P0 — trust and accounting | Remove fabricated operational evidence and false success; fix receiving, HOLD, processing, corrections, policy persistence and laboratory capture; preserve backend authorization and actual session revocation. |
| P1 — workflow parity | Restore traceability; capture details and custody; export order and blend proposal flows; residue profile and assessment policy/evidence; staff and crop-season setup. |
| P2 — completeness | Restore MRL spreadsheet import, list filters/pagination and other detail-navigation gaps; review old deep links and role access. |

## Identity and administration

| Status | Original capability and replacement gap | Evidence |
|---|---|---|
| Missing | Google sign-in, self-registration, email verification/resend, and completion of password reset. Replacement has email/password sign-in and can request a reset code, but no code/new-password completion screen was found. | O `LocalAuth.tsx:46-104,113-151`; N `features/auth/pages/SignInPage.tsx:84-125,395-408`, `features/auth/pages/ForgotPasswordPage.tsx:20-29`, `api/auth.ts:104-143`. |
| Partial | Original validates the session at startup and supports sign-out of current or all sessions. Replacement restores local auth state, and its header calls local logout; no callers of its server logout/logout-all methods were found. Stale or revoked sessions may remain presented as authenticated until a request fails; local logout does not establish server revocation. | O `App.tsx:49-67,123-135,282-287`; N `app/store/authStore.ts:59-99`, `app/router/ProtectedRoute.tsx:17-33`, `components/AppHeader/AppHeader.tsx:97-100`, `api/auth.ts:76-84`. |
| Missing | Company crop-season administration: create, edit, archive and search. Replacement has API methods but no equivalent routed page found. | O `AdminCropSeasons.tsx:19-72`, `App.tsx:171`; N `api/procurement.ts:200-215`, `app/router/routes.tsx:297-357`. |
| Partial | User/organization management exists, but replacement uses static role choices rather than original backend role list filtered by organization type. Original also blocks changing one's own organization, role or active status in its UI; replacement form lacks that guard. Backend authorization remains authoritative. | O `Administration.tsx:17-25,56-83`; N `features/admin/pages/UserAccessManagementPage.tsx:49-56,78-83,353-435`. |
| Partial | Master-data management exists, but MRL CSV/XLSX import with parsing, validation and preview is replaced by raw JSON entry. MRL lookup failures are converted to empty arrays, obscuring failures; compare version concurrency and pagination before declaring parity. | O `AdminMrl.tsx:3-4,74-113,139-202`; N `features/catalogs/pages/MrlVersionsPage.tsx:76-107,241-259`. |
| Partial | Original administration uses `platform.configure` checks; replacement uses role-based guards for several pages. Audit role/permission mapping against backend rather than assuming the two access models match. | O `AdminWorkspace.tsx:8-20`; N `app/router/routes.tsx:297-357`. |

Replacement also exposes invitation activation and authenticated password-change pages whose API functions currently throw rather than perform those operations. These are not claimed as lost original features: original supports password recovery, not necessarily those new flows. Do not present them as working. Evidence: N `features/auth/api/authApi.ts:57-72,84-91`.

## Field capture and procurement

| Status | Original capability and replacement gap | Evidence |
|---|---|---|
| Missing | Plot-season registration, editing and deletion from the plot workflow. Replacement reads existing plot seasons and defines a create API helper, but no capture page or caller was found. This blocks users from creating records needed by spray and procurement workflows. | O `PlotDetail.tsx:125-132`, `PlotSeasonCreate.tsx:72-93`, `PlotSeasonDetail.tsx:25-37`; N `app/router/routes.tsx:375-435`, `api/procurement.ts:220-243`, `features/field/pages/ProcurementReceiptPage.tsx:186-198`. |
| Unsafe / partial | Spray declaration page lacks usable plot-season selection and uses a random ID when missing; it supplies a fixed evidence reference and can fall back to hard-coded substance data. Original supports selected plot seasons, user-entered evidence, multiple products and declaration details; no replacement detail route found. Backend can reject invalid links; fixed evidence must not be treated as genuine. | O `Spray.tsx:55-124`, `App.tsx:224-229`; N `features/field/pages/PesticideDeclarationPage.tsx:40-76,111-139,395-410`, `app/router/routes.tsx:401-409`; B `Features/Capture/SprayDeclarations/SprayDeclarationEndpoints.cs:19-20,88`. |
| Partial | Sample creation accepts a raw source-lot UUID rather than selecting an accepted source lot. Handover calls an API but replacement does not expose the original custody history and general handover workflow. Preserve actual source-lot and sample links and lab dispatch/acknowledgement semantics. | O `Samples.tsx:32-35,64-123`; N `features/field/pages/FieldSampleRegistrationPage.tsx:127-159,207-250,432-444,490-503`; B `Features/Capture/Samples/SampleEndpoints.cs:110-111`. |
| Unsafe / partial | Procurement submission is API-backed, but form defaults include plausible mass and moisture; missing site, location, commodity or season references can be replaced with random IDs. One receipt line is submitted; original supports multiple plot-season lines and checks line limits. Farmer filtering can fall back to unrelated seasons. | O `ProcurementForm.tsx:31,83-89,128-133`; N `features/field/pages/ProcurementReceiptPage.tsx:95-100,436-479,499-568`; B `Features/Capture/Procurement/ProcurementEndpoints.cs:18-25,44-46`. |
| Partial | Farmer and plot API writes exist, but replacement creates a fresh operation ID on each submit. Original retains an uncertain request for replay with the same ID, avoiding a new attempt after ambiguous network failure. Replacement plot capture also lacks original's interactive map and device-location workflow. | O `FarmerCreate.tsx:68-86`, `PlotCreate.tsx:93-115,122-145`; N `features/field/pages/FarmerRegistrationPage.tsx:199-212`, `features/field/pages/PlotRegistrationPage.tsx:180-229,657-659`. |

## Ledger: receiving, inventory and operations

| Status | Original capability and replacement gap | Evidence |
|---|---|---|
| Unsafe | Receiving supports per-procurement-item measurement, measurement history, threshold preview, and reviewed decisions. Replacement submits the selected task ID as `procurementItemId`, uses a random measurement-set ID if missing, and inserts a fixed 0.5% explanation. It does not expose the same filtering/pagination and review context. Use actual item and measurement IDs and server-provided thresholds and outcomes. | O `LedgerReceiving.tsx:58-127,202-269`; N `features/mill/pages/ReceivingTasksPage.tsx:62-75,159-183,209-246`. |
| Partial | Inventory has scoped filters and pagination, positions and lineage, lot and ledger history, transfers, HOLDs and notifications. Replacement stock view has a narrower lot query and derives KPIs from the fetched page; separate history/HOLD screens do not restore all stock actions and context. Do not label page-local totals as full inventory totals. | O `LedgerStock.tsx:13-128`; N `features/mill/pages/StockOverviewPage.tsx:52-76,128-143`, `api/ledger.ts:179-200,234-267`. |
| Unsafe | Original HOLD workflow selects a real lot and supports responses and isolation transfer without implicit release. Replacement constructs HOLD creation with a random lot UUID and shows active-looking statuses; its response action is not an isolation transfer. It also converts list failures into an empty list. | O `LedgerStock.tsx:74,111-128`; N `features/risk/pages/HoldManagementPage.tsx:35-40,44-62,75-82,106-120,144-154,308-360`. |
| Partial | Original processing includes draft/review, correction-bound replacement and commit workflows. Replacement has operation entry and API calls, but uses process-type hard-coded tolerances and does not provide the same draft/review lifecycle. | O `LedgerOperations.tsx:52-59,93-110,262-280`; N `features/mill/pages/OperationEntryPage.tsx:154-166,376-416,468-515`. |
| Partial | Original corrections reconcile actual output positions and evidence, then bind and commit a replacement operation. Replacement displays correction actions but lacks the necessary physical-position, evidence and replacement inputs; relevant controls are disabled. | O `LedgerOperations.tsx:320-379`; N `features/mill/pages/CorrectionManagementPage.tsx:290-421,1118-1178`. |
| Missing | Traceability: lot or lab-result start, forward/backward and current/history views, complete-result checks, graph/table, source lineage and evidence. Replacement `/risk/traceback` is a placeholder, although API methods exist. | O `LedgerTraceability.tsx:27-139`; N `app/router/routes.tsx:742-762`, `api/ledger.ts:339-357`; B `Features/Ledger/Traceability/LotTraceability.cs:16-36`. |
| Partial / unsafe | Facility, location and equipment screens exist, but staff-to-facility assignment and mixed-bulk policy workflows are absent from the setup page. Balance policy and compatibility screen initializes and reloads fixed rules; some write errors are ignored and deletion is local-only. Restore persisted, evidence-backed setup, assignments and clearance as supported by original. | O `LedgerSetup.tsx:17-124`; N `features/admin/pages/FacilityConfigPage.tsx:72-82,145-169`, `features/admin/pages/BalancePolicyPage.tsx:42-119,144-189,192-251`; N `api/ledger.ts:120-141`. |

## Laboratory, residue and MRL

| Status | Original capability and replacement gap | Evidence |
|---|---|---|
| Unsafe / partial | Replacement can read and submit lab reports, but its create form starts with example laboratory, substance, numeric result and conclusion; generates sample/seal references and a file name; submits no file content; and creates only one result. Confirmation starts with review checks selected and submits an empty match list. Original supports real result sets and user-reviewed sample matching, report identity/transcription confirmation, evidence review and trace/source navigation. Backend validation may reject some requests; do not assume acceptance or persisted fabricated data without runtime proof. | O `LabReports.tsx:326-401,596-679`; N `features/compliance/pages/MrlComplianceCheckPage.tsx:91-116,237-356`; N `api/compliance.ts:31-72`. |
| Partial | Replacement residue profiles page actually reads profiles and can retire an eligible profile. Missing original scientific rule create/edit/clone/publish and company policy adoption/override and reviewed history workflows. | O `ResidueRuleMaintenance.tsx:92-157`, `CompanyResiduePolicies.tsx:13-32,68-120`; N `features/compliance/pages/ResidueProfilesPage.tsx:34-110`. |
| Missing / unsafe | Original export assessment screen manages market assessment policy and finished-lot measured-quality evidence. Replacement safety-margin page uses hard-coded substance and threshold data, not equivalent persisted policy/evidence setup. Do not treat its figures as authoritative or lab confirmation as market certification. | O `ExportAssessment.tsx:25-138`; N `features/compliance/pages/SafetyMarginPolicyPage.tsx:22-80`; B `Features/Catalogs/BlendAssessment/BlendAssessmentPolicies.cs:75-77`. |
| Partial | MRL version management is present, including draft, limit and publish controls, but spreadsheet import and robust failure visibility are missing as noted above. API calls and displayed version status also need contract/concurrency verification before cutover. | O `AdminMrl.tsx:117-202`; N `features/catalogs/pages/MrlVersionsPage.tsx:88-107,133-259`. |

## Exports and planning

| Status | Original capability and replacement gap | Evidence |
|---|---|---|
| Missing | Export order search, create/edit, detail and specifications/version history, and container targets. Replacement `/export/orders` is a placeholder even though client methods exist. | O `ExportOrders.tsx:163-270`; N `app/router/routes.tsx:587-601`, `api/exports.ts:5-45`. |
| Partial | Original blend workspace selects eligible stock, previews assessment, submits proposals and inspects findings/lineage. Replacement blend-plan request is a placeholder. Its **routed** decision page is API-backed and supports viewing/approving/rejecting/revoking existing proposals; it does not provide proposal authoring. Do not confuse the separate seeded `BlendPlansPendingPage` file with the actual current route. | O `BlendPlanning.tsx:62-120,286-405,422-457`; N `app/router/routes.tsx:604-653`, `features/export/pages/BlendPlanDecisionsPage.tsx:30-84,106-155`. |
| Placeholder; not necessarily regression | Replacement also advertises approved-plan execution, container loading/closure and dossiers as placeholders. Route descriptions are not proof that original UI or backend already implement those workflows; assess separately against approved scope rather than counting them as original parity failures. | N `app/router/routes.tsx:494-507,656-739`; see `docs/plans/container-loading-plan.md`. |

## Cross-cutting migration checks

1. **Do not substitute examples for live state.** Empty, failed and unavailable data must remain distinct. Remove generated lot/sample identifiers, fixed operational values, and success messages after failed writes; retain actual backend validation and conflict handling.
2. **Port end-to-end journeys, not just screens:** farmer → plot → season → procurement → source lot → receiving → stock → processing → sample/lab → trace → export. Preserve permission and owner/facility scope, version/ETag concurrency, immutable history, and exact decimal mass strings.
3. **Navigation and authorization:** original uses `/capture/...`, `/ledger/...`, `/lab-reports`, `/residue-policies` and other URLs (O `App.tsx:20-34,78-80`); replacement uses a different route tree. No old-path aliases were found in its route definitions. Assess bookmarks and links for an explicit redirect/migration policy, and test each original role against backend permissions.
4. **Acceptance:** compare original and replacement using isolated test data and the same role and backend; exercise successful writes, rejected writes, stale-version conflicts, empty/error states and cross-screen navigation. Do not run migrations or write-based smoke tests on shared Supabase without approval.

## Follow-up order

1. Fix false operational data, unsafe request construction, suppressed failures and server session handling.
2. Restore capture/receiving, stock, corrections and traceability end to end, including scope and exact mass.
3. Restore actual laboratory evidence capture, residue authoring/adoption, assessment policies and quality evidence.
4. Restore export order and blend proposal workflows; retain the working server-backed decision screen.
5. Complete administration, MRL file import, navigation and role parity; validate each journey with isolated backend data.
