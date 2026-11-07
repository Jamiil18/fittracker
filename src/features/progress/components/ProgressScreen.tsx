import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTrainingHistory } from '@/features/history/api/history';
import { errorMessage, toAppError } from '@/lib/errors';
import { screenPadding, spacing } from '@/theme/layout';

import { ExerciseChartSection } from './ExerciseChartSection';
import { RecentRecordsSection } from './RecentRecordsSection';

// Charts and records, all from the workout history saved on the
// phone. Only synced workouts count; one waiting in the outbox joins in once
// it has synced.
export function ProgressScreen() {
  const history = useTrainingHistory();

  if (history.data === undefined) {
    return (
      <Screen padded={false} edges={[]}>
        {history.isError ? (
          <ErrorState
            title="Couldn't load your progress"
            message={errorMessage(toAppError(history.error))}
            onRetry={() => void history.refetch()}
          />
        ) : (
          <View accessible accessibilityLabel="Loading" style={styles.loading}>
            <Skeleton width="100%" height={48} radius="sm" />
            <Skeleton width="100%" height={200} radius="md" />
            <Skeleton width="60%" height={17} />
          </View>
        )}
      </Screen>
    );
  }

  if (history.data.length === 0) {
    return (
      <Screen padded={false} edges={[]}>
        <EmptyState
          title="No progress to show yet"
          message="Finish a workout and your charts and records appear here."
        />
      </Screen>
    );
  }

  return (
    <Screen scroll padded={false} edges={[]}>
      <ExerciseChartSection history={history.data} />
      <RecentRecordsSection history={history.data} />
      <View style={styles.end} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    padding: screenPadding,
    gap: spacing.lg,
  },
  end: { height: spacing.xl },
});
