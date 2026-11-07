import { StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { errorMessage, toAppError } from '@/lib/errors';
import { screenPadding, spacing } from '@/theme/layout';

import { useRoutines } from '../api/routines';
import { ReorderRoutinesList } from './ReorderRoutinesList';

export function ReorderRoutinesScreen() {
  const routines = useRoutines();

  if (routines.data === undefined) {
    return (
      <Screen padded={false} edges={['bottom']}>
        {routines.isError ? (
          <ErrorState
            title="Couldn't load your routines"
            message={errorMessage(toAppError(routines.error))}
            onRetry={() => void routines.refetch()}
          />
        ) : (
          <View accessible accessibilityLabel="Loading" style={styles.loading}>
            <Skeleton width="100%" height={48} radius="sm" />
            <Skeleton width="100%" height={48} radius="sm" />
            <Skeleton width="100%" height={48} radius="sm" />
          </View>
        )}
      </Screen>
    );
  }

  return <ReorderRoutinesList routines={routines.data} />;
}

const styles = StyleSheet.create({
  loading: {
    padding: screenPadding,
    gap: spacing.md,
  },
});
