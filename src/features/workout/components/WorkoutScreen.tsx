import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { Screen } from '@/components/ui/Screen';
import { SelectSheet } from '@/components/ui/SelectSheet';
import { Text } from '@/components/ui/Text';
import { useDialog } from '@/components/ui/useDialog';
import { usePickedExercises } from '@/features/exercises/pickedExercisesStore';
import { useProfile } from '@/features/settings/api/profile';
import { restChoiceLabel, restChoices } from '@/features/routines/utils/routineLabels';
import { formatDuration } from '@/lib/durations';
import { screenPadding, spacing } from '@/theme/layout';

import { useActiveWorkout } from '../activeWorkoutStore';
import { useExerciseHistories } from '../api/workoutApi';
import { useNow } from '../hooks/useNow';
import { useWorkoutActions } from '../hooks/useWorkoutActions';
import {
  addExercises,
  changeExerciseNotes,
  changeExerciseRest,
  removeExercise,
  swapExercise,
} from '../utils/session';
import { ExerciseMenuSheet } from './ExerciseMenuSheet';
import { NotificationNotice } from './NotificationNotice';
import { RestTimerBar } from './RestTimerBar';
import { WorkoutExerciseBlock } from './WorkoutExerciseBlock';
import { WorkoutFooter } from './WorkoutFooter';

// The workout in progress, as a full-screen modal over the tabs. Close keeps
// it running and returns to the Train tab, where a bar offers to resume it.
export function WorkoutScreen() {
  const router = useRouter();
  const session = useActiveWorkout((state) => state.session);
  const update = useActiveWorkout((state) => state.update);
  const defaultRestSeconds = useProfile().data?.defaultRestSeconds ?? 120;
  const histories = useExerciseHistories(session?.exercises.map((item) => item.exercise.id) ?? []);
  const now = useNow(500);
  const { dialog, confirmFinish, confirmDiscard } = useWorkoutActions();
  const { dialog: removeDialog, showDialog } = useDialog();
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const [restKey, setRestKey] = useState<string | null>(null);
  // Set while the picker is open to swap this exercise rather than add new ones.
  const swapping = useRef<string | null>(null);

  // Exercises chosen in the picker arrive when this screen is shown again.
  useFocusEffect(
    useCallback(() => {
      const picked = usePickedExercises.getState().takePicked();
      const swapKey = swapping.current;
      swapping.current = null;
      if (!picked || picked.length === 0) return;
      const [first] = picked;
      if (swapKey && first) update((current) => swapExercise(current, swapKey, first));
      else update((current) => addExercises(current, picked, defaultRestSeconds));
    }, [update, defaultRestSeconds]),
  );

  if (!session) {
    return (
      <Screen padded={false} edges={['bottom']}>
        <EmptyState
          title="No workout in progress"
          message="Start a workout from the Train tab."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const units = { weightUnit: session.weightUnit, distanceUnit: session.distanceUnit };
  const menuExercise = session.exercises.find((item) => item.key === menuKey) ?? null;
  const restExercise = session.exercises.find((item) => item.key === restKey) ?? null;

  function confirmRemove(exerciseKey: string) {
    const exercise = session?.exercises.find((item) => item.key === exerciseKey);
    if (!exercise) return;
    const remove = () => update((current) => removeExercise(current, exerciseKey));
    if (!exercise.sets.some((set) => set.done)) {
      remove();
      return;
    }
    showDialog({
      title: 'Remove exercise?',
      message: `The sets you've ticked for ${exercise.exercise.name} will be deleted.`,
      actions: [
        { label: 'Cancel' },
        { label: 'Remove exercise', destructive: true, onPress: remove },
      ],
    });
  }

  return (
    <Screen padded={false} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: session.name.trim() || 'Workout',
          headerLeft: () => <Button label="Close" variant="plain" onPress={() => router.back()} />,
          headerRight: () => (
            <Button label="Finish" variant="plain" onPress={() => confirmFinish(histories)} />
          ),
        }}
      />
      <KeyboardAwareScrollView>
        <NotificationNotice />
        <View style={styles.elapsed}>
          <Text variant="caption" tone="textMuted">
            Duration
          </Text>
          <Text variant="title">{formatDuration((now - session.startedAt) / 1000)}</Text>
        </View>
        {session.exercises.length === 0 ? (
          <EmptyState
            title="No exercises yet"
            message="Add the exercises you're doing, then log each set as you finish it."
          />
        ) : null}
        {session.exercises.map((exercise) => (
          <WorkoutExerciseBlock
            key={exercise.key}
            exercise={exercise}
            units={units}
            history={histories.get(exercise.exercise.id)}
            timer={session.timer}
            now={now}
            onOpenMenu={() => setMenuKey(exercise.key)}
          />
        ))}
        <WorkoutFooter
          session={session}
          onAddExercise={() => router.push('/exercises/pick')}
          onDiscard={confirmDiscard}
        />
      </KeyboardAwareScrollView>
      {session.timer?.kind === 'rest' ? <RestTimerBar timer={session.timer} now={now} /> : null}

      <ExerciseMenuSheet
        exercise={menuExercise}
        canReorder={session.exercises.length > 1}
        onClose={() => setMenuKey(null)}
        onToggleNote={() =>
          menuExercise &&
          update((current) =>
            changeExerciseNotes(current, menuExercise.key, menuExercise.notes === null ? '' : null),
          )
        }
        onChooseRest={() => setRestKey(menuKey)}
        onSwap={() => {
          swapping.current = menuKey;
          router.push({ pathname: '/exercises/pick', params: { single: 'true' } });
        }}
        onReorder={() => router.push('/workout-reorder')}
        onRemove={() => menuKey && confirmRemove(menuKey)}
      />
      <SelectSheet
        visible={restExercise !== null}
        onClose={() => setRestKey(null)}
        title="Rest after each set"
        options={restChoices.map((seconds) => ({
          value: `${seconds}`,
          label: restChoiceLabel(seconds, defaultRestSeconds),
        }))}
        selected={restExercise ? `${restExercise.restSeconds}` : null}
        onSelect={(choice) =>
          restExercise &&
          choice !== null &&
          update((current) => changeExerciseRest(current, restExercise.key, Number(choice)))
        }
      />
      {dialog}
      {removeDialog}
    </Screen>
  );
}

const styles = StyleSheet.create({
  elapsed: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.lg,
  },
});
