import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/layout';

import { Button } from './Button';
import { Text } from './Text';

type EmptyStateProps = {
  title: string;
  // Says what to do next, not that something is missing.
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  // Set to "alert" by ErrorState.
  accessibilityRole?: 'alert';
};

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  accessibilityRole,
}: EmptyStateProps) {
  return (
    <View accessibilityRole={accessibilityRole} style={styles.container}>
      <Text variant="bodyStrong" style={styles.centered}>
        {title}
      </Text>
      <Text variant="secondary" tone="textMuted" style={styles.centered}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button label={actionLabel} variant="secondary" onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    gap: spacing.sm,
    alignItems: 'center',
  },
  centered: { textAlign: 'center' },
  action: { marginTop: spacing.sm },
});
