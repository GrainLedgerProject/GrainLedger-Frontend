import { Stack } from 'expo-router';

export const unstable_settings = { anchor: 'receiving/index' };

export default function MillLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />;
}
