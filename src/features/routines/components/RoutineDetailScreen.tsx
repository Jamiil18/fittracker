import { Stack, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ListRow } from '@/components/ui/ListRow';
import { ListSection } from '@/components/ui/ListSection';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useDialog } from '@/components/ui/useDialog';
import { useProfile } from '@/features/settings/api/profile';
import { useWorkoutActions } from '@/features/workout/hooks/useWorkoutActions';
import { errorMessage, toAppError } from '@/lib/errors';
import { useIsOffline } from '@/lib/useIsOffline';
import { screenPadding, spacing } from '@/theme/layout';

import { useDeleteRoutine, useRoutine } from '../api/routines';
import { restSummary, targetSummary } from '../utils/routineLabels';
import { RoutineScreenState } from './RoutineScreenState';

type RoutineDetailScreenProps = {
  routineId: string;
};

export function RoutineDetailScreen({ routineId }: RoutineDetailScreenProps) {
  const router = useRouter();
  const isOffline = useIsOffline();
  const profile = useProfile().data;
  const defaultRestSeconds = profile?.defaultRestSeconds ?? 120;
  const weightUnit = profile?.weightUnit ?? 'kg';
  const { dialog, showDialog } = useDialog();
  const { dialog: workoutDialog, startWorkout } = useWorkoutActions();
  const routines = useRoutine(routineId);
  const deleteRoutine = useDeleteRoutine();

  if (routines.routine === undefined) {
    // Just deleted here: the screen is already on its way back to the list.
    if (deleteRoutine.isSuccess) return null;
    return (
      <RoutineScreenState
        isLoaded={routines.data !== undefined}
        error={routines.error}
        onRetry={() => void routines.refetch()}
      />
    );
  }

  const routine = routines.routine;

  function confirmDelete() {
    showDialog({
      title: 'Delete routine?',
      message: `"${routine.name}" will be deleted. The exercises in it stay in your library.`,
      actions: [
        { label: 'Cancel' },
        {
          label: 'Delete routine',
          destructive: true,
          onPress: () => deleteRoutine.mutate(routine.id, { onSuccess: () => router.back() }),
        },
      ],
    });
  }

  return (
    <Screen scroll padded={false} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: routine.name,
          headerRight: () => (
            <Button
              label="Edit"
              variant="plain"
              disabled={isOffline}
              onPress={() =>
                router.push({ pathname: '/routines/[id]/edit', params: { id: routine.id } })
              }
            />
          ),
        }}
      />
      {isOffline ? (
        <OfflineBanner message="You're offline. Connect to edit or delete this routine." />
      ) : null}

      <View style={styles.start}>
        <Button label="Start workout" onPress={() => startWorkout(routine)} />
      </View>

      {routine.notes ? (
        <ListSection title="Notes">
          <Text style={styles.notes}>{routine.notes}</Text>
        </ListSection>
      ) : null}

      <ListSection title="Exercises">
        {routine.exercises.map((item) => (
          <ListRow
            key={item.id}
            title={item.exercise.name}
            subtitle={`${targetSummary(item.exercise.exerciseType, item, weightUnit)}, ${restSummary(item.restSeconds, defaultRestSeconds)}`}
            showChevron
            onPress={() =>
              router.push({ pathname: '/exercises/[id]', params: { id: item.exercise.id } })
            }
          />
        ))}
      </ListSection>

      <View style={styles.actions}>
        {deleteRoutine.error ? (
          <Text tone="error" accessibilityRole="alert">
            {errorMessage(toAppError(deleteRoutine.error))}
          </Text>
        ) : null}
        <Button
          label="Delete routine"
          variant="destructive"
          onPress={confirmDelete}
          loading={deleteRoutine.isPending}
          disabled={isOffline}
        />
      </View>
      {dialog}
      {workoutDialog}
    </Screen>
  );
}

const styles = StyleSheet.create({
  start: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.lg,
  },
  notes: {
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.md,
  },
  actions: {
    padding: screenPadding,
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
});
