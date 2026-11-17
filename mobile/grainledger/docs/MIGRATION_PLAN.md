# Feature migration checklist

Audit baseline: PHASE 1 — PROJECT AUDIT. Phases 2–8 delivered foundations/auth/API/dashboard. Phase 9 delivered Landing and request-code recovery; the current PasswordRecovery task adds only OTP/new-password entry. Live backend/device acceptance remains pending. Other domain screens/actions, offline queue and role workspaces remain separate tasks. A wired API is client evidence, not proof of runtime success.

Phase 2 delivered: existing SDK 58 project reused; Router Stack/basic folders; compatible installed dependencies verified; strict TypeScript aliases and native safe-area support; minimal welcome screen; passing lint/typecheck and Metro web/Android/iOS bundle smoke checks. No authentication, APIs or business screens implemented. Welcome palette changes do not complete the full semantic-token/provider tasks below.

## Phase 5 mobile navigation mapping

Implemented shell (parenthesized groups do not change URLs):

```text
src/app/_layout.tsx                 Native root Stack; anchor index
  index.tsx                        / — Phase 9 public Landing; CTA to sign-in or Home
  sign-in.tsx                      /sign-in — public Glass login (Phase 6)
  forgot-password.tsx              /forgot-password — public request-code and explicit OTP/new-password steps
  theme-demo.tsx                   /theme-demo — native header/back above tabs
  (tabs)/_layout.tsx                Authenticated Expo Router JS tabs; history back
    home.tsx                       /home — Phase 8 role-scoped dashboard
    stock/_layout.tsx              Native Stock stack; anchor index
      index.tsx                    /stock — Stock placeholder
    settings/_layout.tsx           Native Account stack; anchor profile
      profile.tsx                  /settings/profile — session identity/logout; profile editing deferred
```

Phase 8 Home reads only authorized dashboard sources. Stock remains a placeholder; Account shows session/logout only. Phase 6 protects all three common destinations for all seven roles, matching web route guards. No role workspace destinations are fabricated. `/explore` remains outside the shell; unused starter tabs are not mounted.

Future hierarchy remains aligned to the web inventory: `/stock/lots/:lotId` becomes `stock/lots/[lotId].tsx` in the Stock stack; `/settings/security` belongs to the Account stack. `/sign-in` and `/forgot-password` are public root routes; `/invite/:token` retains its path when later authorized. Admin/field/mill/compliance/export/risk/events retain exact prefixes/parameters in later branches. Do not create their placeholders/links prematurely. Role-specific navigation/guards require each feature's audited access policy.

`src/navigation/tabs.ts` centralizes the three destinations/icons and SDK 58 tab-event policy. FloatingTabBar uses SDK 58 emitter/navigateToTab, honoring cancellation/re-selection and emitting long-press events. The custom pill reserves normal layout space, includes bottom/side insets, measures its full height and publishes that measurement to tab consumers. iOS icons change outline/fill; all platforms change icon tint, background and label emphasis. Tab scenes use a 160ms opacity fade, disabled when reduced motion is requested. Root and nested stacks remain native.

The custom floating bar uses `expo-router/js-tabs` to provide the requested cross-platform shape. No external React Navigation packages are imported. Android system navigation stays visible and is themed using expo-navigation-bar; its config plugin requires a rebuilt development client. Real touch/back/gesture/large-text/device-bar acceptance remains pending; static route/event/inset and bundle checks pass.

## Remaining implementation order

Phase 1 was audit only; Phase 2 was Expo setup only. Numbers 1–7 below identify implementation groups, not user-assigned phases. Further phase scope requires the next user instruction.

| Group | Scope, in order | Completion gate |
| --- | --- | --- |
| 1 | Theme tokens/provider; shared glass controls; API/auth contracts and transport; token storage/session state; sign-in; guarded shell/logout; password recovery | Real login, restoration/refresh/logout and recovery; usable keyboard/forms; both themes; checks pass or baseline failures explicitly tracked |
| 2 | Role/permission navigation; screen layout/feedback; dashboard contracts/queries/UI; profile/settings; notifications/search | Seven role configurations, scoped live data, facility selection, loading/error/empty/refresh behavior; no dead shortcuts |
| 3 | Field screens individually, then durable offline queue | Real CRUD/submission; owner isolation and idempotent retry verified |
| 4 | Stock, receiving, operations, corrections individually | Preserve ledger rules, rejection feedback, mass precision and access scope |
| 5 | Samples, lab reports, MRL, safety margins, residue rules, HOLD, audit, blend decisions individually | Each supported workflow backed by existing contracts and scoped permissions |
| 6 | Administration/catalog screens individually | Existing configuration/access workflows verified |
| 7 | Cross-platform, accessibility, performance, release checks | Physical-device evidence and configured build/release validation |

Each task in the catalog below is a separate instruction boundary unless the user groups tasks into an explicit phase. Prefer 1–5 implementation files; update PROGRESS at the end. Split again if scope grows. Do not start the next task automatically. Next recommendation: validate the navigation preview on a rebuilt native client; proceed only with the user's next scope.

## Web route inventory

Role abbreviations: MA admin; MM mill manager; MO operator; PO procurement; CM customer manager; EO export; SV stock viewer. “Authenticated” means no additional role restriction at route level; inspect page/backend permission checks too.

| Done | Feature / web routes | Web evidence and route access | Group |
| --- | --- | --- | --- |
| [ ] | Landing `/` | Public source page; Phase 9 native sections/controls/local simulators implemented and checked; device acceptance pending | Landing |
| [ ] | Sign-in `/sign-in` | SignInPage + token login; email/password, remember-me, return path | 1 |
| [ ] | Recovery `/forgot-password` | Request-code and explicit OTP/new-password steps/API/fixtures implemented; live email/OTP/password-policy/native acceptance pending | 1 |
| [ ] | App layout, protected navigation, company context | AppLayout, header/sidebar, ProtectedRoute; authenticated | 1–2 |
| [ ] | Role dashboard `/home` | Phase 8 summary/read integration implemented and fixture checked; live/device acceptance, offline queue metric and navigation into future workspaces pending | 2 |
| [ ] | Profile `/settings/profile` | EditProfilePage + profile GET/PUT; authenticated | 2 |
| [ ] | Theme/language/minimal mode/drafts/connectivity | UI/draft stores, vi/en messages; browser persistence needs adaptation | 1–3 |
| [ ] | Notifications/search/feedback | NotificationCenter uses ledger API; GlobalSearchModal, FeedbackHost; review search behavior before porting | 2, per task |
| [ ] | Farmer registration `/field/farmers/new` | FarmerRegistrationPage; PO/MA; procurement API includes duplicate check | 3 |
| [ ] | Plots/seasons `/field/plots/new` | PlotRegistrationPage; PO/MA; map picker needs native replacement | 3 |
| [ ] | Pesticide declarations `/field/declarations/new` | PesticideDeclarationPage; PO/MA | 3 |
| [ ] | Procurement receipts `/field/receipts/new` | ProcurementReceiptPage; PO/MA; retain clientOperationId | 3 |
| [ ] | Field samples `/field/samples/new` | FieldSampleRegistrationPage; PO/MA | 3 |
| [ ] | Offline queue `/field/sync` | OfflineSyncQueuePage + PWA queue/cache; PO/MA; IndexedDB rewrite | 3 |
| [ ] | Stock `/stock`, `/stock/lots/:lotId` | StockOverviewPage; authenticated, backend scoped access | 4 |
| [ ] | Receiving `/mill/receiving` | ReceivingTasksPage; MO/MM/MA | 4 |
| [ ] | Operations `/mill/operations/new` | OperationEntryPage; MO/MM/MA | 4 |
| [ ] | Corrections `/mill/reconciliations`, `/:id` | CorrectionManagementPage; MM/MA | 4 |
| [ ] | Lab samples `/compliance/lab-samples`, `/new` | LabSampleRegistrationPage LIST/CREATE tabs; CM | 5 |
| [ ] | Lab results `/compliance/lab-results`, `/:id` | MrlComplianceCheckPage; CM; files need native handling | 5 |
| [ ] | Safety margin `/compliance/safety-margin` | SafetyMarginPolicyPage; CM/MA | 5 |
| [ ] | Residue profiles `/compliance/residue-profiles` | ResidueProfilesPage; authenticated; check page permissions | 5 |
| [ ] | Blend decisions `/export/plans/pending`, `/export/plans/:planId/review` | Routes load BlendPlanDecisionsPage despite alias name; CM/EO/MA. `/export/plans` redirects to orders | 5 |
| [ ] | HOLD `/risk/holds`, `/risk/holds/new` | HoldManagementPage; list MM/CM/EO/MA; new CM/MA | 5 |
| [ ] | Events `/events`, `/events/:type/:id` | EventHistoryPage + EventDetailsModal/history parser; authenticated | 5 |
| [ ] | Organizations `/admin/customers` | CustomerOrganizationsPage; MA | 6 |
| [ ] | User access `/admin/access` | UserAccessManagementPage; MA | 6 |
| [ ] | Facilities `/admin/facilities` | FacilityConfigPage; MA; locations/equipment/assignments | 6 |
| [ ] | Balance policies `/admin/balance-policy` | BalancePolicyPage; MA/MM | 6 |
| [ ] | Receiving thresholds `/admin/receiving-thresholds` | ReceivingThresholdsPage; MA | 6 |
| [ ] | Master data `/admin/master-data` | MasterDataPage; MA | 6 |
| [ ] | MRL versions `/compliance/mrl-versions` | MrlVersionsPage; MA/CM/EO | 6 |

## Source gaps and deferred scope

These require a dedicated user instruction and verified contracts before implementation; they are not working web workflows to copy.

- [ ] Invitation `/invite/:token`: page wired, but validation/acceptance methods explicitly unsupported.
- [ ] Password change `/settings/security`: page wired, but authApi.changePassword explicitly unsupported; recovery is the documented alternative.
- [ ] Approved execution `/mill/plan-executions/:planId`: PlaceholderPage (MO/MA).
- [ ] Export orders `/export/orders` and blend request `/export/orders/:orderId/containers/:containerId/plan`: PlaceholderPage (EO/MA), although API wrappers exist.
- [ ] Containers `/export/containers`, `/:id/loading`, `/:id/closure`: PlaceholderPage (EO/MA); do not infer loading/closure contracts from descriptions.
- [ ] Dossiers `/export/dossiers`, `/export/containers/:id/dossier`: PlaceholderPage (EO/MA).
- [ ] Traceback `/risk/traceback`: PlaceholderPage (CM/EO/MA), although ledger trace wrappers exist.
- [ ] Registration/verification/resend/reset and Google auth wrappers exist without corresponding dedicated web routes in the audited route tree. Native reset now consumes the existing wrapper inside /forgot-password, without adding a URL. Native OAuth callback/token exchange remains unverified.
- [ ] Operator sidebar and dashboard shortcut `/mill/corrections/new` have no matching route in the audited tree. Resolve during navigation migration; do not reproduce a dead link.

## Independent task catalog

Each item delivers one reviewable slice and uses the per-screen acceptance gate below. Implement contracts before their screen; add shared components only when consumed. Tasks involving large page-local rules must be split further after focused inspection.

### Phase 9 Landing only

- [x] L1 Audit Landing screen/components/hero locale keys, public access, source CTA paths and absence of HTTP dependencies.
- [x] L2 Migrate all page sections, responsive layout, theme/locale controls, measured section navigation and auth-aware entry buttons. Later user-requested redesign replaces Landing glass decoration with minimal iOS-inspired grouped surfaces; behavior is retained.
- [x] L3 Preserve local ledger presets/inclusive tolerance and all 12 MRL demo cells; add honest empty/invalid/demo-result states and fixture checks. No production business actions/API added.
- [ ] L4 Validate light/dark/system, large text, keyboard, sticky-header/section positioning, reduced motion and stakeholder/simulator controls on native devices; fix observed Landing defects only.
- [ ] L5 Verify anonymous/authenticated CTA and back navigation on devices with the existing real auth flow.
- [ ] L6 Add incoming external section-hash/deep-link handling only if that Landing parity task is requested; current native in-page navigation is implemented.
- [x] L7 Implement user-requested minimal iOS HIG presentation: neutral light/dark, sans Large Title, quiet grouped controls/disclosures, compact preferences and no ambient gradient/content shadows. Compilation/regression/contrast checks pass; L4/L5 native visual/interaction acceptance stays open.

### 1. Foundation and authentication

- [x] 1.1 Define semantic light/dark tokens and status/disabled colors; validate text/control color pairs. Phase 3 delivered; loading/error UI remains a shared-control task.
- [ ] 1.2 Provider, persisted modes and navigation integration implemented in Phase 3; live switching/restoration acceptance remains pending because browser verification was blocked.
- [x] 1.3 GlassView/GlassCard implemented with opaque fallback and shared blur handling; native visual acceptance remains pending.
- [x] 1.4 GlassButton implemented with focus/pressed/loading/disabled behavior and minimum touch height; device interaction acceptance remains pending.
- [x] 1.5 GlassInput labels/errors/ref/autofill implemented; Phase 6 adds a password visibility switch in login. Device keyboard/screen-reader acceptance remains pending.
- [x] 1.6 Phase 6 contracts plus Phase 7 centralized Axios/environment/normalized errors/source query serialization implemented; fixture checks pass. Only profile read is an example service; live integration remains pending.
- [ ] 1.7 Phase 6 SecureStore refresh persistence and backend-refresh hydration implemented; native restart/remember-me/account-isolation acceptance pending.
- [x] 1.8 Phase 6 bearer client, single-flight refresh and bounded retry implemented; concurrent 401/failure fixture checks pass. Deployed backend acceptance remains pending.
- [ ] 1.9 Phase 6 Glass sign-in implemented with validation/loading/errors; live success/error and native keyboard acceptance blocked/pending.
- [ ] 1.10 Phase 6 protected tabs, role predicates, safe return paths and logout implemented; revocation, native back/deep links and future domain cache clearing need acceptance.
- [ ] 1.11 Forgot-password screen/API, sign-in entry/back and privacy-preserving success/error controller implemented; nine fixture groups pass. Complete configured-backend email/account-privacy and native keyboard/back/theme acceptance before checking off.
- [ ] 1.12 PasswordRecovery task audited wrapper/no web consumer; native OTP/new-password form, public API and eight fixture groups implemented within /forgot-password. No guessed OTP/password policy. Complete deployed policy/expiry/reuse/revocation and native keyboard/autofill/navigation acceptance before checking off.

### 2. Navigation, dashboard and account

- [ ] 2.1 Role/permission route registry and primary navigation; resolve dead/default/placeholder destinations.
- [ ] 2.2 Safe-area screen/header/company context; verify narrow screens and long organization names.
- [ ] 2.3 Reusable loading/error/empty/retry states and feedback host; verify screen-reader feedback.
- [x] 2.4 Phase 8 config/source schemas/decimal aggregation ported; seven-role/partial/count/permission fixture checks pass.
- [ ] 2.5 Phase 8 session/facility-scoped resource hook and selection/focus/foreground refresh implemented; native lifecycle/facility acceptance pending.
- [ ] 2.6 Phase 8 GlassStatCard and summary/loading/error/empty/refresh UI implemented; live API and native theme/interaction acceptance pending.
- [ ] 2.7 Phase 8 charts/priorities/recent rows and source-permission-filtered task names implemented. Unmigrated workspace actions remain disabled, offline queue metric unavailable; live seven-role acceptance pending.
- [ ] 2.8 Profile read/edit with source validation; verify persisted API changes.
- [ ] 2.9 Account theme/language/minimal-mode preferences; verify restart and vi/en behavior.
- [ ] 2.10 Notifications list/paging/read action; verify scoped API results and unread state.
- [ ] 2.11 Search destination UI forwarding queries to stock/events; verify query propagation without a new endpoint.

### 3. Field and offline procurement

- [ ] 3.1 Native owner-scoped draft/reference-cache adapter; verify switching accounts cannot expose another owner's records.
- [ ] 3.2 Farmer list/search/detail adapter and UI; validate unknown response using source page.
- [ ] 3.3 Farmer create/edit/duplicate handling; preserve source delete rules if exposed.
- [ ] 3.4 Plot list/detail and farmer/season lookups; verify source relationships.
- [ ] 3.5 Plot create/edit with native coordinate picker; verify source geometry and validation.
- [ ] 3.6 Crop-season and plot-season maintenance; verify association/update/delete contracts independently.
- [ ] 3.7 Pesticide declaration form; verify substances, units, dates and existing submission payload.
- [ ] 3.8 Procurement receipt lines/decimal totals and draft UI; verify source calculation rules.
- [ ] 3.9 Online receipt submission/results and receiving options; retain clientOperationId.
- [ ] 3.10 Field sample capture screen; preserve reference linkage and chain-of-custody inputs.
- [ ] 3.11 Durable procurement queue adapter; verify restart retention and operation-ID stability.
- [ ] 3.12 Foreground/manual sync engine; verify retry deduplication and stop on identity change.
- [ ] 3.13 Offline queue screen and connectivity indicator; verify failures, pending counts and manual retry.

### 4. Stock and mill ledger

- [ ] 4.1 Stock list/filter/paging; verify tenant/facility grants and mass formatting.
- [ ] 4.2 Lot detail/positions/restrictions; preserve source detail behavior and allowed actions.
- [ ] 4.3 Receiving task list/detail and facility context; verify role-scoped visibility.
- [ ] 4.4 Receiving measurement entry; verify units, source validation and backend rejection details.
- [ ] 4.5 Receiving review/reconciliation actions; verify authorized transitions.
- [ ] 4.6 Operation lookups/draft/input-output lines; preserve decimal math and server policy inputs.
- [ ] 4.7 Operation submission/confirmation/commit actions exposed by the source page; verify mass-balance rejection.
- [ ] 4.8 Correction list/detail with source state model; verify access and existing operation linkage.
- [ ] 4.9 Correction reconcile/commit/cancel actions; verify transition errors and refresh.

### 5. Compliance, risk, audit and blend decisions

- [ ] 5.1 Lab sample list/detail; verify filters and source scopes.
- [ ] 5.2 Lab sample capture and handovers; preserve chain-of-custody contracts.
- [ ] 5.3 Lab report list/detail/results; preserve MRL/assessment and version evidence.
- [ ] 5.4 Lab report create/edit and native file attachment; verify multipart requirements.
- [ ] 5.5 Lab report confirm/delete/file viewing; verify allowed transitions and authenticated file access.
- [ ] 5.6 Safety-margin policy read/edit; preserve version/effective-date rules from source.
- [ ] 5.7 Residue profile list/detail; verify version and company permission scope.
- [ ] 5.8 Residue profile publish/bind/retire actions exposed by source; verify source action contracts.
- [ ] 5.9 Residue policy settings and report-selection/review workflows; split per action after page inspection.
- [ ] 5.10 HOLD list/detail and restricted-lot context; preserve statuses.
- [ ] 5.11 HOLD creation and authorized response actions; verify source transitions and errors.
- [ ] 5.12 Event history list/filter/paging; reuse strict parser and query types.
- [ ] 5.13 Event detail/deep link and structured payload presentation; avoid fabricated verification fields.
- [ ] 5.14 Blend decision list/proposal/detail; follow routed BlendPlanDecisionsPage.
- [ ] 5.15 Blend approve/reject/revoke actions; preserve versions, permissions and stale-plan feedback.

### 6. Administration and catalogs

- [ ] 6.1 Organizations list/create; verify OrganizationKind and identity.manage scope.
- [ ] 6.2 Users/roles list and access update; verify organization assignment and disabled-user behavior.
- [ ] 6.3 Facilities management; preserve existing active/retirement behavior.
- [ ] 6.4 Locations/equipment management; split forms and lifecycle actions per entity.
- [ ] 6.5 User-facility assignments and clearance; verify exact wrapper methods and page rules.
- [ ] 6.6 Balance policies; inspect source then migrate each policy form independently.
- [ ] 6.7 Default/company receiving thresholds and history; verify override/effective rules.
- [ ] 6.8 Master-data lists; source-driven adapters for each catalog family.
- [ ] 6.9 Master-data edit/actions; one task each for substances, markets, commodities, attributes, varieties and units.
- [ ] 6.10 MRL version list/detail/limits; preserve response envelopes and resolved version.
- [ ] 6.11 MRL create/import and per-substance limits; verify decimal limits and source import rules.
- [ ] 6.12 MRL publish lifecycle; verify authorized transitions and immutable evidence.

### 7. Verification and release

- [ ] 7.1 Resolve remaining baseline typing/lint errors in affected files; complete whole-project checks.
- [ ] 7.2 Native device auth/session/offline acceptance with real backend and accounts.
- [ ] 7.3 Per-screen theme/accessibility/keyboard/back-navigation review on iOS and Android.
- [ ] 7.4 Profile list rendering, blur and startup performance on representative devices.
- [ ] 7.5 Configure/validate EAS build profiles and release settings when release scope is authorized.

Source-gap features above have no implementation task until contracts and product scope are confirmed. No future task is authorized by this planning document alone.

## Per-screen acceptance

- Use source request fields, validation, decimal values, enums and permission rules; validate unknown responses using source consumers.
- Implement loading, empty, error/retry, submission and success behavior; distinguish unsupported actions.
- Verify light/dark, safe areas, keyboard, back navigation, large text and touch targets on iOS/Android.
- Run lint/typecheck; exercise live backend flows when configuration/accounts are available. Do not mark runtime checks passed from static inspection.
