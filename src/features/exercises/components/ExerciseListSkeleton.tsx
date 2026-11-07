import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { screenPadding, spacing } from '@/theme/layout';

// Stands in for the exercise list while the library loads for the first time.
export function ExerciseListSkeleton() {
  return (
    <View accessible accessibilityLabel="Loading" style={styles.loading}>
      {Array.from({ length: 8 }, (_, index) => (
        <View key={index} style={styles.row}>
          <Skeleton width="60%" height={17} />
          <Skeleton width="35%" height={14} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    padding: screenPadding,
    gap: spacing.xl,
  },
  row: { gap: spacing.sm },
});
