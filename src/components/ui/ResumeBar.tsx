import { Pressable, StyleSheet, View } from 'react-native';

import { minTouchTarget, screenPadding, spacing } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

import { Text } from './Text';

type ResumeBarProps = {
  title: string;
  detail: string;
  actionLabel: string;
  accessibilityLabel: string;
  onPress: () => void;
};

// A full-width bar above the tab bar for something still in progress, such as
// a workout or a paused cardio recording, one tap from going back to it.
export function ResumeBar({
  title,
  detail,
  actionLabel,
  accessibilityLabel,
  onPress,
}: ResumeBarProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: colors.separator }}
      style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.separator }]}
    >
      <View style={styles.labels}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="secondary" tone="textMuted">
          {detail}
        </Text>
      </View>
      <Text variant="bodyStrong" tone="accent">
        {actionLabel}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  labels: { flex: 1 },
});
