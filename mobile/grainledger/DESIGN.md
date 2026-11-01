# GrainLedger Mobile Design System

## Principles

The presentation layer follows Apple HIG's clarity, deference, and depth while remaining native to Android.

- Content is primary. Glass is reserved for navigation and compact floating controls.
- Content cards, forms, status badges, and long text use opaque semantic surfaces.
- One primary action is visually dominant in each task area.
- Interactive targets are at least 44 pt on iOS and 48 dp where Android needs the larger target.
- Layouts use generous whitespace, short labels, and a restrained GrainLedger green accent.
- Business logic, route names, data models, API calls, and navigation flow stay outside this system.

## Tokens

All new UI reads from `src/theme/tokens.ts` through `useAppTheme()`.

### Color

Use semantic names rather than literal colors:

- `background`, `groupedBackground`: screen and grouped-list backgrounds
- `surface`, `surfaceSecondary`, `elevatedSurface`: opaque content layers
- `label`, `secondaryLabel`, `tertiaryLabel`: text hierarchy
- `separator`: hairlines and quiet borders
- `accent`, `onAccent`, `accentMuted`: the single GrainLedger accent family
- `success`, `warning`, `destructive`, `info` and matching `*Muted`: status only
- `glassTint`, `glassTintClear`, `glassBorder`, `glassHighlight`: internal glass rendering

Light and dark palettes are selected from the system color scheme by `AppThemeProvider`.

### Typography

`AppText` exposes the iOS-aligned scale:

`largeTitle`, `title1`, `title2`, `title3`, `headline`, `body`, `callout`,
`subheadline`, `footnote`, `caption`, and `captionStrong`.

System fonts are used: San Francisco through `System` on iOS, Roboto through `sans-serif`
on Android. Text scales by default; compact controls cap their multiplier only where growth would
otherwise hide the action.

### Spacing, shape, and motion

- Spacing uses the 4/8-point family in `theme.spacing`.
- Shape uses `theme.radii`; use `pill` for compact controls, not content cards.
- Press feedback uses Reanimated spring tokens and respects `useReducedMotion()`.
- Haptics go through `src/utils/haptics.ts` only.

## GlassSurface

Import glass only from:

```tsx
import { GlassGroup, GlassSurface } from '@/components/ui/GlassSurface';
```

No screen or component may import `expo-glass-effect` or `expo-blur` directly.

```tsx
<GlassSurface
  variant="regular" // regular | clear
  tint={theme.colors.glassTint}
  interactive
  radius={theme.radii.pill}
  style={styles.toolbar}
>
  {children}
</GlassSurface>
```

`GlassGroup` groups nearby glass controls and accepts variant, tint, interactive and radius as defaults for child GlassSurface components; child props override group defaults. On Android, pass a `backdrop` only for a small,
stable area that genuinely benefits from backdrop blur. Do not put a blur target around a long
scrolling list.

### Where glass is allowed

- floating tab bar
- navigation header or toolbar
- segmented control
- floating action/menu control
- sheet chrome

Do not use glass for content cards, list rows, status badges, inputs, paragraphs, or list items.
Do not nest glass inside glass.

## Common primitives

- `AppText`: semantic typography and Dynamic Type
- `AppIcon`: SF Symbols on iOS and Material Symbols on Android/web through one name map
- `Button`: solid/tinted actions, spring press feedback, loading and accessibility state
- `InputField`: opaque adaptive input with focus/error treatment
- `ChoiceField`: labeled accessible radio choices; larger option sets include local search and incremental display
- `Card`: opaque content surface
- `ListRow`: minimum target, inset separator, optional disclosure
- `GlassSegmentedControl`: compact grouped glass control
- `SheetSurface`: adaptive sheet content and grabber
- `EmptyState`, `LoadingState`, `ErrorState`: consistent feedback states

Legacy `GlassCard`, `GlassInput`, and `GlassButton` remain compatibility adapters while older
screens migrate. They intentionally render opaque/tinted content instead of applying glass.

## Adding a screen

1. Put routes only in `src/app`; keep reusable code outside it.
2. Use `SafeAreaView` and `theme.colors.background`.
3. Use `AppText`, semantic tokens, and existing primitives. Do not add literal colors, font sizes,
   spacing values, blur imports, or a second accent.
4. Keep content inside the 760-point maximum width used by dashboard/task screens.
5. Supply accessibility roles, labels, selected/disabled/busy states, and at least a 44-point target.
6. Test light/dark, large text, reduced motion, reduced transparency/high contrast, keyboard,
   VoiceOver/TalkBack, and both narrow and tablet widths.
7. Run `npx tsc --noEmit`, `npx expo lint`, and `npx -y expo-doctor`.

## Platform support matrix

| Platform | Rendering | Requirement and fallback |
| --- | --- | --- |
| iOS 26+ | Native Liquid Glass via `expo-glass-effect` | Enabled only when both library availability checks pass |
| iOS 16.4-25 | System material blur via `expo-blur` | Hairline border and semantic tint |
| iOS with Reduce Transparency | Opaque adaptive surface | Preference is read initially and observed for changes |
| Android API 31+ | Expo blur when a `GlassGroup` supplies a blur target | Small chrome regions only |
| Android API 24-30 | Opaque translucent-looking surface | No expensive or unsupported backdrop blur |
| Android high-contrast text | Opaque adaptive surface | Preference is read initially and observed for changes |
| Web | Opaque adaptive surface | No native glass assumption |

## Build and runtime notes

This is an Expo SDK 58 Continuous Native Generation project with React Native 0.88 and the New
Architecture. There are no checked-in `ios/` or `android/` folders.

`expo-glass-effect`, `expo-blur`, `expo-symbols`, and `expo-haptics` are SDK-compatible Expo
modules. The current feature set works in Expo Go for ordinary development. Validate native iOS 26
glass on an iOS 26 device/simulator. If a future dependency adds native code not bundled with Expo
Go, create a development build instead of editing generated native folders.

## Manual decisions and checks

- Confirm the current GrainLedger green accent or provide the final brand color.
- Test on one iOS 26 device, one iOS 17/18 device, one Android API 31+ mid-range device, and one
  Android API 24-30 device.
- Verify tab labels at the largest accessibility text size.
- Verify login keyboard avoidance, form focus order, TalkBack/VoiceOver labels, and contrast over
  real scrolling content.
- Verify Android tab-bar performance. Keep its opaque fallback if blur causes dropped frames.
- Confirm whether the profile route should remain programmatically reachable but hidden from the
  five-item tab bar.


## Implementation status — 2026-10-31

- Stack remains Expo SDK 58 / RN 0.88.1 / Expo Router / StyleSheet / Zustand / Reanimated. No new dependency or native plugin was added.
- All business screens now use semantic light/dark colors; numeric spacing and type sizes in app/components were moved to theme tokens. Legacy AppleGlass/Colors exports remain for compatibility inside the theme folder.
- All application icons render through AppIcon. Named icon adapters preserve readable component names while using SF Symbols on iOS and Material Symbols on Android/web. Decorative icons are hidden from assistive technology.
- Native tabs were evaluated using the SDK 58 docs and local types. The supported import is expo-router/native-tabs. A hidden native trigger cannot be navigated to, whereas the current hidden profile route remains reachable. Keep the current JS tabs plus GlassSurface to satisfy the existing route/flow constraint. Native Liquid Glass still renders within GlassSurface where available.
- The service layer now exposes all eight web API modules through the mobile transport; see API_PARITY.md for scope and limitations. Profile editing is connected without adding a route.
- Tertiary text was darkened in the light theme after measured contrast failed. All 44 tested semantic text/background pairs now meet 4.5:1. This does not establish contrast over every possible image or translucent backdrop.

### Validation

- TypeScript strict: pass.
- ESLint: pass without warnings.
- npm test: 768 web/mobile endpoint parity cases plus 44 semantic contrast pairs.
- Expo Doctor: 20/20 passed in the follow-up implementation. An earlier transient TLS failure has not reproduced in that run.
- iOS and Android production JS/Hermes exports: pass.
- Physical-device execution and visual layout review: pending; export success is not device validation.

### Remaining acceptance work

- Test iOS 26 native glass, older iOS blur, Android API 31+ targeted blur and opaque fallback on a mid-range device.
- Verify largest font sizes, VoiceOver/TalkBack, reduce transparency, high contrast, reduced motion, keyboard behavior and frame timing.
- iOS forms now use native formSheet presentation with 50%/100% detents, a grabber and theme corner radius; Android keeps its existing modal presentation. The lot-detail route now uses native iOS headerLargeTitleEnabled with automatic scroll insets; collapse still needs device verification. Other custom headers remain unchanged.
- Some web-only management flows still need mobile UI; organization/user access, six catalogs and MRL draft management are now implemented within existing routes. See API_PARITY.md for the exact remaining scope.
- Sleek design generation remains unavailable until account authorization. No Sleek output has been presented as completed work.

References: https://docs.expo.dev/versions/v58.0.0/sdk/router/native-tabs/ , https://docs.expo.dev/versions/v58.0.0/sdk/symbols/ , https://docs.expo.dev/versions/v58.0.0/sdk/glass-effect/ , https://docs.expo.dev/versions/v58.0.0/sdk/blur-view/ . Local package type definitions were checked before API changes.


### Follow-up implementation

- Corrections and audit history now have mobile UI inside the existing operations/profile routes; see API_PARITY.md for exact scope.
- Long segmented labels were shortened for narrow screens. Segment text can wrap and Android segments have a 48dp minimum touch height through layout.minTouchTarget.
- The correction form locks fields during submission, exposes selection state to assistive technology, and allows its multiline explanation to grow.
- The compliance overview no longer asserts a fixed set of twelve compliant lots or assumes intact seals without supporting fields. It presents sample/report counts and recorded seal identifiers.
- Lot detail has an empty state before accessing missing lot data. iOS uses the native detail header; Android retains its existing toolbar.

Manual checks for this pass: failed correction submit preserves input; successful submit closes only after confirmation; list commit/cancel reaches the intended backend status; history handles 403/empty/malformed responses; switching accounts clears history; native lot title collapses with sufficiently long content; segmented labels remain readable at large text sizes.

- Login now contains inline account registration, email verification/resend and password recovery/reset panels. They use existing InputField/Button/semantic surfaces and stay inside the current login route. Manual checks include email delivery, OTP expiry, invalid codes, rejected passwords and retry after network loss.
- npm test includes read-only audit parsing/search and correction failure/precision tests in addition to endpoint parity and contrast checks. No credentials, OTPs or live test data are recorded by these tests.

### Management follow-up — 2026-11-01

Profile now contains collapsed organization/user-access and master-data panels for the same administrator role allowed on the web. Compliance standards contains a collapsed MRL version/limit manager for the web's three authorized roles. These panels use opaque content surfaces; glass remains reserved for navigation and floating controls. ChoiceField provides searchable radio options without a new dependency or route.

Mutations wait for the server result, prevent duplicate submissions and retain editable input on failure. Access updates require the returned ETag. Delete and publish actions ask for confirmation. Switching catalog groups clears old results before loading; changing accounts remounts the panels. Management validation covers malformed responses, decimal precision, calendar dates and permission/concurrency failures.

Manual checks: organization creation; user assignment/unassignment and deactivation; two administrators editing the same user (412); absent ETag; denied permissions (403); catalog search and CRUD for each supported group; MRL draft creation, tiny decimal limits, deletion and publishing; failure while refreshing after a successful write; account/role changes; long Vietnamese labels, maximum text scaling, keyboard avoidance and screen-reader focus. No live backend mutation or physical-device validation has been performed by the automated checks.

MRL bulk import follows the existing web JSON workflow. It validates the declared request fields before any network call and preserves decimal strings, including trailing zeros. A confirmation reports the number of limits; the server remains responsible for validating reference IDs and applicable rules. Invalid input and failed requests retain the pasted text. No fabricated example IDs or regulation claims are prefilled.
