import { useLocalSearchParams } from 'expo-router';
import { DecisionsScreen } from '@/features/governance/DecisionsScreen';
export default function PlanReviewRoute() { const { planId } = useLocalSearchParams<{ planId: string }>(); return <DecisionsScreen planId={planId} />; }
