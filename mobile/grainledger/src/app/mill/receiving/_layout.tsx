import { Stack } from 'expo-router';

export const unstable_settings = { anchor: 'index' };

export default function ReceivingLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />;
}
