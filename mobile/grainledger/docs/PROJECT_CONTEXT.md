# GrainLedger mobile context

Updated: 2026-11-17. Current task: Landing presentation redesign toward minimal iOS HIG. Code/checks pass; visual/native acceptance remains pending in PROGRESS. Earlier Auth/PasswordRecovery functionality is retained.

## Workspace and boundaries

- Web source of truth (read-only): `../../web/grainledger` from this project.
- Mobile implementation root: `mobile/grainledger` in the repository; this directory already contains the Expo project. Do not create another nested `mobile` directory.
- Audit findings describe source contracts and route wiring. Backend availability, native device behavior, and end-to-end business workflows have not been verified.
- Existing mobile working tree has extensive user changes/deletions, including older screens, services, and theme files. Preserve them; deleted historical files are not current implementations.
- Complete only the requested task; wait for instruction before the next task or phase. Read these documents first in later sessions, then inspect only relevant source files.

## Current stacks

| Project | Observed setup |
| --- | --- |
| Web | React 19, TypeScript 6, Vite, React Router, TanStack Query, Zustand, Zod/React Hook Form, decimal.js, i18next (vi/en), Tailwind, Recharts, Leaflet, PWA/IndexedDB |
| Mobile | Expo `~58.0.25`, React `19.3.0`, React Native `0.88.1`, Expo Router `~58.0.31`, TypeScript `~6.0.3`, Reanimated `4.7.1` |
| Mobile state | Public Landing `/`, Glass sign-in/recovery, native Stack and Home/Stock/Account tabs. Home is a scoped seven-role read-only dashboard; Stock remains a placeholder and Account only shows session/logout. Auth guards/refresh, persisted theme and glass controls/cards are implemented. Live backend/device acceptance remains unverified. |
| Dependency tooling | npm / `package-lock.json`; no Bun lockfile observed. Use `npx expo install` for additions. |

Prior audit lint run bootstrapped `eslint ^9.0.0`, `eslint-config-expo ~58.0.4` and recreated `eslint.config.js`. Phase 2 fixed the three starter typing errors and theme-hook lint error; typecheck and lint now pass. No dependencies were added in Phase 2; `expo install --check` reports compatibility.

Setup structure: `src/app/` routes; `features/auth/` auth controller/provider/storage; `services/api/` Axios/config/errors; `services/profile.ts` read-only example; `state/async-resource.ts` and `hooks/use-api-resource.ts` shared request state. Shared components/theme/navigation stay outside routes. `types/environment.d.ts` references Expo's Metro/CSS declarations. `store/`, `utils/` retain scaffolding markers. Existing `@/* -> ./src/*` and `@/assets/* -> ./assets/*` aliases use Expo's tsconfig base.

Startup evidence: theme-demo HTTP 200, web/Android/iOS development bundles HTTP 200. The theme provider gates app content until storage hydration; SSR intentionally emits a neutral boot surface. Native device rendering and live mode/reload interaction remain unverified. Safe-area context comes from Expo Router; SafeAreaView consumes native insets without a duplicate provider.

Phase 3 added AsyncStorage 2.2.0, Expo Blur ~58.0.6 and Linear Gradient ~58.0.4 through `expo install`. NativeWind and Zustand remain deferred. Theme preferences use non-sensitive storage only. See DESIGN_SYSTEM for tokens/provider/fallback/contrast evidence. Phase 6 added expo-secure-store ~58.0.3/plugin through `expo install`; rebuild existing development clients.

Auth state is a small external controller exposed through React context/useSyncExternalStore; no additional state dependency. Native stores only an origin-bound refresh credential in SecureStore, with a non-sensitive AsyncStorage logout barrier; access tokens stay in memory and web preview is memory-only. Restore requires a backend refresh, never cached identity. Root tabs require an active backend-issued user; Home/Stock/Account allow every source role. Domain permission guards remain feature-specific. Explicit JSON token flows are source-supported; deployed cookie/CSRF/logout revocation behavior is unverified. No backend origin/test account is configured. Read API_MAPPING before auth work; use `.env.example` and the optional live probe, not an invented origin.

Phase 7 added Axios ^1.21.1 via expo install; no new native module. Auth and services share a private Axios fetch transport. Use `client.api` from useAuth for protected services; do not implement another refresh interceptor or persist response data globally. ApiError also backs the AuthError alias. Environment URLs are explicitly selected via APP_ENV/public URL variables; there is no default deployment. The session-scoped useApiResource hook provides loading/error/reload/cancellation patterns without a new state library. Only GET `/api/profile` was added as an example; placeholders do not fetch it. API_MAPPING documents configuration, usage and validation limits.

Phase 9 Auth added public `/forgot-password` and sign-in entry/back navigation. `client.forgotPassword({email}, signal?)` uses the existing POST endpoint anonymously, without bearer/cookies, refresh retries or session/storage mutation. Its controller validates source HTML email semantics, trims without lowercasing, coalesces pending submissions, cancels on exit and exposes safe generic error categories. Glass form has blank/invalid/loading/error/accepted states and local VI/EN copy. Accepted means request received, not delivery or password reset; known/unknown accounts share the same message.

Phase 9 PasswordRecovery now adds an explicit “I have a recovery code” step inside that same public route, not a new URL. `PasswordResetForm.tsx` and `password-reset.ts` consume real `client.resetPassword({email,otp,newPassword}, signal?)` → POST /api/auth/reset-password → void. This is a new native consumer of the existing source wrapper; web has no reset screen/schema to copy. Only email format/required fields are checked locally; do not apply invitation/change-password policy or assume numeric/6-digit OTP. Only email is trimmed; OTP/password are sent verbatim. Backend policy is authoritative and still unverified. Safe generic errors, duplicate suppression, abort/stale handling, explicit retry and reset success/back-to-sign-in are implemented. OTP/password stay in component/request memory, are cleared after valid submission settles, and never enter controller snapshots, storage, logs or route params. No auto-login or local session mutation; timeout/network failure warns that the result is uncertain. Invitation/change-password/registration/OAuth/profile remain separate. No dependencies/native config changed; origin remains unconfigured.

Phase 8 implements `features/dashboard/{api,model,DashboardScreen.tsx}` and reusable `components/glass/GlassStatCard.tsx`. Source dashboard config/aggregation/decimal helpers and bilingual labels are copied with focused native adapters. MM/MO require platform.read and an assigned facility before any operational read; other roles use account scope. Failed/malformed/forbidden sources remain unavailable, not zero; mass/statistics disclose partial loaded datasets. No separate dashboard endpoint, query-cache dependency or domain action service was invented. Offline queue metrics are unavailable until queue migration. All workspace links are deferred/read-only or disabled; their target screens remain out of scope. Decimal.js ^10.6.0/Zod ^4.6.7 were added; API_MAPPING documents the v4 schema adaptation and tests.

Phase 9 replaces the temporary welcome content with `features/landing/{LandingScreen.tsx,LandingSimulator.tsx,landing-data.ts,landing-model.ts}` at `/`. This is a public, API-free feature; existing auth only determines CTA destination. All source page sections, native section navigation, theme/locale controls, four stakeholder examples and two local simulators are implemented. Demo MRL data is historical project content, never current regulatory/backend data; local success is not a ledger write or shipment permission. No new dependency/native configuration. Locale is Landing-local; theme persistence stays centralized. `/theme-demo` remains directly addressable but its temporary welcome link was removed. Native visual/keyboard/scroll acceptance and incoming external section hashes remain follow-ups.

Latest Landing redesign follows the user's iOS/minimal direction: feature-local `landing-ui.tsx`, neutral light/dark surfaces, sans Large Title, flat grouped panels/disclosures, compact sticky header and restrained green actions. The page-wide gradient/blur and card shadows were removed only from Landing. Preferences live behind the header ellipsis; every source content/action/calculation remains available. Shared theme/auth, API contracts and other screens are unchanged. DESIGN_SYSTEM records this scoped visual exception; screenshot/native acceptance is still pending because the browser host is unavailable.

Phase 5 added expo-navigation-bar ~58.0.4 via `expo install`, with a config plugin for manual button-icon styling and visible Android system navigation. Rebuild an existing development client to apply it. Navigation mapping and future route hierarchy are in MIGRATION_PLAN. The bar uses Expo SDK 58's `expo-router/js-tabs` API (emitter/navigateToTab); do not copy older navigation-based custom-tab examples. Normal-flow pill layout reserves its actual height and safe-area clearance; no fixed screen-bottom compensation is required.

## Source anchors and reuse

- Routes and access: web `src/app/router/routes.tsx`, `ProtectedRoute.tsx`, `src/shared/types/roles.ts`.
- Contracts: web `src/api/`; request DTOs, response DTOs, query helpers, and parsers are authoritative client evidence. Some responses remain `unknown`; inspect consumers before typing them.
- Authentication: `src/api/auth.ts`, `src/features/auth/api/authApi.ts`, `model/authSchemas.ts`, `src/app/store/authStore.ts`.
- Dashboard: `src/features/dashboard/{api,model}` — source schemas, role configuration, aggregation, permission filtering and scoped query keys.
- Reuse candidates: roles/normalization, validation rules, decimal mass calculations, DTOs, query serialization, history parsing, dashboard configuration and aggregation. Extract/copy into mobile only as needed, with source provenance; no runtime imports from the web tree.
- Rewrite platform adapters: cookies/localStorage, DOM theme updates, browser routing, IndexedDB/service workers, file handling, Leaflet, Recharts, Framer Motion and DOM UI.

## Web structure and state ownership

- Top level: `src/`, `public/`, `tests/`, configuration files and `.env.example`. `dev-dist/` is generated and was not inspected. No lockfiles, generated output or node_modules were read for the audit.
- `src/main.tsx` initializes StrictMode, i18n and service-worker registration. `src/App.tsx` mounts QueryClientProvider, RouterProvider and FeedbackHost, and starts procurement sync.
- `src/app/`: router, stores and vi/en localization. `src/features/`: admin, audit, auth, catalogs, compliance, dashboard, export, field, landing, mill and risk. `src/api/`: domain wrappers/DTOs. `src/pwa/`: persistence/sync. `src/shared/`: role definitions and utilities. Assets and shared UI live in their own directories.

| State owner | Source and responsibility | Migration boundary |
| --- | --- | --- |
| Zustand auth | `src/app/store/authStore.ts`: user, access/refresh tokens, authentication and remember-me; cookie persistence/JWT restoration | Retain state semantics; replace cookie adapter; coordinate refresh and cache clearing |
| Zustand UI | `uiStore.ts`: theme, language, sidebar/search/notifications, connectivity, offline count, sync/minimal modes | Replace DOM/localStorage/browser events; omit desktop sidebar mechanics |
| Zustand drafts | `draftStore.ts`: localStorage drafts keyed by organization/user/form | Preserve durable account isolation; `drafts` property is not the durable source |
| Zustand feedback | `feedbackStore.ts`: bounded toast queue and promise-based confirmation | Retain types/interaction contract; replace window timer and DOM host |
| TanStack Query | App defaults: staleTime 5 minutes, retry 1, no window-focus refetch; dashboard overrides with 30 seconds/retry false | Preserve feature overrides and identity-scoped query keys; adapt app lifecycle |
| Forms/local state | React Hook Form/Zod for auth; page-level hooks also hold feature state | Reuse rules; inspect each form before extracting a shared model |

Shared component inventory: AppLayout/AppHeader/AppSidebar/SettingsLayout/CompanyContextBar; GlobalSearchModal/NotificationCenter; FeedbackHost/Modal/ConfirmPopover/ErrorBoundary/GrainLoader; RoleChip/StatusBadge/MassValue; HoldBanner/StalePlanBanner/LedgerRejectionCard; NetworkStatusIndicator/MinimalModeToggle; MapLocationPicker. Their DOM rendering must be rebuilt; copy only compatible types, formatting and behavior.

## Reusable model and business-logic index

| Source | Reusable symbols/rules | Adaptation needed |
| --- | --- | --- |
| `src/shared/types/roles.ts` | UserRole, RoleSide, RoleMeta, ROLE_DEFINITIONS, normalizeUserRole | Translate route destinations; preserve aliases |
| `src/features/auth/model/authSchemas.ts` | signInSchema, editProfileSchema, inferred form types and password policies | Localize native errors; unsupported actions stay deferred |
| `src/api/{auth,admin,procurement,compliance,catalogs,residue,planning,exports,ledger,history,query}.ts` | Request/response interfaces, decimal-string amounts, API paging/history types | Extract type-only contracts; avoid importing browser client dependencies |
| `src/shared/utils/decimalMass.ts` | toDecimal, formatMass, checkMassBalance; Decimal precision 28/ROUND_HALF_UP | Use source/server policy values; helper default is not a universal ledger tolerance |
| `src/shared/utils/jwt.ts` | Structural checks and expiry with 15-second buffer; claim normalization | Depends on atob and web UserProfile import; verify decoder support. Decoding is not signature verification |
| `src/features/dashboard/model/{dashboardConfig,dashboardData}.ts` | Source permissions, metrics, priorities, chart/list data, decimal totals and shipping buckets | Preserve Asia/Ho_Chi_Minh day boundaries and partial-data labels; replace chart rendering |
| `src/features/audit/model/{historyEvent,eventPresentation}.ts`, `src/api/history.ts` | AuditEvent/toAuditEvent, display labels/details, strict history parser | Do not invent actor email/hash/verification fields absent from response |
| `src/pwa/{owner,procurementQueue,offlineCache}.ts` | Owner isolation, retained clientOperationId, retry/session-change rules | Replace IndexedDB/localStorage and event/lifecycle integration |

Most field/mill response models are still page-local or `unknown` in wrappers. Extract them only during the corresponding screen task; this audit does not certify every page-local rule.

## Rules to preserve

- Seven roles: `MILL_ADMIN`, `MILL_MANAGER`, `MILL_OPERATOR`, `CUSTOMER_PROCUREMENT_OFFICER`, `CUSTOMER_MANAGER`, `CUSTOMER_EXPORT_OFFICER`, `AUTHORIZED_STOCK_VIEWER`.
- Preserve role aliases and backend permission checks. Tenant/facility restrictions remain backend-enforced; UI visibility alone is insufficient.
- Tokens rotate through a shared refresh operation; isolate user/organization caches and offline records. Never supply mock credentials/data as a successful backend response.
- Preserve decimal-string masses and decimal.js calculations. Do not introduce floating-point mass arithmetic or new policy constants.
- Preserve Vietnamese/English copy and labels where applicable.
- Invitation validation/acceptance and authenticated password change explicitly throw unsupported errors in web authApi. Web placeholder routes are tracked separately in MIGRATION_PLAN.

## Verification and documentation

- Run `npx --no-install tsc --noEmit` and `npx --no-install expo lint` after each task; distinguish baseline failures from introduced errors.
- Before touching Expo/React Native APIs, recheck installed Expo major and fetch matching versioned docs. Audit references: [SDK 58](https://docs.expo.dev/versions/v58.0.0/) and [Expo documentation index](https://docs.expo.dev/llms.txt).
- Keep API details in API_MAPPING, checklist/order in MIGRATION_PLAN, visual requirements in DESIGN_SYSTEM and latest handoff/check results in PROGRESS.
