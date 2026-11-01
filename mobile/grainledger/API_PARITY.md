# Web/mobile API coverage — 2026-10-31

All eight web endpoint modules are now available through the existing mobile ApiService:

| Source in web/grainledger/src/api | Mobile API namespace | Status |
| --- | --- | --- |
| admin.ts | api.admin | Organizations, users, roles, access |
| auth.ts | api.auth | Registration, verification, password recovery, refresh, logout-all and existing browser auth helpers |
| catalogs.ts | api.catalogs | Substances, markets, commodities, varieties, units, quality attributes, MRL versions/limits/import/publish |
| compliance.ts | api.compliance | Samples, handovers, lab reports, updates and report-file endpoint |
| ledger.ts | api.ledger | Facilities, locations, equipment, assignments, operations, holds, corrections, notifications, history, receiving, policies, transfers, evidence, trace and residue evaluations |
| procurement.ts | api.procurement | Farmers, plots, seasons, duplicate checks, source lots and procurement reference data |
| profile.ts | api.profile | Read and update profile; editing connected to the existing profile screen |
| residue.ts | api.residue | Rules, policy settings, batch updates, report selections, matrix publish and report review |

## Compatibility

- Factory modules in src/services/endpoints mirror the current web source contracts. Their injected transport is the existing mobile request method, including the configured base URL and token. They do not import web state, cookies or browser globals.
- New methods return the existing mobile { data, error, isMock } result. Existing methods take precedence when names overlap; existing screens/stores/offline requests are unchanged.
- Web response contracts declared unknown remain unknown. Callers must narrow them before accessing fields. No DTO was guessed.
- npm test executes 768 endpoint parity cases against the actual web modules, covering method sets, paths, query serialization, HTTP methods and request bodies. This is contract parity, not backend integration testing.
- Browser web-login/CSRF/Google endpoints are exposed for contract completeness. Their presence does not implement native OAuth, browser cookies, deep-link callbacks or refresh-token lifecycle. Do not wire browser redirect helpers into a native login screen without the corresponding backend flow.
- The /health check remains the existing profile connection check.

## UI coverage and remaining verification

The existing field, mill, compliance, holds and offline flows retain their requests. New connections within existing routes:

- Profile editing calls PUT /api/profile and persists the returned name/phone; demo sessions cannot submit a profile change.
- The correction form now posts the web CorrectionRequest contract. Its entered variance is preserved in reconciliationNotes because that contract has no variance field. Decimal precision is preserved. Network/server failures keep the entered form and do not display success.
- The operations section displays GET /api/ledger/corrections with explicit loading/error/empty states. Commit and cancel use the web notes payload and ask for confirmation before sending. A successful server response is followed by a reload; failed requests do not optimistically change status.
- Profile exposes GET /api/ledger/history on demand, with local search and incremental display. Array, items and events envelopes match the web audit page. Malformed responses report an error rather than inventing events. The panel resets when the signed-in account changes.

Admin, catalog and MRL management now have controls within the existing profile/compliance routes, as described below. Residue configuration, notifications and some other web-only management flows still have service coverage only. No routes have been renamed or added.

Run authorized read/write scenarios against a real backend with appropriate roles to validate permissions, request validation, error bodies, file downloads and response shapes. No live backend mutations were executed during verification.

## Additional workflow checks

npm test also verifies correction request validation, exact decimal handling, response envelope validation, audit search, HTTP 403/offline failure behavior and valid empty-body success. These tests make no live requests. Read/write backend scenarios and role enforcement still require a real test environment.

## Account UI coverage

The existing login route now includes registration, email verification, resend verification, forgot password and reset password panels. They call the web auth contracts without changing the original sign-in handler or introducing a route. Verification/reset completion returns to sign-in and clears the parent password input. OTP and new passwords are held only in component state and cleared on completion/cancel; they are not written to storage. Duplicate in-flight submits are blocked. Empty successful responses are accepted for the void password endpoints; registration/verification require their documented response data. End-to-end email delivery, expiry, rate limits and password policy remain backend/manual checks.

## Management UI coverage — 2026-11-01

- Profile exposes on-demand organization and user management for MILL_ADMIN, matching the web route restriction. Organizations can be listed/created. Users can be searched and their role, organization and active state updated. Updates send the actual returned ETag through If-Match; a missing ETag blocks saving. HTTP 412 asks the user to reload rather than retrying with a guessed version.
- The same profile area exposes all six master-data groups: commodities, units, substances, markets, varieties and quality attributes. Search/create/update payloads follow MasterDataPage. Delete controls exist only for commodities, units and substances, as on the web. Failed group loads clear the previous list so items cannot be edited under another group's endpoint.
- Compliance standards exposes MRL version management to MILL_ADMIN, CUSTOMER_MANAGER and CUSTOMER_EXPORT_OFFICER, matching the web route roles. It lists versions, creates drafts, reads/updates/deletes draft limits and publishes a draft after confirmation. Published and archived limits are read-only. Both status representations present in the web source are parsed; invalid responses report errors.
- MRL dates are validated as calendar dates before conversion to UTC. Limit input preserves decimal strings, including very small values, through the existing decimal.js dependency.
- Panels load on demand, use semantic light/dark primitives and incremental display, and reset when the signed-in account changes. Existing stores, navigation and login behavior remain unchanged. No dependency was added.

MRL bulk import also uses the web's JSON workflow, with validation against ImportMrlVersionRequest before any request, preserved decimal strings, a count preview and confirmation. Invalid JSON, missing fields and numeric limit values are rejected locally; server errors retain the pasted input.

Remaining UI work includes residue rule/policy/matrix/report-review forms, notification controls and other ledger administration. The checked-in residue module declares unknown request bodies without a corresponding web form/schema; notification DTOs are also absent. These require an authoritative backend contract before a typed editor can be built. Endpoint availability alone does not establish complete feature parity.

The management checks use an injected fake transport, never a live mutation: actual ETag preservation, missing-version rejection, null organization/false active state, strict response guards, all six catalog contracts, restricted deletion, MRL dates/statuses/decimal payloads, and 401/403/412/offline errors. Verify real backend authorization separately; hiding a panel is not access control.
