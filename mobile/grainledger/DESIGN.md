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

`GlassGroup` groups nearby glass controls. On Android, pass a `backdrop` only for a small,
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
