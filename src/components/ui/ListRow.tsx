import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type AccessibilityActionInfo,
  type AccessibilityState,
} from 'react-native';

import { minTouchTarget, screenPadding, spacing } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

import { Text } from './Text';

type ListRowProps = {
  title: string;
  subtitle?: string;
  value?: string;
  tone?: 'text' | 'accent' | 'error';
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  // Rows that toggle a choice in a list are read out as checkboxes.
  accessibilityRole?: 'button' | 'checkbox';
  // Screen-reader equivalents of gestures on the row, such as swipe actions.
  accessibilityActions?: AccessibilityActionInfo[];
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
  // A chevron marks rows that open another screen, as in platform settings.
  showChevron?: boolean;
};

export function ListRow({
  title,
  subtitle,
  value,
  tone = 'text',
  trailing,
  onPress,
  accessibilityHint,
  accessibilityState,
  accessibilityRole = 'button',
  accessibilityActions,
  onAccessibilityAction,
  showChevron = false,
}: ListRowProps) {
  const { colors } = useTheme();

  const content = (
    <>
      <View style={styles.labels}>
        <Text tone={tone}>{title}</Text>
        {subtitle ? (
          <Text variant="secondary" tone="textMuted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text tone="textMuted" numberOfLines={1} ellipsizeMode="middle" style={styles.value}>
          {value}
        </Text>
      ) : null}
      {trailing}
      {showChevron ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
      android_ripple={{ color: colors.separator }}
      style={({ pressed }) => [
        styles.row,
        pressed && Platform.OS === 'ios' && { backgroundColor: colors.separator },
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.md,
  },
  // The title keeps its width and a long value is shortened instead.
  labels: { flexGrow: 1, flexShrink: 0 },
  value: { flexShrink: 1 },
});
