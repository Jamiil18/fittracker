import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { errorMessage, toAppError } from '@/lib/errors';
import { screenPadding, spacing } from '@/theme/layout';

type RoutineScreenStateProps = {
  isLoaded: boolean;
  error: unknown;
  onRetry: () => void;
};

// What a routine screen shows when it has no routine to show: a skeleton while
// routines load for the first time, an error if they couldn't load, or a note
// that the routine was deleted, for example on another phone.
export function RoutineScreenState({ isLoaded, error, onRetry }: RoutineScreenStateProps) {
  const router = useRouter();

  return (
    <Screen padded={false} edges={['bottom']}>
      {isLoaded ? (
        <ErrorState
          title="This routine no longer exists"
          message="It may have been deleted. Go back to see your routines."
          retryLabel="Go back"
          onRetry={() => router.back()}
        />
      ) : error ? (
        <ErrorState
          title="Couldn't load this routine"
          message={errorMessage(toAppError(error))}
          onRetry={onRetry}
        />
      ) : (
        <View accessible accessibilityLabel="Loading" style={styles.loading}>
          <Skeleton width="50%" height={17} />
          <Skeleton width="100%" height={56} radius="sm" />
          <Skeleton width="100%" height={56} radius="sm" />
          <Skeleton width="100%" height={56} radius="sm" />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    padding: screenPadding,
    gap: spacing.lg,
  },
});
