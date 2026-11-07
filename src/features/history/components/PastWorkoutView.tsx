import { StyleSheet } from 'react-native';

import { ListRow } from '@/components/ui/ListRow';
import { ListSection } from '@/components/ui/ListSection';
import { Text } from '@/components/ui/Text';
import type { Units } from '@/features/workout/utils/setValues';
import { formatWeight } from '@/lib/units';
import { screenPadding, spacing } from '@/theme/layout';

import type { PastWorkout } from '../schemas/historySchemas';
import { dayTitle, durationText } from '../utils/historyDates';
import { setText, workoutTotals } from '../utils/pastWorkout';

type PastWorkoutViewProps = {
  workout: PastWorkout;
  units: Units;
};

function timeOfDay(time: number): string {
  const date = new Date(time);
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// A finished workout as read-only lists: when and how long, the totals, the
// notes, then each exercise with its sets.
export function PastWorkoutView({ workout, units }: PastWorkoutViewProps) {
  const totals = workoutTotals(workout);

  return (
    <>
      <ListSection title={`${dayTitle(workout.startedAt)}, ${timeOfDay(workout.startedAt)}`}>
        <ListRow title="Duration" value={durationText(totals.durationSeconds)} />
        {totals.volumeKg > 0 ? (
          <ListRow
            title="Volume"
            value={formatWeight(Math.round(totals.volumeKg), units.weightUnit)}
          />
        ) : null}
        <ListRow title="Sets" value={String(totals.setCount)} />
      </ListSection>
      {workout.notes ? (
        <ListSection title="Notes">
          <Text style={styles.notes}>{workout.notes}</Text>
        </ListSection>
      ) : null}
      {workout.exercises.map((item) => (
        <ListSection key={item.id} title={item.exercise.name} footer={item.notes ?? undefined}>
          {item.sets.map((set, index) => (
            <ListRow
              key={set.id}
              title={`Set ${index + 1}`}
              value={setText(item.exercise.exerciseType, set, units)}
            />
          ))}
        </ListSection>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  notes: {
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.md,
  },
});
