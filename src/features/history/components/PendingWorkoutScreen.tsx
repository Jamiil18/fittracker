import { Stack, useRouter } from 'expo-router';

import { EmptyState } from '@/components/ui/EmptyState';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Screen } from '@/components/ui/Screen';
import { useUnits } from '@/features/settings/hooks/useUnits';

import { usePendingWorkouts } from '../hooks/useHistoryItems';
import { PastWorkoutView } from './PastWorkoutView';

type PendingWorkoutScreenProps = {
  workoutId: string;
};

// A finished workout that hasn't reached the server yet, shown from the copy
// in the outbox. The Train tab offers to retry or delete it.
export function PendingWorkoutScreen({ workoutId }: PendingWorkoutScreenProps) {
  const router = useRouter();
  const units = useUnits();
  const workout = usePendingWorkouts().find((item) => item.id === workoutId);

  if (!workout) {
    return (
      <Screen padded={false} edges={['bottom']}>
        <EmptyState
          title="This workout has synced"
          message="Go back to History to see it with your other workouts."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll padded={false} edges={['bottom']}>
      <Stack.Screen options={{ title: workout.name }} />
      <OfflineBanner message="Not synced yet. It's saved on this phone and syncs when you're online." />
      <PastWorkoutView workout={workout} units={units} />
    </Screen>
  );
}
