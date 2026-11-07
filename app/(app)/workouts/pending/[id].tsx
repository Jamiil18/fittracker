import { useLocalSearchParams } from 'expo-router';

import { PendingWorkoutScreen } from '@/features/history/components/PendingWorkoutScreen';

export default function PendingWorkoutRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PendingWorkoutScreen workoutId={id} />;
}
