# Web/mobile API coverage audit

Source: current working tree, 2026-10-31. Path presence is not proof of method, payload, permissions, response shape, or end-to-end parity. Existing uncommitted API changes are included.

| Web module | Paths absent from mobile source |
| --- | --- |
| admin.ts | `/api/admin/organizations`<br>`/api/admin/roles`<br>`/api/admin/users`<br>`/api/admin/users/{id}/access` |
| auth.ts | `/api/auth/csrf`<br>`/api/auth/forgot-password`<br>`/api/auth/google`<br>`/api/auth/google/complete`<br>`/api/auth/logout-all`<br>`/api/auth/refresh`<br>`/api/auth/register`<br>`/api/auth/resend-verification`<br>`/api/auth/reset-password`<br>`/api/auth/verify-email`<br>`/api/auth/web-login` |
| catalogs.ts | `/api/active-substances`<br>`/api/active-substances/{id}`<br>`/api/commodities`<br>`/api/commodities/{id}`<br>`/api/markets`<br>`/api/markets/{id}`<br>`/api/measurement-units`<br>`/api/measurement-units/{id}`<br>`/api/mrl-versions/import`<br>`/api/mrl-versions/resolve`<br>`/api/mrl-versions/{id}`<br>`/api/mrl-versions/{id}/limits`<br>`/api/mrl-versions/{id}/limits/{id}`<br>`/api/mrl-versions/{id}/publish`<br>`/api/quality-attributes`<br>`/api/quality-attributes/{id}`<br>`/api/rice-varieties`<br>`/api/rice-varieties/{id}` |
| compliance.ts | `/api/lab-reports/{id}/file` |
| health.ts | No missing literal paths; verify contracts and UI coverage |
| ledger.ts | `/api/ledger/assignments`<br>`/api/ledger/assignments/{id}/{id}`<br>`/api/ledger/compatibilities`<br>`/api/ledger/corrections/{id}/cancel`<br>`/api/ledger/corrections/{id}/commit`<br>`/api/ledger/equipment`<br>`/api/ledger/equipment/{id}`<br>`/api/ledger/equipment/{id}/retire`<br>`/api/ledger/evidence`<br>`/api/ledger/evidence/{id}`<br>`/api/ledger/facilities`<br>`/api/ledger/facilities/{id}`<br>`/api/ledger/history`<br>`/api/ledger/locations`<br>`/api/ledger/locations/{id}`<br>`/api/ledger/locations/{id}/clearance`<br>`/api/ledger/lookups`<br>`/api/ledger/lots/{id}/residue-evaluations`<br>`/api/ledger/lots/{id}/residue-evaluations/{id}`<br>`/api/ledger/mixed-bulk-policies`<br>`/api/ledger/notifications`<br>`/api/ledger/notifications/{id}/read`<br>`/api/ledger/operations/{id}`<br>`/api/ledger/policies`<br>`/api/ledger/receiving-thresholds`<br>`/api/ledger/receiving-thresholds/companies`<br>`/api/ledger/receiving-thresholds/companies/{id}`<br>`/api/ledger/receiving-thresholds/default`<br>`/api/ledger/receiving-thresholds/history`<br>`/api/ledger/receiving-thresholds/own-company`<br>`/api/ledger/receiving/{id}`<br>`/api/ledger/trace/from-lab`<br>`/api/ledger/trace/starts`<br>`/api/ledger/transfers` |
| procurement.ts | `/api/crop-seasons`<br>`/api/crop-seasons/{id}`<br>`/api/farmers/duplicate-check`<br>`/api/farmers/{id}`<br>`/api/plot-seasons`<br>`/api/plot-seasons/{id}`<br>`/api/plots/duplicate-check`<br>`/api/plots/{id}`<br>`/api/procurement-reference-data`<br>`/api/procurements/{id}`<br>`/api/source-lots/{id}`<br>`/api/spray-declarations/{id}` |
| profile.ts | `/api/profile` |
| residue.ts | `/api/residue-matrix/publish`<br>`/api/residue-policy-settings/batch`<br>`/api/residue-policy-settings/{id}`<br>`/api/residue-report-selections`<br>`/api/residue-report-selections/preview`<br>`/api/residue-report-selections/{id}`<br>`/api/residue-rules/{id}` |

## Integration constraints

- Preserve existing mobile requests, stores and routes. New API integration is additive and must use request/response contracts from the web source.
- Browser cookie/CSRF and Google redirect endpoints need a mobile authentication design; literal path parity alone is insufficient.
- Do not copy browser client.ts into React Native: it depends on document cookies and browser state.
- API integration remains incomplete. No endpoint was invented or marked integrated by this audit.
