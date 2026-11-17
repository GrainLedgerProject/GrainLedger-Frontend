# Mobile design system

Updated 2026-11-17. GrainLedger uses forest greens, warm grain accents and restrained frosted surfaces. Per the latest user request, public Landing now uses a minimal iOS-inspired presentation; other screens keep their Glass design. Visual/device acceptance remains pending.

## Source of truth

- `src/theme/tokens.ts`: palettes, typography, spacing, radius, gradients, glass, layout and theme-specific shadows.
- `src/theme/ThemeProvider.tsx`: mode state and persistence. Wrap the root once; `useAppTheme()` returns `{ theme, mode, setMode, hydrated, storageError }`.
- `src/constants/theme.ts` / `useTheme()`: compatibility adapters for starter components; they derive colors/fonts/spacing from the central tokens.
- `src/components/glass/`: GlassView, GlassCard, GlassButton, GlassInput. No other shared components were created in Phase 4.
- `/theme-demo`: the directly addressable component showcase with active/disabled/loading buttons, input validation and opaque preview. Phase 9 replaced the temporary welcome screen/link with the public Landing; the showcase route remains available.

## Semantic colors

| Token | Light | Dark |
| --- | --- | --- |
| background | #F3F6F1 | #0C1714 |
| surface / opaque fallback | #FFFFFF | #172923 |
| surfaceRaised | #E0EBE2 | #243D32 |
| glass | rgba(255,255,255,0.88) | rgba(23,41,35,0.94) |
| textPrimary | #172D23 | #EEF6EF |
| textSecondary | #4B6256 | #ADC3B5 |
| primary | #176347 | #85DCB2 |
| onPrimary | #FFFFFF | #102B20 |
| accent | #805818 | #EBC989 |
| controlBorder | #5E7566 | #7B9B87 |
| danger / HOLD | #AD263C | #FF9CAB |

Additional tokens cover decorative borders, focus, disabled text/surfaces, success/warning/danger/info foregrounds and tinted surfaces, ambient gradient stops and shadow colors. Status previews always include labels. Do not put normal text directly on arbitrary imagery or remove the glass tint.

The light accent was darkened from the proposal to meet the contrast gate. Phase 4 strengthened control borders for tinted backgrounds. `node scripts/check-theme.cjs` checks 62 pairs: body/secondary/accent on solid and ambient surfaces, glass composited over both black and white, status pairs, primary button text, disabled text and control boundaries across solid/raised/ambient/glass surfaces. Minimum checked text ratio: **4.67:1** (target 4.5:1); control boundaries target 3:1. This numerical check does not measure native blur rendering or every future composition.

## Typography and geometry

| Typography token | Size / line height | Use |
| --- | --- | --- |
| display | 42 / 48 | Serif demonstration headline |
| title | 28 / 34 | Screen title |
| heading | 20 / 26 | Section heading |
| body | 16 / 24 | Reading text |
| label | 14 / 20 | Semibold controls |
| caption | 13 / 18 | Supporting detail |
| mono | 12 / 18 | Token values |

Platform font families are centralized; no custom-font dependency. Keep font scaling enabled and allow wrapping for large text and Vietnamese diacritics.

- Spacing: xs 4, sm 8, md 12, lg 16, page 20, xl 24, xxl 32, section 40, hero 64. Use padding inside and gap between elements.
- Radius: sm 8, control 14, card 22, sheet 28, pill 999; pair radii with continuous border curves.
- Shadow tiers: none; soft 0/4/16; raised 0/12/32, with theme-specific shadow opacity. `boxShadow` targets this project's New Architecture; native rendering still needs device review.
- Layout: maximum demo width 560, minimum control height 48. Wrap mode/status/swatch rows on narrow screens. Mode controls expose radio/checked semantics and a visible focus outline.

## Appearance lifecycle

Default mode is `system`; resolved colors react to device scheme changes. Explicit `light`/`dark` modes override those changes. A null/unknown device scheme resolves to light. Invalid stored values fall back to system.

AsyncStorage key: `grainledger.appearance.v1`, storing only `system`, `light` or `dark`. Reads happen after mount; rendering waits for hydration so a saved dark preference does not first render light content. Native splash is held until hydration and the navigation tree mounts; the boot/splash background is neutral dark. Native splash configuration changes require rebuilding the app.

Mode changes apply immediately. Writes are serialized so the last rapid selection wins. Read/write failures fall back safely and are surfaced in the demo; a failed save keeps the selected mode for the session and allows retry by tapping a mode. Navigation colors, stack backgrounds, status-bar appearance and mounted themed content derive from the resolved theme. No authentication state is involved.

## Glass and fallbacks

GlassView defaults to intensity 32, a clipped continuous card radius, a 1px glass edge and a stable tint. The Linear Gradient highlight is confined to the top edge so it does not lighten text backgrounds. Outer shadows remain outside the clipping layer. Avoid stacked blur cards and animated blur intensity in future lists.

Android uses a caller-owned `BlurTargetView` ref passed as `blurTarget`, with `dimezisBlurViewSdk31Plus`; render the backdrop before glass. Android below API 31 or without a target ref is opaque. iOS reduced-transparency preferences are queried and observed, with opaque output until the first result arrives. Nested GlassViews use opaque surfaces to avoid extra blur passes. The `opaque` prop forces fallback on every platform; the demo switch is not persisted.

## Four reusable component contracts

| Component | Public API and behavior |
| --- | --- |
| GlassView | ViewProps/native ref; blurTarget, opaque, intensity, cornerRadius, padding, shadow, contentContainerStyle. `style` controls the outer layout; use contentContainerStyle for internal padding/alignment. Keeps child accessibility semantics intact. |
| GlassCard | GlassView props plus optional title/description. Heading semantics; default xl padding, lg content gap and soft shadow. No artificial loading/disabled state on a noninteractive card. |
| GlassButton | Pressable props/native ref; required label; primary/glass variant, loading/loadingLabel, disabled, fullWidth, style/labelStyle and blur options. Loading/disabled blocks presses, exposes disabled/busy state, retains the action's accessible name and supports a visible focus outline. Default touch height >=48; text wraps. |
| GlassInput | TextInput props/native ref; required label; helperText, error, disabled, loading, containerStyle and blur options. Forwards input events/keyboard/autofill props. Links label IDs, includes errors in accessibility hints/live text, shows focus outline and spinner, and prevents editing while disabled/loading. No built-in validation or password-visibility control. |

Import each component directly from `@/components/glass/GlassView` (or the matching filename). No barrel or additional component is required. For native field focus, use `useRef<ComponentRef<typeof TextInput>>(null)` and pass it to GlassInput. Custom style/color overrides are the caller's responsibility for contrast. Primary/disabled control fills are opaque; the glass variant and editable inputs may blur when given an appropriate target outside another glass surface.

Web blur availability and reduced-transparency behavior still require browser review; no automatic web reduced-transparency detection is claimed. Native modules were installed using SDK 58-compatible versions: AsyncStorage 2.2.0, expo-blur ~58.0.6, expo-linear-gradient ~58.0.4. Rebuild existing development clients after adding native modules.

References: [SDK 58 Blur](https://docs.expo.dev/versions/v58.0.0/sdk/blur-view/), [SDK 58 Linear Gradient](https://docs.expo.dev/versions/v58.0.0/sdk/linear-gradient/), [SDK 58 AsyncStorage](https://docs.expo.dev/versions/v58.0.0/sdk/async-storage/).

## Verification and next boundary

Navigation shell: Home/Stock/Account use a shared glass pill capped at 520 logical pixels, with flexible labels/minimum 48-pixel targets and active contrast tokens. The pill floats visually in reserved normal-flow space; measured height and safe-area padding prevent content overlap, including larger text. A static gradient target is shared for Android blur. Side/bottom insets clear cutouts, the home indicator and Android gesture/three-button navigation. iOS symbols use outline/fill variants; all platforms use active/inactive tint and label emphasis. Scenes fade over 160ms; reduced-motion state is queried and observed, with animations off until resolved. Native system-bar rendering and actual transitions still require device review.

TypeScript, lint, SDK dependency compatibility, token checks and web/Android/iOS development bundle smoke checks pass. Browser UI verification ended because Computer Use could not confidently determine the current browser URL for policy enforcement. Live toggles, restart persistence, large-text layout and native blur/accessibility settings remain manual verification items.

Future UI subtasks, only when requested: shared screen/header layout; reusable status badges; general feedback UI; modal/sheet surfaces; selection/segmented controls; shared list rows. Metric cards are delivered in Phase 8; dashboard-specific loading/error/empty/facility views stay local. No other shared controls were added in Phase 4.

## Phase 8 dashboard and statistic cards

- `GlassStatCard` takes label, value (string|null), detail, optional unit/tone/loading/loadingLabel/unavailable plus blurTarget/opaque/style. It preserves unknown/error as a dash, never zero; loading exposes busy semantics. Text labels carry meaning alongside tone; values wrap and keep font scaling.
- Dashboard is one bounded vertical ScrollView with pull-to-refresh and an explicit Refresh button. Four metrics use two flexible columns on wider screens, one on narrow or large-font screens. Sections cap width at 800 logical pixels; floating tab space is already reserved by navigation. Facilities use a horizontal virtualized list of minimum-48-height selected buttons.
- A static ambient gradient BlurTargetView precedes the hero and statistic surfaces. Charts/priorities/recent/actions use opaque section cards to limit blur passes. Existing reduced-transparency/Android fallback rules remain unchanged; no animated blur or fake trend graphics.
- Every surface/text/control/chart uses resolved theme tokens. Bars display accessible labels and exact formatted values; only visual proportions convert Decimal to number. Locale choice changes dashboard copy/formatting only. Read-only records and disabled future actions communicate current mobile availability.
- Existing 62 contrast checks pass; they do not establish actual native blur or screen-reader/large-text rendering. Browser access host was unavailable during visual review. Light/dark screenshots and native interaction acceptance remain pending.

## Phase 9 public Landing

- Latest scope: redesign Landing only toward Apple HIG/iOS minimalism. No page-wide gradient, translucent hero, stacked shadows or repeated glass button boxes. Brand green is reserved for actions; neutral content provides the main hierarchy. This is an iOS-inspired React Native composition, not a claim of native UIKit/Liquid Glass rendering.
- Feature-local `landing-ui.tsx` owns flat grouped panels, text/filled actions, choices, disclosure rows and appearance colors. Light background/surface/group/text/secondary: #F2F2F7 / #FFFFFF / #E5E5EA / #1C1C1E / #636366. Dark: #000000 / #1C1C1E / #2C2C2E / #F2F2F7 / #AEAEB2. It follows the central resolved theme; other screens/tokens/components are unchanged.
- System-default sans typography replaces the serif hero: Large Title 34/42 on phones, 48/56 on wide screens, weight 700. Intro 17/27, restrained supporting text, 48-point controls, 20-point continuous grouped corners, hairline separators and no content shadows. Font scaling/wrapping remain enabled; panels use one column on phones/large text and two for context metrics when space permits.
- Sticky compact header retains brand/top, sign-in/home and five measured section targets. The labeled “•••” action reveals appearance/language preferences and scrolls to them. System/light/dark selection still persists centrally; locale stays Landing-local. Header height and section offsets remain measured, with scrolling respecting reduced motion.
- Pillars, comparisons and footer references use accessible disclosure rows; the first pillar/comparison starts open. No content is deleted. Stakeholder/simulator choices use quiet grouped selection. Existing GlassInput is reused in opaque mode for demo fields; semantic status colors/messages and all simulator calculations remain unchanged.
- Max content width 800, horizontal padding 24, section gap 48. Both locales, four context metrics/pillars/comparisons/stakeholders, examples, footer technology shortcuts, CTA destinations and honest API-free demo states remain available. Native keyboard/back/scroll/large-text/disclosure acceptance is still pending.
- Validation: TypeScript/lint, nine Landing calculation/content/navigation groups, navigation and 62 shared contrast checks pass. Additional one-off check covers 18 neutral Landing text/action pairs, minimum 4.77:1. Browser host is unavailable, so screenshots/interactive visual acceptance are not claimed.

Design references: [Apple HIG layout](https://developer.apple.com/design/human-interface-guidelines/layout.md) (hierarchy, grouping and progressive disclosure), [materials](https://developer.apple.com/design/human-interface-guidelines/materials.md) (restrained functional material layers), [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/).
