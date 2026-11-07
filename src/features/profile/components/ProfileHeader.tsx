import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useHistoryItems } from '@/features/history/hooks/useHistoryItems';
import { weekStart } from '@/features/progress/utils/exerciseProgress';
import { screenPadding, spacing } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

import { initials } from '../utils/profileDetails';

type ProfileHeaderProps = {
  name: string | null;
};

const circleSize = 56;

// Initials in a plain circle, the name, and one line of totals. Workouts
// still waiting to sync are counted too, as History shows them.
export function ProfileHeader({ name }: ProfileHeaderProps) {
  const { colors } = useTheme();
  const { items } = useHistoryItems();
  const [thisWeek] = useState(() => weekStart(Date.now()));
  // Strength workouts only; cardio sessions are counted in History.
  const workouts = items.filter((item) => item.kind === 'workout');
  const total = workouts.length;
  const recent = workouts.filter((item) => item.startedAt >= thisWeek).length;
  const letters = initials(name);

  return (
    <View style={styles.header}>
      <View
        style={[styles.circle, { backgroundColor: colors.separator }]}
        importantForAccessibility="no-hide-descendants"
      >
        {letters ? (
          <Text variant="bodyStrong">{letters}</Text>
        ) : (
          <Ionicons name="person" size={28} color={colors.textMuted} />
        )}
      </View>
      <View style={styles.text}>
        <Text variant="title" accessibilityRole="header">
          {name ?? 'Your profile'}
        </Text>
        <Text variant="secondary" tone="textMuted">
          {`${total} ${total === 1 ? 'workout' : 'workouts'}, ${recent} this week`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: screenPadding,
    paddingTop: spacing.xl,
  },
  circle: {
    width: circleSize,
    height: circleSize,
    borderRadius: circleSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: spacing.xs },
});
