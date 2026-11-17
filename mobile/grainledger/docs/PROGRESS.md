# Migration progress

Updated: 2026-11-17.

## Current task — Phase 9 / Compliance: requested 5.2–5.6 batch

The user explicitly authorized continuing 5.2, 5.3, 5.4, 5.5 and 5.6 together, superseding the earlier one-screen stop for this batch. Implemented sample capture/handover, report reads/results, report create/edit with attachment, confirm/delete/authenticated file viewing. Delivered the source safety simulator with an explicit unavailable-policy state; real policy read/save in 5.6 remains blocked by the missing API contract. STOP; no residue/5.7 work.

### Phase, last implementation and source decisions

- Current phase: 9. Previous completed code: 5.1 lab sample list/detail/history. Reused those reads rather than rebuilding them. Requested tasks started at 5.2; current unfinished requirement is 5.6 real policy persistence, not another feature.
- Reread PROJECT_CONTEXT, PROGRESS, API_MAPPING, MIGRATION_PLAN, relevant DESIGN_SYSTEM contracts and focused web `LabSampleRegistrationPage`, `MrlComplianceCheckPage`, `SafetyMarginPolicyPage`, `api/compliance.ts`, route roles and relevant dashboard shortcut. Focused API search found no safety-margin persistence wrapper; web Save only sets a local message/timer.
- Access preserved: sample/report screens and all services active CUSTOMER_MANAGER only; safety active CUSTOMER_MANAGER or MILL_ADMIN. Backend company/grants/transitions remain authoritative. No new permission name or full-stack CM restriction. Home entries and canonical safe login returns include only the newly mounted destinations.

| Task | Delivered implementation | Open acceptance / boundary |
| --- | --- | --- |
| 5.2 | Register at `/compliance/lab-samples/new` or list action; hand over from sample detail; real POSTs | Live chain-of-custody/backend data and native form acceptance |
| 5.3 | `/compliance/lab-results` and addressable `/:id`, source local search/status/KPIs/paging, all result sets/results and returned MRL assessment | Deployed DTO/company scope and device navigation |
| 5.4 | Report create/edit, actual system-picked file, multiple result sets/tests, JSON/base64 POST/PUT | Backend file retention/replacement and update identity behavior; source has no edit consumer |
| 5.5 | Explicit report checks/as-received confirmation, typed-number delete confirmation, bearer GET file + native preview | Allowed backend transitions and delete envelope version; source has no delete consumer |
| 5.6 | CM/Admin safety screen, historical source demo data/formula/market/substance/buffer selections, unavailable server-policy state | No real read/save/version/effective-date API identified. Persistence remains incomplete; no success or applied-policy claim |

### Source contracts and delivered behavior

- Sample capture POST `/api/samples`: source v2, stable mobile app device marker, separate clientOperationId/entityId, capturedAt = collectedAt, code null, required trimmed seal/sourceLot, optional trimmed description/null. No generated sample code or proof-of-seal assertion. Server-accepted success and subsequent list reload failure remain separate.
- Handover POST `/api/samples/{id}/handovers`: source v1, separate IDs, handedOverAt = capturedAt, required trimmed from/to/lab, `LAB_DISPATCH`, trimmed evidence/null and source empty-seal fallback `Nguyên vẹn`. Form visibly asks to verify the actual seal condition and explains that fallback. User name is an editable sender suggestion; no hardcoded representative/lab is silently treated as fact. Success reloads actual list/history; no optimistic handover increment/custody change.
- Reports GET list uses page/pageSize 20 and explicit hasMore only; array/items contracts validated. Search on report number/lab/standard/conclusion and status/KPIs remain loaded-page only. Preserved source alias differences (KPI COMPLIANT includes CONFORMING; filter omits it; PENDING filter includes REJECTED while KPI uses confirmation state). Do not normalize those into new business policy without instruction.
- GET `/api/lab-reports/{id}` checks matching identity and strict nested DTOs. Exposes all result-set sample/confirmed-sample/lot identity evidence, original/result-kind/numeric/null values, units/LOD/LOQ/method/uncertainty/references, report relations/replacement, optional residue bindings and returned assessment reasons/market. No fixed MRL threshold, EC standard fallback, fabricated numeric zero or export permission is inferred.
- Create POST and update PUT use source CaptureLabReportRequest v2 JSON, not multipart. Form transcribes actual lab/report/date/kind/conclusion/standard, optional relationships and sample references, multiple sets/tests, and company-only acknowledgment. No source-generated random seal/sample/lab reference, invented PDF filename or prefilled positive conclusion. Preserve report/set identities and receivedAt when editing; original result text stays verbatim. New entity/set/client-operation IDs are UUIDs. Unknown result-kind/decimal text remains server-validated rather than translated into guessed enums/policy.
- Actual file selection through SDK 58 DocumentPicker, copy-to-cache, byte-size check and File.base64; sends fileName/contentType/contentBase64 in the source JSON payload. No fictitious attachment. App-only 10 MiB budget bounds base64 work; this is not a backend/legal limit. Cancelled picker keeps the existing selection. Selected copy is removed best effort after read; original user file is never deleted. Base64 remains form/request memory only, not URL/log/storage.
- With no replacement on edit, existing fileName/contentType are retained and contentBase64 null. This is an unverified PUT semantic (wrapper only); UI asks to verify attachment after saving. companyOnlyConfirmed is not returned by source DTO, so edit requires a fresh explicit acknowledgment rather than guessing stored value.
- Confirm POST `/{id}/confirm`, source v1, explicit identity and transcription checks (start unchecked), matches [] exactly as source and optional asReceivedConfirmed. Hide confirmation if confirmedAt is non-null or status CONFIRMED. Acknowledgment reloads actual report/assessment and does not manufacture MRL success.
- Delete DELETE `/{id}` uses the source DeleteLabReportRequest shape, mobile marker/clientOperationId/capturedAt/payloadSchemaVersion 1, no body payload/expectedVersion. IMPORTANT: source has a typed wrapper but no routed delete consumer, so v1 is a new native-consumer assumption requiring deployed verification. Source update/delete do not expose allowed-status or version contracts; no invented local status allowlist or optimistic deletion is applied. Backend rejection is shown. Delete requires retyping report number (or ID when number empty); accepted deletion is shown separately from navigation.
- File GET `/{id}/file` uses shared authenticated blob transport, never a public/raw backend URL with bearer query. Native preview uses SDK 58 File.canPreview/File.preview (Quick Look / Android viewer); no browser-only window download path on native. App-cache filenames are sanitized/random. Temporary previews are cleaned best effort when screen/auth scope exits; OS cache can survive an abrupt process termination. Web gets an object-URL download. No hash verification is claimed; displayed SHA-256 is labeled API evidence.
- Scoped mutation controller coalesces duplicate submits, retains unchanged-retry IDs/timestamps, resets on exit/identity change, aborts/stale-suppresses, blocks post-acknowledgment resubmit, and separates acknowledgment from GET reload. No domain auto-retry/offline queue/cache/new auth interceptor. Existing bounded 401 refresh replays identical JSON. 403/404/409/412/400/422, configuration, malformed and uncertain network failures remain explicit, with values retained and close/reload guidance.
- Shared Glass HIG components: neutral grouped light/dark, restrained green actions, functional destructive red, labeled wrapping inputs, keyboard avoidance, native sheets with busy dismissal protection, VI/EN and virtualized lists/results. Existing 5.1 reads, other feature flows and shared theme were preserved.

### 5.6 contract gap (not a persisted policy implementation)

- Source has no policy HTTP call, response version, effective date or save request. The backend contract cannot be inferred from the local web success message. Mobile displays this gap and disables server Save; there is no invented endpoint, local “saved” toast or claim of immediate blend effects.
- Ported all five substances × six markets as explicitly historical demonstration data, buffer choices 10/15/20/25/30, default 20, concentration input, threshold table/upper95 reference and formula explanation. Decimal arithmetic preserves `limit × (1 − buffer / 100)` and inclusive pass/warning boundaries; no actual HOLD, shipment decision or current-regulation assertion. Simulation resets on session replacement and is not stored.
- Required follow-up to finish 5.6: provide/confirm actual policy GET/write routes, DTO, company/market scope, versions/effective-date concurrency, validation and permissions. Connect those to the screen and remove unavailable-policy state only after contract verification. Do not begin 5.7 automatically.

### Files, dependencies and validation

- Added feature modules: `sample-commands.ts`, `compliance-actions.ts`, `compliance-ui.tsx`, `SampleEditor.tsx`, `lab-reports-api.ts`, `report-commands.ts`, `report-files.ts`, `ReportEditor.tsx`, `ReportActionSheet.tsx`, `LabReportsScreen.tsx`, `LabReportDetailScreen.tsx`, `safety-margin-model.ts`, `SafetyMarginScreen.tsx`.
- Extended existing sample list/detail; added routes sample `/new`, report list/`[id]`, safety; added `navigation/compliance-route.ts`, auth safe returns, Home entries. Added `scripts/check-compliance-workflows.cjs`, adjusted old read test's allowlist expectation and updated four handoff docs.
- Installed via `npx expo install`: `expo-document-picker ~58.0.5`, direct `expo-file-system ~58.0.13` (already transitively present). package.json/lock updated; no native directories or app configuration changes. Existing custom development clients must include these SDK-compatible native modules; Expo Go supplies bundled versions.
- `node scripts/check-compliance-workflows.cjs`: PASS, 17 groups (all roles, payloads/IDs, source filters/nullable DTOs, attachment bytes/limit, update/delete/confirm, duplicate/retry/races/errors, actual bearer JSON/blob and identical 401 replay, canonical returns, Decimal boundaries and mocked picker/preview cleanup). Tests do not use live accounts or external viewers.
- Existing lab sample reads (10), auth (15), dashboard (10), navigation and theme (62, minimum text contrast 4.77:1): PASS.
- Final `npx --no-install tsc --noEmit` and `npx --no-install expo lint`: PASS without warnings. Android/iOS eager actual-route bundles: HTTP 200 and include sample editor, reports/editor and safety screen. `git diff --check` on affected tracked files: PASS (existing CRLF normalization notices only). Stopped only the task-owned Metro on port8095; confirmed no remaining listener there. Existing services left untouched.

### Remaining acceptance and stop

- `.env.local` exists but no supplied disposable test account; no live sample/report mutation or file transfer performed. Validate deployed DTOs/grants/tenant scope, write schema versions, update/delete transitions, file null/retention/replacement semantics, result-set identity and actual post-confirm assessment with disposable data. PUT/DELETE have no source expectedVersion: backend concurrency policy remains unverified.
- Physical iOS/Android keyboard, modal close/Back, large text, VoiceOver/TalkBack, narrow/landscape, theme, login/deep links, document provider/cancel/oversize, no-viewer/file permission, timeout/retry and logout during actions remain manual acceptance. Native APIs are compiled and mocked, not device-verified.
- Current open implementation is real policy integration in 5.6, awaiting its API contract. STOP after this authorized batch. Residue profiles/5.7+, other feature groups and prior acceptance blockers are untouched.

## Previous task handoff — 5.1 Danh sách và chi tiết mẫu lab

Implemented ONLY the first unfinished Compliance screen, `/compliance/lab-samples`: list, page-local search/filter, paging and a selected-sample detail sheet with read-only handover history. STOP before 5.2 registration and handover writes. Other feature implementations are preserved.

### Phase, source inventory and next boundary

- Current phase: 9. Last completed implementation: Mill 4.4 receiving measurement. This requested group had no mobile screen; 5.1 was its first unfinished task. The next implementation in this group is 5.2, only on a new instruction.
- Read PROJECT_CONTEXT, MIGRATION_PLAN, PROGRESS, API_MAPPING and relevant DESIGN_SYSTEM contracts. Focused source: `LabSampleRegistrationPage.tsx`, sample/handovers wrappers in `api/compliance.ts`, route roles; other requested pages inspected only at API/permission/save anchors for the inventory below.

| Requested screen | Source dependencies / access | Scope here |
| --- | --- | --- |
| `/compliance/lab-samples` | GET `/api/samples`; GET `/api/samples/{id}/handovers`; CUSTOMER_MANAGER only | Implemented list/detail/history reads |
| `/compliance/lab-samples/new`, sample handover | POST samples (capture v2), POST sample handovers (v1); CUSTOMER_MANAGER | 5.2 deferred |
| `/compliance/lab-results`, report detail | labReports list/detail/create/update/delete/confirm/file wrappers; CUSTOMER_MANAGER | 5.3–5.5 deferred; includes source MRL assessment workflow |
| `/compliance/residue-profiles` | residue rules list/detail/retire; authenticated route. Global retirement requires `residue.policy.manage`; company retirement requires same organization and `residue.company-policy.manage` | 5.7–5.9 deferred |
| `/compliance/safety-margin` | CUSTOMER_MANAGER or MILL_ADMIN; source save handler only sets a local success message/timer, no policy API | 5.6 deferred; real persistence contract missing |

### Implemented behavior and technical decisions

- Active CUSTOMER_MANAGER only, matching the web route; Admin and the other five roles are denied before any sample/history request. Backend grants and company scope remain authoritative. Home has a CM-only entry and safe login return permits only the exact list URL. The common authenticated Compliance stack does not impose CM on future screens with different source roles.
- Real authenticated GET `/api/samples` with `{page,pageSize:20}`. Arrays and `{items,hasMore?}` are accepted; absent hasMore means false, as in source. No invented total-count or next-page inference. Optional page echo, duplicate rows and malformed DTOs are checked; malformed data is an error, never a successful empty list.
- Source search semantics retained: trimmed/lowercase code, sealCode, sourceLotId and materialDescription on the loaded page only. Native submits search explicitly. Filters are ALL, handoverCount > 0 and handoverCount === 0; KPIs use all loaded rows before filtering. Labels describe recorded handovers rather than asserting physical warehouse custody. Search/status persist across page changes, matching source behavior.
- Detail uses the selected list snapshot and GET handover history, matching the source page; no separate sample-detail endpoint consumer or ID route was invented. Preserve history order, nullable fields, optional evidence/lab references and id-less records. References are selectable text, not unauthenticated file/URL actions. Missing seal condition/lab fields remain unknown; no fabricated intact seal, verification or MRL pass.
- Shared Glass components and existing HIG theme: grouped neutral light/dark surfaces, green selected filters/actions, wrapping text, large title, labeled search, accessible buttons/status messages, virtualized lists, native dismissible detail sheet and VI/EN. No theme redesign or new dependency.
- List/history separately distinguish loading, successful data, successful empty, filter-empty, denied, contract and connection errors; explicit retry and pull refresh. Requests abort/stale-suppress on page, selected sample, sheet close or auth scope changes; token rotation alone keeps the same owner. Reuses shared authenticated transport and bounded 401 handling; no new interceptor, cache, offline queue, mutation or domain auto-retry.

### Changed files and validation

- New `src/features/compliance/lab-samples-api.ts`, `LabSamplesScreen.tsx`, `LabSampleDetail.tsx`; `src/app/compliance/_layout.tsx` and `lab-samples/index.tsx`.
- Updated root Stack, auth safe return and dashboard entry. Added `scripts/check-lab-samples.cjs`; updated these handoff docs and the 5.1 plan entry.
- `node scripts/check-lab-samples.cjs`: PASS, 10 groups covering seven-role access/no unauthorized reads, array/envelope contracts, local filters/KPIs, nullable history/order, exact GET/query/ID contract, failures, auth/abort/races, actual Axios bearer transport and exact safe login return.
- Existing auth (15), dashboard (10), navigation and theme (62 contrast checks, minimum 4.77:1): PASS.
- `npx --no-install tsc --noEmit`: PASS. `npx --no-install expo lint`: PASS, no warnings. `git diff --check` on affected tracked files: PASS (existing Dashboard CRLF normalization notice only).
- Android/iOS eager actual-route bundles: HTTP 200; list, detail and `/compliance/lab-samples` included. Compilation is not device interaction acceptance. Used and stopped only task-owned temporary Metro on port 8094.

### Known blockers and follow-up acceptance

- `.env.local` exists but no disposable authenticated account was supplied. No live sample reads/writes were exercised. Real company scope, grants, deployed DTOs and hasMore metadata remain unverified; fixture transport passes do not establish backend acceptance.
- Physical iOS/Android sheet dismissal/Back, keyboard/search, light/dark, large text, VoiceOver/TalkBack, login return/direct navigation, paging/filter and account changes need device acceptance. No native visual/device pass claimed.
- 5.2 must preserve separate sample entity/client-operation IDs, capture v2 and handover v1 contracts. Registration and recording a handover are incomplete; no controls or routes falsely advertise them here. Reports/files/confirmation, MRL assessment, residue policies and safety configuration are untouched.
- Source safety-margin save is UI-only and cannot establish persisted policy or immediate blend effects. Confirm a real policy API before migrating persistence; do not promote demonstration limits/messages into backend rules.
- STOP here. Continue only the next explicitly requested task; previous feature live/native blockers remain open.

## Previous task handoff — Vận hành nhà máy: 4.4 Ghi số đo tiếp nhận

Implemented only the first unfinished Mill subfeature: measurement entry inside existing `/mill/receiving/:id`. Read-only receiving list/detail was already delivered in 4.3 and was not reimplemented. Task 4.5 manager reviews, operations and corrections remain deferred. STOP after this task.

### Phase, previous work and focused scope

- Phase 9 / Mill group. Last completed implementation across the project was Field farmer management. Within Mill, 4.3 receiving list/detail/facility context was complete in code; 4.4 measurement was the next unfinished implementation.
- Read PROJECT_CONTEXT, PROGRESS, API_MAPPING, MIGRATION_PLAN and relevant DESIGN_SYSTEM contracts. Focused sources: ReceivingTasksPage role/no-mass visibility, measure modal/number inputs/submit handler; ledger measurement wrapper; route guards. Other Mill pages were inspected only at their API call anchors for inventory.

| Mill screen / subfeature | Source API dependencies and roles | Status |
| --- | --- | --- |
| `/mill/receiving`, existing `/:id` detail | lookups, receiving tasks/detail; MO/MM/MA | Existing 4.3 retained |
| Arrival measurement within detail | POST receiving/{id}/measurements; MO/MA only | Implemented 4.4 here |
| Receiving review/reconciliation | POST receiving/{id}/reviews; MM/MA | 4.5 deferred |
| `/mill/operations/new` | getLots/getLookups, recordOperation/commitOperation; MO/MM/MA | 4.6/4.7 deferred |
| `/mill/reconciliations`, `/:id` | getOperations/getCorrections, create/reconcile/commit/cancelCorrection; MM/MA | 4.8/4.9 deferred |

### Completed behavior and technical decisions

- Added a shared-Glass measurement entry action to the loaded receiving detail. Source rule: active operator/admin and no actual mass; string '0' counts as already measured. Managers remain read-only for measurement. No invented status or permission allowlist beyond source; backend still enforces grants/transitions/facility scope.
- Native page-sheet form uses neutral grouped surfaces, green Save, two labeled decimal inputs, keyboard avoidance, focus order, VI/EN, wrapping text, Cancel, disabled/busy state and no decorative animation. No new navigation URL or route payload containing measurements.
- Preserved source prefills: original/expected mass and original moisture if present, otherwise moisture '14.5'. UI clearly identifies prefilled suggestions requiring actual verification. Detail parser now retains optional source originMoisturePercent, including empty string so source fallback still applies.
- Required finite numeric values, source steps 0.01 kg and 0.1%; native comma/dot input is normalized with Decimal, never binary mass arithmetic. HTML finite-number range is checked only for validation. No extra positive-weight, 0–100 moisture or tolerance-based approval policy was invented; backend policy remains authoritative.
- Real authenticated POST `/api/ledger/receiving/{id}/measurements` keeps exact source fields: operationId, expectedReceivingVersion, capturedAt, observations, one KG item, grossWeightKg/netWeightKg equal entered weight, tareWeightKg '0.000', moisturePercent and measuredAt. Source fallback receivingVersion 0 is retained. Response body is not interpreted as a new DTO or approval.
- IMPORTANT source-contract gap: web sends `items[0].procurementItemId = selectedTask.id`, not an actual detail line's id. This native slice deliberately preserves that wire contract; it does not guess per-line allocations or silently substitute an item ID. Whether the deployed backend accepts this linkage must be verified before claiming live measurement success. Backend 400/422 validated ProblemDetails.detail is displayed when supplied.
- Action/controller owns copied task context and payload, validates ID/facility/version, coalesces duplicate submits, aborts/stale-suppresses on exit/session/access change and retains operation ID/timestamps for explicit unchanged retry in the same form. No domain network/5xx retry, persistence or offline queue. Existing shared auth single-401 retry reuses the same payload.
- 403, 409/412 conflict, validation rejection, configuration and uncertain timeout/network outcomes keep the form values and expose reload/retry guidance. Uncertain requests ask to inspect the latest task first. Closing the form discards operation state; it cannot undo a server write.
- After HTTP acceptance, closes the form, displays a success message and reloads detail/history/status. The same locally-acknowledged task version is not offered another measurement while reloading; a newly returned version follows the source visibility rule. Reload failure is separate from measurement acceptance. No local mass/status/stock mutation or auto-manager approval.
- Tightened the existing detail loader's role check before its HTTP call (it previously rendered denial after mounting the loader). Other completed screens/services were not refactored. All UI/action state is scoped to the current auth/task/version; token rotation alone does not replace a pending action.

### Changed files

- New `src/features/mill/receiving-measurement.ts`: validation, role/context guards, POST service and mutation controller.
- New `src/features/mill/ReceivingMeasurementForm.tsx`: native Glass input form and error/reload flow.
- Updated `src/features/mill/ReceivingTaskDetailScreen.tsx`: entry, acknowledgment, reload and guarded loader.
- Updated `src/features/mill/receiving-api.ts`: optional originMoisturePercent field only.
- New `scripts/check-receiving-measurement.cjs`; updated PROGRESS, API_MAPPING, PROJECT_CONTEXT and MIGRATION_PLAN.
- No dependency, native config, new route, shared auth transport, farmer/profile/dashboard or operation/correction implementation changes. Reuses Expo Crypto already installed by Field.

### Validation results

- `node scripts/check-receiving-measurement.cjs`: PASS, nine groups: finite/step/exact decimals; seven-role/no-mass visibility; exact source payload; invalid context/version/path/access; duplicate/copy behavior; retained retry IDs and server conflicts; abort/session/context replacement; moisture prefill and source version fallback; actual Axios bearer/204/same-payload 401 refresh replay.
- `node scripts/check-receiving.cjs`: PASS, seven existing read/detail/service/routing groups.
- `node scripts/check-auth.cjs`: PASS, 15 groups. Navigation and 62 shared contrast checks: PASS.
- `npx --no-install tsc --noEmit`: PASS. `npx --no-install expo lint`: PASS, no warnings.
- Android/iOS eager actual-route bundles: HTTP 200, ReceivingMeasurementForm included. Compilation is not device interaction acceptance.
- Used and stopped only the task-owned temporary Metro server on port 8093; existing services were left running.
- `git diff --check` on affected code: PASS. Reviewed installed SDK 58 and matching Router/Crypto docs, React Native Modal/KeyboardAvoidingView. UI/UX skill used for numeric forms, keyboard and accessibility.

### Known blockers and exact next boundary

- `.env.local` exists, but no supplied disposable authenticated test session/account. No live ledger measurement was recorded. Verify actual backend item linkage, version behavior, field policies/errors, facility grants and resulting detail/status/history on a test receipt.
- Single KG entry and zero tare are source assumptions, not a newly designed gross/tare scale workflow. Multi-line distribution, alternative units, numeric business limits and any remeasurement transition while actual mass remains populated need confirmed source/backend contracts; no guessed UI was added.
- Backend receivingVersion missing is still mapped to source 0 by existing read adapter. Live acceptance must confirm the version field is actually returned before considering concurrency proven.
- Physical iOS/Android form/sheet/keyboard, decimal comma/dot, large text, VoiceOver/TalkBack, light/dark, Back, save/reload failure and role/session changes remain manual acceptance. No native screenshot or live workflow pass claimed.
- Next Mill task ONLY on new instruction: 4.5 receiving manager review/reconciliation, including valid measurement-set linkage and allowed transitions. Do not begin operations or corrections automatically. Previous feature acceptance blockers remain unchanged.

## Previous task handoff — Field farmer management (`/field/farmers/new`)

Implemented only the first unfinished Field screen: the source FarmerRegistrationPage's list/search and create/edit/delete flows at `/field/farmers/new`. Includes a native owner-scoped farmer reference cache needed by this screen. STOP here; plots, declarations, procurement receipts, sample/handovers and procurement sync queue have not started.

### Current phase, previous implementation and scope

- Phase 9, Field / first screen. Latest PROGRESS handoff was Account profile; PROJECT_CONTEXT's headline still referred to earlier Receiving. Existing Profile, Receiving, Stock and HIG theme work were preserved.
- Farmer list/search (catalog 3.2) and its same-screen CRUD (3.3) are implemented together because the web route is a management page, despite its `/new` suffix. Only the farmer-cache prerequisite of 3.1 is included; generic drafts, receipt reference caches and queues are not implemented.
- Read PROJECT_CONTEXT, API_MAPPING, PROGRESS, MIGRATION_PLAN and DESIGN_SYSTEM. Focused sources: FarmerRegistrationPage, procurement farmer wrappers/DTOs, farmer section of offlineCache and owner, web route roles; only import/call anchors in the remaining Field pages to identify the group, without migrating their logic.

### Feature inventory and permissions

All six source routes allow `CUSTOMER_PROCUREMENT_OFFICER` and `MILL_ADMIN`; backend company scope and operation permissions remain authoritative. No new `farms.write` page-level gate is invented. Existing dashboard shortcut permission filtering remains in place.

| Screen | API/dependency anchors | Status |
| --- | --- | --- |
| `/field/farmers/new` — farmers | GET/POST `/api/farmers`, PUT/DELETE `/api/farmers/{id}`; farmer reference cache | Implemented in this task |
| `/field/plots/new` — plots | procurement.getPlots/getFarmers/createPlot/updatePlot/deletePlot; native geometry handling | Deferred, next Field screen |
| `/field/declarations/new` — sprays | procurement.getSprayDeclarations/recordSprayDeclaration; catalogs.getActiveSubstances | Deferred |
| `/field/receipts/new` — online receipts | procurement list/register, reference data, farmers/plots/plot-seasons/crop-seasons; Decimal and operation IDs | Deferred |
| `/field/samples/new` — samples/handovers | compliance.sampleEndpoints; CaptureSampleRequest/RecordSampleHandoverRequest | Deferred |
| `/field/sync` — procurement-only sync | procurementQueue owner isolation, durable receipt records, retained clientOperationId and sync lifecycle | Deferred; farmer cache is not this queue |

### Completed behavior and decisions

- Added authenticated Field stack and exact farmer route; screen and service reject other/inactive roles before any request or cache read. Role/access/session changes unmount/reset local records/forms/actions. Home enables the existing permission-filtered farmer shortcut for procurement and provides an Admin entry. Back dismisses to Home; safe sign-in returns allow only this exact new Field destination.
- Shared GlassCard/GlassInput/GlassButton on HIG neutral grouped surfaces, green primary action, neutral text/counts and functional red delete/error labels. VI/EN, wrapping text, accessible button names, form focus order, keyboard avoidance and virtualized farmer rows. Native form/delete confirmation uses a scrollable page-sheet with Cancel and busy feedback; no fake modal routes.
- GET query matches source `{pageSize:50,search?}`; search is explicit-submit on mobile. Arrays or `{items}` are validated; malformed responses/duplicate IDs are failures. Displayed counts are only the loaded page. Missing linked-plot count stays unknown; source UI's assumed one plot and unconditional “verified” badge were not copied.
- Form preserves required code/name and free optional contact text (phone OR address). Trims submitted values without adding phone/name length policies. Default editable code retains `FARMER-` + last four timestamp digits; uniqueness is not guaranteed locally.
- Create preserves schema-version-2 envelope, capturedAt, separate entity/clientOperation UUIDs and empty-string contact; native deviceId is `grainledger-mobile` (app marker, not a hardware identifier). Edit uses `{code,name,contact:null when blank,expectedVersion:version||1}`. Delete requires explicit confirmation and sends `{version:version||1}`. No guessed delete eligibility rule; backend conflicts/rejections are displayed safely.
- Existing duplicate-check wrapper has no consumer/response contract in FarmerRegistrationPage. No speculative duplicate preflight/UI was added; backend 409/412 conflicts are handled, with retained input and explicit close/reload/review. No domain action automatically retries on network failure; existing shared auth's bounded 401 retry is retained.
- Single pending mutation coalesces duplicate taps; abort/sequence checks suppress late success after exit/session changes. An unchanged failed create reuses the operation ID/entity ID/capture time on explicit retry while the form stays open. This is memory-only, not a durable farmer outbox. Timeout/network errors disclose uncertain save result and offer checking the list first.
- Farmer reference cache uses existing AsyncStorage, scoped by backend origin + organization + user + role + sorted permissions. Only successful unfiltered pages replace it (including successful empty pages); filtered results cannot overwrite the reference page. Successful mutations invalidate it, and older list completions cannot repopulate it afterward. Cache failures are reported separately from accepted server writes.
- On network/timeout only, a validated matching cache can supply read-only rows with saved timestamp and explicit limited/local search. No fallback for 401/403/configuration/contract errors. No offline auth/session restoration is introduced. A cache miss/read error is not a successful empty page. Cached data does not enable farmer writes or procurement receipts.

### Changed files

- New `src/features/field/{farmers-api.ts,farmer-actions.ts,FarmersScreen.tsx,FarmerEditor.tsx}`.
- New `src/app/field/_layout.tsx`, `src/app/field/farmers/new.tsx`; updated root Stack, exact safe auth return and Dashboard entry only.
- Added `expo-crypto ~58.0.8` using `npx --no-install expo install expo-crypto`; package.json/package-lock updated by Expo/npm. Uses SDK 58 randomUUID, not Math.random/browser-only UUID. Existing native development clients must be rebuilt if they lack this module; SDK 58 Expo Go includes it. No native directories or config plugins hand-edited.
- New `scripts/check-farmers.cjs`; updated PROGRESS, API_MAPPING, PROJECT_CONTEXT and MIGRATION_PLAN. Preserved all unrelated working-tree changes.

### Validation results

- `node scripts/check-farmers.cjs`: PASS, 14 groups for role/activity/scope denial, strict DTOs/unknown counts, source form rules, exact GET/cache clearing, origin/tenant/user/role/permission cache isolation, offline limited search, no denied/malformed fallback, exact version-2 create, versioned edit/delete/invalid paths, idempotent manual create retry, duplicate/abort suppression, cache mutation races/failures, actual authenticated Axios/conflict transport, mounted route/Home/back/safe return boundaries.
- `npx --no-install tsc --noEmit`: PASS, including generated Field route types.
- `npx --no-install expo lint`: PASS, no warnings.
- Auth (15 groups), navigation and theme (62 contrast pairs): PASS.
- `node scripts/check-dashboard.cjs`: PASS, 10 unchanged source/permission/aggregation groups after enabling only the farmer navigation entry.
- `npx --no-install expo install --check`: PASS, dependencies are up to date.
- Eager actual-route Android/iOS bundles: HTTP 200, FarmersScreen and field/farmers/new included. This proves compilation/delivery, not native interaction.
- Used a task-owned temporary offline Metro on port 8092 for compilation and route-type generation; stopped it after validation. Existing services were not stopped.
- `git diff --check`: PASS (Git reports existing CRLF normalization notices, not whitespace errors).
- Expo SDK 58 Router/Crypto and React Native Modal/KeyboardAvoidingView docs reviewed before native API use. UI/UX skill applied to keyboard/accessibility/layout. No unrelated npm audit fixes; install reports eight moderate findings.

### Blockers, incomplete actions and next scope

- A local `.env.local` now exists; values were not logged or included in docs. No disposable authenticated test account/session was supplied, so no live farmer record was created, edited or deleted. Deployed response/version/duplicate/deletion rules, tenant isolation and exact grant behavior remain acceptance items.
- Physical iOS/Android: check Modal/keyboard/large-text/VoiceOver/TalkBack, both themes, Home/back/sign-in return, double taps, real loss/recovery of connection, cached restart within a backend-restored session, and account/permission switching. No native screenshot/live interaction acceptance claimed.
- Only one source page of up to requested 50 farmers is cached; this is not a full offline master list. No paging contract was invented. Offline search is local case-insensitive name/code matching and does not claim identical backend search semantics.
- Native reference cache persists contact data for its owner, like the source; it never grants an offline session. Generic draft/cache infrastructure, full reference preload/expiry policies and the procurement-only outbox remain later tasks.
- Next unfinished Field screen, only when instructed: `/field/plots/new` — start with focused 3.4 plot list/detail/farmer lookup, then separately scope geometry/create/edit rules. Do not begin declarations/receipts/samples/queue automatically. Earlier feature acceptance blockers remain unchanged.

## Previous task handoff — Account profile (`/settings/profile`)

Migrated the first unfinished screen of the Account feature group: **Chỉnh sửa hồ sơ (`/settings/profile`)**. Implemented editable profile fields (`displayName`, `phoneNumber`, `language`), read-only admin-managed scope (email, normalized role, organization, active status), validation rules, real `GET /api/profile` and `PUT /api/profile` endpoints, immediate auth session synchronization via `client.updateUser`, loading/saving/success/error/concurrency (412) states, and pull-to-refresh. STOP after this screen as instructed. Follow-up subtasks (`/settings/security` change password and `/invite/:token` accept invitation) are documented and deferred.

### Completed in this task

- **Identified screens, API dependencies and permissions:**
  - Screen sequence:
    1. `/settings/profile` (Chỉnh sửa hồ sơ) — **Completed in this task**.
    2. `/settings/security` (Đổi mật khẩu khi đang đăng nhập) — Follow-up task (web `authApi.changePassword` was explicitly unsupported; password recovery via `/forgot-password` is documented).
    3. `/invite/:token` (Chấp nhận lời mời) — Follow-up task (web invitation endpoints were unsupported).
  - API endpoints for `/settings/profile`:
    - `GET /api/profile`: Authenticated; returns `SessionUserDto`.
    - `PUT /api/profile`: Authenticated; body `{ displayName: string, phoneNumber: string | null }`; returns updated `SessionUserDto`.
  - Permissions: Available to all seven authenticated roles (`MILL_ADMIN`, `MILL_MANAGER`, `MILL_OPERATOR`, `CUSTOMER_PROCUREMENT_OFFICER`, `CUSTOMER_MANAGER`, `CUSTOMER_EXPORT_OFFICER`, `AUTHORIZED_STOCK_VIEWER`).
- **Profile service & API client (`src/features/profile/profile-api.ts` & `src/services/profile.ts`):**
  - Created `createProfileService(api)` with `getProfile(signal?)` and `updateProfile(payload, signal?)`.
  - Added `validateProfile` with business rules: `displayName` required (2–120 characters), `phoneNumber` optional (if supplied, matches `/^[0-9+() -]{9,15}$/` and <= 32 characters).
  - Extended `src/features/auth/auth-client.ts` with `updateUser(user: AuthUser)` to update the live session snapshot immediately upon profile edit without requiring a full re-login.
  - Re-exported service and types from `src/services/profile.ts` for backward compatibility.
- **Redesigned screen (`src/features/profile/ProfileScreen.tsx` & `src/app/(tabs)/settings/profile.tsx`):**
  - Grouped layout conforming to `docs/DESIGN_SYSTEM.md` on `c.backgroundGrouped`.
  - Avatar circle with initials (`displayName` uppercase initials).
  - Editable Information card: `GlassInput` for Display Name and Phone Number with immediate and submit validation error messages; segmented selector for display language (`vi` / `en`).
  - Primary CTA button "Lưu thay đổi" (Save changes) with loading state (`saving`).
  - Success banner ("Thông tin cá nhân đã được lưu thành công.") and error banner (including HTTP 412 concurrency conflict handling).
  - Read-Only Admin-Managed Scope card: Email, Assigned Role (role code, title, and side: MILL / CUSTOMER / QUALIFIED_ACCESS), Assigned Organization / Company, and Account Status.
  - Security & Passwords card: Explanatory notice and direct link to Password Recovery (`/forgot-password`).
  - Appearance Settings card: Interactive System / Light / Dark switcher.
  - Session card: Destructive Sign Out button.
  - Pull-to-refresh: triggers `handleRefresh()` to reload latest profile data from `GET /api/profile`.
- **Created test suite (`scripts/check-profile.cjs`):**
  - 6 test groups covering: validation rules, `getProfile` contract, `updateProfile` contract & payload trimming, empty phone handling, client-side pre-validation rejection, and metadata completeness for all seven roles.

### Changed files

- New `src/features/profile/profile-api.ts`
- New `src/features/profile/ProfileScreen.tsx`
- Modified `src/services/profile.ts`
- Modified `src/features/auth/auth-client.ts`
- Modified `src/app/(tabs)/settings/profile.tsx`
- New `scripts/check-profile.cjs`
- Modified `docs/PROGRESS.md`

### Validation results

- `node scripts/check-profile.cjs`: PASS (6/6 profile test groups).
- `node scripts/check-receiving.cjs`: PASS (7/7 receiving test groups).
- `node scripts/check-stock-detail.cjs`: PASS (9/9 stock-detail groups).
- `node scripts/check-stock.cjs`: PASS (7/7 stock fixture groups).
- `node scripts/check-navigation.cjs`: PASS (canonical routes & tab events).
- `node scripts/check-auth.cjs`: PASS (15/15 auth contract groups).
- `node scripts/check-theme.cjs`: PASS (62 WCAG contrast checks).
- `npx --no-install tsc --noEmit`: PASS (0 errors).
- `npx --no-install expo lint`: PASS (0 errors, 0 warnings).

### Incomplete actions & follow-up subtasks

1. **Subtask 2 — Đổi mật khẩu khi đang đăng nhập (`/settings/security`):**
   - In web source (`web/grainledger/src/features/auth/api/authApi.ts`), `changePassword` was explicitly marked as unsupported (`throw new Error("Change password is not supported")`), and the backend `GrainLedger.Api` currently only implements `forgot-password` and `reset-password`.
   - When migrating `/settings/security`, determine whether to connect to a backend change-password endpoint (if added) or provide a guided in-session password reset workflow.
2. **Subtask 3 — Mở link và chấp nhận lời mời (`/invite/:token`):**
   - Deep-link route `/invite/:token` for onboarding new users. Note that web `acceptInvitation` was also marked unsupported in source. Backend contract verification required.
3. **Live backend & native device acceptance:**
   - Physical device verification of keyboard avoiding and text input scrolling on iOS and Android.

## Previous task handoff — UI Redesign according to iOS HIG Design System (`docs/DESIGN_SYSTEM.md`)

Redesigned the user interface across all application screens according to `docs/DESIGN_SYSTEM.md`, while keeping 100% of the underlying business logic, API contracts, Decimal.js calculations, permissions, and navigation flows intact.

### Completed in this task

- **Theme & Tokens (`src/theme/tokens.ts`):**
  - Updated color tokens to neutral surfaces: Light (`#FFFFFF` background, `#F2F2F7` grouped background, `#FFFFFF` card/surface, `#1C1C1E` primary text, `#636366` secondary text, `#D1D1D6` border); Dark (`#000000` background, `#1C1C1E` surface, `#2C2C2E` raised surface, `#F2F2F7` primary text, `#AEAEB2` secondary text, `#38383A` border).
  - Single brand green accent: Light `#176347` / Dark `#85DCB2`; onPrimary `#FFFFFF` / `#102B20`; selectedSurface `#E9F2ED` / `#17392A`.
  - Functional status colors: Danger (`#B42332` / `#FF9AA2`), Warning (`#79530D` / `#FFD60A`), Info (`#225D83` / `#64D2FF`).
  - Standard system sans font across all typographic scales (removed serif from display).
  - Radius: `control: 12, card: 16, sheet: 24, pill: 999`. Default soft shadow set to `boxShadow: 'none'`.
- **Glass Core Components:**
  - `GlassCard.tsx`: Default `opaque = true`, `shadow = 'none'`, `padding = 'lg'`, `border: theme.colors.border`.
  - `GlassView.tsx`: Disabled linear highlight gradient on solid/opaque surfaces for clean flat iOS HIG grouped cards.
  - `GlassButton.tsx`: Added subtle border and clean pressed/focus states.
  - `FloatingTabBar.tsx`: Updated to iOS HIG navigation standard — active tab uses brand green accent (`c.primary`) on subtle pill background (`c.selectedSurface`), inactive tabs use neutral gray (`c.textSecondary`).
- **Screen Redesigns:**
  - `src/app/sign-in.tsx`: Clean grouped layout on `c.backgroundGrouped`, removed ambient background gradient overlay, centered solid card for credentials with primary green button and subtle secondary links.
  - `src/app/forgot-password.tsx` & `PasswordResetForm.tsx`: Neutral grouped background, header with language switch, clean card for OTP request and password reset with distinct success, loading, and error states.
  - `src/features/dashboard/DashboardScreen.tsx`: Grouped overview on `c.backgroundGrouped`, Large Title, clean stat cards in 2x2 grid with tabular figures, facility picker chips, single-hue brand distribution bars, grouped attention/records with hairline separators, and primary CTA button for available `/mill/receiving`.
  - `src/features/stock/StockScreen.tsx`: Clean grouped inventory ledger, search bar, segmented stage filter chips, solid lot cards with hairline borders, tabular masses, and status indicators.
  - `src/features/stock/StockLotDetailScreen.tsx`: Large title, lot overview card, tabular stat grid, grouped sections for position balances, lot composition, and restrictions with honest empty/missing notes.
  - `src/features/mill/ReceivingTasksScreen.tsx`: Facility context selector pills, KPI summary cards, search and status filter chips, clean task cards with mass comparison grid, ISO 22095 ±0.5% tolerance variance highlighting (green for within tolerance, red for out of tolerance), and role action hints.
  - `src/features/mill/ReceivingTaskDetailScreen.tsx`: Large title, task code header, status badge, mass comparison card with ISO 22095 guidance note, line items breakdown with tabular masses, measurement history, and review history.
  - `src/app/(tabs)/settings/profile.tsx`: Full iOS HIG Grouped Settings screen with user profile avatar and metadata, interactive appearance mode switcher (System / Light / Dark) wired to `useAppTheme().setMode`, links to Theme Studio and Landing, and destructive red "Đăng xuất" action.
  - `src/features/landing/landing-ui.tsx`: Unified local landing palette directly with global `theme.colors`.
  - `src/app/(tabs)/_layout.tsx`: Replaced ambient background gradient with clean neutral `backgroundGrouped`.

### Changed files

- `src/theme/tokens.ts`
- `src/components/glass/GlassCard.tsx`
- `src/components/glass/GlassView.tsx`
- `src/components/glass/GlassButton.tsx`
- `src/components/navigation/FloatingTabBar.tsx`
- `src/app/sign-in.tsx`
- `src/app/forgot-password.tsx`
- `src/features/auth/PasswordResetForm.tsx`
- `src/app/(tabs)/_layout.tsx`
- `src/app/(tabs)/settings/profile.tsx`
- `src/features/dashboard/DashboardScreen.tsx`
- `src/features/stock/StockScreen.tsx`
- `src/features/stock/StockLotDetailScreen.tsx`
- `src/features/mill/ReceivingTasksScreen.tsx`
- `src/features/mill/ReceivingTaskDetailScreen.tsx`
- `src/features/landing/landing-ui.tsx`
- `scripts/check-theme.cjs`
- `docs/PROGRESS.md`

### Validation results

- `node scripts/check-theme.cjs`: PASS (62 contrast checks, minimum text contrast ratio 4.77:1).
- `node scripts/check-receiving.cjs`: PASS (7 receiving test groups).
- `node scripts/check-stock-detail.cjs`: PASS (9 stock-detail groups).
- `node scripts/check-stock.cjs`: PASS (7 stock fixture groups).
- `node scripts/check-navigation.cjs`: PASS (tab events, canonical routes, spacing).
- `node scripts/check-auth.cjs`: PASS (15 auth contract/controller groups).
- `npx --no-install tsc --noEmit`: PASS (0 errors).
- `npx --no-install expo lint`: PASS (0 errors, 0 warnings).

## Previous task handoff — Group 4 / Phase 9 Tiếp nhận, task 4.3

Implemented the next unfinished task only: Task 4.3 Receiving task list/detail and facility context; role-scoped visibility verified. Includes authenticated `/mill/receiving` and `/mill/receiving/:id` routes, facility lookup context, quick KPI statistics, search and status filters, ISO 22095 ±0.5% tolerance variance evaluation, procurement line items breakdown, and measurement/review history. Source-contract fixtures, typecheck, and lint pass; live backend and native acceptance remain pending. STOP after task 4.3; do not proceed to task 4.4 receiving measurement entry or any other feature.

### Completed in this task

- Read required handoff documents (`PROJECT_CONTEXT.md`, `MIGRATION_PLAN.md`, `PROGRESS.md`, `API_MAPPING.md`, `DESIGN_SYSTEM.md`). Phase 9 / Stock 4.2 was the last completed implementation.
- Focused read-only web and backend audits: `web/grainledger/src/features/mill/pages/ReceivingTasksPage.tsx`, `api/ledger.ts`, database function `grainledger.ledger_receiving_tasks_page` and `ledger_receiving_detail` in `InitialSchema.sql`, routes in `routes.tsx` (`allowedRoles: ['MILL_OPERATOR', 'MILL_MANAGER', 'MILL_ADMIN']`), and `dashboardConfig.ts`.
- Implemented role-scoped visibility: Only `MILL_OPERATOR`, `MILL_MANAGER`, and `MILL_ADMIN` can access receiving. Unauthorized roles (`CUSTOMER_PROCUREMENT_OFFICER`, `CUSTOMER_MANAGER`, `CUSTOMER_EXPORT_OFFICER`, `AUTHORIZED_STOCK_VIEWER`) receive a dedicated Access Denied view with a Return to Home action.
- Implemented facility context: Facility is strictly required by the backend function (`IF f IS NULL THEN RAISE EXCEPTION 'Facility required'`). Added facility lookup via `GET /api/ledger/lookups`, default selection to active assigned facility, and horizontal facility picker allowing switching across assigned facilities.
- Implemented receiving tasks list (`/mill/receiving`):
  - Consumes `GET /api/ledger/receiving-tasks` through `client.api` and `useApiResource`.
  - Supports query parameters: `facilityId`, `page`, `pageSize`, `search`, `status`.
  - Parses both `ApiPage` envelope and bare array fallback, supporting both backend property names (`code`, `expectedTotalKg`, `actualTotalKg`, `ownerCompanyName`) and web property names (`sourceLotCode`, `originQuantityKg`, `arrivalMeasuredKg`, `farmerName`). Duplicate IDs are rejected.
  - Four quick KPI summary cards: Total tasks, Pending measure (Operator action), Awaiting review (Manager action), and Matched.
  - Search input with submit-on-enter and status filter chips (`PENDING_ARRIVAL`, `AWAITING_MANAGER_REVIEW`, `RECEIVED_MATCHED`, `RECEIVED_SHORTAGE_APPROVED`, `BLOCKED_UNRESOLVED`).
  - Card displays task code, origin mass/moisture, arrival mass/moisture, calculated variance (+/- kg, %), and ISO 22095 ±0.5% tolerance evaluation.
  - Role-specific next action guidance (Operator measure / Manager review).
- Implemented receiving task detail (`/mill/receiving/[id]`):
  - Consumes `GET /api/ledger/receiving/{id}` with strict ID matching.
  - Displays Header with Task Code, Status badge, and Receiving Version.
  - Facility, Location, and Owner information cards.
  - Origin mass vs Arrival mass comparison, variance calculation, and ISO 22095 ±0.5% transport tolerance policy card.
  - Procurement line items breakdown (`items` array: lineNo, lotCode, riceVariety, expectedKg, actualKg, units).
  - Measurement sets history (`measurementSets` array: operator, timestamp, observations, measured values).
  - Reconciliation reviews history (`reviews` array: manager, timestamp, action, reason).
  - Workflow status guidance clearly noting next steps (deferring mutation entry to Tasks 4.4 and 4.5).
  - Safe back navigation (`router.back()` or fallback to `/mill/receiving`).
- Enabled the `/mill/receiving` shortcut on `DashboardScreen.tsx` for authorized mill roles, routing to `/mill/receiving`.
- Created safe route validators in `src/navigation/mill-route.ts` and extended `safeReturnPath` in `src/features/auth/contracts.ts`.
- Navigation mapping: Added `src/app/mill/_layout.tsx`, `src/app/mill/receiving/_layout.tsx`, `src/app/mill/receiving/index.tsx`, `src/app/mill/receiving/[id].tsx`, and registered `mill` under `Stack.Protected` in `src/app/_layout.tsx`.
- Created comprehensive test suite `scripts/check-receiving.cjs` (7 test groups) and updated `scripts/check-navigation.cjs`.

### Changed files

- New `src/features/mill/receiving-api.ts`, `ReceivingTasksScreen.tsx`, and `ReceivingTaskDetailScreen.tsx`.
- New `src/navigation/mill-route.ts`.
- New `src/app/mill/_layout.tsx`, `src/app/mill/receiving/_layout.tsx`, `src/app/mill/receiving/index.tsx`, and `src/app/mill/receiving/[id].tsx`.
- Modified `src/features/auth/contracts.ts` (extended `safeReturnPath` with `safeReceivingPath`).
- Modified `src/features/dashboard/DashboardScreen.tsx` (enabled `/mill/receiving` shortcut button).
- Modified `src/app/_layout.tsx` (declared `mill` under `Stack.Protected`).
- Modified `src/app/sign-in.tsx` (returnUrl redirect typing).
- New `scripts/check-receiving.cjs`; modified `scripts/check-navigation.cjs`.
- Updated `PROGRESS.md`, `MIGRATION_PLAN.md`, `API_MAPPING.md`, and `PROJECT_CONTEXT.md`.

### Validation results

- `node scripts/check-receiving.cjs`: PASS (7 test groups: role-scoped visibility, facility lookups, list parsing & envelopes, variance and ±0.5% tolerance, detail parsing & strict identity, service contract & query parameters, safe routing & return paths).
- `node scripts/check-stock-detail.cjs`: PASS (9 groups).
- `node scripts/check-stock.cjs`: PASS (7 groups).
- `node scripts/check-navigation.cjs`: PASS (including mill layouts).
- `node scripts/check-auth.cjs`: PASS (15 groups).
- `node scripts/check-theme.cjs`: PASS (62 contrast checks).
- `npx --no-install tsc --noEmit`: PASS, zero errors.
- `npx --no-install expo lint`: PASS, zero errors, zero warnings.

### Known blockers and follow-up acceptance

- No live backend origin/test account configured; live facility lookup and receiving task data remain unverified against a live server.
- Interactive measurement recording (Operator entry modal, gross/tare/net weight, moisture) belongs to Task 4.4 and is deferred.
- Interactive reconciliation review actions (Manager approval / rejection / remeasurement request) belong to Task 4.5 and are deferred.
- Native device acceptance on iOS/Android (touch, scrolling, pull-to-refresh, dark mode, keyboard avoiding) remains pending.

## Previous task handoff — Stock 4.2

Implemented the next unfinished Stock screen only: `/stock/lots/:lotId`, entered from the existing list or directly by URL. Includes server-backed lot detail, position balances, origin contributions and restrictions. Source-contract fixtures/typecheck/lint pass; live backend and native acceptance remain pending. STOP after task 4.2; do not begin receiving or another feature.

### Completed in this task

- Read the required handoff documents and shared Glass design contracts. Phase 9 / Stock 4.1 was the last completed implementation. Its existing list/filter/paging remains in place; only a detail-entry button was added per lot.
- Focused read-only sources: StockOverviewPage's LotItem/getLot/modal; ledger.getLot; dashboard stock position/restriction schema and its stock fixture (locationId); route declarations and existing native navigation/auth contracts. No whole-codebase reanalysis.
- Added authenticated dynamic route `stock/lots/[lotId].tsx` under the existing Stock stack. Uses Expo Router push with only lotId/local language; Back dismisses to `/stock`, retaining the existing list's local filters/page when mounted and replacing to the list if absent.
- Added real GET `/api/ledger/lots/{encodeURIComponent(id)}` through client.api and session-scoped useApiResource. Route/account/access changes replace the detail resource; invalid/array/blank/path-like identifiers never request a resource. Mismatched response IDs are contract errors. No list-summary fallback hides a failed detail request.
- Added virtualized sections for position quantity/available balances, farmer/plot/percentage/mass origin contributions and raw restriction codes. Uses shared Glass cards/statistics/buttons, VI/EN, wrapping/scalable text, minimum-48 controls and existing safe-area/tab spacing. Six-decimal mass display retains source NUMERIC(20,6) precision; list formatting remains unchanged.
- Summary fields may be absent on source position-based lots. Missing summary values are unknown, not sums inferred from positions. Position records use source facilityId/optional locationId and decimal-string quantityKg/availableKg; no lookup IDs/names/permissions or per-position reservation calculations were invented.
- Loading/refresh, success, missing vs explicit empty sections, genuinely empty successful response, 404, 403, invalid link, configuration, contract and network/retry states are distinct. Refresh clears stale data. Source UI has no lot mutation action beyond viewing/closing; no transfer, HOLD command or other mutation was added.
- Important source gap: the web modal hardcodes three farmers and 45/35/20 percentages, with a fixed 100%/compliance presentation; it does not render its declared composition field. Mobile consumes only actual API composition, reports missing data, and does not copy those sample farmers, derive mass from percentages, assume 100%, or claim certification/shipping eligibility.
- Extended only the existing safe auth return allowlist for canonical mounted `/stock/lots/{id}` paths. Encoded paths are checked/decoded once, traversal/foreign URLs/query fragments/pre-encoded IDs are rejected. Tokens/session policy are unchanged. Dynamic-route types were generated by Expo during validation.

### Changed files

- New `src/features/stock/StockLotDetailScreen.tsx`, `stock-detail-api.ts`, and `src/app/(tabs)/stock/lots/[lotId].tsx`.
- Modified `src/features/stock/StockScreen.tsx` (entry button), `stock-api.ts` (export existing summary schema without changing list behavior).
- New `src/navigation/stock-route.ts`; modified `src/features/auth/contracts.ts` only for safe detail-return navigation.
- New `scripts/check-stock-detail.cjs`; extended `scripts/check-navigation.cjs` with the mounted dynamic route.
- Updated PROGRESS, PROJECT_CONTEXT, API_MAPPING and MIGRATION_PLAN. No dependencies/native config/shared Glass primitives/web source changed; pre-existing unrelated deletion remains untouched.

### Validation results

- `npx --no-install tsc --noEmit`: PASS, including Expo-generated dynamic route types.
- `npx --no-install expo lint`: PASS, no warnings.
- `node scripts/check-stock-detail.cjs`: PASS, nine groups: source detail/precision; position-only records; missing/empty/null; malformed/identity mismatch; exact path/signal/invalid IDs; rejection propagation; stale/cancel/reset/retry; authenticated Axios for all seven roles and backend 403; route/list/back/safe returns.
- `node scripts/check-stock.cjs`: PASS, seven unchanged list/filter/paging/decimal/request-state groups.
- `node scripts/check-auth.cjs`: PASS, 15 auth controller groups after the return-path extension.
- `node scripts/check-navigation.cjs`: PASS, includes dynamic detail route.
- `node scripts/check-theme.cjs`: PASS, 62 shared contrast checks (minimum 4.67:1).
- Eager actual-route Android/iOS/web development bundles: HTTP 200 on each, with StockLotDetailScreen and stock/lots/[lotId] present. Used the configured src/app router root and generated route types. These are compilation/delivery checks, not interactive device acceptance. Started a temporary Metro server on port 8091 for these checks and stopped only that server afterward.
- Offline Metro warned that manifest assets could not be resolved; icon/font asset delivery was not verified. No native asset/config changes were made.
- `git diff --check`: PASS.
- Reviewed installed Expo major 58, matching SDK Router docs, navigation/URL-parameter guides and React Native SectionList before API use. Native interaction is not established by fixture/route-type checks.

### Known blockers and follow-up acceptance

- No backend origin/test account; real response shape, tenant/facility/stock-viewer grants, position visibility and origin availability remain unverified. Test fixture grants are not deployment evidence.
- Summary schema on StockOverviewPage differs from the dashboard positions schema. The detail adapter explicitly supports both shapes without deriving missing summary values; task 4.1's list adapter is unchanged and still requires its documented summary fields. Verify deployed contracts before changing the list.
- Composition is a declared client type with no real web renderer; positions are evidenced on the dashboard response, not a verified GET-lot response. If GET-lot omits either field, mobile reports unavailable. No independent lineage/positions endpoint was invented; deployed contract confirmation is needed if the fields are absent.
- Position display uses actual facility/location IDs. Friendly per-position names and reserved/quarantined breakdowns have no audited contract here and are not fabricated. Overall reserved/quarantined values are shown only when returned.
- Native iOS/Android light/dark, Dynamic Type, VoiceOver/TalkBack, system/hardware Back, direct URL → login → detail, selected-row navigation, pull refresh and identity change remain device acceptance. No native screenshot or live interaction pass is claimed.
- Stock task 4.2 implementation delivered; verify the above within Stock when requested. Do not proceed automatically to task 4.3 receiving or any other feature. Earlier Landing/Auth/PasswordRecovery live/device blockers remain documented.

## Previous task handoff — Stock 4.1

Implemented only the first unfinished Stock subfeature: `/stock` list/search/stage filters, current-page mass summaries and server-confirmed paging. Static checks and seven stock fixture groups pass. Live backend and native acceptance remain pending; task 4.2 lot detail has not started. STOP after this task and await the next instruction.

### Completed in this task

- Read PROJECT_CONTEXT, MIGRATION_PLAN, PROGRESS, API_MAPPING and relevant DESIGN_SYSTEM contracts. Last completed implementation was the Landing minimal iOS presentation; its native acceptance remains pending. This user instruction explicitly selects Stock 4.1 instead of that earlier recommendation.
- Focused read-only web audit: StockOverviewPage, its route declarations, ledger.getLots/query contracts and MassValue. `/stock` and `/stock/lots/:lotId` both mount StockOverviewPage; the latter does not consume lotId. Detail is currently an inline selected-summary/GET-lot modal with composition. Do not claim deep-link detail parity.
- Replaced only the existing `/stock` placeholder with a virtualized list using shared GlassCard, GlassStatCard, GlassInput and GlassButton. Opaque row/stat/filter surfaces limit blur work. VI/EN copy, wrapping/scaling text, selected stage semantics, minimum-48 controls and safe-area layout use existing shared contracts.
- Wired real authenticated GET `/api/ledger/lots` through client.api/useApiResource. Search applies on submit/Search; all five source stage values and reset are supported. Incoming `search` route parameters update an already mounted tab. No additional HTTP lookups, mutation or refresh interceptor.
- Added loading, empty, success, contract/configuration/access/network errors, explicit retry/refresh and pull-to-refresh. Filter/session changes clear prior rows; superseded/unmounted requests cannot publish stale results. Account/access changes also reset local filters.
- Preserved decimal strings and source 3-decimal VI/EN display, with exact Decimal totals. Summaries explicitly cover only the current page. Missing optional masses remain unknown; no fabricated owner/company/Silo S1 or success-zero fallback. CONSUMED is labeled explicitly and unknown stage/status values display verbatim.
- Source supports arrays or `{items}`; complete ApiPage metadata enables Previous/Next, with page response validation. Legacy envelopes disclose unknown completeness and offer no invented Next action. Page changes return to the list top. Later-page failures offer retry/return to first page.

### Changed files

- `src/features/stock/stock-api.ts`: validated list adapter, source filter values, paging envelope and decimal summaries.
- `src/features/stock/StockScreen.tsx`: read-only Glass inventory list and request/UI states.
- `src/app/(tabs)/stock/index.tsx`: renders StockScreen within the existing protected Stock stack.
- `scripts/check-stock.cjs`: seven contract/decimal/paging/cancellation fixture groups.
- `docs/PROGRESS.md`, `API_MAPPING.md`, `PROJECT_CONTEXT.md`, `MIGRATION_PLAN.md`: focused handoff updates.
- No package/lockfile, shared component, original web source or native configuration changes. Restored existing locked dependencies with `npm ci --ignore-scripts --no-audit --no-fund` because node_modules was absent. Preserved the pre-existing unrelated deleted file.

### Technical decisions and permissions

- Source route/page has no additional role/permission/facility guard beyond authenticated access. Keep all seven existing common-tab roles; backend determines tenant/facility grants, including stock viewers. Never add tenant IDs or infer broader access from role. A 403 is an error, not empty inventory. Dashboard-specific facility/permission orchestration is not silently applied to a different page.
- Preserve first request `{stage?, search?, pageSize:50}`; send `page` only for later confirmed pages. No automatic retry or invented pagination from row count. Partial metadata does not prove paging/completeness.
- Search is explicit-submit on mobile to avoid a request per keystroke. No search endpoint or global locale persistence is introduced.

### Validation results

- `npx --no-install tsc --noEmit`: PASS after correcting FlatList's empty-component prop from null to undefined.
- `npx --no-install expo lint`: PASS, no warnings.
- `node scripts/check-stock.cjs`: PASS, seven groups: envelopes/empty; malformed/duplicates; paging; decimal/missing values/locale; endpoint/filter/query/signal; rejection propagation; stale request/reset.
- `node scripts/check-navigation.cjs`: PASS: existing route hierarchy/tab events/insets unchanged. Navigation validation is static; no new route is added.
- `node scripts/check-theme.cjs`: PASS: 62 contrast checks (minimum 4.67:1), mode resolution and stored-value validation. This is shared-token evidence, not native visual acceptance.
- `git diff --check`: PASS.
- Expo major 58 and matching versioned Router docs plus React Native FlatList docs reviewed before native code changes.

### Known blockers, incomplete actions and exact next scope

- Only `.env.example` exists: no configured origin/test account. Real backend success, paging/search/stage behavior, seven-role tenant/facility grants and 403 responses remain unverified.
- Source-contract discrepancy: StockOverviewPage expects top-level quantityKg/status and PADDY-family filters; the existing dashboard consumes positions/restrictions and may receive RAW_PADDY. This adapter validates the selected page's contract; it does not invent conversions or sum position data into missing summary fields. A positions-only response is a visible contract error. Verify deployed stock response before changing either contract.
- Native iOS/Android light/dark, large text, keyboard/search focus, pull refresh, page scrolling, screen reader, tab/back/deep-link/account switching remain manual acceptance. No native screenshots, live workflow or device interaction pass is claimed.
- Task 4.1 implementation is delivered; its live/device acceptance remains open. Next Stock implementation, only after a new instruction: 4.2 lot detail/positions/restrictions/lineage and source-authorized actions, including review of route-vs-modal semantics. No detail endpoint, route, transfer, HOLD or other feature was implemented here.
- Earlier Landing/Auth/PasswordRecovery backend/device blockers remain; the prior Landing handoff is retained below.

## Previous task handoff — Landing presentation

Landing presentation redesign requested by the user: minimal iOS HIG direction. Code, compilation/regression and contrast checks pass. Browser/native visual interaction acceptance remains pending. Stop after this Landing task; prior PasswordRecovery/Auth work remains intact.

## Completed work

- Inspected only current Landing screen/simulator/content and relevant shared style contracts. Reviewed Apple HIG layout/materials and Expo SDK 58 docs.
- Replaced the page-wide gradient, translucent hero and repeated shadowed cards/buttons with neutral grouped surfaces, hairline separators, generous spacing and green action accents.
- Added a system-default sans Large Title (34/42 phone, 48/56 wide), readable intro/body text, compact sticky header and a labeled ellipsis for appearance/language preferences.
- Grouped context metrics, core-system rows and comparisons. Long explanations and footer references use accessible disclosure rows; first pillar/comparison starts open. Content remains available in both languages.
- Restyled simulator/stakeholder choices as quiet grouped selections. Reused opaque GlassInput for numeric fields. Ledger/MRL calculations, source fixtures, sample selection, error/empty states and API-free disclosures are unchanged.
- Preserved measured section navigation/top actions, reduced-motion behavior, global persisted system/light/dark mode, local locale and auth-aware sign-in/home CTAs.
- No original ReactJS, Auth/PasswordRecovery/API code, global theme/shared primitives, dependency or native configuration changes.

## Created/modified files

- Created src/features/landing/landing-ui.tsx (feature-local presentation helpers and neutral appearance).
- Modified src/features/landing/LandingScreen.tsx and LandingSimulator.tsx.
- Updated docs/DESIGN_SYSTEM.md, PROJECT_CONTEXT.md, API_MAPPING.md, MIGRATION_PLAN.md and PROGRESS.md.

## Important technical decisions

- Latest user direction supersedes the previous Glass decoration for Landing only. Other screens keep the existing design. Neutral colors follow the central resolved scheme; appearance persistence remains centralized.
- Local panels/actions/disclosures are scoped to Landing, not a new global component library. No native UIKit or Liquid Glass rendering is claimed.
- Plain content/solid grouped surfaces establish hierarchy. Primary actions retain brand green, controls remain at least 48 points, selected/expanded/focus semantics are exposed and text scales/wraps.
- Five section targets and all original source content remain accessible. Preferences are disclosed on demand and opening them scrolls to the top. Disclosures are not animated; section scrolling still respects reduced motion.
- No business rules, demo values, backend contracts or navigation destinations changed.

## Validation results

- npx --no-install tsc --noEmit: PASS. Missing segmented style found during implementation was fixed.
- npx --no-install expo lint: PASS, no warnings.
- node scripts/check-landing.cjs: PASS, nine content/calculation/navigation groups, including exact decimal tolerance, all 12 MRL cells, both locales and CTA/section target rules.
- check-navigation.cjs and check-theme.cjs: PASS; 62 shared contrast checks.
- One-off neutral Landing contrast validation: 18 text/action pairs, minimum 4.77:1.
- Landing HTTP /: 200. Eager actual-route web/Android/iOS bundles: 200; new minimal presentation code present.
- Browser visual review attempted; blocked by “The browser access host is unavailable.” No screenshot, touch interaction or native visual acceptance claimed.
- Reused the already-running Metro server; did not stop that pre-existing service.

## Known issues and remaining tasks

- Verify light/dark/system visuals, narrow/large text, sticky header/section offsets after disclosure expansion, preference controls, both locales, keyboard, simulator/stakeholder selection and CTA/back on a native client.
- This uses React Native components inspired by HIG, not native iOS menus/material widgets. Android remains supported with solid surfaces; no new platform dependency.
- Incoming external section hashes remain the earlier Landing follow-up; in-page navigation remains implemented.
- Prior PasswordRecovery live OTP/password-policy/revocation, Auth/SecureStore and backend acceptance blockers remain documented in API_MAPPING/PROJECT_CONTEXT; no origin/test account was added by this visual task.

## Exact next recommended task

Review only the redesigned Landing on iOS/Android in light/dark, at narrow widths and large text. Exercise preference disclosure, all five section targets after opening/closing details, both simulator modes and presets, stakeholders, footer shortcuts and sign-in/home/back. Fix observed Landing visual/interaction defects. Await user instruction before another feature.
