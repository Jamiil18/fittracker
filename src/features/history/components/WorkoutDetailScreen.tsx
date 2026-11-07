import { Stack, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useDialog } from '@/components/ui/useDialog';
import { useUnits } from '@/features/settings/hooks/useUnits';
import { errorMessage, toAppError } from '@/lib/errors';
import { useIsOffline } from '@/lib/useIsOffline';
import { screenPadding, spacing } from '@/theme/layout';

import { useDeleteWorkout, usePastWorkout } from '../api/history';
import { PastWorkoutView } from './PastWorkoutView';

type WorkoutDetailScreenProps = {
  workoutId: string;
};

export function WorkoutDetailScreen({ workoutId }: WorkoutDetailScreenProps) {
  const router = useRouter();
  const units = useUnits();
  const isOffline = useIsOffline();
  const history = usePastWorkout(workoutId);
  const deleteWorkout = useDeleteWorkout();
  const { dialog, showDialog } = useDialog();

  if (history.workout === undefined) {
    // Just deleted here: the screen is already on its way back.
    if (deleteWorkout.isSuccess) return null;
    return (
      <Screen padded={false} edges={['bottom']}>
        {history.data !== undefined ? (
          <ErrorState
            title="This workout no longer exists"
            message="It may have been deleted. Go back to see your history."
            retryLabel="Go back"
            onRetry={() => router.back()}
          />
        ) : history.isError ? (
          <ErrorState
            title="Couldn't load this workout"
            message={errorMessage(toAppError(history.error))}
            onRetry={() => void history.refetch()}
          />
        ) : (
          <View accessible accessibilityLabel="Loading" style={styles.loading}>
            <Skeleton width="50%" height={17} />
            <Skeleton width="100%" height={96} radius="sm" />
            <Skeleton width="100%" height={144} radius="sm" />
          </View>
        )}
      </Screen>
    );
  }

  const workout = history.workout;

  function confirmDelete() {
    showDialog({
      title: 'Delete workout?',
      message: `"${workout.name}" and all its sets will be deleted. This can't be undone.`,
      actions: [
        { label: 'Cancel' },
        {
          label: 'Delete workout',
          destructive: true,
          onPress: () => deleteWorkout.mutate(workout.id, { onSuccess: () => router.back() }),
        },
      ],
    });
  }

  return (
    <Screen scroll padded={false} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: workout.name,
        }}
      />
      {isOffline ? (
        <OfflineBanner message="You're offline. Connect to delete this workout." />
      ) : null}
      <PastWorkoutView workout={workout} units={units} />
      <View style={styles.actions}>
        {deleteWorkout.error ? (
          <Text tone="error" accessibilityRole="alert">
            {errorMessage(toAppError(deleteWorkout.error))}
          </Text>
        ) : null}
        <Button
          label="Delete workout"
          variant="destructive"
          onPress={confirmDelete}
          loading={deleteWorkout.isPending}
          disabled={isOffline}
        />
      </View>
      {dialog}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    padding: screenPadding,
    gap: spacing.lg,
  },
  actions: {
    padding: screenPadding,
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
});
