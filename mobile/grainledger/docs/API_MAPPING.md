# API mapping

Evidence: read-only web client audit, 2026-11-16; focused Phase 7 review of `client.ts`, `config.ts`, `query.ts` and `profile.ts` on 2026-11-17. The example backend origin was previously unreachable; no live origin/account is configured. This is client contract evidence, not backend-code verification or a complete schema. Inspect each feature before porting; preserve `unknown` until validated.

Current task: Landing visual redesign toward minimal iOS HIG. No API/service/auth contract changes. Existing PasswordRecovery/login/session/logout and prior dashboard integration remain intact; other domain APIs remain an audit index.

## Phase 9 PasswordRecovery: OTP and new password

- Source evidence: `api/auth.ts` exports resetPassword and ResetPasswordRequest; `api/client.ts` classifies reset-password as an authentication endpoint that bypasses protected refresh. Focused search across web src found no reset consumer/route/schema. `authSchemas.ts` has different sign-in/invitation/change-password policies; none is established as reset policy. This task adds a native consumer under the user's PasswordRecovery scope, not a copied web reset screen.
- Exact API: POST `/api/auth/reset-password`, JSON `{email,otp,newPassword}` → void. `client.resetPassword` uses the same anonymous transport as request-code; no bearer, cookies, CSRF guess, protected retry, token grant or session/storage changes. Only email is trimmed/case preserved; OTP/password remain verbatim. Response body is not used as an identity or login grant. Empty 200/202/204 is supported; HTML/malformed JSON remains rejected.
- UI checks required email/HTML-email format, nonblank OTP and nonempty password. It imposes no undocumented OTP length/numeric restriction, password minimum/complexity or expiry. Backend policy/validation remains authoritative; invitation/change-password schema is not silently reused. Generic rejection prompts checking email/code/password without exposing server account/OTP detail.
- The existing public `/forgot-password` route now has an explicit code-entry step reachable both before and after generic request acceptance. No new URL/query parameter or automatic transition after request-code success. Email is prefilled in memory and editable. Request another code returns to the existing form; it does not automatically send mail, create a cooldown or bypass backend throttling. Back still dismisses to existing sign-in and preserves its existing stack entry/return URL when present.
- `password-reset.ts` owns idle/invalid/loading/success/error, duplicate coalescing and abort/stale suppression. Its snapshots contain only status/field error categories, never email/OTP/password/raw server details. `PasswordResetForm.tsx` uses existing glass/theme/fallbacks, autofill, password visibility, keyboard focus order, local VI/EN, retry and success/back. OTP/password are cleared after a valid submission settles and discarded when the form unmounts; no persistence, params or logging. Timeout/network failures have uncertain outcome: try sign-in before resubmission. No automatic mutation retry.
- Success is shown only after successful reset HTTP response, independently of request-code acceptance. It does not auto-login or claim that other sessions were revoked; deployed reset semantics and revocation still require verification. Aborting a request cannot reverse a reset already processed by the server.
- `node scripts/check-password-reset.cjs`: eight groups cover source wire contract/opaque values, validation, void success/no grant, rejected responses/privacy/no retry, existing-session isolation, duplicate/copied payload, safe errors/manual retry and abort/stale results. Recovery/Auth/API regression checks also pass. Route/platform bundle checks are compilation/delivery, not interaction acceptance.
- Live blockers: no configured API origin/disposable accounts, so no real OTP was consumed or password changed. Verify backend password policy, OTP format/expiry/reuse, actual mail delivery, invalid/expired-code responses, rate limits, cookie/CSRF/CORS and session revocation. Native rendering/keyboard/back/autofill and interactive navigation remain pending; browser host is unavailable. Automatic reset email links are not implemented because no callback contract is present in source.

## Phase 9 Auth: request-code baseline

- Focused source review: `features/auth/pages/ForgotPasswordPage.tsx`, sign-in recovery link, public route declaration, `api/auth.ts`, auth adapter/schema and relevant VI/EN auth keys. Sign-in/session/logout/role guards are already implemented; this is the first actionable unfinished Auth screen. Invitation and authenticated password change are explicitly unsupported by the source adapter. Reset has a wrapper but no dedicated route/consumer in the audited route tree.
- Public `/forgot-password` requires no role or authenticated user, matching web. Sign-in pushes this route; Back uses Router `dismissTo('/sign-in')`, with replacement if sign-in is absent from the stack. Existing protected tabs/role checks remain authoritative. No password/email/query token is put in navigation parameters.
- Exact contract: POST `/api/auth/forgot-password`, JSON `{email: trimmedEmail}` → void. Do not lowercase. Source uses required HTML `input[type=email]`; native uses Zod's `regexes.html5Email`, including single-label domains, rather than imposing sign-in's stricter email policy. Blank/malformed values do not send HTTP.
- `client.forgotPassword` uses the same private Axios transport, without a bearer argument or cookie credentials. It bypasses authenticated request/refresh handling; recovery 401/403 cannot refresh, log out or modify a live session/secure storage. This follows the public source route, but anonymous/cookie/CSRF compatibility still needs deployed/native verification. No SecureStore substitute for HttpOnly cookies was added.
- Empty successful 200/202/204 is accepted; no required response fields are invented. Incidental JSON success bodies are ignored. HTML fallback/malformed JSON is rejected by the shared transport. The screen shows one privacy-preserving accepted message for every successful request, regardless of account existence; it never claims confirmed delivery or a changed password.
- `password-recovery.ts` manages idle/blank, invalid, loading, accepted and error states separately from auth/data resources. Pending submissions coalesce. The original accepted screen only linked Back; the subsequent PasswordRecovery task adds an explicit code-entry action described above. No automatic retry, fabricated resend timer or cooldown. Explicit retry is available after failures. Exiting aborts transport and ignores stale completions, but cannot undo a request already received by the server.
- UI only receives configuration/network/timeout/rate-limit/generic request categories; it does not retain/render backend ProblemDetails or account-existence payloads. Email remains in screen/operation memory, not storage, route params or logs. Missing API origin disables submission and displays service unavailable. Existing shared glass controls/theme, safe area and keyboard behavior are reused; locale is recovery-local.
- `node scripts/check-password-recovery.cjs`: nine fixture groups cover the exact wire request, accepted body variants, rejected responses, session isolation, duplicate submissions, validation, explicit retry, cancellation/stale results and safe error state. Prior 15 auth/12 API groups still pass. HTTP route/eager platform bundles compile; interaction is not established by compilation.
- Remaining acceptance: configured reachable API; compare registered/unregistered disposable accounts' status/message policy; actual email/OTP delivery, backend throttling, CORS and native cookie/CSRF behavior. No live request was made because only `.env.example` exists and no API origin is configured. Browser review is blocked by unavailable browser host; native keyboard/back/light/dark/accessibility remain unverified.
- Original Auth task deferred OTP reset; its native consumer is now implemented by the PasswordRecovery task above, with live policy verification still pending. Invitation/change-password/registration/OAuth/profile editing remain outside this scope.

References used for this task: [Expo SDK 58 Router](https://docs.expo.dev/versions/v58.0.0/sdk/router/), [React Native TextInput](https://reactnative.dev/docs/textinput), [KeyboardAvoidingView](https://reactnative.dev/docs/keyboardavoidingview), [Zod email patterns](https://zod.dev/api#emails).

## Phase 9 Landing contract and permissions

- Latest presentation-only update uses neutral grouped surfaces/disclosures and feature-local controls. Appearance/language preferences move behind the header ellipsis. All prior content, source demo calculations, auth-aware CTA paths and public/API-free semantics below remain unchanged; see DESIGN_SYSTEM for the iOS-inspired composition.
- Original sources: `features/landing/pages/LandingPage.tsx`, its eight components, and only the landing hero/sign-in keys in `app/i18n/locales/{vi,en}.json`. The page is public `/`, with no role restriction or direct HTTP dependency. Auth state only selects `/sign-in` versus `/home` for CTA buttons.
- Mobile `/` now renders `features/landing/LandingScreen.tsx`. Sticky header, hero, problem context, four technology pillars, comparison, two simulators, four selectable stakeholders and footer/CTA are present. Section/footer anchors use measured native scrolling; no DOM/window/hash listener or new route family.
- No backend integration applies to Landing itself. No invented health, contact, statistics, simulation or MRL endpoint was added. Existing app-level theme/auth hydration and authenticated destinations remain unchanged; login still uses the Phase 6 real service when configured.
- `landing-data.ts` contains source public/static marketing content and the exact historical SRS MRL demonstration matrix: TCZ/IPT/HXC × EU/USA/JAPAN/KOREA. These are not backend responses or a current regulatory feed. Static stakeholder examples remain explicitly illustrative; no device queue, stock or shipment data is fabricated.
- `landing-model.ts` preserves the demo presets 100000/88000/12000 and 100000/92000/12000, absolute variance and inclusive input×0.005 tolerance. A private Decimal clone provides precise arithmetic without changing another feature's Decimal configuration. Native input accepts decimal dot/comma; blank/invalid/non-finite values show an empty/error state instead of a fabricated balanced zero. This is not an operational ledger policy/validation change.
- MRL illustration compares each fixed measured value to the source safeMargin, not just the raw MRL limit. All twelve cells retain source values and the 20% margin. Results never claim that a ledger entry was posted, a compliance certificate issued or shipment loading authorized.
- Landing has no network loading/empty/error workflow to fake. Static content is ready; demo empty/invalid/balanced/rejected and compliant/non-compliant states are local. Theme-storage failures surface through the existing provider with retry. No asynchronous success/loading timer was introduced.
- Vietnamese source content and existing translated hero strings are retained; remaining English copy translates those concepts. Locale selection is Landing-local; appearance uses the global persisted system/light/dark provider. Current marketing figures/standards are presented as source-project context/references, not independently verified current facts.
- `node scripts/check-landing.cjs`: nine groups validate presets, inclusive tolerance, exact decimals, invalid/empty input, all MRL cells/safety comparison, content in both locales, CTA paths and sticky-header-relative section selection. Bundle delivery does not verify native touch/keyboard/blur behavior.
- Native section buttons are implemented. Incoming external hash-fragment links to a section are not implemented; decide that follow-up within Landing if required. Browser visual review remains blocked by 'The browser access host is unavailable'. No unrelated feature was migrated.

## Transport and authentication

- Web `config.ts`: `VITE_API_BASE_URL` is an origin with trailing slashes removed; paths already include `/api`. Mobile requires an explicit selected API origin, without `/api`, through the Phase 7 environment configuration below. It is currently unconfigured. No same-origin/native localhost fallback or secrets in public configuration.
- Web `client.ts`: bearer injection, proactive expiry handling, single-flight rotating refresh, one retry after a protected request returns 401, logout on failed refresh. Adapt cookie/store dependencies and connectivity reporting.
- Preserve JSON, multipart/FormData, text/blob, empty 204/205 and `application/problem+json` handling. `ProblemDetails` has optional nullable type/title/status/detail/instance; network errors use status 0.
- `query.ts` skips null/undefined/empty values and repeats array keys. `ApiPage<T>` is items/page/pageSize/totalCount/hasMore; not every endpoint uses this envelope.

## Phase 7 infrastructure and usage

- `src/services/api/http-client.ts` owns one private Axios instance per auth controller; Axios ^1.21.1 installed via `expo install`. The fetch adapter is explicit to preserve cookie omission across web/native requests. Timeout is 12 seconds; redirects request fetch error behavior; credentials are omitted again at the fetch boundary. Native cookie/redirect semantics still require device verification.
- The transport accepts only relative `/api/` paths, rejects traversal/absolute/encoded path escapes, strips caller Cookie/Authorization, and injects only the controller's bearer. No token getter or independently refreshing interceptor was added. `client.api.request(path, {method,data,query,headers,signal,responseType})` is the authenticated service entry point; login/refresh/logout use the same underlying transport internally.
- The Phase 6 controller remains the sole refresh coordinator: proactive expiry handling, single rotating refresh, one 401 retry, no 403/network/5xx retry. Canceled callers cannot abort another caller's refresh. Responses after logout/session replacement are rejected. A mutation may be replayed once on 401, matching the source client; domain-specific idempotency remains per-feature work.
- JSON remains `unknown` until a service validates it. Malformed JSON/HTML fallback is a contract error; 204/205 and empty responses yield undefined. Explicit text/blob responses are supported. JSON bodies serialize through Axios; FormData retains runtime-generated multipart boundaries. Query arrays repeat keys and empty values are skipped, matching the web helper. Native file/large-transfer validation remains deferred.
- `errors.ts` exports ApiError, normalizeApiError and the source ProblemDetails fields. Errors expose message/status/code/problem and derived retryable; they omit Axios config, request, response, raw body and credentials. HTTP status is authoritative; detail/title are validated strings. Cancellation, timeout, network, HTTP, configuration and contract errors stay distinct. AuthError is a compatibility alias of ApiError. No assumed field-validation envelope was introduced.
- `src/state/async-resource.ts` defines idle/loading/success/error snapshots. Starting/retrying clears old data/error; reset aborts and returns idle; superseded completions cannot overwrite current state. Cancellation is not rendered as a server error. Each resource owns its loading state; no global pending flag or automatic error retry.
- `src/hooks/use-api-resource.ts` subscribes with useSyncExternalStore and scopes resources to auth generation/user/organization/role/permissions. Login/logout/access changes replace the resource before rendering; token rotation alone preserves scope. The hook loads on mount, aborts on unmount/scope change, and exposes reload/reset/isLoading. Pass a stable loader. No query cache or persisted API response store was added.
- `src/services/profile.ts` is the only example: `createProfileService(client.api).getProfile(signal?)` performs actual source GET `/api/profile` and validates SessionUserDto with the existing auth parser. No profile editing screen or PUT service was migrated. It is ready for consumption, not automatically called by placeholders.

Example for a later authorized screen (React useMemo, useAuth and these exports):

```tsx
const { client } = useAuth();
const profile = useMemo(() => createProfileService(client.api), [client]);
const state = useApiResource(profile.getProfile);
// Render a fallback for idle/loading, state.error.message for error, or state.data on success.
// state.reload() retries explicitly; state.reset() cancels and clears this resource.
```

### Environment selection

`config.ts` statically references public variables so Expo can inline them. EXPO_PUBLIC_APP_ENV selects development/staging/production; absent means development in dev mode, production in release. Explicit EXPO_PUBLIC_API_BASE_URL wins; otherwise only the corresponding `_DEVELOPMENT`, `_STAGING` or `_PRODUCTION` URL is selected. Missing/invalid selection fails closed without falling back to another environment.

Use ignored `.env.local` for local development, or set values in the build environment. Set APP_ENV and the appropriate URL explicitly for staging/release, and remove an unintended general override. All URLs are origin-only; staging/production and every release build require HTTPS. HTTP is allowed only with APP_ENV=development in a dev runtime, without disabling platform transport rules. No real deployment URLs were supplied or guessed.

SDK 58 loads standard `.env.development`/`.env.production` and their local variants; `.env.staging` is not auto-loaded. Use APP_ENV=staging in a supported file/build environment. Do not use NODE_ENV as an API selector. The optional Node probe reads shell variables, not Expo dotenv files.

Validation: `node scripts/check-api.cjs` passes 12 groups, including a local stalled HTTP fixture for timeout/cancellation and fixture profile/auth/state checks. Existing 15 auth groups also pass through Axios. The optional live probe now verifies the profile service before/after refresh when configured; currently skipped. Hook rendering and native behavior are not established by these controller tests.

References: [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/), [Expo environment variables](https://docs.expo.dev/guides/environment-variables/), [Axios fetch adapter](https://axios.rest/pages/advanced/fetch-adapter), [request config](https://axios.rest/pages/advanced/request-config), [error handling](https://axios.rest/pages/advanced/error-handling).

| Action | Existing method/path | Request → response from source |
| --- | --- | --- |
| Native credential login | POST `/api/auth/login` | LoginRequest `{email,password}` → IssuedTokens |
| Refresh | POST `/api/auth/refresh` | `{refreshToken}` → IssuedTokens |
| Session | GET `/api/auth/session` | SessionUserDto |
| Profile read/update | GET/PUT `/api/profile` | Update `{displayName,phoneNumber}` → SessionUserDto; see profile.ts |
| Logout / all sessions | POST `/api/auth/logout`, `/api/auth/logout-all` | void; native invalidation semantics require live verification |
| Forgot password | POST `/api/auth/forgot-password` | `{email}` → void |
| Reset password | POST `/api/auth/reset-password` | `{email,otp,newPassword}` → void |
| Register | POST `/api/auth/register` | `{email,password,displayName}` → RegistrationPendingDto |
| Verify email | POST `/api/auth/verify-email` | `{email,registrationId,otp}` → SessionUserDto, not IssuedTokens |
| Resend verification | POST `/api/auth/resend-verification` | `{email,registrationId}` → RegistrationPendingDto |
| Browser-specific flows | POST `/api/auth/web-login`; GET `/api/auth/csrf`; `/api/auth/google`, `/api/auth/google/complete` redirect helpers | Do not substitute browser session responses for native tokens; native Google flow unverified |
| Health | GET `/health` | health.ts checks HTTP success and rejects HTML fallback; no invented JSON body |

`IssuedTokens`: accessToken, refreshToken, tokenType (strings), expiresIn (number|string), user (SessionUserDto).
`SessionUserDto`: id/email/displayName strings; phoneNumber/role/organizationId/organizationName nullable strings; isActive boolean; permissions string[]. Normalize role using source aliases.
`RegistrationPendingDto`: registrationId/email strings, expiresIn number|string.
Web login adapter also accepts PascalCase token fallbacks; retain only if compatibility requires it. Sign-in schema: valid nonempty email, password >=8, rememberMe boolean. Invitation/change-password policies exist but have no supported action contract.

## Phase 6 authentication implementation and cookie boundary

- Source anchors: `src/api/auth.ts`, `src/api/client.ts`, `src/features/auth/api/authApi.ts`, `model/authSchemas.ts`, `src/app/store/authStore.ts`, `src/shared/types/roles.ts`, and auth cookie helpers. No backend endpoints or response fields added.
- `/login` and `/refresh` return explicit IssuedTokens in the source contract. `/web-login` instead returns SessionUserDto; it cannot populate native token storage. Login/refresh bodies remain exactly `{email,password}` / `{refreshToken}`; logout has no body. Ordinary logout never calls `/logout-all`.
- Web helpers write `grainledger_access_token`, refresh/user/session cookies using `document.cookie`, SameSite=Lax, Path=/, Secure on HTTPS. Those client-written cookies are not HttpOnly. Web fetch uses `credentials: include` plus bearer headers. Separate deployed backend Set-Cookie/HttpOnly/CSRF behavior cannot be inferred from these helpers.
- Mobile `src/features/auth/auth-client.ts` coordinates explicit bearer sessions; Phase 7 routes its transport through shared Axios with cookie omission, a 12-second timeout and normalized ProblemDetails errors. Single-flight refresh/one 401 retry remain in this controller. A 403 is surfaced without retry. Native cookie-jar behavior is not proven by fetch configuration or Node tests; no cookie bridge is implemented.
- `contracts.ts` preserves IssuedTokens/SessionUserDto and seven source role aliases, accepts legacy PascalCase token keys, rejects inactive/malformed/cookie-only responses, and uses JWT exp only to schedule refresh. It does not authenticate cached JWT claims or verify signatures locally. The backend-issued user is authoritative.
- Native SecureStore contains only a versioned, origin-bound refresh credential when “Keep me signed in” is selected; access tokens stay in memory. AsyncStorage holds only a non-sensitive active/signed-out restoration barrier. Rotation is persisted before granting access. Storage failures fail closed and cleanup failures are visible/retryable. Web preview is memory-only.
- Startup refreshes the saved credential against the backend before admitting protected routes; no cached user grants access. Expiry, foreground renewal and failed-refresh invalidation are implemented. Network failure during restoration clears the saved session; offline authentication is not supported.
- Logout clears local identity immediately, removes durable credentials, then reports remote failure if applicable. A 200/204 response alone does not prove server refresh-token revocation. If logout relies on a web cookie or CSRF token, backend support for this explicit-token flow must be clarified rather than fabricating a request body.
- Existing Home/Stock/Account routes are authenticated for all seven roles, matching their web route guards. Reusable role/permission predicates are available; role-specific workspace screens/guards remain per-feature tasks. Safe return URLs accept only currently mounted protected destinations.

### Verification and blockers

- `node scripts/check-auth.cjs`: 15 fixture/controller groups pass, including cookie-only rejection, bearer headers, refresh rotation/concurrency, inactive/expired sessions, origin isolation, storage failures, logout races and cleanup. Fixtures do not establish deployed/native compatibility.
- `node scripts/probe-auth.cjs`: skipped because backend origin and disposable credentials are absent. Set selected API environment/URL (or EXPO_PUBLIC_API_BASE_URL override), GRAINLEDGER_AUTH_TEST_EMAIL and GRAINLEDGER_AUTH_TEST_PASSWORD in the shell. Never put test credentials in Expo public variables or source files. The probe uses Axios/Node fetch and memory storage, checking auth plus profile; logs include only status/cookie-presence metadata, never credential values.
- Required live acceptance: JSON token fields/JWT expiry and role DTOs; bearer-only session; rotating refresh/reuse rejection and expiry; Set-Cookie/HttpOnly/SameSite/Secure flags and actual native cookie behavior; logout refresh-token revocation and any CSRF requirements. Verify web-preview CORS separately.
- Required device acceptance: SecureStore cold restart/rotation/deletion, remember=false restart, offline/expired session, logout plus hardware back/deep links, protected return destinations, keyboard and both themes. `localhost` on a physical device is the device; use a reachable configured origin. Transport restrictions remain enabled; no ATS/cleartext bypass was added.
- SDK references: [SecureStore 58](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/), [protected routing](https://docs.expo.dev/router/advanced/protected/), [React Native networking](https://reactnative.dev/docs/network). Rebuild existing development clients after adding expo-secure-store/plugin.

## Permission and navigation mapping

- `ProtectedRoute.tsx` requires isAuthenticated, user and an access-token value, then checks allowedRoles when supplied. Expiry/refresh lives in the client; route-level token presence alone is not token validation.
- `roles.ts` normalizes backend aliases into seven frontend roles; unknown/missing values map to AUTHORIZED_STOCK_VIEWER. Actual resource access still requires backend grants.
- Dashboard `canReadSource` permits a source when any mapped permission matches; stock-viewer stock access is a special case with backend-scoped grants. Examples: identity.manage (organizations/users), platform.configure (setup), lots.read.all/facility/tenant (stock), lots.receive/receiving.reconcile (receiving), conversions.read/write (operations), corrections.reconcile/conversions.write (corrections), holds.manage/process (holds), farms.write/read (farmers/plots), purchases.write (procurements), lab.write/read (labs/samples), export-orders.read (orders).
- `AppSidebar.tsx` first builds role-specific navigation, then appends blend decisions for export-orders.read and residue profiles for any of residue.policy.manage, residue.company-policy.manage, residue.evaluate, residue.evidence.manage. This differs from route-role guards; reconcile route, shortcut and backend access per destination rather than treating the sidebar as an authorization policy.
- Sign-in submission honors returnUrl or ROLE_DEFINITIONS.defaultPath; the already-authenticated redirect effect defaults to `/home`. Several role defaults lead to placeholders. Define safe existing mobile destinations during navigation migration.
- `GlobalSearchModal.tsx` forwards `?search=` to `/stock` or `/events`; no standalone search API exists in that component.
- `/mill/corrections/new` appears in both operator sidebar and dashboard but is absent from routes.tsx.

## Reusable contract names

- auth.ts: LoginRequest, IssuedTokens, SessionUserDto, ForgotPasswordRequest, ResetPasswordRequest and registration/verification DTOs.
- admin.ts: OrganizationDto, AdminUserDto, CreateOrganizationRequest, UpdateAccessRequest, OrganizationKind.
- procurement.ts: FarmerInput/PlotInput/PlotSeasonInput; RegisterFarmerRequest/RegisterPlotRequest/RegisterPlotSeasonRequest/RegisterProcurementRequest; ProcurementResponse/ProcurementSummary/ProcurementListResponse/ProcurementReferenceResponse; duplicate, season, spray and line-input types.
- ledger.ts/history.ts/query.ts: RecordOperationRequest, HoldRequest, LedgerNotification/NotificationQuery, evidence/trace/residue request types; LedgerHistoryEntry/Page/Query; ApiPage/PageQuery.
- compliance.ts: CaptureSampleRequest, RecordSampleHandoverRequest, CaptureLabReportRequest, ConfirmLabReportRequest, LabReportResponse/ListResponse, LabResultResponse/SetResponse and nested inputs.
- catalogs.ts: ActiveSubstanceDto, MrlVersionDto/ListResponse, MrlLimitDto/ListResponse, catalog create/update/import/upsert request types.
- residue.ts: ResidueProfileVersion/Binding/Retirement, ResiduePolicySettingVersion/Batch, ResidueReportSelection/ReviewRequest/ReviewRow, ResidueSourceGroupVersion.
- exports.ts/planning.ts: ExportOrderSummary, ExportContainerDto, CandidateQuery/LineageQuery/ResidueQuery; BlendPlanDraftDto/Proposal/Decision and preview/propose/approve/reject/revoke request types.

These interfaces can be extracted without UI code; names alone do not prove native transport compatibility or backend deployment support. Business-logic reuse and dependencies are indexed in PROJECT_CONTEXT.

## Dashboard: existing resource reads, no dashboard endpoint

Source: `src/features/dashboard/api/dashboardApi.ts`, `model/dashboardConfig.ts`, `model/dashboardData.ts`, `model/useDashboard.ts`.

| Source | GET path |
| --- | --- |
| organizations / users / setup | `/api/admin/organizations`, `/api/admin/users`, `/api/ledger/setup` |
| stock / receiving / operations | `/api/ledger/lots`, `/api/ledger/receiving-tasks`, `/api/ledger/operations` |
| corrections / holds | `/api/ledger/corrections`, `/api/ledger/holds` |
| farmers / plots / procurements | `/api/farmers`, `/api/plots`, `/api/procurements` |
| labs / samples / orders | `/api/lab-reports`, `/api/samples`, `/api/export-orders` |
| facility lookup | `/api/ledger/lookups` → facilities `{id,name}[]` |

- Use source-specific Zod validation. Collections accept arrays or `{items,totalCount?,hasMore?}`; setup is facilities/locations/equipment arrays, flattened with setupKind.
- Default paginated requests: page=1, pageSize=25, excluding organizations/users/setup. Stock sorts quantity desc; operations occurredAt desc. Preserve partial-data/count semantics; failed/malformed data must not become a zero KPI.
- MM/MO need facility selection; lookup runs only with platform.read. Scope stock/receiving/operations/corrections/holds as in source and filter stock positions by facility. Missing permission/assignment or failed lookup must not trigger unscoped mill reads.
- Web cache keys include user, organization, role, sorted permissions and facility. Mobile uses those auth/access values through useApiResource plus the selected-facility loader identity; no response cache was added. Tab focus and AppState active refresh only when the last attempt is at least 30 seconds old.

### Phase 8 dashboard implementation

- Source reviewed only: dashboard API/config/data/hook/page/widgets and their imported decimal formatter/role labels. Mobile copies compatible config, bilingual copy, status predicates, charts, lists and mass aggregations into `features/dashboard/model/`; no runtime web imports.
- `features/dashboard/api/dashboardApi.ts` owns strict source schemas/actual paths and creates the service bound to current user/access. Only config-listed sources passing canReadSource are requested; the stock-viewer backend-scoped exception is preserved. Shortcuts keep the original independent OR-permission policy.
- `loadOverview` refreshes assigned facilities for mill roles, validates the selected ID against that list (fallback first assigned), then reads allowed sources concurrently. Each source failure is separate from success, absent data stays absent, and updatedAt is complete only if all requested sources succeed. Facility changes cancel/replace the previous resource; previous identity/facility results are never reused.
- `DashboardScreen` replaces only `/home`. It renders four role metrics, source distribution, priorities (up to five), recent records (up to six), facility choice and source-filtered task names, with loading/refresh/empty/error/no-access/missing-facility states. English/Vietnamese dashboard copy is selectable locally; this is not global app language migration.
- Totals and samples retain source semantics: predicate/mass/chart values aggregate only loaded records; unfiltered counts use totalCount when known. scopeNote identifies partial datasets. Mass remains Decimal with precision 28/ROUND_HALF_UP and three displayed decimals; only visual bar ratios become numbers. Vietnam calendar boundaries are unchanged.
- The mobile offline procurement queue is not implemented. Its metric receives null and shows unavailable, not a fabricated zero; no fake offline priority is generated. This also prevents an unsupported all-clear priority claim for procurement.
- Existing business destinations remain unmigrated (including Stock's placeholder). Records/priorities are read-only and authorized task buttons are disabled with an availability explanation; no dead links or new placeholder modules were added. Refresh, facility selection and dashboard language selection work independently of these destinations.
- Installed decimal.js ^10.6.0 and patched Zod ^4.6.7 using expo install. Schema fields match the source; Zod record syntax was adapted to v4. The source's Zod 3 version was flagged high by npm audit; final install returns to the eight pre-existing moderate findings, without unrelated dependency fixes.
- `node scripts/check-dashboard.cjs`: ten groups cover seven role/source mappings, permissions/shortcuts, facility gates/position filtering, strict DTOs, decimal/partial/count semantics, status-based summaries, Vietnam dates, failed-source refresh, stale facility completions and the actual dashboard endpoint through authenticated Axios. Fixtures are test-only; no default data is bundled.
- Live reads remain unverified: no API origin or disposable account is configured. Browser visual inspection could not start because the browser access host is unavailable; native light/dark/blur/large-text/facility/pull-to-refresh checks remain pending. Dashboard navigation actions await their separately authorized workspace migrations.

## Domain contract index

Paths below are resource families/examples, not permission to implement every action. Methods and nested payloads must be copied from the referenced source.

| Web source | Existing families / behavior | Mobile concern |
| --- | --- | --- |
| admin.ts | `/api/admin/roles`, `/organizations`, `/users`, PUT `/users/{id}/access` | Preserve OrganizationDto/AdminUserDto; verify permission scope |
| procurement.ts | `/api/procurement-reference-data`, `/source-lots/{id}`, `/farmers`, `/plots`, `/crop-seasons`, `/plot-seasons`, `/spray-declarations`, `/procurements` | Duplicate checks; copy RegisterProcurementRequest, summary/response/reference types; owner-scoped durable queue |
| ledger.ts | `/api/ledger/setup`, `/lookups`, `/lots`, `/facilities`, `/locations`, `/equipment`, `/assignments` | Facility/owner scope, typed adapters for unknown responses |
| ledger.ts | `/operations` and confirm/commit; `/corrections` and reconcile/commit/cancel; `/holds` and respond | Preserve action state and backend rejection details |
| ledger.ts | `/receiving-tasks`; `/receiving/{id}` with measurements/reviews | Follow wrapper methods; facility and mass rules |
| ledger.ts, history.ts | `/api/ledger/notifications` and `/{id}/read`; `/api/ledger/history` | Preserve history parser/query, paging and event details |
| ledger.ts | policies/compatibilities/mixed-bulk-policies/transfers/evidence/receiving-thresholds; trace/from-lab/starts; lot residue evaluation/preview | Scope to feature task; standalone traceback UI is currently placeholder |
| compliance.ts | `/api/samples` and handovers; `/api/lab-reports` CRUD/file/confirm | Multipart/file upload/download and source LabReport types |
| catalogs.ts | active-substances, markets, commodities, quality-attributes, rice-varieties, measurement-units, MRL resources | Inspect exact MRL paths/actions; do not assume generic CRUD |
| residue.ts | `/api/residue-source-groups`, `/residue-rules` with retire, `/residue-policy-settings` with batch, `/residue-report-selections` with preview; lab residue-review preview/confirm | Copy version/retirement types; preserve decision evidence |
| exports.ts | `/api/export-availability`, `/export-orders` with specifications/containers/history; `/export-containers/{id}` with planning-context/stock-preview/inventory-scope/candidates | Wrappers exist despite placeholder export screens; inspect each consumer separately |
| planning.ts | `/api/export-containers/{id}/blend-plans`; `/api/blend-plans/{id}` preview/propose/proposal/decision/approve/reject/revoke/cancel/history; assessment/yield/quality policies | Reuse BlendPlanDraftDto/Proposal/Decision; current routes use BlendPlanDecisionsPage |

Offline source: `src/pwa/procurementQueue.ts`, `offlineCache.ts`, `owner.ts`. Owner key is organization-or-none plus user ID; queue ID includes clientOperationId. Keep operation IDs across retries and stop sync after identity changes. Replace IndexedDB and browser events through native adapters.

Focused MRL mapping (`catalogs.ts`): GET/POST `/api/mrl-versions`; GET/PATCH `/api/mrl-versions/{id}`; POST `/api/mrl-versions/import`; GET `/api/mrl-versions/{versionId}/limits`; PUT/DELETE `/api/mrl-versions/{versionId}/limits/{substanceId}`; POST `/api/mrl-versions/{versionId}/publish`; GET `/api/mrl-versions/resolve`. Encode IDs and preserve source request types.

## Unverified integration requirements

- Reachable backend origin, test accounts/roles and native logout/revocation behavior.
- Native SecureStore acceptance and backend remember-me lifetime (storage adapter is implemented; do not assume web UI 30-day text defines server expiry).
- Deep-link/OAuth callback support; no invitation or authenticated change-password endpoint was found in the source auth wrapper.
- Unknown DTOs and platform-specific file/map behavior remain per-feature work.
