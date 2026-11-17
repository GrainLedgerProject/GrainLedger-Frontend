import { useLocalSearchParams } from 'expo-router';
import { HistoryScreen } from '@/features/governance/HistoryScreen';
export default function EventDetailRoute() { const { type, id, page } = useLocalSearchParams<{ type: string; id: string; page?: string | string[] }>();
  return <HistoryScreen reference={{ type, id }} pageHint={page} />; }
