import { Stack } from 'expo-router';

export const unstable_settings = { anchor: 'profile' };

export default function SettingsLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />;
}
