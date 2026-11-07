import { Stack, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { ListSection } from '@/components/ui/ListSection';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { formatDuration } from '@/lib/durations';
import { errorMessage, AppError } from '@/lib/errors';
import { useOutbox } from '@/lib/outbox/outboxStore';
import { formatWeight } from '@/lib/units';
import { screenPadding, spacing } from '@/theme/layout';

import { useFinishedWorkout } from '../finishedWorkoutStore';
import { formatRecordValue, recordLabels } from '../utils/records';

// Shown after Finish: what the workout added up to, any new records, and
// whether it has reached the server yet.
export function WorkoutSummaryScreen() {
  const router = useRouter();
  const summary = useFinishedWorkout((state) => state.summary);
  const queued = useOutbox((state) => state.items.find((item) => item.id === summary?.workoutId));

  const done = (
    <Stack.Screen
      options={{
        headerLeft: () => null,
        headerRight: () => <Button label="Done" variant="plain" onPress={() => router.back()} />,
      }}
    />
  );

  if (!summary) {
    return (
      <Screen padded={false} edges={['bottom']}>
        {done}
        <EmptyState
          title="No finished workout to show"
          message="Finish a workout to see its summary here."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const syncStatus = !queued
    ? 'Saved'
    : queued.failure
      ? `Not synced yet. ${errorMessage(new AppError(queued.failure))}`
      : "Not synced yet. It's saved on this phone and will sync when you're online.";

  return (
    <Screen scroll padded={false} edges={['bottom']}>
      {done}
      <Text variant="title" style={styles.heading}>
        Workout finished
      </Text>
      <ListSection title={summary.name}>
        <ListRow title="Duration" value={formatDuration(summary.durationSeconds)} />
        <ListRow
          title="Volume"
          value={formatWeight(Math.round(summary.volumeKg), summary.units.weightUnit)}
        />
        <ListRow title="Sets" value={String(summary.setCount)} />
      </ListSection>
      <Text variant="secondary" tone="textMuted" style={styles.note}>
        Volume is weight × reps for weighted exercises. Bodyweight, assisted and timed sets
        aren&apos;t included.
      </Text>

      <ListSection
        title="New records"
        footer={
          summary.records.length === 0
            ? 'Records are measured against your earlier workouts, so an exercise sets them from its second workout on.'
            : undefined
        }
      >
        {summary.records.length === 0 ? <ListRow title="No new records this time" /> : null}
        {summary.records.map((record) => (
          <ListRow
            key={`${record.exerciseName}-${record.kind}`}
            title={record.exerciseName}
            subtitle={recordLabels[record.kind]}
            value={formatRecordValue(record.kind, record.value, summary.units)}
          />
        ))}
      </ListSection>

      <View style={styles.status}>
        <Text
          variant="secondary"
          tone={queued?.failure ? 'error' : 'textMuted'}
          accessibilityLiveRegion="polite"
        >
          {syncStatus}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.lg,
  },
  note: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.sm,
  },
  status: {
    padding: screenPadding,
    paddingTop: spacing.xl,
  },
});
