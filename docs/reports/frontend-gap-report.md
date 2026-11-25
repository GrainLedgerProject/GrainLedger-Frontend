# UI functionality gap report

## Scope and method

Static comparison of the original web UI (`~/github/GrainLedger/apps/web/src/`) with the current web UI (`web/grainledger/src/`). Functionality, not layout, is compared. Backend source (`~/github/GrainLedger/backend/src/GrainLedger.Api/`) was consulted where useful. No live UI, API, or tests were run. Findings describe inspected source paths, not observed production behavior.

Evidence shorthand: **Old** = original web UI source; **Current** = current web UI source; **Backend** = backend API source. Line numbers describe inspected snapshots and may change.

**Priority:** Fix spray capture, receiving, session revocation, and simulated policy screens first. Then restore missing residue/assessment workflows, custody and trace detail, and planning controls.

## Identity and administration

| Gap | Impact | Evidence |
|---|---|---|
| **Google sign-in missing** | Current sign-in offers email/password only. Backend still exposes Google auth. | Old `LocalAuth.tsx:113-123`; Current `features/auth/pages/SignInPage.tsx:85-115`; Backend `Features/Identity/Authentication/SessionEndpoints.cs:23-33` |
| **Server-side logout missing** | Current header clears local session without calling server logout. Old UI revoked current session. | Old `App.tsx:123-135`; Current `app/layout/AppHeader.tsx:97-101`, `app/store/authStore.ts:150-178`, `api/auth.ts:76-79` |
| **Sign out on all devices missing** | Old profile revoked all sessions; current API wrapper has no UI caller. | Old `App.tsx:267-287`; Current `api/auth.ts:81-84` |
| **Role choices not filtered by organization type** | Current editor permits combinations backend rejects. | Old `Administration.tsx:76-83`; Current `features/admin/pages/UserAccessManagementPage.tsx:353-395` |
| **Crop-season sorting missing** | Current season management retains search, pagination and CRUD, but not old name/date ascending/descending controls. | Old `AdminCropSeasons.tsx:29-36,64-66`; Current `features/field/pages/CropSeasonsPage.tsx:55-69` |

**Retained:** Email registration and verification, password-reset completion, user and organization management, general catalogs, and crop-season CRUD.

## Field capture and procurement

| Gap | Impact | Evidence |
|---|---|---|
| **Spray capture has no plot-season selector** | Submit substitutes random plot-season UUID and fixed evidence reference. Backend requires existing plot-season; valid capture cannot be constructed through this form. Old UI also supported multiple products and declaration details. | Old `Spray.tsx:28-52,55-130`; Current `features/field/pages/PesticideDeclarationPage.tsx:39-45,86-104,315-377`; Backend `Features/Capture/SprayDeclarations/SprayDeclarationEndpoints.cs:87-90,206` |
| **Spray detail and list context incomplete** | Current list shows first item without old declaration-detail workflow. | Old `Spray.tsx:117-130`; Current `features/field/pages/PesticideDeclarationPage.tsx:247-283` |
| **Sample custody incomplete** | Current capture requires manually entered source-lot UUID and supports lab dispatch, but lacks old sample detail, custody history, general handover and lab acknowledgement. | Old `Samples.tsx:14-29,64-125`; Current `features/field/pages/FieldSampleRegistrationPage.tsx:127-266,432-504` |
| **Receipt and source-lot detail missing** | Current receipt list has no detail action. Old flow opened receipt and source-lot details and linked samples. | Old `Procurement.tsx:61-99`; Current `features/field/pages/ProcurementReceiptPage.tsx:799-909`, `features/field/paths.ts` |
| **Farmer and plot duplicate warnings missing** | Old capture checked likely duplicate farmers and nearby plots before creation. Backend endpoints remain available. | Old `FarmerCreate.tsx:58,100`, `PlotCreate.tsx:65-66,141`; Current `features/field/pages/FarmerRegistrationPage.tsx:174-242`, `PlotRegistrationPage.tsx:182-237` |
| **Related-record navigation incomplete** | Old farmer detail linked plots; plot detail linked plot seasons and spray records. Current manages these separately without equivalent contextual navigation. | Old `Farmers.tsx:125-133`, `PlotDetail.tsx:90-132`; Current `features/field/pages/CropSeasonsPage.tsx:140-165` |
| **Safe retry coverage narrower** | Old farmer, plot, spray and sample capture retained pending requests for retry. Current offline queue is procurement-specific; other inspected forms submit directly. This is a retry parity gap, not proof that old UI supported full offline operation. | Old `FarmerCreate.tsx:68-86`, `PlotCreate.tsx:93-119`, `Spray.tsx:83-98`, `Samples.tsx:48-56`; Current `features/field/pages/OfflineSyncQueuePage.tsx:11,33-47` |

**Retained:** Farmer and plot CRUD, map/GPS selection, crop-season and plot-season management, receipt capture/listing, and procurement sync queue.

## Ledger, receiving and stock

| Gap | Impact | Evidence |
|---|---|---|
| **Receiving measurement uses wrong identifier** | Current request sends task ID as `procurementItemId`, one measurement line, zero tare and net equal to entered weight. Old flow measured individual procurement lines. | Old `LedgerReceiving.tsx:202-265`; Current `features/mill/pages/ReceivingTasksPage.tsx:159-183` |
| **Receiving review context incomplete** | Current review can generate measurement-set UUID when missing and supplies fixed decision text, including a 0.5% explanation. Old UI exposed threshold-aware review, measurement history and shortage/remeasurement decisions. | Old `LedgerReceiving.tsx:202-269`; Current `features/mill/pages/ReceivingTasksPage.tsx:209-246` |
| **Receiving queue controls missing** | Old queue supported facility scope, search, status/owner filters, sorting and pagination. Current loader requests tasks without those controls. | Old `LedgerReceiving.tsx:109-120,212-218`; Current `features/mill/pages/ReceivingTasksPage.tsx:62-75` |
| **Processing lifecycle incomplete** | Current operation entry covers basic input and mass balance. Old workspace supported multi-input allocations, multiple outputs, merge, editable drafts, variance review and commit queues. | Old `LedgerOperations.tsx:52-60,100-120,140-280`; Current `features/mill/pages/OperationEntryPage.tsx:109-215` |
| **Correction reconciliation incomplete** | Current correction screens do not provide all old physical-position, evidence and replacement-operation inputs. | Old `LedgerOperations.tsx:320-379`; Current `features/mill/pages/CorrectionManagementPage.tsx:290-421,1118-1178` |
| **Stock filtering and context reduced** | Old stock workspace supported owner/facility/location filters, positions, restrictions, lineage, residue bounds and history. Current overview has narrower stage/search filtering; separate screens cover some, but not all, context. | Old `LedgerStock.tsx:14-98,112-129`; Current `features/mill/pages/StockOverviewPage.tsx:52-76,257-316` |
| **Stock totals limited to loaded page** | Current overview calculates KPIs from fetched rows, not necessarily entire inventory. | Current `features/mill/pages/StockOverviewPage.tsx:52-60,128-143` |
| **Facility assignments and mixed-bulk setup missing** | Current facility setup covers facilities, locations and equipment, but not old staff-to-facility assignment or mixed-bulk compatibility configuration. Backend management endpoints exist. | Old `LedgerSetup.tsx:80-85,103-116`; Current `features/admin/hooks/useFacilityConfig.ts:8-24`; Backend `Features/Ledger/Endpoints/LedgerManagementEndpoints.cs:23-49` |
| **Balance/compatibility policy persistence unreliable** | Current page initializes fixed rules, suppresses some write failures and deletes compatibility rules locally. Old setup used scoped, versioned policy records. | Old `LedgerSetup.tsx:96-119`; Current `features/admin/pages/BalancePolicyPage.tsx:42-119,165-178,192-251` |

## Traceability

**Core trace is present:** Current UI supports lot selection, forward/backward and current/history views, relationships and source contributions. Traceability is not wholly missing.

| Gap | Impact | Evidence |
|---|---|---|
| **Detailed lot trace incomplete** | Old trace included lab-result entry, expanded farmer/plot/season/procurement provenance, correction references, residue evidence and actual container/loading edges. Current trace does not expose all those paths. | Old `LedgerTraceability.tsx:35-42,96-149`; Current `features/risk/pages/TraceabilityPage.tsx:400-429,524-679`; Backend `Features/Ledger/Traceability/LotTraceability.cs:53-59,77-123` |
| **Container source trace incomplete** | Current container trace shows contributions and basic ancestry, but not old detailed actual-loading/history view or interactive flowchart. | Old `ContainerSourceTrace.tsx:12-32`; Current `features/risk/pages/ContainerTracePage.tsx:51-76`, `api/containerExecution.ts:192-206` |
| **Residue-bound evaluation UI missing** | Old stock, trace and container workflows exposed residue preview plus saved evaluation history/detail/create. Current API wrappers exist, but no UI caller found. | Old `ResidueBounds.tsx:57-124`, `LedgerStock.tsx:72`, `LedgerTraceability.tsx:143-146`; Current `api/ledger.ts:448-464` |

## Laboratory, residue and MRL

| Gap | Impact | Evidence |
|---|---|---|
| **Residue-rule authoring and publication missing** | Current profiles page lists and retires profiles, but lacks old create/revise/publish workflow for reviewed scientific rules and processing factors. Backend supports rule creation. | Old `ResidueRuleMaintenance.tsx:92-110,127-204`; Current `features/compliance/pages/ResidueProfilesPage.tsx:54-86`, `api/residue.ts:18-33`; Backend `Features/Catalogs/ResidueRules/ResidueRules.cs:94,207` |
| **Lab-result residue review incomplete** | Current evidence page supports fallback groups, previews, supersession and publication, but no equivalent interactive report-result binding review and confirmation was found. Client exposes review endpoints. | Old `ResidueEvidenceControls.tsx:53-76,100-182`; Current `features/compliance/pages/ResidueEvidencePage.tsx:17-81`, `api/residue.ts:73-89` |
| **MRL spreadsheet import missing** | Old UI accepted CSV/XLSX, previewed groups, mapped market/commodity and reviewed excluded rows. Current import accepts pasted JSON. | Old `AdminMrl.tsx:139-173,220-243`; Current `features/catalogs/components/MrlVersionImport.tsx:33-65`, `features/catalogs/model/mrlImport.ts:1-23` |
| **Export assessment setup missing** | Old UI published reviewed market assessment policies and recorded finished-lot quality observations. Current has API wrappers but no equivalent page caller found. | Old `ExportAssessment.tsx:44-75,96-138`; Current `api/planning.ts:65-105` |
| **Safety-margin screen is not assessment replacement** | Screen uses hardcoded data and save displays local success rather than persisting old assessment policy. | Current `features/compliance/pages/SafetyMarginPolicyPage.tsx:264-342` |

**Retained:** Core lab-report capture supports original files, multiple sample sections, structured results and CSV/TSV import. Company residue-policy adoption, MRL lookup/version management and receiving-loss percentage thresholds also exist.

## Exports, blend planning and containers

| Gap | Impact | Evidence |
|---|---|---|
| **Blend candidate investigation reduced** | Old planner listed candidates, filters for excluded/other-product stock and candidate lineage. Current planner fetches candidates but inspected UI presents count and preview without equivalent controls. | Old `BlendPlanning.tsx:418-425,484-508,587-596`; Current `features/export/pages/BlendPlanRequestPage.tsx:535-543,575-623` |
| **Manual blend adjustment and optimization controls missing** | Old planner allowed ratio changes and reassessment plus objectives such as minimizing locations/lots or retaining quality and residue headroom. | Old `BlendPlanning.tsx:71-130,509-529,597-637`; Current `features/export/pages/BlendPlanRequestPage.tsx:545-551` |
| **Assessment diagnostics reduced** | Current preview shows allocations and basic findings, but not old solver/calculation steps, excluded inputs and detailed optimization diagnostics. | Old `BlendPlanning.tsx:29-58,244-256,612-637`; Current `features/export/pages/BlendPlanRequestPage.tsx:626-759` |

**Retained:** Export order management, blend draft/proposal and decisions, container readiness, actual loading and closure, production, workflow handoffs/reviews, and dossier/document handling have current counterparts. Different route or layout alone is not a gap.

## Recommended order

1. Fix invalid spray and receiving requests; restore server-side logout and all-device revocation.
2. Replace simulated or locally successful policy actions with persisted workflows.
3. Restore residue-rule authoring, report-result review, bounds and export assessment.
4. Complete procurement/source-lot detail, custody history, ledger correction and trace detail.
5. Restore blend investigation/adjustment, MRL spreadsheet import and remaining list controls.
