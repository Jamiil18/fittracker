import { StyleSheet } from 'react-native';

import { ListRow } from '@/components/ui/ListRow';
import { ListSection } from '@/components/ui/ListSection';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Text } from '@/components/ui/Text';
import type { ExerciseType } from '@/features/exercises/schemas/exerciseSchemas';
import { useTrainingHistory } from '@/features/history/api/history';
import { dayTitle } from '@/features/history/utils/historyDates';
import { setText } from '@/features/history/utils/pastWorkout';
import { useUnits } from '@/features/settings/hooks/useUnits';
import { errorMessage, toAppError } from '@/lib/errors';
import { screenPadding, spacing } from '@/theme/layout';

import { exerciseSessions } from '../utils/exerciseProgress';

// Enough to scroll through recent training without an endless page.
const shownSessions = 20;

type ExerciseHistorySectionProps = {
  exerciseId: string;
  exerciseType: ExerciseType;
};

// The sets logged for one exercise, a section per workout, newest first.
export function ExerciseHistorySection({ exerciseId, exerciseType }: ExerciseHistorySectionProps) {
  const units = useUnits();
  const history = useTrainingHistory();

  if (history.data === undefined) {
    return history.isError ? (
      <ErrorState
        title="Couldn't load your history"
        message={errorMessage(toAppError(history.error))}
        onRetry={() => void history.refetch()}
      />
    ) : null;
  }

  const sessions = exerciseSessions(history.data, exerciseId);
  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No history yet"
        message="Sets you log for this exercise in a workout appear here."
      />
    );
  }

  return (
    <>
      {sessions.slice(0, shownSessions).map((session) => (
        <ListSection
          key={session.workoutId}
          title={`${dayTitle(session.startedAt)}, ${session.workoutName}`}
        >
          {session.sets.map((set, index) => (
            <ListRow
              key={set.id}
              title={`Set ${index + 1}`}
              value={setText(exerciseType, set, units)}
            />
          ))}
        </ListSection>
      ))}
      {sessions.length > shownSessions ? (
        <Text variant="secondary" tone="textMuted" style={styles.note}>
          Showing your {shownSessions} most recent workouts with this exercise.
        </Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  note: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.sm,
  },
});
