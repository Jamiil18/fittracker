import { useLocalSearchParams } from 'expo-router';

import { RoutineDetailScreen } from '@/features/routines/components/RoutineDetailScreen';

export default function RoutineDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RoutineDetailScreen routineId={id} />;
}
