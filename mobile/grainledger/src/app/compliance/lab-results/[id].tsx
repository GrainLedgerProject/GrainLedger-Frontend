import { useLocalSearchParams } from 'expo-router';
import { LabReportDetailScreen } from '@/features/compliance/LabReportDetailScreen';
export default function LabReportRoute() { const { id } = useLocalSearchParams<{ id?: string | string[] }>(); return <LabReportDetailScreen id={id} />; }
