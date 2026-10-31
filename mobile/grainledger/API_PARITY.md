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

The existing field, mill, compliance, holds and offline flows continue to use their existing methods. Profile editing now calls PUT /api/profile and persists the returned name/phone in the existing Zustand user/cache; demo sessions cannot submit a profile change.

Admin/catalog management, registration/password-recovery, residue configuration, notification/history and other web-only management flows have service methods but do not yet have mobile controls. Adding all corresponding screens would expand the current navigation flow; no routes have been renamed or added in this pass.

Run authorized read/write scenarios against a real backend with appropriate roles to validate permissions, request validation, error bodies, file downloads and response shapes. No live backend mutations were executed during verification.
