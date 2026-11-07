import { useLocalSearchParams } from 'expo-router';

import { ExerciseDetailScreen } from '@/features/exercises/components/ExerciseDetailScreen';

export default function ExerciseDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ExerciseDetailScreen exerciseId={id} />;
}
