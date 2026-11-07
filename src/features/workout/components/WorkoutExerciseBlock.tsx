import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { SwipeableRow } from '@/components/ui/SwipeableRow';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { screenPadding, spacing } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

import { useActiveWorkout } from '../activeWorkoutStore';
import { lastWorkoutSets } from '../api/workoutApi';
import { setRejectedHaptic } from '../haptics';
import type { SessionExercise, WorkoutTimer } from '../schemas/sessionSchema';
import { addSet, changeExerciseNotes, changeSetValue, removeSet } from '../utils/session';
import { secondsLeft } from '../utils/sessionTimer';
import {
  durationDigitsToSeconds,
  exerciseHints,
  previousText,
  resolveSet,
  type HistorySet,
  type Units,
} from '../utils/setValues';
import { startSetTimer, stopTimer, tickSet, untickSet } from '../workoutTimers';
import { SetRow } from './SetRow';
import { TableHeading } from './TableHeading';

type WorkoutExerciseBlockProps = {
  exercise: SessionExercise;
  units: Units;
  // Undefined until the exercise's history has loaded (or if it can't load).
  history: HistorySet[] | undefined;
  timer: WorkoutTimer | null;
  now: number;
  onOpenMenu: () => void;
};

export function WorkoutExerciseBlock({
  exercise,
  units,
  history,
  timer,
  now,
  onOpenMenu,
}: WorkoutExerciseBlockProps) {
  const { colors } = useTheme();
  const update = useActiveWorkout((state) => state.update);
  const [message, setMessage] = useState<string | null>(null);
  const { key, exercise: info } = exercise;

  const previous = lastWorkoutSets(history ?? []);
  const hints = exerciseHints(exercise, previous, units);

  function toggleDone(index: number) {
    const set = exercise.sets[index];
    const hint = hints[index];
    if (!set || !hint) return;
    if (set.done) {
      untickSet(key, set.key);
      return;
    }
    const resolved = resolveSet(info.exerciseType, set, hint, units);
    if (!resolved.ok) {
      setRejectedHaptic();
      setMessage(resolved.message);
      return;
    }
    setMessage(null);
    tickSet(key, set.key, resolved.values);
  }

  function startTimer(index: number) {
    const set = exercise.sets[index];
    const digits = set?.duration || hints[index]?.duration || '';
    const seconds = durationDigitsToSeconds(digits);
    if (!set || seconds === null || seconds < 1) {
      setRejectedHaptic();
      setMessage('Enter the time.');
      return;
    }
    setMessage(null);
    // The time it counts down from is kept in the set, which is ticked with it.
    update((session) => changeSetValue(session, key, set.key, 'duration', digits));
    startSetTimer(key, set.key, seconds);
  }

  return (
    <View
      style={[styles.block, { backgroundColor: colors.surface, borderColor: colors.separator }]}
    >
      <View style={styles.header}>
        <Text variant="bodyStrong" style={styles.name}>
          {info.name}
        </Text>
        <IconButton
          icon="ellipsis-horizontal"
          accessibilityLabel={`Options for ${info.name}`}
          onPress={onOpenMenu}
        />
      </View>
      {exercise.notes !== null ? (
        <View style={styles.note}>
          <TextField
            label="Note"
            value={exercise.notes}
            onChangeText={(text) => update((session) => changeExerciseNotes(session, key, text))}
            maxLength={500}
            multiline
          />
        </View>
      ) : null}
      <TableHeading exerciseType={info.exerciseType} units={units} />
      {exercise.sets.map((set, index) => {
        const running = timer?.kind === 'set' && timer.setKey === set.key;
        return (
          <SwipeableRow
            key={set.key}
            actions={[
              {
                label: 'Delete',
                destructive: true,
                onPress: () => update((session) => removeSet(session, key, set.key)),
              },
            ]}
          >
            <SetRow
              exerciseName={info.name}
              exerciseType={info.exerciseType}
              set={set}
              number={index + 1}
              previous={
                previous[index] ? previousText(info.exerciseType, previous[index], units) : ''
              }
              hints={hints[index] ?? { weight: '', reps: '', duration: '', distance: '' }}
              secondsLeft={running ? secondsLeft(timer, now) : null}
              onChange={(field, value) =>
                update((session) => changeSetValue(session, key, set.key, field, value))
              }
              onToggleDone={() => toggleDone(index)}
              onRemove={() => update((session) => removeSet(session, key, set.key))}
              onStartTimer={() => startTimer(index)}
              onStopTimer={stopTimer}
            />
          </SwipeableRow>
        );
      })}
      {message ? (
        <Text
          variant="secondary"
          tone="error"
          style={styles.message}
          accessibilityLiveRegion="polite"
        >
          {message}
        </Text>
      ) : null}
      <View style={styles.addSet}>
        <Button
          label="Add set"
          variant="plain"
          onPress={() => update((session) => addSet(session, key))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: screenPadding,
    paddingRight: spacing.xs,
  },
  name: { flex: 1 },
  note: {
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.sm,
  },
  message: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.xs,
  },
  addSet: { alignItems: 'flex-start' },
});
