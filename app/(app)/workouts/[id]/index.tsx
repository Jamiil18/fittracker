import { useLocalSearchParams } from 'expo-router';

import { WorkoutDetailScreen } from '@/features/history/components/WorkoutDetailScreen';

export default function WorkoutDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WorkoutDetailScreen workoutId={id} />;
}
