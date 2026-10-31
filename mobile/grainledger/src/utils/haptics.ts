import * as Haptics from 'expo-haptics';

async function safely(run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch {
    // Haptics are enhancement-only and can be unavailable in low power or web contexts.
  }
}

export const haptics = {
  selection: () => safely(() => Haptics.selectionAsync()),
  impact: () => safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
