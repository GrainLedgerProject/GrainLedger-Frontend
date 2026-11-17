# Migration progress

Updated: 2026-11-17.

## Current phase and task

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
